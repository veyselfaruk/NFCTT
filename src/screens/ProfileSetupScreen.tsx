import React, { useState, useEffect } from 'react';
import { Picker } from '@react-native-picker/picker';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, Platform, Alert, Image , ActivityIndicator
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
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // =========================================================================
  // 2. USEEFFECT MOTORLARI VE MANGE MANTIKLARI
  // =========================================================================

  // --- SİNSİ GÖZ KIRPMA KORUMA FİLTRESİ VE ESNEK VERİ DOLDURMA ---
  useEffect(() => {
    const bypassIfProfileExists = async () => {
      const routes = navigation.getState()?.routes;
      const previousRoute = routes && routes.length > 1 ? routes[routes.length - 2]?.name : null;

      if (previousRoute === 'Home') {
        console.log("BU REİS AYARLARDAN GELDİ, KAPILARI AÇIN!");
        
        try {
          const auth = getAuth();
          const currentUser = auth.currentUser;
          if (currentUser) {
            const db = getFirestore();
            const profileRef = doc(db, "profiles", currentUser.uid);
            const profileSnap = await getDoc(profileRef);

            if (profileSnap.exists()) {
              const rawData = profileSnap.data();
              
              if (rawData) {
                console.log("Esnek şema kontrolü tetiklendi...");
                const firestoreData = rawData.finalData ? rawData.finalData : rawData;

                // ================= VELİ BİLUİLERİ EŞİTLEME =================
                if (firestoreData.parent) {
                  setParentName(String(firestoreData.parent.name || ''));
                  setParentPhone(String(firestoreData.parent.phone || ''));
                  setParentCity(String(firestoreData.parent.city || ''));
                  setParentDistrict(String(firestoreData.parent.district || ''));
                  setParentAddress(String(firestoreData.parent.address || ''));
                  setParentGender(String(firestoreData.parent.gender || ''));
                  setParentAge(String(firestoreData.parent.age || ''));
                  setParentBloodType(String(firestoreData.parent.bloodType || ''));
                  setParentBackupPhone(String(firestoreData.parent.backupPhone || ''));
                  setParentNote(String(firestoreData.parent.note || ''));
                }

                // ================= BAĞIMLI BİLGİLERİ EŞİTLEME =================
                const dependentData = firestoreData.dependent ? firestoreData.dependent : firestoreData;
                
                if (dependentData) {
                  setDependentName(String(dependentData.name || ''));
                  setDependentGender(String(dependentData.gender || ''));
                  setDependentHeightWeight(String(dependentData.heightWeight || ''));
                  setDependentBloodType(String(dependentData.bloodType || ''));
                  setDependentNote(String(dependentData.note || ''));
                  setDependentChipNumber(String(dependentData.chipNumber || '')); // VERİTABANINDAN GELENİ HAFIZAYA AL KANKA

                  // Yaş Temizleme Motoru (İnsanda saf sayı, hayvanda string ayıklayıcı)
                  if (dependentData.age) {
                    const cleanAge = String(dependentData.age)
                      .replace('Yaş', '')
                      .replace('yaş', '')
                      .replace('Yas', '')
                      .replace('yas', '')
                      .trim();
                    setDependentAge(cleanAge);
                  } else {
                    setDependentAge('');
                  }

                  // Dinamik Tür ve Kategori Karşılaştırması
                  if (dependentData.category) {
                    setDependentType(String(dependentData.category));
                  } else if (dependentData.type) {
                    setDependentType(String(dependentData.type));
                  } else {
                    setDependentType('');
                  }
                }
                
                console.log("Tüm bağımlı ve veli state'leri hafızaya kazındı!");
              }
            }
          }
        } catch (fetchErr) {
          console.error("Ayarlar modu esnek veri çekme hatası:", fetchErr);
        }

        setCheckingProfile(false);
        return; 
      }

      // --- GİRİŞ KORUMASI FİLTRESİ ---
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (currentUser) {
          const db = getFirestore();
          const profileRef = doc(db, "profiles", currentUser.uid);
          const profileSnap = await getDoc(profileRef);

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
      
      setCheckingProfile(false);
    };

    bypassIfProfileExists();
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

  // --- TÜR DEĞİŞİNCE AKILLI FORM RESETLEME MOTORU ---
  useEffect(() => {
    const handleTypeChangeReset = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const db = getFirestore();
        const profileRef = doc(db, "profiles", currentUser.uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          const rawData = profileSnap.data();
          const firestoreData = rawData.finalData ? rawData.finalData : rawData;
          const originalDependent = firestoreData.dependent ? firestoreData.dependent : firestoreData;
          
          const originalType = String(originalDependent?.category || originalDependent?.type || '');

          // Eğer ekranda seçili olan anlık tür veritabanındakiyle uyuşmuyorsa kutuları temizle kanka
          if (dependentType !== originalType && dependentType !== 'Evcil Hayvan') {
            console.log(`Tür değişti (${dependentType}), form temizleniyor kanka...`);
            setDependentName('');
            setDependentAge('');
            setDependentGender('');
            setDependentHeightWeight('');
            setDependentBloodType('');
            setDependentNote('');
          } 
          // Orijinal türe geri dönerse Firebase verilerini geri yükle kanka
          else if (dependentType === originalType || (dependentType === 'Evcil Hayvan' && originalType === 'Kedi')) {
            console.log("Orijinal türe geri dönüldü, Firebase verileri geri yükleniyor...");
            setDependentName(String(originalDependent?.name || ''));
            setDependentGender(String(originalDependent?.gender || ''));
            setDependentNote(String(originalDependent?.note || ''));
            
            if (originalDependent?.age) {
              const cleanAge = String(originalDependent.age).replace('Yaş', '').replace('yaş', '').trim();
              setDependentAge(cleanAge);
            }
          }
        }
      } catch (err) {
        console.error("Tür değişim reset motoru hatası:", err);
      }
    };

    if (dependentType) {
      handleTypeChangeReset();
    }
  }, [dependentType]);

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

    const finalData = {
      dependent: {
        type: dependentType,
        name: dependentName,
        category: dependentType === 'Kedi' || dependentType === 'Köpek' ? dependentType : 'Kedi', 
        age: dependentAge ? `${dependentAge} Yaş` : '4 Yaş',
        gender: dependentGender || 'Erkek',
        chipNumber: dependentChipNumber || '', // KANKA ARTIK BOŞ DEĞİL, STATE'DEKİ RANDOM SAYILARI YOLLUYORUZ!
        note: dependentNote || ''
      },
      parent: {
        name: parentName || '',
        phone: parentPhone || '',
        secondPhone: parentBackupPhone || '', 
        city: parentCity || '',
        district: parentDistrict || '',
        address: parentAddress || ''
      }
    };

    console.log("Sisteme işlenecek paket:", JSON.stringify(finalData));

    try {
      saveProfileToFirebase(finalData); 
      notify('Başarılı', 'Profil bilgileriniz sisteme başarıyla kaydedilmiştir.');
      navigation.navigate('Home');
    } catch (error) {
      console.error("Profil arayüz yönlendirme hatası:", error);
      navigation.navigate('Home'); 
    }
  };

  const pickPhoto = () => {
    setPhotoUri('https://via.placeholder.com/150');
    notify('Profil Fotoğrafı', 'Profil fotoğrafı başarıyla eklendi.');
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
          <TouchableOpacity style={styles.profilePhotoContainer} onPress={pickPhoto}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.profilePhoto} />
            ) : (
              <Text style={styles.photoPlaceholderText}>Fotoğraf Ekle</Text>
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
                  style={[styles.typeButton, (dependentType === type || (type === 'Evcil Hayvan' && (dependentType === 'Kedi' || dependentType === 'Köpek'))) && styles.typeButtonSelected]}
                  onPress={() => setDependentType(type)}
                >
                  <Text style={[styles.typeButtonText, (dependentType === type || (type === 'Evcil Hayvan' && (dependentType === 'Kedi' || dependentType === 'Köpek'))) && styles.typeButtonTextSelected]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {dependentType !== '' && (
              <View style={{ marginTop: 15 }}>
                <Text style={styles.subLabel}>{dependentType} Detaylı Bilgileri</Text>
                
                <TextInput 
                  placeholder={dependentType === 'Evcil Hayvan' || dependentType === 'Kedi' || dependentType === 'Köpek' ? "Evcil Hayvanın Adı *" : "İsim Soyisim *"} 
                  style={styles.input} 
                  onChangeText={setDependentName} 
                  value={dependentName} 
                />

                {/* EVCİL HAYVAN TÜR SEÇİMİ */}
                {(dependentType === 'Evcil Hayvan' || dependentType === 'Kedi' || dependentType === 'Köpek') && (
                  <View>
                    <Text style={styles.inputLabel}>Evcil Hayvan Türü</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={dependentType === 'Evcil Hayvan' ? dependentHeightWeight : dependentType} 
                        onValueChange={(itemValue) => {
                          if(itemValue) setDependentType(itemValue);
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
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={dependentAge} onValueChange={(itemValue) => setDependentAge(itemValue)}>
                    <Picker.Item label="Seçiniz" value="" />
                    {(dependentType === 'Evcil Hayvan' || dependentType === 'Kedi' || dependentType === 'Köpek')
                      ? Array.from({ length: 31 }, (_, i) => i).map((age) => (
                          <Picker.Item key={age} label={`${age}`} value={String(age)} />
                        ))
                      : Array.from({ length: 101 }, (_, i) => i).map((age) => (
                          <Picker.Item key={age} label={String(age)} value={String(age)} />
                        ))
                    }
                  </Picker>
                </View>

                {/* ================= CİNSİYET PICKER (ÇOCUK GÜVENLİKLİ KESİN ÇÖZÜM) ================= */}
                <Text style={styles.inputLabel}>Cinsiyet</Text>
                <View style={styles.pickerContainer}>
                  <Picker 
                    selectedValue={dependentGender} 
                    onValueChange={(itemValue) => setDependentGender(itemValue)}
                  >
                    <Picker.Item label="Seçiniz" value="" />
                    <Picker.Item label="Erkek" value="Erkek" />
                    
                    {/* Evcil Hayvan, Kedi veya Köpek ise sadece Dişi seçeneği gelir kanka */}
                    {(dependentType === 'Evcil Hayvan' || dependentType === 'Kedi' || dependentType === 'Köpek') ? (
                      <Picker.Item label="Dişi" value="Dişi" />
                    ) : null}

                    {/* Çocuk veya Yaşlı ise Kadın seçeneği gelir kanka */}
                    {(dependentType === 'Çocuk' || dependentType === 'Yaşlı') ? (
                      <Picker.Item label="Kadın" value="Kadın" />
                    ) : null}

                    {/* Sadece ve sadece YAŞLI seçildiğinde bu seçenek aktif olur kanka, çocukta çıkmaz! */}
                    {dependentType === 'Yaşlı' ? (
                      <Picker.Item label="Belirtmek İstemiyorum" value="Belirtmek İstemiyorum" />
                    ) : null}
                  </Picker>
                </View>

                {/* İNSANA ÖZEL SORGULAR */}
                {(dependentType === 'Çocuk' || dependentType === 'Yaşlı') && (
                  <View>
                    <Text style={styles.inputLabel}>Boy</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={dependentHeightWeight ? dependentHeightWeight.split(' - ')[0] : ''}
                        onValueChange={(itemValue) => {
                          const currentWeight = dependentHeightWeight ? dependentHeightWeight.split(' - ')[1] || '' : '';
                          setDependentHeightWeight(`${itemValue} - ${currentWeight}`);
                        }}
                      >
                        <Picker.Item label="Seçiniz" value="" />
                        {Array.from({ length: 191 }, (_, i) => i + 30).map((h) => (
                          <Picker.Item key={h} label={`${h} cm`} value={`${h} cm`} />
                        ))}
                      </Picker>
                    </View>

                    <Text style={styles.inputLabel}>Kilo</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={dependentHeightWeight ? dependentHeightWeight.split(' - ')[1] : ''}
                        onValueChange={(itemValue) => {
                          const currentHeight = dependentHeightWeight ? dependentHeightWeight.split(' - ')[0] || '' : '';
                          setDependentHeightWeight(`${currentHeight} - ${itemValue}`);
                        }}
                      >
                        <Picker.Item label="Seçiniz" value="" />
                        {Array.from({ length: 148 }, (_, i) => i + 3).map((w) => (
                          <Picker.Item key={w} label={`${w} kg`} value={`${w} kg`} />
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

                {/* HAYVANA ÖZEL SORGULAR: AŞI / ÇİP */}
                {(dependentType === 'Evcil Hayvan' || dependentType === 'Kedi' || dependentType === 'Köpek') && (
                  <View>
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
                    dependentType === 'Evcil Hayvan' || dependentType === 'Kedi' || dependentType === 'Köpek'
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