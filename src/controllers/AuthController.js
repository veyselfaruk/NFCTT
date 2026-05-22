// KANKA BİZİM KORUMALI KATMANI BURAYA BAĞLADIK
// firebaseConfig dosyanız src/config altında, bu dosya da src/controllers altındaysa iki nokta (../) ile dışarı çıkıp bağlanıyoruz
import { auth } from '../config/firebaseConfig'; 
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth'; 

// 1. Yeni Kullanıcı Kaydı (Register)
export const signUp = async (email, password) => {
  try {
    // Kanka buradaki ham "const auth = getAuth();" sızıntısını sildik, yukarıdaki korumalı auth'u kullanıyor
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("Kullanıcı kaydı başarıyla oluşturuldu.");
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error("Kayıt işlemi sırasında bir hata oluştu:", error.message);
    return { success: false, error: error.message };
  }
};

// 2. Mevcut Kullanıcı Girişi (Login)
export const signIn = async (email, password) => {
  try {
    // Kanka buradaki ham "const auth = getAuth();" sızıntısını da sildik
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Kullanıcı oturumu başarıyla açıldı.");
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error("Giriş işlemi sırasında bir hata oluştu:", error.message);
    return { success: false, error: error.message };
  }
};