import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// db ile birlikte hafıza (AsyncStorage) korumalı olan auth motorunu çekiyoruz
import { db, auth } from './src/config/firebaseConfig'; 

// onAuthStateChanged motorunu dinliyoruz
import { onAuthStateChanged } from 'firebase/auth'; 

// Ekranlarımızı çağırıyoruz
import LoginScreen from './src/screens/UniversalLoginScreen';
import RegisterScreen from './src/screens/RegisterScreen'; // KANKA: Eksik olan import eklendi
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import HomeScreen from './src/views/Home';
import ProfileScreen from './src/screens/ProfileScreen'; 
import ChatList from './src/views/ChatList';
import ChatScreen from './src/views/ChatScreen'; 
import { LogBox } from 'react-native';

// Firebase'in o hatalı ve inatçı AsyncStorage uyarısını terminalden gizliyoruz
LogBox.ignoreLogs([
  '@firebase/auth: Auth (12.13.0): You are initializing Firebase Auth for React Native without providing AsyncStorage'
]);

const Stack = createStackNavigator();

const App = () => {
  const [initializing, setInitializing] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (userState) => {
      setUser(userState);
      if (initializing) setInitializing(false);
    });

    return unsubscribe; // cleanup
  }, [initializing]);

  // Yükleme ekranı (Boş beyaz ekranda kalmamak için)
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
        {/* KANKA: Yükleme ikonunu da kurumsal antrasit yaptık */}
        <ActivityIndicator size="large" color="#1c1c1e" />
        <Text style={{ marginTop: 14, fontSize: 14, color: '#8e8e93', fontWeight: '500', letterSpacing: 0.3 }}>
          NFCTT Hazırlanıyor...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        
        {/* KANKA: ProfileSetup'ı ortak alana çekmek için yukarıdan sildik */}
        {user ? (
          // === KORUMALI KATMAN (GİRİŞ YAPILDIYSA) ===
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
            <Stack.Screen name="ChatList" component={ChatList} />
            <Stack.Screen name="ChatScreen" component={ChatScreen} />
          </>
        ) : (
          // === DIŞ KATMAN (GİRİŞ YAPILMADIYSA) ===
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
          </>
        )}

        {/* 🔥 KANKA: İŞTE GEÇİŞ ESNASINDA NAVIGATORÜN HER İKİ TARAFTA DA BULABİLMESİ İÇİN BURAYA ALDIK! */}
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;