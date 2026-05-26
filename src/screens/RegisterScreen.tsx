import React, { useState } from 'react';
import { 
  View, TextInput, TouchableOpacity, Text, 
  StyleSheet, Alert, Platform, ActivityIndicator, ScrollView, KeyboardAvoidingView, ImageBackground 
} from 'react-native';
import { signUp as mobileSignUp } from '../controllers/AuthController'; // Mustafa'nın mobil motoru

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // === ADIM 1: RE-RENDER VE ÇAKIŞMA ENGELLİ KURUMSAL KAYIT MOTORU ===
  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      notify('Eksik Bilgi', 'Lütfen tüm alanları eksiksiz doldurun.');
      return;
    }

    if (password !== confirmPassword) {
      notify('Hata', 'Şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setLoading(true);
    try {
      const result = await mobileSignUp(email.trim(), password);
      
      if (result.success) {
        if (result.user) {
          const { updateProfile } = require('firebase/auth');
          await updateProfile(result.user, { displayName: name.trim() });
        }

        console.log("[Kayıt Sistemi] Kimlik başarıyla oluşturuldu. Profil kurulumuna yönlendiriliyor...");
        notify('Başarılı', 'Hesabınız başarıyla oluşturuldu.');
        
        // 🔥 KANKA: ADIM 1 KRİTİK REÇETESİ!
        // navigate yerine replace çaktık. Register stack'ten uçuyor, yerine doğrudan ProfileSetup oturuyor.
        // Arka planda harita (Home) ön izlemesi tetiklenmesi kökten engellendi.
        navigation.replace('ProfileSetup', { fullName: name.trim() });
      } else {
        notify('Hata', result.error || 'Kayıt sırasında bir sorun oluştu.');
      }
    } catch (error: any) {
      console.error("[Kayıt Hatası] Kritik sistem sızıntısı:", error);
      notify('Hata', 'Kayıt işlemi tamamlanamadı, lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
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
          
          <View style={styles.brandContainer}>
            <Text style={styles.brandSubtitle}>NFCTT Güvenlik Ağına Katılın</Text>
          </View>

          {/* KAYIT FORMU KARTI */}
          <View style={styles.card}>
            
            <Text style={styles.inputLabel}>Ad Soyad</Text>
            <TextInput 
              placeholder="John Doe" 
              placeholderTextColor="#8e8e93"
              onChangeText={setName} 
              style={styles.input} 
            />

            <Text style={styles.inputLabel}>E-Posta Adresi</Text>
            <TextInput 
              placeholder="john.doe@example.com" 
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

            <Text style={styles.inputLabel}>Şifre Tekrar</Text>
            <TextInput 
              placeholder="••••••••" 
              placeholderTextColor="#8e8e93"
              secureTextEntry 
              onChangeText={setConfirmPassword} 
              style={styles.input} 
            />

            {loading ? (
              <ActivityIndicator size="small" color="#1c1c1e" style={{ marginVertical: 20 }} />
            ) : (
              <View style={styles.buttonContainer}>
                
                {/* Kayıt Ol Butonu */}
                <TouchableOpacity 
                  style={styles.registerButton} 
                  onPress={handleRegister}
                  activeOpacity={0.9}
                >
                  <Text style={styles.registerButtonText}>Hesabı Oluştur</Text>
                </TouchableOpacity>

                {/* Login'e Dönüş Linki */}
                <TouchableOpacity 
                  onPress={() => navigation.goBack()} 
                  style={styles.backButton}
                >
                  <Text style={styles.backButtonText}>Zaten hesabınız var. Giriş Yap.</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 25 },
  
  brandContainer: { 
    alignItems: 'center', 
    marginBottom: 8, 
    marginTop: Platform.OS === 'ios' ? 190 : 170 
  },
  brandSubtitle: { 
    fontSize: 13, 
    color: '#8e8e93', 
    fontWeight: '500', 
    letterSpacing: 0.5
  },
  
  card: { 
    width: '100%', 
    padding: 25, 
    backgroundColor: 'white', 
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#e5e5ea',
    marginTop: 0,
    ...Platform.select({
      android: { elevation: 2 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }
    })
  },
  
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#1c1c1e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: { 
    backgroundColor: '#f2f2f7', 
    padding: 12, 
    borderRadius: 10, 
    marginBottom: 16, 
    fontSize: 15,
    color: '#000000'
  },
  
  buttonContainer: { marginTop: 10 },
  
  registerButton: {
    backgroundColor: '#d1c7bd', 
    borderWidth: 0.5,
    borderColor: '#beaf9f',
    padding: 15, 
    borderRadius: 10, 
    alignItems: 'center'
  },
  registerButtonText: { color: '#2b231a', fontWeight: '700', fontSize: 16, letterSpacing: 0.5 },
  
  backButton: { marginTop: 20, alignItems: 'center' },
  backButtonText: { fontSize: 14, color: '#1c1c1e', fontWeight: '600', textDecorationLine: 'underline' }
});