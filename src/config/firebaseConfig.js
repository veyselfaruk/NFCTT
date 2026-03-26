import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC9h3VYZ-Ch40eaBH6dAJEApjD3Vg8VGHM",
  authDomain: "nfc-tt-7c604.firebaseapp.com",
  projectId: "nfc-tt-7c604",
  storageBucket: "nfc-tt-7c604.firebasestorage.app",
  messagingSenderId: "320574488770",
  appId: "1:320574488770:web:7331e60aeec19f6d857b5b"
};

// Uygulamayı başlat ve veritabanını (Firestore) dışa aktar
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);