/**
 * firebase-unified.js
 * نظام Firebase الموحد لجميع الصفحات
 * يضمن تهيئة واحدة فقط وجلسة موحدة عبر جميع الصفحات
 */

// متغيرات عامة للتطبيق
window.firebaseInstance = null;
window.firebaseInitialized = false;
window.firebaseInitPromise = null;

/**
 * الحصول على إعدادات Firebase
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
 * تهيئة Firebase بشكل موحد
 * يتم استدعاء هذه الدالة مرة واحدة فقط من جميع الصفحات
 */
async function initializeFirebaseUnified() {
    // إذا كان Firebase مهيأ بالفعل، أرجع الوعد الموجود
    if (window.firebaseInitPromise) {
        return window.firebaseInitPromise;
    }

    // إذا كان Firebase مهيأ بالفعل، أرجع الكائن الموجود
    if (window.firebaseInitialized && window.firebaseInstance) {
        return window.firebaseInstance;
    }

    // إنشاء وعد جديد للتهيئة
    window.firebaseInitPromise = (async () => {
        try {
            // الانتظار حتى يتم تحميل وحدات Firebase
            if (!window.firebaseModules) {
                console.log('⏳ بانتظار تحميل وحدات Firebase...');
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
            
            // محاولة الحصول على التطبيق الموجود أولاً
            let app;
            try {
                app = window.firebaseModules.getApp();
            } catch (e) {
                // إذا لم يكن هناك تطبيق، قم بإنشاء واحد جديد
                app = window.firebaseModules.initializeApp(config);
            }

            // الحصول على الخدمات
            const auth = window.firebaseModules.getAuth(app);
            const db = window.firebaseModules.getFirestore(app);
            const storage = window.firebaseModules.getStorage(app);

            // ضبط استمرارية الجلسة لتكون دائمة (Local)
            // هذا يضمن بقاء المستخدم مسجل دخول حتى بعد إغلاق المتصفح
            if (window.firebaseModules.setPersistence && window.firebaseModules.browserLocalPersistence) {
                try {
                    await window.firebaseModules.setPersistence(auth, window.firebaseModules.browserLocalPersistence);
                    console.log('✅ تم ضبط استمرارية الجلسة على LOCAL (دائمة)');
                } catch (err) {
                    console.warn('⚠️ تعذر ضبط استمرارية الجلسة:', err);
                }
            }

            // حفظ الكائن الموحد
            window.firebaseInstance = {
                app,
                auth,
                db,
                storage
            };

            // تعيين المتغيرات العامة للتوافقية مع الكود القديم
            window.auth = auth;
            window.db = db;
            window.storage = storage;

            window.firebaseInitialized = true;
            console.log('✅ Firebase مهيأ بنجاح (موحد)');

            // إرسال حدث للإشارة إلى أن Firebase جاهز
            window.dispatchEvent(new CustomEvent('firebase-unified-ready'));

            return window.firebaseInstance;
        } catch (error) {
            console.error('❌ خطأ في تهيئة Firebase:', error);
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
        console.error('❌ خطأ في الحصول على حالة المصادقة:', error);
        return null;
    }
}

/**
 * مراقبة حالة المصادقة بشكل مستمر
 */
function onAuthStateChangedUnified(callback) {
    if (!window.firebaseModules || !window.firebaseInstance) {
        console.warn('⚠️ Firebase غير مهيأ بعد');
        return () => {};
    }

    return window.firebaseModules.onAuthStateChanged(window.firebaseInstance.auth, callback);
}

/**
 * تسجيل الخروج
 */
async function signOutUnified() {
    try {
        const firebase = await getFirebaseUnified();
        await window.firebaseModules.signOut(firebase.auth);
        console.log('✅ تم تسجيل الخروج بنجاح');
        return true;
    } catch (error) {
        console.error('❌ خطأ في تسجيل الخروج:', error);
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
        console.log('✅ اتصال Firebase ناجح');
        return true;
    } catch (error) {
        console.error('❌ فشل الاتصال بـ Firebase:', error);
        return false;
    }
}

// تصدير الدوال للاستخدام العام
window.initializeFirebaseUnified = initializeFirebaseUnified;
window.getFirebaseUnified = getFirebaseUnified;
window.getCurrentAuthState = getCurrentAuthState;
window.onAuthStateChangedUnified = onAuthStateChangedUnified;
window.signOutUnified = signOutUnified;
window.checkFirebaseConnectionUnified = checkFirebaseConnectionUnified;

console.log('✅ Firebase Unified Module Loaded');
