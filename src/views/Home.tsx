import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ProfileTemplate } from '../models/Profile';
import { saveProfileToFirebase } from '../controllers/ProfileController';

const Home = () => {
  const handleTestPush = async () => {
    const testData = {
      ...ProfileTemplate,
      tagId: '1030521006', // Firebase'deki mevcut ID ile test ediyoruz
      name: 'Mustafaa',
      bloodType: 'B Rh+',
      age: '17',
      isLost: false,
    };

    console.log("Frankfurt'a veri gönderiliyor...");
    const result = await saveProfileToFirebase(testData);

    if (result.success) {
      Alert.alert("Başarılı!", "Veri Frankfurt sunucusundaki 'profiles' koleksiyonuna yazıldı.");
    } else {
      Alert.alert("Hata!", "Veri gönderilemedi. Konsol çıktısına (CMD) bir bak.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>NFC-TT Kontrol Paneli</Text>
      <TouchableOpacity style={styles.button} onPress={handleTestPush}>
        <Text style={styles.buttonText}>Frankfurt'a Test Verisi Gönder</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 30, color: '#333' },
  button: { backgroundColor: '#007AFF', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 12, elevation: 5 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 18 }
});

export default Home;