import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const firebaseConfig = {
  apiKey: "AIzaSyC9h3VYZ-Ch40eaBH6dAJEApjD3Vg8VGHM",
  authDomain: "nfc-tt-7c604.firebaseapp.com",
  projectId: "nfc-tt-7c604",
  storageBucket: "nfc-tt-7c604.firebasestorage.app",
  messagingSenderId: "320574488770",
  appId: "1:320574488770:web:7331e60aeec19f6d857b5b"
};

// Firebase'i başlatıyoruz
const app = initializeApp(firebaseConfig);

// Dışarıya aktaracağımız servisleri Web standartlarında oluşturuyoruz
const db = getFirestore(app);
const storage = getStorage(app);

// KANKA KİLİTLENMEYİ ÇÖZEN YER: Auth'u Expo Go/React Native hafızasıyla başlatıyoruz
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Hepsini tertemiz dışarı aktarıyoruz
export { db, storage, auth, app };