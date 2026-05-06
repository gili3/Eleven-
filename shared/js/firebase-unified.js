/**
 * firebase-unified.js - Firebase موحد مع جلسة دائمة (نسخة محسنة الأداء)
 */

(function() {
    'use strict';

    if (window.firebaseInstance) return;

    const FIREBASE_CONFIG = window.FIREBASE_CONFIG || {};

    window.firebaseInstance = null;
    window.firebaseInitialized = false;
    window.firebaseInitPromise = null;

    async function initializeFirebaseUnified() {
        if (window.firebaseInitPromise) return window.firebaseInitPromise;
        if (window.firebaseInitialized && window.firebaseInstance) return window.firebaseInstance;

        window.firebaseInitPromise = (async () => {
            try {
                // انتظار تحميل وحدات Firebase
                if (!window.firebaseModules) {
                    console.log("⏳ بانتظار تحميل وحدات Firebase...");
                    await new Promise(resolve => {
                        window.addEventListener('firebase-ready', () => resolve(), { once: true });
                        if (window.firebaseModules) resolve();
                    });
                }

                const modules = window.firebaseModules;

                let app;
                try {
                    // ✅ استخدام getApp لتجنب إنشاء تطبيق مكرر
                    app = modules.getApp();
                    console.log("✅ تم استخدام تطبيق Firebase موجود");
                } catch (e) {
                    // التطبيق غير موجود، إنشاء جديد
                    if (!FIREBASE_CONFIG.apiKey) {
                        console.warn("⚠️ إعدادات Firebase غير مكتملة");
                    }
                    app = modules.initializeApp(FIREBASE_CONFIG);
                    console.log("✅ تم إنشاء تطبيق Firebase جديد");
                }

                const auth = modules.getAuth(app);
                const db = modules.getFirestore(app);
                const storage = modules.getStorage(app);

                if (modules.setPersistence && modules.browserLocalPersistence) {
                    try {
                        await modules.setPersistence(auth, modules.browserLocalPersistence);
                        console.log("✅ جلسة Firebase: LOCAL (دائمة)");
                    } catch (err) {
                        console.warn("⚠️ تعذر ضبط persistence:", err);
                    }
                }

                window.firebaseInstance = { app, auth, db, storage };
                window.auth = auth;
                window.db = db;
                window.storage = storage;
                window.firebaseInitialized = true;

                window.dispatchEvent(new CustomEvent('firebase-unified-ready'));
                console.log("✅ Firebase Unified مهيأ بنجاح");

                return window.firebaseInstance;
            } catch (error) {
                console.error("❌ خطأ في تهيئة Firebase:", error);
                window.firebaseInitPromise = null;
                throw error;
            }
        })();

        return window.firebaseInitPromise;
    }

    window.initializeFirebaseUnified = initializeFirebaseUnified;
    window.getFirebaseUnified = async () => {
        if (window.firebaseInitialized && window.firebaseInstance) return window.firebaseInstance;
        return await initializeFirebaseUnified();
    };

    // بدء التهيئة تلقائياً إذا كانت الإعدادات متوفرة
    if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) {
        initializeFirebaseUnified();
    }

    console.log("✅ firebase-unified.js (نسخة محسنة مع getApp) جاهز");
})();