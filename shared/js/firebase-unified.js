/**
 * firebase-unified.js - النسخة الجاهزة للتشغيل (مع مفاتيح Firebase المدمجة)
 * نظام Firebase الموحد لجميع الصفحات - نسخة موحدة الجلسة
 */

// متغيرات عامة للتطبيق
window.firebaseInstance = null;
window.firebaseInitialized = false;
window.firebaseInitPromise = null;

/**
 * الحصول على إعدادات Firebase بشكل مباشر
 */
function getFirebaseConfig() {
    return {
        apiKey: "AIzaSyB1vNmCapPK0MI4H_Q0ilO7OnOgZa02jx0",
        authDomain: "queen-beauty-b811b.firebaseapp.com",
        projectId: "queen-beauty-b811b",
        storageBucket: "queen-beauty-b811b.firebasestorage.app",
        messagingSenderId: "418964206430",
        appId: "1:418964206430:web:8c9451fc56ca7f956bd5cf",
        measurementId: "G-XXXXXXXXXX"
    };
}

/**
 * تهيئة Firebase بشكل موحد مع جلسة دائمة (Local)
 */
async function initializeFirebaseUnified() {
    if (window.firebaseInitPromise) {
        return window.firebaseInitPromise;
    }

    if (window.firebaseInitialized && window.firebaseInstance) {
        return window.firebaseInstance;
    }

    window.firebaseInitPromise = (async () => {
        try {
            if (!window.firebaseModules) {
                console.log("⏳ بانتظار تحميل وحدات Firebase...");
                await new Promise(resolve => {
                    const checkModules = () => {
                        if (window.firebaseModules) {
                            resolve();
                        } else {
                            setTimeout(checkModules, 100);
                        }
                    };
                    checkModules();
                });
            }

            const config = getFirebaseConfig();
            
            if (!config.apiKey || !config.projectId) {
                throw new Error("Firebase configuration is incomplete.");
            }
            
            let app;
            try {
                app = window.firebaseModules.getApp();
            } catch (e) {
                app = window.firebaseModules.initializeApp(config);
            }

            const auth = window.firebaseModules.getAuth(app);
            const db = window.firebaseModules.getFirestore(app);
            const storage = window.firebaseModules.getStorage(app);

            if (window.firebaseModules.setPersistence && window.firebaseModules.browserLocalPersistence) {
                try {
                    await window.firebaseModules.setPersistence(auth, window.firebaseModules.browserLocalPersistence);
                    console.log("✅ تم ضبط استمرارية الجلسة على LOCAL (دائم) - موحد عبر جميع الصفحات");
                } catch (err) {
                    console.warn("⚠️ تعذر ضبط استمرارية الجلسة:", err);
                }
            }

            window.firebaseInstance = {
                app,
                auth,
                db,
                storage
            };

            window.auth = auth;
            window.db = db;
            window.storage = storage;

            window.firebaseInitialized = true;
            console.log("✅ Firebase مهيأ بنجاح (موحد مع جلسة دائمة)");

            window.dispatchEvent(new CustomEvent("firebase-unified-ready"));
            window.dispatchEvent(new CustomEvent("firebase-ready"));

            return window.firebaseInstance;
        } catch (error) {
            console.error("❌ خطأ في تهيئة Firebase:", error);
            window.firebaseInitPromise = null;
            throw error;
        }
    })();

    return window.firebaseInitPromise;
}

/**
 * الحصول على نسخة Firebase الموحدة
 */
async function getFirebaseUnified() {
    if (window.firebaseInitialized && window.firebaseInstance) {
        return window.firebaseInstance;
    }
    return await initializeFirebaseUnified();
}

/**
 * التحقق من حالة المصادقة الحالية
 */
async function getCurrentAuthState() {
    try {
        const firebase = await getFirebaseUnified();
        return new Promise((resolve) => {
            const unsubscribe = window.firebaseModules.onAuthStateChanged(firebase.auth, (user) => {
                unsubscribe();
                resolve(user);
            });
        });
    } catch (error) {
        console.error("❌ خطأ في الحصول على حالة المصادقة:", error);
        return null;
    }
}

/**
 * مراقبة حالة المصادقة بشكل مستمر
 */
function onAuthStateChangedUnified(callback) {
    if (!window.firebaseModules || !window.firebaseInstance) {
        console.warn("⚠️ Firebase غير مهيأ بعد");
        return () => {};
    }

    return window.firebaseModules.onAuthStateChanged(window.firebaseInstance.auth, callback);
}

/**
 * تسجيل الخروج الموحد مع تنظيف كامل للبيانات
 */
async function signOutUnified() {
    try {
        const firebase = await getFirebaseUnified();
        await window.firebaseModules.signOut(firebase.auth);
        
        sessionStorage.clear();
        localStorage.removeItem("_usr");
        localStorage.removeItem("currentUser");
        localStorage.removeItem("_uid");
        
        console.log("✅ تم تسجيل الخروج بنجاح وتنظيف البيانات");
        return true;
    } catch (error) {
        console.error("❌ خطأ في تسجيل الخروج:", error);
        return false;
    }
}

/**
 * التحقق من اتصال Firebase
 */
async function checkFirebaseConnectionUnified() {
    try {
        const firebase = await getFirebaseUnified();
        const settingsRef = window.firebaseModules.collection(firebase.db, "settings");
        await window.firebaseModules.getDocs(settingsRef);
        console.log("✅ اتصال Firebase ناجح");
        return true;
    } catch (error) {
        console.error("❌ فشل الاتصال بـ Firebase:", error);
        return false;
    }
}

window.initializeFirebaseUnified = initializeFirebaseUnified;
window.getFirebaseUnified = getFirebaseUnified;
window.getCurrentAuthState = getCurrentAuthState;
window.onAuthStateChangedUnified = onAuthStateChangedUnified;
window.signOutUnified = signOutUnified;
window.checkFirebaseConnectionUnified = checkFirebaseConnectionUnified;

console.log("✅ Firebase Unified Module Loaded (جلسة موحدة - LOCAL Persistence)");