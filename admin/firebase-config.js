// Eleven Store - Firebase Configuration
// تم عزل الإعدادات في ملف منفصل لتحسين الأمان والتنظيم

const firebaseConfig = {
    apiKey: "AIzaSyB1vNmCapPK0MI4H_Q0ilO7OnOgZa02jx0",
    authDomain: "queen-beauty-b811b.firebaseapp.com",
    projectId: "queen-beauty-b811b",
    storageBucket: "queen-beauty-b811b.firebasestorage.app",
    messagingSenderId: "418964206430",
    appId: "1:418964206430:web:8c9451fc56ca7f956bd5cf",
    measurementId: "G-XXXXXXXXXX" // اختياري للتحليلات
};

// تصدير الإعدادات للاستخدام في الملفات الأخرى
window.firebaseConfig = firebaseConfig;
console.log("🔐 Firebase Configuration Loaded Securely");