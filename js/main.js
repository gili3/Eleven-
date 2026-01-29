// main.js - نظام التطبيق الرئيسي (نسخة محسنة أمنياً)
// ======================== تهيئة التطبيق ================================

async function initializeAppSafely() {
    if (appInitialized) {
        console.log('⚠️ التطبيق مهيأ بالفعل');
        return;
    }
    
    console.log('🚀 بدء تهيئة التطبيق (الإصدار المحسن)...');
    appInitialized = true;

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
    if (typeof SecurityManager !== 'undefined') {
        SecurityManager.preventFraming();
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
    
    console.log('✅ جميع الأحداث جاهزة');
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
                    signInWithEmail(email, password);
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
    
    document.querySelectorAll('a[data-section]').forEach(link => {
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
        'editProfileBtn': editProfile,
        'saveProfileBtn': saveProfileChanges,
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
        // دعم البحث المباشر أثناء الكتابة (Live Search)
        searchInput.addEventListener('input', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
    
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterProducts);
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', filterProducts);
    }
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn) {
            btn.addEventListener('click', function() {
                this.classList.toggle('active');
                filterProducts();
            });
        }
    });
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

// ======================== دالة showSection الرئيسية ========================

function showSection(sectionId) {
    const currentSection = document.querySelector('.section.active');
    
    if (!navigationHistory.includes(sectionId)) {
        navigationHistory.push(sectionId);
    }

    updateHeaderState(sectionId);

    if (currentSection && currentSection.id === 'checkout' && sectionId !== 'checkout') {
        if (typeof removeReceiptPreview === 'function') removeReceiptPreview();
    }

    document.querySelectorAll('.section').forEach(section => {
        if (section) section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        // نظام التحميل الذكي (Lazy Loading) - تحميل البيانات فقط عند الحاجة
        const lazyLoadData = async () => {
            switch(sectionId) {
                case 'cart':
                    if (typeof updateCartDisplay === 'function') updateCartDisplay();
                    break;
                case 'favorites':
                    if (typeof updateFavoritesDisplay === 'function') updateFavoritesDisplay();
                    break;
                case 'profile':
                    if (typeof updateProfileStats === 'function') updateProfileStats();
                    break;
                case 'my-orders':
                    if (typeof loadMyOrders === 'function') loadMyOrders();
                    break;
                case 'products':
                    // تحميل المنتجات من Firebase فقط إذا لم تكن محملة أو عند الحاجة لتحديثها
                    if (typeof allProducts === 'undefined' || allProducts.length === 0) {
                        if (typeof loadProducts === 'function') await loadProducts();
                    } else {
                        if (typeof displayProducts === 'function') displayProducts();
                    }
                    break;
                case 'home':
                    // تحميل المنتجات المميزة فقط عند فتح الصفحة الرئيسية
                    if (typeof displayFeaturedProducts === 'function') displayFeaturedProducts();
                    break;
            }
        };
        lazyLoadData();
        
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

        // تم نقل المنطق إلى بداية الدالة لضمان التحميل عند الطلب فقط
        if (sectionId === 'home') {
            if (typeof displayFeaturedProducts === 'function') displayFeaturedProducts();
        }
    }
}

// ======================== تحسينات نظام الإشعارات ========================

function setupLightweightNotifications() {
    if (window.notificationListeners) return;
    
    window.notificationListeners = {
        orders: null,
        admin: null
    };
    
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            pauseNotificationListeners();
        } else {
            resumeNotificationListeners();
        }
    });
}

function pauseNotificationListeners() {
    if (window.notificationListeners.orders) {
        window.notificationListeners.orders();
        window.notificationListeners.orders = null;
    }
}

function resumeNotificationListeners() {
    if (!window.notificationListeners.orders && currentUser && !isGuest) {
        setupOrderStatusListener();
    }
}

// ======================== مراقبة الأداء ========================

function initPerformanceMonitoring() {
    window.addEventListener('load', () => {
        if ('performance' in window) {
            const timing = performance.timing;
            const loadTime = timing.loadEventEnd - timing.navigationStart;
            
            console.log(`⏱️ Page loaded in ${loadTime}ms`);
            
            if (loadTime > 3000) {
                console.warn('⚠️ Page load time is high, consider optimization');
            }
        }
    });
    
    if ('memory' in performance) {
        setInterval(() => {
            const memory = performance.memory;
            if (memory.usedJSHeapSize > 50000000) {
                console.warn('⚠️ High memory usage:', memory.usedJSHeapSize);
                if (typeof cleanupUnusedData === 'function') cleanupUnusedData();
            }
        }, 30000);
    }
    
    if ('connection' in navigator) {
        const connection = navigator.connection;
        console.log('📶 Network type:', connection.effectiveType);
        
        if (connection.effectiveType === '2g' || connection.saveData) {
            enableDataSaverMode();
        }
    }
}

function enableDataSaverMode() {
    console.log('📱 Enabling data saver mode');
    
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        if (img.src.includes('firebasestorage')) {
            img.src = optimizeImageUrl(img.src, 150);
        }
    });
    
    if (typeof setupInfiniteScroll === 'function') {
        setupInfiniteScroll();
    }
}

// ======================== التصدير للاستخدام في HTML ========================

window.showSection = showSection;
window.addToCart = addToCartWithQuantity;
window.toggleFavorite = toggleFavorite;
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
window.signInAsGuest = signInAsGuest;
window.signInWithGoogle = signInWithGoogle;
window.signOutUser = signOutUser;
window.clearCart = clearCart;
window.editProfile = editProfile;
window.saveProfileChanges = saveProfileChanges;
window.performSearch = performSearch;
window.filterProducts = filterProducts;
window.previewReceipt = previewReceipt;
window.removeReceiptPreview = removeReceiptPreview;
window.viewReceipt = viewReceipt;
window.buyNowDirect = buyNowDirect;
window.signUpWithEmail = signUpWithEmail;
window.handleRegistration = handleRegistration;
window.handleLogin = handleLogin;
window.showRegistrationForm = showRegistrationForm;
window.showLoginForm = showLoginForm;
window.filterMainProducts = filterMainProducts;
window.hideLoader = hideLoader;
window.formatNumber = formatNumber;
window.generateGuestUID = generateGuestUID;
window.openProductDetails = openProductDetails;
window.closeProductDetailsModal = closeProductDetailsModal;
window.openQuantityModal = openQuantityModal;
window.closeQuantityModal = closeQuantityModal;
window.changeModalQuantity = changeModalQuantity;
window.enableDataEdit = enableDataEdit;
window.updateHeaderLayout = updateHeaderLayout;
window.goBack = goBack;
window.previewCheckoutReceipt = previewCheckoutReceipt;
window.removeCheckoutReceipt = removeCheckoutReceipt;
window.submitCheckoutOrder = submitCheckoutOrder;
window.updateCheckoutItemQty = updateCheckoutItemQty;
window.setupLightweightNotifications = setupLightweightNotifications;
window.initPerformanceMonitoring = initPerformanceMonitoring;

window.addEventListener('resize', adjustLayout);

// تسجيل Service Worker المتقدم
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw-advanced.js')
            .then(reg => console.log('✅ Advanced Service Worker Registered'))
            .catch(err => console.error('❌ Service Worker Registration Failed:', err));
    });
}

console.log('🚀 تطبيق Eleven Store المحسن جاهز للعمل!');