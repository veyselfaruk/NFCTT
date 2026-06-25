import React, { useState } from 'react';
import { 
  View, TextInput, TouchableOpacity, Text, 
  StyleSheet, Alert, Platform, ActivityIndicator, ScrollView, KeyboardAvoidingView, ImageBackground 
} from 'react-native';

// Controller importları (Hem login hem signUp fonksiyonlarını içeri aldık kral)
import { signIn as mobileSignIn, signUp as mobileSignUp } from '../controllers/AuthController';
import { signIn as webSignIn, signUp as webSignUp } from '../controllers/WebAuthController'; 

// Firebase modülleri ve Şifre Sıfırlama metodu
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { auth } from '../config/firebaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';

// 🎯 TYPESCRIPT TİP TANIMI TAMİR EDİLDİ: isRegisterMode prop olarak buraya eklendi kanka
interface LoginScreenProps {
  navigation?: any;
  onLoginSuccess?: (user: any) => void;
  isRegisterMode?: boolean; // <-- Dışarıdan gelecek emir için kapıyı açtık
}

const UniversalLoginScreen = ({ navigation, onLoginSuccess, isRegisterMode: initialRegisterMode = false }: LoginScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 🔥 WEB İÇİN REKOR UX: İlk değeri dışarıdan gönderdiğimiz talimata (initialRegisterMode) bağlıyoruz kral!
  // Eğer app.web.tsx'ten true gelirse direkt Kayıt Ol ekranıyla doğacak.
  const [isRegisterMode, setIsRegisterMode] = useState(initialRegisterMode);

  // Ortak Bildirim Fonksiyonu
  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // === ŞİFREMİ UNUTTUM MOTORU ===
  const handleForgotPassword = () => {
    if (!email.trim()) {
      notify('E-posta Gerekli', 'Şifre sıfırlama bağlantısı gönderebilmemiz için lütfen önce e-posta alanını doldurun.');
      return;
    }

    const sendReset = async () => {
      try {
        await sendPasswordResetEmail(auth, email.trim());
        notify('Başarılı', 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Gereksiz (Spam) klasörünü kontrol etmeyi unutmayın.');
      } catch (error: any) {
        console.error("Şifre sıfırlama hatası:", error);
        notify('Hata', 'E-posta gönderilirken bir sorun oluştu. Lütfen adresi kontrol edin.');
      }
    };

    if (Platform.OS === 'web') {
      if (confirm(`${email.trim()} adresine şifre sıfırlama bağlantısı gönderilsin mi?`)) {
        sendReset();
      }
    } else {
      Alert.alert(
        'Şifre Sıfırlama',
        `${email.trim()} adresine şifre sıfırlama bağlantısı gönderilsin mi?`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Gönder', onPress: sendReset }
        ]
      );
    }
  };

  // === AUTH GİRİŞ VE KAYIT MOTORU ===
  const handleAuth = async (type: 'login' | 'register') => {
    if (!email || !password) {
      notify('Uyarı', 'Lütfen tüm alanları eksiksiz doldurun.');
      return;
    }

    setLoading(true);
    let result: any;

    try {
      if (Platform.OS === 'web') {
        result = type === 'login' ? await webSignIn(email, password) : await webSignUp(email, password);
      } else {
        result = type === 'login' ? await mobileSignIn(email, password) : await mobileSignUp(email, password);
      }
    } catch (err: any) {
      result = { success: false, error: err.message };
    }

    if (result && result.success) {
      const loggedInUser = result.user; 

      if (type === 'login') {
        if (Platform.OS !== 'web' && loggedInUser) {
          setLoading(true); 
          
          try {
            console.log("Kullanıcı giriş yaptı, profil kontrolü tetikleniyor... UID:", loggedInUser.uid);
            const db = getFirestore();
            const profileRef = doc(db, "profiles", loggedInUser.uid); 
            const profileSnap = await getDoc(profileRef);

            if (profileSnap.exists()) {
              console.log("Kayıtlı profil Firestore üzerinde başarıyla doğrulandı!");
              if (onLoginSuccess) onLoginSuccess(loggedInUser);
              setLoading(false);
              return; 
            } else {
              console.log("Bu UID ile eşleşen bir profil dökümanı bulunamadı.");
              if (onLoginSuccess) onLoginSuccess(loggedInUser);
              setLoading(false);
              navigation.replace('ProfileSetupScreen', { fullName: loggedInUser.displayName });
              return;
            }
          } catch (dbErr) {
            console.error("Firestore profil sorgulama hatası:", dbErr);
            if (onLoginSuccess) onLoginSuccess(loggedInUser);
            setLoading(false);
            navigation.replace('ProfileSetupScreen', { fullName: loggedInUser.displayName });
            return;
          }
        }
      }

      setLoading(false);
      notify('Başarılı', type === 'login' ? 'Giriş başarılı.' : 'Kayıt işlemi başarılı. Panelinize yönlendiriliyorsunuz kral!');
      
      if (onLoginSuccess && loggedInUser) {
        onLoginSuccess(loggedInUser);
      }
    } else {
      setLoading(false);
      notify('Hata', result?.error || 'Bir sorun oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleToggleRegisterMode = () => {
    if (Platform.OS === 'web') {
      setIsRegisterMode(!isRegisterMode); 
    } else {
      if (navigation) navigation.navigate('RegisterScreen'); 
    }
  };

  return (
    <ImageBackground 
      source={require('../../assets/login_bg.png')} 
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* INPUT FORM KARTI */}
          <View style={styles.card}>
            
            <View style={styles.internalBrandContainer}>
              <Text style={styles.brandTitle}>NFCTT</Text>
              <Text style={styles.brandSubtitle}>
                {Platform.OS === 'web' 
                  ? (isRegisterMode ? 'Bulucu Kayıt Merkezi' : 'Web Yönetim Merkezi') 
                  : 'Güvenli Canlı Takip Sistemi'}
              </Text>
              <View style={styles.separator} />
            </View>

            <Text style={styles.inputLabel}>E-Posta Adresi</Text>
            <TextInput 
              placeholder="ornek@domain.com" 
              placeholderTextColor="#8e8e93"
              onChangeText={setEmail} 
              style={styles.input} 
              autoCapitalize="none"
              keyboardType="email-address"
            />
            
            <Text style={styles.inputLabel}>Şifre</Text>
            <TextInput 
              placeholder="••••••••" 
              placeholderTextColor="#8e8e93"
              secureTextEntry 
              onChangeText={setPassword} 
              style={styles.input} 
            />

            {!isRegisterMode && (
              <TouchableOpacity 
                style={styles.forgotPasswordButton} 
                onPress={() => navigation && navigation.navigate('ForgotPasswordScreen')}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>Şifremi Unuttum?</Text>
              </TouchableOpacity>
            )}

            {loading ? (
              <ActivityIndicator size="small" color="#2b231a" style={{ marginVertical: 15 }} />
            ) : (
              <View style={styles.buttonContainer}>
                
                <TouchableOpacity 
                  style={styles.loginButton} 
                  onPress={() => handleAuth(isRegisterMode ? 'register' : 'login')}
                  activeOpacity={0.9}
                >
                  <Text style={styles.loginButtonText}>
                    {isRegisterMode ? 'Hesap Oluştur ve Başlat' : 'Giriş Yap'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.registerContainer}>
                  <Text style={styles.registerText}>
                    {isRegisterMode ? 'Zaten hesabınız var mı? ' : 'Hesabınız yok mu? '}
                  </Text>
                  <TouchableOpacity onPress={handleToggleRegisterMode}>
                    <Text style={styles.registerLink}>
                      {isRegisterMode ? 'Giriş Yap' : 'Kayıt Ol'}
                    </Text>
                  </TouchableOpacity>
                </View>

              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 25 },
  internalBrandContainer: { alignItems: 'center', marginBottom: 25, marginTop: 5 },
  brandTitle: { fontSize: 30, fontWeight: '900', color: '#1c1c1e', letterSpacing: 1 },
  brandSubtitle: { fontSize: 12, color: '#8e8e93', marginTop: 4, fontWeight: '500' },
  separator: { width: '40%', height: 1, backgroundColor: '#e5e5ea', marginTop: 14, marginBottom: 5 },
  card: { 
    width: Platform.OS === 'web' ? 400 : '100%', 
    alignSelf: 'center',
    padding: 25, 
    backgroundColor: 'white', 
    borderRadius: 16,
    borderWidth: 0.5, 
    borderColor: '#e5e5ea',
    marginTop: 150, 
    ...Platform.select({
      web: { boxShadow: '0px 4px 15px rgba(0,0,0,0.05)' },
      android: { elevation: 2 } 
    })
  },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#1c1c1e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#f2f2f7', padding: 12, borderRadius: 10, marginBottom: 15, fontSize: 15, color: '#000000' },
  forgotPasswordButton: { alignSelf: 'flex-end', marginBottom: 25, marginTop: -5 },
  forgotPasswordText: { fontSize: 13, color: '#666', fontWeight: '500', textDecorationLine: 'underline' },
  buttonContainer: { marginTop: 5 },
  loginButton: { backgroundColor: '#d1c7bd', borderWidth: 0.5, borderColor: '#beaf9f', padding: 15, borderRadius: 10, alignItems: 'center', ...Platform.select({ web: { cursor: 'pointer' } }) },
  loginButtonText: { color: '#2b231a', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
  registerContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  registerText: { fontSize: 14, color: '#666' },
  registerLink: { fontSize: 14, color: '#1c1c1e', fontWeight: '700', textDecorationLine: 'underline' }
});

export default UniversalLoginScreen;