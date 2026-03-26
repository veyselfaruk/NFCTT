import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import auth from '@react-native-firebase/auth';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, Button, SafeAreaView } from 'react-native';

// Ekranlarımızı çağırıyoruz
import LoginScreen from './src/screens/LoginScreen';

const Stack = createStackNavigator();

// Geçici Ana Sayfa Bileşeni
const HomeScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 20, marginBottom: 20 }}>Frankfurt'a Bağlandın! Burası Ana Sayfa.</Text>
    <Button title="Çıkış Yap" onPress={() => auth().signOut()} />
  </View>
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
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    return subscriber; // cleanup
  }, []);

  if (initializing) return null;

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