import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, 
  Platform, ActivityIndicator, ImageBackground, Image, useWindowDimensions, Linking 
} from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import WebChatList from './WebChatListView';

const parchmentBg = require('../../assets/parchment_bg.png');

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
  type?: 'text' | 'location';
  latitude?: number;
  longitude?: number;
}

// =========================================================================
// 🖥️ WEB UYUMLU MESAJ SATIRI (KAYDIRMA YERİNE ÜZERİNE GELİNCE SİLME AKSİYONLU)
// =========================================================================
function WebMessageRow({ 
  item, 
  isMyMessage, 
  targetAvatar, 
  targetInitials, 
  onDelete, 
  renderMessageContent 
}: { 
  item: Message; 
  isMyMessage: boolean; 
  targetAvatar: string | null; 
  targetInitials: string; 
  onDelete: () => void; 
  renderMessageContent: () => React.ReactNode; 
}) {
  return (
    <View style={[styles.messageWrapper, isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
      <View style={styles.messageRowHorizontal}>
        {!isMyMessage && (
          <View style={styles.chatAvatarContainer}>
            {targetAvatar ? (
              <Image source={{ uri: targetAvatar }} style={styles.chatAvatarImage} />
            ) : (
              <View style={styles.chatAvatarPlaceholder}>
                <Text style={styles.chatAvatarPlaceholderText}>{targetInitials}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.mainBubbleAnimatedContent}>
          {renderMessageContent()}
        </View>

        {/* 🗑️ Web Tarafında Bireysel Mesaj Silme İkonu (Sabit ve Şık) */}
        {item.id !== 'welcome_static' && item.id !== 'system_broadcast' && (
          <TouchableOpacity 
            style={[styles.webMsgDeleteBtn, isMyMessage ? { marginRight: 8 } : { marginLeft: 8 }]} 
            onPress={onDelete}
            accessibilityLabel="Mesajı Sil"
          >
            <Ionicons name="trash-outline" size={14} color="#beaf9f" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// =========================================================================
// 💬 DETAYLI MESAJLAŞMA PENCERESİ (WEB CHAT SCREEN)
// =========================================================================
function WebChatScreen({ roomId, targetUid, title, onBack }: { roomId: string, targetUid: string, title: string, onBack?: () => void }) {
  const activeRoomId = roomId || 'system_welcome';
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [dynamicTitle, setDynamicTitle] = useState(title || 'Güvenli İletişim Kanalı');
  
  const [targetAvatar, setTargetAvatar] = useState<string | null>(null);
  const [targetInitials, setTargetInitials] = useState('👤');
  const [deletedMessageIds, setDeletedMessageIds] = useState<string[]>([]);
  
  const flatListRef = useRef<FlatList>(null);
  const currentUser = auth.currentUser;
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  useEffect(() => {
    const fetchTargetProfile = async () => {
      if (!targetUid || targetUid === 'system') return;
      try {
        const profileSnap = await getDoc(doc(db, "profiles", targetUid));
        if (profileSnap.exists()) {
          const pData = profileSnap.data();
          const actualData = pData.finalData ? pData.finalData : pData;
          
          const computedName = actualData?.parent?.name || actualData?.dependent?.name || "Kullanıcı";
          
          if (actualData?.dependent?.name) {
            setDynamicTitle(`${actualData.dependent.name} - Güvence Hattı`);
          } else if (actualData?.parent?.name) {
            setDynamicTitle(actualData.parent.name);
          }

          if (computedName) {
            setTargetInitials(computedName[0].toUpperCase());
          }

          const resolvedAvatar = 
            actualData?.parent?.photoUrl || 
            actualData?.parent?.avatarUrl || 
            actualData?.avatarUrl || 
            actualData?.photoUrl || 
            pData?.parent?.photoUrl || 
            pData?.avatarUrl || 
            null;

          setTargetAvatar(resolvedAvatar);
        }
      } catch (err) {
        console.error("[Header Fetch Error] Bilgi çekilemedi:", err);
      }
    };

    fetchTargetProfile();
  }, [targetUid, roomId]);

  useEffect(() => {
    if (!activeRoomId || !currentUser) return;

    if (activeRoomId === 'system_welcome') {
      const systemBroadcastRef = doc(db, "system_notifications", "broadcast");
      const unsubscribeSystem = onSnapshot(systemBroadcastRef, (docSnap) => {
        const fetchedMessages: Message[] = [];
        
        fetchedMessages.push({
          id: 'welcome_static',
          senderId: 'system',
          text: 'Akıllı koruma etiket sisteminiz başarıyla aktif duruma getirilmiştir. Profil sayfanızdan acil durum tıbbi notlarını ve güvence albümünü eksiksiz doldurmayı unutmayınız.',
          timestamp: new Date(),
          type: 'text'
        });

        if (docSnap.exists()) {
          const sysData = docSnap.data();
          if (sysData.lastMessage) {
            fetchedMessages.push({
              id: 'system_broadcast',
              senderId: 'system',
              text: sysData.lastMessage,
              timestamp: sysData.updatedAt || new Date(),
              type: 'text'
            });
          }
        }

        setMessages(fetchedMessages);
        setLoading(false);
      });

      return unsubscribeSystem;
    }

    const messagesQuery = query(
      collection(db, "chat_rooms", activeRoomId, "messages"),
      orderBy("timestamp", "asc")
    );

    const roomRef = doc(db, "chat_rooms", activeRoomId);

    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      try {
        const roomSnap = await getDoc(roomRef);
        let clearTimestamp: any = null;
        
        if (roomSnap.exists()) {
          const roomData = roomSnap.data();
          if (roomData.clearedAt && roomData.clearedAt[currentUser.uid]) {
            clearTimestamp = roomData.clearedAt[currentUser.uid];
          }
        }

        const fetchedMessages: Message[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const msgTimestamp = data.timestamp;

          if (clearTimestamp && msgTimestamp) {
            const clearTime = clearTimestamp.toDate ? clearTimestamp.toDate().getTime() : new Date(clearTimestamp).getTime();
            const msgTime = msgTimestamp.toDate ? msgTimestamp.toDate().getTime() : new Date(msgTimestamp).getTime();
            if (msgTime <= clearTime) return; 
          }

          fetchedMessages.push({
            id: docSnap.id,
            senderId: data.senderId,
            text: data.text || '',
            timestamp: msgTimestamp,
            type: data.type || 'text',
            latitude: data.latitude,
            longitude: data.longitude
          });
        });

        setMessages(fetchedMessages);
        setLoading(false);
      } catch (err) {
        console.error("[Message Filter Error]:", err);
        setLoading(false);
      }
    }, (error) => {
      console.error("[Firestore Sync Error]:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [activeRoomId]);

  const handleSendMessage = async () => {
    if (inputText.trim() === '' || !currentUser || !targetUid) return;
    if (activeRoomId === 'system_welcome') { setInputText(''); return; }

    const messageToSend = inputText.trim();
    setInputText(''); 

    try {
      await addDoc(collection(db, "chat_rooms", activeRoomId, "messages"), {
        senderId: currentUser.uid,
        text: messageToSend,
        type: 'text',
        timestamp: serverTimestamp()
      });

      await updateDoc(doc(db, "chat_rooms", activeRoomId), {
        lastMessage: messageToSend,
        updatedAt: serverTimestamp(),
        visibleTo: arrayUnion(currentUser.uid, targetUid),
        [`unreadCount.${targetUid}`]: (messages.length + 1)
      });
    } catch (error) {
      console.error("[Delivery Failure]:", error);
    }
  };

  // 📍 WEB UYUMLU TARAYICI GPS KONUM MOTORU
  const handleSendLocationWeb = () => {
    if (activeRoomId === 'system_welcome' || !currentUser || !targetUid) return;

    if (!navigator.geolocation) {
      alert("Tarayıcınız GPS konum servislerini desteklemiyor kral.");
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          await addDoc(collection(db, "chat_rooms", activeRoomId, "messages"), {
            senderId: currentUser.uid,
            text: '📍 Güvenli konum paylaşıldı',
            type: 'location',
            latitude,
            longitude,
            timestamp: serverTimestamp()
          });

          await updateDoc(doc(db, "chat_rooms", activeRoomId), {
            lastMessage: '📍 Güvenli konum paylaşıldı',
            updatedAt: serverTimestamp(),
            visibleTo: arrayUnion(currentUser.uid, targetUid)
          });
        } catch (error) {
          console.error("Firestore konum kayıt hatası:", error);
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        console.error("GPS Hata:", error);
        alert("Konum izni reddedildi veya GPS koordinatları alınamadı reis.");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleLocalDeleteMessage = (messageId: string) => {
    const isConfirm = confirm("Bu mesajı ekranınızdan kaldırmak istiyor musunuz?");
    if (isConfirm) {
      setDeletedMessageIds(prev => [...prev, messageId]);
    }
  };

  const openExternalMapWeb = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url).catch(() => alert("Harita linki açılamadı."));
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    if (deletedMessageIds.includes(item.id)) return null;

    const isMyMessage = item.senderId === currentUser?.uid;
    const isSystem = item.senderId === 'system';

    if (isSystem) {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.text}</Text>
        </View>
      );
    }

    const renderBubbleContent = () => (
      <View style={[styles.bubble, isMyMessage ? styles.myBubble : styles.otherBubble, item.type === 'location' && styles.mapBubbleWeb]}>
        {item.type === 'location' && item.latitude && item.longitude ? (
          <TouchableOpacity 
            style={styles.mapContainerWeb} 
            onPress={() => openExternalMapWeb(item.latitude!, item.longitude!)}
            activeOpacity={0.8}
          >
            {/* 🖥️ WEB HARİTA ÇÖZÜMÜ: Yerel mobil harita yerine tıklanabilir şık GPS kartı */}
            <View style={styles.webMapPlaceholder}>
              <Ionicons name="map-outline" size={32} color="#beaf9f" />
              <Text style={{fontSize: 12, color: '#666', marginTop: 5, fontWeight: 'bold'}}>Koordinat: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</Text>
            </View>
            <Text style={styles.mapText}>📍 Google Maps'te Aç</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
            {item.text}
          </Text>
        )}
      </View>
    );

    return (
      <WebMessageRow
        item={item}
        isMyMessage={isMyMessage}
        targetAvatar={targetAvatar}
        targetInitials={targetInitials}
        onDelete={() => handleLocalDeleteMessage(item.id)}
        renderMessageContent={renderBubbleContent}
      />
    );
  };

  return (
    <View style={styles.chatScreenContainer}>
      {/* HEADER */}
      <View style={styles.header}>
        {isMobile && onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#1c1c1e" />
          </TouchableOpacity>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {activeRoomId === 'system_welcome' ? 'NFCTT Sistem Bildirimleri' : dynamicTitle}
          </Text>
          <Text style={styles.headerSubtitle}>{activeRoomId === 'system_welcome' ? 'Resmi Duyuru Kanalı' : 'Çevrimiçi'}</Text>
        </View>
      </View>

      {/* MESSAGES LIST */}
      <View style={styles.contentFlex}>
        <ImageBackground source={parchmentBg} style={styles.contentFlex} resizeMode="cover">
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#beaf9f" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessageItem}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />
          )}
        </ImageBackground>
      </View>

      {/* INPUT */}
      {activeRoomId !== 'system_welcome' && (
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.locationButton} 
            onPress={handleSendLocationWeb}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#beaf9f" />
            ) : (
              <Ionicons name="location-sharp" size={22} color="#beaf9f" />
            )}
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Mesajınızı güvenle yazın..."
            placeholderTextColor="#8e8e93"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSendMessage}
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
            <Ionicons name="send" size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// =========================================================================
// 🔄 MERGED SPLIT VIEW: CHAT LIST VE SCREEN BİR ARADA (INSTAGRAM WEB MIMARI)
// =========================================================================
export default function WebChatView() {
  const [selectedRoom, setSelectedRoom] = useState<{ roomId: string, targetUid: string, title: string } | null>(null);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Mobildeysek ve bir oda seçildiyse sadece odayı göster, seçilmediyse listeyi göster
  if (isMobile) {
    if (selectedRoom) {
      return (
        <WebChatScreen 
          roomId={selectedRoom.roomId} 
          targetUid={selectedRoom.targetUid} 
          title={selectedRoom.title} 
          onBack={() => setSelectedRoom(null)} 
        />
      );
    }
    return <WebChatList onSelectChat={(roomId, targetUid, title) => setSelectedRoom({ roomId, targetUid, title })} />;
  }

  // 🖥️ MASAÜSTÜ: Listeyi solda, mesajları sağda yan yana gösteren Instagram stili!
  return (
    <View style={styles.splitMainContainer}>
      <View style={styles.splitLeftMenu}>
        <WebChatList onSelectChat={(roomId, targetUid, title) => setSelectedRoom({ roomId, targetUid, title })} />
      </View>
      <View style={styles.splitRightChat}>
        {selectedRoom ? (
          <WebChatScreen 
            roomId={selectedRoom.roomId} 
            targetUid={selectedRoom.targetUid} 
            title={selectedRoom.title} 
          />
        ) : (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#beaf9f" />
            <Text style={styles.emptyStateText}>Mesajlarınızı görüntülemek için sol listeden bir sohbet seçin kral.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// =========================================================================
// 🎨 STYLES
// =========================================================================
const styles = StyleSheet.create({
  splitMainContainer: { flex: 1, flexDirection: 'row', backgroundColor: '#ffffff' },
  splitLeftMenu: { width: 350, borderRightWidth: 0.5, borderColor: '#e5e5ea', height: '100%' },
  splitRightChat: { flex: 1, height: '100%', backgroundColor: '#f8f9fa' },
  chatScreenContainer: { flex: 1, height: '100%', backgroundColor: '#ffffff' },
  contentFlex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 0.5, borderColor: '#e5e5ea', backgroundColor: '#ffffff', height: 65 },
  backButton: { marginRight: 10, padding: 5 },
  headerInfo: { flex: 1, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1c1c1e' },
  headerSubtitle: { fontSize: 11, color: '#8e8e93', marginTop: 2, fontWeight: '500' },
  
  messagesList: { padding: 20, paddingBottom: 30 },
  messageWrapper: { marginBottom: 12, width: '100%' },
  myMessageWrapper: { alignItems: 'flex-end' },
  otherMessageWrapper: { alignItems: 'flex-start' },
  messageRowHorizontal: { flexDirection: 'row', alignItems: 'flex-end', maxWidth: '75%', position: 'relative' },
  mainBubbleAnimatedContent: { zIndex: 10 },
  
  webMsgDeleteBtn: { padding: 5, justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },

  chatAvatarContainer: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f2f2f7', marginRight: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(0, 0, 0, 0.05)', marginBottom: 2 },
  chatAvatarImage: { width: 34, height: 34, borderRadius: 17 },
  chatAvatarPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  chatAvatarPlaceholderText: { fontSize: 13, fontWeight: '700', color: '#beaf9f' },
  
  bubble: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20 },
  myBubble: { backgroundColor: 'rgba(85, 85, 95, 0.88)', borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: 'rgba(242, 242, 247, 0.92)', borderBottomLeftRadius: 4, borderWidth: 0.5, borderColor: 'rgba(0, 0, 0, 0.04)' },
  
  // Web Özel Konum Kartı
  mapBubbleWeb: { width: 240, padding: 0, overflow: 'hidden', borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e5ea' },
  mapContainerWeb: { width: '100%' },
  webMapPlaceholder: { width: '100%', height: 110, backgroundColor: '#fdfbf9', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 0.5, borderColor: '#e5e5ea' },
  mapText: { padding: 10, fontSize: 11, fontWeight: '700', textAlign: 'center', color: '#beaf9f', textTransform: 'uppercase', letterSpacing: 0.3 },

  messageText: { fontSize: 15, lineHeight: 20 },
  myMessageText: { color: '#ffffff', fontWeight: '500' },
  otherMessageText: { color: '#1c1c1e', fontWeight: '500' },
  
  systemMessageContainer: { backgroundColor: 'rgba(249, 249, 251, 0.85)', borderWidth: 1, borderColor: '#e5e5ea', padding: 15, borderRadius: 12, marginVertical: 10, alignItems: 'center', width: '100%' },
  systemMessageText: { fontSize: 12, color: '#666666', textAlign: 'center', lineHeight: 18, fontWeight: '500' },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 12, borderTopWidth: 0.5, borderColor: '#e5e5ea', backgroundColor: '#ffffff' },
  locationButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginRight: 5 },
  input: { flex: 1, backgroundColor: '#f2f2f7', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, fontSize: 15, color: '#1c1c1e', fontWeight: '500' },
  sendButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#beaf9f', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },

  emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyStateText: { marginTop: 15, fontSize: 16, color: '#8e8e93', fontWeight: '500', textAlign: 'center', maxWidth: 400 }
});