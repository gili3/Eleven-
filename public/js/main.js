// main.js - نظام التطبيق الرئيسي (نسخة محسنة أمنياً مع دعم كامل للفئات)
// ======================== تهيئة التطبيق ================================

async function initializeAppSafely() {
    if (window.appInitialized) {
        console.log('⚠️ التطبيق مهيأ بالفعل');
        return;
    }
    
    // الانتظار حتى يتم تحميل وحدات Firebase
    if (!window.firebaseModules) {
        console.log('⏳ بانتظار تحميل وحدات Firebase...');
        window.addEventListener('firebase-ready', () => initializeAppSafely(), { once: true });
        return;
    }

    console.log('🚀 بدء تهيئة التطبيق (الإصدار المحسن)...');
    window.appInitialized = true;

    // تهيئة نظام الأمان الشامل
    if (window.SecurityCore && typeof window.SecurityCore.init === 'function') {
        try {
            window.SecurityCore.init();
            console.log('✅ تم تفعيل نظام الأمان الشامل');
        } catch (e) {
            console.error('❌ خطأ في تفعيل SecurityCore:', e);
        }
    }
    
    // تفعيل حماية الإطارات (Clickjacking)
    if (typeof window.SecurityManager !== 'undefined') {
        window.SecurityManager.preventFraming();
    }
    
    if (!checkFirebaseSDK()) {
        return;
    }
    
    // تهيئة Firebase بشكل غير متزامن
    const firebaseReady = await initializeFirebaseApp();
    if (!firebaseReady) {
        forceHideLoader();
        if (typeof showToast === 'function') showToast('حدث خطأ في الاتصال.', 'warning');
        return;
    }
    
    try {
        // تحميل البيانات الأساسية مع التخزين المؤقت
        await Promise.all([
            loadSiteConfig(),
            loadThemeColors()
        ]);
        
        setupAllEventListeners();
        setupSmartHeader();
        
        // تهيئة تحسينات الأداء
        initPerformanceMonitoring();
        
        // تحميل الفئات مباشرة بعد تهيئة Firebase
        if (typeof window.loadCategoriesFromFirebase === 'function') {
            console.log('🏷️ تحميل الفئات...');
            window.loadCategoriesFromFirebase();
        }
        
        // التحقق من حالة المستخدم
        window.firebaseModules.onAuthStateChanged(window.firebaseAuth, async (user) => {
            try {
                console.log('🔄 تغيرت حالة المصادقة:', user ? 'مستخدم مسجل' : 'لا يوجد مستخدم');
                
                if (user) {
                    // مستخدم مسجل دخول
                    window.currentUser = user;
                    window.isGuest = false;
                    
                    // التحقق من الصلاحيات
                    await checkAdminPermissions(user.uid);
                    
                    // تحميل البيانات من Firestore
                    await syncUserDataFromFirestore();
                    
                    // تحديث الواجهة
                    if (typeof updateUserProfile === 'function') updateUserProfile();
                    if (typeof updateCartCount === 'function') updateCartCount();
                    if (typeof updateAdminButton === 'function') updateAdminButton();
                    
                    console.log('✅ تم تحميل بيانات المستخدم المسجل');
                    
                } else {
                    // لا يوجد مستخدم
                    console.log('👤 لا يوجد مستخدم');
                    window.currentUser = null;
                    window.isGuest = false;
                    window.isAdmin = false;
                    
                    if (typeof updateUserProfile === 'function') updateUserProfile();
                    if (typeof updateCartCount === 'function') updateCartCount();
                    if (typeof updateAdminButton === 'function') updateAdminButton();
                }
                
                // إخفاء شاشة التحميل
                if (typeof hideLoader === 'function') hideLoader();
                
            } catch (error) {
                console.error('❌ خطأ في معالجة حالة المصادقة:', error);
                if (typeof hideLoader === 'function') hideLoader();
            }
        });
        
        // تهيئة الصفحة الرئيسية
        setTimeout(() => {
            try {
                if (typeof initializeHomePage === 'function') {
                    initializeHomePage();
                }
            } catch (error) {
                console.error('❌ خطأ في تهيئة الصفحة الرئيسية:', error);
            }
        }, 300);
        
    } catch (error) {
        console.error('❌ خطأ في تهيئة التطبيق:', error);
        forceHideLoader();
        if (typeof showToast === 'function') showToast('حدث خطأ في تحميل التطبيق.', 'error');
    }
}

// ======================== إدارة الأحداث ========================

function setupAllEventListeners() {
    console.log('⚙️ إعداد جميع الأحداث...');
    
    setupNavigationEventListeners();
    setupAppEventListeners();
    setupModalEventListeners();
    setupFilterEventListeners();
    
    console.log('✅ جميع الأحداث جاهزة');
}

/**
 * إعداد مستمعات الأحداث للفلاتر (محسن بالكامل)
 */
function setupFilterEventListeners() {
    console.log('🔧 إعداد مستمعات أحداث الفلاتر...');
    
    // فلتر الفئة
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        const newCategoryFilter = categoryFilter.cloneNode(true);
        categoryFilter.parentNode.replaceChild(newCategoryFilter, categoryFilter);
        
        newCategoryFilter.addEventListener('change', function(e) {
            e.preventDefault();
            const categoryId = this.value;
            console.log('📁 تغيير فلتر الفئة من القائمة:', categoryId);
            
            if (typeof window.filterByCategory === 'function') {
                window.filterByCategory(categoryId);
            } else {
                console.warn('⚠️ filterByCategory غير موجودة');
                if (typeof window.resetProductsState === 'function') {
                    window.resetProductsState();
                }
                if (typeof window.loadProducts === 'function') {
                    window.currentCategoryId = categoryId;
                    window.loadProducts(false);
                }
            }
        });
    }
    
    // فلتر الترتيب
    const sortFilter = document.getElementById('sortFilter');
    if (sortFilter) {
        const newSortFilter = sortFilter.cloneNode(true);
        sortFilter.parentNode.replaceChild(newSortFilter, sortFilter);
        
        newSortFilter.addEventListener('change', function() {
            console.log('📊 تغيير فلتر الترتيب:', this.value);
            
            if (typeof window.resetProductsState === 'function') {
                window.resetProductsState();
            }
            
            if (typeof window.loadProducts === 'function') {
                window.loadProducts(false);
            }
        });
    }
    
    // أزرار الفلاتر (جديد، عروض، الأفضل)
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', function() {
            this.classList.toggle('active');
            
            console.log('🔘 تغيير فلتر:', this.getAttribute('data-filter'), 'نشط:', this.classList.contains('active'));
            
            if (typeof window.resetProductsState === 'function') {
                window.resetProductsState();
            }
            
            if (typeof window.loadProducts === 'function') {
                window.loadProducts(false);
            }
        });
    });
    
    // أزرار الفئات الجانبية
    document.querySelectorAll('.category-btn').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const categoryId = this.getAttribute('data-category-id') || '';
            
            console.log('📁 اختيار فئة من الأزرار الجانبية:', categoryId);
            
            if (typeof window.filterByCategory === 'function') {
                window.filterByCategory(categoryId);
            }
        });
    });
    
    console.log('✅ تم إعداد جميع مستمعات أحداث الفلاتر');
}

function setupNavigationEventListeners() {
    const menuToggle = document.getElementById('menuToggle');
    const closeMenu = document.getElementById('closeMenu');
    const mobileNav = document.getElementById('mobileNav');
    const navOverlay = document.getElementById('navOverlay');
    
    const openMenu = () => {
        if (mobileNav) mobileNav.classList.add('active');
        if (navOverlay) navOverlay.classList.add('active');
        document.body.classList.add('menu-open');
    };
    
    const closeMenuFunc = () => {
        if (mobileNav) mobileNav.classList.remove('active');
        if (navOverlay) navOverlay.classList.remove('active');
        document.body.classList.remove('menu-open');
    };
    
    if (menuToggle) {
        menuToggle.addEventListener('click', openMenu);
    }
    
    if (closeMenu) {
        closeMenu.addEventListener('click', closeMenuFunc);
    }
    
    if (navOverlay) {
        navOverlay.addEventListener('click', closeMenuFunc);
    }
    
    document.querySelectorAll('[data-section]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            if(document.querySelector(".section.active")?.id !== sectionId) showSection(sectionId);
            closeMenuFunc();
        });
    });
    
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            signOutUser();
            closeMenuFunc();
        });
    }
}

function setupAppEventListeners() {
    const buttons = {
        'continueShoppingBtn': () => showSection('products'),
        'browseProductsBtn': () => showSection('products'),
        'homeBtn': () => showSection('home'),
        'cartBtn': () => showSection('cart'),
        'favoritesBtn': () => showSection('favorites'),
        'profileBtn': () => showSection('profile'),
        'logoutBtn': signOutUser,
        'editProfileBtn': (typeof editProfile === 'function') ? editProfile : null,
        'saveProfileBtn': (typeof saveProfileChanges === 'function') ? saveProfileChanges : null,
        'clearCartBtn': (typeof clearCart === 'function') ? clearCart : null
    };
    
    for (const [btnId, action] of Object.entries(buttons)) {
        const btn = document.getElementById(btnId);
        if (btn && action && typeof action === 'function') {
            btn.addEventListener('click', action);
        }
    }
    
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('input', debounce(performSearch, 500));
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
}

/**
 * دالة debounce لمنع التنفيذ المتكرر
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function setupModalEventListeners() {
    document.querySelectorAll('.close-modal, .btn-secondary.close-modal').forEach(btn => {
        if (btn) {
            btn.addEventListener('click', function() {
                const modal = this.closest('.modal');
                if (modal) {
                    modal.classList.remove('active');
                }
            });
        }
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('active');
                }
            });
        }
    });
    
    const confirmAddBtn = document.getElementById('confirmAddToCartBtn');
    if (confirmAddBtn) {
        confirmAddBtn.addEventListener('click', confirmAddToCart);
    }
    
    const confirmBuyBtn = document.getElementById('confirmBuyNowBtn');
    if (confirmBuyBtn) {
        confirmBuyBtn.addEventListener('click', confirmBuyNow);
    }
}

// ======================== دالة showSection الرئيسية ========================

function showSection(sectionId) {
    const currentSection = document.querySelector('.section.active');
    
    window.scrollTo(0, 0);
    const appContainer = document.getElementById('appContainer');
    if (appContainer) appContainer.scrollTop = 0;

    document.querySelectorAll('.nav-item, .mobile-nav-links a').forEach(item => {
        if (item.getAttribute('data-section') === sectionId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    if (sectionId === 'cart') {
        if (typeof window.updateCartDisplay === 'function') window.updateCartDisplay();
    } else if (sectionId === 'favorites') {
        if (typeof window.updateFavoritesDisplay === 'function') window.updateFavoritesDisplay();
    } else if (sectionId === 'home') {
        if (typeof window.initializeHomePage === 'function') {
            setTimeout(() => window.initializeHomePage(), 100);
        }
    } else if (sectionId === 'products') {
        const productsGrid = document.getElementById('productsGrid');
        if (productsGrid && productsGrid.children.length === 0) {
            if (typeof window.loadProducts === 'function') {
                window.loadProducts(false);
            }
        } else {
            if (typeof window.resetObservers === 'function') {
                window.resetObservers();
            }
        }
    } else if (sectionId === 'my-orders') {
        if (typeof window.loadMyOrders === 'function') {
            window.loadMyOrders(false);
        }
    }

    if (!window.navigationHistory.includes(sectionId)) {
        window.navigationHistory.push(sectionId);
    }

    updateHeaderState(sectionId);

    document.querySelectorAll('.section').forEach(sec => {
        if (sec) sec.classList.remove('active');
    });

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        window.scrollTo({ top: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }
    
    setTimeout(() => {
        if (typeof window.resetObservers === 'function') {
            window.resetObservers();
        }
    }, 300);
}

// ======================== دوال البحث ========================

let searchDebounceTimer;

function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.trim().toLowerCase();
    console.log(`🔍 البحث عن: ${searchTerm}`);
    
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        executeSmartSearch(searchTerm);
    }, 300);
}

function executeSmartSearch(searchTerm) {
    console.log(`🔍 [Firebase Search] تنفيذ البحث: ${searchTerm}`);
    
    if (typeof showSection === 'function') {
        const currentSection = document.querySelector('.section.active');
        if (!currentSection || currentSection.id !== 'products') {
            showSection('products');
        }
    }

    if (typeof window.resetProductsState === 'function') {
        window.resetProductsState();
    }
    
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) categoryFilter.value = '';
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (typeof window.filterByCategory === 'function') {
        window.filterByCategory('');
    } else {
        if (typeof loadProducts === 'function') {
            loadProducts(false);
        }
    }
}

// ======================== دوال إضافية ========================

function updateHeaderState(sectionId) {
    const header = document.getElementById('mainHeader');
    const backBtn = document.getElementById('backBtn');
    const menuToggle = document.getElementById('menuToggle');
    const homeSearchContainer = document.getElementById('homeSearchContainer');
    const homeHeaderIcons = document.getElementById('homeHeaderIcons');
    
    if (!header) return;

    if (sectionId === 'home') {
        if (backBtn) backBtn.style.display = 'none';
        if (homeSearchContainer) homeSearchContainer.style.display = 'flex';
        if (menuToggle) menuToggle.style.display = 'flex';
        if (homeHeaderIcons) homeHeaderIcons.style.display = 'flex';
    } else {
        if (backBtn) backBtn.style.display = 'flex';
        if (homeSearchContainer) homeSearchContainer.style.display = 'none';
        if (menuToggle) menuToggle.style.display = 'flex';
        if (homeHeaderIcons) homeHeaderIcons.style.display = 'none';
    }
}

function goBack() {
    if (window.navigationHistory && window.navigationHistory.length > 1) {
        window.navigationHistory.pop();
        const previousSection = window.navigationHistory.pop();
        showSection(previousSection);
    } else {
        showSection('home');
    }
}

// ======================== دوال المصادقة ========================

async function signOutUser() {
    console.log('🚪 تسجيل الخروج...');
    
    try {
        sessionStorage.removeItem('guest_user');
        
        if (window.firebaseAuth && window.firebaseModules && window.firebaseModules.signOut) {
            try {
                await window.firebaseModules.signOut(window.firebaseAuth);
            } catch (e) {
                console.error('Firebase signOut error:', e);
            }
        }
        
        window.currentUser = null;
        window.isGuest = false;
        window.isAdmin = false;
        window.cartItems = [];
        window.favorites = [];
        
        if (typeof updateAdminButton === 'function') updateAdminButton();
        if (typeof updateCartCount === 'function') updateCartCount();
        
        window.location.href = 'login.html';
        
    } catch (error) {
        console.error('❌ خطأ في تسجيل الخروج:', error);
        window.location.href = 'login.html';
    }
}

async function checkAdminPermissions(userId) {
    console.log('🔍 التحقق من صلاحيات المدير للمستخدم:', userId);
    
    try {
        const db = getFirebaseReference();
        if (!db) {
            window.isAdmin = false;
            console.log('❌ قاعدة البيانات غير متاحة');
            return false;
        }
        
        const userRef = window.firebaseModules.doc(db, "users", userId);
        const userSnap = await window.firebaseModules.getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            
            if (userData.isAdmin === true || userData.role === 'admin') {
                window.isAdmin = true;
                console.log('✅ المستخدم أدمن');
            } else {
                window.isAdmin = false;
                console.log('❌ المستخدم ليس أدمن');
            }
        } else {
            console.log('⚠️ المستخدم غير موجود في قاعدة البيانات');
            window.isAdmin = false;
        }
        
        if (typeof updateAdminButton === 'function') updateAdminButton();
        
        return window.isAdmin;
        
    } catch (error) {
        console.error('❌ خطأ في التحقق من صلاحيات المستخدم:', error);
        window.isAdmin = false;
        if (typeof updateAdminButton === 'function') updateAdminButton();
        return false;
    }
}

function updateAdminButton() {
    const adminBtn = document.getElementById('adminBtn');
    const adminMobileLink = document.getElementById('adminMobileLink');
    
    if (adminBtn) {
        if (window.isAdmin && !window.isGuest) {
            adminBtn.style.display = 'flex';
        } else {
            adminBtn.style.display = 'none';
        }
    }
    
    if (adminMobileLink) {
        if (window.isAdmin && !window.isGuest) {
            adminMobileLink.style.display = 'block';
        } else {
            adminMobileLink.style.display = 'none';
        }
    }
}

// ======================== تحسينات الأداء ========================

function initPerformanceMonitoring() {
    window.addEventListener('load', () => {
        if ('performance' in window) {
            const timing = performance.timing;
            const loadTime = timing.loadEventEnd - timing.navigationStart;
            console.log(`⏱️ تم تحميل الصفحة في ${loadTime}ms`);
        }
    });
}

function enableDataSaverMode() {
    console.log('📱 تفعيل وضع توفير البيانات');
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        if (img.src && img.src.includes('firebasestorage')) {
            if (typeof optimizeImageUrl === 'function') {
                img.src = optimizeImageUrl(img.src, 150);
            }
        }
    });
}

// ======================== دوال مساعدة للفئات ========================

function updateCategoriesOnLoad() {
    console.log('🏷️ تحديث الفئات بعد تحميل الصفحة...');
    
    if (typeof window.loadCategoriesFromFirebase === 'function') {
        window.loadCategoriesFromFirebase();
    }
    
    setTimeout(() => {
        if (typeof window.updateAllCategoryButtons === 'function') {
            window.updateAllCategoryButtons();
        }
    }, 1000);
}

// ======================== التصدير للاستخدام العام ========================

window.initializeAppSafely = initializeAppSafely;
window.showSection = showSection;
window.performSearch = performSearch;
window.goBack = goBack;
window.updateHeaderState = updateHeaderState;
window.debounce = debounce;
window.signOutUser = signOutUser;
window.checkAdminPermissions = checkAdminPermissions;
window.updateAdminButton = updateAdminButton;
window.updateCategoriesOnLoad = updateCategoriesOnLoad;

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 بدء تحميل التطبيق (main.js)...');
    
    setTimeout(() => {
        if (typeof initializeAppSafely === 'function') {
            initializeAppSafely();
        }
    }, 100);
});

// تحديث الفئات بعد تحميل الصفحة بالكامل
window.addEventListener('load', function() {
    console.log('📄 الصفحة تم تحميلها بالكامل - تحديث الفئات');
    setTimeout(updateCategoriesOnLoad, 500);
});

// تسجيل Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw-advanced.js')
            .then(reg => console.log('✅ Service Worker مسجل'))
            .catch(err => console.error('❌ فشل تسجيل Service Worker:', err));
    });
}

console.log('🚀 main.js المحسن والمصحح جاهز للعمل!');