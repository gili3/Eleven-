/**
 * admin-new-core.js
 * المحرك الأساسي لوحة التحكم - النسخة المصلحة (مع جلسة موحدة وتحقق من الصلاحيات)
 * تم الإصلاح: 2026-05-03
 */

// المتغيرات العامة
window.allCategories = [];
window.allProducts = [];
window.allOrders = [];
window.allUsers = [];
window.allMessages = [];
window.allReviews = [];
window.allCoupons = [];

// دالة لقطع اتصال جميع المراقبين
function disconnectAllObservers() {
    if (window.productsObserver) {
        window.productsObserver.disconnect();
        window.productsObserver = null;
    }
    if (window.categoriesObserver) {
        window.categoriesObserver.disconnect();
        window.categoriesObserver = null;
    }
    if (window.ordersObserver) {
        window.ordersObserver.disconnect();
        window.ordersObserver = null;
    }
    if (window.usersObserver) {
        window.usersObserver.disconnect();
        window.usersObserver = null;
    }
    if (window.messagesObserver) {
        window.messagesObserver.disconnect();
        window.messagesObserver = null;
    }
    if (window.reviewsObserver) {
        window.reviewsObserver.disconnect();
        window.reviewsObserver = null;
    }
    if (window.couponsObserver) {
        window.couponsObserver.disconnect();
        window.couponsObserver = null;
    }
    console.log('✅ تم قطع اتصال جميع المراقبين');
}

// الدالة المفقودة: تحميل البيانات الأولية
async function loadInitialData() {
    console.log('📦 جاري تحميل البيانات الأساسية...');
    try {
        const promises = [];

        // تحميل الفئات
        if (typeof window.loadCategories === 'function') {
            promises.push(
                window.loadCategories().catch(e => {
                    console.warn('⚠️ فشل تحميل الفئات:', e);
                })
            );
        } else {
            console.warn('⚠️ دالة loadCategories غير معرفة');
        }

        // تحميل المنتجات
        if (typeof window.loadProducts === 'function') {
            promises.push(
                window.loadProducts().catch(e => {
                    console.warn('⚠️ فشل تحميل المنتجات:', e);
                })
            );
        } else {
            console.warn('⚠️ دالة loadProducts غير معرفة');
        }

        // يمكنك إضافة تحميل الكوبونات هنا أيضاً إذا أردت
        if (typeof window.loadCoupons === 'function') {
            promises.push(
                window.loadCoupons().catch(e => {
                    console.warn('⚠️ فشل تحميل الكوبونات:', e);
                })
            );
        }

        // انتظار جميع الوعود (allSettled يضمن عدم توقف الكل عند فشل أحدها)
        const results = await Promise.allSettled(promises);
        
        // سجل النتائج للتشخيص
        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        console.log(`✅ تم تحميل البيانات الأساسية (نجح: ${succeeded}, فشل: ${failed})`);
        
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات الأولية:', error);
        ErrorHandler.handle(error, 'loadInitialData');
    }
}

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
            console.warn('⚠️ دالة initializeFirebaseUnified غير معرفة، قد تكون Firebase غير مهيأة');
        }

        // إخفاء شاشة التحميل الأولية
        const loader = document.getElementById('initialLoaderAdmin');
        if (loader) {
            loader.style.display = 'none';
        }
        
        // إظهار الحاوية الرئيسية
        const container = document.querySelector('.admin-container');
        if (container) {
            container.style.display = 'block';
        }

        // التحقق من حالة المصادقة
        if (!window.firebaseModules || !window.firebaseModules.onAuthStateChanged) {
            console.error('❌ Firebase Modules غير محملة');
            window.location.href = 'login.html';
            return;
        }

        window.firebaseModules.onAuthStateChanged(window.auth, async (user) => {
            if (user) {
                console.log('👤 مستخدم مسجل دخول:', user.uid);
                try {
                    const userDoc = await window.firebaseModules.getDoc(
                        window.firebaseModules.doc(window.db, 'users', user.uid)
                    );
                    
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        
                        // التحقق من وجود AppState
                        if (typeof AppState !== 'undefined' && AppState.setUser) {
                            AppState.setUser({ uid: user.uid, ...userData }, false);
                        }
                        
                        // التحقق من صلاحية المسؤول
                        const isAdmin = userData.isAdmin || userData.role === 'admin';
                        
                        if (!isAdmin) {
                            console.warn('⚠️ مستخدم غير مسؤول يحاول الوصول للوحة التحكم');
                            if (typeof window.adminUtils !== 'undefined' && window.adminUtils.showToast) {
                                window.adminUtils.showToast('ليس لديك صلاحية الوصول للوحة التحكم', 'error');
                            }
                            setTimeout(() => { 
                                window.location.href = 'index.html'; 
                            }, 2000);
                            return;
                        }
                        
                        // المستخدم مسؤول، تحميل البيانات
                        console.log('✅ مستخدم مسؤول، جاري تحميل لوحة التحكم...');
                        
                        // تحميل البيانات الأولية والقسم الحالي بالتوازي
                        await loadInitialData();
                        await loadCurrentSection('dashboard');
                        
                        console.log('✅ تم تحميل لوحة التحكم بالكامل');
                        
                    } else {
                        // مستخدم غير موجود في قاعدة البيانات
                        console.warn('⚠️ مستند المستخدم غير موجود في Firestore');
                        window.location.href = 'index.html';
                    }
                } catch (error) {
                    console.error('❌ خطأ في جلب بيانات المستخدم:', error);
                    if (typeof ErrorHandler !== 'undefined') {
                        ErrorHandler.handle(error, 'checkAdmin');
                    }
                    window.location.href = 'login.html';
                }
            } else {
                // لا يوجد مستخدم مسجل، إعادة توجيه لصفحة تسجيل الدخول
                console.warn('⚠️ لا يوجد مستخدم مسجل');
                window.location.href = 'login.html';
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

/**
 * التبديل بين التبويبات
 */
window.switchTab = async function(tabId) {
    console.log(`🔄 التبديل إلى تبويب: ${tabId}`);
    
    // التحقق من الصلاحية
    if (typeof window.checkAdmin === 'function' && !window.checkAdmin()) {
        console.warn('⚠️ فشل التحقق من الصلاحية');
        return;
    }

    // قطع اتصال جميع المراقبين قبل تغيير التبويب
    disconnectAllObservers();

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
    } else {
        console.warn(`⚠️ القسم ${tabId} غير موجود في DOM`);
    }

    // التمرير للأعلى
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // تحميل بيانات القسم المختار
    await loadCurrentSection(tabId);
};

// تحميل بيانات القسم الحالي
async function loadCurrentSection(sectionId) {
    console.log(`📂 تحميل بيانات القسم: ${sectionId}`);
    
    // التحقق من الصلاحية
    if (typeof window.checkAdmin === 'function' && !window.checkAdmin()) {
        console.warn('⚠️ فشل التحقق من الصلاحية');
        return;
    }

    try {
        switch(sectionId) {
            case 'dashboard':
                if (typeof window.loadStats === 'function') {
                    await window.loadStats();
                } else {
                    console.warn('⚠️ دالة loadStats غير معرفة');
                }
                break;
                
            case 'products':
                if (typeof window.loadProducts === 'function') {
                    await window.loadProducts();
                } else {
                    console.warn('⚠️ دالة loadProducts غير معرفة');
                }
                break;
                
            case 'categories':
                if (typeof window.loadCategories === 'function') {
                    console.log('🔄 جاري تحميل الفئات...');
                    await window.loadCategories();
                    console.log('✅ تم تحميل الفئات بنجاح');
                } else {
                    console.error('❌ دالة loadCategories غير معرفة');
                    // عرض رسالة للمستخدم
                    const grid = document.getElementById('categoriesGrid');
                    if (grid) {
                        grid.innerHTML = '<div style="text-align:center;padding:40px;color:red;">⚠️ خطأ: دالة تحميل الفئات غير متوفرة. تأكد من تحميل ملف categories.js</div>';
                    }
                }
                break;
                
            case 'orders':
                if (typeof window.loadOrders === 'function') {
                    await window.loadOrders();
                } else {
                    console.warn('⚠️ دالة loadOrders غير معرفة');
                }
                break;
                
            case 'users':
                if (typeof window.loadUsers === 'function') {
                    await window.loadUsers();
                } else {
                    console.warn('⚠️ دالة loadUsers غير معرفة');
                }
                break;
                
            case 'messages':
                if (typeof window.loadMessages === 'function') {
                    await window.loadMessages();
                } else {
                    console.warn('⚠️ دالة loadMessages غير معرفة');
                }
                break;
                
            case 'settings':
                if (typeof window.loadSettings === 'function') {
                    await window.loadSettings();
                } else {
                    console.warn('⚠️ دالة loadSettings غير معرفة');
                }
                break;
                
            case 'coupons':
                if (typeof window.loadCoupons === 'function') {
                    await window.loadCoupons();
                } else {
                    console.warn('⚠️ دالة loadCoupons غير معرفة');
                }
                break;
                
            default:
                console.warn(`⚠️ قسم غير معروف: ${sectionId}`);
        }
    } catch (error) {
        console.error(`❌ خطأ في تحميل القسم ${sectionId}:`, error);
        if (typeof ErrorHandler !== 'undefined') {
            ErrorHandler.handle(error, `loadCurrentSection-${sectionId}`);
        }
    }
}

/**
 * تسجيل الخروج
 */
window.logoutAdmin = function() {
    // التحقق من وجود ModalManager
    if (typeof ModalManager !== 'undefined' && ModalManager.confirm) {
        ModalManager.confirm('هل أنت متأكد من تسجيل الخروج؟', 'تأكيد', () => {
            performLogout();
        });
    } else {
        // استخدام confirm العادي إذا لم يكن ModalManager متوفراً
        if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
            performLogout();
        }
    }
};

function performLogout() {
    if (!window.firebaseModules || !window.firebaseModules.signOut) {
        console.error('❌ Firebase Modules غير متاحة لتسجيل الخروج');
        // تنظيف محلي حتى لو لم تكن Firebase متاحة
        cleanupAndRedirect();
        return;
    }
    
    window.firebaseModules.signOut(window.auth)
        .then(() => {
            console.log('✅ تم تسجيل الخروج بنجاح');
            cleanupAndRedirect();
        })
        .catch(error => {
            console.error('❌ خطأ في تسجيل الخروج:', error);
            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.handle(error, 'logoutAdmin');
            }
            // تنظيف على أي حال
            cleanupAndRedirect();
        });
}

function cleanupAndRedirect() {
    // تنظيف AppState
    if (typeof AppState !== 'undefined' && AppState.reset) {
        AppState.reset();
    }
    
    // تنظيف التخزين
    sessionStorage.clear();
    localStorage.removeItem("_usr");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("_uid");
    
    // إعادة التوجيه
    window.location.href = 'index.html';
}

// دوال مساعدة
window.getCategoryName = function(categoryId) {
    if (!categoryId || !window.allCategories || !Array.isArray(window.allCategories)) {
        return 'عام';
    }
    const cat = window.allCategories.find(c => c.id === categoryId);
    return cat ? (cat.name || 'غير معروف') : 'عام';
};

// إضافة دالة للتحقق من وجود جميع الوظائف المطلوبة
window.checkRequiredFunctions = function() {
    const required = [
        'loadStats',
        'loadProducts', 
        'loadCategories',
        'loadOrders',
        'loadUsers',
        'loadMessages',
        'loadSettings',
        'loadCoupons'
    ];
    
    const missing = required.filter(fn => typeof window[fn] !== 'function');
    
    if (missing.length > 0) {
        console.warn('⚠️ الدوال المفقودة:', missing.join(', '));
        return false;
    }
    
    console.log('✅ جميع الدوال المطلوبة متوفرة');
    return true;
};

// تسجيل رسالة نجاح التحميل
console.log('✅ تم تحميل admin-new-core.js بنجاح (نسخة مصلحة)');