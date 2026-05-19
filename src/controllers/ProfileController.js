import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getAuth } from 'firebase/auth'; // Web auth yapısı için ekledik

export const saveProfileToFirebase = async (profilePack) => {
  try {
    // Giriş yapan kullanıcının UID'sini Web Auth modülünden dinamik çekiyoruz
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const userId = currentUser ? currentUser.uid : 'anonymous_user';

    // Frankfurt Firestore'a gidecek paketi hazırlıyoruz
    const dataToSend = {
      userId: userId,
      dependent: profilePack.dependent, // Bağımlı (çocuk/evcil hayvan/yaşlı) bilgileri
      parent: profilePack.parent,       // Veli bilgileri (Yeni il ve ilçe de dahil)
      createdAt: serverTimestamp(),     // Frankfurt saatiyle kayıt zamanı (Web formatında)
    };

    console.log("Frankfurt'a gönderilecek nihai Web Firestore paketi: ", JSON.stringify(dataToSend));

    // 'profiles' koleksiyonuna velinin benzersiz userId'si ile doküman açıp yazıyoruz (Web Standartı)
    const docRef = doc(db, 'profiles', userId);
    await setDoc(docRef, dataToSend, { merge: true }); // merge: true eski alanları korur, yenileri üzerine yazar

    return { success: true };
  } catch (error) {
    console.error("Firestore'a veri yazılırken Frankfurt'ta hata oluştu:", error);
    return { success: false, error };
  }
};