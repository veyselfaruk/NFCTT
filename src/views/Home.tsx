import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ScrollView, SafeAreaView, Platform 
} from 'react-native';

export default function HomeScreen({ navigation }: any) {
  // Canlı durumu simüle eden state. 
  // Test etmek için 'finderNote' alanını boş string "" yaparsan "Not eklenmedi" durumunu görürsün.
  // Eğer hiçbir bildirim yoksa bu state'i direkt null yapabiliriz: const [activeAlert, setActiveAlert] = useState<any>(null);
  const [activeAlert, setActiveAlert] = useState<any>({
    finderNote: "Çocuğu parktaki kafenin yanında buldum, güvende. Yanındayım şu an.", // Opsiyonel alan
    time: "Şimdi",
  });

  return (
    <SafeAreaView style={styles.container}>
      
      {/* 1. ÜST KISIM: KOMUTA MERKEZİ VE BİLDİRİM PANELİ */}
      <ScrollView style={styles.mainContent} contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.welcomeText}>NFCTT Komuta Merkezi</Text>
        <Text style={styles.subText}>Etiketleriniz Frankfurt sunucusu üzerinden canlı izleniyor.</Text>

        {/* DİNAMİK DURUM KARTI */}
        {activeAlert ? (
          // EĞER BULUCUDAN BİLDİRİM GELDİYSE (ACİL DURUM MODU)
          <View style={[styles.statusCard, styles.alertCard]}>
            <Text style={styles.alertTitle}>🚨 ETİKETİNİZ OKUTULDU!</Text>
            <Text style={styles.alertTime}>{activeAlert.time}</Text>
            
            <View style={styles.noteContainer}>
              <Text style={styles.noteLabel}>Bulucu Notu (Opsiyonel):</Text>
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
              <Text style={styles.actionButtonText}>💬 Bulucuyla Sohbet Başlat</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButtonSecondary}>
              <Text style={styles.actionButtonTextSecondary}>📍 Canlı Konumu Gör</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // EĞER HER ŞEY YOLUNDAYSA (SESSİZ MOD)
          <View style={[styles.statusCard, styles.safeCard]}>
            <Text style={styles.safeTitle}>🟢 Sistem Aktif</Text>
            <Text style={styles.safeText}>Şu an bildirilen herhangi bir kayıp durumu yok. Etiketleriniz güvende.</Text>
          </View>
        )}
      </ScrollView>

      {/* 2. ALT KISIM: ALT ŞERİT (BOTTOM BAR) */}
      <View style={styles.bottomBar}>
        
        {/* SOL: AYARLAR (YENİDEN SETUP'A DÖNDÜRÜR) */}
        <TouchableOpacity 
          style={styles.barItem} 
          onPress={() => navigation.navigate('ProfileSetup')}
        >
          <Text style={styles.barIcon}>⚙️</Text>
          <Text style={styles.barText}>Ayarlar</Text>
        </TouchableOpacity>

        {/* ORTA: NFC OKUTMA BUTONU */}
        <TouchableOpacity style={styles.nfcBarItem}>
          <View style={styles.nfcCircle}>
            <Text style={styles.nfcIcon}>📶</Text>
          </View>
          <Text style={[styles.barText, { marginTop: 4, fontWeight: 'bold', color: '#007AFF' }]}>NFC Oku</Text>
        </TouchableOpacity>

        {/* SAĞ: KULLANICI PROFİLİ */}
        <TouchableOpacity style={styles.barItem}>
          <Text style={styles.barIcon}>👤</Text>
          <Text style={styles.barText}>Profil</Text>
        </TouchableOpacity>

      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  mainContent: { flex: 1 },
  welcomeText: { fontSize: 24, fontWeight: 'bold', color: '#222', marginTop: Platform.OS === 'android' ? 20 : 0 },
  subText: { fontSize: 14, color: '#666', marginTop: 5, marginBottom: 25 },
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