// KANKA BİZİM KORUMALI KATMANI ÇAĞIRIYORUZ
// app yerine doğrudan hafıza korumalı auth motorunu config dosyamızdan çekiyoruz
import { auth } from "../config/firebaseConfig"; 
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"; 

// KANKA: Kullanılmayan sinsi signOut importunu ve fazla kütüphane bağlarını temizledik!
// Artık aşağıdaki fonksiyonlar direkt yukarıda import ettiğimiz korumalı auth'u kullanacak.

export const signUp = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};