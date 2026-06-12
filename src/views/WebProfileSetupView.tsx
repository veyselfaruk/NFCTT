import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../config/firebaseConfig'; 
import { doc, getDoc } from 'firebase/firestore'; 
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions
} from 'react-native';

const citiesAndDistricts = require('turkey-neighbourhoods');
import { saveProfileToFirebase } from '../controllers/ProfileController';

interface WebProfileSetupViewProps {
  onSaveSuccess: () => void; // Başarılı kayıttan sonra App.web.tsx'e haber verecek tetikleyici kanka
}

export default function WebProfileSetupView({ onSaveSuccess }: WebProfileSetupViewProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [checkingProfile, setCheckingProfile] = useState(true);
  const [activeTab, setActiveTab] = useState<'parent' | 'dependent'>('parent'); 
  const [isDataLoading, setIsDataLoading] = useState(false);

  // --- VELİ STATE TANIMLARI ---
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
  const [existingPhotoUrl, setExistingPhotoUrl] = useState('');

  // --- BAĞIMLI (CANLI) STATE TANIMLARI ---
  const [dependentType, setDependentType] = useState(''); 
  const [dependentName, setDependentName] = useState('');
  const [dependentAge, setDependentAge] = useState(''); 
  const [dependentGender, setDependentGender] = useState('');
  const [dependentBoy, setDependentBoy] = useState('');
  const [dependentKilo, setDependentKilo] = useState('');
  const [dependentChipNumber, setDependentChipNumber] = useState(''); 
  const [dependentBloodType, setDependentBloodType] = useState('');
  const [dependentNote, setDependentNote] = useState('');
  const [dependentSubCategory, setDependentSubCategory] = useState('');

  const dbBackupRef = useRef<any>(null);

  // Dinamik Dizi Motorları (Veysel'in kurduğu limitler korundu kanka)
  const parentAgeItems = Array.from({ length: 88 }, (_, i) => String(i + 12));
  const dependentAgeLimit = dependentType === 'Evcil Hayvan' ? 31 : 19;
  const dependentAgeItems = Array.from({ length: dependentAgeLimit }, (_, i) => String(i));
  const boyItems = Array.from({ length: 191 }, (_, i) => `${i + 30} cm`);
  const kiloItems = Array.from({ length: 148 }, (_, i) => `${i + 3} kg`);

  // 📡 CORE PIPELINE: Veri Yükleme Motoru
  useEffect(() => {
    let isMounted = true;
    const loadProfileData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const profileRef = doc(db, "profiles", currentUser.uid);
          const profileSnap = await getDoc(profileRef);
          if (!isMounted) return;

          if (profileSnap.exists()) {
            const rawData = profileSnap.data() || {};
            let firestoreData = rawData.finalData ? rawData.finalData : rawData;
            
            if (!firestoreData?.parent?.name && rawData?.parent?.name) {
              firestoreData = rawData;
            }
            if (firestoreData && firestoreData.parent) {
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
              setExistingPhotoUrl(firestoreData.parent.photoUrl || rawData.parent?.photoUrl || '');
            }
            
            const fDep = firestoreData?.dependent || {};
            const rDep = rawData?.dependent || {};
            
            dbBackupRef.current = { ...fDep };
            
            setDependentName(String(fDep.name || rDep.name || ''));
            setDependentChipNumber(String(fDep.chipNumber || rDep.chipNumber || ''));
            setDependentNote(String(fDep.note || rDep.note || ''));
            setDependentGender(String(fDep.gender || rDep.gender || ''));
            setDependentBloodType(String(fDep.bloodType || rDep.bloodType || ''));
            
            const hw = String(fDep.heightWeight || '');
            if (hw && hw.includes(' - ')) {
              setDependentBoy(hw.split(' - ')[0] || '');
              setDependentKilo(hw.split(' - ')[1] || '');
            }

            let currentType = String(fDep.category || fDep.type || rDep.category || rDep.type || '');
            if (currentType && currentType !== 'Çocuk' && currentType !== 'Yaşlı') {
              setDependentType('Evcil Hayvan');
              setDependentSubCategory(currentType); 
            } else {
              setDependentType(currentType);
              setDependentSubCategory('');
            }
            const rawAge = fDep.age || rDep.age || '';
            if (rawAge) {
              setDependentAge(String(rawAge).replace(/yaş/i, '').trim());
            }
          }
        }
      } catch (error) {
        console.error("Profil datası yüklenirken hata:", error);
      } finally {
        if (isMounted) setCheckingProfile(false);
      }
    };
    loadProfileData();
    return () => { isMounted = false; };
  }, []);

  // İl / İlçe Otomasyonu
  useEffect(() => {
    if (parentCity) {
      const districts = citiesAndDistricts.getDistrictsByCityCode(parentCity) || [];
      setDistrictList(districts);
    } else {
      setDistrictList([]);
    }
  }, [parentCity]);

  const handleCategorySelection = (selectedCategory: string) => {
    if (dependentType === selectedCategory) return;
    const backupDep = dbBackupRef.current || {};
    let originalCategory = backupDep.category || backupDep.type || '';
    
    if (originalCategory && originalCategory !== 'Çocuk' && originalCategory !== 'Yaşlı') {
      originalCategory = 'Evcil Hayvan';
    }

    if (selectedCategory === originalCategory) {
      setDependentType(selectedCategory);
      setDependentName(String(backupDep.name || ''));
      setDependentChipNumber(String(backupDep.chipNumber || ''));
      setDependentNote(String(backupDep.note || ''));
      setDependentGender(String(backupDep.gender || ''));
      setDependentBloodType(String(backupDep.bloodType || ''));
      
      const hw = String(backupDep.heightWeight || '');
      if (hw && hw.includes(' - ')) {
        setDependentBoy(hw.split(' - ')[0] || '');
        setDependentKilo(hw.split(' - ')[1] || '');
      } else {
        setDependentBoy(''); setDependentKilo('');
      }

      if (selectedCategory === 'Evcil Hayvan') {
        setDependentSubCategory(backupDep.category || backupDep.type || '');
      } else {
        setDependentSubCategory('');
      }

      const rawAge = backupDep.age || '';
      if (rawAge) {
        setDependentAge(String(rawAge).replace(/yaş/i, '').trim());
      } else {
        setDependentAge('');
      }
    } else {
      setDependentType(selectedCategory);
      setDependentSubCategory(''); setDependentName(''); setDependentChipNumber('');
      setDependentAge(''); setDependentBoy(''); setDependentKilo('');
      setDependentGender(''); setDependentBloodType(''); setDependentNote('');
    }
  };

  // 💾 WEB DATA PERSISTENCE ENGINE
  const handleSaveAllWeb = async () => {
    if (!parentName.trim() || !parentPhone.trim() || !parentCity || !parentDistrict || !parentAddress.trim()) {
      alert('Zorunlu (*) işaretli veli alanlarını lütfen eksiksiz doldurun kral.');
      setActiveTab('parent');
      return;
    }
    if (!dependentType || !dependentName.trim()) {
      alert('Lütfen koruma altındaki canlının profil türünü ve ismini boş bırakmayın reis.');
      setActiveTab('dependent');
      return;
    }

    setIsDataLoading(true);
    const hwValue = dependentBoy || dependentKilo ? `${dependentBoy || '120 cm'} - ${dependentKilo || '30 kg'}` : '';

    const finalData = {
      dependent: {
        type: (dependentType === 'Evcil Hayvan') ? dependentSubCategory : dependentType,
        category: (dependentType === 'Evcil Hayvan') ? dependentSubCategory : dependentType,
        name: dependentName.trim(),
        age: (dependentAge && dependentAge !== 'Seçiniz') ? `${dependentAge} Yaş` : '',
        gender: dependentGender || 'Erkek',
        chipNumber: (dependentType === 'Evcil Hayvan') ? dependentChipNumber.trim() : '',
        note: dependentNote.trim() || '',
        heightWeight: hwValue,
        bloodType: dependentBloodType || 'Belirtilmedi',
        photos: dbBackupRef.current?.photos || [] 
      },
      parent: {
        name: parentName.trim(),
        phone: parentPhone.trim(),
        city: parentCity,
        district: parentDistrict,
        address: parentAddress.trim(),
        secondPhone: parentBackupPhone.trim() || '',
        gender: parentGender || 'Belirtilmedi',
        age: (parentAge && parentAge !== 'Seçiniz') ? parentAge : '35',
        bloodType: parentBloodType || 'Belirtilmedi',
        note: parentNote.trim() || '',
        photoUrl: existingPhotoUrl 
      }
    };

    try {
      await saveProfileToFirebase(finalData); 
      alert('Profil kurulumu başarıyla tamamlandı reis!');
      onSaveSuccess(); // Ana omurgaya kayıt bitti diye haber verip yönlendirmeyi tetikliyoruz
    } catch (error) {
      console.error(error);
      alert("Profil kaydedilirken dahili bir veri tabanı hatası çıktı.");
    } finally {
      setIsDataLoading(false);
    }
  };

  if (checkingProfile) {
    return (
      <View style={styles.centerLoad}>
        <ActivityIndicator size="large" color="#beaf9f" />
        <Text style={{ marginTop: 10, color: '#666' }}>Profil Kontrol Ediliyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <ScrollView style={styles.container} contentContainerStyle={[styles.scrollContent, !isMobile && styles.desktopLayoutWidth]}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>NFCTT Profil Kurulumu</Text>
        </View>

        {/* SEKME/TAB YAPISI */}
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'parent' && styles.tabButtonActive]} onPress={() => setActiveTab('parent')}>
            <Text style={[styles.tabButtonText, activeTab === 'parent' && styles.tabButtonTextActive]}>1. Veli Bilgileri</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'dependent' && styles.tabButtonActive]} onPress={() => setActiveTab('dependent')}>
            <Text style={[styles.tabButtonText, activeTab === 'dependent' && styles.tabButtonTextActive]}>2. Koruma Altındaki Canlı</Text>
          </TouchableOpacity>
        </View>

        {/* VELİ SEKMESİ İÇERİĞİ */}
        {activeTab === 'parent' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>1. Hesap Sahibi (Veli) Bilgileri</Text>
            
            <Text style={styles.inputLabel}>İsim Soyisim *</Text>
            <TextInput placeholder="İsim Soyisim giriniz" placeholderTextColor="#8e8e93" style={styles.input} onChangeText={setParentName} value={parentName} />
            
            <Text style={styles.inputLabel}>Cinsiyet</Text>
            <select value={parentGender} onChange={(e) => setParentGender(e.target.value)} style={styles.webSelectStyle}>
              <option value="">Seçiniz</option>
              <option value="Erkek">Erkek</option>
              <option value="Kadın">Kadın</option>
              <option value="Belirtmek İstemiyorum">Belirtmek İstemiyorum</option>
            </select>

            <Text style={styles.inputLabel}>Yaş</Text>
            <select value={parentAge} onChange={(e) => setParentAge(e.target.value)} style={styles.webSelectStyle}>
              <option value="">Seçiniz</option>
              {parentAgeItems.map((age) => <option key={`p-age-${age}`} value={age}>{age}</option>)}
            </select>

            <Text style={styles.inputLabel}>Telefon Numarası *</Text>
            <TextInput placeholder="+90 5xx xxx xx xx" placeholderTextColor="#8e8e93" style={styles.input} onChangeText={setParentPhone} value={parentPhone} />
            
            <Text style={styles.inputLabel}>Yedek Telefon Numarası</Text>
            <TextInput placeholder="Yedek acil durum numarası" placeholderTextColor="#8e8e93" style={styles.input} onChangeText={setParentBackupPhone} value={parentBackupPhone} />

            <Text style={styles.inputLabel}>Kan Grubu</Text>
            <select value={parentBloodType} onChange={(e) => setParentBloodType(e.target.value)} style={styles.webSelectStyle}>
              <option value="">Seçiniz</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'].map((b) => <option key={`p-blood-${b}`} value={b}>{b}</option>)}
            </select>

            <Text style={styles.inputLabel}>İl *</Text>
            <select value={parentCity} onChange={(e) => setParentCity(e.target.value)} style={styles.webSelectStyle}>
              <option value="">Şehir Seçiniz</option>
              {(citiesAndDistricts.getCities() || []).map((city: any) => <option key={city.code} value={city.code}>{city.name}</option>)}
            </select>

            <Text style={styles.inputLabel}>İlçe *</Text>
            <select value={parentDistrict} onChange={(e) => setParentDistrict(e.target.value)} disabled={!parentCity} style={styles.webSelectStyle}>
              <option value="">İlçe Seçiniz</option>
              {(districtList || []).map((d: string, idx: number) => <option key={`dist-${idx}`} value={d}>{d}</option>)}
            </select>

            <Text style={styles.inputLabel}>Detaylı Adres Tarifi *</Text>
            <TextInput placeholder="Açık adres tarifi..." placeholderTextColor="#8e8e93" style={[styles.input, { height: 80 }]} multiline onChangeText={setParentAddress} value={parentAddress} />
            
            <Text style={styles.inputLabel}>Veli Notu</Text>
            <TextInput placeholder="Kritik kişisel / tıbbi notlar..." placeholderTextColor="#8e8e93" style={[styles.input, { height: 60 }]} multiline onChangeText={setParentNote} value={parentNote} />
          </View>
        )}

        {/* CANLI SEKMESİ İÇERİĞİ */}
        {activeTab === 'dependent' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>2. Koruma Altındaki Canlı Bilgileri</Text>
            
            <Text style={styles.label}>Kayıp Profil Türünü Seçin:</Text>
            <View style={styles.typeButtonContainer}>
              {['Çocuk', 'Evcil Hayvan', 'Yaşlı'].map((type) => (
                <TouchableOpacity 
                  key={type}
                  style={[styles.typeButton, (dependentType === type || (type === 'Evcil Hayvan' && ['Kedi', 'Köpek', 'Kuş', 'Kemirgen', 'Sürüngen/Akvaryum', 'Diğer'].includes(dependentType))) && styles.typeButtonSelected]}
                  onPress={() => handleCategorySelection(type)}
                >
                  <Text style={[styles.typeButtonText, (dependentType === type || (type === 'Evcil Hayvan' && ['Kedi', 'Köpek', 'Kuş', 'Kemirgen', 'Sürüngen/Akvaryum', 'Diğer'].includes(dependentType))) && styles.typeButtonTextSelected]} >{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {dependentType !== '' && (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.subLabel}>{dependentType} Detayları</Text>
                
                <Text style={styles.inputLabel}>{dependentType === 'Evcil Hayvan' ? "Evcil Hayvanın Adı *" : "İsim Soyisim *"}</Text>
                <TextInput placeholder="İsim giriniz *" placeholderTextColor="#8e8e93" style={styles.input} onChangeText={setDependentName} value={dependentName} />

                {dependentType === 'Evcil Hayvan' && (
                  <View>
                    <Text style={styles.inputLabel}>Evcil Hayvan Türü</Text>
                    <select value={dependentSubCategory} onChange={(e) => setDependentSubCategory(e.target.value)} style={styles.webSelectStyle}>
                      <option value="">Seçiniz</option>
                      {['Kedi', 'Köpek', 'Kuş', 'Kemirgen', 'Sürüngen/Akvaryum', 'Diğer'].map((sub) => <option key={`sub-${sub}`} value={sub}>{sub}</option>)}
                    </select>
                  </View>
                )}

                <Text style={styles.inputLabel}>Yaş</Text>
                <select value={dependentAge} onChange={(e) => setDependentAge(e.target.value)} style={styles.webSelectStyle}>
                  <option value="">Seçiniz</option>
                  {dependentAgeItems.map((age) => <option key={`d-age-${age}`} value={age}>{age}</option>)}
                </select>

                <Text style={styles.inputLabel}>Cinsiyet</Text>
                <select value={dependentGender} onChange={(e) => setDependentGender(e.target.value)} style={styles.webSelectStyle}>
                  <option value="">Seçiniz</option>
                  <option value="Erkek">Erkek</option>
                  <option value={dependentType === 'Evcil Hayvan' ? "Dişi" : "Kadın"}>{dependentType === 'Evcil Hayvan' ? "Dişi" : "Kadın"}</option>
                  <option value="Belirtmek İstemiyorum">Belirtmek İstemiyorum</option>
                </select>

                {(dependentType !== 'Evcil Hayvan') && (
                  <View>
                    <Text style={styles.inputLabel}>Boy</Text>
                    <select value={dependentBoy} onChange={(e) => setDependentBoy(e.target.value)} style={styles.webSelectStyle}>
                      <option value="">Seçiniz</option>
                      {boyItems.map((boy) => <option key={`d-boy-${boy}`} value={boy}>{boy}</option>)}
                    </select>

                    <Text style={styles.inputLabel}>Kilo</Text>
                    <select value={dependentKilo} onChange={(e) => setDependentKilo(e.target.value)} style={styles.webSelectStyle}>
                      <option value="">Seçiniz</option>
                      {kiloItems.map((kilo) => <option key={`d-kilo-${kilo}`} value={kilo}>{kilo}</option>)}
                    </select>
                    
                    <Text style={styles.inputLabel}>Kan Grubu</Text>
                    <select value={dependentBloodType} onChange={(e) => setDependentBloodType(e.target.value)} style={styles.webSelectStyle}>
                      <option value="">Seçiniz</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'].map((b) => <option key={`d-blood-${b}`} value={b}>{b}</option>)}
                    </select>
                  </View>
                )}

                {dependentType === 'Evcil Hayvan' && (
                  <View>
                    <Text style={styles.inputLabel}>Aşı veya Çip Numarası</Text>
                    <TextInput placeholder="Kayıtlı çip veya küpe numarası (opsiyonel)" placeholderTextColor="#8e8e93" style={styles.input} onChangeText={setDependentChipNumber} value={dependentChipNumber} />
                  </View>
                )}

                <Text style={styles.inputLabel}>Ek Not</Text>
                <TextInput placeholder="Alerjiler, düzenli ilaçlar veya kayıp durumunda kritik davranış notları..." placeholderTextColor="#8e8e93" style={[styles.input, { height: 70 }]} multiline onChangeText={setDependentNote} value={dependentNote} />

                <View style={{ marginTop: 25 }}>
                  <TouchableOpacity disabled={isDataLoading} style={styles.primaryButton} onPress={handleSaveAllWeb}>
                    {isDataLoading ? (
                      <ActivityIndicator size="small" color="#2b231a" />
                    ) : (
                      <Text style={styles.buttonText}>Kurulumu Tamamla ve Kaydet</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#f8f9fa', width: '100%', height: '100%' },
  container: { flex: 1 },
  scrollContent: { padding: 15, paddingBottom: 60, alignSelf: 'center', width: '100%' },
  desktopLayoutWidth: { maxWidth: 600, paddingVertical: 25 },
  centerLoad: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 15 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1c1c1e' },
  
  tabContainer: { flexDirection: 'row', backgroundColor: '#e5e5ea', borderRadius: 10, padding: 4, marginBottom: 15, width: '100%' },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabButtonActive: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 2, elevation: 2 },
  tabButtonText: { fontSize: 13, fontWeight: '600', color: '#636366' },
  tabButtonTextActive: { color: '#beaf9f', fontWeight: '700' },
  
  card: { backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, width: '100%', borderWidth: 0.5, borderColor: '#e5e5ea' },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 15, color: '#beaf9f', textTransform: 'uppercase', letterSpacing: 0.5 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#48484a', marginBottom: 10 },
  subLabel: { fontSize: 15, fontWeight: 'bold', color: '#1c1c1e', marginVertical: 5, borderBottomWidth: 1, borderColor: '#f2f2f7', paddingBottom: 5 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#48484a', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#f2f2f7', padding: 12, borderRadius: 8, marginBottom: 4, fontSize: 15, color: '#000', borderWidth: 0.5, borderColor: '#e5e5ea' },
  
  // 🌐 WEB ÖZEL DROPDOWN STİL KATMANI (NATIVE WHEEL YERİNE KARARLI SEÇİM)
  webSelectStyle: {
    width: '100%',
    backgroundColor: '#f2f2f7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 0.5,
    borderColor: '#e5e5ea',
    fontSize: 15,
    color: '#1c1c1e',
    fontWeight: '500',
    outlineStyle: 'none',
    fontFamily: 'inherit'
  } as any, // React Native Web üzerinde standart web özniteliklerini ezmek için tünellendi kanka

  typeButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, gap: 10, marginTop: 5 },
  typeButton: { flex: 1, padding: 12, backgroundColor: '#f2f2f7', borderRadius: 10, alignItems: 'center', borderWidth: 0.5, borderColor: '#e5e5ea' },
  typeButtonSelected: { backgroundColor: '#d1c7bd', borderColor: '#beaf9f' },
  typeButtonText: { fontSize: 13, fontWeight: 'bold', color: '#636366' },
  typeButtonTextSelected: { color: '#2b231a', fontWeight: '700' }, 
  
  primaryButton: { backgroundColor: '#d1c7bd', borderWidth: 0.5, borderColor: '#beaf9f', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#2b231a', fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },
  noteBox: { backgroundColor: '#f4f1ea', padding: 12, borderRadius: 10, marginTop: 12, borderWidth: 0.5, borderColor: '#dcd7cd' },
  noteText: { fontSize: 13, color: '#5c5245', lineHeight: 18 }
});