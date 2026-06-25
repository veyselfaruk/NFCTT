import React, { useState, useEffect } from 'react'; 
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, ScrollView, useWindowDimensions 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { db, auth } from '../config/firebaseConfig';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

interface WebNfcViewProps {
  onNavigateToProfile: (targetUid: string) => void;
  urlTagId?: string | null; // 🔥 App.web.tsx'ten gelen canlı URL parametresi kanka
}

export default function WebNfcView({ onNavigateToProfile, urlTagId }: WebNfcViewProps) {
  const [tagIdInput, setTagIdInput] = useState(''); // NFC Tag ID arama kutusu
  const [testUid, setTestUid] = useState('');       // Manuel Profil UID arama kutusu
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Tarayıcı asenkron kilitlenmesini çözen dinamik auth takibi
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // =========================================================================
  // 📡 1. ÜNİTE: OTOMATİK URL SORGULAMA TETİKLEYİCİSİ (VELİ REFERANS ODAKLI RADAR)
  // =========================================================================
  useEffect(() => {
    // Eğer URL'den temiz bir ID yakalandıysa doğrudan alt mekanizmayı tetikle kral
    if (urlTagId && urlTagId.trim() !== '') {
      const cleanId = urlTagId.trim();
      setTestUid(cleanId); // Görsel olarak alttaki Manuel Ünite kutusunu doldur kanka
      
      // State ve arayüz animasyonlarının oturması için küçük bir nefes aldırıp sorguluyoruz
      const timeout = setTimeout(() => {
        handleManualTestQueryDirect(cleanId);
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [urlTagId]);

  // =========================================================================
  // 🚀 2. ÜNİTE: HEM URL'DEN HEM BUTONDAN GELEN VELİ KİMLİĞİNİ DOĞRUDAN SORGULAYAN MOTOR
  // =========================================================================
  const handleManualTestQueryDirect = async (targetUid: string) => {
    setLoading(true);

    try {
      // 🎯 Domaine girilen ID bir kullanıcı ID'si olduğu için doğrudan "profiles" tabanına vuruyoruz
      const profileRef = doc(db, "profiles", targetUid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        setLoading(false);
        console.log("Veli profili URL üzerinden başarıyla doğrulandı, fırlatılıyor...");
        // Profil başarıyla bulundu, bulucu modunda üst katmana yönlendirip maskeli kartı açıyoruz
        onNavigateToProfile(targetUid);
      } else {
        setLoading(false);
        alert(`Kayıt Bulunamadı: Adres çubuğundan gelen [${targetUid}] referans kimliği profiles veri tabanında doğrulanamadı.`);
      }
    } catch (err) {
      console.error("[Manual Query Direct Module Error]:", err);
      alert("Profil sorgulanırken dahili bir veri tabanı hatası oluştu kanka.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // 🛰️ KISIM 1: MANUEL BUTONA BASILDIĞINDA ÇALIŞAN NORMAL ETİKET (NFC) SORGUSU
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
          setLoading(false);
          alert("Kayıtlı Güvence Etiketi Algılandı! Bu ürün başka bir kullanıcıya aittir. Güvenli profil kartı yükleniyor...");
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

  // =========================================================================
  // 🔍 KISIM 2: MANUEL PARMAKLA YAZILIP BUTONA BASILAN VELİ SORGUSU
  // =========================================================================
  const handleManualTestQuery = async () => {
    if (!testUid.trim()) {
      alert("Sorgulamayı başlatmak için lütfen geçerli bir kullanıcı referans kimliği giriniz.");
      return;
    }
    await handleManualTestQueryDirect(testUid.trim());
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
              
              {/* ÜNİTE 1: NFC ETİKET UID SORGULAMA */}
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

              <TouchableOpacity style={[styles.queryButton, { marginBottom: 30 }]} onPress={handleWebTagQuery}>
                <MaterialCommunityIcons name="shield-sync-outline" size={20} color="#fff" />
                <Text style={styles.queryButtonText}>ETİKETİ DOĞRULA VE İŞLEM YAP</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* ÜNİTE 2: MANUEL VELİ KİMLİK SORGULAMA */}
              <View style={styles.testHeaderRow}>
                <MaterialCommunityIcons name="shield-check" size={18} color="#beaf9f" />
                <Text style={styles.testTitle}>Manuel Kimlik Doğrulama Ünitesi</Text>
              </View>
              <Text style={styles.testSub}>
                NFC donanımı aktif olmayan veya kısıtlı erişime sahip sistemlerde, acil durum veri tabanı senkronizasyonunu çağırmak için veli referans kimliğini manuel girebilirsiniz:
              </Text>

              <TextInput
                style={styles.testInput}
                placeholder="Güvence Referans Kimliğini (UID) Giriniz"
                placeholderTextColor="#8e8e93"
                value={testUid}
                onChangeText={setTestUid}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity style={[styles.queryButton, { backgroundColor: '#1c1c1e' }]} onPress={handleManualTestQuery}>
                <MaterialCommunityIcons name="shield-search" size={20} color="#fff" />
                <Text style={styles.queryButtonText}>ACİL DURUM PROFİLİNİ SORGULA</Text>
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
  
  queryButton: { flexDirection: 'row', backgroundColor: '#beaf9f', width: '100%', height: 52, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  queryButtonText: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginLeft: 8, letterSpacing: 0.5 },
  
  loaderContainer: { justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  loaderText: { marginTop: 16, fontSize: 13, color: '#8e8e93', fontWeight: '500', textAlign: 'center' },
  
  divider: { width: '100%', height: 1, backgroundColor: '#e5e5ea', marginBottom: 25 },
  testHeaderRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 8 },
  testTitle: { fontSize: 13, fontWeight: '700', color: '#beaf9f', marginLeft: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  testSub: { fontSize: 12, color: '#636366', lineHeight: 16, marginBottom: 15, alignSelf: 'flex-start' }
});