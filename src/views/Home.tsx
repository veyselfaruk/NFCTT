import React, { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ScrollView, Platform 
} from 'react-native';

// GÜNCEL SAF OLAN SAFEAREAVIEW VE FIREBASE AUTH YAPILARI
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth, signOut } from 'firebase/auth';

export default function HomeScreen({ navigation }: any) {
  // Canlı bildirim durumunu simüle eden state
  const [activeAlert, setActiveAlert] = useState<any>(null);

  // Güvenli çıkış fonksiyonu (Tek çatı altında topladık)
  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      console.log('Kullanıcı oturumu başarıyla kapatıldı.');
    } catch (err) {
      console.error('Oturum kapatılırken bir hata oluştu:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* 1. ÜST KISIM: BAŞLIK ALANI VE SAĞ ÜST GÜVENLİ ÇIKIŞ BUTONU */}
      <View style={styles.headerContainer}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.welcomeText}>NFCTT Güvenlik Merkezi</Text>
          <Text style={styles.subText}>Akıllı etiketleriniz anlık olarak bulut sistemi üzerinden takip edilmektedir.</Text>
        </View>

        {/* SAĞ ÜST MİNİMALİST GÜVENLİ ÇIKIŞ BUTONU */}
        <TouchableOpacity style={styles.logoutTopButton} onPress={handleLogout}>
        {/* Attığın görseldeki minimalist kapı ve ok ikonunun birebir aynısı */}
          <MaterialCommunityIcons name="logout" size={16} color="#000" style={{ marginRight: 6 }} />
          <Text style={styles.logoutText}>Güvenli Çıkış</Text>
        </TouchableOpacity>
      </View>

      {/* 2. ORTA KISIM: BİLDİRİM PANELİ İÇERİĞİ */}
      <ScrollView style={styles.mainContent} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        
        {/* DİNAMİK DURUM KARTI */}
        {activeAlert ? (
          // EĞER BULUCUDAN BİLDİRİM GELDİYSE (ACİL DURUM MODU)
          <View style={[styles.statusCard, styles.alertCard]}>
            <Text style={styles.alertTitle}>🚨 ETİKETİNİZ OKUTULDU!</Text>
            <Text style={styles.alertTime}>{activeAlert.time}</Text>
            
            <View style={styles.noteContainer}>
              <Text style={styles.noteLabel}>Bulucu Notu:</Text>
              {activeAlert.finderNote && activeAlert.finderNote.trim() !== "" ? (
                <Text style={styles.noteText}>"{activeAlert.finderNote}"</Text>
              ) : (
                <Text style={[styles.noteText, { color: '#888', fontStyle: 'italic' }]}>
                  Bulucu herhangi bir yazılı not bırakmadı.
                </Text>
              )}
            </View>

            {/* AKSİYON BUTONLARI */}
            <TouchableOpacity style={styles.actionButtonPrimary}>
              <Text style={styles.actionButtonText}>💬 Bulucuyla İletişime Geç</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButtonSecondary}>
              <Text style={styles.actionButtonTextSecondary}>📍 Konumu Görüntüle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // EĞER HER ŞEY YOLUNDAYSA (SESSİZ MOD)
          <View style={[styles.statusCard, styles.safeCard]}>
            <Text style={styles.safeTitle}>🟢 Sistem Aktif</Text>
            <Text style={styles.safeText}>Şu an bildirilen herhangi bir kayıp durumu bulunmuyor. Tüm etiketleriniz güvende.</Text>
          </View>
        )}
      </ScrollView>

      {/* 3. ALT KISIM: ALT ŞERİT (BOTTOM BAR - ESKİ ORİJİNAL HALİ) */}
      <View style={styles.bottomBar}>
        
        {/* SOL: AYARLAR (GÜNCELLEME PARAMETRESİ GÖNDERİYORUZ) */}
        <TouchableOpacity 
          style={styles.barItem} 
          onPress={() => navigation.navigate('ProfileSetup', { isUpdating: true })} // <--- BURAYA { isUpdating: true } EKLEDİK KANKA
        >
          <Text style={styles.barIcon}>⚙️</Text>
          <Text style={styles.barText}>Ayarlar</Text>
        </TouchableOpacity>

        {/* ORTA: NFC OKUTMA BUTONU */}
        <TouchableOpacity style={styles.nfcBarItem}>
          <View style={styles.nfcCircle}>
            <Text style={styles.nfcIcon}>📶</Text>
          </View>
          <Text style={[styles.barText, { marginTop: 4, fontWeight: 'bold', color: '#007AFF' }]}>NFC Tarat</Text>
        </TouchableOpacity>

       {/* SAĞ: PROFİLİM SEKMESİ (ŞİMDİLİK BOŞ / ASKIDA) */}
        <TouchableOpacity 
          style={styles.barItem} 
          onPress={() => {
            // Kanka burayı şimdilik askıya aldık, basınca uygulamanın önünü kesmesin
            alert('Profil sayfanız çok yakında aktif olacaktır!');
          }} 
        >
          <Text style={styles.barIcon}>👤</Text>
          <Text style={styles.barText}>Profilim</Text>
        </TouchableOpacity>

      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', width: '100%', height: '100%' },
  headerContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'android' ? 15 : 5,
    width: '100%' 
  },
  mainContent: { flex: 1 },
  welcomeText: { fontSize: 24, fontWeight: 'bold', color: '#222' },
  subText: { fontSize: 14, color: '#666', marginTop: 5, marginBottom: 15 },
  
  // YENİ SAĞ ÜST ÇIKIŞ BUTONU STİLLERİ
  logoutTopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#000', 
    marginTop: 5,
  },
  logoutIcon: { 
    fontSize: 14, 
    marginRight: 4,
  },
  logoutText: { 
    color: '#000', 
    fontSize: 12, 
    fontWeight: '700',
    textTransform: 'uppercase', 
    letterSpacing: 0.5,
  },

  statusCard: { padding: 20, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  safeCard: { backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#c8e6c9' },
  safeTitle: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32' },
  safeText: { fontSize: 15, color: '#4caf50', marginTop: 10, lineHeight: 22 },
  alertCard: { backgroundColor: '#ffebee', borderWidth: 1, borderColor: '#ffcdd2' },
  alertTitle: { fontSize: 20, fontWeight: 'bold', color: '#c62828' },
  alertTime: { fontSize: 12, color: '#e53935', marginTop: 2, marginBottom: 15 },
  noteContainer: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ffb74d' },
  noteLabel: { fontSize: 13, fontWeight: 'bold', color: '#ff9800', marginBottom: 5 },
  noteText: { fontSize: 15, color: '#333', fontStyle: 'italic', lineHeight: 22 },
  actionButtonPrimary: { backgroundColor: '#c62828', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  actionButtonSecondary: { backgroundColor: 'white', padding: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#c62828' },
  actionButtonText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  actionButtonTextSecondary: { color: '#c62828', fontWeight: 'bold', fontSize: 15 },
  bottomBar: { flexDirection: 'row', height: Platform.OS === 'ios' ? 90 : 75, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#eee', justifyContent: 'space-around', alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 20 : 0 },
  barItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  barIcon: { fontSize: 24, marginBottom: 3 },
  barText: { fontSize: 12, color: '#555' },
  nfcBarItem: { alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: -25 },
  nfcCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 6, borderWidth: 1, borderColor: '#eee' },
  nfcIcon: { fontSize: 28 }
});