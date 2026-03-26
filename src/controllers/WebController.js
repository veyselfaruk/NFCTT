import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebaseConfig"; // Daha önce oluşturduğumuz config

export const getProfileForWeb = async (tagId) => {
    try {
        const docRef = doc(db, "profiles", tagId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            console.log("ID Bulunamadı!");
            return null;
        }
    } catch (error) {
        console.error("Firebase Web Hatası:", error);
        return null;
    }
};