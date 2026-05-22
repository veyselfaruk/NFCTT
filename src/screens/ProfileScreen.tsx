import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Platform, ActivityIndicator, Animated, Dimensions 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [dependentPhotos, setDependentPhotos] = useState<string[]>([]);
  const [isAvatarExpanded, setIsAvatarExpanded] = useState(false);

  // === ANIMASYON DEĞİŞKENİ (SCALE İÇİN) ===
  const avatarScale = useRef(new Animated.Value(1)).current;

  // === FIRESTORE'DAN VERİLERİ ÇEKME MOTORU ===
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const profileRef = doc(db, "profiles", currentUser.uid);
          const profileSnap = await getDoc(profileRef);
          
          if (profileSnap.exists()) {
            const rawData = profileSnap.data();
            
            // KANKA SÜPER ZIRH: Eğer veri finalData altındaysa onu al, yoksa direkt ham veriyi al diyoruz:
            let actualData = rawData.finalData ? rawData.finalData : rawData;
            
            // Eğer hâlâ parent ismi boş kalıyorsa, ham verinin köküne bir kez daha asılıyoruz kanka:
            if (!actualData?.parent?.name && rawData?.parent?.name) {
              actualData = rawData;
            }
            
            setProfileData(actualData);
            
            // KANKA ÇİFT DİKİŞ SIĞINAK: Form ekranı finalData'yı ezse bile kökteki 'dependentPhotos' alanından fotoğrafları kurtarıyoruz!
            const savedPhotos = rawData?.dependentPhotos || actualData?.dependent?.photos || [];
            setDependentPhotos(savedPhotos);
          }
        }
      } catch (error) {
        console.error("Profil çekilirken hata oluştu kanka:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // === AVATAR TIKLANDIĞINDA SCALE ETME ANIMASYONU ===
  const toggleAvatarScale = () => {
    Animated.spring(avatarScale, {
      toValue: isAvatarExpanded ? 1 : 1.6, // %60 oranında ekrandan taşmayacak şekilde büyür kanka
      friction: 5,
      useNativeDriver: true,
    }).start();
    setIsAvatarExpanded(!isAvatarExpanded);
  };

  // === YATAY GALERİYE YENİ FOTOĞRAF EKLEME MOTORU ===
  const handleAddDependentPhoto = async () => {
    if (dependentPhotos.length >= 6) return; // Maksimum 6 sınır zırhı kanka!

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', // KANKA: MediaTypeOptions.Images uyarısını sıfırlayan mermi güncelleme!
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5, // RAM şişmesin diye kaliteyi optimize ettik kanka
    });

    if (!result.canceled && result.assets[0].uri) {
      const newPhotoUri = result.assets[0].uri;
      const updatedPhotos = [...dependentPhotos, newPhotoUri];
      setDependentPhotos(updatedPhotos);

      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const profileRef = doc(db, "profiles", currentUser.uid);
          
          // KANKA: Hem finalData içine hem de form ekranının ömrü boyunca uzanamayacağı bağımsız köke yazıyoruz!
          await updateDoc(profileRef, {
            "finalData.dependent.photos": updatedPhotos,
            "dependentPhotos": updatedPhotos // Burası bizim kalıcı sığınağımız kanka!
          });
          console.log("Veri paketi senkronizasyona hazır ve sığınak mühürlendi kanka.");
        }
      } catch (err) {
        console.error("Fotoğraf senkronize edilemedi kanka:", err);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10, color: '#666' }}>Profil yükleniyor ciğerim...</Text>
      </View>
    );
  }

  const parent = profileData?.parent || {};
  const dependent = profileData?.dependent || {};

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f2f5' }}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        {/* === ÜST HEADER VE ANIMASYONLU AVATAR ALANI === */}
        <View style={styles.headerCard}>
          <TouchableOpacity activeOpacity={0.9} onPress={toggleAvatarScale} style={styles.avatarWrapper}>
            <Animated.View style={[styles.avatarContainer, { transform: [{ scale: avatarScale }] }]}>
              {parent.photoUrl ? (
                <Image source={{ uri: parent.photoUrl }} style={styles.avatar} />
              ) : (
                <Text style={styles.avatarPlaceholder}>{parent.name ? parent.name[0].toUpperCase() : '👤'}</Text>
              )}
            </Animated.View>
          </TouchableOpacity>
          
          {/* Avatar büyüdüğünde yazıların üstüne binmesin diye dinamik margin verdik kanka */}
          <View style={{ alignItems: 'center', marginTop: isAvatarExpanded ? 30 : 0 }}>
            <Text style={styles.userName}>{parent.name || 'İsim Soyisim'}</Text>
            <Text style={styles.userSubText}>NFCTT Güvence Veli Profili</Text>
          </View>
        </View>

        {/* === 1. KART: VELİ BİLGİLERİ (SADECE DISPLAY kanka) === */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>🛡️ Veli / Koruyan Bilgileri</Text>
          <View style={styles.divider} />
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Telefon:</Text><Text style={styles.infoValue}>{parent.phone || '-'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Yaş / Cinsiyet:</Text><Text style={styles.infoValue}>{parent.age || '-'} Yaş / {parent.gender || '-'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Kan Grubu:</Text><Text style={[styles.infoValue, {color: '#ff3b30', fontWeight: 'bold'}]}>{parent.bloodType || '-'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Bölge:</Text><Text style={styles.infoValue}>{parent.district || '-'} / Kayseri</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Adres:</Text><Text style={styles.infoValue}>{parent.address || '-'}</Text></View>
          {parent.note ? (
            <View style={styles.noteBox}><Text style={styles.noteText}><Text style={{fontWeight: 'bold'}}>Kritik Veli Notu:</Text> {parent.note}</Text></View>
          ) : null}
        </View>

        {/* === 2. KART: BAĞIMLI CANLI BİLGİLERİ (SADECE DISPLAY kanka) === */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>❤️ Koruma Altındaki Canlı ({dependent.type || 'Belirtilmemiş'})</Text>
          <View style={styles.divider} />
          <View style={styles.infoRow}><Text style={styles.infoLabel}>İsim:</Text><Text style={styles.infoValue}>{dependent.name || '-'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Yaş / Cinsiyet:</Text><Text style={styles.infoValue}>{dependent.age || '-'} / {dependent.gender || '-'}</Text></View>

          {/* Şemaya göre dinamik alan gösterimi kanka */}
          {(dependent.type === 'Çocuk' || dependent.type === 'Yaşlı') && (
            <>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Boy / Kilo:</Text><Text style={styles.infoValue}>{dependent.heightWeight || '-'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Kan Grubu:</Text><Text style={[styles.infoValue, {color: '#ff3b30', fontWeight: 'bold'}]}>{dependent.bloodType || '-'}</Text></View>
            </>
          )}

          {dependent.type !== 'Çocuk' && dependent.type !== 'Yaşlı' && dependent.type && (
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Aşı/Çip No:</Text><Text style={styles.infoValue}>{dependent.chipNumber || '-'}</Text></View>
          )}

          {dependent.note ? (
            <View style={styles.noteBox}><Text style={styles.noteText}><Text style={{fontWeight: 'bold'}}>Canlıya Özel Not:</Text> {dependent.note}</Text></View>
          ) : null}
        </View>

        {/* === ZURNANIN ZIRT DEDİĞİ YER: SÜRPRIZ YATAY FOTOĞRAF GALERİSİ === */}
        <View style={styles.infoCard}>
          {/* YENİ ALAN (Bununla değiştir kanka): */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
               <Text style={styles.cardTitle}>📸 Albüm / Fotoğraf Ekle</Text>
               <Text style={{ fontSize: 12, color: '#888' }}>{dependentPhotos.length} / 6</Text>
            </View>
          <View style={styles.divider} />

          {/* KANKA: Yana kaydırmalı muazzam galeri alanı */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
            {dependentPhotos.map((photoUri, index) => (
              <View key={`gallery-photo-${index}`} style={styles.galleryItemContainer}>
                <Image source={{ uri: photoUri }} style={styles.galleryImage} />
              </View>
            ))}

            {/* Maksimum 6 fotoğraf yüklenmediyse o kesikli çizgili şık "+" kutusu görünür kanka */}
            {dependentPhotos.length < 6 && (
              <TouchableOpacity style={styles.addPhotoSlot} onPress={handleAddDependentPhoto}>
                <Text style={styles.plusSign}>+</Text>
                <Text style={styles.addPhotoSubText}>Ekle</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* === ESKİ SİSTEME GİDEN DÜZENLEME BUTONU === */}
        <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('ProfileSetup')}>
          <Text style={styles.editButtonText}>Profili Güncelle / Düzenle</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ================= HOME.TSX İLE %100 UYUMLU KURŞUN GEÇİRMEZ NAVİGASYON BARI ================= */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.barItem} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.barIcon}>⚙️</Text>
          <Text style={styles.barText}>Ayarlar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.nfcBarItem} onPress={() => console.log("NFC Tarama tetiklendi...")}>
          <View style={styles.nfcCircle}>
            <Text style={styles.nfcIcon}>📶</Text>
          </View>
          <Text style={[styles.barText, { marginTop: 4, fontWeight: 'bold', color: '#007AFF' }]}>NFC Tarat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.barItem, { borderBottomWidth: 2, borderColor: '#007AFF' }]}>
          <Text style={styles.barIcon}>👤</Text>
          <Text style={[styles.barText, { color: '#007AFF', fontWeight: 'bold' }]}>Profilim</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5' },
  scrollContainer: { padding: 15, paddingBottom: 110 },
  headerCard: { backgroundColor: 'white', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  avatarWrapper: { zIndex: 999, height: 85, justifyContent: 'center', alignItems: 'center' },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 2, borderColor: '#fff', elevation: 4 },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { fontSize: 32, color: 'white' },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 10 },
  userSubText: { fontSize: 13, color: '#666', marginTop: 2 },
  infoCard: { backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#007AFF' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: '#f5f5f5' },
  infoLabel: { fontSize: 14, color: '#666', fontWeight: '500' },
  infoValue: { fontSize: 14, color: '#333', textAlign: 'right', flex: 1, paddingLeft: 10 },
  noteBox: { backgroundColor: '#fff9e6', padding: 10, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: '#ffe0b2' },
  noteText: { fontSize: 13, color: '#b78103' },
  
  // === GALERİ STYLES ===
  galleryScroll: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  galleryItemContainer: { width: 80, height: 80, borderRadius: 10, marginRight: 12, overflow: 'hidden', backgroundColor: '#eee', borderWidth: 1, borderColor: '#ddd' },
  galleryImage: { width: '100%', height: '100%' },
  addPhotoSlot: { width: 80, height: 80, borderRadius: 10, borderWidth: 2, borderColor: '#007AFF', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f8ff' },
  plusSign: { fontSize: 26, color: '#007AFF', fontWeight: 'bold', marginTop: -2 },
  addPhotoSubText: { fontSize: 11, color: '#007AFF', fontWeight: '600', marginTop: -2 },

  editButton: { backgroundColor: '#34c759', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 5, elevation: 2 },
  editButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  bottomBar: { flexDirection: 'row', height: Platform.OS === 'ios' ? 90 : 75, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#eee', justifyContent: 'space-around', alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 20 : 0, position: 'absolute', bottom: 0, left: 0, right: 0 },
  barItem: { alignItems: 'center', justifyContent: 'center', flex: 1, height: '100%' },
  barIcon: { fontSize: 24, marginBottom: 3 },
  barText: { fontSize: 12, color: '#555' },
  nfcBarItem: { alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: -25 },
  nfcCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 6, borderWidth: 1, borderColor: '#eee' },
  nfcIcon: { fontSize: 28 }
});