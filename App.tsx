import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { db, auth } from './src/config/firebaseConfig'; 
import { onAuthStateChanged } from 'firebase/auth'; 
import { doc, getDoc } from 'firebase/firestore'; 

import UniversalLoginScreen from './src/screens/UniversalLoginScreen';
import RegisterScreen from './src/screens/RegisterScreen'; 
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import HomeScreen from './src/views/Home';
import ProfileScreen from './src/screens/ProfileScreen'; 
import ChatList from './src/views/ChatList';
import ChatScreen from './src/views/ChatScreen'; 
import NfcScreen from './src/screens/NfcScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen'; 
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  '@firebase/auth: Auth (12.13.0): You are initializing Firebase Auth for React Native without providing AsyncStorage'
]);

const Stack = createStackNavigator();

const LoadingPlaceholder = () => (
  <View style={{ flex: 1, backgroundColor: '#f8f9fa' }} />
);

// 📡 DEEP LINKING CONFIGURATION Protokolü (2. ADIM)
const linking = {
  prefixes: ['nfctt://'],
  config: {
    screens: {
      // 📍 nfctt://profile/UID formatındaki linki yakalayıp ProfileScreen'e yönlendirir kanka
      ProfileScreen: 'profile/:targetUid',
    },
  },
};

const App = () => {
  const [initializing, setInitializing] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (userState) => {
      setUser(userState);
      
      if (userState) {
        try {
          console.log(`[Kök Doğrulama] Kullanıcı giriş yaptı... UID: ${userState.uid}`);
          const profileRef = doc(db, "profiles", userState.uid);
          const profileSnap = await getDoc(profileRef);
          
          if (profileSnap.exists()) {
            console.log("Kayıtlı profil Firestore üzerinde başarıyla doğrulandı!");
            setHasProfile(true);
          } else {
            console.log("Bu UID ile eşleşen bir profil dökümanı bulunamadı.");
            setHasProfile(false);
          }
        } catch (error) {
          console.error("[Kök Doğrulama Hatası] Profil durumu okunamadı:", error);
          setHasProfile(false);
        }
      } else {
        setHasProfile(null);
      }
      
      setInitializing(false);
    });

    return unsubscribe; 
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
        <ActivityIndicator size="large" color="#1c1c1e" />
        <Text style={{ marginTop: 14, fontSize: 14, color: '#8e8e93', fontWeight: '500', letterSpacing: 0.3 }}>
          NFCTT Hazırlanıyor...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      {/* 👑 DEEP LINKING YAPILANDIRMASINI CONTAINER'A BAĞLADIK KANKA */}
      <NavigationContainer linking={linking}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            hasProfile === null ? (
              <Stack.Screen name="LoadingPlaceholder" component={LoadingPlaceholder} />
            ) : hasProfile ? (
              <>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
                <Stack.Screen name="Nfc" component={NfcScreen} />
                <Stack.Screen name="ChatList" component={ChatList} />
                <Stack.Screen name="ChatScreen" component={ChatScreen} />
                <Stack.Screen name="ProfileSetupScreen" component={ProfileSetupScreen} />
              </>
            ) : (
              <>
                <Stack.Screen name="ProfileSetupScreen" component={ProfileSetupScreen} />
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
                <Stack.Screen name="Nfc" component={NfcScreen} />
                <Stack.Screen name="ChatList" component={ChatList} />
                <Stack.Screen name="ChatScreen" component={ChatScreen} />
              </>
            )
          ) : (
            <>
              <Stack.Screen name="UniversalLoginScreen" component={UniversalLoginScreen} />
              <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
              <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

export default App;