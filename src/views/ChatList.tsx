import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, Image, Platform, Animated, PanResponder, Dimensions, Alert 
} from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { collection, query, where, doc, getDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
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
  isSystemMessage?: boolean;
}

// =========================================================================
// 🛡️ KAYDIRILABİLİR SATIR BİLEŞENİ (SAFE SWIPEABLE ROW MOTORU)
// =========================================================================
function SwipeableChatItem({ item, onDelete, onPress }: { item: ChatSession, onDelete: () => void, onPress: () => void }) {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 🛡️ EMNİYET KİLİDİ: Sistem mesaj odası ise kaydırma hareketini tamamen bloke et kanka
        if (item.isSystemMessage) return false;
        // Sadece yatayda belirgin bir kaydırma varsa hareketi yakala
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

  // === 📅 KURUMSAL ZAMAN FORMATLAMA MOTORU ===
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
      {/* 🚨 ARKA PLAN: SİLME BUTONU KATMANI (Sadece normal sohbetlerde gözükür) */}
      {!item.isSystemMessage && (
        <View style={styles.deleteBackground}>
          <TouchableOpacity style={styles.deleteIconButton} onPress={onDelete}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.deleteButtonText}>Sil</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 🔔 ÖN PLAN: HAREKETLİ SOHBET SATIRI */}
      <Animated.View 
        style={[styles.chatRow, { transform: [{ translateX: item.isSystemMessage ? 0 : translateX }] }]} 
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          style={styles.chatRowTouch} 
          activeOpacity={1}
          onPress={onPress}
        >
          {/* Profil Avatar Alanı */}
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

          {/* Mesaj İçerik Detayları */}
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

    // 📡 KANKA: Kalıcı 'chat_rooms' koleksiyonunda kullanıcının dahil olduğu odaları dinliyoruz
    const chatsQuery = query(
      collection(db, "chat_rooms"),
      where("participants", "array-contains", currentUser.uid)
    );

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      // 🎯 PROMISE.ALL İLE ATOMİK VERİ ÇÖZÜMLEME MOTORU
      const chatPromises = snapshot.docs.map(async (docSnap) => {
        const chatData = docSnap.data();
        const participants = chatData.participants || [];
        
        const otherUserUid = participants.find((uid: string) => uid !== currentUser.uid) || 'system';
        
        let otherUserName = "Kullanıcı";
        let otherUserAvatar: string | null = null;
        let isSystem = docSnap.id === 'system_welcome';

        if (isSystem) {
          otherUserName = "NFCTT Sistem Merkezi";
        } else if (otherUserUid !== 'system') {
          try {
            const profileRef = doc(db, "profiles", otherUserUid);
            const profileSnap = await getDoc(profileRef);
            
            if (profileSnap.exists()) {
              const pData = profileSnap.data();
              const actualData = pData.finalData ? pData.finalData : pData;
              
              otherUserName = actualData?.dependent?.name || actualData?.parent?.name || "Kullanıcı";
              
              // 🔍 1. GÜNCELLEME: Ubeyde'nin profil resmini getiren o derin şema tarayıcı motoru mühürlendi kanka!
              otherUserAvatar = 
                actualData?.parent?.photoUrl || 
                actualData?.parent?.avatarUrl || 
                actualData?.avatarUrl || 
                actualData?.photoUrl || 
                pData?.parent?.photoUrl || 
                pData?.avatarUrl || 
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
          isSystemMessage: isSystem
        };
      });

      try {
        const resolvedChats = await Promise.all(chatPromises);

        // 🎯 2. GÜNCELLEME: Sistem bildirim odası artık başka odalar gelse bile ASLA yok olmayacak!
        const hasSystemWelcome = resolvedChats.some(c => c.id === 'system_welcome');
        
        if (!hasSystemWelcome) {
          resolvedChats.push({
            id: "system_welcome",
            targetUid: "system",
            otherUserName: "NFCTT Sistem Merkezi",
            otherUserAvatar: null,
            lastMessage: "Akıllı koruma etiket sisteminiz aktif duruma getirilmiştir.",
            timestamp: new Date(),
            isSystemMessage: true
          });
        }

        // Kronolojik Sıralama (Sistem odasını her daim zirveye çiviliyoruz kanka)
        resolvedChats.sort((a, b) => {
          if (a.id === 'system_welcome') return -1;
          if (b.id === 'system_welcome') return 1;
          const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
          const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
          return timeB - timeA;
        });

        setChats(resolvedChats);
      } catch (err) {
        console.error("[ChatList Promise All Error]:", err);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error("[ChatList Sync Error] Odalar dinlenirken hata oluştu:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // =========================================================================
  // 🗑️ FIRESTORE KALICI ODA SİLME FONKSİYONU
  // =========================================================================
  const handleDeleteChat = (roomId: string) => {
    if (roomId === 'system_welcome') {
      Alert.alert("Erişim Engellendi", "Sistem bildirim odasını güvenliğiniz gereği listeden silemezsiniz.");
      return;
    }

    Alert.alert(
      "Sohbeti Sil",
      "Bu sohbet odasını ve tüm mesaj geçmişini kalıcı olarak silmek istediğinize emin misiniz?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sohbeti Temizle",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await deleteDoc(doc(db, "chat_rooms", roomId));
              console.log(`[Chat Engine] Oda başarıyla veri tabanından silindi: ${roomId}`);
            } catch (err) {
              console.error("[Delete Room Failure] Oda silinirken hata çıktı:", err);
              Alert.alert("Sistem Hatası", "Sohbet odası buluttan temizlenirken bir kesinti oluştu.");
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
      {/* Üst Header Katmanı */}
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

  // 🛡️ SWIPEABLE ROW DESIGN SYSTEM STYLES (SAMAN GRİSİ VE ANTRASİT UYUMU)
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