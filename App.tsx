import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, Text, Button, SafeAreaView, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// 1. ÖNCE FIREBASE ANA MODÜLÜ VE CONFIG
import firebase from '@react-native-firebase/app';

// 2. FIREBASE'İ HEMEN BAŞLAT (AUTH'DAN ÖNCE OLMALI)
if (!firebase.apps.length) {
    try {
        firebase.initializeApp({
            apiKey: "AIzaSyBcGJotzPVS6XcTD2IxMk5BQZkSm-gQapE", 
            appId: "1:320574488770:android:37cbbb1b6a178a30857b5b",
            projectId: "nfc-tt-7c604",
            databaseURL: "https://nfc-tt-7c604-default-rtdb.europe-west1.firebasedatabase.app",
            messagingSenderId: "320574488770",
            storageBucket: "nfc-tt-7c604.appspot.com"
    });
    } catch (err) {
        console.error("Firebase başlatma hatası:", err);
    }
}

// 3. ŞİMDİ DİĞER FIREBASE SERVİSLERİNİ ÇAĞIRABİLİRİZ
import auth from '@react-native-firebase/auth';

// Ekranlarımızı çağırıyoruz
// Eski LoginScreen importunu sil, bunu ekle:
import LoginScreen from './src/screens/UniversalLoginScreen';

const Stack = createStackNavigator();

// Geçici Ana Sayfa Bileşeni
const HomeScreen = () => (
  <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 20, marginBottom: 20 }}>Frankfurt'a Bağlandın! Burası Ana Sayfa.</Text>
    <Button title="Çıkış Yap" onPress={() => auth().signOut()} />
  </SafeAreaView>
);

const App = () => {
  const [initializing, setInitializing] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);

  // Kullanıcı oturum durumunu izle
  function onAuthStateChanged(userState: any) {
    setUser(userState);
    if (initializing) setInitializing(false);
  }

  useEffect(() => {
    // Firebase auth dinleyicisini başlat
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    return subscriber; // cleanup
  }, []);

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
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;