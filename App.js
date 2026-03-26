import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>KRAL, KAPIYI AÇTIK!</Text>
      <Text style={{fontSize: 16, marginTop: 10}}>Localhost şu an seni duyuyor.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#007AFF', 
    justifyContent: 'center', 
    alignItems: 'center',
    height: '100vh' // Web'de görünmesi için şart
  },
  text: { color: 'white', fontSize: 32, fontWeight: 'bold' }
});