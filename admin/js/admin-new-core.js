/**
 * admin-new-core.js
 * المحرك الأساسي لوحة التحكم - النسخة المصلحة
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

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 بدء تشغيل لوحة التحكم...');
    
    try {
        // استخدام Firebase الموحد
        if (typeof window.initializeFirebaseUnified === 'function') {
            const instance = await window.initializeFirebaseUnified();
            if (instance) {
                window.db = instance.db;
                window.storage = instance.storage;
                window.auth = instance.auth;
                console.log('✅ Firebase مهيأ (موحد)');
            }
        } else {
            // الطريقة البديلة
            if (!window.firebaseConfig) {
                console.warn('⚠️ Firebase config not found, waiting...');
                await new Promise(resolve => window.addEventListener('firebase-config-loaded', resolve, { once: true }));
            }

            const firebaseConfig = window.firebaseConfig;
            let app;
            try {
                app = window.firebaseModules.getApp();
            } catch (e) {
                app = window.firebaseModules.initializeApp(firebaseConfig);
            }
            
            window.db = window.firebaseModules.getFirestore(app);
            window.storage = window.firebaseModules.getStorage(app);
            window.auth = window.firebaseModules.getAuth(app);

            // إعداد الجلسة - استخدام LOCAL بدلاً من SESSION
            if (window.firebaseModules.setPersistence && window.firebaseModules.browserLocalPersistence) {
                try {
                    await window.firebaseModules.setPersistence(window.auth, window.firebaseModules.browserLocalPersistence);
                    console.log('✅ تم ضبط استمرارية الجلسة على LOCAL');
                } catch (error) {
                    console.warn('⚠️ تعذر تعيين نمط الجلسة:', error);
                }
            }
        }

        // إظهار المحتوى
        const showAdminContent = () => {
            const loader = document.getElementById('initialLoaderAdmin');
            if (loader) loader.style.display = 'none';
            const container = document.querySelector('.admin-container');
            if (container) container.style.display = 'block';
        };

        showAdminContent();

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
                    }
                } catch (error) {
                    console.error('❌ خطأ في جلب بيانات المستخدم:', error);
                }
            }
            
            // تحميل البيانات الأولية
            await loadInitialData();
            
            // تحميل القسم الافتراضي (الإحصائيات)
            await loadCurrentSection('dashboard');
        });

    } catch (error) {
        console.error('❌ خطأ في التهيئة:', error);
        const loader = document.getElementById('initialLoaderAdmin');
        if (loader) loader.style.display = 'none';
        const container = document.querySelector('.admin-container');
        if (container) container.style.display = 'block';
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
