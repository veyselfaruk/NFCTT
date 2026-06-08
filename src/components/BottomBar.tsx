import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 

interface BottomBarProps {
  navigation: any;
  activeScreen: 'Home' | 'Settings' | 'NFC' | 'Chat' | 'Profile';
}

export default function BottomBar({ navigation, activeScreen }: BottomBarProps) {
  const activeColor = '#000000';
  const inactiveColor = '#8e8e93';

  // =========================================================================
  // 🔥 KANKA: KİLİTLENMEYİ VE KAÇAK KOOPYALARI BİTİREN GÜVENLİ NAVİGASYON MOTORU
  // =========================================================================
  const handleTabPress = (targetRoute: string) => {
    // Eğer kullanıcı zaten gitmek istediği sayfadaysa boşuna tetikleme yapma kanka
    if (
      (targetRoute === 'ProfileSetup' && activeScreen === 'Settings') ||
      (targetRoute === 'Home' && activeScreen === 'Home') ||
      (targetRoute === 'Nfc' && activeScreen === 'NFC') ||
      (targetRoute === 'ChatList' && activeScreen === 'Chat') ||
      (targetRoute === 'ProfileScreen' && activeScreen === 'Profile')
    ) {
      return;
    }

    // Profil ve Ayarlar gibi ana kırılım sayfalarında stack'i temizleyerek gitmek 
    // arkadaki kaçak tetikleyicilerin navigatörü kilitlemesini kökten engeller reis.
    if (targetRoute === 'ProfileScreen' || targetRoute === 'Home') {
      navigation.reset({
        index: 0,
        routes: [{ name: targetRoute }],
      });
    } else {
      navigation.navigate({
        name: targetRoute,
        key: targetRoute,
        merge: true,
      });
    }
  };

  return (
    <View style={styles.bottomBar}>
      {/* 1. ANASAYFA */}
      <TouchableOpacity 
        style={styles.barItem} 
        onPress={() => handleTabPress('Home')}
      >
        <Ionicons 
          name={activeScreen === 'Home' ? "home" : "home-outline"} 
          size={22} 
          color={activeScreen === 'Home' ? activeColor : inactiveColor} 
        />
        <Text style={[styles.barText, activeScreen === 'Home' && styles.activeText]}>Anasayfa</Text>
      </TouchableOpacity>

      {/* 2. AYARLAR */}
      <TouchableOpacity 
        style={styles.barItem} 
        onPress={() => handleTabPress('ProfileSetup')}
      >
        <Ionicons 
          name={activeScreen === 'Settings' ? "settings" : "settings-outline"} 
          size={22} 
          color={activeScreen === 'Settings' ? activeColor : inactiveColor} 
        />
        <Text style={[styles.barText, activeScreen === 'Settings' && styles.activeText]}>Ayarlar</Text>
      </TouchableOpacity>

      {/* 3. NFC TARAT */}
      <TouchableOpacity 
        style={styles.barItem} 
        onPress={() => handleTabPress('Nfc')}
      >
        <Ionicons 
          name={activeScreen === 'NFC' ? "radio" : "radio-outline"} 
          size={22} 
          color={activeScreen === 'NFC' ? activeColor : inactiveColor} 
        />
        <Text style={[styles.barText, activeScreen === 'NFC' && styles.activeText]}>NFC Tarat</Text>
      </TouchableOpacity>

      {/* 4. MESAJLAR */}
      <TouchableOpacity 
        style={styles.barItem} 
        onPress={() => handleTabPress('ChatList')}
      >
        <Ionicons 
          name={activeScreen === 'Chat' ? "chatbox-ellipses" : "chatbox-ellipses-outline"} 
          size={22} 
          color={activeScreen === 'Chat' ? activeColor : inactiveColor} 
        />
        <Text style={[styles.barText, activeScreen === 'Chat' && styles.activeText]}>Mesajlar</Text>
      </TouchableOpacity>

      {/* 5. PROFİLİM */}
      <TouchableOpacity 
        style={styles.barItem} 
        onPress={() => handleTabPress('ProfileScreen')}
      >
        <Ionicons 
          name={activeScreen === 'Profile' ? "person" : "person-outline"} 
          size={22} 
          color={activeScreen === 'Profile' ? activeColor : inactiveColor} 
        />
        <Text style={[styles.barText, activeScreen === 'Profile' && styles.activeText]}>Profilim</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: { 
    flexDirection: 'row', 
    height: Platform.OS === 'ios' ? 85 : 68, 
    backgroundColor: '#ffffff', 
    borderTopWidth: 0.5, 
    borderColor: '#e5e5ea', 
    justifyContent: 'space-around', 
    alignItems: 'center', 
    paddingBottom: Platform.OS === 'ios' ? 18 : 0,
    position: 'absolute', 
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 8
  },
  barItem: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    flex: 1,
    height: '100%'
  },
  barText: { 
    fontSize: 10, 
    color: '#8e8e93', 
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.2
  },
  activeText: {
    color: '#000000', 
    fontWeight: '700'
  }
});