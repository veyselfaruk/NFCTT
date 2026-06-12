import React, { useState } from 'react';
import { 
  View, TextInput, TouchableOpacity, Text, 
  StyleSheet, ActivityIndicator, ScrollView, useWindowDimensions 
} from 'react-native';
import { updateProfile } from 'firebase/auth'; // Dinamik require yerine temiz standart import
import { signUp as webSignUp } from '../controllers/WebAuthController'; // Mustafa'nın web uyumlu auth motoru
import { sendEmailTemplateViaBrevo } from '../../utils/mailer'; // Brevo Şablon Motoru

interface WebRegisterViewProps {
  onRegisterSuccess: (user: any) => void; // Kayıt bitince App.web.tsx'e oturumu devredecek kanka
  onBackToLogin: () => void; // Giriş ekranına geri fırlatacak eylem
}

export default function WebRegisterView({ onRegisterSuccess, onBackToLogin }: WebRegisterViewProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const handleRegisterWeb = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      alert('Lütfen tüm alanları eksiksiz doldurun kral.');
      return;
    }

    if (password !== confirmPassword) {
      alert('Şifreler birbiriyle eşleşmiyor reis.');
      return;
    }

    setLoading(true);
    try {
      // Web tabanlı güvenli kayıt motorunu tetikliyoruz
      const result = await webSignUp(email.trim(), password);
      
      if (result.success && result.user) {
        // Firebase Auth displayName güncellemesi
        await updateProfile(result.user, { displayName: name.trim() });

        // 🌾 BREVO HOŞ GELDİN MAİL TETİKLEYİCİSİ (MİLİMETRİK KORUNDU)
        try {
          console.log("[Web Kayıt] Kimlik oluşturuldu, Brevo #1 numaralı şablon tetikleniyor...");
          await sendEmailTemplateViaBrevo(
            email.trim(),
            1, // Saman grisi butonlu şablon ID'si
            {
              kullanici_adi: name.trim(),
              user_uid: result.user.uid
            }
          );
          console.log("[Web Kayıt] Hoş geldin doğrulama maili kuyruğa gönderildi.");
        } catch (mailError) {
          console.error("[Web Kayıt Hatası] Brevo mail motoru tetiklenemedi:", mailError);
        }

        alert('Hesabınız başarıyla oluşturuldu! Profil kurulumuna yönlendiriliyorsunuz.');
        onRegisterSuccess(result.user); // App.web.tsx üzerinden oturum açılarak ProfileSetup tetikleniyor
      } else {
        alert(result.error || 'Kayıt sırasında bir sorun oluştu.');
      }
    } catch (error) {
      console.error("[Web Kayıt Kritik Hata]:", error);
      alert('Kayıt işlemi tamamlanamadı, lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.outerWrapper}>
      <ScrollView contentContainerStyle={[styles.scrollContainer, !isMobile && styles.desktopCardWidth]} showsVerticalScrollIndicator={false}>
        
        <View style={styles.brandContainer}>
          <Text style={styles.brandSubtitle}>NFCTT Güvenlik Ağına Katılın</Text>
        </View>

        {/* KAYIT FORMU KARTI */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hesap Oluştur</Text>

          <Text style={styles.inputLabel}>Ad Soyad</Text>
          <TextInput 
            placeholder="John Doe" 
            placeholderTextColor="#8e8e93"
            onChangeText={setName} 
            value={name}
            style={styles.input} 
          />

          <Text style={styles.inputLabel}>E-Posta Adresi</Text>
          <TextInput 
            placeholder="john.doe@example.com" 
            placeholderTextColor="#8e8e93"
            onChangeText={setEmail} 
            value={email}
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
            value={password}
            style={styles.input} 
          />

          <Text style={styles.inputLabel}>Şifre Tekrar</Text>
          <TextInput 
            placeholder="••••••••" 
            placeholderTextColor="#8e8e93"
            secureTextEntry 
            onChangeText={setConfirmPassword} 
            value={confirmPassword}
            style={styles.input} 
          />

          {loading ? (
            <View style={styles.loaderFrame}>
              <ActivityIndicator size="small" color="#1c1c1e" />
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.registerButton} 
                onPress={handleRegisterWeb}
                activeOpacity={0.9}
              >
                <Text style={styles.registerButtonText}>Hesabı Oluştur</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={onBackToLogin} 
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>Zaten hesabınız var mı? Giriş Yap.</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: { flex: 1, backgroundColor: '#f8f9fa', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20, width: '100%' },
  desktopCardWidth: { maxWidth: 440, alignSelf: 'center' },
  
  brandContainer: { alignItems: 'center', marginBottom: 12 },
  brandSubtitle: { fontSize: 13, color: '#8e8e93', fontWeight: '500', letterSpacing: 0.5 },
  
  card: { width: '100%', padding: 25, backgroundColor: 'white', borderRadius: 16, borderWidth: 0.5, borderColor: '#e5e5ea', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#1c1c1e', marginBottom: 15, textAlign: 'center' },
  
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#1c1c1e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: { backgroundColor: '#f2f2f7', padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 15, color: '#000000', borderWidth: 0.5, borderColor: '#e5e5ea' },
  
  buttonContainer: { marginTop: 10 },
  registerButton: { backgroundColor: '#d1c7bd', borderWidth: 0.5, borderColor: '#beaf9f', padding: 15, borderRadius: 10, alignItems: 'center' },
  registerButtonText: { color: '#2b231a', fontWeight: '700', fontSize: 16, letterSpacing: 0.5 },
  
  backButton: { marginTop: 20, alignItems: 'center' },
  backButtonText: { fontSize: 14, color: '#1c1c1e', fontWeight: '600', textDecorationLine: 'underline' },
  loaderFrame: { marginVertical: 20, justifyContent: 'center', alignItems: 'center' }
});