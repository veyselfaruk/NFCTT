import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// 1. KANKA BİZİM KORUMALI KATMANI DOĞRUDAN BURAYA BAĞLADIK
// db ile birlikte hafıza (AsyncStorage) korumalı olan auth motorunu da çekiyoruz
import { db, auth } from './src/config/firebaseConfig'; 

// KANKA: onAuthStateChanged motorunu da doğrudan bizim config'deki auth ile eşleşecek şekilde import alanından çektik, 
// böylece yukarıdaki sinsi kütüphane bağlantısını tamamen sıfırladık!
import { onAuthStateChanged } from 'firebase/auth'; 

// Ekranlarımızı çağırıyoruz
import LoginScreen from './src/screens/UniversalLoginScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import HomeScreen from './src/views/Home';
import ProfileScreen from './src/screens/ProfileScreen'; 
// KANKA: Navigasyonun tanımadığı o şanlı ChatList sayfasını buraya import ettik!
import ChatList from './src/views/ChatList';
import ChatScreen from './src/views/ChatScreen'; //  DOĞRU
import { LogBox } from 'react-native';

// KANKA: Firebase'in o hatalı ve inatçı AsyncStorage uyarısını terminalden tamamen gizliyoruz
LogBox.ignoreLogs([
  '@firebase/auth: Auth (12.13.0): You are initializing Firebase Auth for React Native without providing AsyncStorage'
]);

const Stack = createStackNavigator();

const App = () => {
  const [initializing, setInitializing] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Kanka buradaki ham "const auth = getAuth();" sızıntısını tamamen sildik, 
    // artık direkt yukarıda import ettiğimiz korumalı hafızayı dinliyor:
    const unsubscribe = onAuthStateChanged(auth, (userState) => {
      setUser(userState);
      if (initializing) setInitializing(false);
    });

    return unsubscribe; // cleanup (bileşen kapandığında dinlemeyi durdurur)
  }, [initializing]);

  // Yükleme ekranı (Boş beyaz ekranda kalmamak için)
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>NFCTT Hazırlanıyor...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // Giriş yapıldıysa korumalı ekranlar açılacak kanka
          <>
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
            <Stack.Screen name="ChatList" component={ChatList} />
            <Stack.Screen name="ChatScreen" component={ChatScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;