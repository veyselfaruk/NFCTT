import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, Image, Platform 
} from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import BottomBar from '../components/BottomBar';
import { Ionicons } from '@expo/vector-icons';

// Sohbet listesi eleman yapısı
interface ChatSession {
  id: string;
  otherUserUid: string;
  otherUserName: string;
  lastMessage: string;
  timestamp: any;
  isSystemMessage?: boolean;
}

export default function ChatList({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatSession[]>([]);

  // KANKA: Ubeyde canlı test yönlendirme fonksiyonu tertemiz burada
  const handleUbeydeTest = () => {
    navigation.navigate('ChatScreen', { 
      chatId: 'canli_test_odasi', 
      title: 'Ubeyde (Canlı Test)' 
    });
  };
  
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // KANKA: Aktif kullanıcının dahil olduğu sohbet odalarını dinliyoruz
    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUser.uid)
    );

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      const fetchedChats: ChatSession[] = [];

      for (const docSnap of snapshot.docs) {
        const chatData = docSnap.data();
        const participants = chatData.participants || [];
        // Bizim dışımızdaki diğer kullanıcının UID'sini buluyoruz
        const otherUserUid = participants.find((uid: string) => uid !== currentUser.uid) || 'system';
        
        let otherUserName = "Misafir Oturumu";
        let isSystem = chatData.isSystem || false;

        if (isSystem) {
          otherUserName = "NFCTT Sistem Merkezi";
        } else if (otherUserUid !== 'system') {
          // KANKA: UID'yi isme dönüştürmek için profiles koleksiyonuna asılıyoruz
          try {
            const userQuery = query(collection(db, "profiles"), where("uid", "==", otherUserUid));
            const userSnap = await getDocs(userQuery);
            if (!userSnap.empty) {
              const profileData = userSnap.docs[0].data();
              // finalData zırhını kontrol ederek ismi çözüyoruz
              otherUserName = profileData.finalData?.parent?.name || profileData.parent?.name || "Kullanıcı";
            }
          } catch (err) {
            console.error("Kullanıcı adı çözülürken hata çıktı kanka:", err);
          }
        }

        fetchedChats.push({
          id: docSnap.id,
          otherUserUid,
          otherUserName,
          lastMessage: chatData.lastMessage || "Dosya veya içerik...",
          timestamp: chatData.updatedAt || null,
          isSystemMessage: isSystem
        });
      }

      // Şimdilik statik bir Sistem Mesajı da ekleyelim ki liste boş kalmasın kanka
      if (fetchedChats.length === 0) {
        fetchedChats.push({
          id: "system_welcome",
          otherUserUid: "system",
          otherUserName: "NFCTT Sistem Merkezi",
          lastMessage: "Akıllı etiket sisteminiz aktif duruma getirilmiştir biladerim.",
          timestamp: new Date(),
          isSystemMessage: true
        });
      }

      setChats(fetchedChats);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // === ZAMAN FORMATLAMA MOTORU KANKA ===
  const formatChatTime = (timestamp: any) => {
    if (!timestamp) return '16:09';
    try {
      // Eğer Firebase serverTimestamp yüklendiyse toDate() fonksiyonu çalışır kanka
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '16:09';
    }
  };

  // Liste satır tasarımı (Render Item)
  const renderChatItem = ({ item }: { item: ChatSession }) => (
    <TouchableOpacity 
      style={styles.chatRow}
      onPress={() => {
        // KANKA: Tıklanan odanın ID bilgisini ve karşı kullanıcının ismini şak diye odaya fırlatıyoruz!
        navigation.navigate('ChatScreen', { 
          chatId: item.id, 
          title: item.otherUserName 
        });
      }}
    >
      {/* Profil İkon Katmanı */}
      <View style={[styles.avatarContainer, item.isSystemMessage && styles.systemAvatar]}>
        <Ionicons 
          name={item.isSystemMessage ? "shield-checkmark" : "person"} 
          size={24} 
          color={item.isSystemMessage ? "#34c759" : "#666"} 
        />
      </View>

      {/* Mesaj İçerik Katmanı */}
      <View style={styles.chatInfo}>
        <View style={styles.chatHeaderRow}>
          <Text style={styles.userName} numberOfLines={1}>{item.otherUserName}</Text>
          {/* KANKA: Dinamik zaman damgasını buraya mühürledik */}
          <Text style={styles.chatTime}>{formatChatTime(item.timestamp)}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color="#c7c7cc" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Üst Header Alanı */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💬 Mesajlar</Text>
      </View>

      {/* KANKA: UBEYDE CANLI TEST SİNYAL BUTONU TAM BURADA */}
      <TouchableOpacity style={styles.testButton} onPress={handleUbeydeTest}>
        <Text style={styles.testButtonText}>🚀 UBEYDE İLE CANLI TEST SİNYALİ</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#000000" />
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={renderChatItem}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Ortak alt barımız */}
      <BottomBar navigation={navigation} activeScreen="Chat" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingHorizontal: 20, 
    paddingBottom: 15, 
    borderBottomWidth: 0.5, 
    borderColor: '#e5e5ea',
    backgroundColor: '#ffffff'
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#000000', letterSpacing: -0.5 },
  listContainer: { paddingBottom: 100 },
  chatRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    borderBottomWidth: 0.5, 
    borderColor: '#f2f2f7' 
  },
  avatarContainer: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#f2f2f7', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  systemAvatar: { backgroundColor: '#e8f5e9' },
  chatInfo: { flex: 1, marginLeft: 15, marginRight: 10 },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  userName: { fontSize: 16, fontWeight: '600', color: '#000000' },
  chatTime: { fontSize: 12, color: '#8e8e93' },
  lastMessage: { fontSize: 14, color: '#8e8e93' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // KANKA: Minimalist premium siyah buton stilleri buraya mühürlendi
  testButton: {
    backgroundColor: '#000000',
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 5,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5
  }
});