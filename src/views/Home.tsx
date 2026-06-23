import React, { useState, useEffect } from 'react'; 
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ScrollView, BackHandler, ToastAndroid, Platform, FlatList, Modal, TextInput, ActivityIndicator, Alert, Image
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../config/firebaseConfig'; 
import { signOut } from 'firebase/auth'; 
import { collection, onSnapshot, addDoc, query, orderBy, doc, getDoc, deleteDoc } from 'firebase/firestore';

import BottomBar from '../components/BottomBar';

export default function HomeScreen({ navigation }: any) {
  const [activeAlert, setActiveAlert] = useState<any>(null);
  
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [profilesCache, setProfilesCache] = useState<{ [key: string]: string }>({}); 
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formLocation, setFormLocation] = useState('');

  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    let backPressCount = 0;

    const backAction = () => {
      if (navigation.isFocused()) {
        if (isCreateModalVisible) {
          setIsCreateModalVisible(false);
          return true;
        }
        if (isDetailModalVisible) {
          setIsDetailModalVisible(false);
          return true;
        }
        if (backPressCount === 0) {
          backPressCount++;
          if (Platform.OS === 'android') {
            ToastAndroid.show('Çıkmak için tekrar basın.', ToastAndroid.SHORT);
          }
          const timeout = setTimeout(() => {
            backPressCount = 0;
          }, 2000);
          return true;
        } else {
          BackHandler.exitApp();
          return true;
        }
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [navigation, isCreateModalVisible, isDetailModalVisible]);

  useEffect(() => {
    const q = query(collection(db, "lost_announcements"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const list: any[] = [];
      const newUidsToFetch: string[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({ id: doc.id, ...data });
        
        if (data.ownerUid && !profilesCache[data.ownerUid] && !newUidsToFetch.includes(data.ownerUid)) {
          newUidsToFetch.push(data.ownerUid);
        }
      });

      if (newUidsToFetch.length > 0) {
        const updatedCache = { ...profilesCache };
        for (const uid of newUidsToFetch) {
          try {
            const profileSnap = await getDoc(doc(db, "profiles", uid));
            if (profileSnap.exists()) {
              const pData = profileSnap.data();
              const targetData = pData.finalData ? pData.finalData : pData;
              
              const dependentPhotos = pData?.dependentPhotos || targetData?.dependent?.photos || targetData?.dependentPhotos || [];
              const fallbackPetImg = targetData?.petImageUrl || pData?.petImageUrl || '';
              
              if (dependentPhotos && dependentPhotos.length > 0) {
                updatedCache[uid] = dependentPhotos[0];
              } else if (fallbackPetImg) {
                updatedCache[uid] = fallbackPetImg;
              } else {
                updatedCache[uid] = '';
              }
            } else {
              updatedCache[uid] = '';
            }
          } catch (err) {
            console.log("Bağımlı canlı resmi çekilemedi:", uid, err);
            updatedCache[uid] = '';
          }
        }
        setProfilesCache(updatedCache);
      }

      setAnnouncements(list);
    }, (error) => {
      console.error("[İlan Çekme Hatası] Veriler akıtılamadı:", error);
    });

    return () => unsubscribe();
  }, [profilesCache]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('[Oturum Yönetimi] Kullanıcı oturumu başarıyla kapatıldı.');
    } catch (err) {
      console.error('[Oturum Hatası] Oturum kapatılırken bir sorun oluştu:', err);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!formTitle.trim() || !formDesc.trim() || !formLocation.trim()) {
      Alert.alert("Eksik Bilgi", "Lütfen tüm ilan alanlarını doldurunuz.");
      return;
    }

    if (!currentUserId) return;

    setActionLoading(true);
    try {
      await addDoc(collection(db, "lost_announcements"), {
        ownerUid: currentUserId,
        title: formTitle.trim(),
        description: formDesc.trim(),
        lastSeenLocation: formLocation.trim(),
        createdAt: new Date().toISOString(),
        status: "active"
      });

      Alert.alert("Başarılı", "Kayıp ilanı sistem odası akışına başarıyla fırlatıldı.");
      setIsCreateModalVisible(false);
      setFormTitle('');
      setFormDesc('');
      setFormLocation('');
    } catch (err) {
      console.error("İlan eklenirken hata:", err);
      Alert.alert("Hata", "İlan sunucuya mühürlenemedi.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAnnouncement = (announcementId: string, ownerUid: string) => {
    if (currentUserId !== ownerUid) {
      Alert.alert("Yetkisiz İşlem", "Bu ilanı silmeye yetkiniz bulunmuyor.");
      return;
    }

    Alert.alert(
      "İlanı Kaldır",
      "Bu acil durum ilanını akıştan tamamen silmek istediğine emin misiniz?",
      [
        { text: "Vazgeç", style: "cancel" },
        { 
          text: "Sil", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "lost_announcements", announcementId));
              ToastAndroid.show("İlan başarıyla kaldırıldı.", ToastAndroid.SHORT);
            } catch (err) {
              console.error("İlan silinirken hata oluştu:", err);
              Alert.alert("Hata", "İlan veritabanından uçurulamadı.");
            }
          }
        }
      ]
    );
  };

  const handleStartFinderChat = async (targetUid: string) => {
    if (!currentUserId) {
      Alert.alert("Oturum Gerekli", "Sohbet başlatabilmek için oturum açmalısın.");
      return;
    }

    if (currentUserId === targetUid) {
      Alert.alert("Bilgi", "Kendi ilanınız için güvenli sohbet başlatamazsınız.");
      return;
    }

    setIsDetailModalVisible(false);
    navigation.navigate('ProfileScreen', { targetUid: targetUid });
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* 1. ÜST KISIM */}
      <View style={styles.headerContainer}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.welcomeText}>NFCTT Güvenlik Merkezi</Text>
          <Text style={styles.subText}>Akıllı etiketleriniz anlık olarak bulut sistemi üzerinden takip edilmektedir.</Text>
        </View>

        <TouchableOpacity style={styles.logoutTopButton} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={16} color="#000" style={{ marginRight: 6 }} />
          <Text style={styles.logoutText}>Çıkış</Text>
        </TouchableOpacity>
      </View>

      {/* 2. ORTA KISIM: CANLI İLAN AKIŞI */}
      <View style={styles.mainContent}>
        
        <View style={{ paddingHorizontal: 20, marginBottom: 15 }}>
          {activeAlert ? (
            <View style={[styles.statusCard, styles.alertCard]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons name="alert-circle" size={18} color="#c62828" style={{ marginRight: 6 }} />
                <Text style={styles.alertTitle}>ETİKETİNİZ OKUTULDU!</Text>
              </View>
              <Text style={styles.alertTime}>{activeAlert.time}</Text>
              <TouchableOpacity style={styles.actionButtonPrimary}>
                <Text style={styles.actionButtonText}>💬 Bulucuyla İletişime Geç</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.statusCard, styles.safeCard]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="shield-checkmark" size={16} color="#48484a" style={{ marginRight: 6 }} />
                <Text style={styles.safeTitle}>Sistem Aktif & Güvende</Text>
              </View>
              <Text style={styles.safeText}>Şu an bildirilen aktif bir acil durum kodunuz bulunmamaktadır.</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Canlı Acil Durum / Kayıp İlanları</Text>
          <TouchableOpacity style={styles.addAnnouncementBtn} onPress={() => setIsCreateModalVisible(true)}>
            <Ionicons name="add-circle" size={18} color="#2b231a" style={{ marginRight: 4 }} />
            <Text style={styles.addAnnouncementBtnText}>İlan Ver</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="alert-circle-outline" size={36} color="#beaf9f" />
              <Text style={styles.emptyText}>Şu an aktif bir kayıp ilanı akışı bulunmuyor.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const dependentAvatar = profilesCache[item.ownerUid];
            const isMyAnnouncement = currentUserId === item.ownerUid;

            return (
              <TouchableOpacity 
                style={styles.announcementCard}
                activeOpacity={0.8}
                onPress={() => { setSelectedAnnouncement(item); setIsDetailModalVisible(true); }}
              >
                <View style={styles.imageContainer}>
                  {dependentAvatar ? (
                    <Image source={{ uri: dependentAvatar }} style={styles.announcementImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="paw-outline" size={20} color="#beaf9f" />
                    </View>
                  )}
                </View>

                <View style={{ flex: 1, paddingRight: 4 }}>
                  <Text style={styles.announcementTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.announcementLoc} numberOfLines={1}>
                     {item.lastSeenLocation}
                  </Text>
                  <Text style={styles.announcementDesc} numberOfLines={2}>{item.description}</Text>
                </View>

                {/* SAĞ ALT PANEL */}
                {isMyAnnouncement && (
                  <View style={styles.rightActionPanel}>
                    {/* 👑 GÜNCELLEME: İKON RENGİ SİYAH (#000000) YAPILDI KANKA */}
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={(e) => { 
                        e.stopPropagation(); 
                        handleDeleteAnnouncement(item.id, item.ownerUid); 
                      }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#000000" />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* MODAL 1: OLUŞTURMA */}
      <Modal visible={isCreateModalVisible} transparent animationType="slide" onRequestClose={() => setIsCreateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Kayıp İlanı Yapılandırma</Text>
            
            <Text style={styles.inputLabel}>İlan Başlığı / Canlı Adı *</Text>
            <TextInput placeholder="Örn: Kayıp Golden Ares veya Yaşlı Veli İlanı" placeholderTextColor="#8e8e93" style={styles.input} value={formTitle} onChangeText={setFormTitle} />

            <Text style={styles.inputLabel}>Son Görülen / Tahmini Konum Bilgisi *</Text>
            <TextInput placeholder="Örn: Kayseri, Talas, Anayurt Parkı Civarı" placeholderTextColor="#8e8e93" style={styles.input} value={formLocation} onChangeText={setFormLocation} />

            <Text style={styles.inputLabel}>Eşkal / Kritik Sağlık Detayları *</Text>
            <TextInput placeholder="Üzerinde kırmızı tasma var, ilacını alması gerekiyor..." placeholderTextColor="#8e8e93" style={[styles.input, { height: 70 }]} multiline value={formDesc} onChangeText={setFormDesc} />

            {actionLoading ? (
              <ActivityIndicator size="small" color="#2b231a" style={{ marginTop: 15 }} />
            ) : (
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsCreateModalVisible(false)}>
                  <Text style={styles.modalCancelBtnText}>Kapat</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveBtn} onPress={handleCreateAnnouncement}>
                  <Text style={styles.modalSaveBtnText}>Akışa Gönder</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 2: DETAY */}
      <Modal visible={isDetailModalVisible} transparent animationType="fade" onRequestClose={() => setIsDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: '#ffffff', borderColor: '#beaf9f', borderWidth: 1 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={[styles.modalTitle, { color: '#000000', marginBottom: 0 }]}>ACİL DURUM İLANI</Text>
              <TouchableOpacity onPress={() => setIsDetailModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#8e8e93" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalImageContainer}>
              {profilesCache[selectedAnnouncement?.ownerUid] ? (
                <Image source={{ uri: profilesCache[selectedAnnouncement?.ownerUid] }} style={styles.modalDetailImage} />
              ) : (
                <View style={[styles.modalDetailImage, styles.imagePlaceholder, { width: '100%', height: 160 }]}>
                  <Ionicons name="paw-outline" size={40} color="#beaf9f" />
                </View>
              )}
            </View>

            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1c1c1e', marginBottom: 4 }}>{selectedAnnouncement?.title}</Text>
            <Text style={{ fontSize: 13, color: '#000000', fontWeight: '600', marginBottom: 12 }}>Son Görülen Yer: {selectedAnnouncement?.lastSeenLocation}</Text>
            
            <View style={styles.detailDescBox}>
              <Text style={{ fontSize: 14, color: '#48484a', lineHeight: 20, fontStyle: 'italic' }}>"{selectedAnnouncement?.description}"</Text>
            </View>

            <TouchableOpacity 
              style={styles.finderChatConnectBtn}
              onPress={() => handleStartFinderChat(selectedAnnouncement?.ownerUid)}
            >
              <Ionicons name="chatbubbles" size={20} color="#2b231a" style={{ marginRight: 8 }} />
              <Text style={styles.finderChatConnectBtnText}>Veli Profilini Gör & Sohbet Başlat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  welcomeText: { fontSize: 22, fontWeight: 'bold', color: '#222' },
  subText: { fontSize: 13, color: '#666', marginTop: 4, marginBottom: 10 },
  logoutTopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#beaf9f', 
    marginTop: 5,
  },
  logoutText: { 
    color: '#2b231a', 
    fontSize: 11, 
    fontWeight: '700',
    textTransform: 'uppercase', 
    letterSpacing: 0.5,
  },
  statusCard: { padding: 15, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  
  safeCard: { backgroundColor: '#f2f2f7', borderWidth: 0.5, borderColor: '#e5e5ea' },
  safeTitle: { fontSize: 14, fontWeight: '700', color: '#1c1c1e', letterSpacing: 0.2 },
  safeText: { fontSize: 13, color: '#48484a', marginTop: 4, lineHeight: 18 },
  
  alertCard: { backgroundColor: '#ffebee', borderWidth: 1, borderColor: '#ffcdd2' },
  alertTitle: { fontSize: 16, fontWeight: 'bold', color: '#c62828' },
  alertTime: { fontSize: 12, color: '#e53935', marginTop: 2, marginBottom: 15 },
  actionButtonPrimary: { backgroundColor: '#c62828', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  actionButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 15, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1c1c1e', letterSpacing: 0.2 },
  addAnnouncementBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#d1c7bd', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 0.5, borderColor: '#beaf9f' },
  addAnnouncementBtnText: { fontSize: 12, fontWeight: '700', color: '#2b231a' },
  
  announcementCard: { backgroundColor: '#ffffff', padding: 12, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderColor: '#e5e5ea', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  imageContainer: { marginRight: 12 },
  announcementImage: { width: 52, height: 52, borderRadius: 8, borderWidth: 0.5, borderColor: '#beaf9f' },
  imagePlaceholder: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#f2f2f7', justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: '#e5e5ea' },
  
  announcementTitle: { fontSize: 15, fontWeight: '700', color: '#1c1c1e' },
  announcementLoc: { fontSize: 12, color: '#ff9800', fontWeight: '600', marginTop: 1 },
  announcementDesc: { fontSize: 13, color: '#636366', marginTop: 2 },
  
  rightActionPanel: { height: 52, justifyContent: 'flex-end', alignItems: 'center', paddingLeft: 8 },
  detailButton: { backgroundColor: '#f2f2f7', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 0.5, borderColor: '#e5e5ea' },
  detailButtonText: { fontSize: 12, fontWeight: '700', color: '#1c1c1e' },
  
  deleteButton: { padding: 6, borderRadius: 8, backgroundColor: '#d1c7bd', borderWidth: 0.5, borderColor: '#beaf9f', alignItems: 'center', justifyContent: 'center' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 50, paddingHorizontal: 40 },
  emptyText: { fontSize: 13, color: '#8e8e93', textAlign: 'center', marginTop: 12, lineHeight: 18 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: 'white', padding: 22, borderRadius: 16, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#2b231a', marginBottom: 15 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#48484a', marginTop: 10, marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: '#f2f2f7', padding: 12, borderRadius: 8, marginBottom: 4, fontSize: 15, color: '#000' },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, gap: 10 },
  modalCancelBtn: { flex: 1, padding: 12, backgroundColor: '#f2f2f7', borderRadius: 8, alignItems: 'center' },
  modalCancelBtnText: { color: '#1c1c1e', fontWeight: '600' },
  modalSaveBtn: { flex: 1, padding: 12, backgroundColor: '#d1c7bd', borderWidth: 0.5, borderColor: '#beaf9f', borderRadius: 8, alignItems: 'center' },
  modalSaveBtnText: { color: '#2b231a', fontWeight: '700' },
  
  modalImageContainer: { alignItems: 'center', marginBottom: 15 },
  modalDetailImage: { width: '100%', height: 160, borderRadius: 12, borderWidth: 0.5, borderColor: '#beaf9f', resizeMode: 'cover' },
  
  detailDescBox: { backgroundColor: '#fcfbfa', padding: 14, borderRadius: 10, borderWidth: 0.5, borderColor: '#e5e5ea', marginBottom: 20 },
  finderChatConnectBtn: { flexDirection: 'row', backgroundColor: '#d1c7bd', borderWidth: 0.5, borderColor: '#beaf9f', padding: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  finderChatConnectBtnText: { color: '#2b231a', fontWeight: '700', fontSize: 14 }
});