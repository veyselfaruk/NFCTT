import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; // KANKA: Storage motoru import edildi
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';

// KANKA: createAsyncStorage yerine doğrudan ham AsyncStorage importunu çekiyoruz!
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sol taraftaki google-services.json dosyasından aldığımız yüzde yüz gerçek kimlik bilgileri:
const firebaseConfig = {
  apiKey: "AIzaSyC9h3VYZ-Ch40eaBH6dAJEApjD3Vg8VGHM", 
  authDomain: "nfc-tt-7c604.firebaseapp.com",
  projectId: "nfc-tt-7c604",
  storageBucket: "nfc-tt-7c604.firebasestorage.app",
  messagingSenderId: "32054488770", 
  appId: "1:32054488770:web:7331e60aeec19f6d857b5b"
};

// 1. Firebase App Başlatma Kontrolü
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. TAŞ GİBİ HAFIZALI AUTH MOTORU KURULUMU
/** @type {import('firebase/auth').Auth} */
let auth;

try {
  // KANKA: Firebase'in o inatçı terminal uyarısını fırlatan mekanizmasını ezmek için,
  // dokümantasyonda uyarının içinde sana önerdiği v2 formatındaki saf AsyncStorage nesnesini doğrudan veriyoruz:
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  // Hot reload esnasında zaten initialize edildiyse güvenli limana sığın:
  auth = getAuth(app);
}

// 3. Servisleri başlatıp dışarı aktarıyoruz kanka
const db = getFirestore(app);
const storage = getStorage(app); // KANKA: Storage mermi gibi buraya bağlandı

export { app, auth, db, storage };