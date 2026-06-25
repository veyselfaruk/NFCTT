import React, { useState, useEffect } from 'react'; 
import { 
  View, 
  ActivityIndicator, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  useWindowDimensions, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 
import { getProfileForWeb } from './src/controllers/WebProfileController'; 
import WebLoginScreen from './src/screens/UniversalLoginScreen';
import HomeScreen from './src/views/WebHomeView';
import WebChatView from './src/views/WebChatView';
import WebNfcView from './src/views/WebNfcView';
import WebProfileView from './src/views/WebProfileView';
import WebProfileSetupView from './src/views/WebProfileSetupView';
import * as Font from 'expo-font';

// 🔥 Firebase modülleri ve auth çekirdeğini dahil ediyoruz kanka
import { db, auth } from './src/config/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth'; // <-- Canlı takip ve çıkış motoru

// =========================================================================
// 📱 COMPONENT: RESPONSIVE MENU
// =========================================================================
interface MenuProps {
  navigation: any;
  activeScreen: 'Home' | 'Settings' | 'NFC' | 'Chat' | 'Profile';
  onClearTargetUid: () => void;
}

function NavigationMenu({ navigation, activeScreen, onClearTargetUid }: MenuProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const activeColor = '#000000';
  const inactiveColor = '#8e8e93';

  const handleTabPress = (targetRoute: string) => {
    if (
      (targetRoute === 'ProfileSetup' && activeScreen === 'Settings') ||
      (targetRoute === 'Home' && activeScreen === 'Home') ||
      (targetRoute === 'Nfc' && activeScreen === 'NFC') ||
      (targetRoute === 'ChatList' && activeScreen === 'Chat') ||
      (targetRoute === 'ProfileScreen' && activeScreen === 'Profile')
    ) {
      return;
    }

    if (targetRoute === 'ProfileScreen' || targetRoute === 'Home') {
      if (targetRoute === 'ProfileScreen') {
        onClearTargetUid();
      }
      navigation.reset({
        index: 0,
        routes: [{ name: targetRoute }],
      });
    } else {
      navigation.navigate({
        name: targetRoute,
        key: targetRoute,
        merge: true,
      });
    }
  };

  const containerStyle = isMobile ? menuStyles.bottomBar : menuStyles.sideBar;
  const itemStyle = isMobile ? menuStyles.barItemMobile : menuStyles.barItemDesktop;

  return (
    <View style={containerStyle}>
      {!isMobile && (
        <View style={menuStyles.logoContainer}>
          <Text style={menuStyles.logoText}>NFC-TT</Text>
        </View>
      )}

      {/* 1. ANASAYFA */}
      <TouchableOpacity style={itemStyle} onPress={() => handleTabPress('Home')}>
        <Ionicons 
          name={activeScreen === 'Home' ? "home" : "home-outline"} 
          size={isMobile ? 22 : 24} 
          color={activeScreen === 'Home' ? activeColor : inactiveColor} 
        />
        {!isMobile && <Text style={[menuStyles.barText, activeScreen === 'Home' && menuStyles.activeText]}>Anasayfa</Text>}
      </TouchableOpacity>
      
      {/* 5. AYARLAR */}
      <TouchableOpacity style={itemStyle} onPress={() => handleTabPress('ProfileSetup')}>
        <Ionicons 
          name={activeScreen === 'Settings' ? "settings" : "settings-outline"} 
          size={isMobile ? 22 : 24} 
          color={activeScreen === 'Settings' ? activeColor : inactiveColor} 
        />
        {!isMobile && <Text style={[menuStyles.barText, activeScreen === 'Settings' && menuStyles.activeText]}>Ayarlar</Text>}
      </TouchableOpacity>
      
      {/* 3. NFC TARAT */}
      <TouchableOpacity style={itemStyle} onPress={() => handleTabPress('Nfc')}>
        <Ionicons 
          name={activeScreen === 'NFC' ? "radio" : "radio-outline"} 
          size={isMobile ? 22 : 24} 
          color={activeScreen === 'NFC' ? activeColor : inactiveColor} 
        />
        {!isMobile && <Text style={[menuStyles.barText, activeScreen === 'NFC' && menuStyles.activeText]}>NFC Tarat</Text>}
      </TouchableOpacity>
      
      {/* 2. MESAJLAR */}
      <TouchableOpacity style={itemStyle} onPress={() => handleTabPress('ChatList')}>
        <Ionicons 
          name={activeScreen === 'Chat' ? "chatbox-ellipses" : "chatbox-ellipses-outline"} 
          size={isMobile ? 22 : 24} 
          color={activeScreen === 'Chat' ? activeColor : inactiveColor} 
        />
        {!isMobile && <Text style={[menuStyles.barText, activeScreen === 'Chat' && menuStyles.activeText]}>Mesajlar</Text>}
      </TouchableOpacity>

      {/* 4. PROFİLİM */}
      <TouchableOpacity style={itemStyle} onPress={() => handleTabPress('ProfileScreen')}>
        <Ionicons 
          name={activeScreen === 'Profile' ? "person" : "person-outline"} 
          size={isMobile ? 22 : 24} 
          color={activeScreen === 'Profile' ? activeColor : inactiveColor} 
        />
        {!isMobile && <Text style={[menuStyles.barText, activeScreen === 'Profile' && menuStyles.activeText]}>Profilim</Text>}
      </TouchableOpacity>
    </View>
  );
}

// =========================================================================
// 🚀 MAIN APPLICATION: APP COMPONENT
// =========================================================================
export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'Home' | 'Settings' | 'NFC' | 'Chat' | 'Profile'>('Home');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [viewingTargetUid, setViewingTargetUid] = useState<string | undefined>(undefined);

  const [urlTagId, setUrlTagId] = useState<string | null>(null);
  const [forceLoginScreen, setForceLoginScreen] = useState(false); 

  // 📡 1. KISIM: FONTLARI HAZIRLAMA VE FIREBASE AUTH CANLI RADARI
  useEffect(() => {
    async function prepareFonts() {
      try {
        if (Platform.OS === 'web') {
          await Font.loadAsync({
            'Ionicons': require('./src/fonts/Ionicons.b4eb097d35f44ed943676fd56f6bdc51.ttf'), 
          });
        }
      } catch (error) {
        console.log("Font yükleme hatası:", error);
      } finally {
        setFontsLoaded(true);
      }
    }

    prepareFonts();

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        console.log("🎯 [Auth Radar] Aktif Firebase oturumu saptandı:", firebaseUser.uid);
        setUser(firebaseUser);
      } else {
        console.log("🎯 [Auth Radar] Aktif oturum yok veya güvenli çıkış yapıldı.");
        setUser(null);
      }
      setIsCheckingAuth(false);
    });

    return () => unsubscribe(); 
  }, []);

  // 📡 2. KISIM: URL DEĞİŞİKLİKLERİNİ TAKİP EDEN RADAR
  useEffect(() => {
    if (isCheckingAuth) return; 

    const checkUrlParams = () => {
      if (Platform.OS !== 'web') return;

      const searchParams = new URLSearchParams(window.location.search);
      let tagIdFromUrl = searchParams.get('tagId');

      if (!tagIdFromUrl) {
        const pathParts = window.location.pathname.split('/');
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && lastPart !== '' && lastPart !== 'home' && lastPart !== 'login') {
          tagIdFromUrl = lastPart;
        }
      }

      if (tagIdFromUrl && tagIdFromUrl.trim() !== '') {
        console.log("URL Radarı ID'yi başarıyla mühürledi:", tagIdFromUrl.trim());
        setUrlTagId(tagIdFromUrl.trim());
        setActiveTab('NFC');
      }
    };

    checkUrlParams(); 
    
    window.addEventListener('popstate', checkUrlParams);
    return () => window.removeEventListener('popstate', checkUrlParams);
  }, [isCheckingAuth]);

  // 🎯 GİRİŞ MOTORU: BULUCU KAYDI ANINDA OTOMATİK SOHBET KURAR
  const handleLoginSuccess = async (userData: any) => {
    setUser(userData);
    setForceLoginScreen(false); 
    
    if (Platform.OS === 'web') {
      const pendingChatUid = sessionStorage.getItem('pending_chat_target_uid');
      if (pendingChatUid && userData?.uid) {
        console.log("Yeni kayıt olan bulucu yakalandı! Otomatik oda mühürleniyor...", pendingChatUid);
        
        sessionStorage.removeItem('pending_chat_target_uid'); 
        sessionStorage.removeItem('force_register_mode');

        try {
          const currentUserId = userData.uid;
          const sortedUids = [currentUserId, pendingChatUid].sort();
          const deterministicRoomId = `${sortedUids[0]}_${sortedUids[1]}`;

          const chatRoomRef = doc(db, "chat_rooms", deterministicRoomId);
          const chatRoomSnap = await getDoc(chatRoomRef);

          if (!chatRoomSnap.exists()) {
            await setDoc(chatRoomRef, {
              roomId: deterministicRoomId,
              participants: [currentUserId, pendingChatUid],
              visibleTo: [currentUserId, pendingChatUid], 
              createdAt: new Date().toISOString(),
              lastMessage: "Güvenli sohbet kanalı otomatik aktif edildi reis.",
              unreadCount: { [currentUserId]: 0, [pendingChatUid]: 0 }
            });
          }

          setViewingTargetUid(pendingChatUid);
          setActiveTab('Chat');
          return;
        } catch (err) {
          console.error("Otomatik chat kurulum hatası:", err);
        }
      }
    }

    setActiveTab('Home');
  };

  // 🔥 ÇIKIŞ MOTORU
  const handleLogoutOrRedirect = async () => {
    if (user) {
      try {
        await signOut(auth);
        console.log("✅ Firebase Auth oturumu başarıyla kapatıldı. İki başlılık bitti.");
        setActiveTab('Home');
      } catch (error) {
        console.error("Çıkış yapılırken Firebase hatası:", error);
      }
    } else {
      setUrlTagId(null);
      setForceLoginScreen(true);
      setActiveTab('Home'); 

      if (Platform.OS === 'web') {
        const cleanDomainUrl = window.location.origin; 
        window.history.replaceState({}, document.title, cleanDomainUrl);
      }
    }
  };

  const fakeNavigation = {
    navigate: (obj: any) => {
      if(obj.name === 'ProfileSetup') setActiveTab('Settings');
      if(obj.name === 'Home') setActiveTab('Home');
      if(obj.name === 'Nfc') setActiveTab('NFC');
      if(obj.name === 'ChatList') setActiveTab('Chat');
      if(obj.name === 'ProfileScreen') {
        setViewingTargetUid(undefined);
        setActiveTab('Profile');
      }
    },
    reset: (obj: any) => {
      const target = obj.routes[0].name;
      if(target === 'Home') setActiveTab('Home');
      if(target === 'ProfileScreen') {
        setViewingTargetUid(undefined);
        setActiveTab('Profile');
      }
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Home':
        return <HomeScreen />;
      case 'Chat':
        return <WebChatView />;
      case 'Settings':
        return (
          <WebProfileSetupView 
            onSaveSuccess={() => {
              setActiveTab('Profile');
            }} 
          />
        );
      case 'Profile':
        return <WebProfileView targetUid={viewingTargetUid} />;
      case 'NFC':
        return (
          <WebNfcView 
            urlTagId={urlTagId} 
            onNavigateToProfile={(targetUid) => {
              setViewingTargetUid(targetUid);
              setActiveTab('Profile');
            }} 
          />
        );
    }
  };

  if (isCheckingAuth || !fontsLoaded) {
    return (
      <View style={appStyles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Oturum ve bileşenler kontrol ediliyor...</Text>
      </View>
    );
  }

  const isForcedRegister = Platform.OS === 'web' && sessionStorage.getItem('force_register_mode') === 'true';

  // 🎯 DEĞİŞİKLİK BURADA: WebLoginScreen bileşenine isRegisterMode prop'unu paslıyoruz kral.
  if (!user && (!urlTagId || forceLoginScreen || isForcedRegister)) {
    return (
      <View style={{ flex: 1 }}>
        <WebLoginScreen 
          onLoginSuccess={handleLoginSuccess} 
          isRegisterMode={isForcedRegister} 
        />
      </View>
    );
  }

  return (
    <View style={[appStyles.container, { flexDirection: isMobile ? 'column' : 'row' }]}>
      
      {user && !isMobile && (
        <NavigationMenu 
          navigation={fakeNavigation} 
          activeScreen={activeTab} 
          onClearTargetUid={() => setViewingTargetUid(undefined)} 
        />
      )}

      <View style={{ flex: 1, flexDirection: 'column' }}>
        <View style={appStyles.header}>
          <Text style={appStyles.welcomeText}>
            {user ? `NFCTT Panel (${user.email})` : "NFCTT Akıllı Güvence Sistemi"}
          </Text>
          
          <TouchableOpacity onPress={handleLogoutOrRedirect}>
            <Text style={{ color: user ? 'red' : '#007AFF', fontWeight: 'bold' }}>
              {user ? 'Çıkış Yap' : 'Sisteme Giriş Yap'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, backgroundColor: '#fafafa', paddingBottom: (isMobile && user) ? 68 : 0 }}> 
          {renderContent()}
        </View>
      </View>

      {user && isMobile && (
        <NavigationMenu 
          navigation={fakeNavigation} 
          activeScreen={activeTab} 
          onClearTargetUid={() => setViewingTargetUid(undefined)} 
        />
      )}

    </View>
  );
}

const menuStyles = StyleSheet.create({
  sideBar: { flexDirection: 'column', width: 240, height: '100%', backgroundColor: '#ffffff', borderRightWidth: 0.5, borderColor: '#e5e5ea', paddingTop: 30, paddingHorizontal: 15 },
  barItemDesktop: { flexDirection: 'row', alignItems: 'center', width: '100%', height: 50, borderRadius: 10, paddingLeft: 10, marginBottom: 8 },
  logoContainer: { marginBottom: 40, paddingLeft: 10 },
  logoText: { fontSize: 22, fontWeight: 'bold', letterSpacing: 1 },
  bottomBar: { flexDirection: 'row', height: Platform.OS === 'ios' ? 85 : 68, backgroundColor: '#ffffff', borderTopWidth: 0.5, borderColor: '#e5e5ea', justifyContent: 'space-around', alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 18 : 0, position: 'absolute', bottom: 0, left: 0, right: 0, elevation: 8, zIndex: 999 },
  barItemMobile: { alignItems: 'center', justifyContent: 'center', flex: 1, height: '100%' },
  barText: { fontSize: 15, color: '#8e8e93', fontWeight: '500', marginLeft: 15 },
  activeText: { color: '#000000', fontWeight: '700' }
});

const appStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#ddd', height: 65, alignItems: 'center' },
  welcomeText: { fontWeight: 'bold', color: '#333' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});