import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, Image, Platform, useWindowDimensions 
} from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { collection, query, where, doc, getDoc, onSnapshot, updateDoc, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

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
// 🖥️ WEB UYUMLU SATIR BİLEŞENİ (SWIPEABLE YERİNE SABİT AKSİYONLU)
// =========================================================================
function WebChatItem({ item, onDelete, onPress }: { item: ChatSession, onDelete: () => void, onPress: () => void }) {
  
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
    <View style={styles.chatRow}>
      <TouchableOpacity 
        style={styles.chatRowTouch} 
        activeOpacity={0.7}
        onPress={onPress}
      >
        {/* Profil Resmi / Avatar */}
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

        {/* Mesaj Detayları */}
        <View style={styles.chatInfo}>
          <View style={styles.chatHeaderRow}>
            <Text style={styles.userName} numberOfLines={1}>{item.otherUserName}</Text>
            <Text style={styles.chatTime}>{formatChatTime(item.timestamp)}</Text>
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
        </View>
      </TouchableOpacity>

      {/* 🗑️ Web Tarafında Silme Butonu: Kaydırma yerine sağda sabit ikon olarak duruyor kanka */}
    {!item.isSystemMessage && (
        <TouchableOpacity 
            style={styles.webDeleteButton} 
            onPress={onDelete} 
            accessibilityLabel="Sohbeti Sil"
            >
                <Ionicons name="trash-outline" size={18} color="#e53935" />
        </TouchableOpacity>
    )}
    </View>
  );
}

// =========================================================================
// 💬 ANA CHATLIST COMPONENT (WEB VERSİYON)
// =========================================================================
export default function WebChatList({ onSelectChat }: { onSelectChat: (roomId: string, targetUid: string, title: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const chatsQuery = query(
      collection(db, "chat_rooms"),
      where("visibleTo", "array-contains", currentUser.uid)
    );

    const unsubscribeChats = onSnapshot(chatsQuery, async (snapshot) => {
      try {
        const chatPromises = snapshot.docs.map(async (docSnap) => {
          const chatData = docSnap.data();
          const participants = chatData.participants || [];
          const otherUserUid = participants.find((uid: string) => uid !== currentUser.uid) || 'system';
          
          let otherUserName = "Kullanıcı";
          let otherUserAvatar: string | null = null;

          if (otherUserUid !== 'system') {
            try {
              const profileRef = doc(db, "profiles", otherUserUid);
              const profileSnap = await getDoc(profileRef);
              
              if (profileSnap.exists()) {
                const pData = profileSnap.data();
                const nameFromTop = pData?.name;
                const nameFromParent = pData?.parent?.name || pData?.dependent?.name;
                const nameFromFinalData = pData?.finalData?.parent?.name || pData?.finalData?.dependent?.name || pData?.finalData?.name;
                
                otherUserName = nameFromTop || nameFromParent || nameFromFinalData || "NFCTT Kullanıcısı";
                
                otherUserAvatar = 
                  pData?.photoUrl || pData?.avatarUrl ||
                  pData?.parent?.photoUrl || pData?.parent?.avatarUrl ||
                  pData?.finalData?.parent?.photoUrl || pData?.finalData?.avatarUrl || 
                  null;
              }
            } catch (err) {
              console.error("[ChatList Engine] Profil çözme hatası:", err);
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

        resolvedChats.push(systemMessageItem);

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
      console.error("[ChatList Sync Error]:", error);
      setLoading(false);
    });

    return unsubscribeChats;
  }, []);

  // 🗑️ WEB UYUMLU MASKELEME MOTORU (confirm() entegrasyonlu)
  const handleDeleteChat = (roomId: string) => {
    if (roomId === 'system_welcome') {
      alert("Sistem bildirim odasını güvenliğiniz gereği listeden silemezsiniz.");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Web uyumlu tarayıcı onayı kanka
    const confirmDelete = confirm("Bu sohbeti listenizden kaldırmak istediğinize emin misiniz?");
    if (!confirmDelete) return;

    try {
      setLoading(true);
      const chatRoomRef = doc(db, "chat_rooms", roomId);
      updateDoc(chatRoomRef, {
        visibleTo: arrayRemove(currentUser.uid),
        [`clearedAt.${currentUser.uid}`]: serverTimestamp()
      });
      console.log(`[Chat Engine] Oda başarıyla görünümden kaldırıldı: ${roomId}`);
    } catch (err) {
      console.error("[Mask Room Failure]:", err);
      alert("Sohbet odası kaldırılırken bir kesinti oluştu.");
    } finally {
      setLoading(false);
    }
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
          contentContainerStyle={[styles.listContainer, { paddingBottom: isMobile ? 80 : 20 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <WebChatItem 
              item={item} 
              onDelete={() => handleDeleteChat(item.id)}
              onPress={() => onSelectChat(item.id, item.targetUid, item.otherUserName)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { 
    paddingTop: 20, 
    paddingHorizontal: 20, 
    paddingBottom: 15, 
    borderBottomWidth: 0.5, 
    borderColor: '#e5e5ea',
    backgroundColor: '#ffffff'
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1c1c1e', letterSpacing: -0.5 },
  listContainer: { paddingTop: 5 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  chatRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    borderBottomWidth: 0.5, 
    borderColor: '#e5e5ea',
    backgroundColor: '#ffffff',
    paddingRight: 15
  },
  chatRowTouch: { 
    flex: 1,
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 14, 
  },
  
  avatarContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f2f2f7', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#efeff4' },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  systemAvatar: { backgroundColor: '#fdfbf7', borderColor: '#ffeef0' },
  
  chatInfo: { flex: 1, marginLeft: 14 },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  userName: { fontSize: 15, fontWeight: '700', color: '#1c1c1e', maxWidth: '75%' },
  
  chatTime: { fontSize: 11, color: '#beaf9f', fontWeight: '600', marginRight: 10 },
  lastMessage: { fontSize: 13, color: '#8e8e93', fontWeight: '500', marginTop: 2, maxWidth: '90%' },
  avatarPlaceholderText: { fontSize: 16, fontWeight: '700', color: '#beaf9f' },
  
  webDeleteButton: {
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  }
});