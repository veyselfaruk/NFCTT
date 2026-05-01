export class Profile {
    constructor(data) {
        this.tagId = data.tagId || '';
        this.name = data.name || 'İsimsiz';
        this.bloodType = data.bloodType || 'Bilinmiyor';
        this.isLost = data.isLost || false;
        this.healthNotes = data.healthNotes || '';
        this.type = data.type || 'child';
        // Veritabanından gelen karmaşık veriyi burada ayıklıyoruz
        this.lastLocation = data.lastLocation || { latitude: 0, longitude: 0 };
    }

    // Model içine fonksiyon bile yazabilirsin
    getStatusMessage() {
        return this.isLost ? "⚠️ KAYIP İLANI VAR" : "✅ GÜVENDE";
    }
}



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