import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
// KANKA BİZİM KORUMALI KATMANI BURAYA BAĞLADIK
// db ile birlikte hafıza korumalı olan auth motorunu da config dosyamızdan çekiyoruz
import { db, auth } from '../config/firebaseConfig'; 

// KANKA: Sinsi sızıntı yapan "import { getAuth } from 'firebase/auth';" satırını buradan tamamen temizledik!

export const saveProfileToFirebase = async (profilePack) => {
  try {
    // Kanka burmadaki ham "const auth = getAuth();" sızıntısını tamamen sildik,
    // artık direkt yukarıda import ettiğimiz korumalı auth'un currentUser nesnesini okuyor:
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
    
    // Veritabanına güvenli yazma işlemi kanka, yapıyı hiç bozmadan aynen koruduk
    await setDoc(docRef, dataToSend, { merge: true }); 

    return { success: true };
  } catch (error) {
    // Hatayı sadece biz terminalde görelim diye logluyoruz:
    console.error("Arka plan senkronizasyon hatası:", error);
    
    // Ekrana teknik detay fırlatmasın, Screen'deki try-catch bloğuna "Hata var, sen devral" diyoruz
    throw new Error("Senkronizasyon hatası"); 
  }
};