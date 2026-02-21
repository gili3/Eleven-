// Eleven Store - Firebase Configuration
// تم تحسين الملف ليكون أكثر مرونة وأماناً

const firebaseConfig = {
    apiKey: "AIzaSyB1vNmCapPK0MI4H_Q0ilO7OnOgZa02jx0",
    authDomain: "queen-beauty-b811b.firebaseapp.com",
    projectId: "queen-beauty-b811b",
    storageBucket: "queen-beauty-b811b.firebasestorage.app",
    messagingSenderId: "418964206430",
    appId: "1:418964206430:web:8c9451fc56ca7f956bd5cf",
    measurementId: "G-XXXXXXXXXX"
};

/**
 * دالة آمنة للحصول على الإعدادات
 * تتيح إمكانية التبديل لمتغيرات البيئة مستقبلاً دون كسر المتجر
 */
function getFirebaseConfig() {
    // التحقق مما إذا كانت هناك إعدادات في متغيرات البيئة (للمطورين)
    if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_FIREBASE_API_KEY) {
        return {
            apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
            authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
            storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.REACT_APP_FIREBASE_APP_ID,
            measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
        };
    }
    return firebaseConfig;
}

// تصدير الإعدادات للاستخدام في الملفات الأخرى
window.firebaseConfig = getFirebaseConfig();

// إعلام النظام بجاهزية الإعدادات
console.log("🔐 Firebase Configuration Loaded Successfully");
window.dispatchEvent(new CustomEvent('firebase-config-loaded'));
