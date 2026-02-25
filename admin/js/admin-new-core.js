/**
 * admin-new-core.js
 * المحرك الأساسي لوحة التحكم - النسخة المصلحة (مع جلسة موحدة وتحقق من الصلاحيات)
 */

// المتغيرات العامة
window.currentUser = null;
window.allCategories = [];
window.allProducts = [];
window.allOrders = [];
window.allUsers = [];
window.allMessages = [];
window.allReviews = [];
window.allCoupons = [];

// دالة للتحقق من صلاحية المسؤول (تستخدم في كل عملية)
window.checkAdmin = function() {
    if (!window.currentUser || !window.currentUser.isAdmin) {
        if (window.adminUtils) {
            window.adminUtils.showToast('غير مصرح لك بهذه العملية', 'error');
        } else {
            alert('غير مصرح');
        }
        return false;
    }
    return true;
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 بدء تشغيل لوحة التحكم...');
    
    try {
        // استخدام Firebase الموحد (مع جلسة دائمة)
        if (typeof window.initializeFirebaseUnified === 'function') {
            const instance = await window.initializeFirebaseUnified();
            if (instance) {
                window.db = instance.db;
                window.storage = instance.storage;
                window.auth = instance.auth;
                console.log('✅ Firebase مهيأ (موحد مع جلسة دائمة)');
            }
        } else {
            // الطريقة البديلة
            const config = {
                apiKey: "AIzaSyB1vNmCapPK0MI4H_Q0ilO7OnOgZa02jx0",
                authDomain: "queen-beauty-b811b.firebaseapp.com",
                projectId: "queen-beauty-b811b",
                storageBucket: "queen-beauty-b811b.firebasestorage.app",
                messagingSenderId: "418964206430",
                appId: "1:418964206430:web:8c9451fc56ca7f956bd5cf"
            };
            let app;
            try {
                app = window.firebaseModules.getApp();
            } catch (e) {
                app = window.firebaseModules.initializeApp(config);
            }
            
            window.db = window.firebaseModules.getFirestore(app);
            window.storage = window.firebaseModules.getStorage(app);
            window.auth = window.firebaseModules.getAuth(app);

            if (window.firebaseModules.setPersistence && window.firebaseModules.browserLocalPersistence) {
                try {
                    await window.firebaseModules.setPersistence(window.auth, window.firebaseModules.browserLocalPersistence);
                    console.log('✅ تم ضبط استمرارية الجلسة على LOCAL');
                } catch (error) {
                    console.warn('⚠️ تعذر تعيين نمط الجلسة:', error);
                }
            }
        }

        // إخفاء شاشة التحميل
        const loader = document.getElementById('initialLoaderAdmin');
        if (loader) loader.style.display = 'none';
        const container = document.querySelector('.admin-container');
        if (container) container.style.display = 'block';

        // التحقق من حالة المصادقة
        window.firebaseModules.onAuthStateChanged(window.auth, async (user) => {
            if (user) {
                console.log('👤 مستخدم مسجل دخول:', user.uid);
                try {
                    const userDoc = await window.firebaseModules.getDoc(
                        window.firebaseModules.doc(window.db, 'users', user.uid)
                    );
                    if (userDoc.exists()) {
                        window.currentUser = { uid: user.uid, ...userDoc.data() };
                        // إذا لم يكن المستخدم مسؤولاً، إعادة توجيهه للصفحة الرئيسية
                        if (!window.currentUser.isAdmin) {
                            window.adminUtils.showToast('ليس لديك صلاحية الوصول للوحة التحكم', 'error');
                            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
                        }
                    } else {
                        // مستخدم غير موجود في قاعدة البيانات (غريب) - نعتبره غير مسؤول
                        window.currentUser = { uid: user.uid, isAdmin: false };
                        window.location.href = 'index.html';
                    }
                } catch (error) {
                    console.error('❌ خطأ في جلب بيانات المستخدم:', error);
                }
            } else {
                // لا يوجد مستخدم مسجل، إعادة توجيه لصفحة تسجيل الدخول
                window.location.href = 'login.html';
            }
            
            // تحميل البيانات الأولية بعد التأكد من أن المستخدم مسؤول
            if (window.currentUser && window.currentUser.isAdmin) {
                await loadInitialData();
                await loadCurrentSection('dashboard');
            }
        });

    } catch (error) {
        console.error('❌ خطأ في التهيئة:', error);
        const loader = document.getElementById('initialLoaderAdmin');
        if (loader) loader.style.display = 'none';
        const container = document.querySelector('.admin-container');
        if (container) container.style.display = 'block';
        window.location.href = 'login.html';
    }
});

// تحميل البيانات الأولية
async function loadInitialData() {
    try {
        console.log('🔄 جاري تحميل البيانات من Firebase...');
        const promises = [];
        if (window.loadCategories) promises.push(window.loadCategories());
        if (window.loadProducts) promises.push(window.loadProducts());
        
        await Promise.all(promises);
        console.log('✅ تم تحميل البيانات الأساسية');
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات الأولية:', error);
    }
}

/**
 * التبديل بين التبويبات
 */
window.switchTab = async function(tabId) {
    if (!window.checkAdmin()) return; // التحقق من الصلاحية

    // تحديث الأزرار النشطة
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-tab') === tabId) {
            tab.classList.add('active');
        }
    });

    // إخفاء جميع الأقسام وإظهار المستهدف
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const targetContent = document.getElementById(tabId);
    if (targetContent) {
        targetContent.classList.add('active');
    }

    // تحميل بيانات القسم المختار
    await loadCurrentSection(tabId);
};

// تحميل بيانات القسم الحالي
async function loadCurrentSection(sectionId) {
    if (!window.checkAdmin()) return;

    console.log(`📂 تحميل القسم: ${sectionId}`);
    try {
        switch(sectionId) {
            case 'dashboard':
                if (window.loadStats) await window.loadStats();
                break;
            case 'products':
                if (window.loadProducts) await window.loadProducts();
                break;
            case 'categories':
                if (window.loadCategories) await window.loadCategories();
                break;
            case 'orders':
                if (window.loadOrders) await window.loadOrders();
                break;
            case 'users':
                if (window.loadUsers) await window.loadUsers();
                break;
            case 'messages':
                if (window.loadMessages) await window.loadMessages();
                break;
            case 'settings':
                if (window.loadSettings) await window.loadSettings();
                break;
        }
    } catch (error) {
        console.error(`❌ خطأ في تحميل القسم ${sectionId}:`, error);
    }
}

/**
 * تسجيل الخروج
 */
window.logoutAdmin = function() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        window.firebaseModules.signOut(window.auth)
            .then(() => {
                sessionStorage.clear();
                localStorage.removeItem("_usr");
                localStorage.removeItem("currentUser");
                localStorage.removeItem("_uid");
                window.location.href = 'index.html';
            })
            .catch(error => {
                console.error('❌ خطأ في تسجيل الخروج:', error);
            });
    }
};

// دوال مساعدة
window.getCategoryName = function(categoryId) {
    if (!categoryId || !window.allCategories) return 'عام';
    const cat = window.allCategories.find(c => c.id === categoryId);
    return cat ? cat.name : 'عام';
};