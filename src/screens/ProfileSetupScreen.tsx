import React, { useState, useEffect } from 'react';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
// KANKA: Bizim korumalı ve hafızalı katman tek çatı altında burayı yönetiyor
import { auth, storage, db } from '../config/firebaseConfig'; 
// Sinsi ham getAuth and getFirestore import kırıntılarını tamamen temizledik kanka!
import { doc, getDoc } from 'firebase/firestore'; 
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  Image,
  ActivityIndicator
} from 'react-native';

const citiesAndDistricts = require('turkey-neighbourhoods');
import { saveProfileToFirebase } from '../controllers/ProfileController';

export default function ProfileSetupScreen({ navigation }: any) {
  // =========================================================================
  // 1. TÜM REAC/TYPESCRIPT STATE TANIMLAMALARI (EN ÜSTTE Kİ HATALAR SIFIRLANSIN)
  // =========================================================================
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [step, setStep] = useState(1); 

  // --- VELİ STATE'LERİ ---
  const [parentName, setParentName] = useState('');
  const [parentGender, setParentGender] = useState('');
  const [parentAge, setParentAge] = useState('');
  const [parentBloodType, setParentBloodType] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentBackupPhone, setParentBackupPhone] = useState(''); 
  const [parentCity, setParentCity] = useState(''); 
  const [parentDistrict, setParentDistrict] = useState(''); 
  const [parentAddress, setParentAddress] = useState(''); 
  const [parentNote, setParentNote] = useState('');

  // İlçe listesini tutacak dinamik state
  const [districtList, setDistrictList] = useState<string[]>([]);

  // --- BAĞIMLI STATE'LERİ ---
  const [dependentType, setDependentType] = useState(''); 
  const [dependentName, setDependentName] = useState('');
  const [dependentAge, setDependentAge] = useState('');
  const [dependentGender, setDependentGender] = useState('');
  const [dependentHeightWeight, setDependentHeightWeight] = useState('');
  const [dependentChipNumber, setDependentChipNumber] = useState(''); // KANKA ÇİP İÇİN HAFIZA ODASI AÇTIK!
  const [dependentBloodType, setDependentBloodType] = useState('');
  const [dependentNote, setDependentNote] = useState('');
  const [dependentSubCategory, setDependentSubCategory] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // KANKA: Hızlı basışlarda arayüzün kilitlenmesini engelleyen fiziksel buton kilidi
  const [isResetting, setIsResetting] = useState(false);

  // =========================================================================
  // 2. USEEFFECT MOTORLARI VE MANGE MANTIKLARI
  // =========================================================================

  // --- SİNSİ GÖZ KIRPMA KORUMA FİLTRESİ VE ESNEK VERİ DOLDURMA ---
  useEffect(() => {
    // KANKA: Ekranın açık olup olmadığını takip eden asenkron koruma bayrağı
    let isMounted = true;

    const bypassIfProfileExists = async () => {
      const routes = navigation.getState()?.routes;
      const previousRoute = routes && routes.length > 1 ? routes[routes.length - 2]?.name : null;

      if (previousRoute === 'Home' || previousRoute === 'ProfileScreen') {
        console.log("BU REİS AYARLARDAN VEYA PROFİLDEN GELDİ, KAPILARI AÇIN!");
        
        try {
          const currentUser = auth.currentUser;
          if (currentUser) {
            const profileRef = doc(db, "profiles", currentUser.uid);
            const profileSnap = await getDoc(profileRef);

            if (!isMounted) return;

            if (profileSnap.exists()) {
              const rawData = profileSnap.data();
              
              if (rawData) {
                console.log("Esnek şema kontrolü tetiklendi...");
                
                // KANKA MUTLAK ZIRH: Eğer veri finalData altındaysa onu al, yoksa ham veriyi çek
                let firestoreData = rawData.finalData ? rawData.finalData : rawData;
                
                // Eğer hâlâ ana veli ismi boş kalıyorsa bir kez daha ham köke asıl kanka:
                if (!firestoreData?.parent?.name && rawData?.parent?.name) {
                  firestoreData = rawData;
                }

                // ================= VELİ BİLGİLERİ EŞİTLEME =================
                if (firestoreData.parent && isMounted) {
                  setParentName(String(firestoreData.parent.name || ''));
                  setParentPhone(String(firestoreData.parent.phone || ''));
                  setParentCity(String(firestoreData.parent.city || ''));
                  setParentDistrict(String(firestoreData.parent.district || ''));
                  setParentAddress(String(firestoreData.parent.address || ''));
                  setParentBackupPhone(String(firestoreData.parent.secondPhone || firestoreData.parent.backupPhone || ''));
                  setParentGender(String(firestoreData.parent.gender || ''));
                  setParentAge(String(firestoreData.parent.age || ''));
                  setParentBloodType(String(firestoreData.parent.bloodType || ''));
                  setParentNote(String(firestoreData.parent.note || ''));

                  if (firestoreData.parent.photoUrl) {
                    setPhotoUri(firestoreData.parent.photoUrl);
                  }
                }

                // ================= BAĞIMLI BİLGİLERİ EŞİTLEME (MERGE ZIRHI kanka) =================
                // KANKA BOMBA GÜNCELLEME: finalData.dependent içindeki verileri alıyoruz. 
                // Ama eğer isim vb. alanlar yoksa, ham kökteki (rawData.dependent) ya da direkt kökteki alanlarla harmanlıyoruz!
                const fDependent = firestoreData.dependent || {};
                const rDependent = rawData.dependent || {};
                
                // İki katmanı birleştirip tek bir çelik nesne yapıyoruz kanka:
                const dependentData = {
                  ...rDependent,
                  ...fDependent,
                  // Eğer fDependent içinde sadece photos kaldıysa, isim gibi kritik alanları ham veriden koruyoruz:
                  name: fDependent.name || rDependent.name || firestoreData.name || rawData.name || '',
                  gender: fDependent.gender || rDependent.gender || firestoreData.gender || rawData.gender || '',
                  note: fDependent.note || rDependent.note || firestoreData.note || rawData.note || '',
                  chipNumber: fDependent.chipNumber || rDependent.chipNumber || firestoreData.chipNumber || rawData.chipNumber || '',
                  bloodType: fDependent.bloodType || rDependent.bloodType || firestoreData.bloodType || rawData.bloodType || '',
                  heightWeight: fDependent.heightWeight || rDependent.heightWeight || firestoreData.heightWeight || rawData.heightWeight || '',
                  category: fDependent.category || rDependent.category || firestoreData.category || rawData.category || '',
                  type: fDependent.type || rDependent.type || firestoreData.type || rawData.type || '',
                  age: fDependent.age || rDependent.age || firestoreData.age || rawData.age || ''
                };
                
                if (isMounted && dependentData.name) {
                  setDependentName(String(dependentData.name));
                  setDependentGender(String(dependentData.gender));
                  setDependentNote(String(dependentData.note));
                  setDependentChipNumber(String(dependentData.chipNumber));
                  setDependentBloodType(String(dependentData.bloodType));
                  setDependentHeightWeight(String(dependentData.heightWeight));

                  // Dinamik Tür ve Kategori Tespiti
                  let currentType = String(dependentData.category || dependentData.type || '');

                  if (currentType && currentType !== 'Çocuk' && currentType !== 'Yaşlı') {
                    setDependentType('Evcil Hayvan');
                    setDependentSubCategory(currentType);
                  } else {
                    setDependentType(currentType);
                    setDependentSubCategory('');
                  }

                  // YAŞ TEMİZLEME MOTORU
                  if (dependentData.age) {
                    const cleanAge = String(dependentData.age)
                      .replace('Yaş', '')
                      .replace('yaş', '')
                      .replace('Yaşında', '')
                      .replace('yaşında', '')
                      .trim();
                    setDependentAge(cleanAge);
                  } else {
                    setDependentAge('');
                  }
                }
                
                console.log("Tüm bağımlı ve veli state'leri akıllıca harmanlanıp hafızaya kazındı!");
              }
            }
          }
        } catch (fetchErr) {
          console.error("Ayarlar modu esnek veri çekme hatası:", fetchErr);
        }

        if (isMounted) setCheckingProfile(false);
        return; 
      }

      // --- GİRİŞ KORUMASI FİLTRESİ ---
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const profileRef = doc(db, "profiles", currentUser.uid);
          const profileSnap = await getDoc(profileRef);

          if (!isMounted) return;

          if (profileSnap.exists()) {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
            return; 
          }
        }
      } catch (err) {
        console.error("Giriş koruması hatası kanka:", err);
      }
      
      if (isMounted) setCheckingProfile(false);
    };

    bypassIfProfileExists();

    return () => {
      isMounted = false;
    };
  }, [navigation]);

  // --- İL DEĞİŞTİKÇE İLÇELERİ DİNAMİK OLARAK KORUYAN HOOK ---
  useEffect(() => {
    if (parentCity) {
      const districts = citiesAndDistricts.getDistrictsByCityCode(parentCity) || [];
      setDistrictList(districts);
      
      if (parentDistrict && districts.includes(parentDistrict)) {
        console.log("Mevcut ilçe korundu kanka:", parentDistrict);
      } else {
        setParentDistrict(''); 
      }
    } else {
      setDistrictList([]);
      setParentDistrict('');
    }
  }, [parentCity]);

  // --- TÜR DEĞİŞİNCE AKILLI FORM RESETLEME MOTORU (HAYALET VERİ ENGELLEYİCİLİ) ---
  const handleTypeChangeReset = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const profileRef = doc(db, "profiles", currentUser.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const rawData = profileSnap.data();
        const firestoreData = rawData.finalData ? rawData.finalData : rawData;
        const originalDependent = firestoreData.dependent ? firestoreData.dependent : (rawData.dependent ? rawData.dependent : firestoreData);
        
        const originalType = String(originalDependent?.category || originalDependent?.type || '');

        const isReturningToPet = dependentType === 'Evcil Hayvan' && (originalType === 'Kedi' || originalType === 'Köpek');
        const isSameType = dependentType === originalType;

        if (!isSameType && !isReturningToPet) {
          console.log(`[Senkron Temizlik] Tür ${dependentType} olarak değişti, hayalet veriler temizleniyor...`);
          setDependentName('');
          setDependentAge('');
          setDependentGender('');
          setDependentHeightWeight('');
          setDependentBloodType('');
          setDependentNote('');
          setDependentChipNumber('');
        } 
        else if (isSameType || isReturningToPet) {
          console.log("[Geri Yükleme] Orijinal türe dönüldü, Firebase verileri hafızaya geri yazılıyor...");
          setDependentName(String(originalDependent?.name || ''));
          setDependentGender(String(originalDependent?.gender || ''));
          setDependentNote(String(originalDependent?.note || ''));
          setDependentChipNumber(String(originalDependent?.chipNumber || ''));
          setDependentBloodType(String(originalDependent?.bloodType || ''));
          setDependentHeightWeight(String(originalDependent?.heightWeight || ''));

          if (originalDependent?.age) {
            const rawAge = String(originalDependent.age);
            const cleanAge = rawAge.toLowerCase().includes('yaş') 
              ? rawAge.replace(/yaş/i, '').trim() 
              : rawAge.trim();
            
            setDependentAge(isNaN(Number(cleanAge)) ? '' : cleanAge);
          } else {
            setDependentAge('');
          }
        }
      }
    } catch (err) {
      console.error("Tür değişim reset motoru hatası:", err);
    }
  };

  // KANKA: Ekran adım korumalı ve hızlı basış engelleme zırhlı reset/geri yükleme motoru!
  useEffect(() => {
    let isCurrentRequestActive = true;

    const handleTypeChangeResetWithLock = async () => {
      try {
        if (!dependentType) return;
        if (step !== 2) return;
        
        setIsResetting(true);
        
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setIsResetting(false);
          return;
        }

        const profileRef = doc(db, "profiles", currentUser.uid);
        const profileSnap = await getDoc(profileRef);

        if (!isCurrentRequestActive) {
          return;
        }

        if (profileSnap.exists()) {
          const rawData = profileSnap.data();
          const firestoreData = rawData.finalData ? rawData.finalData : rawData;
          const originalDependent = firestoreData.dependent ? firestoreData.dependent : firestoreData;
          
          const originalType = String(originalDependent?.category || originalDependent?.type || '');

          const isReturningToPet = dependentType === 'Evcil Hayvan' && (originalType === 'Kedi' || originalType === 'Köpek');
          const isSameType = dependentType === originalType;

          if (!isSameType && !isReturningToPet) {
            console.log(`[Senkron Temizlik] Tür ${dependentType} olarak değişti, hayalet veriler temizleniyor...`);
            setDependentName('');
            setDependentAge('');
            setDependentGender('');
            setDependentHeightWeight('');
            setDependentBloodType('');
            setDependentNote('');
            setDependentChipNumber('');
          } 
          else if (isSameType || isReturningToPet) {
            console.log("[Geri Yükleme] Orijinal türe dönüldü, Firebase verileri hafızaya geri yazılıyor...");
            setDependentName(String(originalDependent?.name || ''));
            setDependentGender(String(originalDependent?.gender || ''));
            setDependentNote(String(originalDependent?.note || ''));
            setDependentChipNumber(String(originalDependent?.chipNumber || ''));
            setDependentBloodType(String(originalDependent?.bloodType || ''));
            setDependentHeightWeight(String(originalDependent?.heightWeight || ''));

            if (originalDependent?.age) {
              const rawAge = String(originalDependent.age);
              const cleanAge = rawAge.toLowerCase().includes('yaş') 
                ? rawAge.replace(/yaş/i, '').trim() 
                : rawAge.trim();
              
              setDependentAge(isNaN(Number(cleanAge)) ? '' : cleanAge);
            } else {
              setDependentAge('');
            }
          }
        }
      } catch (err) {
        console.error("Tür değişim reset motoru hatası:", err);
      } finally {
        // İşlem bitti, kilidi güvenle açıyoruz!
        setIsResetting(false);
      }
    };

    handleTypeChangeResetWithLock();

    return () => {
      isCurrentRequestActive = false;
    };
    // Bağımlılık dizisine step'i de ekliyoruz ki step 2 olduğu an Kadir'in verileri jilet gibi yüklensin kanka!
  }, [dependentType, step]);

  // =========================================================================
  // 3. YARDIMCI FONKSİYONLAR (NOTIFY, NEXT, SAVE)
  // =========================================================================
  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') alert(`${title}: ${message}`);
    else Alert.alert(title, message);
  };

  const handleNextStep = () => {
    if (!parentName || !parentPhone || !parentCity || !parentDistrict || !parentAddress) {
      notify('Eksik Bilgi', 'Lütfen zorunlu alanları (Ad Soyad, Telefon, İl, İlçe ve Adres Tarifi) doldurunuz.');
      return;
    }
    setStep(2);
  };

  const handleSaveAll = async () => {
    console.log("--- UTILITY: BUTONA BASILDI ---");
    if (!dependentType) {
      notify('Uyarı', 'Lütfen koruma altındaki canlı türünü seçiniz.');
      return;
    }
    if (!dependentName) {
      notify('Uyarı', 'Lütfen isim alanını boş bırakmayınız.');
      return;
    }

    // === KANKA FOTOĞRAF SEÇİLMİŞSE FİREBASE STORAGE'A FİRE YAPMAYAN YÜKLEME MOTORU ===
    // Kanka, eğer yeni fotoğraf seçilmediyse veritabanındaki mevcut photoUrl'i koruyoruz:
    let uploadedPhotoUrl = photoUri || '';

    // Kanka: photoUri'nin gerçekten yerel bir dosya barındırdığından (boş olmadığından ve http ile başlamadığından) emin oluyoruz
    if (photoUri && photoUri.trim() !== "" && !photoUri.startsWith('http') && (photoUri.startsWith('file://') || photoUri.startsWith('content://') || photoUri.startsWith('/'))) {
      try {
        console.log("Profil fotoğrafı Firebase Storage'a fırlatılıyor...");
        
        // Yerel dosya yolunu (file://) sorunsuzca ham binary veriye (blob) çeviriyoruz kanka
        const blob: Blob = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = function () {
            resolve(xhr.response);
          };
          xhr.onerror = function (e) {
            console.error("Blob dönüştürme hatası kanka:", e);
            reject(new TypeError("Network request failed"));
          };
          xhr.responseType = "blob";
          xhr.open("GET", photoUri, true);
          xhr.send(null);
        });

        const currentUser = auth.currentUser;
        
        if (currentUser) {
          // Resmi profile_photos klasörüne kullanıcının UID'si ile mühürlüyoruz
          const fileRef = ref(storage, `profile_photos/${currentUser.uid}.jpg`);
          await uploadBytes(fileRef, blob);
          
          // Hafıza şişmesin diye işimiz bitince blob'u kapatıyoruz kanka (TypeScript korumalı)
          if (blob && typeof (blob as any).close === 'function') {
            (blob as any).close();
          }
          
          uploadedPhotoUrl = await getDownloadURL(fileRef); // İşte o aradığımız internet linki!
          console.log("Fotoğraf başarıyla Storage'a yüklendi, URL:", uploadedPhotoUrl);
        }
      } catch (imgErr) {
        console.error("Storage fotoğraf yükleme hatası kanka:", imgErr);
        // Fotoğraf yüklenemezse bile kayıt işlemi yarıda kalmasın, mevcut url ile devam etsin:
        uploadedPhotoUrl = photoUri || '';
      }
    } else {
      console.log("Geçerli yeni bir yerel fotoğraf URI'si algılanmadı, Storage adımı güvenle atlandı kanka.");
    }

    // === KANKA TÜM VERİLERİ SÜTUN SÜTUN EKSİKSİZ VERİTABANINA YAZAN YENİ PAKET ===
    const finalData = {
      dependent: {
        // KANKA: Eğer yukarıdaki ana buton Evcil Hayvan ise veritabanına alt türü (Kedi, Köpek vs.) yazıyoruz, Çocuk/Yaşlı ise direkt kendilerini yazıyoruz:
        type: (dependentType === 'Evcil Hayvan') ? dependentSubCategory : dependentType,
        category: (dependentType === 'Evcil Hayvan') ? dependentSubCategory : dependentType,
        name: dependentName,
        age: dependentAge ? `${dependentAge} Yaş` : '',
        gender: dependentGender || 'Erkek',
        chipNumber: dependentChipNumber || '',
        note: dependentNote || '',
        heightWeight: dependentHeightWeight || '', // Boy - Kilo birleşik string kanka
        bloodType: dependentBloodType || '' // Çocuğun/Yaşlının kan grubu
      },
      parent: {
        name: parentName || '',
        phone: parentPhone || '',
        city: parentCity || '',
        district: parentDistrict || '',
        address: parentAddress || '',
        secondPhone: parentBackupPhone || '',
        gender: parentGender || '',
        age: parentAge || '',
        bloodType: parentBloodType || '',
        note: parentNote || '',
        // KANKA BÜYÜK YENİLİK: Fotoğraf linkini veli nesnesinin içine mühürledik!
        photoUrl: uploadedPhotoUrl || ''
      }
    };

    console.log("Sisteme işlenecek paket (Fotoğraflı):", JSON.stringify(finalData));

    try {
      // Sizin kendi veritabanı kayıt tetikleyiciniz kanka, aynen devam:
      await saveProfileToFirebase(finalData); 
      notify('Başarılı', 'Profil bilgileriniz sisteme başarıyla kaydedilmiştir.');
      navigation.navigate('Home');
    } catch (error) {
      console.error("Profil arayüz yönlendirme hatası:", error);
      navigation.navigate('Home'); 
    }
  }; // <--- ÜSTTEKİ ANA FONKSİYONUN KAPANIŞI BURASI KANKA

  // === SON KULLANICI DOSTU PROFİL FOTOĞRAFI SEÇİCİSİ ===
  const pickPhoto = async () => {
    // 1. Galeri izin kontrolü
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Profil fotoğrafı ekleyebilmek için lütfen cihazınızın ayarlarından galeri erişimine izin verin.');
      return;
    }

    // 2. Galeriyi açma motoru
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
      notify('Profil Fotoğrafı', 'Profil fotoğrafınız başarıyla seçildi. Değişikliklerin kaydedilmesi için lütfen formun altındaki kaydet butonuna basın.');
    }
  };

  // --- KORUMA AKTİFKEN LOADING EKRANI ---
  if (checkingProfile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // =========================================================================
  // 4. ARAYÜZ (JSX) GÖVDESİ
  // =========================================================================
  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>NFCTT Profil Kurulumu</Text>
          
          {/* ================= VELİ PROFİL FOTOĞRAFI ALANI ================= */}
        <TouchableOpacity 
          // KANKA: Eğer 2. adımdaysak (Dependent) veya arkada reset motoru çalışıyorsa fotoğraf seçiciyi KİLİTLE!
          disabled={step === 2 || isResetting} 
          style={[
            styles.profilePhotoContainer,
            // Kanka: ternary formatına çektik, step 2 değilse güvenle boş nesne döner, TypeScript asla ötmez:
            step === 2 ? { opacity: 0.85 } : {}
          ]}
          onPress={pickPhoto}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.profilePhoto} />
          ) : (
            <Image 
              source={require('../../assets/default-avatar.png')}
              style={styles.profilePhoto} 
            />
          )}
        </TouchableOpacity>
        </View>

        {/* ADIM 1: VELİ BİLGİLERİ */}
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>1. Hesap Sahibi (Veli) Bilgileri</Text>
            
            <TextInput placeholder="İsim Soyisim *" style={styles.input} onChangeText={setParentName} value={parentName} />
            
            <Text style={styles.inputLabel}>Cinsiyet</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={parentGender} onValueChange={(itemValue) => setParentGender(itemValue)}>
                <Picker.Item label="Seçiniz" value="" />
                <Picker.Item label="Erkek" value="Erkek" />
                <Picker.Item label="Kadın" value="Kadın" />
                <Picker.Item label="Belirtmek İstemiyorum" value="Belirtmek İstemiyorum" />
              </Picker>
            </View>

            <Text style={styles.inputLabel}>Yaş</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={parentAge} onValueChange={(itemValue) => setParentAge(itemValue)}>
                <Picker.Item label="Seçiniz" value="" />
                {Array.from({ length: 85 }, (_, i) => i + 15).map((age) => (
                  <Picker.Item key={age} label={String(age)} value={String(age)} />
                ))}
              </Picker>
            </View>

            <TextInput placeholder="Telefon Numarası *" style={styles.input} keyboardType="phone-pad" onChangeText={setParentPhone} value={parentPhone} />
            <TextInput placeholder="Yedek Telefon Numarası (Opsiyonel)" style={styles.input} keyboardType="phone-pad" onChangeText={setParentBackupPhone} value={parentBackupPhone} />

            <Text style={styles.inputLabel}>Kan Grubu</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={parentBloodType} onValueChange={(itemValue) => setParentBloodType(itemValue)}>
                <Picker.Item label="Seçiniz" value="" />
                <Picker.Item label="A+" value="A+" />
                <Picker.Item label="A-" value="A-" />
                <Picker.Item label="B+" value="B+" />
                <Picker.Item label="B-" value="B-" />
                <Picker.Item label="AB+" value="AB+" />
                <Picker.Item label="AB-" value="AB-" />
                <Picker.Item label="0+" value="0+" />
                <Picker.Item label="0-" value="0-" />
              </Picker>
            </View>

            {/* İL SEÇİMİ */}
            <Text style={styles.inputLabel}>İl *</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={parentCity} onValueChange={(itemValue) => setParentCity(itemValue)}>
                <Picker.Item label="Şehir Seçiniz" value="" />
                {citiesAndDistricts.getCities().map((city: any) => (
                  <Picker.Item key={city.code} label={city.name} value={city.code} />
                ))}
              </Picker>
            </View>

            {/* İLÇE SEÇİMİ */}
            <Text style={styles.inputLabel}>İlçe *</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={parentDistrict} onValueChange={(itemValue) => setParentDistrict(itemValue)} enabled={parentCity !== ''}>
                <Picker.Item label="İlçe Seçiniz" value="" />
                {districtList.map((district, idx) => (
                  <Picker.Item key={idx} label={district} value={district} />
                ))}
              </Picker>
            </View>

            <TextInput placeholder="Detaylı Adres Tarifi *" style={[styles.input, { height: 80 }]} multiline onChangeText={setParentAddress} value={parentAddress} />
            <TextInput placeholder="Ek Not (Kronik rahatsızlık, alerji vb.)" style={[styles.input, { height: 60 }]} multiline onChangeText={setParentNote} value={parentNote} />

            <TouchableOpacity style={styles.primaryButton} onPress={handleNextStep}>
              <Text style={styles.buttonText}>Kayıp/Bağımlı Türü Seçimine Geç →</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* ADIM 2: BAĞIMLI CANLI BİLGİLERİ */}
        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>2. Koruma Altındaki Canlı (Kayıp Türü)</Text>
            
            <Text style={styles.label}>Kayıp Profili Türünü Seçin:</Text>
            <View style={styles.typeButtonContainer}>
              {['Çocuk', 'Evcil Hayvan', 'Yaşlı'].map((type) => (
                <TouchableOpacity 
                  key={type}
                  // KANKA: Arka planda resetleme motoru çalışırken butonları fiziksel olarak kilitliyoruz!
                  disabled={isResetting}
                  style={[
                    styles.typeButton, 
                    (dependentType === type || (type === 'Evcil Hayvan' && (dependentType === 'Kedi' || dependentType === 'Köpek' || dependentType === 'Kuş' || dependentType === 'Kemirgen' || dependentType === 'Sürüngen/Akvaryum' || dependentType === 'Diğer'))) && styles.typeButtonSelected,
                    // Kilitliyken butonu hafif flulaştır kanka:
                    isResetting && { opacity: 0.6 }
                  ]}
                  // Kanka direkt setDependentType tetikliyoruz, useEffect motoru hayalet verileri anında uçuruyor!
                  onPress={() => setDependentType(type)}
                >
                  <Text style={[
                    styles.typeButtonText, 
                    (dependentType === type || (type === 'Evcil Hayvan' && (dependentType === 'Kedi' || dependentType === 'Köpek' || dependentType === 'Kuş' || dependentType === 'Kemirgen' || dependentType === 'Sürüngen/Akvaryum' || dependentType === 'Diğer'))) && styles.typeButtonTextSelected
                  ]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {dependentType !== '' && (
              <View style={{ marginTop: 15 }}>
                <Text style={styles.subLabel}>
                  {(dependentType === 'Kedi' || dependentType === 'Köpek' || dependentType === 'Kuş' || dependentType === 'Kemirgen' || dependentType === 'Sürüngen/Akvaryum' || dependentType === 'Diğer') ? 'Evcil Hayvan' : dependentType} Detaylı Bilgileri
                </Text>
                
                <TextInput 
                  placeholder={(dependentType === 'Evcil Hayvan' || dependentType === 'Kedi' || dependentType === 'Köpek' || dependentType === 'Kuş' || dependentType === 'Kemirgen') ? "Evcil Hayvanın Adı *" : "İsim Soyisim *"} 
                  style={styles.input} 
                  onChangeText={setDependentName} 
                  value={dependentName} 
                />

                {/* EVCİL HAYVAN ALT TÜR SEÇİMİ */}
        {(dependentType === 'Evcil Hayvan' || dependentType === 'Kedi' || dependentType === 'Köpek') && (
          <View>
            <Text style={styles.inputLabel}>Evcil Hayvan Türü</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={dependentSubCategory}
                onValueChange={(itemValue) => {
                  if (itemValue) {
                    setDependentSubCategory(itemValue);
                  }
                }}
              >
                <Picker.Item label="Seçiniz" value="" />
                <Picker.Item label="Kedi" value="Kedi" />
                <Picker.Item label="Köpek" value="Köpek" />
                <Picker.Item label="Kuş" value="Kuş" />
                <Picker.Item label="Kemirgen (Hamster, Tavşan vb.)" value="Kemirgen" />
                <Picker.Item label="Sürüngen / Akvaryum" value="Sürüngen/Akvaryum" />
                <Picker.Item label="Diğer" value="Diğer" />
              </Picker>
            </View>
          </View>
        )}

                {/* ORTAK ALAN: YAŞ */}
                <Text style={styles.inputLabel}>Yaş</Text>
                {/* KANKA: Eğer evcil hayvan türleriyse sadece bu bağımsız Picker çizilir (0-30 arası): */}
                {(dependentType === 'Evcil Hayvan' || dependentType === 'Kedi' || dependentType === 'Köpek' || dependentType === 'Kuş' || dependentType === 'Kemirgen' || dependentType === 'Sürüngen/Akvaryum' || dependentType === 'Diğer') ? (
                  <View style={styles.pickerContainer} key="pet-age-picker-container">
                    <Picker 
                      key="pet-age-picker"
                      selectedValue={dependentAge || ''} 
                      onValueChange={(itemValue) => setDependentAge(itemValue)}
                    >
                      <Picker.Item label="Seçiniz" value="" />
                      {Array.from({ length: 31 }, (_, i) => i).map((age) => (
                        <Picker.Item key={`pet-age-${age}`} label={`${age}`} value={String(age)} />
                      ))}
                    </Picker>
                  </View>
                ) : (
                  /* KANKA: Eğer Çocuk veya Yaşlı ise bu tamamen bağımsız ikinci Picker çizilir (0-100 arası): */
                  <View style={styles.pickerContainer} key="human-age-picker-container">
                    <Picker 
                      key="human-age-picker"
                      selectedValue={dependentAge || ''} 
                      onValueChange={(itemValue) => setDependentAge(itemValue)}
                    >
                      <Picker.Item label="Seçiniz" value="" />
                      {Array.from({ length: 101 }, (_, i) => i).map((age) => (
                        <Picker.Item key={`human-age-${age}`} label={String(age)} value={String(age)} />
                      ))}
                    </Picker>
                  </View>
                )}

                {/* ================= CİNSİYET PICKER ================= */}
                <Text style={styles.inputLabel}>Cinsiyet</Text>
                <View style={styles.pickerContainer}>
                  <Picker 
                    selectedValue={dependentGender} 
                    onValueChange={(itemValue) => setDependentGender(itemValue)}
                  >
                    <Picker.Item label="Seçiniz" value="" />
                    <Picker.Item label="Erkek" value="Erkek" />
                    
                    {/* Evcil Hayvan türleri ise Dişi seçeneği gelir kanka */}
                    {(dependentType === 'Evcil Hayvan' || dependentType === 'Kedi' || dependentType === 'Köpek' || dependentType === 'Kuş' || dependentType === 'Kemirgen' || dependentType === 'Sürüngen/Akvaryum' || dependentType === 'Diğer') ? (
                      <Picker.Item label="Dişi" value="Dişi" />
                    ) : null}

                    {/* Çocuk veya Yaşlı ise Kadın seçeneği gelir kanka */}
                    {(dependentType === 'Çocuk' || dependentType === 'Yaşlı') ? (
                      <Picker.Item label="Kadın" value="Kadın" />
                    ) : null}

                    {/* Sadece YAŞLI seçildiğinde Belirtmek İstemiyorum aktif olur kanka */}
                    {dependentType === 'Yaşlı' ? (
                      <Picker.Item label="Belirtmek İstemiyorum" value="Belirtmek İstemiyorum" />
                    ) : null}
                  </Picker>
                </View>

               {/* İNSANA ÖZEL SORGULAR (BOY / KİLO / KAN GRUBU) */}
                {(dependentType === 'Çocuk' || dependentType === 'Yaşlı') && (
                  <View key={`human-size-block-${dependentType}`}>
                    
                    <Text style={styles.inputLabel}>Boy</Text>
                    {/* KANKA: Boy Picker konteynerine özel key zırhı: */}
                    <View style={styles.pickerContainer} key={`human-height-container-${dependentType}`}>
                      <Picker
                        key={`human-height-picker-${dependentType}`}
                        selectedValue={(dependentHeightWeight && dependentHeightWeight.includes(' - ')) ? dependentHeightWeight.split(' - ')[0] : ''}
                        onValueChange={(itemValue) => {
                          const currentWeight = (dependentHeightWeight && dependentHeightWeight.includes(' - ')) ? dependentHeightWeight.split(' - ')[1] || '' : '';
                          setDependentHeightWeight(`${itemValue} - ${currentWeight}`);
                        }}
                      >
                        <Picker.Item label="Seçiniz" value="" />
                        {Array.from({ length: 191 }, (_, i) => i + 30).map((h) => (
                          <Picker.Item key={`height-item-${h}`} label={`${h} cm`} value={`${h} cm`} />
                        ))}
                      </Picker>
                    </View>

                    <Text style={styles.inputLabel}>Kilo</Text>
                    {/* KANKA: Kilo Picker konteynerine özel key zırhı: */}
                    <View style={styles.pickerContainer} key={`human-weight-container-${dependentType}`}>
                      <Picker
                        key={`human-weight-picker-${dependentType}`}
                        selectedValue={(dependentHeightWeight && dependentHeightWeight.includes(' - ')) ? dependentHeightWeight.split(' - ')[1] : ''}
                        onValueChange={(itemValue) => {
                          const currentHeight = (dependentHeightWeight && dependentHeightWeight.includes(' - ')) ? dependentHeightWeight.split(' - ')[0] || '' : '';
                          setDependentHeightWeight(`${currentHeight} - ${itemValue}`);
                        }}
                      >
                        <Picker.Item label="Seçiniz" value="" />
                        {Array.from({ length: 148 }, (_, i) => i + 3).map((w) => (
                          <Picker.Item key={`weight-item-${w}`} label={`${w} kg`} value={`${w} kg`} />
                        ))}
                      </Picker>
                    </View>
                    
                    <Text style={styles.inputLabel}>Kan Grubu</Text>
                    <View style={styles.pickerContainer}>
                      <Picker selectedValue={dependentBloodType} onValueChange={(itemValue) => setDependentBloodType(itemValue)}>
                        <Picker.Item label="Seçiniz" value="" />
                        <Picker.Item label="A+" value="A+" />
                        <Picker.Item label="A-" value="A-" />
                        <Picker.Item label="B+" value="B+" />
                        <Picker.Item label="B-" value="B-" />
                        <Picker.Item label="AB+" value="AB+" />
                        <Picker.Item label="AB-" value="AB-" />
                        <Picker.Item label="0+" value="0+" />
                        <Picker.Item label="0-" value="0-" />
                      </Picker>
                    </View>
                  </View>
                )}

                {/* HAYVANA ÖZEL SORGULAR: ÇİP NUMARASI */}
                {(dependentType === 'Evcil Hayvan' || dependentType === 'Kedi' || dependentType === 'Köpek' || dependentType === 'Kuş' || dependentType === 'Kemirgen' || dependentType === 'Sürüngen/Akvaryum' || dependentType === 'Diğer') && (
                  <View>
                    <Text style={styles.inputLabel}>Aşı veya Çip Numarası</Text>
                    <TextInput
                      placeholder="Aşı veya Çip Numarası (Varsa)"
                      style={styles.input}
                      onChangeText={(text) => setDependentChipNumber(text)}
                      value={dependentChipNumber} 
                    />
                  </View>
                )}

                {/* ORTAK ALAN: EK NOT */}
                <TextInput 
                  placeholder={
                    (dependentType === 'Evcil Hayvan' || dependentType === 'Kedi' || dependentType === 'Köpek' || dependentType === 'Kuş' || dependentType === 'Kemirgen')
                      ? "Ek Not (Örn: Tasmasındaki künye no, kronik rahatsızlık, kritik ilaçlar)" 
                      : "Ek Not (Örn: Kaçma eğilimi, bildiği diller, kritik ilaçlar, kronik rahatsızlıklar)"
                  } 
                  style={[styles.input, { height: 70 }]} 
                  multiline 
                  onChangeText={setDependentNote} 
                  value={dependentNote} 
                />

                {/* AKSİYON BUTONLARI */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(1)}>
                    <Text style={{ color: '#444', fontWeight: 'bold' }}>← Geri Dön</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.primaryButton, { flex: 2, marginTop: 0 }]} onPress={handleSaveAll}>
                    <Text style={styles.buttonText}>Kurulumu Tamamla ve Kaydet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ================= HOME.TSX İLE %100 UYUMLU NAVİGASYON BARI ================= */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={[styles.barItem, { opacity: 0.5 }]} disabled={true}>
          <Text style={styles.barIcon}>⚙️</Text>
          <Text style={styles.barText}>Ayarlar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.nfcBarItem} onPress={() => console.log("NFC Tarama tetiklendi...")}>
          <View style={styles.nfcCircle}>
            <Text style={styles.nfcIcon}>📶</Text>
          </View>
          <Text style={[styles.barText, { marginTop: 4, fontWeight: 'bold', color: '#007AFF' }]}>NFC Tarat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.barItem} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.barIcon}>👤</Text>
          <Text style={styles.barText}>Profilim</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// =========================================================================
// 5. STYLESHEET ALANI
// =========================================================================
const styles = StyleSheet.create({
  bottomBar: { 
    flexDirection: 'row', 
    height: Platform.OS === 'ios' ? 90 : 75, 
    backgroundColor: 'white', 
    borderTopWidth: 1, 
    borderColor: '#eee', 
    justifyContent: 'space-around', 
    alignItems: 'center', 
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    position: 'absolute', 
    bottom: 0,
    left: 0,
    right: 0
  },
  barItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  barIcon: { fontSize: 24, marginBottom: 3 },
  barText: { fontSize: 12, color: '#555' },
  nfcBarItem: { alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: -25 },
  nfcCircle: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: 'white', 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 5, 
    elevation: 6, 
    borderWidth: 1, 
    borderColor: '#eee' 
  },
  nfcIcon: { fontSize: 28 },

  container: { flex: 1, backgroundColor: '#f0f2f5', padding: 15 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: Platform.OS === 'ios' ? 40 : 10,
    marginBottom: 20 
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  profilePhotoContainer: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: '#ddd', 
    justifyContent: 'center', 
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#007AFF'
  },
  profilePhoto: { width: '100%', height: '100%' },
  photoPlaceholderText: { fontSize: 10, color: '#666', textAlign: 'center' },
  card: { 
    backgroundColor: 'white', 
    padding: 20, 
    borderRadius: 15, 
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    width: Platform.OS === 'web' ? 400 : '100%',
    alignSelf: 'center'
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#007AFF' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 10 },
  subLabel: { fontSize: 15, fontWeight: 'bold', color: '#333', marginVertical: 10, borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 5 },
  input: { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#eee', fontSize: 15 },
  typeButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, gap: 10 },
  typeButton: { flex: 1, padding: 15, backgroundColor: '#f5f5f5', borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  typeButtonSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  typeButtonText: { fontWeight: 'bold', color: '#555' },
  typeButtonTextSelected: { color: 'white' },
  primaryButton: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  secondaryButton: { backgroundColor: '#e0e0e0', padding: 15, borderRadius: 10, alignItems: 'center', flex: 1 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  actionButtons: { flexDirection: 'row', gap: 10, marginTop: 15, alignItems: 'center' },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 6,
    marginTop: 8,
  },
  pickerContainer: {
    backgroundColor: '#f9f9f9', 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee', 
    marginBottom: 12,
    overflow: 'hidden',
    justifyContent: 'center',
  }
});