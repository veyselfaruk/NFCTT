import React, { useState } from 'react';
import { 
  View, TextInput, TouchableOpacity, Text, 
  StyleSheet, Alert, Platform, ActivityIndicator 
} from 'react-native';

// 1. İki controller'ı da import ediyoruz (İsim çakışması olmasın diye 'as' kullandık)
import { signIn as mobileSignIn, signUp as mobileSignUp } from '../controllers/AuthController';
// Mustafa'nın (Ubeyde) web için yazdığı controller
import { signIn as webSignIn } from '../controllers/WebAuthController'; 

const UniversalLoginScreen = ({ onLoginSuccess }: { onLoginSuccess?: (user: any) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Ortak Bildirim Fonksiyonu (Web'de alert, Mobilde Alert.alert)
  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleAuth = async (type: 'login' | 'register') => {
    if (!email || !password) {
      notify('Uyarı', 'Lütfen tüm alanları doldur kanka.');
      return;
    }

    setLoading(true);
    let result: any;

    try {
      // 2. PLATFORM KONTROLÜ: Hangi ortamda hangi fonksiyon çalışacak?
      if (Platform.OS === 'web') {
        // Web tarafında Mustafa'nın fonksiyonunu çağırıyoruz
        result = type === 'login' ? await webSignIn(email, password) : { success: false, error: 'Web üzerinden kayıt henüz aktif değil.' };
      } else {
        // Mobil tarafta senin fonksiyonlarını çağırıyoruz
        result = type === 'login' ? await mobileSignIn(email, password) : await mobileSignUp(email, password);
      }
    } catch (err: any) {
      result = { success: false, error: err.message };
    }

    setLoading(false);

    // 3. SONUÇ DEĞERLENDİRMESİ
    if (result && result.success) {
      notify('Başarılı', type === 'login' ? 'Giriş yapıldı!' : 'Kayıt başarılı!');
      
      const loggedInUser = result.user; 

      // Ubeyde'nin web tarafında state'i güncellemesi için bu şart
      if (onLoginSuccess && loggedInUser) {
        onLoginSuccess(loggedInUser);
      }
    } else {
      notify('Hata', result?.error || 'Bir şeyler ters gitti.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>NFC-TT {Platform.OS === 'web' ? 'Web' : 'Mobil'}</Text>
        
        <TextInput 
          placeholder="E-posta" 
          onChangeText={setEmail} 
          style={styles.input} 
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput 
          placeholder="Şifre" 
          secureTextEntry 
          onChangeText={setPassword} 
          style={styles.input} 
        />

        {loading ? (
          <ActivityIndicator size="small" color="#007AFF" style={{ marginVertical: 15 }} />
        ) : (
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: '#4CAF50' }]} 
              onPress={() => handleAuth('login')}
            >
              <Text style={styles.buttonText}>Giriş Yap</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: '#2196F3' }]} 
              onPress={() => handleAuth('register')}
            >
              <Text style={styles.buttonText}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f0f2f5' 
  },
  card: { 
    width: Platform.OS === 'web' ? 400 : '90%', 
    padding: 25, 
    backgroundColor: 'white', 
    borderRadius: 15,
    ...Platform.select({
      web: { boxShadow: '0px 4px 15px rgba(0,0,0,0.1)' },
      android: { elevation: 8 }
    })
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 20,
    color: '#333'
  },
  input: { 
    backgroundColor: '#fff', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 15, 
    borderWidth: 1, 
    borderColor: '#ddd' 
  },
  buttonContainer: { 
    gap: 12 
  },
  button: { 
    padding: 15, 
    borderRadius: 8, 
    alignItems: 'center',
    // Butona basıldığında efekt (Web için cursor)
    ...Platform.select({
      web: { cursor: 'pointer' }
    })
  },
  buttonText: { 
    color: 'white', 
    fontWeight: 'bold',
    fontSize: 16
  }
});

export default UniversalLoginScreen;