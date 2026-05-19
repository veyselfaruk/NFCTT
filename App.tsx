import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// 1. YENİ SAF WEB FIREBASE BAĞLANTILARINI ÇAĞIRIYORUZ
// Zaten firebaseConfig.js içinde initializeApp yapıldığı için burada bir daha başlatmaya gerek yok.
import { db } from './src/config/firebaseConfig'; 
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Ekranlarımızı çağırıyoruz
import LoginScreen from './src/screens/UniversalLoginScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import HomeScreen from './src/views/Home';

const Stack = createStackNavigator();

const App = () => {
  const [initializing, setInitializing] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Web SDK auth servisini alıyoruz
    const auth = getAuth();

    // Kullanıcı oturum durumunu izleyen yeni web dinleyicisi
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
          // Giriş yapıldıysa önce Profil Kurulumu açılacak
          <>
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;