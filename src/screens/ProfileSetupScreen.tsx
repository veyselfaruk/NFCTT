import React, { useState } from 'react';
import { Picker } from '@react-native-picker/picker';
const citiesAndDistricts = require('turkey-neighbourhoods');
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, Platform, Alert, Image 
} from 'react-native';

// Frankfurt'a veri yazacak controller'ları ileride buraya bağlayacağız
import { saveProfileToFirebase } from '../controllers/ProfileController';

export default function ProfileSetupScreen({ navigation }: any) {
  const [step, setStep] = useState(1); // Veli Bilgileri, Bağımlı Bilgileri

  // --- VELİ STATE'LERİ ---
  const [parentName, setParentName] = useState('');
  const [parentGender, setParentGender] = useState('');
  const [parentAge, setParentAge] = useState('');
  const [parentAddress, setParentAddress] = useState('');
  const [parentBloodType, setParentBloodType] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentNote, setParentNote] = useState('');

  // --- BAĞIMLI (ÇOCUK/HASTA/ANIMAL) STATE'LERİ ---
  const [dependentType, setDependentType] = useState(''); // 'Çocuk', 'Evcil Hayvan', 'Yaşlı'
  const [dependentName, setDependentName] = useState('');
  const [dependentAge, setDependentAge] = useState('');
  const [dependentGender, setDependentGender] = useState('');
  const [dependentHeightWeight, setDependentHeightWeight] = useState('');
  const [dependentBloodType, setDependentBloodType] = useState('');
  const [dependentNote, setDependentNote] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') alert(`${title}: ${message}`);
    else Alert.alert(title, message);
  };

  const handleNextStep = () => {
    if (!parentName || !parentPhone || !parentAddress) {
      notify('Uyarı', 'Lütfen temel veli bilgilerini (İsim, İletişim, Adres) doldur kanka.');
      return;
    }
    setStep(2);
  };

  const handleSaveAll = async () => {
    if (!dependentType) {
      notify('Uyarı', 'Lütfen önce velisi olduğunuz canlı türünü seçin.');
      return;
    }
    if (!dependentName) {
      notify('Uyarı', 'Lütfen isim soyisim alanını boş bırakmayın.');
      return;
    }

    // Bütün datayı Frankfurt sunucusuna göndermek üzere paketliyoruz
    const finalData = {
      dependent: {
        age: dependentAge,
        gender: dependentGender,
        heightWeight: dependentHeightWeight,
        bloodType: dependentBloodType,
        note: dependentNote,
        photo: photoUri,
        type: dependentType,
      },
      parent: {
        name: parentName,
        phone: parentPhone,
        address: parentAddress,
        age: parentAge,
        gender: parentGender,
        bloodType: parentBloodType,
        note: parentNote
      }
    };

    console.log("Frankfurt'a gidecek paket:", finalData);
    
    // 1. Veriyi arka planda Frankfurt Firestore'a gönderiyoruz
    await saveProfileToFirebase(finalData); 

    // 2. Kullanıcıya başarılı bildirimini fırlatıyoruz
    notify('Başarılı', 'Profil bilgileri Frankfurt sunucusuna başarıyla işlendi!');

    // 3. Bildirimin ardından bizi yeni Komuta Merkezine uçuruyor
    navigation.navigate('Home');
  };

  // Sahte fotoğraf seçme simülasyonu (İleride kamerayı/galeriyi bağlayacağız)
  const pickPhoto = () => {
    setPhotoUri('https://via.placeholder.com/150');
    notify('Fotoğraf', 'Profil fotoğrafı başarıyla eklendi (Simüle edildi).');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* SAĞ ÜST KÖŞEDEKİ KULLANICI PROFİL FOTOĞRAFI ALANI */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NFCTT Profil Kurulumu</Text>
        <TouchableOpacity style={styles.profilePhotoContainer} onPress={pickPhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.profilePhoto} />
          ) : (
            <Text style={styles.photoPlaceholderText}>Fotoğraf</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ADIM 1: VELİ BİLGİLERİ */}
      {step === 1 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Veli (Hesap Sahibi) Bilgileri</Text>
          
          <TextInput placeholder="İsim Soyisim *" style={styles.input} onChangeText={setParentName} value={parentName} />
          <Text style={styles.inputLabel}>Cinsiyet</Text>
          <View style={styles.pickerContainer}>
          <Picker
          selectedValue={parentGender}
          onValueChange={(itemValue) => setParentGender(itemValue)}
          dropdownIconColor="#FFF" // Tasarımına göre rengi değiştirebilirsin kanka
          >
          <Picker.Item label="Seçiniz" value="" />
          <Picker.Item label="Erkek" value="Erkek" />
          <Picker.Item label="Kadın" value="Kadın" />
          <Picker.Item label="Belirtmek İstemiyorum" value="Belirtmek İstemiyorum" />
          </Picker>
          </View>
          <Text style={styles.inputLabel}>Yaş</Text>
<View style={styles.pickerContainer}>
  <Picker
    selectedValue={parentAge}
    onValueChange={(itemValue) => setParentAge(itemValue)}
  >
    <Picker.Item label="Seçiniz" value="" />
    {Array.from({ length: 82 }, (_, i) => i + 18).map((age) => (
      <Picker.Item key={age} label={String(age)} value={String(age)} />
    ))}
  </Picker>
</View>
          <TextInput placeholder="İletişim Bilgileri (Telefon) *" style={styles.input} keyboardType="phone-pad" onChangeText={setParentPhone} value={parentPhone} />
          <Text style={styles.inputLabel}>Kan Grubu</Text>
<View style={styles.pickerContainer}>
  <Picker
    selectedValue={parentBloodType}
    onValueChange={(itemValue) => setParentBloodType(itemValue)}
  >
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
          <TextInput placeholder="Adres *" style={[styles.input, { height: 80 }]} multiline onChangeText={setParentAddress} value={parentAddress} />
          <TextInput placeholder="Ek Not (Hastalık, kronik durum vb.)" style={[styles.input, { height: 60 }]} multiline onChangeText={setParentNote} value={parentNote} />

          <TouchableOpacity style={styles.primaryButton} onPress={handleNextStep}>
            <Text style={styles.buttonText}>Kayıp/Bağımlı Türü Seçimine Geç →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ADIM 2: VELİSİ OLDUĞU CANLI BİLGİLERİ */}
      {step === 2 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. Velisi Olduğunuz Canlı (Kayıp Türü)</Text>
          
          {/* SIRALI TEXT BUTTONLARLA TİP BELİRLEME */}
          <Text style={styles.label}>Kayıp Profili Türünü Seçin:</Text>
          <View style={styles.typeButtonContainer}>
            {['Çocuk', 'Evcil Hayvan', 'Yaşlı'].map((type) => (
              <TouchableOpacity 
                key={type}
                style={[styles.typeButton, dependentType === type && styles.typeButtonSelected]}
                onPress={() => setDependentType(type)}
              >
                <Text style={[styles.typeButtonText, dependentType === type && styles.typeButtonTextSelected]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* SEÇİLEN TİPE GÖRE BİLGİ DOLDURMA */}
          {dependentType !== '' && (
            <View style={{ marginTop: 15 }}>
              <Text style={styles.subLabel}>{dependentType} Detaylı Bilgileri</Text>
              <TextInput placeholder="İsim Soyisim / Evcil Hayvan Adı *" style={styles.input} onChangeText={setDependentName} value={dependentName} />
              <TextInput placeholder="Yaş" style={styles.input} keyboardType="numeric" onChangeText={setDependentAge} value={dependentAge} />
              <TextInput placeholder="Cinsiyet" style={styles.input} onChangeText={setDependentGender} value={dependentGender} />
              <TextInput placeholder="Boy - Kilo" style={styles.input} onChangeText={setDependentHeightWeight} value={dependentHeightWeight} />
              <TextInput placeholder="Kan Grubu (İnsanlar için)" style={styles.input} onChangeText={setDependentBloodType} value={dependentBloodType} />
              <TextInput placeholder="Additional Not (Örn: Tasmasındaki künye no, kaçtığı bölge, kritik ilaçlar)" style={[styles.input, { height: 70 }]} multiline onChangeText={setDependentNote} value={dependentNote} />

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
    marginBottom: 8,
    marginTop: 12,
  },
  pickerContainer: {
    backgroundColor: '#f9f9f9', // Senin mevcut input arka plan renginle eşitledim kanka
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee', // Senin mevcut input border renginle eşitledim
    marginBottom: 12,
    overflow: 'hidden',
    justifyContent: 'center',
  }
});