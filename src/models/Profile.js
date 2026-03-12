// src/models/Profile.js

export const ProfileTemplate = {
    // NFC Etiketi ile eşleşen benzersiz ID
    tagId: '', 
    
    // İlişki Bilgileri
    parentId: '', // Velinin UserID'si
    
    // Temel Profil Bilgileri
    type: 'child', // 'child', 'elderly' veya 'pet'
    name: '',
    age: '',
    bloodType: '', // Örn: 'A Rh+'
    
    // Sağlık ve Acil Durum Bilgileri
    healthNotes: '', // Alerjiler, ilaçlar vb.
    photoUrl: '', // Profil fotoğrafı linki
    
    // Durum Yönetimi
    isLost: false, // Eğer true ise bulucuya iletişim bilgileri gösterilirsddf
    
    // Son Bilinen Konum
    lastLocation: {
        latitude: 0,
        longitude: 0,
        timestamp: null
    }
};