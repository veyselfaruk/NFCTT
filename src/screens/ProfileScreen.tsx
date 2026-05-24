import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Platform, ActivityIndicator, Animated, Dimensions, Modal, Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../config/firebaseConfig'; 
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'; 
import BottomBar from '../components/BottomBar';
import { Ionicons } from '@expo/vector-icons'; 

const { width, height } = Dimensions.get('window');
const citiesAndDistricts = require('turkey-neighbourhoods');

export default function ProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false); 
  const [profileData, setProfileData] = useState<any>(null);
  const [dependentPhotos, setDependentPhotos] = useState<string[]>([]);
  const [isAvatarExpanded, setIsAvatarExpanded] = useState(false);

  // === GALERİ BÜYÜTME, SILME VE KAYDIRMA STATE'LERİ KANKA ===
  const [isGalleryModalVisible, setIsGalleryModalVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // === SCROLLVIEW REF TANIMLAMASI ===
  const scrollViewRef = useRef<ScrollView>(null);

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
            
            let actualData = rawData.finalData ? rawData.finalData : rawData;
            
            if (!actualData?.parent?.name && rawData?.parent?.name) {
              actualData = rawData;
            }
            
            setProfileData(actualData);
            
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
      toValue: isAvatarExpanded ? 1 : 1.6,
      friction: 5,
      useNativeDriver: true,
    }).start();
    setIsAvatarExpanded(!isAvatarExpanded);
  };

  // === KALICI YÜKLEME MOTORU: SAF NATIVE XHR ILE BLOB DÖNÜŞÜMÜ ===
  const uploadImageToStorage = async (uri: string, userUid: string) => {
    // KANKA: Fetch bazen Android yerel dosya izinlerine takılabiliyor, XHR ile garantiye alıyoruz
    const blob: any = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        resolve(xhr.response);
      };
      xhr.onerror = function (e) {
        console.error("XHR Blob dönüşüm hatası kanka:", e);
        reject(new TypeError("Network request failed"));
      };
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    });

    try {
      const filename = `gallery_${Date.now()}.jpg`;
      const storageRef = ref(storage, `users/${userUid}/dependent_photos/${filename}`);
      
      // Storage'a yükleme işlemini başlatıyoruz
      await uploadBytes(storageRef, blob);
      
      // Public HTTPS linkini geri döndürüyoruz
      const downloadUrl = await getDownloadURL(storageRef);
      
      // İşlem bitince RAM sızıntısı olmasın diye blob'u kapatıyoruz kanka
      blob.close();
      
      return downloadUrl;
    } catch (error) {
      blob.close();
      throw error;
    }
  };

  // === YATAY GALERİYE YENİ FOTOĞRAF EKLEME MOTORU ===
  const handleAddDependentPhoto = async () => {
    if (dependentPhotos.length >= 6) return;

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0].uri) {
      const localUri = result.assets[0].uri;
      
      try {
        setUploading(true); 
        const cloudUrl = await uploadImageToStorage(localUri, currentUser.uid);
        const updatedPhotos = [...dependentPhotos, cloudUrl];
        setDependentPhotos(updatedPhotos);

        const profileRef = doc(db, "profiles", currentUser.uid);
        await updateDoc(profileRef, {
          "finalData.dependent.photos": updatedPhotos,
          "dependentPhotos": updatedPhotos
        });
        console.log("Fotoğraf buluta uçuruldu ve URL db üzerine başarıyla mühürlendi kanka.");
      } catch (err) {
        console.error("Fotoğraf yüklenirken bulutta arıza çıktı kanka:", err);
        Alert.alert("Hata", "Fotoğraf sunucuya yüklenemedi ciğerim.");
      } finally {
        setUploading(false); 
      }
    }
  };

  // === BÜYÜTÜLEN FOTOĞRAFI SİLME MOTORU KANKA ===
  const handleDeletePhoto = async () => {
    Alert.alert(
      "Fotoğrafı Sil",
      "Bu fotoğrafı albümden kalıcı olarak silmek istediğinize emin misiniz?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            const photoToDelete = dependentPhotos[selectedPhotoIndex];
            const updatedPhotos = dependentPhotos.filter((_, idx) => idx !== selectedPhotoIndex);
            setDependentPhotos(updatedPhotos);

            try {
              const currentUser = auth.currentUser;
              if (currentUser) {
                const profileRef = doc(db, "profiles", currentUser.uid);
                await updateDoc(profileRef, {
                  "finalData.dependent.photos": updatedPhotos,
                  "dependentPhotos": updatedPhotos
                });

                if (photoToDelete.includes("firebasestorage.googleapis.com")) {
                  const storageRef = ref(storage, photoToDelete);
                  await deleteObject(storageRef).catch(e => console.log("Storage çöp temizleme hatası yoksayılabilir:", e));
                }
                console.log("Fotoğraf db ve buluttan kalıcı olarak uçuruldu kanka.");
              }
            } catch (err) {
              console.error("DB silme işlemi sırasında hata çıktı kanka:", err);
            }

            if (updatedPhotos.length === 0) {
              setIsGalleryModalVisible(false);
            } else if (selectedPhotoIndex >= updatedPhotos.length) {
              setSelectedPhotoIndex(updatedPhotos.length - 1);
            }
          }
        }
      ]
    );
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
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContainer}>
        
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
          
          <View style={{ alignItems: 'center', marginTop: isAvatarExpanded ? 30 : 0 }}>
            <Text style={styles.userName}>{parent.name || 'İsim Soyisim'}</Text>
            <Text style={styles.userSubText}>NFCTT Güvence Veli Profili</Text>
          </View>
        </View>

        {/* === 1. KART: VELİ BİLGİLERİ === */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>🛡️ Veli / Koruyan Bilgileri</Text>
          <View style={styles.divider} />
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Telefon:</Text><Text style={styles.infoValue}>{parent.phone || '-'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Yaş / Cinsiyet:</Text><Text style={styles.infoValue}>{parent.age || '-'} Yaş / {parent.gender || '-'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Kan Grubu:</Text><Text style={[styles.infoValue, {color: '#ff3b30', fontWeight: 'bold'}]}>{parent.bloodType || '-'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Bölge:</Text><Text style={styles.infoValue}>{parent.district || '-'} / {citiesAndDistricts.getCities().find((c: any) => String(c.code) === String(parent.city))?.name || parent.city || '-'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Adres:</Text><Text style={styles.infoValue}>{parent.address || '-'}</Text></View>
          {parent.note ? (
            <View style={styles.noteBox}><Text style={styles.noteText}><Text style={{fontWeight: 'bold'}}>Kritik Veli Notu:</Text> {parent.note}</Text></View>
          ) : null}
        </View>

        {/* === 2. KART: BAĞIMLI CANLI BİLGİLERİ === */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>❤️ Koruma Altındaki Canlı ({dependent.type || 'Belirtilmemiş'})</Text>
          <View style={styles.divider} />
          <View style={styles.infoRow}><Text style={styles.infoLabel}>İsim:</Text><Text style={styles.infoValue}>{dependent.name || '-'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Yaş / Cinsiyet:</Text><Text style={styles.infoValue}>{dependent.age || '-'} / {dependent.gender || '-'}</Text></View>

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

        {/* === 3. KART: FOTOĞRAF GALERİSİ === */}
        <View style={styles.infoCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.cardTitle}>📸 Albüm / Fotoğraf Ekle</Text>
            <Text style={{ fontSize: 12, color: '#888' }}>{dependentPhotos.length} / 6</Text>
          </View>
          <View style={styles.divider} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
            {dependentPhotos.map((photoUri, index) => (
              <TouchableOpacity 
                key={`gallery-photo-${index}`} 
                style={styles.galleryItemContainer}
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedPhotoIndex(index);
                  setIsGalleryModalVisible(true);
                }}
              >
                <Image source={{ uri: photoUri }} style={styles.galleryImage} />
              </TouchableOpacity>
            ))}

            {uploading && (
              <View style={[styles.addPhotoSlot, { borderStyle: 'solid' }]}>
                <ActivityIndicator size="small" color="#007AFF" />
              </View>
            )}

            {!uploading && dependentPhotos.length < 6 && (
              <TouchableOpacity style={styles.addPhotoSlot} onPress={handleAddDependentPhoto}>
                <Text style={styles.plusSign}>+</Text>
                <Text style={styles.addPhotoSubText}>Ekle</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        <TouchableOpacity 
          style={styles.editButton} 
          onPress={() => {
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
          }}
        >
          <Text style={styles.editButtonText}>Albümü Tamamla ve Profili İncele</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ==================== TAM EKRAN ADIM ADIM KAYDIRMALI GALERİ MODALI ==================== */}
      <Modal
        visible={isGalleryModalVisible}
        transparent={true} 
        animationType="fade"
        onRequestClose={() => setIsGalleryModalVisible(false)} 
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalHeader}>
            <View style={styles.counterBadge}>
              <Text style={styles.modalCounter}>{dependentPhotos.length > 0 ? `${selectedPhotoIndex + 1} / ${dependentPhotos.length}` : '0 / 0'}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity 
                style={[styles.closeButton, { marginRight: 12, backgroundColor: 'rgba(255, 59, 48, 0.25)', borderColor: 'rgba(255, 59, 48, 0.3)' }]} 
                onPress={handleDeletePhoto}
              >
                <Ionicons name="trash-outline" size={18} color="#ff3b30" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setIsGalleryModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: selectedPhotoIndex * width, y: 0 }}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
              setSelectedPhotoIndex(newIndex);
            }}
            style={styles.modalScrollView}
          >
            {dependentPhotos.map((photoUri, index) => (
              <View key={`fullscreen-photo-${index}`} style={styles.fullscreenImageContainer}>
                <Image 
                  source={{ uri: photoUri }} 
                  style={styles.fullscreenImage} 
                  resizeMode="contain" 
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <BottomBar navigation={navigation} activeScreen="Profile" />
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
  
  galleryScroll: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  galleryItemContainer: { width: 80, height: 80, borderRadius: 10, marginRight: 12, overflow: 'hidden', backgroundColor: '#eee', borderWidth: 1, borderColor: '#ddd' },
  galleryImage: { width: '100%', height: '100%' },
  addPhotoSlot: { width: 80, height: 80, borderRadius: 10, borderWidth: 2, borderColor: '#007AFF', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f8ff' },
  plusSign: { fontSize: 26, color: '#007AFF', fontWeight: 'bold', marginTop: -2 },
  addPhotoSubText: { fontSize: 11, color: '#007AFF', fontWeight: '600', marginTop: -2 },

  editButton: { backgroundColor: '#34c759', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 5, elevation: 2 },
  editButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  modalBackground: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)', justifyContent: 'center', alignItems: 'center' },
  modalHeader: { 
    width: '100%', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'ios' ? 60 : 30, 
    position: 'absolute', 
    top: 0, 
    zIndex: 10,
    backgroundColor: 'transparent', 
  },
  counterBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)', 
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)'
  },
  modalCounter: { 
    color: '#ffffff', 
    fontSize: 14, 
    fontWeight: '700'
  },
  closeButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(0, 0, 0, 0.4)', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  closeButtonText: { 
    color: '#ffffff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  modalScrollView: { width: width, height: height },
  fullscreenImageContainer: { width: width, height: height, justifyContent: 'center', alignItems: 'center' },
  fullscreenImage: { width: width, height: height * 0.8 }
});