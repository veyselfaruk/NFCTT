import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, Image, Platform, Animated, PanResponder, Dimensions, Alert 
} from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { collection, query, where, doc, getDoc, onSnapshot, updateDoc, arrayRemove, serverTimestamp } from 'firebase/firestore';
import BottomBar from '../components/BottomBar';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface ChatSession {
  id: string;
  targetUid: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  lastMessage: string;
  timestamp: any;
  isSystemMessage: boolean;
}

// =========================================================================
// 🛡️ KAYDIRILABİLİR SATIR BİLEŞENİ (SAFE SWIPEABLE ROW MOTORU)
// =========================================================================
function SwipeableChatItem({ item, onDelete, onPress }: { item: ChatSession, onDelete: () => void, onPress: () => void }) {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (item.isSystemMessage) return false;
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -90));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          Animated.timing(translateX, {
            toValue: -90,
            duration: 150,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            friction: 5,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const formatChatTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <View style={styles.rowContainer}>
      {!item.isSystemMessage && (
        <View style={styles.deleteBackground}>
          <TouchableOpacity style={styles.deleteIconButton} onPress={onDelete}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.deleteButtonText}>Sil</Text>
          </TouchableOpacity>
        </View>
      )}

      <Animated.View 
        style={[styles.chatRow, { transform: [{ translateX: item.isSystemMessage ? 0 : translateX }] }]} 
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          style={styles.chatRowTouch} 
          activeOpacity={1}
          onPress={onPress}
        >
          <View style={[styles.avatarContainer, item.isSystemMessage && styles.systemAvatar]}>
            {item.isSystemMessage ? (
              <Ionicons name="shield-checkmark" size={22} color="#beaf9f" />
            ) : item.otherUserAvatar ? (
              <Image source={{ uri: item.otherUserAvatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarPlaceholderText}>
                {item.otherUserName ? item.otherUserName[0].toUpperCase() : '👤'}
              </Text>
            )}
          </View>

          <View style={styles.chatInfo}>
            <View style={styles.chatHeaderRow}>
              <Text style={styles.userName} numberOfLines={1}>{item.otherUserName}</Text>
              <Text style={styles.chatTime}>{formatChatTime(item.timestamp)}</Text>
            </View>
            <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
          </View>

          <Ionicons name="chevron-forward" size={16} color="#c7c7cc" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// =========================================================================
// 💬 ANA CHATLIST COMPONENT
// =========================================================================
export default function ChatList({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatSession[]>([]);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // 📡 REÇETE A: Kullanıcının dahil olduğu tüm aktif ve görünür ikili sohbet odaları
    const chatsQuery = query(
      collection(db, "chat_rooms"),
      where("visibleTo", "array-contains", currentUser.uid)
    );

    // Canlı senkronizasyon motoru tetikleniyor reis
    const unsubscribeChats = onSnapshot(chatsQuery, async (snapshot) => {
      try {
        const chatPromises = snapshot.docs.map(async (docSnap) => {
          const chatData = docSnap.data();
          const participants = chatData.participants || [];
          
          // Karşı tarafın UID'sini çözümlüyoruz kanka
          const otherUserUid = participants.find((uid: string) => uid !== currentUser.uid) || 'system';
          
          let otherUserName = "Kullanıcı";
          let otherUserAvatar: string | null = null;

          // 👥 GÜNCELLEME: Karşı taraf gerçek bir kullanıcıysa, ismini tüm ihtimalleri tarayarak çözüyoruz kanka
          if (otherUserUid !== 'system') {
            try {
              const profileRef = doc(db, "profiles", otherUserUid);
              const profileSnap = await getDoc(profileRef);
              
              if (profileSnap.exists()) {
                const pData = profileSnap.data();
                
                // 🔍 AKILLI VERİ AYIKLAMA KATMANI (Her İhtimale Karşı Derin Tarama)
                // Firestore dökümanının en üstünde name olabilir, parent/dependent içinde olabilir ya da finalData'da olabilir.
                const nameFromTop = pData?.name;
                const nameFromParent = pData?.parent?.name || pData?.dependent?.name;
                const nameFromFinalData = pData?.finalData?.parent?.name || pData?.finalData?.dependent?.name || pData?.finalData?.name;
                
                // Bulduğumuz ilk dolu isim değerini kurumsal nizamda set ediyoruz reis
                otherUserName = nameFromTop || nameFromParent || nameFromFinalData || "NFCTT Kullanıcısı";
                
                // Aynı derin taramayı avatar/fotoğraf için de yapıyoruz kanka
                otherUserAvatar = 
                  pData?.photoUrl || pData?.avatarUrl ||
                  pData?.parent?.photoUrl || pData?.parent?.avatarUrl ||
                  pData?.finalData?.parent?.photoUrl || pData?.finalData?.avatarUrl || 
                  null;
              }
            } catch (err) {
              console.error("[ChatList Engine] Profil verisi çözümlenirken hata oluştu:", err);
            }
          }

          return {
            id: docSnap.id,
            targetUid: otherUserUid,
            otherUserName,
            otherUserAvatar,
            lastMessage: chatData.lastMessage || "Güvenli sohbet kanalı.",
            timestamp: chatData.updatedAt || null,
            isSystemMessage: false
          };
        });

        const resolvedChats = await Promise.all(chatPromises);

        // 📢 REÇETE B: Firestore üzerindeki "system_notifications/broadcast" dökümanını canlı dinliyoruz kanka!
        // Sen Brevo'dan mailleri basınca, arka planda buradaki tek dökümanı güncelleyeceksin, zınk diye herkesin ekranına düşecek.
        const systemNotifRef = doc(db, "system_notifications", "broadcast");
        const systemSnap = await getDoc(systemNotifRef);
        
        let systemMessageItem: ChatSession = {
          id: "system_welcome",
          targetUid: "system",
          otherUserName: "NFCTT Sistem Merkezi",
          otherUserAvatar: null,
          lastMessage: "Akıllı koruma etiket sisteminiz aktif duruma getirilmiştir.",
          timestamp: new Date(),
          isSystemMessage: true
        };

        if (systemSnap.exists()) {
          const sysData = systemSnap.data();
          systemMessageItem = {
            id: "system_welcome",
            targetUid: "system",
            otherUserName: "NFCTT Sistem Merkezi",
            otherUserAvatar: null,
            lastMessage: sysData.lastMessage || "Yeni bir kurumsal güncelleme yayınlandı.",
            timestamp: sysData.updatedAt || new Date(),
            isSystemMessage: true
          };
        }

        // Sistem odasını listenin en başına enjekte ediyoruz reis
        resolvedChats.push(systemMessageItem);

        // Kronolojik sıralama motoru (Sistem odası her zaman en üstte sabit kalır kanka)
        resolvedChats.sort((a, b) => {
          if (a.id === 'system_welcome') return -1;
          if (b.id === 'system_welcome') return 1;
          
          const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
          const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
          return timeB - timeA;
        });

        setChats(resolvedChats);
      } catch (err) {
        console.error("[ChatList Main Process Error]:", err);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error("[ChatList Sync Error] Odalar dinlenirken hata oluştu:", error);
      setLoading(false);
    });

    return unsubscribeChats;
  }, []);

  // =========================================================================
  // 🗑️ BİREYSEL ODA MASKELEME MOTORU (LOCAL REMOVE)
  // =========================================================================
  const handleDeleteChat = (roomId: string) => {
    if (roomId === 'system_welcome') {
      Alert.alert("Erişim Engellendi", "Sistem bildirim odasını güvenliğiniz gereği listeden silemezsiniz.");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    Alert.alert(
      "Sohbeti Sil",
      "Bu sohbeti listenizden kaldırmak istediğinize emin misiniz? (Karşı tarafın mesaj geçmişi etkilenmeyecektir)",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sohbeti Temizle",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const chatRoomRef = doc(db, "chat_rooms", roomId);
              await updateDoc(chatRoomRef, {
                visibleTo: arrayRemove(currentUser.uid),
                [`clearedAt.${currentUser.uid}`]: serverTimestamp()
              });
              console.log(`[Chat Engine] Oda başarıyla kullanıcının görünümünden maskelendi: ${roomId}`);
            } catch (err) {
              console.error("[Mask Room Failure] Oda maskelenirken hata çıktı:", err);
              Alert.alert("Sistem Hatası", "Sohbet odası görünümden kaldırılırken bir kesinti oluştu.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mesajlar</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#beaf9f" />
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <SwipeableChatItem 
              item={item} 
              onDelete={() => handleDeleteChat(item.id)}
              onPress={() => {
                navigation.navigate('ChatScreen', { 
                  roomId: item.id, 
                  targetUid: item.targetUid,
                  title: item.otherUserName 
                });
              }}
            />
          )}
        />
      )}

      <BottomBar navigation={navigation} activeScreen="Chat" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { 
    paddingTop: Platform.OS === 'ios' ? 60 : 45, 
    paddingHorizontal: 20, 
    paddingBottom: 15, 
    borderBottomWidth: 0.5, 
    borderColor: '#e5e5ea',
    backgroundColor: '#ffffff'
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1c1c1e', letterSpacing: -0.5 },
  listContainer: { paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  rowContainer: { position: 'relative', width: '100%', backgroundColor: '#55555f' },
  deleteBackground: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 90, backgroundColor: '#55555f', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  deleteIconButton: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  deleteButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '700', marginTop: 2, letterSpacing: 0.5 },
  
  chatRow: { width: '100%', backgroundColor: '#ffffff', zIndex: 2 },
  chatRowTouch: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, borderColor: '#e5e5ea' },
  
  avatarContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f2f2f7', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#efeff4' },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  systemAvatar: { backgroundColor: '#fdfbf7', borderColor: '#ffeef0' },
  
  chatInfo: { flex: 1, marginLeft: 14, marginRight: 10 },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  userName: { fontSize: 15, fontWeight: '700', color: '#1c1c1e' },
  
  chatTime: { fontSize: 11, color: '#beaf9f', fontWeight: '600' },
  lastMessage: { fontSize: 13, color: '#8e8e93', fontWeight: '500', marginTop: 2 },

  avatarPlaceholderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#beaf9f'
  }
});