import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView 
} from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
}

export default function ChatScreen({ route, navigation }: any) {
  const { chatId, title } = route.params || { chatId: 'system_welcome', title: 'NFCTT Sistem Merkezi' };
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  
  const flatListRef = useRef<FlatList>(null);
  const currentUser = auth.currentUser;

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
          text: data.text,
          timestamp: data.timestamp
        });
      });

      if (fetchedMessages.length === 0 && chatId === 'system_welcome') {
        fetchedMessages.push({
          id: 'welcome_static',
          senderId: 'system',
          text: 'Akıllı etiket sisteminiz aktif duruma getirilmiştir biladerim. Profil sayfasından bağımlı canlı bilgilerini ve albümünü eksiksiz doldurmayı unutma!',
          timestamp: new Date()
        });
      }

      setMessages(fetchedMessages);
      setLoading(false);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, (error) => {
      console.error("Mesajlar dinlenirken bulutta hata çıktı kanka:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [chatId]);

  const handleSendMessage = async () => {
    if (inputText.trim() === '' || !currentUser) return;
    
    if (chatId === 'system_welcome') {
      setInputText('');
      return;
    }

    const messageToSend = inputText.trim();
    setInputText(''); 

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: currentUser.uid,
        text: messageToSend,
        timestamp: serverTimestamp()
      });

      const chatRef = doc(db, "chats", chatId);
      await updateDoc(chatRef, {
        lastMessage: messageToSend,
        updatedAt: serverTimestamp()
      });

    } catch (error) {
      console.error("Mesaj gönderilirken hata oluştu kanka:", error);
    }
  };

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

    return (
      <View style={[styles.messageWrapper, isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
        <View style={[styles.bubble, isMyMessage ? styles.myBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
            {item.text}
          </Text>
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

        {/* INPUT ALANI */}
        {chatId !== 'system_welcome' && (
          <View style={styles.inputContainer}>
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
    // KANKA: Android ve iOS çentiklerine çarpmaması için padding değerlerini mermiledik:
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
  
  bubble: { maxWidth: '75%', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20 },
  myBubble: { backgroundColor: '#000000', borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: '#f2f2f7', borderBottomLeftRadius: 4 },
  
  messageText: { fontSize: 15, lineHeight: 20 },
  myMessageText: { color: '#ffffff' },
  otherMessageText: { color: '#000000' },
  
  systemMessageContainer: { backgroundColor: '#f9f9fb', borderWidth: 1, borderColor: '#e5e5ea', padding: 15, borderRadius: 12, marginVertical: 10, alignItems: 'center' },
  systemMessageText: { fontSize: 13, color: '#666666', textAlign: 'center', lineHeight: 18 },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderTopWidth: 0.5, borderColor: '#e5e5ea', backgroundColor: '#ffffff' },
  input: { flex: 1, backgroundColor: '#f2f2f7', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, paddingRight: 40, fontSize: 15, color: '#000000', maxHeight: 100 },
  sendButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});