import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text } from 'react-native';
// Dikkat: Burada WebAuthController kullandığından emin ol
import { signIn } from '../controllers/WebAuthController'; 

const WebLoginScreen = ({ onLoginSuccess }: any) => { // onLoginSuccess'i buradan içeri alıyoruz
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Lütfen tüm alanları doldur kanka.');
      return;
    }
    
    const result = await signIn(email, password);
    
    if (result.success) {
      alert('Giriş Başarılı! Frankfurt hattı bağlandı.');
      // Giriş başarılıysa ana sayfadaki (App.web.tsx) fonksiyonu tetikle
      if (onLoginSuccess) {
        onLoginSuccess(result.user);
      }
    } else {
      alert('Giriş Hatası: ' + result.error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Veli Giriş Paneli</Text>
      <TextInput 
        placeholder="E-posta" 
        onChangeText={setEmail} 
        style={styles.input} 
        autoCapitalize="none"
      />
      <TextInput 
        placeholder="Şifre" 
        secureTextEntry 
        onChangeText={setPassword} 
        style={styles.input} 
      />
      <Button title="Giriş Yap" onPress={handleLogin} color="#2196F3" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 30, backgroundColor: '#f5f5f5' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' }
});

export default WebLoginScreen;