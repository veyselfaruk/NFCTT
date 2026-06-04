import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Platform, ActivityIndicator, Animated, Dimensions, Modal, Alert, BackHandler
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../config/firebaseConfig'; 
import { doc, getDoc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'; 
import BottomBar from '../components/BottomBar';
import { Ionicons } from '@expo/vector-icons'; 

const { width, height } = Dimensions.get('window');
const citiesAndDistricts = require('turkey-neighbourhoods');

const GRID_PADDING = 15;
const CARD_INTERNAL_PADDING = 15;
const VISIBLE_WIDTH = width - (GRID_PADDING * 2) - (CARD_INTERNAL_PADDING * 2);
const FIXED_IMAGE_SIZE = (VISIBLE_WIDTH - 16) / 3;

export default function ProfileScreen({ route, navigation }: any) {
  // 🔍 KANKA: NFC VEYA LİNKTEN GELEN HEDEF UID VAR MI KONTROLÜ
  const targetUid = route?.params?.targetUid;
  const isFinderMode = !!targetUid; // targetUid varsa sayfa BULUCU MODUNDADIR.

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false); 
  const [avatarUploading, setAvatarUploading] = useState(false); 
  const [profileData, setProfileData] = useState<any>(null);
  const [dependentPhotos, setDependentPhotos] = useState<string[]>([]);
  const [isAvatarExpanded, setIsAvatarExpanded] = useState(false);

  // 🛡️ Bulucu modunda akordeonlar direkt açık gelsin, kendi modunda kapalı başlasın kanka
  const [isParentExpanded, setIsParentExpanded] = useState(isFinderMode);
  const [isDependentExpanded, setIsDependentExpanded] = useState(isFinderMode);

  const [isGalleryModalVisible, setIsGalleryModalVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const [isActionSheetVisible, setIsActionSheetVisible] = useState(false);
  const [actionTarget, setActionTarget] = useState<'avatar' | 'album' | null>(null);

  const [isSideMenuVisible, setIsSideMenuVisible] = useState(false);
  const [isAboutVisible, setIsAboutVisible] = useState(false);
  const [isFaqVisible, setIsFaqVisible] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const avatarScale = useRef(new Animated.Value(1)).current;
  const sideMenuTranslateX = useRef(new Animated.Value(width)).current;

  // 🛡️ KVKK SANSÜR / MASKELEME MOTORU
  const maskText = (text: string, type: 'phone' | 'address') => {
    if (!text) return "Belirtilmemiş";
    if (type === 'phone') {
      return text.length > 6 
        ? `${text.substring(0, 4)} *** ** ${text.substring(text.length - 2)}` 
        : "****";
    }
    if (type === 'address') {
      return text.length > 15 
        ? `${text.substring(0, 15)} **************************` 
        : "**************************";
    }
    return text;
  };

  // 🎯 GELDİĞİN YERE DÖNEN, GEÇMİŞ YOKSA HOME'A KIRAN AKILLI KİLİT
  useEffect(() => {
    const backAction = () => {
      if (navigation.isFocused()) {
        if (isSideMenuVisible) {
          closeSideMenu();
          return true;
        }
        
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
    return () => backHandler.remove();
  }, [navigation, isSideMenuVisible]);

  // 📡 VERİ ÇEKME MOTORU (ÇİFT MOD DESTEKLİ)
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        // 🔍 Kanka: Bulucuysak targetUid'yi, sahibiysek kendi uid'mizi sorguluyoruz
        const uidToQuery = isFinderMode ? targetUid : auth.currentUser?.uid;
        
        if (uidToQuery) {
          const profileRef = doc(db, "profiles", uidToQuery);
          const profileSnap = await getDoc(profileRef);
          
          if (profileSnap.exists()) {
            const rawData = profileSnap.data();
            let actualData = rawData.finalData ? rawData.finalData : rawData;
            
            if (!actualData?.parent?.name && rawData?.parent?.name) {
              actualData = rawData;
            }
            
            setProfileData(actualData);
            const savedPhotos = rawData?.dependentPhotos || actualData?.dependent?.photos || [];
            setDependentPhotos([...savedPhotos].reverse());
          } else {
            if (!isFinderMode) {
              navigation.navigate('ProfileSetupScreen');
            } else {
              Alert.alert("Sistem Hatası", "Bu akıllı etikete ait kurumsal profil kaydı bulunamadı.");
            }
          }
        }
      } catch (error) {
        console.error("[Veri Hatası] Profil bilgileri çekilirken hata oluştu:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [targetUid]);

  // 💬 SAHİBİYLE GÜVENLİ İLETİŞİME GEÇ (ANONİM CHAT ODASI ENJEKSİYONU)
  const handleStartChat = async () => {
    try {
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId) {
        Alert.alert("Oturum Gerekli", "Sohbet başlatabilmek için lütfen uygulamada oturum açınız.");
        return;
      }

      if (currentUserId === targetUid) {
        Alert.alert("Bilgi", "Kendi etiketinizle güvenli sohbet başlatamazsınız.");
        return;
      }

      setLoading(true);
      const chatRoomRef = collection(db, "chat_rooms");
      const newRoom = await addDoc(chatRoomRef, {
        participants: [currentUserId, targetUid],
        createdAt: new Date().toISOString(),
        lastMessage: "Güvenli sohbet başlatıldı...",
        updatedAt: new Date().toISOString()
      });

      setLoading(false);
      navigation.navigate('ChatScreen', { roomId: newRoom.id, targetUid: targetUid });

    } catch (error) {
      console.error("[Chat Initialization Error]:", error);
      Alert.alert("Bağlantı Hatası", "Güvenli sohbet odası oluşturulamadı.");
      setLoading(false);
    }
  };

  const openSideMenu = () => {
    setIsSideMenuVisible(true);
    Animated.timing(sideMenuTranslateX, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeSideMenu = () => {
    Animated.timing(sideMenuTranslateX, {
      toValue: width,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setIsSideMenuVisible(false);
      setIsAboutVisible(false);
      setIsFaqVisible(false);
    });
  };

  const toggleAvatarScale = () => {
    Animated.spring(avatarScale, {
      toValue: isAvatarExpanded ? 1 : 1.6,
      friction: 5,
      useNativeDriver: true,
    }).start();
    setIsAvatarExpanded(!isAvatarExpanded);
  };

  const uploadImageToStorage = async (uri: string, path: string) => {
    const blob: any = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () { resolve(xhr.response); };
      xhr.onerror = function (e) {
        console.error("[Network Hatası] XHR Blob dönüşüm hatası:", e);
        reject(new TypeError("Network request failed"));
      };
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    });

    try {
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      blob.close();
      return downloadUrl;
    } catch (error) {
      blob.close();
      throw error;
    }
  };

  const executeAvatarUpdate = async (localUri: string, currentUserUid: string) => {
    try {
      setAvatarUploading(true);
      const storagePath = `users/${currentUserUid}/profile_photos/avatar.jpg`;
      const cloudUrl = await uploadImageToStorage(localUri, storagePath);

      setProfileData((prev: any) => ({
        ...prev,
        parent: { ...prev?.parent, photoUrl: cloudUrl }
      }));

      const profileRef = doc(db, "profiles", currentUserUid);
      await updateDoc(profileRef, {
        "finalData.parent.photoUrl": cloudUrl,
        "parent.photoUrl": cloudUrl
      });

      Alert.alert("Başarılı", "Profil fotoğrafınız başarıyla güncellenmiştir.");
    } catch (err) {
      console.error("[Storage Hatası] Avatar işlenirken arıza çıktı:", err);
      Alert.alert("Hata", "Profil fotoğrafı yüklenirken bir hata oluştu.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const executeAlbumUpload = async (localUri: string, currentUserUid: string) => {
    try {
      setUploading(true); 
      const filename = `gallery_${Date.now()}.jpg`;
      const storagePath = `users/${currentUserUid}/dependent_photos/${filename}`;
      const cloudUrl = await uploadImageToStorage(localUri, storagePath);
      
      const updatedPhotos = [cloudUrl, ...dependentPhotos];
      setDependentPhotos(updatedPhotos);

      const dbPhotosArray = [...updatedPhotos].reverse();

      const profileRef = doc(db, "profiles", currentUserUid);
      await updateDoc(profileRef, {
        "finalData.dependent.photos": dbPhotosArray,
        "dependentPhotos": dbPhotosArray
      });
    } catch (err) {
      console.error("[Storage Hatası] Albüm fotoğrafı yüklenirken hata oluştu:", err);
      Alert.alert("Hata", "Fotoğraf sunucuya yüklenemedi.");
    } finally {
      setUploading(false); 
    }
  };

  const triggerAvatarSelect = () => {
    if (isAvatarExpanded) toggleAvatarScale();
    setActionTarget('avatar');
    setIsActionSheetVisible(true);
  };

  const triggerAlbumSelect = () => {
    if (dependentPhotos.length >= 6) return;
    setActionTarget('album');
    setIsActionSheetVisible(true);
  };

  const handleLaunchCamera = async () => {
    setIsActionSheetVisible(false);
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("İzin Gerekli", "Kamerayı kullanabilmek için izin vermeleniz gerekir.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0].uri) {
      if (actionTarget === 'avatar') {
        executeAvatarUpdate(result.assets[0].uri, currentUser.uid);
      } else if (actionTarget === 'album') {
        executeAlbumUpload(result.assets[0].uri, currentUser.uid);
      }
    }
  };

  const handleLaunchImageLibrary = async () => {
    setIsActionSheetVisible(false);
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("İzin Gerekli", "Galeriye erişebilmek için izin vermelisiniz.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0].uri) {
      if (actionTarget === 'avatar') {
        executeAvatarUpdate(result.assets[0].uri, currentUser.uid);
      } else if (actionTarget === 'album') {
        executeAlbumUpload(result.assets[0].uri, currentUser.uid);
      }
    }
  };

  const handleSignOut = () => {
    Alert.alert("Oturumu Kapat", "Hesabınızdan çıkış yapmak istediğinize emin misiniz?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Çıkış Yap",
        style: "destructive",
        onPress: async () => {
          try {
            setIsSideMenuVisible(false);
            await auth.signOut();
          } catch (e) {
            console.error("Çıkış hatası:", e);
          }
        }
      }
    ]);
  };

  const handlePasswordReset = async () => {
    const user = auth.currentUser;
    if (user && user.email) {
      try {
        Alert.alert("E-posta Gönderildi", `${user.email} adresine şifre sıfırlama bağlantısı gönderilmiştir.`);
      } catch (e) {
        Alert.alert("Hata", "İşlem gerçekleştirilemedi.");
      }
    }
  };

  const handleMailChangePlaceholder = () => {
    Alert.alert("E-posta Güncelleme", "Güvenlik protokolleri gereği e-posta adresi değişikliği için mevcut şifrenizle doğrulama adımları tetiklenecektir. Yakında aktif.");
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "⚠️ HESABI KALICI OLARAK SİL",
      "Hesabınızı sildiğinizde veli kaydınız, tüm NFC UID mühürleriniz ogüvence albümleriniz kalıcı olarak yok edilecektir. Bu işlem geri alınamaz!",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Verilerimi ve Hesabımı Sil",
          style: "destructive",
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (user) {
                setIsSideMenuVisible(false);
                
                const profileRef = doc(db, "profiles", user.uid);
                await deleteDoc(profileRef);
                console.log("[Firestore] Profil verileri başarıyla yok edildi.");

                navigation.reset({
                  index: 0,
                  routes: [{ name: 'UniversalLoginScreen' }],
                });

                await user.delete();
                console.log("[Firebase Auth] Kullanıcı kaydı sistemden kalıcı olarak silindi.");

                Alert.alert("Başarılı", "Hesabınız ve tüm kurumsal verileriniz sistemimizden kalıcı olarak kazınmıştır.");
              }
            } catch (e: any) {
              console.error("[Güvenlik Hatası] Hesap silinirken arıza çıktı:", e);
              if (e.code === 'auth/requires-recent-login') {
                Alert.alert(
                  "Güvenlik Protokolü", 
                  "Kritik hesap silme işlemlerinden önce yakın zamanda giriş yapmış olmanız gerekir. Lütfen çıkış yapıp tekrar girin."
                );
              } else {
                Alert.alert("Hata", "Hesap silme işlemi gerçekleştirilemedi.");
              }
            }
          }
        }
      ]
    );
  };

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
            try {
              const photoToDelete = dependentPhotos[selectedPhotoIndex];
              const updatedPhotos = dependentPhotos.filter((_, idx) => idx !== selectedPhotoIndex);
              setDependentPhotos(updatedPhotos);

              const dbPhotosArray = [...updatedPhotos].reverse();
              const currentUser = auth.currentUser;
              if (currentUser) {
                const profileRef = doc(db, "profiles", currentUser.uid);
                await updateDoc(profileRef, {
                  "finalData.dependent.photos": dbPhotosArray,
                  "dependentPhotos": dbPhotosArray
                });

                if (photoToDelete.includes("firebasestorage.googleapis.com")) {
                  const storageRef = ref(storage, photoToDelete);
                  await deleteObject(storageRef).catch(e => console.error("[Storage Hatası] Dosya silinemedi:", e));
                }
              }
              setIsGalleryModalVisible(false);
            } catch (err) {
              console.error("[Veri Hatası] Silme işlemi esnasında hata oluştu:", err);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#beaf9f" />
        <Text style={{ marginTop: 10, color: '#636366', fontWeight: '500' }}>Profil yükleniyor...</Text>
      </View>
    );
  }

  const parent = profileData?.parent ? profileData.parent : { name: '', phone: '', age: '', gender: '', bloodType: '', district: '', city: '', address: '', note: '', photoUrl: '' };
  const dependent = profileData?.dependent ? profileData.dependent : { type: 'Belirtilmemiş', name: '', age: '', gender: '', heightWeight: '', bloodType: '', chipNumber: '', note: '' };

  const slots: any[] = [...dependentPhotos];
  // 🛡️ Kanka: Bulucu modundaysak albüme fotoğraf ekleme butonunu göstermiyoruz!
  if (slots.length < 6 && !uploading && !isFinderMode) {
    slots.push('ADD_BUTTON_SLOT');
  }

  const rows: any[][] = [];
  for (let i = 0; i < slots.length; i += 3) {
    rows.push(slots.slice(i, i + 3));
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      
      {/* === TOP HEADER BAR === */}
      <View style={styles.topNavigationHeader}>
        <Text style={styles.topNavigationTitle}>
          {isFinderMode ? "ACİL DURUM GÜVENCE PANELİ" : "NFCTT Güvence Paneli"}
        </Text>
        {/* 🛡️ Bulucu modunda sağdaki ayarlar/hamburger menüsünü gizliyoruz kanka */}
        {!isFinderMode && (
          <TouchableOpacity style={styles.hamburgerMenuButton} onPress={openSideMenu} activeOpacity={0.7}>
            <Ionicons name="menu-outline" size={26} color="#1c1c1e" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContainer}>
        
        {/* === HEADER VE AVATAR ALANI === */}
        <View style={styles.headerCard}>
          <View style={styles.avatarRowContainer}>
            <TouchableOpacity activeOpacity={0.9} onPress={toggleAvatarScale} style={styles.avatarWrapper}>
              <Animated.View style={[styles.avatarContainer, { transform: [{ scale: avatarScale }] }]}>
                {parent.photoUrl ? (
                  <Image source={{ uri: parent.photoUrl }} style={styles.avatar} />
                ) : (
                  <Text style={styles.avatarPlaceholder}>{parent.name ? parent.name[0].toUpperCase() : '👤'}</Text>
                )}
              </Animated.View>
            </TouchableOpacity>

            {/* 🛡️ Bulucu modunda avatar değiştirme kamerasını gizliyoruz */}
            {!isAvatarExpanded && !isFinderMode && (
              <TouchableOpacity style={styles.editAvatarBadge} onPress={triggerAvatarSelect} activeOpacity={0.8}>
                {avatarUploading ? (
                  <ActivityIndicator size="small" color="#2b231a" />
                ) : (
                  <Ionicons name="camera-outline" size={16} color="#2b231a" />
                )}
              </TouchableOpacity>
            )}
          </View>
          
          <View style={{ alignItems: 'center', marginTop: isAvatarExpanded ? 30 : 5 }}>
            <Text style={styles.userName}>{parent.name || 'İsim Soyisim'}</Text>
            <Text style={styles.userSubText}>
              {isFinderMode ? "KULLANICI VELİ PROFİLİ" : "NFCTT Güvence Veli Profili"}
            </Text>
          </View>
        </View>

        {/* === KART 1: VELİ BİLGİLERİ PANELİ (SANSÜRLÜ / KVKK UYUMLU) === */}
        <View style={styles.infoCard}>
          <TouchableOpacity 
            style={styles.accordionHeader} 
            activeOpacity={0.7} 
            onPress={() => setIsParentExpanded(!isParentExpanded)}
          >
            <Text style={styles.cardTitle}>Veli / Koruyan Bilgileri</Text>
            <Ionicons name={isParentExpanded ? "chevron-up-outline" : "chevron-down-outline"} size={18} color="#1c1c1e" />
          </TouchableOpacity>
          
          {isParentExpanded && (
            <View style={styles.accordionContent}>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Telefon:</Text>
                <Text style={styles.infoValue}>
                  {isFinderMode ? maskText(parent.phone, 'phone') : parent.phone || '-'}
                </Text>
              </View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Yaş / Cinsiyet:</Text><Text style={styles.infoValue}>{parent.age || '-'} Yaş / {parent.gender || '-'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Kan Grubu:</Text><Text style={[styles.infoValue, {color: '#444', fontWeight: 'bold'}]}>{parent.bloodType || '-'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Bölge:</Text><Text style={styles.infoValue}>{parent.district || '-'} / {citiesAndDistricts.getCities().find((c: any) => String(c.code) === String(parent.city))?.name || parent.city || '-'}</Text></View>
              <View style={styles.infoRow}
              ><Text style={styles.infoLabel}>Adres:</Text>
                <Text style={styles.infoValue}>
                  {isFinderMode ? maskText(parent.address, 'address') : parent.address || '-'}
                </Text>
              </View>
              {parent.note ? (
                <View style={styles.noteBox}><Text style={styles.noteText}><Text style={{fontWeight: 'bold'}}>Kritik Veli Notu:</Text> {parent.note}</Text></View>
              ) : null}
            </View>
          )}
        </View>

        {/* === KART 2: KORUMA ALTINDAKİ CANLI PANELİ (SANSÜRSÜZ GÜVENLİK ALANI) === */}
        <View style={styles.infoCard}>
          <TouchableOpacity 
            style={styles.accordionHeader} 
            activeOpacity={0.7} 
            onPress={() => setIsDependentExpanded(!isDependentExpanded)}
          >
            <Text style={styles.cardTitle}>Keep / Koruma Altındaki Canlı ({dependent.type || 'Belirtilmemiş'})</Text>
            <Ionicons name={isDependentExpanded ? "chevron-up-outline" : "chevron-down-outline"} size={18} color="#1c1c1e" />
          </TouchableOpacity>
          
          {isDependentExpanded && (
            <View style={styles.accordionContent}>
              <View style={styles.divider} />
              <View style={styles.infoRow}><Text style={styles.infoLabel}>İsim:</Text><Text style={styles.infoValue}>{dependent.name || '-'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Yaş / Cinsiyet:</Text><Text style={styles.infoValue}>{dependent.age || '-'} / {dependent.gender || '-'}</Text></View>

              {(dependent.type === 'Çocuk' || dependent.type === 'Yaşlı' || dependent.type === 'Belirtilmemiş') && (
                <>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Boy / Kilo:</Text><Text style={styles.infoValue}>{dependent.heightWeight || '-'}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Kan Grubu:</Text><Text style={[styles.infoValue, {color: '#444', fontWeight: 'bold'}]}>{dependent.bloodType || '-'}</Text></View>
                </>
              )}

              {dependent.type === 'Evcil Hayvan' && (
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Aşı/Çip No:</Text><Text style={styles.infoValue}>{dependent.chipNumber || '-'}</Text></View>
              )}

              {dependent.note ? (
                <View style={styles.noteBox}><Text style={styles.noteText}><Text style={{fontWeight: 'bold'}}>Canlıya Özel Not:</Text> {dependent.note}</Text></View>
              ) : null}
            </View>
          )}
        </View>

        {/* === KART 3: ALBÜM PANELİ === */}
        <View style={styles.infoCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.cardTitle}>Albüm / Fotoğraflar</Text>
            <Text style={{ fontSize: 12, color: '#8e8e93', fontWeight: '500' }}>{dependentPhotos.length} / 6</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.instagramGridContainer}>
            {rows.map((rowItems, rowIndex) => (
              <View key={`grid-row-${rowIndex}`} style={styles.gridRowLayout}>
                {rowItems.map((item, colIndex) => {
                  const originalIndex = (rowIndex * 3) + colIndex;

                  if (item === 'ADD_BUTTON_SLOT') {
                    return (
                      <TouchableOpacity key="dynamic-add-btn" style={styles.gridAddPhotoSlot} onPress={triggerAlbumSelect}>
                        <Text style={styles.plusSign}>+</Text>
                        <Text style={styles.addPhotoSubText}>Ekle</Text>
                      </TouchableOpacity>
                    );
                  }

                  return (
                    <TouchableOpacity 
                      key={`grid-photo-${originalIndex}`} 
                      style={styles.gridImageWrapper}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedPhotoIndex(originalIndex);
                        setIsGalleryModalVisible(true);
                      }}
                    >
                      <Image source={{ uri: item }} style={styles.gridImage} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {uploading && (
              <View style={styles.gridRowLayout}>
                <View style={styles.gridAddPhotoSlot}>
                  <ActivityIndicator size="small" color="#2b231a" />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* =========================================================================
            💬 🔥 KANKA: SAHİBİYLE GÜVENLİ İLETİŞİME GEÇ BUTONU (DETERMİNİSTİK SABİT ODA)
            ========================================================================= */}
        {isFinderMode && (
          <TouchableOpacity style={styles.kurumsalChatButton} onPress={handleStartChat} activeOpacity={0.8}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#fff" />
            <Text style={styles.kurumsalChatButtonText}>SAHİBİYLE GÜVENLİ İLETİŞİME GEÇ</Text>
          </TouchableOpacity>
        )}

      </ScrollView>

      {/* ==================== CAROUSEL FULLSCREEN MODAL ==================== */}
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
              {/* 🛡️ Kanka: Bulucu modundaysak başkasının fotoğrafını silme butonunu gizliyoruz! */}
              {!isFinderMode && (
                <TouchableOpacity 
                  style={[styles.closeButton, { marginRight: 12, backgroundColor: 'rgba(255, 59, 48, 0.25)', borderColor: 'rgba(255, 59, 48, 0.3)' }]} 
                  onPress={handleDeletePhoto}
                >
                  <Ionicons name="trash-outline" size={18} color="#ff3b30" />
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.closeButton} onPress={() => setIsGalleryModalVisible(false)}>
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
                <Image source={{ uri: photoUri }} style={styles.fullscreenImage} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ==================== KAYNAK SEÇİM PANELİ MODAL ==================== */}
      <Modal
        visible={isActionSheetVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsActionSheetVisible(false)}
      >
        <TouchableOpacity style={styles.actionSheetOverlay} activeOpacity={1} onPress={() => setIsActionSheetVisible(false)}>
          <View style={styles.actionSheetContainer}>
            <View style={styles.actionSheetDragLine} />
            <Text style={styles.actionSheetTitle}>Kaynak Seçiniz</Text>
            <TouchableOpacity style={styles.actionSheetRow} onPress={handleLaunchCamera} activeOpacity={0.7}>
              <View style={styles.actionIconCircle}><Ionicons name="camera-outline" size={20} color="#2b231a" /></View>
              <Text style={styles.actionSheetText}>Kamerayı Aç (Fotoğraf Çek)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetRow} onPress={handleLaunchImageLibrary} activeOpacity={0.7}>
              <View style={styles.actionIconCircle}><Ionicons name="image-outline" size={20} color="#2b231a" /></View>
              <Text style={styles.actionSheetText}>Galeriye Git (Fotoğraf Seç)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionSheetRow, styles.actionSheetCancelRow]} onPress={() => setIsActionSheetVisible(false)} activeOpacity={0.7}>
              <Text style={styles.actionSheetCancelText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ==================== DRAWER MENÜ MODALI ==================== */}
      <Modal
        visible={isSideMenuVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeSideMenu}
      >
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={styles.drawerCloseZone} activeOpacity={1} onPress={closeSideMenu} />
          
          <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: sideMenuTranslateX }] }]}>
            <View style={styles.drawerHeaderRow}>
              <Text style={styles.drawerHeaderTitle}>Yönetim & Güvenlik</Text>
              <TouchableOpacity onPress={closeSideMenu} style={styles.drawerCloseBtn}><Text style={{fontSize: 18, fontWeight: 'bold', color: '#636366'}}>✕</Text></TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              
              <Text style={styles.drawerSectionLabel}>HESAP VE GÜVENLİK</Text>
              
              <TouchableOpacity style={styles.drawerItemRow} onPress={handleMailChangePlaceholder} activeOpacity={0.7}>
                <View style={styles.drawerIconCircle}><Ionicons name="mail-unread-outline" size={18} color="#2b231a" /></View>
                <Text style={styles.drawerItemText}>E-posta Adresini Değiştir</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItemRow} onPress={handlePasswordReset} activeOpacity={0.7}>
                <View style={styles.drawerIconCircle}><Ionicons name="lock-open-outline" size={18} color="#2b231a" /></View>
                <Text style={styles.drawerItemText}>Şifre Değiştirme Maili Uçur</Text>
              </TouchableOpacity>

              <Text style={styles.drawerSectionLabel}>KURUMSAL BİLGİ & DESTEK</Text>
              
              <TouchableOpacity style={styles.drawerItemRow} onPress={() => setIsFaqVisible(!isFaqVisible)} activeOpacity={0.7}>
                <View style={styles.drawerIconCircle}><Ionicons name="help-circle-outline" size={18} color="#2b231a" /></View>
                <Text style={styles.drawerItemText}>Sıkça Sorulan Sorular (FAQ)</Text>
                <Ionicons name={isFaqVisible ? "chevron-up" : "chevron-down"} size={14} color="#636366" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
              {isFaqVisible && (
                <View style={styles.drawerDropdownContent}>
                  <Text style={styles.faqQ}>• NFCTT UID çipi nasıl çalışır?</Text>
                  <Text style={styles.faqA}>NFC çipi, canlının benzersiz Firestore UID profil linkini taşır. Herhangi bir telefon yaklaştırıldığında güvenli profil sayfası otomatik açılır.</Text>
                  <Text style={styles.faqQ}>• Konum bilgisi anlık alınır mı?</Text>
                  <Text style={styles.faqA}>Çip tarandığı an veliye tarama koordinatları ve anlık bildirim akışı iletilir.</Text>
                </View>
              )}

              <TouchableOpacity style={styles.drawerItemRow} onPress={() => setIsAboutVisible(!isAboutVisible)} activeOpacity={0.7}>
                <View style={styles.drawerIconCircle}><Ionicons name="document-text-outline" size={18} color="#2b231a" /></View>
                <Text style={styles.drawerItemText}>Uygulama Amacı & Özet</Text>
                <Ionicons name={isAboutVisible ? "chevron-up" : "chevron-down"} size={14} color="#636366" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
              {isAboutVisible && (
                <View style={styles.drawerDropdownContent}>
                  <Text style={styles.aboutManifestoText}>
                    NFCTT, kaybolma riski yüksek olan çocuk, evcil hayvan ve yaşlılarımızın güvenliğini sağlamak amacıyla geliştirilmiş NFC tabanlı yeni nesil bir güvence platformudur. Benzersiz UID atamaları sayesinde can dostlarımız ve sevdiklerimiz her an güvence altındadır.
                  </Text>
                </View>
              )}

              <Text style={[styles.drawerSectionLabel, { color: '#ff3b30', marginTop: 25 }]}>TEHLİKELİ BÖLGE</Text>
              
              <View style={styles.dangerZoneCardFrame}>
                <TouchableOpacity style={styles.drawerItemRow} onPress={handleSignOut} activeOpacity={0.7}>
                  <View style={[styles.drawerIconCircle, { backgroundColor: '#f2f2f7' }]}><Ionicons name="log-out-outline" size={18} color="#1c1c1e" /></View>
                  <Text style={[styles.drawerItemText, { color: '#1c1c1e', fontWeight: '600' }]}>Oturumu Kapat</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.drawerItemRow, { borderBottomWidth: 0 }]} onPress={handleDeleteAccount} activeOpacity={0.7}>
                  <View style={[styles.drawerIconCircle, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}><Ionicons name="trash-outline" size={18} color="#ff3b30" /></View>
                  <Text style={[styles.drawerItemText, { color: '#ff3b30', fontWeight: '700' }]}>Hesabımı Kalıcı Olarak Sil</Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* 🛡️ Kanka: Bulucu modundaysak en alttaki navigasyon barını komple gizliyoruz ki adam bizim menülerde gezemesin! */}
      {!isFinderMode && <BottomBar navigation={navigation} activeScreen="Profile" />}
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  scrollContainer: { padding: GRID_PADDING, paddingBottom: 100 },
  headerCard: { backgroundColor: 'white', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 15, borderWidth: 0.5, borderColor: '#e5e5ea' },
  
  topNavigationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 45 : 45, paddingBottom: 12, backgroundColor: 'white', borderBottomWidth: 0.5, borderBottomColor: '#e5e5ea' },
  topNavigationTitle: { fontSize: 14, fontWeight: '700', color: '#beaf9f', textTransform: 'uppercase', letterSpacing: 0.5 },
  hamburgerMenuButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },

  avatarRowContainer: { position: 'relative', width: 85, height: 85, justifyContent: 'center', alignItems: 'center' },
  avatarWrapper: { zIndex: 999, height: 85, justifyContent: 'center', alignItems: 'center' },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#d1c7bd', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 2, borderColor: '#fff', elevation: 4 },
  
  avatar: { width: 80, height: 80, borderRadius: 40 },
  gridImage: { width: FIXED_IMAGE_SIZE, height: FIXED_IMAGE_SIZE, borderRadius: 8 },
  fullscreenImage: { width: width, height: height * 0.75 },

  avatarPlaceholder: { fontSize: 32, color: '#2b231a', fontWeight: 'bold' },
  editAvatarBadge: { position: 'absolute', bottom: 0, right: -4, backgroundColor: '#d1c7bd', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', zIndex: 1000, borderWidth: 1.5, borderColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41, elevation: 2 },

  userName: { fontSize: 20, fontWeight: '700', color: '#1c1c1e', marginTop: 10 },
  userSubText: { fontSize: 13, color: '#8e8e93', marginTop: 2, fontWeight: '500' },
  
  infoCard: { backgroundColor: 'white', paddingHorizontal: CARD_INTERNAL_PADDING, paddingVertical: 12, borderRadius: 15, marginBottom: 15, borderWidth: 0.5, borderColor: '#e5e5ea' },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  accordionContent: { width: '100%' },

  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1c1c1e' },
  divider: { height: 0.5, backgroundColor: '#e5e5ea', marginVertical: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#f5f5f5' },
  infoLabel: { fontSize: 14, color: '#666', fontWeight: '500' },
  infoValue: { fontSize: 14, color: '#1c1c1e', textAlign: 'right', flex: 1, paddingLeft: 10, fontWeight: '400' },
  
  noteBox: { backgroundColor: '#f4f1ea', padding: 12, borderRadius: 10, marginTop: 12, borderWidth: 0.5, borderColor: '#dcd7cd' },
  noteText: { fontSize: 13, color: '#5c5245', lineHeight: 18 },
  
  instagramGridContainer: { flexDirection: 'column', width: '100%', paddingVertical: 5 },
  gridRowLayout: { flexDirection: 'row', width: '100%', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 8 },
  
  gridImageWrapper: { width: FIXED_IMAGE_SIZE, height: FIXED_IMAGE_SIZE, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f2f2f7', borderWidth: 0.5, borderColor: '#e5e5ea', marginRight: 8 },
  gridAddPhotoSlot: { width: FIXED_IMAGE_SIZE, height: FIXED_IMAGE_SIZE, borderRadius: 8, borderWidth: 1.5, borderColor: '#beaf9f', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fdfdfd', marginRight: 8 },
  plusSign: { fontSize: 22, color: '#beaf9f', fontWeight: '400', marginTop: -2 },
  addPhotoSubText: { fontSize: 11, color: '#beaf9f', fontWeight: '600', marginTop: -2 },

  modalBackground: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.92)', justifyContent: 'center', alignItems: 'center' },
  modalHeader: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 30, position: 'absolute', top: 0, zIndex: 10 },
  counterBadge: { backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 0.5, borderColor: 'rgba(255, 255, 255, 0.2)' },
  modalCounter: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(255, 255, 255, 0.2)' },
  closeButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  
  modalScrollView: { width: width, height: height },
  fullscreenImageContainer: { width: width, height: height, justifyContent: 'center', alignItems: 'center' },

  actionSheetOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  actionSheetContainer: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 25, width: '100%', alignItems: 'center' },
  actionSheetDragLine: { width: 40, height: 5, backgroundColor: '#e5e5ea', borderRadius: 2.5, marginBottom: 15 },
  actionSheetTitle: { fontSize: 15, fontWeight: '700', color: '#636366', marginBottom: 15, letterSpacing: 0.3 },
  actionSheetRow: { flexDirection: 'row', width: '100%', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#f2f2f7' },
  actionIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#d1c7bd', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  actionSheetText: { fontSize: 15, fontWeight: '600', color: '#1c1c1e' },
  actionSheetCancelRow: { justifyContent: 'center', borderBottomWidth: 0, marginTop: 12, backgroundColor: '#f2f2f7', borderRadius: 10, paddingVertical: 12 },
  actionSheetCancelText: { fontSize: 15, fontWeight: '700', color: '#1c1c1e' },

  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', flexDirection: 'row', justifyContent: 'flex-end' },
  drawerCloseZone: { flex: 1, height: '100%' },
  drawerContainer: { width: width * 0.78, height: '100%', backgroundColor: 'white', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20, shadowColor: '#000', shadowOffset: { width: -2, height: 0 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 16 },
  drawerHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 15, borderBottomWidth: 0.5, borderBottomColor: '#e5e5ea', marginBottom: 15 },
  drawerHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#2b231a' },
  drawerCloseBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  
  drawerSectionLabel: { fontSize: 11, fontWeight: '700', color: '#beaf9f', letterSpacing: 1, marginTop: 18, marginBottom: 8 },
  drawerItemRow: { flexDirection: 'row', width: '100%', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#f2f2f7' },
  drawerIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f4f1ea', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  drawerItemText: { fontSize: 14, fontWeight: '500', color: '#1c1c1e' },
  
  drawerDropdownContent: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginTop: 4, marginBottom: 4, borderWidth: 0.5, borderColor: '#e5e5ea' },
  faqQ: { fontSize: 12, fontWeight: '700', color: '#beaf9f', marginBottom: 2 },
  faqA: { fontSize: 12, color: '#636366', lineHeight: 16, marginBottom: 8 },
  aboutManifestoText: { fontSize: 12, color: '#5c5245', lineHeight: 18, textAlign: 'justify' },

  dangerZoneCardFrame: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 59, 48, 0.15)', paddingHorizontal: 10, marginTop: 5, overflow: 'hidden' },

  // 🔥 🛡️ KANKA: SIFIR ENJEKSİYON KURUMSAL CHAT BUTONU STYLES
  kurumsalChatButton: { flexDirection: 'row', backgroundColor: '#beaf9f', height: 56, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  kurumsalChatButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 10, letterSpacing: 0.5 }
});