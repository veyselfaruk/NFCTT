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
// 🎯 TEKERLEK SEÇİCİ (SCROLL WHEEL PICKER) MOTORU - TASARIM VE İŞLEV KORUNDU
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
  const lockScrollEvent = useRef(false);

  const scrollToValue = (value: string, animated = true) => {
    const targetValue = value || 'Seçiniz';
    const index = data.indexOf(targetValue);
    if (index !== -1 && scrollViewRef.current) {
      lockScrollEvent.current = true;
      scrollViewRef.current.scrollTo({ y: index * ITEM_HEIGHT, animated });
      setTimeout(() => { lockScrollEvent.current = false; }, 150);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedValue && selectedValue !== 'Seçiniz') {
        scrollToValue(selectedValue, false);
      } else if (initialFocusValue) {
        scrollToValue(initialFocusValue, false);
      } else {
        scrollToValue('Seçiniz', false);
      }
      isInitialRender.current = false;
    }, 80);
    return () => clearTimeout(timer);
  }, [selectedValue]);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isInitialRender.current || lockScrollEvent.current) return;
    
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
                    if (lockScrollEvent.current) return;
                    onValueChange(item === 'Seçiniz' ? '' : item);
                    scrollToValue(item, true);
                    if (autoCloseTrigger) setTimeout(autoCloseTrigger, 300); 
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

  // Orijinal yedek referansı
  const dbBackupRef = useRef<any>(null);

  const getParentAgeItems = () => {
    const items = Array.from({ length: 88 }, (_, i) => String(i + 12));
    return ['Seçiniz', ...items];
  };

  const getDependentAgeItems = () => {
    const limit = dependentType === 'Evcil Hayvan' ? 31 : 19;
    const items = Array.from({ length: limit }, (_, i) => String(i));
    return ['Seçiniz', ...items];
  };

  const getBoyItems = () => {
    const items = Array.from({ length: 191 }, (_, i) => `${i + 30} cm`);
    return ['Seçiniz', ...items];
  };

  const getKiloItems = () => {
    const items = Array.from({ length: 148 }, (_, i) => `${i + 3} kg`);
    return ['Seçiniz', ...items];
  };

  // Veri Yükleme Motoru
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
          } else {
            if (incomingName) setParentName(incomingName);
          }
        }
      } catch (error) {
        console.error("Profil datası yüklenirken hata:", error);
      } finally {
        if (isMounted) {
          setCheckingProfile(false);
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

    setOpenPickerId(null);

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
        setDependentBoy('');
        setDependentKilo('');
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
      setDependentSubCategory('');
      setDependentName('');
      setDependentChipNumber('');
      setDependentAge('');
      setDependentBoy('');
      setDependentKilo('');
      setDependentGender('');
      setDependentBloodType('');
      setDependentNote('');
    }
  };

  // =========================================================================
  // 🚀 SENARYOMUZUN KALBİ: KAYDEDİP DİREKT PROFILESCREEN'E ATAN FONKSİYON
  // =========================================================================
  const handleSaveAll = async () => {
    if (!parentName.trim() || !parentPhone.trim() || !parentCity || !parentDistrict || !parentAddress.trim()) {
      Alert.alert('Eksik Veli Bilgisi', 'Lütfen veli kısmındaki zorunlu (*) alanları doldurun kanka.');
      setActiveTab('parent');
      return;
    }
    if (!dependentType || !dependentName.trim()) {
      Alert.alert('Eksik Canlı Bilgisi', 'Lütfen canlı profil türünü ve ismini doldurun reis.');
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
      Alert.alert('Başarılı', 'Profil kurulumu tamamlandı, profilinize yönlendiriliyorsunuz.');
      
      // 🎯 SENARYO GEREĞİ: Reset atarak doğrudan ProfileScreen sayfasına uçuyoruz kanka!
      navigation.reset({
        index: 0,
        routes: [{ name: 'ProfileScreen' }],
      });
    } catch (error) {
      console.error("Kaydedilirken hata oluştu:", error);
      Alert.alert("Hata", "Profil kaydedilemedi, tekrar dene reis.");
    } finally {
      setIsDataLoading(false);
    }
  };

  const togglePicker = (pickerId: string) => {
    setOpenPickerId(openPickerId === pickerId ? null : pickerId);
  };

  if (checkingProfile) {
    return (
      <View style={styles.centerLoad}>
        <ActivityIndicator size="large" color="#beaf9f" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        
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
            <TextInput placeholder="İsim Soyisim *" placeholderTextColor="#8e8e93" style={styles.input} onChangeText={setParentName} value={parentName} />
            
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
            
            <Text style={styles.inputLabel}>Yedek Telefon Numarası</Text>
            <TextInput placeholder="Yedek Telefon" placeholderTextColor="#8e8e93" style={styles.input} keyboardType="phone-pad" onChangeText={setParentBackupPhone} value={parentBackupPhone} />

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
              <Picker selectedValue={parentCity} onValueChange={(val) => { setParentCity(val); setOpenPickerId(null); }}>
                <Picker.Item label="Şehir Seçiniz" value="" />
                {(citiesAndDistricts.getCities() || []).map((city: any) => (
                  <Picker.Item key={city.code} label={city.name} value={city.code} />
                ))}
              </Picker>
            </View>

            <Text style={styles.inputLabel}>İlçe *</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={parentDistrict} onValueChange={(val) => setParentDistrict(val)} enabled={parentCity !== ''}>
                <Picker.Item label="İlçe Seçiniz" value="" />
                {(districtList || []).map((d: string, idx: number) => (
                  <Picker.Item key={`dist-${idx}`} label={d} value={d} />
                ))}
              </Picker>
            </View>

            <Text style={styles.inputLabel}>Detaylı Adres Tarifi *</Text>
            <TextInput placeholder="Adres tarifi..." placeholderTextColor="#8e8e93" style={[styles.input, { height: 80 }]} multiline onChangeText={setParentAddress} value={parentAddress} />
            
            <Text style={styles.inputLabel}>Veli Notu</Text>
            <TextInput placeholder="Eklemek istediğiniz not..." placeholderTextColor="#8e8e93" style={[styles.input, { height: 60 }]} multiline onChangeText={setParentNote} value={parentNote} />
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
                      <Text style={styles.pickerBoxText}>{dependentBoy || 'Seçiniz'}</Text>
                    </TouchableOpacity>
                    {openPickerId === 'd-boy' && (
                      <ScrollWheelPicker
                        selectedValue={dependentBoy}
                        data={getBoyItems()}
                        initialFocusValue="120 cm" 
                        onValueChange={(val) => setDependentBoy(val)}
                      />
                    )}

                    <Text style={styles.inputLabel}>Kilo</Text>
                    <TouchableOpacity style={styles.customPickerBox} onPress={() => togglePicker('d-kilo')}>
                      <Text style={styles.pickerBoxText}>{dependentKilo || 'Seçiniz'}</Text>
                    </TouchableOpacity>
                    {openPickerId === 'd-kilo' && (
                      <ScrollWheelPicker
                        selectedValue={dependentKilo}
                        data={getKiloItems()}
                        initialFocusValue="30 kg" 
                        onValueChange={(val) => setDependentKilo(val)}
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
                <TextInput placeholder="Kritik sağlık veya davranış notları..." placeholderTextColor="#8e8e93" style={[styles.input, { height: 70 }]} multiline onChangeText={setDependentNote} value={dependentNote} />

                {/* 👑 BİZİ PROFILESCREEN'E UÇURACAK ASIL BUTON */}
                <View style={{ marginTop: 25 }}>
                  <TouchableOpacity disabled={isDataLoading} style={styles.primaryButton} onPress={handleSaveAll}>
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
      
      {/* 👑 NAVİGASYON BARI SAPASAĞLAM VE ORİJİNAL YERİNDE REİS */}
      <BottomBar navigation={navigation} activeScreen="Settings" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 15 },
  centerLoad: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Platform.OS === 'ios' ? 45 : 45, marginBottom: 15 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1c1c1e' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#e5e5ea', borderRadius: 10, padding: 4, marginBottom: 15, width: '100%' },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabButtonActive: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 2, elevation: 2 },
  tabButtonText: { fontSize: 13, fontWeight: '600', color: '#636366' },
  tabButtonTextActive: { color: '#beaf9f', fontWeight: '700' },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, width: '100%', borderWidth: 0.5, borderColor: '#e5e5ea' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#beaf9f', textTransform: 'uppercase', letterSpacing: 0.5 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#48484a', marginBottom: 10 },
  subLabel: { fontSize: 15, fontWeight: 'bold', color: '#1c1c1e', marginVertical: 5, borderBottomWidth: 1, borderColor: '#f2f2f7', paddingBottom: 5 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#48484a', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#f2f2f7', padding: 12, borderRadius: 8, marginBottom: 4, fontSize: 15, color: '#000' },
  customPickerBox: { backgroundColor: '#f2f2f7', padding: 14, borderRadius: 8, marginBottom: 4, borderWidth: 0.5, borderColor: '#e5e5ea', justifyContent: 'center' },
  pickerBoxText: { fontSize: 15, color: '#1c1c1e', fontWeight: '500' },
  pickerContainer: { backgroundColor: '#f2f2f7', borderRadius: 8, marginBottom: 4, overflow: 'hidden', borderWidth: 0.5, borderColor: '#e5e5ea' },
  wheelWrapper: { backgroundColor: '#f2f2f7', borderRadius: 10, borderWidth: 0.5, borderColor: '#beaf9f', marginVertical: 6, height: ITEM_HEIGHT * 3, overflow: 'hidden', position: 'relative' },
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