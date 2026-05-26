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
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent
} from 'react-native';

const citiesAndDistricts = require('turkey-neighbourhoods');
import { saveProfileToFirebase } from '../controllers/ProfileController';
import BottomBar from '../components/BottomBar';

const ITEM_HEIGHT = 40; 

// =========================================================================
// 🔥 GERÇEK AŞAĞI-YUKARI KAYDIRMALI, ORTADAKİ ELEMANI SEÇEN CUSTOM WHEEL MOTORU
// =========================================================================
interface ScrollWheelPickerProps {
  data: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  initialFocusValue?: string; 
  autoCloseTrigger?: () => void; 
}

function ScrollWheelPicker({ data, selectedValue, onValueChange, initialFocusValue, autoCloseTrigger }: ScrollWheelPickerProps) {
  const pickerItems = [' ', ...data, ' '];
  const scrollViewRef = useRef<ScrollView>(null);
  const isInitialRender = useRef(true);

  const scrollToValue = (value: string, animated = true) => {
    const targetValue = value || 'Seçiniz';
    const index = data.indexOf(targetValue);
    if (index !== -1 && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: index * ITEM_HEIGHT, animated });
    }
  };

  useEffect(() => {
    setTimeout(() => {
      if (selectedValue && selectedValue !== 'Seçiniz') {
        scrollToValue(selectedValue, false);
      } else if (initialFocusValue) {
        scrollToValue(initialFocusValue, false);
      } else {
        scrollToValue('Seçiniz', false);
      }
      isInitialRender.current = false;
    }, 100);
  }, [selectedValue, initialFocusValue]);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isInitialRender.current) return;
    const yOffset = e.nativeEvent.contentOffset.y;
    const index = Math.round(yOffset / ITEM_HEIGHT);
    
    if (index >= 0 && index < data.length) {
      const selectedItem = data[index];
      const finalVal = selectedItem === 'Seçiniz' ? '' : selectedItem;
      if (finalVal !== selectedValue) {
        onValueChange(finalVal);
      }
    }
  };

  return (
    <View style={styles.wheelWrapper}>
      <View style={styles.wheelSelectionIndicator} pointerEvents="none" />
      <ScrollView
        ref={scrollViewRef}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT} 
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        style={styles.wheelScrollView}
      >
        {pickerItems.map((item, idx) => {
          const isDummy = item === ' ';
          return (
            <View key={`wheel-item-${idx}`} style={styles.wheelItem}>
              {!isDummy ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.wheelItemClickZone}
                  onPress={() => {
                    onValueChange(item === 'Seçiniz' ? '' : item);
                    scrollToValue(item, true);
                    if (autoCloseTrigger) setTimeout(autoCloseTrigger, 400); 
                  }}
                >
                  <Text style={[
                    styles.wheelItemText, 
                    (item === selectedValue || (item === 'Seçiniz' && !selectedValue)) && styles.wheelItemTextSelected
                  ]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function ProfileSetupScreen({ navigation, route }: any) {
  const incomingName = route?.params?.fullName || '';

  const [checkingProfile, setCheckingProfile] = useState(true);
  const [activeTab, setActiveTab] = useState('parent'); 
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);

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
  
  // 🔥 KANKA: MEVCUT FOTOĞRAF URL'SİNİ HAFIZADA TUTUP KORUYACAK YENİ STATE
  const [existingPhotoUrl, setExistingPhotoUrl] = useState('');

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

  const getParentAgeItems = () => {
    const items = Array.from({ length: 88 }, (_, i) => String(i + 12));
    return ['Seçiniz', ...items];
  };

  const getDependentAgeItems = () => {
    if (dependentType === 'Evcil Hayvan') {
      const items = Array.from({ length: 31 }, (_, i) => String(i));
      return ['Seçiniz', ...items];
    } else {
      const items = Array.from({ length: 19 }, (_, i) => String(i));
      return ['Seçiniz', ...items];
    }
  };

  const getBoyItems = () => {
    const items = Array.from({ length: 191 }, (_, i) => `${i + 30} cm`);
    return ['Seçiniz', ...items];
  };

  const getKiloItems = () => {
    const items = Array.from({ length: 148 }, (_, i) => `${i + 3} kg`);
    return ['Seçiniz', ...items];
  };

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
            const rawData = profileSnap.data();
            if (rawData) {
              let firestoreData = rawData.finalData ? rawData.finalData : rawData;
              if (!firestoreData?.parent?.name && rawData?.parent?.name) {
                firestoreData = rawData;
              }
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
                
                // 🔥 KANKA: Eğer Firebase'de zaten bir profil resmi varsa onu çekip kilitle!
                setExistingPhotoUrl(firestoreData.parent.photoUrl || rawData.parent?.photoUrl || '');
              }
              const fDep = firestoreData.dependent || {};
              const rDep = rawData.dependent || {};
              dbBackupRef.current = { ...fDep };
              setDependentName(String(fDep.name || rDep.name || firestoreData.name || rawData.name || ''));
              setDependentChipNumber(String(fDep.chipNumber || rDep.chipNumber || firestoreData.chipNumber || rawData.chipNumber || ''));
              setDependentNote(String(fDep.note || rDep.note || firestoreData.note || rawData.note || ''));
              setDependentGender(String(fDep.gender || rDep.gender || firestoreData.gender || rawData.gender || ''));
              setDependentBloodType(String(fDep.bloodType || rDep.bloodType || firestoreData.bloodType || rawData.bloodType || ''));
              setDependentHeightWeight(String(fDep.heightWeight || firestoreData.heightWeight || rawData.heightWeight || ''));

              let currentType = String(fDep.category || fDep.type || rDep.category || rDep.type || firestoreData.category || firestoreData.type || rawData.type || '');
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
            if (incomingName) setParentName(incomingName);
          }
        }
      } catch (error) {
        console.error("[Veri Hatası] Senkronizasyon hatası:", error);
      } finally {
        if (isMounted) {
          setCheckingProfile(false);
          setIsDataLoading(false);
        }
      }
    };
    loadProfileData();
    return () => { isMounted = false; };
  }, [incomingName]);

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
    if (!dependentType) missing.push("Kayıp Profil Türü");
    if (!dependentName.trim()) missing.push("Canlı İsim Alanı");
    return missing;
  };

  const handleSaveAll = async () => {
    const missingParent = getMissingParentFields();
    const missingDependent = getMissingDependentFields();

    if (missingParent.length > 0) {
      notify('Eksik Veli Bilgisi', `Lütfen zorunlu alanları doldurunuz:\n\n• ${missingParent.join('\n• ')}`);
      setActiveTab('parent'); 
      return; 
    }
    if (missingDependent.length > 0) {
      notify('Eksik Canlı Bilgisi', `Lütfen zorunlu alanları doldurunuz:\n\n• ${missingDependent.join('\n• ')}`);
      setActiveTab('dependent'); 
      return; 
    }

    setIsDataLoading(true);
    
    const finalData = {
      dependent: {
        type: (dependentType === 'Evcil Hayvan') ? dependentSubCategory : dependentType,
        category: (dependentType === 'Evcil Hayvan') ? dependentSubCategory : dependentType,
        name: dependentName.trim(),
        age: (dependentAge && dependentAge !== 'Seçiniz') ? `${dependentAge} Yaş` : '',
        gender: dependentGender || 'Erkek',
        chipNumber: (dependentType === 'Evcil Hayvan') ? dependentChipNumber.trim() : '',
        note: dependentNote.trim() || '',
        heightWeight: dependentHeightWeight || '120 cm - 30 kg',
        bloodType: dependentBloodType || 'Belirtilmedi',
        photos: dbBackupRef.current?.photos || [] // Orijinal albüm fotoğraflarını da ezme kanka koru
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
        // 🔥 KANKA: ARTIK MEVCUT RESİM URL'İNİ EZMİYORUZ, OLDUĞU GİBİ KORUYORUZ!
        photoUrl: existingPhotoUrl 
      }
    };

    try {
      await saveProfileToFirebase(finalData); 
      notify('Başarılı', 'Profil bilgileriniz sisteme başarıyla kaydedilmiştir.');
      navigation.reset({ index: 0, routes: [{ name: 'ProfileScreen' }] });
    } catch (error) {
      console.error("[Firestore Hatası] Yazma hatası:", error);
      navigation.reset({ index: 0, routes: [{ name: 'ProfileScreen' }] });
    } finally {
      setIsDataLoading(false);
    }
  };

  const togglePicker = (pickerId: string) => {
    setOpenPickerId(openPickerId === pickerId ? null : pickerId);
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

        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'parent' && styles.tabButtonActive]} onPress={() => setActiveTab('parent')}>
            <Text style={[styles.tabButtonText, activeTab === 'parent' && styles.tabButtonTextActive]}>Veli Bilgileri</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'dependent' && styles.tabButtonActive]} onPress={() => setActiveTab('dependent')}>
            <Text style={[styles.tabButtonText, activeTab === 'dependent' && styles.tabButtonTextActive]}>Koruma Altındaki Canlı</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'parent' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Hesap Sahibi (Veli) Bilgileri</Text>
            <Text style={styles.inputLabel}>İsim Soyisim *</Text>
            <TextInput placeholder="John Doe *" placeholderTextColor="#8e8e93" style={styles.input} onChangeText={setParentName} value={parentName} />
            
            <Text style={styles.inputLabel}>Cinsiyet</Text>
            <TouchableOpacity style={styles.customPickerBox} onPress={() => togglePicker('p-gender')}>
              <Text style={styles.pickerBoxText}>{parentGender || 'Seçiniz'}</Text>
            </TouchableOpacity>
            {openPickerId === 'p-gender' && (
              <ScrollWheelPicker
                selectedValue={parentGender}
                data={['Seçiniz', 'Erkek', 'Kadın', 'Belirtmek İstemiyorum']}
                onValueChange={(val) => setParentGender(val)}
                autoCloseTrigger={() => setOpenPickerId(null)} 
              />
            )}

            <Text style={styles.inputLabel}>Yaş</Text>
            <TouchableOpacity style={styles.customPickerBox} onPress={() => togglePicker('p-age')}>
              <Text style={styles.pickerBoxText}>{parentAge || 'Seçiniz'}</Text>
            </TouchableOpacity>
            {openPickerId === 'p-age' && (
              <ScrollWheelPicker
                selectedValue={parentAge}
                data={getParentAgeItems()}
                initialFocusValue="35" 
                onValueChange={(val) => setParentAge(val)}
              />
            )}

            <Text style={styles.inputLabel}>Telefon Numarası *</Text>
            <TextInput placeholder="+905xxxxxxxx" placeholderTextColor="#8e8e93" style={styles.input} keyboardType="phone-pad" onChangeText={setParentPhone} value={parentPhone} />
            
            <Text style={styles.inputLabel}>Yedek Telefon Numarası (Opsiyonel)</Text>
            <TextInput placeholder="Yedek Telefon Numarası" placeholderTextColor="#8e8e93" style={styles.input} keyboardType="phone-pad" onChangeText={setParentBackupPhone} value={parentBackupPhone} />

            <Text style={styles.inputLabel}>Kan Grubu</Text>
            <TouchableOpacity style={styles.customPickerBox} onPress={() => togglePicker('p-blood')}>
              <Text style={styles.pickerBoxText}>{parentBloodType || 'Seçiniz'}</Text>
            </TouchableOpacity>
            {openPickerId === 'p-blood' && (
              <ScrollWheelPicker
                selectedValue={parentBloodType}
                data={['Seçiniz', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-']}
                onValueChange={(val) => setParentBloodType(val)}
                autoCloseTrigger={() => setOpenPickerId(null)}
              />
            )}

            <Text style={styles.inputLabel}>İl *</Text>
            <View style={styles.pickerContainer}>
              <Picker 
                selectedValue={parentCity} 
                onValueChange={(itemValue) => {
                  setParentCity(itemValue);
                  setOpenPickerId(null); 
                }}
              >
                <Picker.Item label="Şehir Seçiniz" value="" />
                {(citiesAndDistricts.getCities() || []).map((city: any) => (
                  <Picker.Item key={city.code} label={city.name} value={city.code} />
                ))}
              </Picker>
            </View>

            <Text style={styles.inputLabel}>İlçe *</Text>
            <View style={styles.pickerContainer}>
              <Picker 
                selectedValue={parentDistrict} 
                onValueChange={(itemValue) => setParentDistrict(itemValue)} 
                enabled={parentCity !== ''}
              >
                <Picker.Item label="İlçe Seçiniz" value="" />
                {(districtList || []).map((district: string, idx: number) => (
                  <Picker.Item key={`dist-${idx}`} label={district} value={district} />
                ))}
              </Picker>
            </View>

            <Text style={styles.inputLabel}>Detaylı Adres Tarifi *</Text>
            <TextInput placeholder="Adres tarifi..." placeholderTextColor="#8e8e93" style={[styles.input, { height: 80 }]} multiline onChangeText={setParentAddress} value={parentAddress} />
            
            <Text style={styles.inputLabel}>Ek Not (Kronik rahatsızlık, alerji vb.)</Text>
            <TextInput placeholder="Ek notlar..." placeholderTextColor="#8e8e93" style={[styles.input, { height: 60 }]} multiline onChangeText={setParentNote} value={parentNote} />
          </View>
        )}

        {activeTab === 'dependent' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Koruma Altındaki Canlı (Kayıp Türü)</Text>
            <Text style={styles.label}>Kayıp Profil Türünü Seçin:</Text>
            <View style={styles.typeButtonContainer}>
              {['Çocuk', 'Evcil Hayvan', 'Yaşlı'].map((type) => (
                <TouchableOpacity 
                  key={type}
                  style={[styles.typeButton, (dependentType === type || (type === 'Evcil Hayvan' && ['Kedi', 'Köpek', 'Kuş', 'Kemirgen', 'Sürüngen/Akvaryum', 'Diğer'].includes(dependentType))) && styles.typeButtonSelected]}
                  onPress={() => {
                    if (dependentType === type) return;
                    setDependentType(type);
                    setOpenPickerId(null); 
                    
                    const originalDependent = dbBackupRef.current || {};
                    const originalType = String(originalDependent?.category || originalDependent?.type || '');
                    
                    if ((originalType === 'Çocuk' || originalType === 'Yaşlı') && type === originalType || (originalType !== 'Çocuk' && originalType !== 'Yaşlı' && originalType !== '') && type === 'Evcil Hayvan') {
                      setDependentName(String(originalDependent?.name || ''));
                      setDependentGender(String(originalDependent?.gender || ''));
                      setDependentNote(String(originalDependent?.note || ''));
                      setDependentChipNumber(String(originalDependent?.chipNumber || ''));
                      setDependentBloodType(String(originalDependent?.bloodType || ''));
                      setDependentHeightWeight(String(originalDependent?.heightWeight || ''));
                      if (originalDependent?.age) setDependentAge(String(originalDependent.age).replace(/yaş/i, '').trim());
                      if (originalType !== 'Çocuk' && originalType !== 'Yaşlı') setDependentSubCategory(originalType);
                    } else {
                      setDependentName(''); setDependentAge(''); setDependentGender('');
                      setDependentHeightWeight(''); setDependentBloodType(''); setDependentNote('');
                      setDependentChipNumber(''); setDependentSubCategory('');
                    }
                  }}
                >
                  <Text style={[styles.typeButtonText, (dependentType === type || (type === 'Evcil Hayvan' && ['Kedi', 'Köpek', 'Kuş', 'Kemirgen', 'Sürüngen/Akvaryum', 'Diğer'].includes(dependentType))) && styles.typeButtonTextSelected]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {dependentType !== '' && (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.subLabel}>
                  {['Kedi', 'Köpek', 'Kuş', 'Kemirgen', 'Sürüngen/Akvaryum', 'Diğer'].includes(dependentType) ? 'Evcil Hayvan' : dependentType} Detaylı Bilgileri
                </Text>
                
                <Text style={styles.inputLabel}>{dependentType === 'Evcil Hayvan' ? "Evcil Hayvanın Adı *" : "İsim Soyisim *"}</Text>
                <TextInput placeholder="İsim giriniz *" placeholderTextColor="#8e8e93" style={styles.input} onChangeText={setDependentName} value={dependentName} />

                {dependentType === 'Evcil Hayvan' && (
                  <View>
                    <Text style={styles.inputLabel}>Evcil Hayvan Türü</Text>
                    <TouchableOpacity style={styles.customPickerBox} onPress={() => togglePicker('d-subcat')}>
                      <Text style={styles.pickerBoxText}>{dependentSubCategory || 'Seçiniz'}</Text>
                    </TouchableOpacity>
                    {openPickerId === 'd-subcat' && (
                      <ScrollWheelPicker
                        selectedValue={dependentSubCategory}
                        data={['Seçiniz', 'Kedi', 'Köpek', 'Kuş', 'Kemirgen', 'Sürüngen/Akvaryum', 'Diğer']}
                        onValueChange={(val) => setDependentSubCategory(val)}
                        autoCloseTrigger={() => setOpenPickerId(null)}
                      />
                    )}
                  </View>
                )}

                <Text style={styles.inputLabel}>Yaş</Text>
                <TouchableOpacity style={styles.customPickerBox} onPress={() => togglePicker('d-age')}>
                  <Text style={styles.pickerBoxText}>{dependentAge || 'Seçiniz'}</Text>
                </TouchableOpacity>
                {openPickerId === 'd-age' && (
                  <ScrollWheelPicker
                    selectedValue={dependentAge}
                    data={getDependentAgeItems()}
                    initialFocusValue={dependentType === 'Evcil Hayvan' ? '2' : '7'} 
                    onValueChange={(val) => setDependentAge(val)}
                  />
                )}

                <Text style={styles.inputLabel}>Cinsiyet</Text>
                <TouchableOpacity style={styles.customPickerBox} onPress={() => togglePicker('d-gender')}>
                  <Text style={styles.pickerBoxText}>{dependentGender || 'Seçiniz'}</Text>
                </TouchableOpacity>
                {openPickerId === 'd-gender' && (
                  <ScrollWheelPicker
                    selectedValue={dependentGender}
                    data={['Seçiniz', 'Erkek', dependentType === 'Evcil Hayvan' ? 'Dişi' : 'Kadın', 'Belirtmek İstemiyorum']}
                    onValueChange={(val) => setDependentGender(val)}
                    autoCloseTrigger={() => setOpenPickerId(null)}
                  />
                )}

                {(dependentType === 'Çocuk' || dependentType === 'Yaşlı') && (
                  <View>
                    <Text style={styles.inputLabel}>Boy</Text>
                    <TouchableOpacity style={styles.customPickerBox} onPress={() => togglePicker('d-boy')}>
                      <Text style={styles.pickerBoxText}>{(dependentHeightWeight?.includes(' - ')) ? dependentHeightWeight.split(' - ')[0] : 'Seçiniz'}</Text>
                    </TouchableOpacity>
                    {openPickerId === 'd-boy' && (
                      <ScrollWheelPicker
                        selectedValue={(dependentHeightWeight?.includes(' - ')) ? dependentHeightWeight.split(' - ')[0] : ''}
                        data={getBoyItems()}
                        initialFocusValue="120 cm" 
                        onValueChange={(val) => {
                          const currentWeight = (dependentHeightWeight?.includes(' - ')) ? dependentHeightWeight.split(' - ')[1] || '' : '';
                          setDependentHeightWeight(val || currentWeight ? `${val} - ${currentWeight}` : '');
                        }}
                      />
                    )}

                    <Text style={styles.inputLabel}>Kilo</Text>
                    <TouchableOpacity style={styles.customPickerBox} onPress={() => togglePicker('d-kilo')}>
                      <Text style={styles.pickerBoxText}>{(dependentHeightWeight?.includes(' - ')) ? dependentHeightWeight.split(' - ')[1] : 'Seçiniz'}</Text>
                    </TouchableOpacity>
                    {openPickerId === 'd-kilo' && (
                      <ScrollWheelPicker
                        selectedValue={(dependentHeightWeight?.includes(' - ')) ? dependentHeightWeight.split(' - ')[1] : ''}
                        data={getKiloItems()}
                        initialFocusValue="30 kg" 
                        onValueChange={(val) => {
                          const currentBoy = (dependentHeightWeight?.includes(' - ')) ? dependentHeightWeight.split(' - ')[0] || '' : '';
                          setDependentHeightWeight(currentBoy || val ? `${currentBoy} - ${val}` : '');
                        }}
                      />
                    )}
                    
                    <Text style={styles.inputLabel}>Kan Grubu</Text>
                    <TouchableOpacity style={styles.customPickerBox} onPress={() => togglePicker('d-blood')}>
                      <Text style={styles.pickerBoxText}>{dependentBloodType || 'Seçiniz'}</Text>
                    </TouchableOpacity>
                    {openPickerId === 'd-blood' && (
                      <ScrollWheelPicker
                        selectedValue={dependentBloodType}
                        data={['Seçiniz', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-']}
                        onValueChange={(val) => setDependentBloodType(val)}
                        autoCloseTrigger={() => setOpenPickerId(null)}
                      />
                    )}
                  </View>
                )}

                {dependentType === 'Evcil Hayvan' && (
                  <View>
                    <Text style={styles.inputLabel}>Aşı veya Çip Numarası</Text>
                    <TextInput placeholder="Aşı veya Çip Numarası (Varsa)" placeholderTextColor="#8e8e93" style={styles.input} onChangeText={setDependentChipNumber} value={dependentChipNumber} />
                  </View>
                )}

                <Text style={styles.inputLabel}>Ek Not</Text>
                <TextInput placeholder={dependentType === 'Evcil Hayvan' ? "Tasmasındaki künye no..." : "Alerji, kritik ilaçlar..."} placeholderTextColor="#8e8e93" style={[styles.input, { height: 70 }]} multiline onChangeText={setDependentNote} value={dependentNote} />

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
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Platform.OS === 'ios' ? 40 : 35, marginBottom: 15 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#beaf9f' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#e5e5ea', borderRadius: 10, padding: 4, marginBottom: 15, width: '100%', alignSelf: 'center' },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabButtonActive: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 2, elevation: 2 },
  tabButtonText: { fontSize: 13, fontWeight: '600', color: '#636366' },
  tabButtonTextActive: { color: '#beaf9f', fontWeight: '700' },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, width: Platform.OS === 'web' ? 400 : '100%', alignSelf: 'center', borderWidth: 0.5, borderColor: '#e5e5ea' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#beaf9f', textTransform: 'uppercase', letterSpacing: 0.5 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#48484a', marginBottom: 10 },
  subLabel: { fontSize: 15, fontWeight: 'bold', color: '#1c1c1e', marginVertical: 5, borderBottomWidth: 1, borderColor: '#f2f2f7', paddingBottom: 5 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#48484a', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#f2f2f7', padding: 12, borderRadius: 8, marginBottom: 4, fontSize: 15, color: '#000' },
  customPickerBox: { backgroundColor: '#f2f2f7', padding: 14, borderRadius: 8, marginBottom: 4, borderWidth: 0.5, borderColor: '#e5e5ea', justifyContent: 'center' },
  pickerBoxText: { fontSize: 15, color: '#1c1c1e', fontWeight: '500' },
  pickerContainer: { backgroundColor: '#f2f2f7', borderRadius: 8, marginBottom: 4, overflow: 'hidden', justifyContent: 'center', borderWidth: 0.5, borderColor: '#e5e5ea' },

  wheelWrapper: { backgroundColor: '#f2f2f7', borderRadius: 10, borderWidth: 0.5, borderColor: '#beaf9f', marginVertical: 6, height: ITEM_HEIGHT * 3, overflow: 'hidden', justifyContent: 'center', position: 'relative' },
  wheelSelectionIndicator: { position: 'absolute', top: ITEM_HEIGHT, left: 0, right: 0, height: ITEM_HEIGHT, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#beaf9f', backgroundColor: 'rgba(209, 199, 189, 0.2)' },
  wheelScrollView: { width: '100%', height: '100%' },
  wheelItem: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center', width: '100%' },
  wheelItemClickZone: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  wheelItemText: { fontSize: 15, color: '#8e8e93', fontWeight: '500' },
  wheelItemTextSelected: { color: '#2b231a', fontWeight: '700', fontSize: 16 },

  typeButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, gap: 10, marginTop: 5 },
  typeButton: { flex: 1, padding: 12, backgroundColor: '#f2f2f7', borderRadius: 10, alignItems: 'center', borderWidth: 0.5, borderColor: '#e5e5ea' },
  typeButtonSelected: { backgroundColor: '#d1c7bd', borderColor: '#beaf9f' },
  typeButtonText: { fontSize: 13, fontWeight: 'bold', color: '#636366' },
  typeButtonTextSelected: { color: '#2b231a', fontWeight: '700' }, 
  primaryButton: { backgroundColor: '#d1c7bd', borderWidth: 0.5, borderColor: '#beaf9f', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 5 },
  buttonText: { color: '#2b231a', fontWeight: '700', fontSize: 15, letterSpacing: 0.3 }
});