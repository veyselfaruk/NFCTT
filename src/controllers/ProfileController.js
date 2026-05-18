import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export const saveProfileToFirebase = async (profilePack) => {
  try {
    // Giriş yapan kullanıcının UID'sini auth modülünden dinamik çekiyoruz
    const currentUser = auth().currentUser;
    const userId = currentUser ? currentUser.uid : 'anonymous_user';

    // Frankfurt Firestore'a gidecek paketi hazırlıyoruz
    const dataToSend = {
      userId: userId,
      dependent: profilePack.dependent, // Telefon logunda gördüğümüz bağımlı (kedi/çocuk) bilgileri
      parent: profilePack.parent,       // Telefon logunda gördüğümüz veli bilgileri
      createdAt: firestore.FieldValue.serverTimestamp(), // Frankfurt saatiyle kayıt zamanı
    };

    console.log("Frankfurt'a gönderilecek nihai Firestore paketi: ", JSON.stringify(dataToSend));

    // 'profiles' koleksiyonuna velinin benzersiz userId'si ile doküman açıp yazıyoruz
    await firestore()
      .collection('profiles')
      .doc(userId)
      .set(dataToSend, { merge: true }); // merge: true eski alanları korur, yenileri üzerine yazar

    return { success: true };
  } catch (error) {
    console.error("Firestore'a veri yazılırken Frankfurt'ta hata oluştu:", error);
    return { success: false, error };
  }
};