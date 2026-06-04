import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Linking,
  ImageBackground, Animated, PanResponder, Dimensions, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../config/firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

const parchmentBg = require('../../assets/parchment_bg.png');
const { width } = Dimensions.get('window');

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
// 🛡️ KAYDIRILABİLİR MESAJ SATIRI (SWIPEABLE MESSAGE BUBBLE MOTORU)
// =========================================================================
function SwipeableMessageRow({ 
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
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (item.id === 'welcome_static') return false; // Sistem mesajı silinemez kanka
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderMove: (_, gestureState) => {
        // Benim mesajımsa sola, karşı tarafınsa sağa kaydırınca silme paneli çıksın
        if (isMyMessage && gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -70));
        } else if (!isMyMessage && gestureState.dx > 0) {
          translateX.setValue(Math.min(gestureState.dx, 70));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldDelete = isMyMessage ? gestureState.dx < -45 : gestureState.dx > 45;
        if (shouldDelete) {
          Animated.timing(translateX, {
            toValue: isMyMessage ? -width : width,
            duration: 180,
            useNativeDriver: true,
          }).start(() => onDelete());
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

  return (
    <View style={[styles.messageWrapper, isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
      {/* 🚨 ARKA PLAN: LOKAL SİLME TETİKLEYİCİ ALANI */}
      <View style={[styles.localDeleteBg, isMyMessage ? styles.localDeleteBgRight : styles.localDeleteBgLeft]}>
        <Ionicons name="trash" size={16} color="#fff" />
      </View>

      {/* 🔔 ÖN PLAN: PROFİL FOTOĞRAFI VE MESAJ BALONU KATMANI */}
      <Animated.View 
        style={[
          styles.animatedMessageContainer, 
          isMyMessage ? styles.myAnimatedRow : styles.otherAnimatedRow,
          { transform: [{ translateX }] }
        ]}
        {...panResponder.panHandlers}
      >
        {/* 📸 GÜNCELLEME: Karşı tarafın mesajıysa soluna profil fotoğrafı önizlemesi çakıyoruz brom */}
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

        {renderMessageContent()}
      </Animated.View>
    </View>
  );
}

// =========================================================================
// 💬 ANA CHATSCREEN COMPONENT
// =========================================================================
export default function ChatScreen({ route, navigation }: any) {
  const { roomId, targetUid, title } = route.params || {};
  const activeRoomId = roomId || 'system_welcome';
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [dynamicTitle, setDynamicTitle] = useState(title || 'Güvenli İletişim Kanalı');
  
  // 📸 Profil fotoğrafı önizlemesi için eklediğimiz yeni stateler brom
  const [targetAvatar, setTargetAvatar] = useState<string | null>(null);
  const [targetInitials, setTargetInitials] = useState('👤');

  // 🛡️ Sadece kendi ekranımızdan silinen mesajları tutan lokal maskeleme listesi
  const [deletedMessageIds, setDeletedMessageIds] = useState<string[]>([]);
  
  const flatListRef = useRef<FlatList>(null);
  const currentUser = auth.currentUser;

  // === 📡 1. ADIM: DERİNLEMESİNE PROFIL FOTOĞRAFI VE ADI ÇÖZÜMLEYİCİ ===
  useEffect(() => {
    const fetchTargetProfile = async () => {
      if (!targetUid) return;
      try {
        const profileSnap = await getDoc(doc(db, "profiles", targetUid));
        if (profileSnap.exists()) {
          const pData = profileSnap.data();
          const actualData = pData.finalData ? pData.finalData : pData;
          
          const computedName = actualData?.dependent?.name || actualData?.parent?.name || "Kullanıcı";
          
          if (actualData?.dependent?.name) {
            setDynamicTitle(`${actualData.dependent.name} - Güvence Hattı`);
          } else if (actualData?.parent?.name) {
            setDynamicTitle(actualData.parent.name);
          }

          if (computedName) {
            setTargetInitials(computedName[0].toUpperCase());
          }

          // 🌾 ChatList'teki o canavar derin tarama mekanizmasını buraya da enjekte ettik brom
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
        console.error("[Header Fetch Error] Karşı taraf bilgisi çekilemedi:", err);
      }
    };

    fetchTargetProfile();
  }, [targetUid]);

  // === 📡 2. ADIM: REAL-TIME ANLIK MESAJ DİNLEME MOTORU ===
  useEffect(() => {
    if (!activeRoomId) return;

    const messagesQuery = query(
      collection(db, "chat_rooms", activeRoomId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const fetchedMessages: Message[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedMessages.push({
          id: docSnap.id,
          senderId: data.senderId,
          text: data.text || '',
          timestamp: data.timestamp,
          type: data.type || 'text',
          latitude: data.latitude,
          longitude: data.longitude
        });
      });

      if (fetchedMessages.length === 0 && activeRoomId === 'system_welcome') {
        fetchedMessages.push({
          id: 'welcome_static',
          senderId: 'system',
          text: 'Akıllı koruma etiket sisteminiz başarıyla aktif duruma getirilmiştir. Profil sayfanızdan acil durum tıbbi notlarını ve güvence albümünü eksiksiz doldurmayı unutmayınız.',
          timestamp: new Date(),
          type: 'text'
        });
      }

      setMessages(fetchedMessages);
      setLoading(false);

      setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: true }); }, 120);
    }, (error) => {
      console.error("[Firestore Sync Error] Mesaj akışı dinlenirken hata oluştu:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [activeRoomId]);

  // === 🚀 3. ADIM: KURUMSAM METİN MESAJI GÖNDERME MOTORU ===
  const handleSendMessage = async () => {
    if (inputText.trim() === '' || !currentUser) return;
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
        [`unreadCount.${targetUid}`]: (messages.length + 1)
      });
    } catch (error) {
      console.error("[Message Delivery Failure] Mesaj iletilemedi:", error);
    }
  };

  // === 📍 4. ADIM: ACİL DURUM CANLI KONUM ENJEKSİYONU ===
  const handleSendLocation = async () => {
    if (activeRoomId === 'system_welcome' || !currentUser) return;

    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Erişim Reddedildi', 'Acil durum konumunuzu paylaşabilmek için lütfen cihaz ayarlarından konum izni veriniz.');
      return;
    }

    setLocationLoading(true);
    try {
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;

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
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("[GPS Subsystem Error] Lokasyon verisi fırlatılamadı:", error);
      Alert.alert('Bağlantı Hatası', 'GPS koordinatları çekilemedi, lütfen tekrar deneyiniz.');
    } finally {
      setLocationLoading(false);
    }
  };

  // 🛡️ LOKAL MASKELEMELİ SİLME AKSİYONU brom
  const handleLocalDeleteMessage = (messageId: string) => {
    setDeletedMessageIds(prev => [...prev, messageId]);
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    // Eğer bu mesaj kullanıcı tarafından yerel olarak silindiyse ekrana basma brom
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

    const openExternalMap = (lat: number, lng: number) => {
      const scheme = Platform.select({ ios: 'maps://?q=', android: 'geo:0,0?q=' });
      const latLng = `${lat},${lng}`;
      const label = 'NFCTT Güvence Lokasyonu';
      const url = Platform.select({
        ios: `${scheme}${label}@${latLng}`,
        android: `${scheme}${latLng}(${label})`
      });

      if (url) {
        Linking.openURL(url).catch(() => {
          Alert.alert('Hata', 'Cihaz harita uygulaması başlatılamadı.');
        });
      }
    };

    const renderBubbleContent = () => (
      <View style={[styles.bubble, isMyMessage ? styles.myBubble : styles.otherBubble, item.type === 'location' && styles.mapBubble]}>
        {item.type === 'location' && item.latitude && item.longitude ? (
          <TouchableOpacity 
            style={styles.mapContainer} 
            onPress={() => openExternalMap(item.latitude!, item.longitude!)}
            activeOpacity={0.7}
          >
            <MapView
              style={styles.miniMap}
              initialRegion={{
                latitude: item.latitude,
                longitude: item.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              pointerEvents="none"
            >
              <Marker coordinate={{ latitude: item.latitude, longitude: item.longitude }} />
            </MapView>
            <Text style={styles.mapText}>📍 Haritada Rotayı Göster</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
            {item.text}
          </Text>
        )}
      </View>
    );

    return (
      <SwipeableMessageRow
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
    <SafeAreaView style={styles.container}>
      {/* HEADER KATMANI */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1c1c1e" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{dynamicTitle}</Text>
          <Text style={styles.headerSubtitle}>{activeRoomId === 'system_welcome' ? 'Sistem Bildirimleri' : 'Çevrimiçi'}</Text>
        </View>
        <View style={styles.rightPlaceholder} />
      </View>

      {/* MESAJ ALANI VE KLAVYE INTEGRASYONU */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.contentFlex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
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
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
          )}
        </ImageBackground>

        {/* INPUT ALANI */}
        {activeRoomId !== 'system_welcome' && (
          <View style={styles.inputContainer}>
            <TouchableOpacity 
              style={styles.locationButton} 
              onPress={handleSendLocation}
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
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
              <Ionicons name="send" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  contentFlex: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 15, 
    paddingTop: Platform.OS === 'ios' ? 10 : 45, 
    paddingBottom: 15, 
    borderBottomWidth: 0.5, 
    borderColor: '#e5e5ea',
    backgroundColor: '#ffffff'
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, marginLeft: 5, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1c1c1e' },
  headerSubtitle: { fontSize: 11, color: '#8e8e93', marginTop: 2, fontWeight: '500' },
  rightPlaceholder: { width: 40 },
  
  messagesList: { padding: 15, paddingBottom: 20 },
  messageWrapper: { position: 'relative', marginBottom: 14, width: '100%', minHeight: 40, justifyContent: 'center' },
  myMessageWrapper: { alignItems: 'flex-end' },
  otherMessageWrapper: { alignItems: 'flex-start' },

  // SWIPEABLE ANIMATION FRAMEWORK STYLES
  animatedMessageContainer: { flexDirection: 'row', alignItems: 'flex-end', maxWidth: '85%', zIndex: 2 },
  myAnimatedRow: { justifyContent: 'flex-end', width: '100%' },
  otherAnimatedRow: { justifyContent: 'flex-start', width: '100%' },

  // MAT ANTRASİT LOKAL SİLME ARKA PLANI
  localDeleteBg: { position: 'absolute', top: 0, bottom: 0, width: 70, backgroundColor: '#55555f', justifyContent: 'center', alignItems: 'center', zIndex: 1, borderRadius: 14 },
  localDeleteBgRight: { right: 0 },
  localDeleteBgLeft: { left: 0 },

  // CHAT İÇİ PREMİUM AVATAR SİSTEMİ brom
  chatAvatarContainer: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f2f2f7', marginRight: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 0.5, borderColor: '#e5e5ea' },
  chatAvatarImage: { width: 34, height: 34, borderRadius: 17 },
  chatAvatarPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  chatAvatarPlaceholderText: { fontSize: 13, fontWeight: '700', color: '#beaf9f' },
  
  bubble: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, maxWidth: '85%' },
  myBubble: { backgroundColor: 'rgba(85, 85, 95, 0.88)', borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: 'rgba(242, 242, 247, 0.92)', borderBottomLeftRadius: 4, borderWidth: 0.5, borderColor: 'rgba(0, 0, 0, 0.04)' },
  
  mapBubble: { width: 230, paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden', borderRadius: 16, backgroundColor: '#ffffff' },
  messageText: { fontSize: 15, lineHeight: 20 },
  myMessageText: { color: '#ffffff', fontWeight: '500' },
  otherMessageText: { color: '#1c1c1e', fontWeight: '500' },
  
  systemMessageContainer: { backgroundColor: 'rgba(249, 249, 251, 0.85)', borderWidth: 1, borderColor: '#e5e5ea', padding: 15, borderRadius: 12, marginVertical: 10, alignItems: 'center', width: '100%' },
  systemMessageText: { fontSize: 12, color: '#666666', textAlign: 'center', lineHeight: 18, fontWeight: '500' },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderTopWidth: 0.5, borderColor: '#e5e5ea', backgroundColor: '#ffffff' },
  locationButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginRight: 5 },
  input: { flex: 1, backgroundColor: '#f2f2f7', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, paddingRight: 40, fontSize: 15, color: '#1c1c1e', maxHeight: 100, fontWeight: '500' },
  
  sendButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#beaf9f', justifyContent: 'center', alignItems: 'center', marginLeft: 10, shadowColor: '#beaf9f', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  mapContainer: { width: '100%', height: 180 },
  miniMap: { width: '100%', height: 140 },
  mapText: { padding: 10, fontSize: 11, fontWeight: '700', textAlign: 'center', color: '#beaf9f', textTransform: 'uppercase', letterSpacing: 0.3 }
});