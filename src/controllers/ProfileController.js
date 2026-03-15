import firestore from '@react-native-firebase/firestore';

// Frankfurt Firestore'a profil kaydeden fonksiyon
export const saveProfileToFirebase = async (profileData) => {
    try {
        await firestore()
            .collection('Profiles') // Frankfurt'taki koleksiyon adı
            .doc(profileData.tagId) // NFC etiketinin benzersiz ID'si
            .set(profileData);
        
        console.log("Başarılı: Veri Frankfurt'a uçtu!");
        return { success: true };
    } catch (error) {
        console.error("Firebase Hatası: ", error);
        return { success: false, error };
    }
};