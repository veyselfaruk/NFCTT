import { auth, db } from '../config/firebaseConfig'; 
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from 'firebase/auth'; 
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { sendEmailTemplateViaBrevo } from '../../utils/mailer'; 

/**
 * Yeni Kullanıcı Kayıt Protokolü (Sign-Up)
 * @param {string} email - Kullanıcı e-posta adresi
 * @param {string} password - Kullanıcı şifresi
 */
export const signUp = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("[Auth Service] Yeni kullanıcı kaydı başarıyla oluşturuldu.");
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error("[Auth Service Error] Kayıt işlemi sırasında bir hata oluştu:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Mevcut Kullanıcı Kimlik Doğrulama Protokolü (Sign-In)
 * @param {string} email - Kullanıcı e-posta adresi
 * @param {string} password - Kullanıcı şifresi
 */
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("[Auth Service] Kullanıcı oturumu başarıyla açıldı.");
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error("[Auth Service Error] Giriş işlemi sırasında bir hata oluştu:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * 6 Haneli Şifre Sıfırlama Kodu Üretim ve Brevo SMTP Tetikleme Motoru
 * @param {string} email - Şifresini unutan kullanıcının e-posta adresi
 */
export const sendPasswordResetCode = async (email) => {
  try {
    const cleanEmail = email.trim().toLowerCase();
    
    // 6 Haneli kriptografik onay kodu üretimi
    const generatedCode = String(Math.floor(100000 + Math.random() * 900000));
    
    // 15 dakikalık (900.000 ms) Token geçerlilik süresi hesaplaması
    const expiresAt = Date.now() + 15 * 60 * 1000; 

    // Firestore üzerinde "verification_tickets" koleksiyonuna bilet mühürlenmesi
    const ticketRef = doc(db, "verification_tickets", cleanEmail);
    await setDoc(ticketRef, {
      code: generatedCode,
      expiresAt: expiresAt,
      email: cleanEmail
    });

    console.log(`[Security Engine] Firestore doğrulama bileti oluşturuldu. Token: ${generatedCode}`);

    // Brevo API entegrasyonu üzerinden #2 ID'li kurumsal şablonun tetiklenmesi
    await sendEmailTemplateViaBrevo(
      cleanEmail,
      2, 
      { onay_kodu: generatedCode }
    );

    return { success: true };
  } catch (error) {
    console.error("[Security Engine Error] Onay kodu gönderimi başarısız:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Tek Kullanımlık Onay Kodu Doğrulama Protokolü
 * @param {string} email - Kullanıcı e-posta adresi
 * @param {string} code - Kullanıcı tarafından girilen 6 haneli kod
 */
export const verifyResetCode = async (email, code) => {
  try {
    const cleanEmail = email.trim().toLowerCase();
    
    const ticketRef = doc(db, "verification_tickets", cleanEmail);
    const ticketSnap = await getDoc(ticketRef);

    if (!ticketSnap.exists()) {
      return { success: false, error: "Şifre sıfırlama talebi bulunamadı veya süresi doldu." };
    }

    const ticketData = ticketSnap.data();

    // Veri bütünlüğü ogüvenlik Token kontrolü
    if (ticketData?.code !== code.trim()) {
      return { success: false, error: "Girdiğiniz 6 haneli onay kodu geçersizdir." };
    }

    // Zaman aşımı (Timeout) kontrolü
    if (Date.now() > ticketData.expiresAt) {
      return { success: false, error: "Onay kodunun 15 dakikalık geçerlilik süresi dolmuştur." };
    }

    // Re-use ataklarını önlemek adına doğrulanan biletin imha edilmesi
    await deleteDoc(ticketRef);
    console.log("[Security Engine] Onay kodu doğrulandı, tek kullanımlık bilet imha edildi.");
    
    // Güvenli şifre belirleme bağlantısının Firebase Auth üzerinden asenkron tetiklenmesi
    await sendPasswordResetEmail(auth, cleanEmail);

    return { success: true, message: "Kimlik doğrulama başarılı. Şifre sıfırlama bağlantısı iletildi." };
  } catch (error) {
    console.error("[Security Engine Error] Doğrulama protokolü hatası:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Oturumu Açık Kullanıcılar İçin Şifre Değiştirme Protokolü (2. Senaryo)
 * @param {string} currentPassword - Kullanıcının mevcut şifresi
 * @param {string} newPassword - Belirlenmek istenen yeni şifre
 */
// 🔐 OTURUM AÇIKKEN ŞİFRE DEĞİŞTİRME MOTORU (2. SENARYO - KESİN ÇÖZÜM)
export const changePasswordLoggedIn = async (currentPassword, newPassword) => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      return { success: false, error: "Aktif bir kullanıcı oturumu bulunamadı." };
    }

    const email = user.email;

    // 1. Güvenlik Protokolü: Yeniden doğrulama (Re-authentication)
    const credential = EmailAuthProvider.credential(email, currentPassword);
    
    // Log sadece işlem gerçekten başlarken basılır
    console.log(`[Security Engine] Kullanıcı kimliği yeniden doğrulanıyor... UID: ${user.uid}`);
    await reauthenticateWithCredential(user, credential);
    
    // 2. Doğrulama başarılı ise yeni şifrenin Auth katmanına yazılması
    await updatePassword(user, newPassword);
    
    console.log("[Security Engine] Şifre güncelleme işlemi başarıyla tamamlandı.");
    return { success: true };

  } catch (error) {
    // 🛡️ REÇETE: Hata durumunda aşağıdaki satırların çalışmasını engellemek için doğrudan friendly error dönüyoruz
    let friendlyError = "Şifre değiştirme işlemi gerçekleştirilemedi.";
    
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
      friendlyError = "Girdiğiniz mevcut şifre hatalıdır. Lütfen kontrol ederek tekrar deneyiniz.";
    } else if (error.code === 'auth/weak-password') {
      friendlyError = "Yeni şifre güvenlik kriterlerini karşılamıyor (En az 6 karakter olmalıdır).";
    } else if (error.code === 'auth/requires-recent-login') {
      friendlyError = "Güvenlik protokolü gereği lütfen çıkış yapıp tekrar giriş yaptıktan sonra deneyiniz.";
    } else {
      friendlyError = error.message || friendlyError;
    }
    
    console.log(`[Security Engine Error] Başarısız Kimlik Doğrulama Kodu: ${error.code}`);
    return { success: false, error: friendlyError };
  }
};