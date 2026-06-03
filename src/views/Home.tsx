import React, { useState, useEffect } from 'react'; 
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ScrollView, BackHandler, ToastAndroid, Platform 
} from 'react-native';

// GÜNCEL SAF OLAN SAFEAREAVIEW VE KANKA BİZİM KORUMALI CONFIG BAĞLANTISI
import { SafeAreaView } from 'react-native-safe-area-context';
// Kanka bizim korumalı auth motorunu doğrudan buraya mühürledik:
import { auth } from '../config/firebaseConfig'; 
// KANKA: Sadece signOut motorunu çekiyoruz, getAuth kırıntısı tamamen temizlendi!
import { signOut } from 'firebase/auth'; 

import BottomBar from '../components/BottomBar';

export default function HomeScreen({ navigation }: any) {
  // Canlı bildirim durumunu simüle eden state
  const [activeAlert, setActiveAlert] = useState<any>(null);

  // =========================================================================
  // ⚓ KANKA: ANASAYFADA İKİNCİ BASIŞTA UYGULAMADAN TEMİZCE ÇIKARTAN MOTOR
  // =========================================================================
  useEffect(() => {
    let backPressCount = 0;

    const backAction = () => {
      // Eğer kullanıcı şu an aktif olarak Home ekranındaysa kilidi devreye sok
      if (navigation.isFocused()) {
        if (backPressCount === 0) {
          backPressCount++;
          
          // Android cihazlarda ekrana kurumsal uyarımızı basıyoruz kanka
          if (Platform.OS === 'android') {
            ToastAndroid.show('Çıkmak için tekrar basın.', ToastAndroid.SHORT);
          }
          
          // 2 saniye içinde ikinci kez basmazsa sayacı sıfırla ki kazara çıkmasın
          const timeout = setTimeout(() => {
            backPressCount = 0;
          }, 2000);
          
          return true; // İlk basışta uygulamadan çıkışı bloke et, stack'i koru
        } else {
          BackHandler.exitApp(); // İkinci basışta sonsuz döngüyü kır ve temizce çık kanka!
          return true;
        }
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    
    // Temizlik fonksiyonu: Event listener'ı uçur ki bellek sızıntısı (memory leak) yapmasın
    return () => backHandler.remove();
  }, [navigation]);

  // Güvenli çıkış fonksiyonu
  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('[Oturum Yönetimi] Kullanıcı oturumu başarıyla kapatıldı.');
    } catch (err) {
      console.error('[Oturum Hatası] Oturum kapatılırken bir sorun oluştu:', err);
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
          <MaterialCommunityIcons name="logout" size={16} color="#000" style={{ marginRight: 6 }} />
          <Text style={styles.logoutText}>Güvenli Çıkış</Text>
        </TouchableOpacity>
      </View>

      {/* 2. ORTA KISIM: BİLDİRİM PANELİ İÇERİĞİ */}
      <ScrollView style={styles.mainContent} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        
        {/* DİNAMİK DURUM KARTI */}
        {activeAlert ? (
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
          <View style={[styles.statusCard, styles.safeCard]}>
            <Text style={styles.safeTitle}>🟢 Sistem Aktif</Text>
            <Text style={styles.safeText}>Şu an bildirilen herhangi bir kayıp durumu bulunmuyor. Tüm etiketleriniz güvende.</Text>
          </View>
        )}
      </ScrollView>

      {/* ================= NEW COMPONENT BOTTOM BAR ================= */}
      <BottomBar navigation={navigation} activeScreen="Home" />

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
    paddingTop: Platform.OS === 'android' ? 20 : 5,
    width: '100%' 
  },
  mainContent: { flex: 1 },
  welcomeText: { fontSize: 24, fontWeight: 'bold', color: '#222' },
  subText: { fontSize: 14, color: '#666', marginTop: 5, marginBottom: 15 },
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
});