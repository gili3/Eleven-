/**
 * firebase-unified.js - Firebase موحد مع جلسة دائمة
 */

(function() {
    'use strict';

    if (window.firebaseInstance) return;

    // يُفضل تحميل الإعدادات من متغير خارجي (window.FIREBASE_CONFIG) لتجنب كشف المفاتيح في الكود
    // مثال: ضع الإعدادات في ملف config.js منفصل غير مدرج في git
    const FIREBASE_CONFIG = window.FIREBASE_CONFIG || {
        apiKey: window.FIREBASE_API_KEY || '',
        authDomain: window.FIREBASE_AUTH_DOMAIN || '',
        projectId: window.FIREBASE_PROJECT_ID || '',
        storageBucket: window.FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: window.FIREBASE_MESSAGING_SENDER_ID || '',
        appId: window.FIREBASE_APP_ID || ''
    };

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
                    await new Promise(resolve => {
                        const check = () => {
                            if (window.firebaseModules) resolve();
                            else setTimeout(check, 100);
                        };
                        check();
                    });
                }

                const { initializeApp, getAuth, getFirestore, getStorage, setPersistence, browserLocalPersistence } = window.firebaseModules;

                let app;
                try {
                    app = window.firebaseModules.getApp();
                } catch (e) {
                    app = initializeApp(FIREBASE_CONFIG);
                }

                const auth = getAuth(app);
                const db = getFirestore(app);
                const storage = getStorage(app);

                if (setPersistence && browserLocalPersistence) {
                    try {
                        await setPersistence(auth, browserLocalPersistence);
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

                window.dispatchEvent(new CustomEvent('firebase-ready'));
                console.log("✅ Firebase Unified مهيأ");

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

    console.log("✅ firebase-unified.js loaded");
})();