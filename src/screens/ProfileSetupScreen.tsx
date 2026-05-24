import React, { useState, useEffect, useRef } from 'react';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage, db } from '../config/firebaseConfig'; 
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
import BottomBar from '../components/BottomBar';

export default function ProfileSetupScreen({ navigation }: any) {
  // =========================================================================
  // 1. TÜM REAC/TYPESCRIPT STATE TANIMLAMALARI
  // =========================================================================
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [step, setStep] = useState(1); 
  const [isDataLoading, setIsDataLoading] = useState(true);

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
  const [districtList, setDistrictList] = useState<string[]>([]);

  // --- BAĞIMLI STATE'LERİ ---
  const [dependentType, setDependentType] = useState(''); 
  const [dependentName, setDependentName] = useState('');
  const [dependentAge, setDependentAge] = useState('');
  const [dependentGender, setDependentGender] = useState('');
  const [dependentHeightWeight, setDependentHeightWeight] = useState('');
  const [dependentChipNumber, setDependentChipNumber] = useState(''); 
  const [dependentBloodType, setDependentBloodType] = useState('');
  const [dependentNote, setDependentNote] = useState('');
  const [dependentSubCategory, setDependentSubCategory] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const [isResetting, setIsResetting] = useState(false);

  // BILADER SÜPER KORUMA BELLEĞİ: Veritabanından gelen orijinal veriyi sayfa ömrü boyunca burada kilitliyoruz!
  const dbBackupRef = useRef<any>(null);

  // --- ESNEK VERİ DOLDURMA MOTORU VE GİRİŞ KORUMASI ---
  useEffect(() => {
    let isMounted = true;

    const bypassIfProfileExists = async () => {
      const routes = navigation.getState()?.routes;
      const previousRoute = routes && routes.length > 1 ? routes[routes.length - 2]?.name : null;

      if (previousRoute === 'Home' || previousRoute === 'ProfileScreen') {
        console.log("BU REİS AYARLARDAN VEYA PROFİLDEN GELDİ, KAPILARI AÇIN!");
        
        try {
          if (isMounted) setIsDataLoading(true);

          const currentUser = auth.currentUser;
          if (currentUser) {
            const profileRef = doc(db, "profiles", currentUser.uid);
            const profileSnap = await getDoc(profileRef);

            if (!isMounted) return;

            if (profileSnap.exists()) {
              const rawData = profileSnap.data();
              
              if (rawData) {
                console.log("Esnek şema kontrolü tetiklendi...");
                
                let firestoreData = rawData.finalData ? rawData.finalData : rawData;
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

                // ================= BAĞIMLI BİLGİLERİ EŞİTLEME =================
                const fDep = firestoreData.dependent || {};
                const rDep = rawData.dependent || {};
                
                if (isMounted) {
                  // BILADER: Veritabanından gelen bu orijinal ham bağımlı verisini akıllı belleğe yedekliyoruz kanka:
                  dbBackupRef.current = { ...fDep };

                  setDependentName(String(fDep.name || rDep.name || firestoreData.name || rawData.name || ''));
                  setDependentChipNumber(String(fDep.chipNumber || rDep.chipNumber || firestoreData.chipNumber || rawData.chipNumber || ''));
                  setDependentNote(String(fDep.note || rDep.note || firestoreData.note || rawData.note || ''));
                  setDependentGender(String(fDep.gender || rDep.gender || firestoreData.gender || rawData.gender || ''));
                  setDependentBloodType(String(fDep.bloodType || rDep.bloodType || firestoreData.bloodType || rawData.bloodType || ''));
                  setDependentHeightWeight(String(fDep.heightWeight || rDep.heightWeight || firestoreData.heightWeight || rawData.heightWeight || ''));

                  // Dinamik Tür ve Kategori Tespiti
                  let currentType = String(fDep.category || fDep.type || rDep.category || rDep.type || firestoreData.category || firestoreData.type || rawData.category || rawData.type || '');

                  if (currentType && currentType !== 'Çocuk' && currentType !== 'Yaşlı') {
                    setDependentType('Evcil Hayvan');
                    setDependentSubCategory(currentType); 
                  } else {
                    setDependentType(currentType);
                    setDependentSubCategory('');
                  }

                  // Yaş Verisi Geri Yükleme
                  const rawAge = fDep.age || rDep.age || firestoreData.age || rawData.age || '';
                  if (rawAge) {
                    const cleanAge = String(rawAge)
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
                
                console.log("Tüm bağımlı ve veli state'leri başarıyla harmanlandı!");
              }
            }
          }
        } catch (fetchErr) {
          console.error("Ayarlar modu esnek veri çekme hatası:", fetchErr);
        } finally {
          if (isMounted) {
            setIsDataLoading(false);
          }
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
      
      if (isMounted) {
        setCheckingProfile(false);
        setIsDataLoading(false);
      }
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

    let uploadedPhotoUrl = photoUri || '';

    if (photoUri && photoUri.trim() !== "" && !photoUri.startsWith('http') && (photoUri.startsWith('file://') || photoUri.startsWith('content://') || photoUri.startsWith('/'))) {
      try {
        console.log("Profil fotoğrafı Firebase Storage'a fırlatılıyor...");
        
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
          const fileRef = ref(storage, `profile_photos/${currentUser.uid}.jpg`);
          await uploadBytes(fileRef, blob);
          
          if (blob && typeof (blob as any).close === 'function') {
            (blob as any).close();
          }
          
          uploadedPhotoUrl = await getDownloadURL(fileRef);
          console.log("Fotoğraf başarıyla Storage'a yüklendi, URL:", uploadedPhotoUrl);
        }
      } catch (imgErr) {
        console.error("Storage fotoğraf yükleme hatası kanka:", imgErr);
        uploadedPhotoUrl = photoUri || '';
      }
    }

    const finalData = {
      dependent: {
        type: (dependentType === 'Evcil Hayvan') ? dependentSubCategory : dependentType,
        category: (dependentType === 'Evcil Hayvan') ? dependentSubCategory : dependentType,
        name: dependentName,
        age: dependentAge ? `${dependentAge} Yaş` : '',
        gender: dependentGender || 'Erkek',
        chipNumber: (dependentType === 'Evcil Hayvan') ? dependentChipNumber : '',
        note: dependentNote || '',
        heightWeight: (dependentType !== 'Evcil Hayvan') ? dependentHeightWeight : '',
        bloodType: (dependentType !== 'Evcil Hayvan') ? dependentBloodType : ''
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
        photoUrl: uploadedPhotoUrl || ''
      }
    };

    try {
      await saveProfileToFirebase(finalData); 
      notify('Başarılı', 'Profil bilgileriniz sisteme başarıyla kaydedilmiştir.');
      navigation.navigate('Home');
    } catch (error) {
      console.error("Profil arayüz yönlendirme hatası:", error);
      navigation.navigate('Home'); 
    }
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Profil fotoğrafı ekleyebilmek için lütfen cihazınızın ayarlarından galeri erişimine izin verin.');
      return;
    }

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

  if (checkingProfile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>NFCTT Profil Kurulumu</Text>
          
          <TouchableOpacity 
            disabled={step === 2 || isResetting} 
            style={[styles.profilePhotoContainer, step === 2 ? { opacity: 0.85 } : {}]}
            onPress={pickPhoto}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.profilePhoto} />
            ) : (
              <Image source={require('../../assets/default-avatar.png')} style={styles.profilePhoto} />
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

            <Text style={styles.inputLabel}>İl *</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={parentCity} onValueChange={(itemValue) => setParentCity(itemValue)}>
                <Picker.Item label="Şehir Seçiniz" value="" />
                {citiesAndDistricts.getCities().map((city: any) => (
                  <Picker.Item key={city.code} label={city.name} value={city.code} />
                ))}
              </Picker>
            </View>

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
                  disabled={isResetting}
                  style={[
                    styles.typeButton, 
                    (dependentType === type || (type === 'Evcil Hayvan' && (dependentType === 'Kedi' || dependentType === 'Köpek' || dependentType === 'Kuş' || dependentType === 'Kemirgen' || dependentType === 'Sürüngen/Akvaryum' || dependentType === 'Diğer'))) && styles.typeButtonSelected
                  ]}
                  // BILADER: GEZİNİP GERİ GELİNDİĞİNDE VERİLERİ ÇELİK REFERANSTAN SİHRİBBAZ GİBİ GERİ YÜKLEYEN MOTOR!
                  onPress={async () => {
                    setDependentType(type);

                    // Orijinal veritabanı türünü referans nesnesinden deşifre ediyoruz kanka:
                    const originalDependent = dbBackupRef.current || {};
                    const originalType = String(originalDependent?.category || originalDependent?.type || '');
                    
                    const isChildOrElderlyMatch = (originalType === 'Çocuk' || originalType === 'Yaşlı') && type === originalType;
                    const isPetMatch = (originalType !== 'Çocuk' && originalType !== 'Yaşlı' && originalType !== '') && type === 'Evcil Hayvan';
                    const isSameType = isChildOrElderlyMatch || isPetMatch;

                    // SENARYO A: Kullanıcı veritabanında KAYITLI OLAN KENDİ ORİJİNAL BUTONUNA geri döndüyse -> HAFIZADAN BAS GERİ!
                    if (isSameType) {
                      console.log("[UX Hafıza Motoru] Orijinal butona geri dönüldü, yedek veriler şak diye basılıyor...");
                      setDependentName(String(originalDependent?.name || ''));
                      setDependentGender(String(originalDependent?.gender || ''));
                      setDependentNote(String(originalDependent?.note || ''));
                      setDependentChipNumber(String(originalDependent?.chipNumber || ''));
                      setDependentBloodType(String(originalDependent?.bloodType || ''));
                      setDependentHeightWeight(String(originalDependent?.heightWeight || ''));

                      if (originalDependent?.age) {
                        const cleanAge = String(originalDependent.age).replace(/yaş/i, '').trim();
                        setDependentAge(isNaN(Number(cleanAge)) ? '' : cleanAge);
                      } else {
                        setDependentAge('');
                      }

                      if (originalType !== 'Çocuk' && originalType !== 'Yaşlı') {
                        setDependentSubCategory(originalType);
                      }
                    } 
                    // SENARYO B: Kullanıcı boş olan veya kendisinde kayıtlı olmayan farklı bir türe tıkladıysa -> ALANLARI SIFIRLA!
                    else {
                      console.log(`[UX Hafıza Motoru] Farklı bir türe geçildi (${type}), alanlar sıfırlanıyor...`);
                      setDependentName('');
                      setDependentAge('');
                      setDependentGender('');
                      setDependentHeightWeight('');
                      setDependentBloodType('');
                      setDependentNote('');
                      setDependentChipNumber('');
                      setDependentSubCategory('');
                    }
                  }}
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

                {(dependentType === 'Evcil Hayvan' || dependentType === 'Kedi' || dependentType === 'Köpek') && (
                  <View>
                    <Text style={styles.inputLabel}>Evcil Hayvan Türü</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={dependentSubCategory}
                        onValueChange={(itemValue) => setDependentSubCategory(itemValue)}
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

                <Text style={styles.inputLabel}>Yaş</Text>
                {(dependentType === 'Evcil Hayvan' || dependentType === 'Kedi' || dependentType === 'Köpek' || dependentType === 'Kuş' || dependentType === 'Kemirgen' || dependentType === 'Sürüngen/Akvaryum' || dependentType === 'Diğer') ? (
                  <View style={styles.pickerContainer}>
                    <Picker 
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
                  <View style={styles.pickerContainer}>
                    <Picker 
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

                <Text style={styles.inputLabel}>Cinsiyet</Text>
                <View style={styles.pickerContainer}>
                  <Picker 
                    selectedValue={dependentGender} 
                    onValueChange={(itemValue) => setDependentGender(itemValue)}
                  >
                    <Picker.Item label="Seçiniz" value="" />
                    <Picker.Item label="Erkek" value="Erkek" />
                    
                    {(dependentType === 'Evcil Hayvan' || dependentType === 'Kedi' || dependentType === 'Köpek' || dependentType === 'Kuş' || dependentType === 'Kemirgen' || dependentType === 'Sürüngen/Akvaryum' || dependentType === 'Diğer') ? (
                      <Picker.Item label="Dişi" value="Dişi" />
                    ) : null}

                    {(dependentType === 'Çocuk' || dependentType === 'Yaşlı') ? (
                      <Picker.Item label="Kadın" value="Kadın" />
                    ) : null}

                    {dependentType === 'Yaşlı' ? (
                      <Picker.Item label="Belirtmek İstemiyorum" value="Belirtmek İstemiyorum" />
                    ) : null}
                  </Picker>
                </View>

                {(dependentType === 'Çocuk' || dependentType === 'Yaşlı') && (
                  <View>
                    <Text style={styles.inputLabel}>Boy</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
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
                    <View style={styles.pickerContainer}>
                      <Picker
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

                {(dependentType === 'Evcil Hayvan' || dependentType === 'Kedi' || dependentType === 'Köpek' || dependentType === 'Kuş' || dependentType === 'Kemirgen' || dependentType === 'Sürüngen/Akvaryum' || dependentType === 'Diğer') && (
                  <View>
                    <Text style={styles.inputLabel}>Aşı veya Çip Numarası</Text>
                    <TextInput
                      placeholder="Aşı veya Çip Numarası (Varsa)"
                      style={styles.input}
                      onChangeText={setDependentChipNumber}
                      value={dependentChipNumber} 
                    />
                  </View>
                )}

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

      {/* ================= NEW COMPONENT BOTTOM BAR ================= */}
      <BottomBar navigation={navigation} activeScreen="Settings" />
    </View>
  );
}

const styles = StyleSheet.create({
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
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 6, marginTop: 8 },
  pickerContainer: { backgroundColor: '#f9f9f9', borderRadius: 8, borderWidth: 1, borderColor: '#eee', marginBottom: 12, overflow: 'hidden', justifyContent: 'center' }
});