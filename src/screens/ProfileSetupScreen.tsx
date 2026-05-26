import React, { useState, useEffect, useRef } from 'react';
import { Picker } from '@react-native-picker/picker';
import { auth, db } from '../config/firebaseConfig'; 
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
  ActivityIndicator
} from 'react-native';

const citiesAndDistricts = require('turkey-neighbourhoods');
import { saveProfileToFirebase } from '../controllers/ProfileController';
import BottomBar from '../components/BottomBar';

export default function ProfileSetupScreen({ navigation, route }: any) {
  const incomingName = route?.params?.fullName || '';

  // =========================================================================
  // 1. STATE YAPILANDIRMASI
  // =========================================================================
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [activeTab, setActiveTab] = useState('parent'); 
  const [isDataLoading, setIsDataLoading] = useState(false);

  // --- VELİ STATE TANIMLARI ---
  const [parentName, setParentName] = useState(incomingName);
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

  // --- BAĞIMLI STATE TANIMLARI ---
  const [dependentType, setDependentType] = useState(''); 
  const [dependentName, setDependentName] = useState('');
  const [dependentAge, setDependentAge] = useState('');
  const [dependentGender, setDependentGender] = useState('');
  const [dependentHeightWeight, setDependentHeightWeight] = useState('');
  const [dependentChipNumber, setDependentChipNumber] = useState(''); 
  const [dependentBloodType, setDependentBloodType] = useState('');
  const [dependentNote, setDependentNote] = useState('');
  const [dependentSubCategory, setDependentSubCategory] = useState('');

  const dbBackupRef = useRef<any>(null);

  // --- SAF VERİ VERİTABANI SENKRONİZASYON MOTORU ---
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
            console.log("[Veri Motoru] Mevcut profil dökümanı doğrulandı, kurumsal veriler yükleniyor.");
            const rawData = profileSnap.data();
            
            if (rawData) {
              let firestoreData = rawData.finalData ? rawData.finalData : rawData;
              if (!firestoreData?.parent?.name && rawData?.parent?.name) {
                firestoreData = rawData;
              }

              // Veli Bilgileri Eşitleme
              if (firestoreData.parent) {
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
              }

              // Bağımlı Bilgileri Eşitleme
              const fDep = firestoreData.dependent || {};
              const rDep = rawData.dependent || {};
              dbBackupRef.current = { ...fDep };

              setDependentName(String(fDep.name || rDep.name || firestoreData.name || rawData.name || ''));
              setDependentChipNumber(String(fDep.chipNumber || rDep.chipNumber || firestoreData.chipNumber || rawData.chipNumber || ''));
              setDependentNote(String(fDep.note || rDep.note || firestoreData.note || rawData.note || ''));
              setDependentGender(String(fDep.gender || rDep.gender || firestoreData.gender || rawData.gender || ''));
              setDependentBloodType(String(fDep.bloodType || rDep.bloodType || firestoreData.bloodType || rawData.bloodType || ''));
              setDependentHeightWeight(String(fDep.heightWeight || rDep.heightWeight || firestoreData.heightWeight || rawData.heightWeight || ''));

              let currentType = String(fDep.category || fDep.type || rDep.category || rDep.type || firestoreData.category || firestoreData.type || rawData.category || rawData.type || '');
              if (currentType && currentType !== 'Çocuk' && currentType !== 'Yaşlı') {
                setDependentType('Evcil Hayvan');
                setDependentSubCategory(currentType); 
              } else {
                setDependentType(currentType);
                setDependentSubCategory('');
              }

              const rawAge = fDep.age || rDep.age || firestoreData.age || rawData.age || '';
              if (rawAge) {
                setDependentAge(String(rawAge).replace(/yaş/i, '').replace(/yaşında/i, '').trim());
              }
            }
          } else {
            console.log("[Veri Motoru] Yeni kayıt senaryosu aktif. Form alanı register verisiyle mühürleniyor.");
            if (incomingName) setParentName(incomingName);
          }
        }
      } catch (error) {
        console.error("[Veri Hatası] Veri senkronizasyon aşamasında kritik hata:", error);
      } finally {
        if (isMounted) {
          setCheckingProfile(false);
          setIsDataLoading(false);
        }
      }
    };

    loadProfileData();

    return () => {
      isMounted = false;
    };
  }, [incomingName]);

  // --- DİNAMİK İLÇE FİLTRELEME MOTORU ---
  useEffect(() => {
    if (parentCity) {
      const districts = citiesAndDistricts.getDistrictsByCityCode(parentCity) || [];
      setDistrictList(districts);
      if (!districts.includes(parentDistrict)) setParentDistrict('');
    } else {
      setDistrictList([]);
      setParentDistrict('');
    }
  }, [parentCity]);

  // =========================================================================
  // 2. AKSİYON MOTORLARI (AKILLI VALIDATION & FIRESTORE WRITE)
  // =========================================================================
  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') alert(`${title}: ${message}`);
    else Alert.alert(title, message);
  };

  const getMissingParentFields = () => {
    const missing = [];
    if (!parentName.trim()) missing.push("Ad Soyad");
    if (!parentPhone.trim()) missing.push("Telefon Numarası");
    if (!parentCity) missing.push("Şehir (İl)");
    if (!parentDistrict) missing.push("İlçe");
    if (!parentAddress.trim()) missing.push("Detaylı Adres Tarifi");
    return missing;
  };

  const getMissingDependentFields = () => {
    const missing = [];
    if (!dependentType) missing.push("Kayıp Profil Türü (Çocuk/Yaşlı/Evcil Hayvan)");
    if (!dependentName.trim()) missing.push("Canlı İsim Alanı");
    return missing;
  };

  const handleSaveAll = async () => {
    const missingParent = getMissingParentFields();
    const missingDependent = getMissingDependentFields();

    if (missingParent.length > 0) {
      console.log("[Validasyon Hatası] Veli zorunlu alanları eksik:", missingParent);
      notify(
        'Eksik Veli Bilgisi', 
        `Lütfen "1. Veli Bilgileri" sekmesindeki şu zorunlu alanları doldurunuz:\n\n• ${missingParent.join('\n• ')}`
      );
      setActiveTab('parent'); 
      return; 
    }

    if (missingDependent.length > 0) {
      console.log("[Validasyon Hatası] Bağımlı zorunlu alanları eksik:", missingDependent);
      notify(
        'Eksik Canlı Bilgisi', 
        `Lütfen "2. Koruma Altındaki Canlı" sekmesindeki şu zorunlu alanları doldurunuz:\n\n• ${missingDependent.join('\n• ')}`
      );
      setActiveTab('dependent'); 
      return; 
    }

    setIsDataLoading(true);

    const finalData = {
      dependent: {
        type: (dependentType === 'Evcil Hayvan') ? dependentSubCategory : dependentType,
        category: (dependentType === 'Evcil Hayvan') ? dependentSubCategory : dependentType,
        name: dependentName.trim(),
        age: dependentAge ? `${dependentAge} Yaş` : '',
        gender: dependentGender || 'Erkek',
        chipNumber: (dependentType === 'Evcil Hayvan') ? dependentChipNumber.trim() : '',
        note: dependentNote.trim() || '',
        heightWeight: (dependentType !== 'Evcil Hayvan') ? dependentHeightWeight : '',
        bloodType: (dependentType !== 'Evcil Hayvan') ? dependentBloodType : ''
      },
      parent: {
        name: parentName.trim(),
        phone: parentPhone.trim(),
        city: parentCity,
        district: parentDistrict,
        address: parentAddress.trim(),
        secondPhone: parentBackupPhone.trim() || '',
        gender: parentGender || '',
        age: parentAge || '',
        bloodType: parentBloodType || '',
        note: parentNote.trim() || '',
        photoUrl: '' 
      }
    };

    try {
      await saveProfileToFirebase(finalData); 
      console.log("[Firestore Motoru] Veri kaydı ve hesap bağlama senkronizasyonu tamamlandı.");
      notify('Başarılı', 'Profil bilgileriniz sisteme başarıyla kaydedilmiştir.');
      navigation.reset({ index: 0, routes: [{ name: 'ProfileScreen' }] });
    } catch (error) {
      console.error("[Firestore Hatası] Profil dökümanı yazma hatası:", error);
      navigation.reset({ index: 0, routes: [{ name: 'ProfileScreen' }] });
    } finally {
      setIsDataLoading(false);
    }
  };

  if (checkingProfile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
        <ActivityIndicator size="large" color="#beaf9f" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>NFCTT Profil Kurulumu</Text>
        </View>

        {/* GEÇİŞ SEKME BUTONLARI (TAB VIEW) */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'parent' && styles.tabButtonActive]} 
            onPress={() => setActiveTab('parent')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'parent' && styles.tabButtonTextActive]}>1. Veli Bilgileri</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'dependent' && styles.tabButtonActive]} 
            onPress={() => setActiveTab('dependent')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'dependent' && styles.tabButtonTextActive]}>2. Koruma Altındaki Canlı</Text>
          </TouchableOpacity>
        </View>

        {/* --- VELİ BİLGİLERİ SEKMESİ --- */}
        {activeTab === 'parent' && (
          <View style={styles.card}>
            <Text style={styles.inputLabel}>İsim Soyisim *</Text>
            <TextInput placeholder="John Doe *" placeholderTextColor="#8e8e93" style={styles.input} onChangeText={setParentName} value={parentName} />
            
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

            <Text style={styles.inputLabel}>Telefon Numarası *</Text>
            <TextInput placeholder="+905xxxxxxxx" placeholderTextColor="#8e8e93" style={styles.input} keyboardType="phone-pad" onChangeText={setParentPhone} value={parentPhone} />
            
            <Text style={styles.inputLabel}>Yedek Telefon Numarası (Opsiyonel)</Text>
            <TextInput placeholder="Yedek Telefon Numarası" placeholderTextColor="#8e8e93" style={styles.input} keyboardType="phone-pad" onChangeText={setParentBackupPhone} value={parentBackupPhone} />

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

            <Text style={styles.inputLabel}>Detaylı Adres Tarifi *</Text>
            <TextInput placeholder="Adres tarifi..." placeholderTextColor="#8e8e93" style={[styles.input, { height: 80 }]} multiline onChangeText={setParentAddress} value={parentAddress} />
            
            <Text style={styles.inputLabel}>Ek Not (Kronik rahatsızlık, alerji vb.)</Text>
            <TextInput placeholder="Ek notlar..." placeholderTextColor="#8e8e93" style={[styles.input, { height: 60 }]} multiline onChangeText={setParentNote} value={parentNote} />
          </View>
        )}

        {/* --- KORUMA ALTINDAKİ CANLI SEKMESİ --- */}
        {activeTab === 'dependent' && (
          <View style={styles.card}>
            <Text style={styles.label}>Kayıp Profil Türünü Seçin:</Text>
            
            <View style={styles.typeButtonContainer}>
              {['Çocuk', 'Evcil Hayvan', 'Yaşlı'].map((type) => (
                <TouchableOpacity 
                  key={type}
                  style={[
                    styles.typeButton, 
                    (dependentType === type || (type === 'Evcil Hayvan' && (dependentType === 'Kedi' || dependentType === 'Köpek' || dependentType === 'Kuş' || dependentType === 'Kemirgen' || dependentType === 'Sürüngen/Akvaryum' || dependentType === 'Diğer'))) && styles.typeButtonSelected
                  ]}
                  onPress={() => {
                    if (dependentType === type) return;
                    setDependentType(type);

                    const originalDependent = dbBackupRef.current || {};
                    const originalType = String(originalDependent?.category || originalDependent?.type || '');
                    
                    if ((originalType === 'Çocuk' || originalType === 'Yaşlı') && type === originalType || (originalType !== 'Çocuk' && originalType !== 'Yaşlı' && originalType !== '') && type === 'Evcil Hayvan') {
                      console.log("[UX Hafıza Motoru] Orijinal tipe dönüldü, kurumsal yedekler geri yükleniyor.");
                      setDependentName(String(originalDependent?.name || ''));
                      setDependentGender(String(originalDependent?.gender || ''));
                      setDependentNote(String(originalDependent?.note || ''));
                      setDependentChipNumber(String(originalDependent?.chipNumber || ''));
                      setDependentBloodType(String(originalDependent?.bloodType || ''));
                      setDependentHeightWeight(String(originalDependent?.heightWeight || ''));
                      if (originalDependent?.age) {
                        setDependentAge(String(originalDependent.age).replace(/yaş/i, '').trim());
                      }
                      if (originalType !== 'Çocuk' && originalType !== 'Yaşlı') setDependentSubCategory(originalType);
                    } 
                    else {
                      setDependentName(''); setDependentAge(''); setDependentGender('');
                      setDependentHeightWeight(''); setDependentBloodType(''); setDependentNote('');
                      setDependentChipNumber(''); setDependentSubCategory('');
                    }
                  }}
                >
                  <Text style={[styles.typeButtonText, (dependentType === type || (type === 'Evcil Hayvan' && (dependentType === 'Kedi' || dependentType === 'Köpek' || dependentType === 'Kuş' || dependentType === 'Kemirgen' || dependentType === 'Sürüngen/Akvaryum' || dependentType === 'Diğer'))) && styles.typeButtonTextSelected]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {dependentType !== '' && (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.subLabel}>
                  {(dependentType === 'Kedi' || dependentType === 'Köpek' || dependentType === 'Kuş' || dependentType === 'Kemirgen' || dependentType === 'Sürüngen/Akvaryum' || dependentType === 'Diğer') ? 'Evcil Hayvan' : dependentType} Detaylı Bilgileri
                </Text>
                
                <Text style={styles.inputLabel}>{(dependentType === 'Evcil Hayvan' || dependentType === 'Kedi' || dependentType === 'Köpek') ? "Evcil Hayvanın Adı *" : "İsim Soyisim *"}</Text>
                <TextInput placeholder="İsim giriniz *" placeholderTextColor="#8e8e93" style={styles.input} onChangeText={setDependentName} value={dependentName} />

                {(dependentType === 'Evcil Hayvan' || dependentType === 'Kedi' || dependentType === 'Köpek') && (
                  <View>
                    <Text style={styles.inputLabel}>Evcil Hayvan Türü</Text>
                    <View style={styles.pickerContainer}>
                      <Picker selectedValue={dependentSubCategory} onValueChange={(itemValue) => setDependentSubCategory(itemValue)}>
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
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={dependentAge || ''} onValueChange={(itemValue) => setDependentAge(itemValue)}>
                    <Picker.Item label="Seçiniz" value="" />
                    {Array.from({ length: (dependentType === 'Evcil Hayvan' || dependentType === 'Kedi' || dependentType === 'Köpek') ? 31 : 101 }, (_, i) => i).map((age) => (
                      <Picker.Item key={age} label={String(age)} value={String(age)} />
                    ))}
                  </Picker>
                </View>

                <Text style={styles.inputLabel}>Cinsiyet</Text>
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={dependentGender} onValueChange={(itemValue) => setDependentGender(itemValue)}>
                    <Picker.Item label="Seçiniz" value="" />
                    <Picker.Item label="Erkek" value="Erkek" />
                    {(dependentType === 'Evcil Hayvan' || dependentType === 'Kedi' || dependentType === 'Köpek') ? <Picker.Item label="Dişi" value="Dişi" /> : <Picker.Item label="Kadın" value="Kadın" />}
                    {dependentType === 'Yaşlı' && <Picker.Item label="Belirtmek İstemiyorum" value="Belirtmek İstemiyorum" />}
                  </Picker>
                </View>

                {(dependentType === 'Çocuk' || dependentType === 'Yaşlı') && (
                  <View>
                    <Text style={styles.inputLabel}>Boy</Text>
                    <View style={styles.pickerContainer}>
                      <Picker selectedValue={(dependentHeightWeight?.includes(' - ')) ? dependentHeightWeight.split(' - ')[0] : ''} onValueChange={(itemValue) => setDependentHeightWeight(`${itemValue} - ${(dependentHeightWeight?.includes(' - ')) ? dependentHeightWeight.split(' - ')[1] : ''}`)}>
                        <Picker.Item label="Seçiniz" value="" />
                        {Array.from({ length: 191 }, (_, i) => i + 30).map((h) => <Picker.Item key={h} label={`${h} cm`} value={`${h} cm`} />)}
                      </Picker>
                    </View>

                    <Text style={styles.inputLabel}>Kilo</Text>
                    <View style={styles.pickerContainer}>
                      <Picker selectedValue={(dependentHeightWeight?.includes(' - ')) ? dependentHeightWeight.split(' - ')[1] : ''} onValueChange={(itemValue) => setDependentHeightWeight(`${(dependentHeightWeight?.includes(' - ')) ? dependentHeightWeight.split(' - ')[0] : ''} - ${itemValue}`)}>
                        <Picker.Item label="Seçiniz" value="" />
                        {Array.from({ length: 148 }, (_, i) => i + 3).map((w) => <Picker.Item key={w} label={`${w} kg`} value={`${w} kg`} />)}
                      </Picker>
                    </View>
                    
                    <Text style={styles.inputLabel}>Kan Grubu</Text>
                    <View style={styles.pickerContainer}>
                      <Picker selectedValue={dependentBloodType} onValueChange={(itemValue) => setDependentBloodType(itemValue)}>
                        <Picker.Item label="Seçiniz" value="" />
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'].map(bt => <Picker.Item key={bt} label={bt} value={bt} />)}
                      </Picker>
                    </View>
                  </View>
                )}

                {(dependentType === 'Evcil Hayvan' || dependentType === 'Kedi' || dependentType === 'Köpek') && (
                  <View>
                    <Text style={styles.inputLabel}>Aşı veya Çip Numarası</Text>
                    <TextInput placeholder="Aşı veya Çip Numarası (Varsa)" placeholderTextColor="#8e8e93" style={styles.input} onChangeText={setDependentChipNumber} value={dependentChipNumber} />
                  </View>
                )}

                <Text style={styles.inputLabel}>Ek Not</Text>
                <TextInput placeholder={(dependentType === 'Evcil Hayvan' || dependentType === 'Kedi') ? "Tasmasındaki künye no..." : "Alerji, kritik ilaçlar..."} placeholderTextColor="#8e8e93" style={[styles.input, { height: 70 }]} multiline onChangeText={setDependentNote} value={dependentNote} />

                {/* GÜÇLÜ VE SAF KURUMSAL KAYDET BUTONU */}
                <View style={{ marginTop: 15 }}>
                  <TouchableOpacity disabled={isDataLoading} style={styles.primaryButton} onPress={handleSaveAll}>
                    {isDataLoading ? <ActivityIndicator size="small" color="#2b231a" /> : <Text style={styles.buttonText}>Kurulumu Tamamla ve Kaydet</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
      <BottomBar navigation={navigation} activeScreen="Settings" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 15 },
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Platform.OS === 'ios' ? 40 : 10, marginBottom: 15 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1c1c1e' },
  
  // 🔥 KANKA: KURUMSAL SAMAN GRİSİ / KEMİK PALETİ TAB STİLLERİ
  tabContainer: { flexDirection: 'row', backgroundColor: '#e5e5ea', borderRadius: 10, padding: 4, marginBottom: 15, width: '100%', alignSelf: 'center' },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabButtonActive: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 2, elevation: 2 },
  tabButtonText: { fontSize: 13, fontWeight: '600', color: '#636366' },
  tabButtonTextActive: { color: '#beaf9f', fontWeight: '700' }, // Kurumsal Koyu Vizon Vurgusu

  card: { backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, width: Platform.OS === 'web' ? 400 : '100%', alignSelf: 'center', borderWidth: 0.5, borderColor: '#e5e5ea' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#48484a', marginBottom: 10 },
  subLabel: { fontSize: 15, fontWeight: 'bold', color: '#1c1c1e', marginVertical: 5, borderBottomWidth: 1, borderColor: '#f2f2f7', paddingBottom: 5 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#48484a', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#f2f2f7', padding: 12, borderRadius: 8, marginBottom: 4, fontSize: 15, color: '#000' },
  
  typeButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, gap: 10, marginTop: 5 },
  typeButton: { flex: 1, padding: 12, backgroundColor: '#f2f2f7', borderRadius: 10, alignItems: 'center', borderWidth: 0.5, borderColor: '#e5e5ea' },
  
  // 🔥 KANKA: PARLAK MAVİLER YERİNE BİZİM SAMAN GRİSİ SEÇİLİ DURUMU
  typeButtonSelected: { backgroundColor: '#d1c7bd', borderColor: '#beaf9f' },
  typeButtonText: { fontSize: 13, fontWeight: 'bold', color: '#636366' },
  typeButtonTextSelected: { color: '#2b231a', fontWeight: '700' }, // Saman grisi üzeri koyu kurumsal yazı tonu
  
  // 🔥 KANKA: ANA KAYDETME BUTONUNUN PREMİUM SAMAN GRİSİ MÜHÜRÜ
  primaryButton: { backgroundColor: '#d1c7bd', borderWidth: 0.5, borderColor: '#beaf9f', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 5 },
  buttonText: { color: '#2b231a', fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },
  
  pickerContainer: { backgroundColor: '#f2f2f7', borderRadius: 8, marginBottom: 4, overflow: 'hidden', justifyContent: 'center' }
});