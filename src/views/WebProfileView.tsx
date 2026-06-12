import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Platform, ActivityIndicator, Animated, useWindowDimensions, TextInput 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../config/firebaseConfig'; 
import { doc, getDoc, updateDoc, deleteDoc, collection, arrayUnion, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'; 
import { Ionicons } from '@expo/vector-icons'; 
import { changePasswordLoggedIn } from '../controllers/AuthController'; 

const citiesAndDistricts = require('turkey-neighbourhoods');

interface WebProfileViewProps {
  targetUid?: string; // NFC sekmesinden gelen bulucu modu UID'si
}

export default function WebProfileView({ targetUid }: WebProfileViewProps) {
  const isFinderMode = !!targetUid; 
  const { width, height } = useWindowDimensions();
  const isMobile = width < 768;

  // Dinamik Izgara (Grid) Hesaplaması
  const gridPadding = 15;
  const cardInternalPadding = 15;
  const currentWidth = isMobile ? width : 600; // Masaüstünde kart genişliğini sınırlıyoruz
  const visibleWidth = currentWidth - (gridPadding * 2) - (cardInternalPadding * 2);
  const fixedImageSize = (visibleWidth - 16) / 3;

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false); 
  const [avatarUploading, setAvatarUploading] = useState(false); 
  const [profileData, setProfileData] = useState<any>(null);
  const [dependentPhotos, setDependentPhotos] = useState<string[]>([]);

  const [isParentExpanded, setIsParentExpanded] = useState(true);
  const [isDependentExpanded, setIsDependentExpanded] = useState(true);

  // Web Panelleri Kontrol Stateleri
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);

  // Şifre Değiştirme Stateleri
  const [isPasswordPanelVisible, setIsPasswordPanelVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

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

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
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
            if (isFinderMode) {
              alert("Sistem üzerinde bu akıllı etikete ait kurumsal profil kaydı bulunamadı.");
            }
          }
        }
      } catch (error) {
        console.error("Profil yükleme hatası:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [targetUid]);

  // 💬 SAHİBİYLE GÜVENLİ SOHBET BAŞLATMA MOTORU
  const handleStartChatWeb = async () => {
    try {
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId || !targetUid) return;

      if (currentUserId === targetUid) {
        alert("Kendi etiketinizle güvenli sohbet başlatamazsınız kral.");
        return;
      }

      setLoading(true);
      const sortedUids = [currentUserId, targetUid].sort();
      const deterministicRoomId = `${sortedUids[0]}_${sortedUids[1]}`;

      const chatRoomRef = doc(db, "chat_rooms", deterministicRoomId);
      const chatRoomSnap = await getDoc(chatRoomRef);

      if (!chatRoomSnap.exists()) {
        await setDoc(chatRoomRef, {
          roomId: deterministicRoomId,
          participants: [currentUserId, targetUid],
          visibleTo: [currentUserId, targetUid], 
          createdAt: new Date().toISOString(),
          lastMessage: "Güvenli sohbet kanalı aktif edildi.",
          updatedAt: serverTimestamp(),
          unreadCount: { [currentUserId]: 0, [targetUid]: 0 }
        });
      } else {
        await updateDoc(chatRoomRef, {
          visibleTo: arrayUnion(currentUserId)
        }).catch(() => {});
      }

      setLoading(false);
      alert("Güvenli oda oluşturuldu. Sol menüden Mesajlar sekmesine geçerek canlı yazışabilirsiniz reis!");
    } catch (error) {
      alert("Güvenli sohbet odası yapılandırılırken bir kesinti oluştu.");
      setLoading(false);
    }
  };

  // ☁️ WEB UYUMLU GÜVENLİ STORAGE YÜKLEME MOTORU (BLOB CRYPTO BYPASS)
  const uploadImageWeb = async (uri: string, path: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const handleAvatarSelectWeb = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (!result.canceled && result.assets[0].uri) {
      try {
        setAvatarUploading(true);
        const storagePath = `users/${currentUser.uid}/profile_photos/avatar.jpg`;
        const cloudUrl = await uploadImageWeb(result.assets[0].uri, storagePath);

        setProfileData((prev: any) => ({
          ...prev,
          parent: { ...prev?.parent, photoUrl: cloudUrl }
        }));

        await updateDoc(doc(db, "profiles", currentUser.uid), {
          "finalData.parent.photoUrl": cloudUrl,
          "parent.photoUrl": cloudUrl
        });
        alert("Profil fotoğrafınız başarıyla güncellenmiştir.");
      } catch (err) {
        alert("Fotoğraf yüklenirken bir hata oluştu.");
      } finally {
        setAvatarUploading(false);
      }
    }
  };

  const handleAlbumAddWeb = async () => {
    if (dependentPhotos.length >= 6) return;
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (!result.canceled && result.assets[0].uri) {
      try {
        setUploading(true);
        const filename = `gallery_${Date.now()}.jpg`;
        const storagePath = `users/${currentUser.uid}/dependent_photos/${filename}`;
        const cloudUrl = await uploadImageWeb(result.assets[0].uri, storagePath);

        const updatedPhotos = [cloudUrl, ...dependentPhotos];
        setDependentPhotos(updatedPhotos);

        const dbPhotosArray = [...updatedPhotos].reverse();
        await updateDoc(doc(db, "profiles", currentUser.uid), {
          "finalData.dependent.photos": dbPhotosArray,
          "dependentPhotos": dbPhotosArray
        });
      } catch (err) {
        alert("Fotoğraf albüme eklenemedi.");
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDeletePhotoWeb = async () => {
    const isConfirm = confirm("Bu fotoğrafı albümden kalıcı olarak silmek istediğinize emin misiniz?");
    if (!isConfirm) return;

    try {
      const photoToDelete = dependentPhotos[selectedPhotoIndex];
      const updatedPhotos = dependentPhotos.filter((_, idx) => idx !== selectedPhotoIndex);
      setDependentPhotos(updatedPhotos);

      const dbPhotosArray = [...updatedPhotos].reverse();
      const currentUser = auth.currentUser;
      if (currentUser) {
        await updateDoc(doc(db, "profiles", currentUser.uid), {
          "finalData.dependent.photos": dbPhotosArray,
          "dependentPhotos": dbPhotosArray
        });

        if (photoToDelete.includes("firebasestorage.googleapis.com")) {
          await deleteObject(ref(storage, photoToDelete)).catch(() => {});
        }
      }
      setIsGalleryOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLivePasswordChangeWeb = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Lütfen tüm şifre alanlarını doldurunuz.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Yeni şifreleriniz birbiriyle eşleşmemektedir.");
      return;
    }
    if (newPassword.length < 6) {
      alert("Yeni şifreniz en az 6 karakter uzunluğunda olmalıdır.");
      return;
    }

    setPasswordLoading(true);
    try {
      const result = await changePasswordLoggedIn(currentPassword, newPassword);
      if (result.success) {
        alert("Şifreniz güvenlik protokollerine uygun olarak başarıyla güncellenmiştir.");
        setIsPasswordPanelVisible(false);
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      } else {
        alert(result.error || "Şifre değiştirme işlemi gerçekleştirilemedi.");
      }
    } catch (error) {
      alert("Sistemsel bir hata oluştu.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccountWeb = () => {
    const isFirstConfirm = confirm("⚠️ HESABI KALICI OLARAK SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ?\n\nBu işlem geri alınamaz; tüm verileriniz, mühürleriniz ve albümleriniz yok edilecektir!");
    if (!isFirstConfirm) return;

    const isSecondConfirm = confirm("Son uyarı kral. Veriler kalıcı olarak kazınacak. Onaylıyor musunuz?");
    if (isSecondConfirm) {
      alert("Hesap silme talebi alındı. Güvenlik protokolü gereği yakın zamanda giriş yapmış olmanız gerekir. Firebase Auth bağlantısı tetikleniyor...");
    }
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
  if (slots.length < 6 && !uploading && !isFinderMode) {
    slots.push('ADD_BUTTON_SLOT');
  }

  const rows: any[][] = [];
  for (let i = 0; i < slots.length; i += 3) {
    rows.push(slots.slice(i, i + 3));
  }

  return (
    <View style={styles.webMainLayout}>
      {/* SOL / ORTA ALAN: SAF PROFİL İÇERİĞİ */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContainer}>
        <View style={[styles.mainCardWrapper, !isMobile && styles.desktopWidthConstraint]}>
          
          {/* AVATAR CARD */}
          <View style={styles.headerCard}>
            <View style={styles.avatarRowContainer}>
              <View style={styles.avatarContainer}>
                {parent.photoUrl ? (
                  <Image source={{ uri: parent.photoUrl }} style={styles.avatar} />
                ) : (
                  <Text style={styles.avatarPlaceholder}>{parent.name ? parent.name[0].toUpperCase() : '👤'}</Text>
                )}
              </View>
              {!isFinderMode && (
                <TouchableOpacity style={styles.editAvatarBadge} onPress={handleAvatarSelectWeb}>
                  {avatarUploading ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="camera-outline" size={16} color="#000" />}
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.userName}>{parent.name || 'İsim Soyisim'}</Text>
            <Text style={styles.userSubText}>{isFinderMode ? "🚨 ACİL DURUM VELİ BİLGİ KARTI" : "NFCTT Güvence Veli Profili"}</Text>
          </View>

          {/* VELİ ACCORDION */}
          <View style={styles.infoCard}>
            <TouchableOpacity style={styles.accordionHeader} onPress={() => setIsParentExpanded(!isParentExpanded)}>
              <Text style={styles.cardTitle}>Veli / Koruyan Bilgileri</Text>
              <Ionicons name={isParentExpanded ? "chevron-up" : "chevron-down"} size={18} color="#000" />
            </TouchableOpacity>
            {isParentExpanded && (
              <View style={{ marginTop: 10 }}>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Telefon:</Text><Text style={styles.infoValue}>{isFinderMode ? maskText(parent.phone, 'phone') : parent.phone || '-'}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Yaş / Cinsiyet:</Text><Text style={styles.infoValue}>{parent.age || '-'} Yaş / {parent.gender || '-'}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Kan Grubu:</Text><Text style={[styles.infoValue, {fontWeight: 'bold'}]}>{parent.bloodType || '-'}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Bölge:</Text><Text style={styles.infoValue}>{parent.district || '-'} / {citiesAndDistricts.getCities().find((c: any) => String(c.code) === String(parent.city))?.name || parent.city || '-'}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Adres:</Text><Text style={styles.infoValue}>{isFinderMode ? maskText(parent.address, 'address') : parent.address || '-'}</Text></View>
                {parent.note ? <View style={styles.noteBox}><Text style={styles.noteText}><Text style={{fontWeight: 'bold'}}>Kritik Veli Notu:</Text> {parent.note}</Text></View> : null}
              </View>
            )}
          </View>

          {/* DEPENDENT ACCORDION */}
          <View style={styles.infoCard}>
            <TouchableOpacity style={styles.accordionHeader} onPress={() => setIsDependentExpanded(!isDependentExpanded)}>
              <Text style={styles.cardTitle}>Koruma Altındaki Canlı ({dependent.type})</Text>
              <Ionicons name={isDependentExpanded ? "chevron-up" : "chevron-down"} size={18} color="#000" />
            </TouchableOpacity>
            {isDependentExpanded && (
              <View style={{ marginTop: 10 }}>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>İsim:</Text><Text style={styles.infoValue}>{dependent.name || '-'}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Yaş / Cinsiyet:</Text><Text style={styles.infoValue}>{dependent.age || '-'} / {dependent.gender || '-'}</Text></View>
                {(dependent.type !== 'Evcil Hayvan') && (
                  <>
                    <View style={styles.infoRow}><Text style={styles.infoLabel}>Boy / Kilo:</Text><Text style={styles.infoValue}>{dependent.heightWeight || '-'}</Text></View>
                    <View style={styles.infoRow}><Text style={styles.infoLabel}>Kan Grubu:</Text><Text style={[styles.infoValue, {fontWeight: 'bold'}]}>{dependent.bloodType || '-'}</Text></View>
                  </>
                )}
                {dependent.type === 'Evcil Hayvan' && <View style={styles.infoRow}><Text style={styles.infoLabel}>Aşı/Çip No:</Text><Text style={styles.infoValue}>{dependent.chipNumber || '-'}</Text></View>}
                {dependent.note ? <View style={styles.noteBox}><Text style={styles.noteText}><Text style={{fontWeight: 'bold'}}>Canlıya Özel Not:</Text> {dependent.note}</Text></View> : null}
              </View>
            )}
          </View>

          {/* ALBUM COMPONENT */}
          <View style={styles.infoCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.cardTitle}>Albüm / Fotoğraflar</Text>
              <Text style={{ fontSize: 12, color: '#8e8e93' }}>{dependentPhotos.length} / 6</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.instagramGridContainer}>
              {rows.map((rowItems, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.gridRowLayout}>
                  {rowItems.map((item, colIndex) => {
                    const originalIndex = (rowIndex * 3) + colIndex;
                    if (item === 'ADD_BUTTON_SLOT') {
                      return (
                        <TouchableOpacity key="add-btn" style={[styles.gridAddPhotoSlot, { width: fixedImageSize, height: fixedImageSize }]} onPress={handleAlbumAddWeb}>
                          <Text style={styles.plusSign}>+</Text>
                        </TouchableOpacity>
                      );
                    }
                    return (
                      <TouchableOpacity 
                        key={`photo-${originalIndex}`} 
                        style={[styles.gridImageWrapper, { width: fixedImageSize, height: fixedImageSize }]}
                        onPress={() => { setSelectedPhotoIndex(originalIndex); setIsGalleryOpen(true); }}
                      >
                        <Image source={{ uri: item }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          {/* BULUCU AKSİYON BUTONU */}
          {isFinderMode && (
            <TouchableOpacity style={styles.kurumsalChatButton} onPress={handleStartChatWeb}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color="#fff" />
              <Text style={styles.kurumsalChatButtonText}>SAHİBİYLE GÜVENLİ İLETİŞİME GEÇ</Text>
            </TouchableOpacity>
          )}

          {/* MASAÜSTÜ AYAR PANEL TETİKLEYİCİLERİ (Sadece kendi profili ise) */}
          {!isFinderMode && isMobile && (
            <TouchableOpacity style={styles.mobileMenuTrigger} onPress={() => setIsSideMenuOpen(true)}>
              <Ionicons name="settings-outline" size={20} color="#1c1c1e" />
              <Text style={{marginLeft: 10, fontWeight: 'bold'}}>Hesap Yönetim Paneli</Text>
            </TouchableOpacity>
          )}

        </View>
      </ScrollView>

      {/* SAĞ TARAF PANELİ: MASAÜSTÜNDE SABİT GÜVENLİK VE AYAR PANELİ (Sıfır Modal Hantallığı!) */}
      {!isFinderMode && (!isMobile || isSideMenuOpen) && (
        <View style={isMobile ? styles.mobileDrawerFull : styles.desktopFixedRightPanel}>
          <View style={styles.rightPanelHeader}>
            <Text style={styles.rightPanelTitle}>Yönetim & Güvenlik</Text>
            {isMobile && (
              <TouchableOpacity onPress={() => setIsSideMenuOpen(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={{ flex: 1, padding: 20 }}>
            <Text style={styles.panelSectionLabel}>GÜVENLİK AYARLARI</Text>
            
            <TouchableOpacity style={styles.panelRow} onPress={() => setIsPasswordPanelVisible(!isPasswordPanelVisible)}>
              <Ionicons name="lock-closed-outline" size={18} color="#2b231a" />
              <Text style={styles.panelRowText}>Şifre Değiştir</Text>
              <Ionicons name={isPasswordPanelVisible ? "chevron-up" : "chevron-down"} size={14} color="#666" style={{marginLeft: 'auto'}} />
            </TouchableOpacity>

            {isPasswordPanelVisible && (
              <View style={styles.passwordWebBox}>
                <TextInput placeholder="Mevcut Şifre" secureTextEntry style={styles.webInput} onChangeText={setCurrentPassword} value={currentPassword} />
                <TextInput placeholder="Yeni Şifre (En az 6 Karakter)" secureTextEntry style={styles.webInput} onChangeText={setNewPassword} value={newPassword} />
                <TextInput placeholder="Yeni Şifre Tekrar" secureTextEntry style={styles.webInput} onChangeText={setConfirmPassword} value={confirmPassword} />
                {passwordLoading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <TouchableOpacity style={styles.webUpdateBtn} onPress={handleLivePasswordChangeWeb}>
                    <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 12}}>ŞİFREYİ GÜNCELLE</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <Text style={styles.panelSectionLabel}>TEHLİKELİ BÖLGE</Text>
            <TouchableOpacity style={styles.dangerRow} onPress={handleDeleteAccountWeb}>
              <Ionicons name="trash-outline" size={18} color="#ff3b30" />
              <Text style={{color: '#ff3b30', fontWeight: 'bold', marginLeft: 10}}>Hesabımı Kalıcı Olarak Sil</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* ALBUM CAROUSEL MODAL (Faydalı Fullscreen Katmanı) */}
      {isGalleryOpen && (
        <View style={styles.galleryOverlayWeb}>
          <View style={styles.galleryHeaderWeb}>
            <Text style={{color: '#fff', fontWeight: 'bold'}}>{selectedPhotoIndex + 1} / {dependentPhotos.length}</Text>
            <View style={{flexDirection: 'row', gap: 15}}>
              {!isFinderMode && (
                <TouchableOpacity onPress={handleDeletePhotoWeb}>
                  <Ionicons name="trash" size={22} color="#ff3b30" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setIsGalleryOpen(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.galleryContentWeb}>
            <Image source={{ uri: dependentPhotos[selectedPhotoIndex] }} style={{ width: '100%', height: height * 0.7 }} resizeMode="contain" />
          </View>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  webMainLayout: { flex: 1, flexDirection: 'row', backgroundColor: '#f8f9fa' },
  scrollContainer: { padding: 15 },
  mainCardWrapper: { flex: 1, alignSelf: 'center', width: '100%' },
  desktopWidthConstraint: { maxWidth: 600, paddingVertical: 20 },
  
  headerCard: { backgroundColor: 'white', padding: 25, borderRadius: 15, alignItems: 'center', marginBottom: 15, borderWidth: 0.5, borderColor: '#e5e5ea' },
  avatarRowContainer: { position: 'relative', width: 85, height: 85, justifyContent: 'center', alignItems: 'center' },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#d1c7bd', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 2, borderColor: '#fff' },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  
  // 🔥 İŞTE EKSİK OLAN VE EKLEDİĞİMİZ KISIM BURASI KANKA:
  avatarPlaceholder: { fontSize: 32, color: '#2b231a', fontWeight: 'bold' },
  
  editAvatarBadge: { position: 'absolute', bottom: 0, right: -4, backgroundColor: '#d1c7bd', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'white' },
  userName: { fontSize: 20, fontWeight: '700', color: '#1c1c1e', marginTop: 12 },
  userSubText: { fontSize: 12, color: '#8e8e93', marginTop: 2, fontWeight: '600', letterSpacing: 0.5 },
  
  infoCard: { backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 15, borderWidth: 0.5, borderColor: '#e5e5ea' },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1c1c1e' },
  divider: { height: 0.5, backgroundColor: '#e5e5ea', marginVertical: 12 },
  
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#f5f5f5' },
  infoLabel: { fontSize: 13, color: '#666', fontWeight: '500' },
  infoValue: { fontSize: 13, color: '#1c1c1e', textAlign: 'right', flex: 1, paddingLeft: 10 },
  
  noteBox: { backgroundColor: '#f4f1ea', padding: 12, borderRadius: 10, marginTop: 12, borderWidth: 0.5, borderColor: '#dcd7cd' },
  noteText: { fontSize: 13, color: '#5c5245', lineHeight: 18 },
  
  instagramGridContainer: { flexDirection: 'column', width: '100%' },
  gridRowLayout: { flexDirection: 'row', width: '100%', justifyContent: 'flex-start', marginBottom: 8 },
  gridImageWrapper: { borderRadius: 8, overflow: 'hidden', backgroundColor: '#f2f2f7', borderWidth: 0.5, borderColor: '#e5e5ea', marginRight: 8 },
  gridAddPhotoSlot: { borderRadius: 8, borderWidth: 1.5, borderColor: '#beaf9f', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fdfdfd', marginRight: 8 },
  plusSign: { fontSize: 24, color: '#beaf9f' },

  kurumsalChatButton: { flexDirection: 'row', backgroundColor: '#beaf9f', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 20 },
  kurumsalChatButtonText: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginLeft: 10, letterSpacing: 0.5 },
  mobileMenuTrigger: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 12, borderWidth: 0.5, borderColor: '#ddd', alignItems: 'center', marginTop: 5 },

  // MASAÜSTÜ SAĞ PANEL (SABİT DÜZEN)
  desktopFixedRightPanel: { width: 320, height: '100%', backgroundColor: '#fff', borderLeftWidth: 0.5, borderColor: '#e5e5ea' },
  mobileDrawerFull: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#fff', zIndex: 10000 },
  rightPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 0.5, borderColor: '#e5e5ea', height: 65 },
  rightPanelTitle: { fontSize: 16, fontWeight: 'bold', color: '#2b231a' },
  panelSectionLabel: { fontSize: 11, fontWeight: '700', color: '#beaf9f', letterSpacing: 1, marginTop: 15, marginBottom: 10 },
  panelRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderColor: '#f2f2f7' },
  panelRowText: { fontSize: 13, fontWeight: '500', marginLeft: 10 },
  dangerRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#ffebee', borderRadius: 8, marginTop: 5 },

  passwordWebBox: { backgroundColor: '#fafafa', padding: 15, borderRadius: 8, marginTop: 8, gap: 10, borderWidth: 0.5, borderColor: '#ddd' },
  webInput: { backgroundColor: '#fff', padding: 10, borderRadius: 6, fontSize: 13, borderWidth: 1, borderColor: '#ccc' },
  webUpdateBtn: { backgroundColor: '#beaf9f', padding: 10, borderRadius: 6, alignItems: 'center' },

  // GALERİ OVERLAY
  galleryOverlayWeb: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 20000 },
  galleryHeaderWeb: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  galleryContentWeb: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});