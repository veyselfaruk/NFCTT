import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Linking,
  ImageBackground // KANKA: Parşömen için bunu ekledik
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../config/firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

// KANKA: İndirdiğin parşömen resmini buraya mühürledik
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

export default function ChatScreen({ route, navigation }: any) {
  const { chatId, title } = route.params || { chatId: 'system_welcome', title: 'NFCTT Sistem Merkezi' };
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const currentUser = auth.currentUser;

  // === ANLIK MESAJ DİNLEME MOTORU ===
  useEffect(() => {
    if (!chatId) return;

    const messagesQuery = query(
      collection(db, "chats", chatId, "messages"),
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

      if (fetchedMessages.length === 0 && chatId === 'system_welcome') {
        fetchedMessages.push({
          id: 'welcome_static',
          senderId: 'system',
          text: 'Akıllı etiket sisteminiz aktif duruma getirilmiştir biladerim. Profil sayfasından bağımlı canlı bilgilerini ve albümünü eksiksiz doldurmayı unutma!',
          timestamp: new Date(),
          type: 'text'
        });
      }

      setMessages(fetchedMessages);
      setLoading(false);

      setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: true }); }, 100);
    }, (error) => {
      console.error("Mesajlar dinlenirken bulutta hata çıktı kanka:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [chatId]);

  // === METİN MESAJI GÖNDERME MOTORU ===
  const handleSendMessage = async () => {
    if (inputText.trim() === '' || !currentUser) return;
    if (chatId === 'system_welcome') { setInputText(''); return; }

    const messageToSend = inputText.trim();
    setInputText(''); 

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: currentUser.uid,
        text: messageToSend,
        type: 'text',
        timestamp: serverTimestamp()
      });

      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: messageToSend,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Mesaj gönderilirken hata oluştu kanka:", error);
    }
  };

  // === CANLI KONUM ATMA MOTORU ===
  const handleSendLocation = async () => {
    if (chatId === 'system_welcome' || !currentUser) return;

    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Reddedildi', 'Konumunu paylaşmak için ayarlardan izin vermen gerekiyor biladerim.');
      return;
    }

    setLocationLoading(true);
    try {
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;

      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: currentUser.uid,
        text: '📍 Konum paylaşıldı',
        type: 'location',
        latitude,
        longitude,
        timestamp: serverTimestamp()
      });

      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: '📍 Konum paylaşıldı',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Konum alınırken veya fırlatılırken hata çıktı kanka:", error);
      Alert.alert('Hata', 'GPS verisi çekilemedi, tekrar dene biladerim.');
    } finally {
      setLocationLoading(false);
    }
  };

  // === MESAJ BALONLARININ RENDER EDİLMESİ ===
  const renderMessageItem = ({ item }: { item: Message }) => {
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
      const label = 'NFCTT Bulucu Konumu';
      const url = Platform.select({
        ios: `${scheme}${label}@${latLng}`,
        android: `${scheme}${latLng}(${label})`
      });

      if (url) {
        Linking.openURL(url).catch(() => {
          Alert.alert('Hata', 'Harita uygulaması açılmadı biladerim.');
        });
      }
    };

    return (
      <View style={[styles.messageWrapper, isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
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
              <Text style={[styles.mapText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
                📍 Haritada Gitmek İçin Tıkla
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
              {item.text}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER KATMANI */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.headerSubtitle}>{chatId === 'system_welcome' ? 'Sistem Duyuruları' : 'Çevrimiçi'}</Text>
        </View>
        <View style={styles.rightPlaceholder} />
      </View>

      {/* MESAJ ALANI VE KLAVYE AYARI */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.contentFlex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* KANKA: Sadece mesaj listesini parşömen ile kapladık */}
        <ImageBackground source={parchmentBg} style={styles.contentFlex} resizeMode="cover">
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#000000" />
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
        {chatId !== 'system_welcome' && (
          <View style={styles.inputContainer}>
            <TouchableOpacity 
              style={styles.locationButton} 
              onPress={handleSendLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Ionicons name="location-sharp" size={22} color="#000000" />
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Mesajınızı yazın biladerim..."
              placeholderTextColor="#8e8e93"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
              <Ionicons name="send" size={18} color="#ffffff" />
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
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#000000' },
  headerSubtitle: { fontSize: 12, color: '#8e8e93', marginTop: 1 },
  rightPlaceholder: { width: 40 },
  
  messagesList: { padding: 15, paddingBottom: 20 },
  messageWrapper: { flexDirection: 'row', marginBottom: 10, width: '100%' },
  myMessageWrapper: { justifyContent: 'flex-end' },
  otherMessageWrapper: { justifyContent: 'flex-start' },
  
  // === KANKA: YENİ NESİL KURUMSAL RENK PALETİ STİLLERİ ===
  bubble: { maxWidth: '75%', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20 },
  
  // KANKA: Senin gönderdiğin mesajlar - Şık Duman Grisi / Soft Antrasit
  myBubble: { 
    backgroundColor: 'rgba(85, 85, 95, 0.85)', 
    borderBottomRightRadius: 4 
  },
  
  // KANKA: Karşı taraftan gelen mesajlar - Pamuk / Kirli Beyaz Tonu
  otherBubble: { 
    backgroundColor: 'rgba(242, 242, 247, 0.9)', 
    borderBottomLeftRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)' // Parşömenden hafif ayrılsın diye çok ince bir kenarlık
  },
  
  // KANKA: Konum harita balonu (Zeminle uyumlu temiz beyaz kalsın)
  mapBubble: { width: 240, paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden', borderRadius: 16, backgroundColor: '#ffffff' },
  
  messageText: { fontSize: 15, lineHeight: 20 },
  
  // KANKA: Koyu gri balonda rahat okunsun diye metin beyaz ve net
  myMessageText: { color: '#ffffff', fontWeight: '500' },
  
  // KANKA: Kirli beyaz balonda kurumsal dursun diye mat koyu gri
  otherMessageText: { color: '#1c1c1e' },
  
  systemMessageContainer: { backgroundColor: 'rgba(249, 249, 251, 0.85)', borderWidth: 1, borderColor: '#e5e5ea', padding: 15, borderRadius: 12, marginVertical: 10, alignItems: 'center' },
  systemMessageText: { fontSize: 13, color: '#666666', textAlign: 'center', lineHeight: 18 },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderTopWidth: 0.5, borderColor: '#e5e5ea', backgroundColor: '#ffffff' },
  locationButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginRight: 5 },
  input: { flex: 1, backgroundColor: '#f2f2f7', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, paddingRight: 40, fontSize: 15, color: '#000000', maxHeight: 100 },
  sendButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  mapContainer: { width: '100%', height: 180 },
  miniMap: { width: '100%', height: 140 },
  mapText: { padding: 10, fontSize: 13, fontWeight: '500', textAlign: 'center', color: '#000000' }
});