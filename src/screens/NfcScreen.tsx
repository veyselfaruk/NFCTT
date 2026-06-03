import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { db, auth } from '../config/firebaseConfig';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import BottomBar from '../components/BottomBar';

export default function NfcScreen({ navigation }: any) {
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 🔌 Donanım Kontrolü: Sistem açılışında donanım sürücülerini başlatıyoruz
    NfcManager.start().catch((err) => {
      console.warn("[NFC Subsystem] Donanım başlatılamadı, NFC kapalı olabilir:", err);
    });

    // 🎯 ANDROID DONANIM GERİ TUŞU YÖNETİMİ
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
  // 🚀 AKILLI TARAMA VE KARAR MOTORU (CORE AUTOMATION ENGINE)
  // =========================================================================
  const handleNfcScan = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Yetkilendirme Hatası", "Bu işlemi gerçekleştirmek için lütfen önce oturum açınız.");
        return;
      }

      setIsScanning(true);
      await NfcManager.requestTechnology(NfcTech.Ndef);
      
      // 📡 1. ADIM: Donanımdan Benzersiz Seri Numarasını (Tag ID) okuma
      const tag = await NfcManager.getTag();
      const tagId = tag?.id;

      if (!tagId) {
        throw new Error("Etiket benzersiz kimliği (UID) okunamadı.");
      }

      setIsScanning(false);
      setLoading(true);

      console.log(`[NFC Hardware] Etiket algılandı. Seri No: ${tagId}`);

      // 🔍 2. ADIM: Veri tabanı mühür ve sahiplik doğrulaması
      const tagRef = doc(db, "nfc_tags", tagId);
      const tagSnap = await getDoc(tagRef);

      if (!tagSnap.exists()) {
        // =========================================================================
        // 🟢 SENARYO 1: BOŞ ETİKET (İLK AKTİVASYON VE EŞLEŞTİRME)
        // =========================================================================
        setLoading(false);
        Alert.alert(
          "Yeni Ürün Algılandı",
          "Bu akıllı etiket henüz bir profile tanımlanmamıştır. Kendi hesabınızla eşleştirmek istiyor musunuz?",
          [
            { text: "İptal", style: "cancel" },
            { 
              text: "Profili Eşleştir", 
              onPress: async () => {
                setLoading(true);
                await setDoc(tagRef, {
                  tagId: tagId,
                  ownerUid: currentUser.uid,
                  createdAt: new Date().toISOString()
                });
                setLoading(false);
                Alert.alert("İşlem Başarılı", "Akıllı etiket profilinizle güvenli bir şekilde mühürlenmiştir.");
              }
            }
          ]
        );
      } else {
        const tagData = tagSnap.data();

        if (tagData.ownerUid === currentUser.uid) {
          // =========================================================================
          // 🛠️ SENARYO 2: SAHİPLİK DOĞRULANDI (YENİDEN YAPILANDIRMA / SIFIRLAMA)
          // =========================================================================
          setLoading(false);
          Alert.alert(
            "Güvenli Erişim",
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
                  Alert.alert("Bilgi", "Etiket bağlantısı başarıyla kaldırılmış ve ürün boşa çıkarılmıştır.");
                }
              }
            ]
          );
        } else {
          // =========================================================================
          // 🛡️ SENARYO 3: YABANCI ETİKET (BULUCU MODU / KVKK GÜVENLİK DUVARI)
          // =========================================================================
          setLoading(false);
          console.log(`[Security Firewall] Yetkisiz erişim engellendi. Sahip UID: ${tagData.ownerUid}`);
          
          Alert.alert(
            "Kayıtlı Etiket Algılandı",
            "Bu ürün başka bir kullanıcıya aittir. Güvenli profil kartını ve acil durum bilgilerini görüntülemek için yönlendiriliyorsunuz...",
            [
              { 
                text: "Profili Görüntüle", 
                onPress: () => {
                  // KVKK uyumlu gizli profil kartına şutluyoruz reis
                  navigation.navigate('ProfileScreen', { targetUid: tagData.ownerUid });
                }
              }
            ]
          );
        }
      }

    } catch (error: any) {
      console.error("[NFC Core System Error]:", error);
      Alert.alert("Bağlantı Hatası", "Etiket okuma işlemi zaman aşımına uğradı veya donanım bağlantısı kesildi.");
    } finally {
      setIsScanning(false);
      setLoading(false);
      NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mühür Merkezi</Text>
        <Text style={styles.headerSub}>
          Akıllı bileklik veya tasmaları cihazınıza yaklaştırarak güvenli veri tabanı eşleştirmelerini yönetebilirsiniz.
        </Text>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#1c1c1e" />
            <Text style={styles.loaderText}>Veri tabanı kayıtları doğrulanıyor...</Text>
          </View>
        ) : (
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
              {isScanning ? "Lütfen etiketi cihazın arkasına yaklaştırınız..." : "ETİKETİ TARATMAYA BAŞLA"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <BottomBar navigation={navigation} activeScreen="NFC" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 20 : 5, marginBottom: 40 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#1c1c1e' },
  headerSub: { fontSize: 14, color: '#666', marginTop: 8, lineHeight: 20 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  scanButton: { width: 240, height: 240, borderRadius: 120, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 5, borderWidth: 2, borderColor: '#e5e5ea' },
  scanButtonActive: { borderColor: '#ff9500', borderWidth: 3 },
  buttonText: { fontSize: 13, fontWeight: 'bold', color: '#1c1c1e', marginTop: 15, textAlign: 'center', letterSpacing: 0.5, paddingHorizontal: 10 },
  loaderContainer: { justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 14, fontSize: 14, color: '#8e8e93', fontWeight: '500' }
});