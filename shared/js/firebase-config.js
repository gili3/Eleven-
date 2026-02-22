// firebase-config-secure.js - إعدادات Firebase الآمنة
// ⚠️ تحذير: يجب نقل بيانات Firebase الحساسة إلى متغيرات البيئة على الخادم

/**
 * إعدادات Firebase - يجب تحميلها من خادم آمن وليس من الكود الأمامي
 * استخدم Cloud Functions أو خادم backend لتوفير هذه البيانات
 */

// دالة آمنة لتحميل إعدادات Firebase من خادم آمن
async function loadFirebaseConfigSecurely() {
    try {
        // بدلاً من تخزين المفاتيح هنا، احصل عليها من نقطة نهاية آمنة
        // مثال:
        // const response = await fetch('/api/firebase-config', {
        //     headers: { 'Authorization': `Bearer ${sessionToken}` }
        // });
        // const config = await response.json();
        
        // للآن، استخدم متغيرات البيئة إن أمكن
        const firebaseConfig = {
            // ⚠️ لا تضع المفاتيح الفعلية هنا - استخدم متغيرات البيئة
            apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "REPLACE_WITH_ENV_VAR",
            authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "REPLACE_WITH_ENV_VAR",
            projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "REPLACE_WITH_ENV_VAR",
            storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "REPLACE_WITH_ENV_VAR",
            messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "REPLACE_WITH_ENV_VAR",
            appId: process.env.REACT_APP_FIREBASE_APP_ID || "REPLACE_WITH_ENV_VAR",
            measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "REPLACE_WITH_ENV_VAR"
        };
        
        // تحقق من أن جميع المفاتيح موجودة
        const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
        const missingKeys = requiredKeys.filter(key => !firebaseConfig[key] || firebaseConfig[key].includes('REPLACE_WITH_ENV_VAR'));
        
        if (missingKeys.length > 0) {
            console.error('❌ خطأ: المفاتيح التالية غير محددة في متغيرات البيئة:', missingKeys);
            throw new Error('Firebase configuration is incomplete. Please set environment variables.');
        }
        
        window.firebaseConfig = firebaseConfig;
        console.log("🔐 تم تحميل إعدادات Firebase بأمان");
        return firebaseConfig;
    } catch (error) {
        console.error('❌ خطأ في تحميل إعدادات Firebase:', error);
        throw error;
    }
}

// تصدير الدالة
window.loadFirebaseConfigSecurely = loadFirebaseConfigSecurely;
