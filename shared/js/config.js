/**
 * config.js - ملف الإعدادات المحدث (نسخة مؤمنة)
 * تم نقل المفاتيح إلى env-config.js لسهولة الإدارة والأمان.
 */

// التأكد من وجود APP_ENV
const SECURE_CONFIG = window.APP_ENV || {};

window.FIREBASE_CONFIG = {
    apiKey: SECURE_CONFIG.FIREBASE_API_KEY || "",
    authDomain: "queen-beauty-b811b.firebaseapp.com",
    projectId: "queen-beauty-b811b",
    storageBucket: "queen-beauty-b811b.firebasestorage.app",
    messagingSenderId: "418964206430",
    appId: "1:418964206430:web:8c9451fc56ca7f956bd5cf"
};

// مفتاح VAPID لـ Firebase Cloud Messaging
window.FCM_VAPID_KEY = SECURE_CONFIG.FCM_VAPID_KEY || "";

console.log("🔐 تم تحميل إعدادات الأمان بنجاح من مصدر خارجي");
