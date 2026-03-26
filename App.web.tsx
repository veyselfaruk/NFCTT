import React, { useState, useEffect } from 'react';
// DİKKAT: Text ve View'u süslü parantez içinde almazsan o hatayı verir!
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

// Senin Firebase Bilgilerin (Frankfurt Bağlantısı)
const firebaseConfig = {
  apiKey: "AIzaSyC9h3VYZ-Ch40eaBH6dAJEApjD3Vg8VGHM",
  authDomain: "nfc-tt-7c604.firebaseapp.com",
  projectId: "nfc-tt-7c604",
  storageBucket: "nfc-tt-7c604.firebasestorage.app",
  messagingSenderId: "320574488770",
  appId: "1:320574488770:web:7331e60aeec19f6d857b5b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getData = async () => {
      try {
        // Frankfurt'tan senin öğrenci numaranla sorgu atıyoruz
        const docRef = doc(db, "profiles", "1030521006");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setProfile(snap.data());
        }
      } catch (error) {
        console.log("Firebase Veri Hatası:", error);
      }
      setLoading(false);
    };
    getData();
  }, []);

  return (
    <View style={styles.container}>
      {/* Bu sarı şeridi görüyorsan Expo çalışıyor demektir! */}
      <View style={{ backgroundColor: 'yellow', padding: 10, width: '100%' }}>
        <Text style={{ textAlign: 'center', fontWeight: 'bold' }}>NFCTT WEB SİSTEMİ AKTİF</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : profile ? (
        <View style={styles.card}>
          <Text style={styles.header}>Kişi Bilgileri</Text>
          <Text style={styles.text}>👤 Ad: {profile.name}</Text>
          <Text style={styles.text}>🩸 Kan: {profile.bloodType}</Text>
          <Text style={[styles.text, { fontWeight: 'bold', color: profile.isLost ? 'red' : 'green' }]}>
            Durum: {profile.isLost ? "⚠️ KAYIP" : "✅ GÜVENDE"}
          </Text>
        </View>
      ) : (
        <Text>Veri çekilemedi, Frankfurt bağlantısını kontrol et.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5', 
    alignItems: 'center', 
    justifyContent: 'center',
    height: '100vh' as any // Tarayıcıyı kaplaması için şart
  },
  card: { 
    backgroundColor: 'white', 
    padding: 30, 
    borderRadius: 15, 
    elevation: 5, 
    width: '90%', 
    maxWidth: 400,
    marginTop: 20
  },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  text: { fontSize: 18, marginBottom: 8 }
});