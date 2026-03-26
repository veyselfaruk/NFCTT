import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const WebProfileView = ({ profileData }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>NFCTT Bilgi Paneli</Text>
      <View style={styles.card}>
        <Text style={styles.label}>İsim: <Text style={styles.value}>{profileData.name}</Text></Text>
        <Text style={styles.label}>Durum: <Text style={[styles.value, {color: 'red'}]}>
          {profileData.isLost ? 'KAYIP İLANI VAR' : 'Güvende'}
        </Text></Text>
        <Text style={styles.label}>Kan Grubu: <Text style={styles.value}>{profileData.bloodType}</Text></Text>
      </View>
      {/* Buraya "Konum Gönder" butonu eklenecek */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5', alignItems: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#2c3e50' },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: '90%', elevation: 3 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  value: { fontWeight: '400', color: '#555' }
});

export default WebProfileView;