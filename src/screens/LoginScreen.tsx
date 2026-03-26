import React, { useState } from 'react';
import { View, TextInput, Button, Alert, StyleSheet, Text } from 'react-native';
import { signUp, signIn } from '../controllers/AuthController';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Uyarı', 'Lütfen tüm alanları doldur kanka.');
      return;
    }
    const result = await signUp(email, password);
    if (result.success) {
      Alert.alert('Başarılı', 'Kullanıcı Frankfurt sunucusuna kaydedildi!');
    } else {
      Alert.alert('Kayıt Hatası', result.error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>NFC-TT Giriş Paneli</Text>
      <TextInput 
        placeholder="E-posta adresi" 
        onChangeText={setEmail} 
        style={styles.input} 
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput 
        placeholder="Şifre" 
        secureTextEntry 
        onChangeText={setPassword} 
        style={styles.input} 
      />
      <Button title="Frankfurt'a Kayıt Ol" onPress={handleRegister} color="#2196F3" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 30, backgroundColor: '#f5f5f5' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' }
});

export default LoginScreen;