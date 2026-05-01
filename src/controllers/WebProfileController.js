import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebaseConfig"; // Az önce oluşturduğumuz config
import { Profile } from "../models/Profile";

export const getProfileForWeb = async (tagId) => {
    try {
        const docSnap = await getDoc(doc(db, "profiles", tagId));
        if (docSnap.exists()) {
            // HAM VERİYİ MODEL'E DÖNÜŞTÜRÜYORUZ
            return new Profile(docSnap.data()); 
        }
        return null;
    } catch (error) {
        return null;
    }
};