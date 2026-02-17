/**
 * admin-new-core.js
 * المحرك الأساسي لوحة التحكم - النسخة المتوافقة مع التصميم الأصلي
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
    console.log('🚀 بدء تشغيل لوحة التحكم المحدثة...');
    
    try {
        // استخدام التهيئة الموحدة من admin.html
        if (!window.auth || !window.db) {
            const firebaseConfig = window.firebaseConfig;
            if (!firebaseConfig) throw new Error('Firebase config not found');

            const app = window.firebaseModules.initializeApp(firebaseConfig);
            window.db = window.firebaseModules.getFirestore(app);
            window.storage = window.firebaseModules.getStorage(app);
            window.auth = window.firebaseModules.getAuth(app);
        }
        
        // ضبط استمرارية الجلسة لتكون دائمة (Local)
        if (window.firebaseModules.setPersistence && window.firebaseModules.browserLocalPersistence) {
            await window.firebaseModules.setPersistence(window.auth, window.firebaseModules.browserLocalPersistence)
                .catch(err => console.error("Persistence Error:", err));
        }

        // التحقق من حالة المصادقة
        let authChecked = false;
        window.firebaseModules.onAuthStateChanged(window.auth, async (user) => {
            authChecked = true;
            if (user) {
                try {
                    const userDoc = await window.firebaseModules.getDoc(
                        window.firebaseModules.doc(window.db, 'users', user.uid)
                    );

                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        if (userData.isAdmin || userData.role === 'admin') {
                            console.log('✅ تم التحقق من صلاحيات الأدمن');
                            window.currentUser = { uid: user.uid, ...userData };
                            
                            // تحميل البيانات الأساسية
                            await loadInitialData();
                            
                            // تحميل القسم الافتراضي
                            await loadCurrentSection('dashboard');
                        } else {
                            alert('❌ ليس لديك صلاحيات للدخول');
                            window.location.href = 'index.html';
                        }
                    } else {
                        alert('❌ المستخدم غير موجود');
                        window.location.href = 'login.html';
                    }
                } catch (error) {
                    console.error('❌ خطأ في التحقق من المستخدم:', error);
                    alert('❌ حدث خطأ في التحقق من الصلاحيات');
                }
            } else {
                // ننتظر قليلاً للتأكد من أن Firebase لم يجد جلسة مخزنة محلياً
                setTimeout(() => {
                    if (!window.auth.currentUser) {
                        window.location.href = 'login.html';
                    }
                }, 1500);
            }
        });

    } catch (error) {
        console.error('❌ خطأ في التهيئة:', error);
        alert('❌ فشل الاتصال بقاعدة البيانات');
    }
});

// تحميل البيانات الأولية
async function loadInitialData() {
    try {
        // تحميل الفئات أولاً لأنها مطلوبة للمنتجات
        if (window.loadCategories) await window.loadCategories();
        
        // تحميل البيانات الأخرى بالتوازي
        const promises = [];
        if (window.loadProducts) promises.push(window.loadProducts());
        if (window.loadOrders) promises.push(window.loadOrders());
        if (window.loadUsers) promises.push(window.loadUsers());
        if (window.loadCoupons) promises.push(window.loadCoupons());
        if (window.loadMessages) promises.push(window.loadMessages());
        if (window.loadReviews) promises.push(window.loadReviews());
        
        await Promise.all(promises);
        console.log('✅ تم تحميل جميع البيانات');
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

    // التمرير للأعلى
    window.adminUtils.scrollToTop();

    // تحميل بيانات القسم
    await loadCurrentSection(tabId);
};

/**
 * تسجيل الخروج
 */
window.logoutAdmin = function() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        // مسح بيانات المستخدم من التخزين المحلي قبل تسجيل الخروج
        if (window.localStorage) {
            localStorage.removeItem('_usr');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('userPhone');
            localStorage.removeItem('userAddress');
            // مسح الكاش المرتبط بالمستخدم
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('cache_')) localStorage.removeItem(key);
            });
        }
        
        if (window.firebaseModules && window.auth) {
            window.firebaseModules.signOut(window.auth)
                .then(() => {
                    if (window.adminUtils && window.adminUtils.showToast) {
                        window.adminUtils.showToast('تم تسجيل الخروج بنجاح', 'success');
                    }
                    setTimeout(() => { window.location.href = 'login.html'; }, 500);
                })
                .catch(error => {
                    console.error('❌ خطأ في تسجيل الخروج:', error);
                    window.location.href = 'login.html';
                });
        } else {
            window.location.href = 'login.html';
        }
    }
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
                if (window.loadCategories) await window.loadCategories();
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
            case 'reviews':
                if (window.loadReviews) await window.loadReviews();
                break;
            case 'coupons':
                if (window.loadCoupons) await window.loadCoupons();
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
        window.adminUtils.showToast(`فشل تحميل ${sectionId}`, 'error');
    }
}

// دالة مساعدة للحصول على اسم الفئة
window.getCategoryName = function(categoryId) {
    if (!categoryId || !window.allCategories || !Array.isArray(window.allCategories)) return 'عام';
    const cat = window.allCategories.find(c => c.id === categoryId);
    return cat ? cat.name : 'عام';
};

// دالة مساعدة للحصول على اسم المنتج
window.getProductName = function(productId) {
    if (!productId || !window.allProducts || !Array.isArray(window.allProducts)) return 'منتج';
    const prod = window.allProducts.find(p => p.id === productId);
    return prod ? prod.name : 'منتج';
};

// دالة مساعدة للحصول على اسم المستخدم
window.getUserName = function(userId) {
    if (!userId || !window.allUsers || !Array.isArray(window.allUsers)) return 'مستخدم';
    const user = window.allUsers.find(u => u.id === userId);
    return user ? (user.displayName || user.name || 'مستخدم') : 'مستخدم';
};