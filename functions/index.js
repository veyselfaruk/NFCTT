const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();

/**
 * 📢 NFCTT ENTERPRISE BROADCAST HISTORY SUB-SYSTEM (v2)
 * system_notifications/broadcast/messages koleksiyonuna YENİ BİR DUYURU eklendiğinde otomatik tetiklenir.
 */
exports.sendSystemBroadcastEmailCloud = onDocumentCreated("system_notifications/broadcast/messages/{messageId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log("[Broadcast System] Gelen veri boş, tetikleme iptal.");
    return null;
  }

  const messageData = snapshot.data();
  
  // Dökümanın içinden text alanını alıyoruz kanka
  const changeLogText = messageData.text || messageData.lastMessage;
  const versionTitle = messageData.title || "NFCTT Sistem Güncelleme Bildirimi";

  if (!changeLogText) {
    console.log("[Broadcast System Error] Döküman içinde 'text' alanı bulunamadı.");
    return null;
  }

  try {
    console.log("[Broadcast System] Yeni duyuru algılandı. Toplu e-posta gönderimi başlatılıyor...");
    
    const db = admin.firestore();
    const profilesSnapshot = await db.collection("profiles").get();

    if (profilesSnapshot.empty) {
      console.log("[Broadcast System Error] Sistemde kayıtlı hiçbir kullanıcı profili bulunamadı.");
      return null;
    }

    let successCount = 0;
    let failCount = 0;

    const broadcastPromises = profilesSnapshot.docs.map(async (docSnap) => {
      const pData = docSnap.data();
      const actualData = pData.finalData ? pData.finalData : pData;

      const targetEmail = pData?.email || actualData?.parent?.email || null;
      const targetName = actualData?.parent?.name || actualData?.dependent?.name || "Değerli Kullanıcımız";

      if (targetEmail && targetEmail.includes("@")) {
        try {
          const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "accept": "application/json",
              "api-key": "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",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              to: [{ email: targetEmail.trim().toLowerCase() }],
              templateId: 3, 
              params: {
                KULLANICI_ADI: targetName,
                GUNCELLEME_BASLIGI: versionTitle,
                DEGISIKLIK_NOTLARI: changeLogText
              }
            })
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          console.error(`[Row Error] ${targetEmail} hatası:`, err);
          failCount++;
        }
      }
    });

    await Promise.all(broadcastPromises);
    console.log(`[Broadcast System Success] Dağıtım bitti. Başarılı: ${successCount}, Başarısız: ${failCount}`);
    return null;

  } catch (error) {
    console.error("[Broadcast System Fatal Error] Sunucu hatası:", error.message);
    return null;
  }
});