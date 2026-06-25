import React, { useState, useEffect } from 'react'; 
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ScrollView, ActivityIndicator, Modal, TextInput, Image, useWindowDimensions 
} from 'react-native';
import { db, auth } from '../config/firebaseConfig'; 
import { collection, onSnapshot, addDoc, query, orderBy, doc, getDoc, deleteDoc } from 'firebase/firestore';

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [activeAlert, setActiveAlert] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [profilesCache, setProfilesCache] = useState<{ [key: string]: string }>({}); 
  
  // Modallar ve Yükleme Durumları
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State'leri
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formLocation, setFormLocation] = useState('');

  const currentUserId = auth.currentUser?.uid;

  // =========================================================================
  // 🛰️ REALTIME FIRESTORE STREAM ENGINE (CANLI İLAN AKIŞI)
  // =========================================================================
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
            console.log("Resim çekme hatası (Web):", uid, err);
            updatedCache[uid] = '';
          }
        }
        setProfilesCache(updatedCache);
      }

      setAnnouncements(list);
    }, (error) => {
      console.error("[İlan Akıtma Hatası Web]:", error);
    });

    return () => unsubscribe();
  }, [profilesCache]);

  // =========================================================================
  // 📝 İLAN OLUŞTURMA PROTOKOLÜ
  // =========================================================================
  const handleCreateAnnouncement = async () => {
    if (!formTitle.trim() || !formDesc.trim() || !formLocation.trim()) {
      alert("Lütfen tüm ilan alanlarını doldurunuz.");
      return;
    }

    if (!currentUserId) {
      alert("İlan vermek için sisteme giriş yapmış olmanız gerekir kral.");
      return;
    }

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

      alert("Başarılı! Kayıp ilanı ortak akış paneline başarıyla mühürlendi.");
      setIsCreateModalVisible(false);
      setFormTitle('');
      setFormDesc('');
      setFormLocation('');
    } catch (err) {
      console.error("Web ilan ekleme hatası:", err);
      alert("İlan sunucuya gönderilirken dahili bir hata oluştu.");
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================================
  // 🗑️ İLAN SİLME PROTOKOLÜ
  // =========================================================================
  const handleDeleteAnnouncement = async (announcementId: string, ownerUid: string) => {
    if (currentUserId !== ownerUid) {
      alert("Yetkisiz İşlem: Bu ilanı silmeye yetkiniz bulunmuyor.");
      return;
    }

    const confirmDelete = confirm("Bu acil durum ilanını akıştan tamamen kaldırmak istediğinize emin misiniz kanka?");
    if (confirmDelete) {
      try {
        await deleteDoc(doc(db, "lost_announcements", announcementId));
        alert("İlan başarıyla kaldırıldı.");
      } catch (err) {
        console.error("İlan silme hatası Web:", err);
        alert("İlan veritabanından temizlenirken bir hata oluştu.");
      }
    }
  };

  return (
    <View style={styles.container}>
      
      {/* 1. ÜST KISIM: BAŞLIK ALANI */}
      <View style={styles.headerContainer}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
          <View style={{ flex: 1, minWidth: 280 }}>
            <Text style={styles.welcomeText}>NFCTT Güvenlik Merkezi</Text>
            <Text style={styles.subText}>
              Akıllı etiketleriniz anlık olarak bulut sistemi üzerinden takip edilmektedir.
            </Text>
          </View>
          
          {currentUserId && (
            <TouchableOpacity style={styles.addAnnouncementBtn} onPress={() => setIsCreateModalVisible(true)}>
              <Ionicons name="add-circle" size={18} color="#2b231a" style={{ marginRight: 6 }} />
              <Text style={styles.addAnnouncementBtnText}>Yeni İlan Ver</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. ANA İÇERİK AKIŞI */}
      <ScrollView style={styles.mainContent} contentContainerStyle={[styles.scrollContent, { paddingHorizontal: isMobile ? 15 : 40 }]}>
        
        {/* DİNAMİK DURUM KARTI (OKUTMA BİLDİRİMİ) */}
        <View style={{ marginBottom: 25 }}>
          {activeAlert ? (
            <View style={[styles.statusCard, styles.alertCard, !isMobile && styles.desktopCardWidth]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name="alert-circle" size={20} color="#c62828" style={{ marginRight: 6 }} />
                <Text style={styles.alertTitle}>ETİKETİNİZ OKUTULDU!</Text>
              </View>
              <Text style={styles.alertTime}>{activeAlert.time}</Text>
              <TouchableOpacity style={styles.actionButtonPrimary}>
                <Text style={styles.actionButtonText}>💬 Bulucuyla İletişime Geç</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.statusCard, styles.safeCard, !isMobile && styles.desktopCardWidth]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="shield-checkmark" size={18} color="#2e7d32" style={{ marginRight: 6 }} />
                <Text style={styles.safeTitle}>Sistem Aktif & Güvende</Text>
              </View>
              <Text style={styles.safeText}>
                Şu an bildirilen aktif bir acil durum kodunuz bulunmamaktadır. Tüm etiketler koruma altında.
              </Text>
            </View>
          )}
        </View>

        {/* CANLI AKIŞ BAŞLIĞI */}
        <Text style={styles.sectionTitle}>Canlı Acil Durum / Kayıp İlanları Akışı</Text>

        {/* İLAN GRİD YAPISI */}
        <View style={[styles.announcementsGrid, { flexDirection: isMobile ? 'column' : 'row' }]}>
          {announcements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="alert-circle-outline" size={44} color="#beaf9f" />
              <Text style={styles.emptyText}>Şu an panoda aktif bir acil durum/kayıp ilanı bulunmuyor.</Text>
            </View>
          ) : (
            announcements.map((item) => {
              const dependentAvatar = profilesCache[item.ownerUid];
              const isMyAnnouncement = currentUserId === item.ownerUid;

              return (
                <TouchableOpacity 
                  key={item.id}
                  style={[styles.announcementCard, !isMobile && styles.desktopCardGridItem]}
                  activeOpacity={0.85}
                  onPress={() => { setSelectedAnnouncement(item); setIsDetailModalVisible(true); }}
                >
                  <View style={styles.imageContainer}>
  {dependentAvatar ? (
    <Image 
      source={{ uri: dependentAvatar }} 
      style={{
        width: 56,
        height: 56,
        borderRadius: 8,
        borderWidth: 0.5,
        borderColor: '#beaf9f'
      }} 
    />
  ) : (
    <View style={styles.imagePlaceholder}>
      <Ionicons name="paw-outline" size={22} color="#beaf9f" />
    </View>
  )}
</View>

                  <View style={{ flex: 1, paddingRight: 5 }}>
                    <Text style={styles.announcementTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.announcementLoc} numberOfLines={1}>📍 {item.lastSeenLocation}</Text>
                    <Text style={styles.announcementDesc} numberOfLines={2}>{item.description}</Text>
                  </View>

                  {isMyAnnouncement && (
                    <View style={styles.rightActionPanel}>
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
            })
          )}
        </View>
      </ScrollView>

      {/* =========================================================================
          🆕 MODAL 1: YENİ İLAN VERME MODALI (WEB UYUMLU)
         ========================================================================= */}
      <Modal visible={isCreateModalVisible} transparent animationType="fade" onRequestClose={() => setIsCreateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, !isMobile && { maxWidth: 500, width: '100%' }]}>
            <Text style={styles.modalTitle}>Kayıp İlanı Yapılandırma</Text>
            
            <Text style={styles.inputLabel}>İlan Başlığı / Canlı Adı *</Text>
            <TextInput placeholder="Örn: Kayıp Golden Ares İlanı" placeholderTextColor="#8e8e93" style={styles.input} value={formTitle} onChangeText={setFormTitle} />

            <Text style={styles.inputLabel}>Son Görülen / Tahmini Konum Bilgisi *</Text>
            <TextInput placeholder="Örn: Kayseri, Talas, Anayurt Civarı" placeholderTextColor="#8e8e93" style={styles.input} value={formLocation} onChangeText={setFormLocation} />

            <Text style={styles.inputLabel}>Eşkal / Kritik Sağlık Detayları *</Text>
            <TextInput placeholder="Üzerinde kırmızı tasma var, ilacını alması gerekiyor..." placeholderTextColor="#8e8e93" style={[styles.input, { height: 80 }]} multiline value={formDesc} onChangeText={setFormDesc} />

            {actionLoading ? (
              <ActivityIndicator size="small" color="#2b231a" style={{ marginTop: 15 }} />
            ) : (
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsCreateModalVisible(false)}>
                  <Text style={styles.modalCancelBtnText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveBtn} onPress={handleCreateAnnouncement}>
                  <Text style={styles.modalSaveBtnText}>Akışa Gönder</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          🆕 MODAL 2: İLAN DETAY MODALI (WEB UYUMLU)
         ========================================================================= */}
      <Modal visible={isDetailModalVisible} transparent animationType="fade" onRequestClose={() => setIsDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, !isMobile && { maxWidth: 550, width: '100%' }, { borderColor: '#beaf9f', borderWidth: 1 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={[styles.modalTitle, { color: '#000000', marginBottom: 0 }]}>ACİL DURUM DETAY PANELİ</Text>
              <TouchableOpacity onPress={() => setIsDetailModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#8e8e93" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalImageContainer}>
  {profilesCache[selectedAnnouncement?.ownerUid] ? (
    <Image 
      source={{ uri: profilesCache[selectedAnnouncement?.ownerUid] }} 
      style={{
        width: '100%',
        height: 180,
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: '#beaf9f'
      }} 
    />
  ) : (
    <View 
      style={[
        styles.imagePlaceholder, 
        { width: '100%', height: 180, borderRadius: 12, borderColor: '#beaf9f' }
      ]}
    >
      <Ionicons name="paw-outline" size={44} color="#beaf9f" />
    </View>
  )}
</View>

            <Text style={{ fontSize: 19, fontWeight: 'bold', color: '#1c1c1e', marginBottom: 4 }}>{selectedAnnouncement?.title}</Text>
            <Text style={{ fontSize: 14, color: '#ff9800', fontWeight: '700', marginBottom: 12 }}>📍 Son Görülen Yer: {selectedAnnouncement?.lastSeenLocation}</Text>
            
            <View style={styles.detailDescBox}>
              <Text style={{ fontSize: 14, color: '#48484a', lineHeight: 22, fontStyle: 'italic' }}>"{selectedAnnouncement?.description}"</Text>
            </View>

            <TouchableOpacity style={styles.finderChatConnectBtn} onPress={() => alert("Sohbet modülü veya profil yönlendirmesi tetiklendi kanka!")}>
              <Ionicons name="chatbubbles" size={20} color="#2b231a" style={{ marginRight: 8 }} />
              <Text style={styles.finderChatConnectBtnText}>Sistem Sahibiyle Güvenli İletişim Kur</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// =========================================================================
// 🎨 STYLES: WEB COMPLIANT UI DESIGN
// =========================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', width: '100%', height: '100%' },
  headerContainer: { paddingHorizontal: 40, paddingTop: 30, paddingBottom: 15, width: '100%' },
  mainContent: { flex: 1 },
  scrollContent: { paddingTop: 10, paddingBottom: 60 },
  welcomeText: { fontSize: 26, fontWeight: 'bold', color: '#222' },
  subText: { fontSize: 14, color: '#666', marginTop: 5 },
  
  addAnnouncementBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#d1c7bd', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 0.5, borderColor: '#beaf9f' },
  addAnnouncementBtnText: { fontSize: 13, fontWeight: '700', color: '#2b231a' },

  // Kartlar
  statusCard: { padding: 20, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  desktopCardWidth: { maxWidth: 600, alignSelf: 'flex-start', width: '100%' },
  safeCard: { backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#c8e6c9' },
  safeTitle: { fontSize: 17, fontWeight: 'bold', color: '#2e7d32' },
  safeText: { fontSize: 14, color: '#4caf50', marginTop: 6, lineHeight: 20 },
  
  alertCard: { backgroundColor: '#ffebee', borderWidth: 1, borderColor: '#ffcdd2' },
  alertTitle: { fontSize: 18, fontWeight: 'bold', color: '#c62828' },
  alertTime: { fontSize: 12, color: '#e53935', marginTop: 2, marginBottom: 12 },
  actionButtonPrimary: { backgroundColor: '#c62828', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  actionButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1c1c1e', letterSpacing: 0.2, marginBottom: 15 },
  
  // Grid Düzeni (Web için kritik yan yana dizilim katmanı)
  announcementsGrid: { flexWrap: 'wrap', gap: 15, width: '100%' },
  desktopCardGridItem: { width: '48%', minWidth: 350 }, // Ekran genişse yan yana ikili blok yapar kanka
  
  announcementCard: { flex: 1, backgroundColor: '#ffffff', padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderColor: '#e5e5ea', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  imageContainer: { marginRight: 15 },
  announcementImage: { width: 56, height: 56, borderRadius: 8, borderWidth: 0.5, borderColor: '#beaf9f' },
  imagePlaceholder: { 
    width: 56, 
    height: 56, 
    borderRadius: 8, 
    backgroundColor: '#f2f2f7', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 0.5, 
    borderColor: '#e5e5ea' 
  },
  announcementTitle: { fontSize: 16, fontWeight: '700', color: '#1c1c1e' },
  announcementLoc: { fontSize: 13, color: '#ff9800', fontWeight: '600', marginTop: 2 },
  announcementDesc: { fontSize: 13, color: '#636366', marginTop: 4, lineHeight: 18 },
  
  rightActionPanel: { height: '100%', justifyContent: 'center', alignItems: 'center', paddingLeft: 10 },
  deleteButton: { padding: 8, borderRadius: 8, backgroundColor: '#d1c7bd', borderWidth: 0.5, borderColor: '#beaf9f', alignItems: 'center', justifyContent: 'center' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', width: '100%', marginTop: 40, paddingVertical: 40 },
  emptyText: { fontSize: 14, color: '#8e8e93', marginTop: 12, textAlign: 'center' },
  
  // Modallar
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: 'white', padding: 25, borderRadius: 16, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  modalTitle: { fontSize: 19, fontWeight: '700', color: '#2b231a', marginBottom: 15 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#48484a', marginTop: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: { backgroundColor: '#f2f2f7', padding: 12, borderRadius: 8, marginBottom: 5, fontSize: 14, color: '#000', borderWidth: 0.5, borderColor: '#e5e5ea' },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 10 },
  modalCancelBtn: { flex: 1, padding: 12, backgroundColor: '#f2f2f7', borderRadius: 8, alignItems: 'center' },
  modalCancelBtnText: { color: '#1c1c1e', fontWeight: '600' },
  modalSaveBtn: { flex: 1, padding: 12, backgroundColor: '#d1c7bd', borderWidth: 0.5, borderColor: '#beaf9f', borderRadius: 8, alignItems: 'center' },
  modalSaveBtnText: { color: '#2b231a', fontWeight: '700' },
  
  modalImageContainer: { alignItems: 'center', marginBottom: 15, width: '100%' },
  modalDetailImage: { 
    width: '100%', 
    height: 180, 
    borderRadius: 12, 
    borderWidth: 0.5, 
    borderColor: '#beaf9f', 
    // resizeMode: 'cover'  <-- Eğer hata devam ederse bunu buradan kaldırıp doğrudan Image bileşenine prop olarak vereceğiz kanka
  },
  detailDescBox: { backgroundColor: '#fcfbfa', padding: 15, borderRadius: 10, borderWidth: 0.5, borderColor: '#e5e5ea', marginBottom: 20 },
  finderChatConnectBtn: { flexDirection: 'row', backgroundColor: '#d1c7bd', borderWidth: 0.5, borderColor: '#beaf9f', padding: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', width: '100%' },
  finderChatConnectBtnText: { color: '#2b231a', fontWeight: '700', fontSize: 14 }
});