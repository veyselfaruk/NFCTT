import auth from '@react-native-firebase/auth';

// 1. Yeni Kullanıcı Kaydı (Register)
export const signUp = async (email, password) => {
  try {
    await auth().createUserWithEmailAndPassword(email, password);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 2. Mevcut Kullanıcı Girişi (Login)
export const signIn = async (email, password) => {
  try {
    await auth().signInWithEmailAndPassword(email, password);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 3. Çıkış Yap (Logout)
export const signOut = async () => {
  try {
    await auth().signOut();
  } catch (error) {
    console.error("Çıkış hatası:", error);
  }
};