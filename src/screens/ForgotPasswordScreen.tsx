import React, { useState } from 'react';
import { 
  View, TextInput, TouchableOpacity, Text, 
  StyleSheet, Alert, Platform, ActivityIndicator, ScrollView, KeyboardAvoidingView, ImageBackground 
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack'; // Navigasyon tipi için
import { sendPasswordResetCode, verifyResetCode } from '../controllers/AuthController';

// KANKA: Navigasyon props tipini buraya mühürledik
interface Props {
  navigation: StackNavigationProp<any>;
}

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isCodeSent, setIsCodeSent] = useState<boolean>(false);

  const notify = (title: string, message: string): void => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSendCode = async (): Promise<void> => {
    if (!email.trim()) {
      notify('Eksik Bilgi', 'Lütfen e-posta adresinizi girin reis.');
      return;
    }

    setLoading(true);
    try {
      const result = await sendPasswordResetCode(email.trim());
      if (result.success) {
        setIsCodeSent(true);
        notify('Başarılı', '6 Haneli güvenlik onay kodu mail adresinize gönderildi kanka.');
      } else {
        notify('Hata', result.error || 'Kod gönderilirken bir sorun oluştu.');
      }
    } catch (error: any) {
      notify('Hata', 'Sistem hatası, lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (): Promise<void> => {
    if (!code.trim()) {
      notify('Eksik Bilgi', 'Lütfen mailinize gelen 6 haneli kodu girin reis.');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyResetCode(email.trim(), code.trim());
      if (result.success) {
        notify('Başarılı', 'Kod doğrulandı! Yeni şifre bağlantısı e-postanıza uçtu bremin.');
        navigation.goBack();
      } else {
        notify('Hata', result.error || 'Onay kodu doğrulanamadı.');
      }
    } catch (error: any) {
      notify('Hata', 'Doğrulama esnasında bir sistem hatası oluştu.');
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
            <Text style={styles.brandSubtitle}>NFCTT Güvenlik Ağı Kurtarma</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Şifremi Unuttum</Text>
            <Text style={styles.cardDescription}>
              {!isCodeSent 
                ? "E-posta adresinizi girin, saman grisi kurumsal kodunuzu gönderelim."
                : "Mailinize gelen 6 haneli tek kullanımlık onay kodunu girin reis."}
            </Text>

            <Text style={styles.inputLabel}>E-Posta Adresi</Text>
            <TextInput 
              placeholder="E-posta" 
              placeholderTextColor="#8e8e93"
              onChangeText={setEmail} 
              value={email}
              editable={!isCodeSent}
              style={[styles.input, isCodeSent && { backgroundColor: '#e5e5ea', color: '#8e8e93' }]} 
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {isCodeSent && (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.inputLabel}>6 Haneli Onay Kodu</Text>
                <TextInput 
                  placeholder="••••••" 
                  placeholderTextColor="#8e8e93"
                  maxLength={6}
                  keyboardType="number-pad"
                  onChangeText={setCode} 
                  value={code}
                  style={styles.input} 
                />
              </View>
            )}

            {loading ? (
              <ActivityIndicator size="small" color="#1c1c1e" style={{ marginVertical: 20 }} />
            ) : (
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.primaryButton} 
                  onPress={!isCodeSent ? handleSendCode : handleVerifyCode}
                >
                  <Text style={styles.primaryButtonText}>
                    {!isCodeSent ? "Onay Kodu Gönder" : "Kodu Doğrula"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                  <Text style={styles.backButtonText}>Giriş Ekranına Dön</Text>
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
  brandContainer: { alignItems: 'center', marginBottom: 8, marginTop: Platform.OS === 'ios' ? 140 : 120 },
  brandSubtitle: { fontSize: 13, color: '#8e8e93', fontWeight: '500', letterSpacing: 0.5 },
  card: { width: '100%', padding: 25, backgroundColor: 'white', borderRadius: 16, borderWidth: 0.5, borderColor: '#e5e5ea' },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#1c1c1e', marginBottom: 8, textAlign: 'center' },
  cardDescription: { fontSize: 13, color: '#636366', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#1c1c1e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: { backgroundColor: '#f2f2f7', padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 15, color: '#000000' },
  buttonContainer: { marginTop: 10 },
  primaryButton: { backgroundColor: '#d1c7bd', borderWidth: 0.5, borderColor: '#beaf9f', padding: 15, borderRadius: 10, alignItems: 'center' },
  primaryButtonText: { color: '#2b231a', fontWeight: '700', fontSize: 16, letterSpacing: 0.5 },
  backButton: { marginTop: 20, alignItems: 'center' },
  backButtonText: { fontSize: 14, color: '#1c1c1e', fontWeight: '600', textDecorationLine: 'underline' }
});