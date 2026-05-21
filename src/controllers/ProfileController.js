import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getAuth } from 'firebase/auth'; 

export const saveProfileToFirebase = async (profilePack) => {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const userId = currentUser ? currentUser.uid : 'anonymous_user';

    const dataToSend = {
      userId: userId,
      dependent: profilePack.dependent, 
      parent: profilePack.parent,       
      createdAt: serverTimestamp(),     
    };

    // Geliştirici konsol logu (Üretim modunda son kullanıcı bunu görmez kanka)
    console.log("Veri paketi senkronizasyona hazır.");

    const docRef = doc(db, 'profiles', userId);
    
    // Veritabanına güvenli yazma işlemi
    await setDoc(docRef, dataToSend, { merge: true }); 

    return { success: true };
  } catch (error) {
    // Hatayı sadece biz terminalde görelim diye logluyoruz:
    console.error("Arka plan senkronizasyon hatası:", error);
    
    // Ekrana teknik detay fırlatmasın, Screen'deki try-catch bloğuna "Hata var, sen devral" diyoruz
    throw new Error("Senkronizasyon hatası"); 
  }
};