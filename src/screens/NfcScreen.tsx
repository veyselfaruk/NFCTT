import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform, BackHandler, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { db, auth } from '../config/firebaseConfig';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import BottomBar from '../components/BottomBar';

export default function NfcScreen({ navigation }: any) {
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 🔐 DEVELOPER SIMULATION CONTROLLER STATE
  const [testUid, setTestUid] = useState('');

  useEffect(() => {
    // 🔌 Hardware Initialization: Subsystem connection protocol
    NfcManager.start().catch((err) => {
      console.log("[NFC Subsystem] Native core driver bypassed (Development Environment Mode).");
    });

    // 🎯 HARDWARE BACK BUTTON NAVIGATION SAFE GUARD
    const backAction = () => {
      if (navigation.isFocused()) {
        try {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Home');
          }
          return true;
        } catch (e) {
          return false;
        }
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => {
      backHandler.remove();
      NfcManager.cancelTechnologyRequest().catch(() => {});
    };
  }, [navigation]);

  // =========================================================================
  // 🚀 AUTOMATED PROVISIONING & DATA INTEGRATION ENGINE (CORE TECH)
  // =========================================================================
  const handleNfcScan = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Oturum Gerekli", "Bu işlemi gerçekleştirmek için lütfen önce kullanıcı hesabınızla giriş yapınız.");
        return;
      }

      setIsScanning(true);
      await NfcManager.requestTechnology(NfcTech.Ndef);
      
      // 📡 STEP 1: Extract Unique Identifier (Hardware UID Token)
      const tag = await NfcManager.getTag();
      const tagId = tag?.id;

      if (!tagId) {
        throw new Error("Hardware Authentication Failed: Unable to extract tag identifier.");
      }

      setIsScanning(false);
      setLoading(true);

      console.log(`[NFC Subsystem] Tag Identifier Resolved. UID: ${tagId}`);

      // 🔍 STEP 2: Database Registry Lookup and Sells Authorization Check
      const tagRef = doc(db, "nfc_tags", tagId);
      const tagSnap = await getDoc(tagRef);

      if (!tagSnap.exists()) {
        // =========================================================================
        // 🟢 PROVISIONING STAGE 1: UNASSIGNED HARDWARE (PAIRING PROTOCOL)
        // =========================================================================
        setLoading(false);
        Alert.alert(
          "Tanımsız Akıllı Etiket Algılandı",
          "Bu akıllı ürün henüz bir profile tanımlanmamıştır. Etiketi kendi hesabınızla eşleştirmek istiyor musunuz?",
          [
            { text: "İptal", style: "cancel" },
            { 
              text: "Eşleştirmeyi Onayla", 
              onPress: async () => {
                setLoading(true);
                await setDoc(tagRef, {
                  tagId: tagId,
                  ownerUid: currentUser.uid,
                  createdAt: new Date().toISOString()
                });
                setLoading(false);
                Alert.alert("İşlem Başarılı", "Akıllı etiket profilinizle güvenli bir şekilde eşleştirilmiştir.");
              }
            }
          ]
        );
      } else {
        const tagData = tagSnap.data();

        if (tagData.ownerUid === currentUser.uid) {
          // =========================================================================
          // 🛠️ PROVISIONING STAGE 2: OWNERSHIP CONFIRMED (DE-PROVISIONING PROTOCOL)
          // =========================================================================
          setLoading(false);
          Alert.alert(
            "Yetkili Etiket Erişimi",
            "Bu akıllı etiket zaten sizin profilinize kayıtlıdır. Yapmak istediğiniz işlemi seçiniz:",
            [
              { text: "Kapat", style: "cancel" },
              {
                text: "Bağlantıyı Kaldır (Sıfırla)",
                style: "destructive",
                onPress: async () => {
                  setLoading(true);
                  await deleteDoc(tagRef);
                  setLoading(false);
                  Alert.alert("Bağlantı Kesildi", "Akıllı etiket veri tabanından başarıyla kaldırılmış ve ürün boşa çıkarılmıştır.");
                }
              }
            ]
          );
        } else {
          // =========================================================================
          // 🛡️ PROVISIONING STAGE 3: EXTERNAL SEARCH CLIENT (COMPLIANCE SECURITY MODE)
          // =========================================================================
          setLoading(false);
          console.log(`[Security Policy] External asset access authorized. Target Account Ref: ${tagData.ownerUid}`);
          
          Alert.alert(
            "Kayıtlı Güvence Etiketi",
            "Bu ürün başka bir kullanıcıya aittir. Güvenli profil kartı ve acil durum protokolleri yükleniyor...",
            [
              { 
                text: "Profili Güvenle Görüntüle", 
                onPress: () => {
                  navigation.navigate('ProfileScreen', { targetUid: tagData.ownerUid });
                }
              }
            ]
          );
        }
      }

    } catch (error: any) {
      console.error("[NFC Subsystem Runtime Failure]:", error);
      Alert.alert("Bağlantı Zaman Aşımı", "Donanım iletişim arayüzü zaman aşımına uğradı veya bağlantı kesildi.");
    } finally {
      setIsScanning(false);
      setLoading(false);
      NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  };

  // =========================================================================
  // 🧪 ENTERPRISE PIPELINE SIMULATION HUB (MANUAL OVERRIDE INTERFACE)
  // =========================================================================
  const handleManualTestQuery = async () => {
    if (!testUid.trim()) {
      Alert.alert("Veri Giriş Hatası", "Simülasyonu başlatmak için lütfen geçerli bir kullanıcı UID'si giriniz.");
      return;
    }

    try {
      setLoading(true);
      const profileRef = doc(db, "profiles", testUid.trim());
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        setLoading(false);
        navigation.navigate('ProfileScreen', { targetUid: testUid.trim() });
      } else {
        setLoading(false);
        Alert.alert("Kayıt Bulunamadı", "Girilen kullanıcı kimliği sistem veri tabanında doğrulanamadı. Lütfen Firestore koleksiyonlarını kontrol ediniz.");
      }
    } catch (err) {
      setLoading(false);
      console.error("[Simulation Module Error]:", err);
      Alert.alert("Sistem Kesintisi", "Simülasyon işlemi sırasında dahili bir veri tabanı hatası oluştu.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Etiket Yönetim Merkezi</Text>
        <Text style={styles.headerSub}>
          Akıllı bileklik veya tasmaları cihazınıza yaklaştırarak güvenli veri tabanı eşleştirmelerini yönetebilirsiniz.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#1c1c1e" />
              <Text style={styles.loaderText}>Veri tabanı kayıtları doğrulanıyor...</Text>
            </View>
          ) : (
            <>
              {/* CORE PROVISIONING CALL TO ACTION */}
              <TouchableOpacity 
                style={[styles.scanButton, isScanning && styles.scanButtonActive]} 
                onPress={handleNfcScan}
                disabled={isScanning}
              >
                <MaterialCommunityIcons 
                  name={isScanning ? "radar" : "nfc"} 
                  size={80} 
                  color={isScanning ? "#ff9500" : "#1c1c1e"} 
                />
                <Text style={styles.buttonText}>
                  {isScanning ? "Tarama aktif. Etiketi cihazın arkasına yaklaştırınız..." : "ETİKETİ TARATMAYA BAŞLA"}
                </Text>
              </TouchableOpacity>

              {/* 🧪 ENTERPRISE PIPELINE SIMULATION COMPONENT */}
              <View style={styles.testContainer}>
                <View style={styles.testHeaderRow}>
                  <MaterialCommunityIcons name="xml" size={18} color="#beaf9f" />
                  <Text style={styles.testTitle}>Geliştirici Simülasyon Paneli</Text>
                </View>
                <Text style={styles.testSub}>
                  NFC donanımı olmayan cihazlarda (Expo Go, standart Emülatörler) Bulucu Sayfası KVKK maskelemesini test etmek için aşağıya bir Veli UID'si giriniz:
                </Text>
                
                <TextInput
                  style={styles.testInput}
                  placeholder="Kullanıcı Kimliğini (UID) Giriniz"
                  placeholderTextColor="#8e8e93"
                  value={testUid}
                  onChangeText={setTestUid}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TouchableOpacity style={styles.testQueryButton} onPress={handleManualTestQuery}>
                  <MaterialCommunityIcons name="shield-search" size={20} color="#fff" />
                  <Text style={styles.testQueryButtonText}>BULUCU SİMÜLASYONUNU BAŞLAT</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {!isScanning && <BottomBar navigation={navigation} activeScreen="NFC" />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { paddingBottom: 100 },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 20 : 5, marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1c1c1e' },
  headerSub: { fontSize: 13, color: '#666', marginTop: 8, lineHeight: 18 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  scanButton: { width: 220, height: 220, borderRadius: 110, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 5, borderWidth: 2, borderColor: '#e5e5ea', marginBottom: 35, marginTop: 10 },
  scanButtonActive: { borderColor: '#ff9500', borderWidth: 3 },
  buttonText: { fontSize: 11, fontWeight: 'bold', color: '#1c1c1e', marginTop: 15, textAlign: 'center', letterSpacing: 0.5, paddingHorizontal: 10, textTransform: 'uppercase' },
  loaderContainer: { justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  loaderText: { marginTop: 14, fontSize: 13, color: '#8e8e93', fontWeight: '500' },

  // SİMÜLATÖR PANELİ STYLES
  testContainer: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e5ea', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, marginBottom: 20 },
  testHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  testTitle: { fontSize: 12, fontWeight: '700', color: '#beaf9f', marginLeft: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  testSub: { fontSize: 11, color: '#636366', lineHeight: 15, marginBottom: 12 },
  testInput: { width: '100%', height: 46, backgroundColor: '#f2f2f7', borderRadius: 10, paddingHorizontal: 12, fontSize: 13, color: '#1c1c1e', fontWeight: '600', marginBottom: 12, borderWidth: 0.5, borderColor: '#e5e5ea' },
  testQueryButton: { flexDirection: 'row', backgroundColor: '#beaf9f', width: '100%', height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  testQueryButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginLeft: 8, letterSpacing: 0.5 }
});