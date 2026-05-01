import React, { useState } from 'react';
import { View, ActivityIndicator, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { getProfileForWeb } from './src/controllers/WebProfileController'; 
import WebProfileView from './src/views/WebProfileView';
import WebLoginScreen from './src/screens/WebLoginScreen';

export default function App() {
  const [tagId, setTagId] = useState(''); 
  const [profile, setProfile] = useState<any>(null); 
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null); // Giriş yapan kullanıcı durumu

  const handleSearch = async () => {
    if (!tagId) {
      alert("ID girmeden Frankfurt hattını meşgul etme kral!");
      return;
    }
    setLoading(true);
    try {
      const data = await getProfileForWeb(tagId);
      if (data) {
        setProfile(data);
      } else {
        alert("Böyle bir ID yok, Frankfurt'tan eli boş döndük.");
      }
    } catch (error) {
      console.log("Arama hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  // 1. ADIM: EĞER GİRİŞ YAPILMAMIŞSA SADECE LOGIN EKRANI GÖRÜNSÜN
  if (!user) {
    return (
      <View style={{ flex: 1 }}>
        <WebLoginScreen onLoginSuccess={(u: any) => setUser(u)} />
      </View>
    );
  }

  // 2. ADIM: GİRİŞ YAPILDIKTAN SONRAKİ ARAMA VE PROFİL SÜRECİ
  return (
    <View style={styles.container}>
      {/* Giriş yapan kullanıcıyı üstte gösterelim ki güven versin */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Hoş geldin, {user.email}</Text>
        <TouchableOpacity onPress={() => setUser(null)}>
          <Text style={{color: 'red'}}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>

      {!profile && !loading ? (
        <View style={styles.searchBox}>
          <Text style={styles.title}>NFC-TT Arama Paneli</Text>
          <TextInput 
            placeholder="Sorgulanacak Tag ID'yi gir..."
            style={styles.input}
            onChangeText={setTagId}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={{color: 'white', fontWeight: 'bold'}}>Sorgula</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text>Frankfurt'tan veri çekiliyor...</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <WebProfileView profileData={profile} />
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => { setProfile(null); setTagId(''); }}
          >
            <Text style={{color: '#007AFF', textAlign: 'center'}}>← Yeni Arama</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 15, 
    backgroundColor: 'white', 
    borderBottomWidth: 1, 
    borderColor: '#ddd' 
  },
  welcomeText: { fontWeight: 'bold', color: '#333' },
  searchBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  input: { 
    width: '100%', 
    maxWidth: 400, 
    backgroundColor: 'white', 
    padding: 15, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#ddd',
    marginBottom: 15 
  },
  searchButton: { 
    backgroundColor: '#007AFF', 
    padding: 15, 
    borderRadius: 10, 
    width: '100%', 
    maxWidth: 400, 
    alignItems: 'center' 
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: { padding: 20 }
});