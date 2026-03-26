import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebaseConfig"; // Az önce oluşturduğumuz config

export const getProfileForWeb = async (tagId) => {
    try {
        // Veysel'in Android'de 'profiles' koleksiyonuna attığı dökümanı web'den çağırıyoruz
        const docRef = doc(db, "profiles", tagId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            console.log("Veri çekildi:", docSnap.data());
            return docSnap.data();
        } else {
            console.log("NFC ID bulunamadı!");
            return null;
        }
    } catch (error) {
        console.error("Web Firebase Hatası:", error);
        return null;
    }
};