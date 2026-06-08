import { auth, db } from '../src/config/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

/**
 * Brevo REST API Üzerinden Şablon Bazlı Kurumsal E-Posta Tetikleme Motoru
 * @param {string} toEmail - Alıcı e-posta adresi
 * @param {number} templateId - Brevo panelindeki ilişkili şablon numarası
 * @param {object} paramsObj - HTML şablonun içine enjekte edilecek dinamik parametreler
 */
export const sendEmailTemplateViaBrevo = async (toEmail, templateId, paramsObj) => {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': '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', // Entegre kurumsal API anahtarı
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        to: [
          {
            email: toEmail.trim().toLowerCase(), // Alıcı adresi normalize ediliyor kanka
          }
        ],
        templateId: templateId, 
        params: paramsObj 
      }),
    });

    const result = await response.json();
    console.log(`[SMTP Engine] Brevo Şablon Gönderim Sonucu (${toEmail}):`, result);
    return result;
  } catch (error) {
    console.error(`[SMTP Engine Error] ${toEmail} adresine şablon maili iletilemedi:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * 📢 GÜNCELLEME: Tüm Kayıtlı Kullanıcılara Kurumsal Sistem Duyurusu Uçuran Toplu Yayın Motoru (#3 Şablonu)
 * @param {string} versionTitle - Güncelleme başlığı (Örn: NFCTT v2.0 Kurumsal Güncellemesi)
 * @param {string} changeLogText - Güncelleme içeriği ve detayları
 */
export const sendSystemBroadcastEmail = async (versionTitle, changeLogText) => {
  try {
    console.log("[Broadcast Engine] Toplu kurumsal duyuru yayını başlatılıyor...");
    
    // 1. Veritabanındaki tüm kayıtlı profiller asenkron olarak çekilir kanka
    const profilesSnapshot = await getDocs(collection(db, "profiles"));
    
    if (profilesSnapshot.empty) {
      console.log("[Broadcast Engine] Sistemde kayıtlı herhangi bir kullanıcı profili bulunamadı.");
      return { success: false, error: "Kullanıcı listesi boş." };
    }

    let successCount = 0;
    let failCount = 0;

    // 2. Tüm kullanıcı listesi üzerinde asenkron kurumsal döngü başlatılıyor reis
    const broadcastPromises = profilesSnapshot.docs.map(async (docSnap) => {
      const pData = docSnap.data();
      const actualData = pData.finalData ? pData.finalData : pData;
      
      // Kullanıcının e-posta adresini ve adını derin tarama ile ayıklıyoruz
      const targetEmail = pData?.email || actualData?.parent?.email || null;
      const targetName = actualData?.parent?.name || actualData?.dependent?.name || "Değerli Kullanıcımız";

      if (targetEmail) {
        try {
          // Yukaradaki ana Brevo motorunu her kullanıcı için #3 şablonuyla tetikliyoruz
          await sendEmailTemplateViaBrevo(
            targetEmail,
            3, // Brevo panelinde oluşturulan Sistem Duyuru Şablon ID'si
            {
              KULLANICI_ADI: targetName,
              GUNCELLEME_BASLIGI: versionTitle,
              DEGISIKLIK_NOTLARI: changeLogText
            }
          );
          successCount++;
        } catch (err) {
          console.error(`[Broadcast Row Error] ${targetEmail} için kuyruk oluşturulamadı:`, err);
          failCount++;
        }
      }
    });

    // Tüm asenkron maillerin paralel olarak işlenmesini bekliyoruz brom
    await Promise.all(broadcastPromises);

    console.log(`[Broadcast Engine] Dağıtım tamamlandı. Başarılı: ${successCount}, Başarısız: ${failCount}`);
    return { success: true, successCount, failCount };

  } catch (error) {
    console.error("[Broadcast Engine Fatal Error] Toplu yayın motoru çöktü:", error.message);
    return { success: false, error: error.message };
  }
};