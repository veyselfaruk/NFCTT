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

// =========================================================================
// 📱 COMPONENT: RESPONSIVE MENU (MASAÜSTÜNDE SOLDA, MOBİLDE ALTA GEÇER)
// =========================================================================
interface MenuProps {
  navigation: any;
  activeScreen: 'Home' | 'Settings' | 'NFC' | 'Chat' | 'Profile';
  onClearTargetUid: () => void; // Kendi profiline basınca bulucu modunu sıfırlayacak tetikleyici kanka
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
        onClearTargetUid(); // Profilim sekmesine tıklanınca eski bulucu modunu temizle reis
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

      {/* 2. MESAJLAR */}
      <TouchableOpacity style={itemStyle} onPress={() => handleTabPress('ChatList')}>
        <Ionicons 
          name={activeScreen === 'Chat' ? "chatbox-ellipses" : "chatbox-ellipses-outline"} 
          size={isMobile ? 22 : 24} 
          color={activeScreen === 'Chat' ? activeColor : inactiveColor} 
        />
        {!isMobile && <Text style={[menuStyles.barText, activeScreen === 'Chat' && menuStyles.activeText]}>Mesajlar</Text>}
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

      {/* 4. PROFİLİM */}
      <TouchableOpacity style={itemStyle} onPress={() => handleTabPress('ProfileScreen')}>
        <Ionicons 
          name={activeScreen === 'Profile' ? "person" : "person-outline"} 
          size={isMobile ? 22 : 24} 
          color={activeScreen === 'Profile' ? activeColor : inactiveColor} 
        />
        {!isMobile && <Text style={[menuStyles.barText, activeScreen === 'Profile' && menuStyles.activeText]}>Profilim</Text>}
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
  
  // 🔥 ARANAN ANA STATE: Doğru hiyerarşide, component seviyesinde tanımlandı kral!
  const [viewingTargetUid, setViewingTargetUid] = useState<string | undefined>(undefined);

  // Tag sorgulama state'leri
  const [tagId, setTagId] = useState(''); 
  const [profile, setProfile] = useState<any>(null); 
  const [loading, setLoading] = useState(false);

  useEffect(() => {
  async function prepareApp() {
    try {
      if (Platform.OS === 'web') {
        // Mevcut oturum kontrol kodun burada kalacak kanka:
        const savedUser = localStorage.getItem('nfctt_user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }

        // TAM BURAYA ŞU FONT YÜKLEME SATIRINI EKLE:
        await Font.loadAsync({
          'Ionicons': require('./src/fonts/Ionicons.b4eb097d35f44ed943676fd56f6bdc51.ttf'), 
          // Not: Dosya konumuna göre yolunu (../) gerekirse ayarlarsın.
        });
      }
    } catch (error) {
      console.log("Hazırlık hatası:", error);
    } finally {
      setIsCheckingAuth(false);
      setFontsLoaded(true); // Yükleme bittiğinde kilidi açıyoruz
    }
  }

  prepareApp();
}, []);

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    if (Platform.OS === 'web') {
      localStorage.setItem('nfctt_user', JSON.stringify(userData));
    }
  };

  const handleLogout = () => {
    setUser(null);
    if (Platform.OS === 'web') {
      localStorage.removeItem('nfctt_user');
    }
  };

  const fakeNavigation = {
    navigate: (obj: any) => {
      if(obj.name === 'ProfileSetup') setActiveTab('Settings');
      if(obj.name === 'Home') setActiveTab('Home');
      if(obj.name === 'Nfc') setActiveTab('NFC');
      if(obj.name === 'ChatList') setActiveTab('Chat');
      if(obj.name === 'ProfileScreen') {
        setViewingTargetUid(undefined); // Manuel geçişlerde temizle kanka
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

  const handleSearch = async () => {
    if (!tagId) {
      alert("ID girmeden Frankfurt hattını meşgul etme kral!");
      return;
    }
    setLoading(true);
    try {
      const data = await getProfileForWeb(tagId);
      if (data) {
        setProfile(data);
      } else {
        alert("Böyle bir ID yok, Frankfurt'tan eli boş döndük.");
      }
    } catch (error) {
      console.log("Arama hatası:", error);
    } finally {
      setLoading(false);
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
              // Kayıt başarıyla bitince otomatik olarak Profil tabına zıplatıyoruz kralı!
              setActiveTab('Profile');
            }} 
          />
        );
      case 'Profile':
        return <WebProfileView targetUid={viewingTargetUid} />;
      case 'NFC':
        return (
          <WebNfcView 
            onNavigateToProfile={(targetUid) => {
              setViewingTargetUid(targetUid); // Hedef UID buraya mühürlendi
              setActiveTab('Profile');       // Profil sekmesine fırlattık kanka
            }} 
          />
        );
    }
  };

  if (isCheckingAuth) {
    return (
      <View style={appStyles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Oturum kontrol ediliyor...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1 }}>
        <WebLoginScreen onLoginSuccess={handleLoginSuccess} />
      </View>
    );
  }

  return (
    <View style={[appStyles.container, { flexDirection: isMobile ? 'column' : 'row' }]}>
      
      {!isMobile && (
        <NavigationMenu 
          navigation={fakeNavigation} 
          activeScreen={activeTab} 
          onClearTargetUid={() => setViewingTargetUid(undefined)} 
        />
      )}

      <View style={{ flex: 1, flexDirection: 'column' }}>
        <View style={appStyles.header}>
          <Text style={appStyles.welcomeText}>NFCTT Panel ({user.email})</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={{color: 'red', fontWeight: 'bold'}}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, backgroundColor: '#fafafa', paddingBottom: isMobile ? 68 : 0 }}> 
          {renderContent()}
        </View>
      </View>

      {isMobile && (
        <NavigationMenu 
          navigation={fakeNavigation} 
          activeScreen={activeTab} 
          onClearTargetUid={() => setViewingTargetUid(undefined)} 
        />
      )}

    </View>
  );
}

// =========================================================================
// 🎨 STYLES: COMPONENT STYLES
// =========================================================================
const menuStyles = StyleSheet.create({
  sideBar: { 
    flexDirection: 'column',
    width: 240,
    height: '100%',
    backgroundColor: '#ffffff', 
    borderRightWidth: 0.5,
    borderColor: '#e5e5ea', 
    paddingTop: 30,
    paddingHorizontal: 15,
  },
  barItemDesktop: { 
    flexDirection: 'row',
    alignItems: 'center', 
    width: '100%',
    height: 50,
    borderRadius: 10,
    paddingLeft: 10,
    marginBottom: 8,
  },
  logoContainer: { marginBottom: 40, paddingLeft: 10 },
  logoText: { fontSize: 22, fontWeight: 'bold', letterSpacing: 1 },

  bottomBar: { 
    flexDirection: 'row', 
    height: Platform.OS === 'ios' ? 85 : 68, 
    backgroundColor: '#ffffff', 
    borderTopWidth: 0.5, 
    borderColor: '#e5e5ea', 
    justifyContent: 'space-around', 
    alignItems: 'center', 
    paddingBottom: Platform.OS === 'ios' ? 18 : 0,
    position: 'absolute', 
    bottom: 0, left: 0, right: 0,
    elevation: 8,
    zIndex: 999
  },
  barItemMobile: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    flex: 1,
    height: '100%'
  },
  barText: { 
    fontSize: 15, 
    color: '#8e8e93', 
    fontWeight: '500',
    marginLeft: 15, 
  },
  activeText: { color: '#000000', fontWeight: '700' }
});

const appStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 15, 
    backgroundColor: 'white', 
    borderBottomWidth: 1, 
    borderColor: '#ddd',
    height: 65,
    alignItems: 'center'
  },
  welcomeText: { fontWeight: 'bold', color: '#333' },
  searchBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  input: { 
    width: '100%', 
    maxWidth: 400, 
    backgroundColor: 'white', 
    padding: 15, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#ddd',
    marginBottom: 15 
  },
  searchButton: { 
    backgroundColor: '#007AFF', 
    padding: 15, 
    borderRadius: 10, 
    width: '100%', 
    maxWidth: 400, 
    alignItems: 'center' 
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerText: { textAlign: 'center', marginTop: 50, fontSize: 18, color: '#666' },
  backButton: { padding: 20 }
});