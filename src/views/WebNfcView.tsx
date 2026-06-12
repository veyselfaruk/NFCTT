import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, ScrollView, useWindowDimensions 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { db, auth } from '../config/firebaseConfig';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

interface WebNfcViewProps {
  // Profil sayfasına yönlendirme yapabilmek için App.web.tsx'ten geçireceğimiz tetikleyici fonksiyon
  onNavigateToProfile: (targetUid: string) => void;
}

export default function WebNfcView({ onNavigateToProfile }: WebNfcViewProps) {
  const [tagIdInput, setTagIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const currentUser = auth.currentUser;

  // =========================================================================
  // 🚀 CORE WEB PROVISIONING ENGINE (FIREBASE LOGIC RECONSTRUCTED)
  // =========================================================================
  const handleWebTagQuery = async () => {
    if (!tagIdInput.trim()) {
      alert("Lütfen işlem yapmak için geçerli bir Etiket (Tag) ID giriniz kral.");
      return;
    }

    if (!currentUser) {
      alert("Bu işlem için önce oturum açmanız gerekmektedir.");
      return;
    }

    const cleanTagId = tagIdInput.trim();
    setLoading(true);

    try {
      const tagRef = doc(db, "nfc_tags", cleanTagId);
      const tagSnap = await getDoc(tagRef);

      if (!tagSnap.exists()) {
        // 🟢 SENARYO 1: TANIMSIZ ETİKET (HESABA EŞLEŞTİRME PROTOKOLÜ)
        setLoading(false);
        const confirmPair = confirm(`[${cleanTagId}] benzersiz numaralı etiket sistemde kayıtlı değil. Bu etiketi kendi hesabınızla eşleştirmek istiyor musunuz?`);
        
        if (confirmPair) {
          setLoading(true);
          await setDoc(tagRef, {
            tagId: cleanTagId,
            ownerUid: currentUser.uid,
            createdAt: new Date().toISOString()
          });
          setLoading(false);
          alert("İşlem Başarılı! Akıllı etiket profilinizle güvenli bir şekilde eşleştirilmiştir.");
          setTagIdInput('');
        }
      } else {
        const tagData = tagSnap.data();

        if (tagData.ownerUid === currentUser.uid) {
          // 🛠️ SENARYO 2: YETKİLİ ERİŞİM (BAĞLANTI KALDIRMA / SIFIRLAMA PROTOKOLÜ)
          setLoading(false);
          const confirmDelete = confirm(`Bu etiket zaten sizin profilinize kayıtlıdır.\n\nEtiketin hesabınızla olan bağlantısını kesmek (veri tabanından silmek) istiyor musunuz?`);
          
          if (confirmDelete) {
            setLoading(true);
            await deleteDoc(tagRef);
            setLoading(false);
            alert("Bağlantı Kesildi! Akıllı etiket başarıyla sistemden kaldırıldı ve ürün boşa çıkarıldı.");
            setTagIdInput('');
          }
        } else {
          // 🛡️ SENARYO 3: DIŞ KULLANICI / BULUCU GÜVENLİK MODU
          setLoading(false);
          alert("Kayıtlı Güvence Etiketi Algılandı! Bu ürün başka bir kullanıcıya aittir. Güvenli profil kartı yükleniyor...");
          
          // App.web.tsx üzerinden profil sekmesine fırlatıyoruz kralı
          onNavigateToProfile(tagData.ownerUid);
        }
      }
    } catch (error) {
      console.error("[Web NFC Engine Failure]:", error);
      alert("İşlem sırasında dahili bir veri tabanı hatası oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Etiket Yönetim Paneli</Text>
        <Text style={styles.headerSub}>
          Akıllı bileklik, tasma veya kartların üzerindeki benzersiz ID numarasını girerek eşleştirme, sıfırlama veya kayıp profil sorgulama işlemlerini web üzerinden yönetebilirsiniz.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, !isMobile && styles.desktopWidth]}>
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#beaf9f" />
              <Text style={styles.loaderText}>Sistem kayıtları işleniyor, lütfen bekleyiniz...</Text>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <View style={styles.iconWrapper}>
                <MaterialCommunityIcons name="nfc-variant" size={54} color="#beaf9f" />
              </View>
              
              <Text style={styles.inputLabel}>Etiket / Tag Benzersiz Numarası (UID)</Text>
              <TextInput
                style={styles.testInput}
                placeholder="Örn: 046a8d223f5b80"
                placeholderTextColor="#8e8e93"
                value={tagIdInput}
                onChangeText={setTagIdInput}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity style={styles.queryButton} onPress={handleWebTagQuery}>
                <MaterialCommunityIcons name="shield-sync-outline" size={20} color="#fff" />
                <Text style={styles.queryButtonText}>ETİKETİ DOĞRULA VE İŞLEM YAP</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { paddingHorizontal: 20, alignItems: 'center', paddingTop: 10, paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 25, marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1c1c1e' },
  headerSub: { fontSize: 13, color: '#666', marginTop: 8, lineHeight: 18 },
  
  card: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#e5e5ea', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  desktopWidth: { maxWidth: 550 },
  formContainer: { width: '100%', alignItems: 'center' },
  iconWrapper: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#fdfbf7', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#ffeef0' },
  
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#1c1c1e', alignSelf: 'flex-start', marginBottom: 8, letterSpacing: 0.2 },
  testInput: { width: '100%', height: 50, backgroundColor: '#f2f2f7', borderRadius: 10, paddingHorizontal: 15, fontSize: 14, color: '#1c1c1e', fontWeight: '600', marginBottom: 20, borderWidth: 0.5, borderColor: '#e5e5ea' },
  
  queryButton: { flexDirection: 'row', backgroundColor: '#beaf9f', width: '100%', height: 52, borderRadius: 10, justifyContent: 'center', alignItems: 'center', shadowColor: '#beaf9f', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  queryButtonText: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginLeft: 8, letterSpacing: 0.5 },
  
  loaderContainer: { justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  loaderText: { marginTop: 16, fontSize: 13, color: '#8e8e93', fontWeight: '500', textAlign: 'center' }
});