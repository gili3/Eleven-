/**
 * Eleven Store - Central Firebase Initialization
 * الملف المركزي لتهيئة Firebase وإدارة الجلسات
 */

(function() {
    // 1. إعدادات Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyB1vNmCapPK0MI4H_Q0ilO7OnOgZa02jx0",
        authDomain: "queen-beauty-b811b.firebaseapp.com",
        projectId: "queen-beauty-b811b",
        storageBucket: "queen-beauty-b811b.firebasestorage.app",
        messagingSenderId: "418964206430",
        appId: "1:418964206430:web:8c9451fc56ca7f956bd5cf",
        measurementId: "G-XXXXXXXXXX"
    };

    // منع تكرار التهيئة
    if (window.firebaseInitialized) {
        console.log("⚠️ Firebase is already initialized.");
        return;
    }

    // 2. دوال مساعدة لإدارة التخزين المحلي (تنظيف تدريجي)
    const cleanLocalStorage = () => {
        const keysToRemove = ['currentUser', 'isAdmin', 'userRole', 'sessionActive'];
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        // ملاحظة: تم إبقاء التخزين المحلي الخاص بالكاش لعدم التأثير على الأداء
    };

    // 3. تهيئة Firebase
    const initFirebase = () => {
        if (!window.firebaseModules) {
            console.error("❌ Firebase Modules not found.");
            return;
        }

        try {
            const { initializeApp, getAuth, getFirestore, getStorage, onAuthStateChanged } = window.firebaseModules;
            
            const app = initializeApp(firebaseConfig);
            const auth = getAuth(app);
            const db = getFirestore(app);
            const storage = getStorage(app);

            // تعيين المتغيرات العالمية الموحدة
            window.app = app;
            window.auth = auth;
            window.db = db;
            window.storage = storage;
            
            // للتوافق مع الكود القديم
            window.firebaseApp = app;
            window.firebaseAuth = auth;
            window.firebaseDb = db;
            window.firebaseStorage = storage;

            window.firebaseInitialized = true;
            console.log("🚀 Firebase Central Initialization Complete");

            // 4. مستمع حالة المصادقة المركزي
            onAuthStateChanged(auth, async (user) => {
                // تنظيف التخزين المحلي عند أي تغير في الحالة لضمان الأمان
                cleanLocalStorage();

                if (user) {
                    console.log("👤 User Logged In:", user.email);
                    window.currentUser = user;
                    
                    // جلب بيانات إضافية (مثل isAdmin) من Firestore
                    try {
                        const { doc, getDoc } = window.firebaseModules;
                        const userDoc = await getDoc(doc(db, "users", user.uid));
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            window.userData = userData;
                            window.isAdmin = userData.isAdmin === true;
                            console.log("🛡️ Admin Status Verified:", window.isAdmin);
                        } else {
                            window.isAdmin = false;
                        }
                    } catch (e) {
                        console.error("Error fetching user data:", e);
                        window.isAdmin = false;
                    }
                } else {
                    console.log("👤 No User Logged In");
                    window.currentUser = null;
                    window.userData = null;
                    window.isAdmin = false;
                }

                // إرسال حدث مخصص عند تغير حالة المستخدم
                window.dispatchEvent(new CustomEvent('auth-state-changed', { 
                    detail: { 
                        user: window.currentUser, 
                        isAdmin: window.isAdmin,
                        userData: window.userData
                    } 
                }));
            });

        } catch (error) {
            console.error("❌ Firebase Initialization Error:", error);
        }
    };

    // الانتظار حتى تحميل الموديولات
    if (window.firebaseModules) {
        initFirebase();
    } else {
        window.addEventListener('firebase-ready', initFirebase);
    }
})();
