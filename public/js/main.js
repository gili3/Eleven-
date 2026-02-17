// main.js - نظام التطبيق الرئيسي (نسخة محسنة أمنياً)
// ======================== تهيئة التطبيق ================================

async function initializeAppSafely() {
    if (window.appInitialized) {
        console.log('⚠️ التطبيق مهيأ بالفعل');
        return;
    }
    
    // الانتظار حتى يتم تحميل وحدات Firebase
    if (!window.firebaseModules) {
        console.log('⏳ بانتظار تحميل وحدات Firebase...');
        // window.addEventListener('firebase-ready', () => initializeAppSafely(), { once: true });
        // استخدام setTimeout لتجنب التكرار اللانهائي وتجاوز مكدس الاستدعاءات
        setTimeout(() => initializeAppSafely(), 1000);
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
    
    if (!initializeFirebase()) {
        forceHideLoader();
        showAuthScreen();
        if (typeof showToast === 'function') showToast('حدث خطأ في الاتصال. يمكنك الدخول كضيف.', 'warning');
        return;
    }
    
    try {
        // تحميل البيانات الأساسية مع التخزين المؤقت
        await Promise.all([
            loadSiteConfig(),
            loadThemeColors()
        ]);
        
        setupAllEventListeners();
        setupRegistrationEventListeners();
        setupSmartHeader();
        
        // تهيئة تحسينات الأداء
        initPerformanceMonitoring();
        setupLightweightNotifications();
        
        // مراقبة حالة المصادقة
        const unsubscribe = window.firebaseModules.onAuthStateChanged(auth, 
            async (user) => {
                console.log('🔄 تغيرت حالة المصادقة:', user ? 'مستخدم مسجل' : 'لا يوجد مستخدم');
                await handleAuthStateChange(user);
            },
            (error) => {
                console.error('❌ خطأ في مراقبة حالة المصادقة:', error);
                handleAuthError();
            }
        );
        
        window.authUnsubscribe = unsubscribe;
        
        // تهيئة الصفحة الرئيسية بعد تحميل كل شيء
        setTimeout(() => {
            if (typeof initializeHomePage === 'function') {
                initializeHomePage();
            }
        }, 300);
        
    } catch (error) {
        console.error('❌ خطأ في تهيئة التطبيق:', error);
        forceHideLoader();
        showAuthScreen();
        if (typeof showToast === 'function') showToast('حدث خطأ في تحميل التطبيق.', 'error');
    }
}

// ======================== إدارة الأحداث ========================

function setupAllEventListeners() {
    console.log('⚙️ إعداد جميع الأحداث...');
    
    setupAuthEventListeners();
    setupNavigationEventListeners();
    setupAppEventListeners();
    setupModalEventListeners();
    setupRegistrationEventListeners();
    setupFilterEventListeners(); // إضافة مستمعات الفلاتر
    
    console.log('✅ جميع الأحداث جاهزة');
}

/**
 * إضافة مستمعات الأحداث للفلاتر
 */
function setupFilterEventListeners() {
    // فلتر الفئة
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            console.log('📁 تغيير فلتر الفئة:', this.value);
            
            // إعادة تعيين مؤشرات التحميل
            if (typeof window.resetProductsState === 'function') {
                window.resetProductsState();
            }
            
            // تحميل المنتجات من جديد
            if (typeof loadProducts === 'function') {
                loadProducts(false);
            }
            
            // تحديث أزرار الأقسام
            if (typeof updateCategoryButtons === 'function') {
                updateCategoryButtons(this.value);
            }
        });
    }
    
    // فلتر الترتيب
    const sortFilter = document.getElementById('sortFilter');
    if (sortFilter) {
        sortFilter.addEventListener('change', function() {
            console.log('📊 تغيير فلتر الترتيب:', this.value);
            
            if (typeof window.resetProductsState === 'function') {
                window.resetProductsState();
            }
            
            if (typeof loadProducts === 'function') {
                loadProducts(false);
            }
        });
    }
    
    // أزرار الفلاتر (جديد، عروض، الأفضل)
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.toggle('active');
            
            console.log('🔘 تغيير فلتر:', this.getAttribute('data-filter'), 'نشط:', this.classList.contains('active'));
            
            if (typeof window.resetProductsState === 'function') {
                window.resetProductsState();
            }
            
            if (typeof loadProducts === 'function') {
                loadProducts(false);
            }
        });
    });
    
    // أزرار الأقسام (Categories)
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const category = this.getAttribute('data-category') || '';
            
            console.log('📁 اختيار قسم:', category);
            
            // تحديث فلتر الفئة
            const categoryFilter = document.getElementById('categoryFilter');
            if (categoryFilter) {
                categoryFilter.value = category;
            }
            
            // تحديث حالة الأزرار
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // إعادة تعيين التحميل
            if (typeof window.resetProductsState === 'function') {
                window.resetProductsState();
            }
            
            // تحميل المنتجات
            if (typeof loadProducts === 'function') {
                loadProducts(false);
            }
            
            // الانتقال إلى قسم المنتجات
            if (typeof showSection === 'function') {
                showSection('products');
            }
        });
    });
}

function setupAuthEventListeners() {
    const googleBtn = document.getElementById('googleSignInBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', signInWithGoogle);
    }
    
    const emailBtn = document.getElementById('emailSignInBtn');
    if (emailBtn) {
        emailBtn.addEventListener('click', showEmailAuthForm);
    }
    
    const guestBtn = document.getElementById('guestSignInBtn');
    if (guestBtn) {
        guestBtn.addEventListener('click', signInAsGuest);
    }
    
    const backBtn = document.getElementById('backToAuthOptions');
    if (backBtn) {
        backBtn.addEventListener('click', hideEmailAuthForm);
    }
    
    const passwordInput = document.getElementById('passwordInput');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const email = document.getElementById('emailInput')?.value || '';
                const password = passwordInput.value;
                if (email && password) {
                    handleLogin();
                }
            }
        });
    }
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
        'logoutBtn': typeof signOutUser === 'function' ? signOutUser : () => console.warn('signOutUser not defined'),
        'editProfileBtn': typeof editProfile === 'function' ? editProfile : () => {
            if (window.editProfile) window.editProfile();
            else console.error('editProfile is not defined');
        },
        'saveProfileBtn': typeof saveProfileChanges === 'function' ? saveProfileChanges : () => {
            if (window.saveProfileChanges) window.saveProfileChanges();
            else console.error('saveProfileChanges is not defined');
        },
        'clearCartBtn': clearCart
    };
    
    for (const [btnId, action] of Object.entries(buttons)) {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', action);
        }
    }
    
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', performSearch);
        // دعم البحث المباشر أثناء الكتابة (مع debounce)
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
                    if (modal.id === 'checkoutModal') {
                        if (typeof removeReceiptPreview === 'function') removeReceiptPreview();
                    }
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
    
    // أزرار نافذة الكمية
    const confirmAddBtn = document.getElementById('confirmAddToCartBtn');
    if (confirmAddBtn) {
        confirmAddBtn.addEventListener('click', confirmAddToCart);
    }
    
    const confirmBuyBtn = document.getElementById('confirmBuyNowBtn');
    if (confirmBuyBtn) {
        confirmBuyBtn.addEventListener('click', confirmBuyNow);
    }
}

function setupRegistrationEventListeners() {
    const signUpBtn = document.getElementById('signUpBtn');
    if (signUpBtn) {
        signUpBtn.addEventListener('click', showRegistrationForm);
    }
    
    const completeSignUpBtn = document.getElementById('completeSignUpBtn');
    if (completeSignUpBtn) {
        completeSignUpBtn.addEventListener('click', handleRegistration);
    }
    
    const switchToLoginBtn = document.getElementById('switchToLoginBtn');
    if (switchToLoginBtn) {
        switchToLoginBtn.addEventListener('click', showLoginForm);
    }
    
    const signInBtn = document.getElementById('signInBtn');
    if (signInBtn) {
        signInBtn.addEventListener('click', handleLogin);
    }
}

// ======================== دالة showSection الرئيسية (محدثة) ========================

function showSection(sectionId) {
    const currentSection = document.querySelector('.section.active');
    
    // 1. إعادة تعيين التمرير فوراً عند الانتقال لصفحة جديدة
    window.scrollTo(0, 0);
    const appContainer = document.getElementById('appContainer');
    if (appContainer) appContainer.scrollTop = 0;

    // تحديث الحالة النشطة في شريط التنقل السفلي والقائمة الجانبية
    document.querySelectorAll('.nav-item, .mobile-nav-links a').forEach(item => {
        if (item.getAttribute('data-section') === sectionId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // تحديث العرض عند التبديل للأقسام المعنية
    if (sectionId === 'cart') {
        if (typeof window.updateCartDisplay === 'function') window.updateCartDisplay();
    } else if (sectionId === 'favorites') {
        if (typeof window.updateFavoritesDisplay === 'function') window.updateFavoritesDisplay();
    } else if (sectionId === 'home') {
        if (typeof window.initializeHomePage === 'function') {
            setTimeout(() => window.initializeHomePage(), 100);
        }
    } else if (sectionId === 'products') {
        // تحميل المنتجات إذا كانت الشبكة فارغة
        const productsGrid = document.getElementById('productsGrid');
        if (productsGrid && productsGrid.children.length === 0) {
            if (typeof window.loadProducts === 'function') {
                window.loadProducts(false);
            }
        } else {
            // إعادة تعيين المراقبين للتحميل اللانهائي
            if (typeof window.resetObservers === 'function') {
                window.resetObservers();
            }
        }
    } else if (sectionId === 'my-orders') {
        // تحميل الطلبات عند الانتقال لصفحة الطلبات
        if (typeof window.loadMyOrders === 'function') {
            window.loadMyOrders(false);
        }
    }

    if (!window.navigationHistory.includes(sectionId)) {
        window.navigationHistory.push(sectionId);
    }

    updateHeaderState(sectionId);

    if (currentSection && currentSection.id === 'checkout' && sectionId !== 'checkout') {
        if (typeof removeReceiptPreview === 'function') removeReceiptPreview();
    }

    // إخفاء جميع الأقسام أولاً
    document.querySelectorAll('.section').forEach(sec => {
        if (sec) sec.classList.remove('active');
    });

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // التمرير للأعلى عند فتح أي صفحة أو قسم
        window.scrollTo({ top: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        
        if (sectionId === 'checkout') {
            const savedPhone = localStorage.getItem('userPhone');
            const savedAddress = localStorage.getItem('userAddress');
            
            const phoneInput = document.getElementById('checkoutPhone') || document.getElementById('orderPhone');
            const addressInput = document.getElementById('checkoutAddress') || document.getElementById('orderAddress');
            const editBtn = document.getElementById('editDataBtn');
            
            if (phoneInput && savedPhone) {
                phoneInput.value = savedPhone;
                if (editBtn) editBtn.style.display = 'block';
            }
            
            if (addressInput && savedAddress) {
                addressInput.value = savedAddress;
            }
        }
    }
    
    // إعادة تعيين المراقبين بعد تغيير القسم (لضمان عمل التحميل اللانهائي)
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
    
    // استخدام Debouncing
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        executeSmartSearch(searchTerm);
    }, 300);
}

function executeSmartSearch(searchTerm) {
    console.log(`🔍 [Firebase Search] تنفيذ البحث: ${searchTerm}`);
    
    // الانتقال لقسم المنتجات
    if (typeof showSection === 'function') {
        const currentSection = document.querySelector('.section.active');
        if (!currentSection || currentSection.id !== 'products') {
            showSection('products');
        }
    }

    // إعادة تعيين مؤشرات التحميل
    if (typeof window.resetProductsState === 'function') {
        window.resetProductsState();
    }
    
    // تصفير فلاتر الفئات
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) categoryFilter.value = '';
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // تحديث أزرار الأقسام
    if (typeof updateCategoryButtons === 'function') {
        updateCategoryButtons('');
    }

    // تحميل المنتجات من Firebase
    if (typeof loadProducts === 'function') {
        loadProducts(false);
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
        if (backBtn) {
            backBtn.style.display = 'flex';
        }
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

// ======================== تحسينات الأداء ========================

function initPerformanceMonitoring() {
    window.addEventListener('load', () => {
        if ('performance' in window) {
            const timing = performance.timing;
            const loadTime = timing.loadEventEnd - timing.navigationStart;
            
            console.log(`⏱️ تم تحميل الصفحة في ${loadTime}ms`);
            
            if (loadTime > 3000) {
                console.warn('⚠️ وقت تحميل الصفحة مرتفع، يفضل تحسين الأداء');
            }
        }
    });
    
    if ('memory' in performance) {
        setInterval(() => {
            const memory = performance.memory;
            if (memory.usedJSHeapSize > 50000000) { // 50MB
                console.warn('⚠️ استخدام عالي للذاكرة:', memory.usedJSHeapSize);
                if (typeof cleanupUnusedData === 'function') cleanupUnusedData();
            }
        }, 30000);
    }
    
    if ('connection' in navigator) {
        const connection = navigator.connection;
        console.log('📶 نوع الشبكة:', connection.effectiveType);
        
        if (connection.effectiveType === '2g' || connection.saveData) {
            enableDataSaverMode();
        }
    }
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

function setupLightweightNotifications() {
    // تنفيذ بسيط للإشعارات
    console.log('🔔 تم إعداد نظام الإشعارات');
}

// ======================== التصدير للاستخدام العام ========================

window.initializeAppSafely = initializeAppSafely;
window.showSection = showSection;
window.performSearch = performSearch;
window.goBack = goBack;
window.updateHeaderState = updateHeaderState;
window.debounce = debounce;

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 بدء تحميل التطبيق (main.js)...');
    
    setTimeout(() => {
        if (typeof initializeAppSafely === 'function') {
            initializeAppSafely();
        }
    }, 100);
});

// تسجيل Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw-advanced.js')
            .then(reg => console.log('✅ Service Worker مسجل'))
            .catch(err => console.error('❌ فشل تسجيل Service Worker:', err));
    });
}

console.log('🚀 main.js المحسن جاهز للعمل!');