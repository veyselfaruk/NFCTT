import firestore from '@react-native-firebase/firestore';

// Frankfurt Firestore'a profil kaydeden fonksiyon
export const saveProfileToFirebase = async (profileData) => {
    try {
        const profileRef = firestore().collection('profiles').doc(profileData.tagId);
        await profileRef.set(profileData);
        console.log("Başarılı: Veri Frankfurt'a uçtu!");
        return { success: true };
    } catch (error) {
        console.error("Firebase Hatası: ", error);
        return { success: false, error };
    }
};