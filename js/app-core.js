// app-core.js - الدوال الأساسية والتهيئة (الإصدار المحسن)
// ======================== دوال UTILS المدمجة في البداية ========================

function formatNumber(num) {
    if (num === null || num === undefined) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

let lastToastTime = 0;
function showToast(message, type = 'info', duration = 3000) {
    const now = Date.now();
    if (now - lastToastTime < 300) return;
    lastToastTime = now;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fas fa-info-circle', bgColor = '#3498db';
    switch(type) {
        case 'success': icon = 'fas fa-check-circle'; bgColor = '#27ae60'; break;
        case 'error': icon = 'fas fa-times-circle'; bgColor = '#e74c3c'; break;
        case 'warning': icon = 'fas fa-exclamation-circle'; bgColor = '#f39c12'; break;
    }
    
    toast.innerHTML = `<div style="display: flex; align-items: center; gap: 10px;"><i class="${icon}"></i><span>${message}</span></div>`;
    toast.style.cssText = `position: fixed; bottom: 20px; right: 20px; background: ${bgColor}; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; font-family: 'Cairo'; animation: slideInUp 0.3s ease; max-width: 300px;`;
    
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOutDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function showLoadingSpinner(message = 'جاري التحميل...') {
    const spinner = document.createElement('div');
    spinner.id = 'customLoadingSpinner';
    spinner.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); display: flex; flex-direction: column;
        justify-content: center; align-items: center; z-index: 9999;
        color: white; font-family: 'Cairo';
    `;
    spinner.innerHTML = `
        <div class="loader-spinner" style="width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <p style="margin-top: 15px;">${message}</p>
    `;
    document.body.appendChild(spinner);
}

function hideLoadingSpinner() {
    const spinner = document.getElementById('customLoadingSpinner');
    if (spinner) spinner.remove();
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    return (cleanPhone.length >= 9 && cleanPhone.length <= 13);
}

function formatSudanPhone(phone) {
    let clean = phone.replace(/\D/g, '');
    
    if (clean.startsWith('0')) {
        clean = '249' + clean.substring(1);
    }
    else if (!clean.startsWith('249')) {
        clean = '249' + clean;
    }
    
    return '+' + clean;
}

function generateGuestUID() {
    return 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function safeElementUpdate(id, value, isHTML = false) {
    const element = document.getElementById(id);
    if (element) {
        if (isHTML) {
            element.innerHTML = window.SecurityCore?.sanitizeHTML(value) || value;
        } else {
            element.textContent = value;
        }
        return true;
    } else {
        console.warn(`⚠️ لم يتم العثور على العنصر: ${id}`);
        return false;
    }
}

/**
 * نظام حماية الجلسات والتحقق من سلامة البيانات
 */
const SecurityManager = {
    // منع التلاعب بالبيانات في localStorage
    validateSession: function() {
        const session = localStorage.getItem('currentUser');
        if (!session) return true;
        try {
            const data = JSON.parse(session);
            // إذا كان هناك تلاعب في الحقول الأساسية، قم بتسجيل الخروج
            if (data.isAdmin && !auth.currentUser) {
                console.warn('⚠️ محاولة تلاعب بالصلاحيات تم اكتشافها');
                this.forceLogout();
                return false;
            }
            return true;
        } catch (e) {
            this.forceLogout();
            return false;
        }
    },
    forceLogout: function() {
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
        if (auth) window.firebaseModules.signOut(auth);
        window.location.reload();
    },
    // حماية ضد هجمات Clickjacking
    preventFraming: function() {
        if (window.self !== window.top) {
            window.top.location = window.self.location;
        }
    }
};

function getFirebaseConfig() {
    const config = window.firebaseConfig || {
        apiKey: "AIzaSyB1vNmCapPK0MI4H_Q0ilO7OnOgZa02jx0",
        authDomain: "queen-beauty-b811b.firebaseapp.com",
        projectId: "queen-beauty-b811b",
        storageBucket: "queen-beauty-b811b.firebasestorage.app",
        messagingSenderId: "418964206430",
        appId: "1:418964206430:web:8c9451fc56ca7f956bd5cf"
    };
    return Object.freeze(config);
}

let firebaseApp = null, firebaseAuth = null, firebaseDb = null, firebaseStorage = null;

function initializeFirebaseApp(appName = 'DefaultApp') {
    if (firebaseApp && appName === 'DefaultApp') {
        return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb, storage: firebaseStorage };
    }

    try {
        if (!window.firebaseModules) throw new Error('Firebase SDK لم يتم تحميله');
        const config = getFirebaseConfig();
        const app = window.firebaseModules.initializeApp(config, appName);
        const auth = window.firebaseModules.getAuth(app);
        const db = window.firebaseModules.getFirestore(app);
        const storage = window.firebaseModules.getStorage(app);

        if (appName === 'DefaultApp') {
            firebaseApp = app; 
            firebaseAuth = auth; 
            firebaseDb = db; 
            firebaseStorage = storage;
        }

        console.log(`✅ Firebase مهيأ (${appName})`);
        return { app, auth, db, storage };
    } catch (error) {
        console.error('❌ خطأ في تهيئة Firebase:', error);
        try {
            const app = window.firebaseModules.getApp(appName);
            const auth = window.firebaseModules.getAuth(app);
            const db = window.firebaseModules.getFirestore(app);
            const storage = window.firebaseModules.getStorage(app);
            return { app, auth, db, storage };
        } catch (e) {
            throw error;
        }
    }
}

function getFirebaseInstance() {
    if (!firebaseApp) throw new Error('Firebase لم يتم تهيئته بعد');
    return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb, storage: firebaseStorage };
}

async function checkFirebaseConnection() {
    try {
        if (!db) throw new Error('قاعدة البيانات غير مهيأة');
        const settingsRef = window.firebaseModules.collection(db, "settings");
        await window.firebaseModules.getDocs(settingsRef);
        console.log('✅ اتصال Firebase ناجح');
        return true;
    } catch (error) {
        console.error('❌ فشل الاتصال:', error);
        return false;
    }
}

// ======================== نظام التخزين المؤقت المحسن ========================

let cachedData = {
    products: {
        data: null,
        timestamp: 0
    },
    settings: {
        data: null,
        timestamp: 0
    },
    theme: {
        data: null,
        timestamp: 0
    }
};

async function loadWithCache(key, loaderFn, maxAge = 300000) {
    const now = Date.now();
    
    // التحقق من التخزين المؤقت في الذاكرة
    if (cachedData[key]?.data && (now - cachedData[key].timestamp < maxAge)) {
        console.log(`📦 [Cache] تحميل ${key} من الذاكرة`);
        return cachedData[key].data;
    }
    
    // التحقق من localStorage
    const localCache = getLocalCache(key, maxAge);
    if (localCache) {
        cachedData[key] = {
            data: localCache,
            timestamp: now
        };
        console.log(`📦 [Cache] تحميل ${key} من localStorage`);
        return localCache;
    }
    
    // إذا لم توجد في الذاكرة، جلب من المصدر
    try {
        console.log(`🔄 [Cache] جلب ${key} من المصدر...`);
        const data = await loaderFn();
        
        // حفظ في الذاكرة
        cachedData[key] = {
            data: data,
            timestamp: now
        };
        
        // حفظ في localStorage
        cacheLocally(key, data, now);
        
        console.log(`✅ [Cache] تم تخزين ${key} في الذاكرة`);
        return data;
    } catch (error) {
        console.error(`❌ [Cache] خطأ في جلب ${key}:`, error);
        return null;
    }
}

function cacheLocally(key, data, timestamp = Date.now()) {
    try {
        localStorage.setItem(`cache_${key}`, JSON.stringify({
            data: data,
            timestamp: timestamp
        }));
        console.log(`💾 [Cache] حفظ ${key} في localStorage`);
    } catch (e) {
        console.warn(`⚠️ [Cache] فشل حفظ ${key} في localStorage:`, e);
    }
}

function getLocalCache(key, maxAge = 600000) {
    try {
        const cached = localStorage.getItem(`cache_${key}`);
        if (!cached) return null;
        
        const parsed = JSON.parse(cached);
        const now = Date.now();
        
        if (now - parsed.timestamp > maxAge) {
            localStorage.removeItem(`cache_${key}`);
            console.log(`🗑️ [Cache] انتهت صلاحية ${key} في localStorage`);
            return null;
        }
        
        return parsed.data;
    } catch (e) {
        console.warn(`⚠️ [Cache] خطأ في قراءة ${key} من localStorage:`, e);
        return null;
    }
}

function clearCache(key = null) {
    if (key) {
        // مسح كاش محدد
        if (cachedData[key]) {
            cachedData[key] = { data: null, timestamp: 0 };
        }
        localStorage.removeItem(`cache_${key}`);
        console.log(`🧹 [Cache] تم مسح ${key}`);
    } else {
        // مسح كل الكاش
        Object.keys(cachedData).forEach(k => {
            cachedData[k] = { data: null, timestamp: 0 };
        });
        
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith('cache_')) {
                localStorage.removeItem(k);
            }
        });
        console.log('🧹 [Cache] تم مسح كل الذاكرة المؤقتة');
    }
}

// ======================== تطبيق حماية XSS على البيانات ========================

function sanitizeProducts(products) {
    if (!products || !Array.isArray(products)) return [];
    
    return products.map(product => {
        if (window.SecurityCore?.sanitizeObject) {
            return window.SecurityCore.sanitizeObject(product);
        }
        return product;
    });
}

function sanitizeUserInput(input) {
    if (!input || typeof input !== 'string') return input;
    
    if (window.SecurityCore?.sanitizeHTML) {
        return window.SecurityCore.sanitizeHTML(input);
    }
    return input.replace(/[<>]/g, '');
}

// ======================== المتغيرات العامة ========================

let currentUser = null;
let isGuest = false;
let isAdmin = false;
let isLoading = false;
let appInitialized = false;
let cartItems = [];
let favorites = [];
let allProducts = [];
let displayedProductsCount = 8;
const productsPerPage = 8;
let siteCurrency = 'SDG ';
let siteSettings = {};
let selectedProductForQuantity = null;
let directPurchaseItem = null;
let lastScrollTop = 0;
let app, auth, db, storage;

// ======================== إدارة شاشة التحميل ========================

function hideLoader() {
    console.log('🔄 إخفاء شاشة التحميل...');
    const loader = document.getElementById('initialLoader');
    if (loader && loader.style.display !== 'none') {
        loader.style.transition = 'opacity 0.5s ease';
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
            console.log('✅ تم إخفاء شاشة التحميل');
        }, 500);
    }
    isLoading = false;
    
    if (window.initializeFirebaseMessaging) {
        window.initializeFirebaseMessaging().catch(error => {
            console.error('⚠️ خطأ في تهيئة Firebase Messaging:', error);
        });
    }
}

function forceHideLoader() {
    console.log('⏱️ إخفاء شاشة التحميل إجبارياً...');
    const loader = document.getElementById('initialLoader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 100);
    }
    isLoading = false;
}

setTimeout(forceHideLoader, 8000);

// ======================== التحقق من Firebase SDK ========================

function checkFirebaseSDK() {
    if (!window.firebaseModules) {
        console.error('❌ Firebase SDK لم يتم تحميله');
        forceHideLoader();
        
        const loader = document.getElementById('initialLoader');
        if (loader) {
            loader.innerHTML = `
                <div style="text-align: center; padding: 30px;">
                    <i class="fas fa-exclamation-triangle fa-3x" style="color: #f39c12; margin-bottom: 20px;"></i>
                    <h3 style="color: var(--primary-color); margin-bottom: 10px;">خطأ في الاتصال</h3>
                    <p style="color: var(--gray-color); margin-bottom: 20px;">تعذر تحميل المكتبات المطلوبة. يرجى:</p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="checkLibraries()" style="padding: 10px 20px; background: var(--secondary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-family: 'Cairo';">
                            <i class="fas fa-redo"></i> إعادة المحاولة
                        </button>
                        <button onclick="signInAsGuest()" style="padding: 10px 20px; background: var(--primary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-family: 'Cairo';">
                            <i class="fas fa-user"></i> الدخول كضيف
                        </button>
                    </div>
                </div>
            `;
        }
        return false;
    }
    return true;
}

// ======================== تهيئة Firebase الآمنة ========================

function initializeFirebase() {
    try {
        const instance = initializeFirebaseApp('MainApp');
        if (instance) {
            app = instance.app;
            auth = instance.auth;
            db = instance.db;
            storage = instance.storage;
            return instance;
        }
        return null;
    } catch (error) {
        console.error('❌ خطأ في تهيئة Firebase:', error);
        return null;
    }
}

// ======================== دوال الاتصال بقاعدة البيانات ========================

async function checkDatabaseConnection() {
    try {
        if (!db) {
            console.log('🔄 تهيئة قاعدة البيانات...');
            const firebase = initializeFirebase();
            if (!firebase) throw new Error('تعذر تهيئة Firebase');
            return true;
        }
        
        const testRef = window.firebaseModules.collection(db, "settings");
        const test = await window.firebaseModules.getDocs(testRef);
        console.log('✅ اتصال قاعدة البيانات نشط');
        return true;
    } catch (error) {
        console.error('❌ خطأ في اتصال قاعدة البيانات:', error);
        return false;
    }
}

// ======================== تحميل الألوان ========================

async function loadThemeColors() {
    try {
        return await loadWithCache('theme', async () => {
            if (!db) return null;
            
            const colorsRef = window.firebaseModules.doc(db, "settings", "theme_colors");
            const colorsSnap = await window.firebaseModules.getDoc(colorsRef);
            
            if (colorsSnap.exists()) {
                const colors = colorsSnap.data();
                applyThemeColors(colors);
                return colors;
            }
            return null;
        });
    } catch (error) {
        console.error('خطأ في تحميل إعدادات الألوان:', error);
        return null;
    }
}

function applyThemeColors(colors) {
    const root = document.documentElement;
    
    if (colors.primaryColor) {
        root.style.setProperty('--primary-color', colors.primaryColor);
    }
    if (colors.secondaryColor) {
        root.style.setProperty('--secondary-color', colors.secondaryColor);
    }
    if (colors.successColor) {
        root.style.setProperty('--success-color', colors.successColor);
    }
    if (colors.dangerColor) {
        root.style.setProperty('--danger-color', colors.dangerColor);
    }
    if (colors.warningColor) {
        root.style.setProperty('--warning-color', colors.warningColor);
    }
    if (colors.lightColor) {
        root.style.setProperty('--light-color', colors.lightColor);
    }
    if (colors.buttonPressColor) {
        root.style.setProperty('--button-press-color', colors.buttonPressColor);
    }
}

// ======================== تحميل إعدادات الموقع ========================

async function loadSiteConfig() {
    try {
        return await loadWithCache('siteConfig', async () => {
            if (!db) return null;
            
            const configRef = window.firebaseModules.doc(db, "settings", "site_config");
            const configSnap = await window.firebaseModules.getDoc(configRef);
            
            if (configSnap.exists()) {
                const settings = configSnap.data();
                siteSettings = settings;
                siteCurrency = settings.currency || 'SDG ';
                updateUIWithSettings();
                return settings;
            }
            return null;
        });
    } catch (error) {
        console.error('خطأ في تحميل إعدادات الموقع:', error);
        return null;
    }
}

function updateUIWithSettings() {
    if (!siteSettings) return;
    
    if (siteSettings.storeName) {
        safeElementUpdate('dynamicTitle', siteSettings.storeName + ' - متجر العطور ومستحضرات التجميل');
        safeElementUpdate('siteStoreName', siteSettings.storeName);
        safeElementUpdate('footerStoreName', siteSettings.storeName);
    }
    
    const footerElements = {
        'footerEmail': 'email',
        'footerPhone': 'phone',
        'footerAddress': 'address',
        'footerHours': 'workingHours'
    };
    
    for (const [elementId, settingKey] of Object.entries(footerElements)) {
        if (siteSettings[settingKey]) {
            safeElementUpdate(elementId, siteSettings[settingKey]);
        }
    }
    
    const aboutEl = document.getElementById('storeDescription');
    if (aboutEl && siteSettings.aboutUs) {
        aboutEl.textContent = sanitizeUserInput(siteSettings.aboutUs);
    }
    
    const socialLinks = {
        'footerFacebook': 'facebookUrl',
        'footerInstagram': 'instagramUrl',
        'footerTwitter': 'twitterUrl',
        'footerTiktok': 'tiktokUrl'
    };

    for (const [elementId, settingKey] of Object.entries(socialLinks)) {
        const element = document.getElementById(elementId);
        if (element) {
            if (siteSettings[settingKey]) {
                element.href = siteSettings[settingKey];
                element.style.display = 'flex';
            } else {
                element.style.display = 'none';
            }
        }
    }

    const whatsappEl = document.getElementById('footerWhatsapp');
    if (whatsappEl) {
        const whatsappPhone = siteSettings.phone ? siteSettings.phone.replace(/\D/g, '') : '';
        whatsappEl.href = `https://wa.me/${whatsappPhone}`;
    }

    if (siteSettings.logoUrl) {
        const logoElements = [
            document.getElementById('siteLogo'),
            document.getElementById('authLogo'),
            document.getElementById('footerLogo')
        ];
        
        logoElements.forEach(el => {
            if (el) el.src = optimizeImageUrl(siteSettings.logoUrl, 100);
        });
    }
}

// ======================== دوال الواجهة العامة ========================

function setupSmartHeader() {
    const header = document.querySelector('.header');
    if (!header) return;

    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        if (currentScroll <= 0) {
            header.style.transform = 'translateY(0)';
            return;
        }
        
        if (currentScroll > lastScroll && currentScroll > 80) {
            header.style.transform = 'translateY(-100%)';
        } else {
            header.style.transform = 'translateY(0)';
        }
        lastScroll = currentScroll;
    }, { passive: true });
    
    header.style.transition = 'transform 0.3s ease-in-out';
}

function showAuthScreen() {
    const authScreen = document.getElementById('authScreen');
    const appContainer = document.getElementById('appContainer');
    
    document.querySelectorAll('input').forEach(i => {
        if (i) i.value = '';
    });
    
    if (authScreen) {
        authScreen.style.setProperty('display', 'flex', 'important');
    }
    if (appContainer) {
        appContainer.style.setProperty('display', 'none', 'important');
    }
}

function showMainApp() {
    const authScreen = document.getElementById('authScreen');
    const appContainer = document.getElementById('appContainer');
    
    if (authScreen) {
        authScreen.style.setProperty('display', 'none', 'important');
    }
    if (appContainer) {
        appContainer.style.setProperty('display', 'flex', 'important');
    }
}

function showEmailAuthForm() {
    const emailAuthForm = document.getElementById('emailAuthForm');
    if (emailAuthForm) {
        emailAuthForm.style.display = 'block';
        showLoginForm();
    }
}

function hideEmailAuthForm() {
    const emailAuthForm = document.getElementById('emailAuthForm');
    if (emailAuthForm) {
        emailAuthForm.style.display = 'none';
        clearEmailForm();
    }
}

function clearEmailForm() {
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const authMessage = document.getElementById('emailAuthMessage');
    
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (authMessage) {
        authMessage.textContent = '';
        authMessage.className = 'auth-message';
    }
}

let navigationHistory = ['home'];

function goBack() {
    if (navigationHistory.length > 1) {
        navigationHistory.pop();
        const previousSection = navigationHistory.pop();
        showSection(previousSection);
    } else {
        showSection('home');
    }
}

function updateHeaderState(sectionId) {
    const header = document.getElementById('mainHeader');
    const backBtn = document.getElementById('backBtn');
    const menuToggle = document.getElementById('menuToggle');
    const headerSearch = document.getElementById('headerSearch');
    
    if (!header) return;

    if (sectionId === 'home') {
        if (backBtn) backBtn.style.display = 'none';
        if (headerSearch) headerSearch.style.display = 'flex';
        if (menuToggle) menuToggle.style.display = 'flex';
    } else {
        if (backBtn) {
            backBtn.style.display = 'flex';
        }
        if (headerSearch) headerSearch.style.display = 'none';
        if (menuToggle) menuToggle.style.display = 'flex';
    }
}

function adjustLayout() {
    const headerContent = document.querySelector('.header-content');
    if (headerContent) {
        headerContent.style.display = 'grid';
        headerContent.style.gridTemplateColumns = 'auto 1fr auto';
        headerContent.style.alignItems = 'center';
        headerContent.style.gap = '15px';
        headerContent.style.padding = '15px 20px';
    }
    
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer) {
        searchContainer.style.width = '300px';
        searchContainer.style.margin = '0';
    }
    
    const productsGrid = document.querySelector('.products-grid');
    if (productsGrid) {
        productsGrid.style.display = 'grid';
        productsGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        productsGrid.style.gap = '25px';
        productsGrid.style.margin = '0';
    }
}

function updateHeaderLayout() {
    const currentSection = document.querySelector('.section.active');
    if (!currentSection) return;
    
    const sectionId = currentSection.id;
    const homeHeaderIcons = document.getElementById('homeHeaderIcons');
    const backBtn = document.getElementById('backBtn');
    const homeSearchContainer = document.getElementById('homeSearchContainer');
    
    if (homeHeaderIcons) homeHeaderIcons.style.display = 'none';
    if (backBtn) backBtn.style.display = 'none';
    if (homeSearchContainer) homeSearchContainer.style.display = 'none';
    
    if (sectionId === 'home') {
        if (homeHeaderIcons) homeHeaderIcons.style.display = 'flex';
        if (homeSearchContainer) homeSearchContainer.style.display = 'flex';
    } else {
        if (backBtn) backBtn.style.display = 'flex';
    }
}

// ======================== دوال إضافية ========================

// نظام البحث الذكي والاحترافي (Smart Search System)
let searchDebounceTimer;
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    // استخدام Debouncing لتحسين الأداء ومنع العمليات المتكررة
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        executeSmartSearch(searchTerm);
    }, 300);
}

function executeSmartSearch(searchTerm) {
    if (!searchTerm) {
        // إظهار الفلاتر عند مسح البحث
        const filtersContainer = document.querySelector('.filters-container');
        if (filtersContainer) {
            filtersContainer.style.display = 'flex';
        }
        if (typeof displayProducts === 'function') displayProducts(allProducts);
        return;
    }

    console.log(`🔍 [Smart Search] البحث عن: ${searchTerm}`);
    
    // خوارزمية البحث المحسّنة - البحث في الاسم والوصف والكلمات المفتاحية فقط
    const filteredProducts = allProducts.map(product => {
        let score = 0;
        const name = (product.name || '').toLowerCase();
        const desc = (product.description || '').toLowerCase();
        const keywords = (product.keywords || '').toLowerCase(); // الكلمات المفتاحية

        // 1. مطابقة تامة في الاسم (أعلى أولوية)
        if (name === searchTerm) score += 100;
        // 2. الاسم يبدأ بكلمة البحث
        else if (name.startsWith(searchTerm)) score += 50;
        // 3. الاسم يحتوي على كلمة البحث
        else if (name.includes(searchTerm)) score += 30;
        
        // 4. مطابقة في الوصف
        if (desc.includes(searchTerm)) score += 20;
        
        // 5. مطابقة في الكلمات المفتاحية
        if (keywords.includes(searchTerm)) score += 15;

        return { ...product, searchScore: score };
    })
    .filter(p => p.searchScore > 0)
    .sort((a, b) => b.searchScore - a.searchScore); // الترتيب حسب الأكثر صلة
    
    // إخفاء الفلاتر عند البحث
    const filtersContainer = document.querySelector('.filters-container');
    if (filtersContainer) {
        filtersContainer.style.display = 'none';
    }
    
    if (typeof displayProducts === 'function') {
        displayProducts(filteredProducts);
        
        // إذا لم تكن هناك نتائج، عرض رسالة واضحة
        if (filteredProducts.length === 0) {
            const productsGrid = document.getElementById('productsGrid');
            if (productsGrid) {
                productsGrid.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px; width: 100%; grid-column: 1/-1;">
                        <i class="fas fa-search fa-4x" style="color: #ddd; margin-bottom: 25px;"></i>
                        <h2 style="color: var(--primary-color); margin-bottom: 15px; font-size: 24px;">لا توجد منتجات مطابقة لبحثك</h2>
                        <p style="color: var(--gray-color); font-size: 16px; margin-bottom: 10px;">لم نتمكن من العثور على منتجات تطابق "${searchTerm}"</p>
                        <p style="color: var(--gray-color); font-size: 14px;">جرب استخدام كلمات بحث مختلفة أو تصفح الأقسام</p>
                    </div>
                `;
            }
        }
    }
    
    // الانتقال لقسم المنتجات لرؤية النتائج
    if (typeof showSection === 'function') showSection('products');
}

function filterProducts() {
    // إظهار الفلاتر عند استخدامها
    const filtersContainer = document.querySelector('.filters-container');
    if (filtersContainer) {
        filtersContainer.style.display = 'flex';
    }
    
    // مسح حقل البحث عند استخدام الفلاتر
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    let filteredProducts = [...allProducts];
    
    const category = document.getElementById('categoryFilter')?.value;
    if (category) {
        filteredProducts = filteredProducts.filter(p => p.category === category);
    }
    
    const sortBy = document.getElementById('sortFilter')?.value;
    if (sortBy === 'price-low') {
        filteredProducts.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
        filteredProducts.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'newest') {
        filteredProducts.sort((a, b) => b.createdAt - a.createdAt);
    }
    
    const activeFilters = Array.from(document.querySelectorAll('.filter-btn.active'));
    activeFilters.forEach(btn => {
        const filterType = btn.getAttribute('data-filter');
        if (filterType === 'isNew') {
            filteredProducts = filteredProducts.filter(p => p.isNew === true || p.isNew === 'true');
        } else if (filterType === 'isSale') {
            filteredProducts = filteredProducts.filter(p => p.isSale === true || p.isSale === 'true');
        } else if (filterType === 'isBest') {
            filteredProducts = filteredProducts.filter(p => p.isBest === true || p.isBest === 'true');
        }
    });
    
    if (typeof displayProducts === 'function') displayProducts(filteredProducts);
}

function filterMainProducts(filterType, btn) {
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
        if (tab) {
            tab.style.background = 'white';
            tab.style.color = 'black';
            tab.style.borderColor = '#ddd';
        }
    });
    
    if (btn) {
        btn.style.background = 'var(--primary-color)';
        btn.style.color = 'white';
        btn.style.borderColor = 'var(--primary-color)';
    }
    
    let filtered;
    if (filterType === 'all') {
        filtered = allProducts;
    } else {
        filtered = allProducts.filter(p => p[filterType] === true || p[filterType] === 'true');
    }
    
    if (typeof displayFeaturedProducts === 'function') displayFeaturedProducts(filtered);
}

// ======================== نظام المزامنة السحابية ========================

async function syncUserDataFromFirestore() {
    if (!currentUser || isGuest) return;
    try {
        const userRef = window.firebaseModules.doc(db, "users", currentUser.uid);
        const userSnap = await window.firebaseModules.getDoc(userRef);
        if (userSnap.exists()) {
            const data = userSnap.data();
            cartItems = data.cart || [];
            favorites = data.favorites || [];
            console.log('✅ تم مزامنة البيانات من السحابة');
        }
    } catch (error) {
        console.error('❌ خطأ في مزامنة البيانات:', error);
    }
}

async function saveUserDataToFirestore() {
    if (!currentUser || isGuest) return;
    try {
        const userRef = window.firebaseModules.doc(db, "users", currentUser.uid);
        await window.firebaseModules.updateDoc(userRef, {
            cart: cartItems,
            favorites: favorites,
            lastUpdated: window.firebaseModules.serverTimestamp()
        });
        console.log('✅ تم حفظ البيانات في السحابة');
    } catch (error) {
        console.error('❌ خطأ في حفظ البيانات:', error);
    }
}

// ======================== أدوات تحسين الصور ========================

function optimizeImageUrl(url, width = 300) {
    if (!url) return 'https://via.placeholder.com/300x200?text=Eleven+Store';
    if (!url.includes('firebasestorage')) return url;
    
    // تحسين روابط Firebase Storage للتحميل الأسرع
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}alt=media&width=${width}&quality=75`;
}

// نظام مراقبة الأداء (Performance Monitoring) لضمان السرعة
function initPerformanceMonitoring() {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const timing = window.performance.timing;
            const loadTime = (timing.loadEventEnd - timing.navigationStart) / 1000;
            console.log(`⚡ [Performance] وقت تحميل الموقع الإجمالي: ${loadTime.toFixed(2)} ثانية`);
            
            if (loadTime > 3) {
                console.warn('⚠️ الموقع يستغرق وقتاً طويلاً للتحميل، جاري تحسين الذاكرة المؤقتة...');
                clearCache('products'); // مسح الكاش القديم لتحديثه ببيانات أسرع
            }
        }, 0);
    });
}
initPerformanceMonitoring();

// ======================== إدارة الذاكرة ========================

function cleanupUnusedData() {
    if (allProducts.length > 100) {
        allProducts = allProducts.slice(0, 100);
        console.log('🔄 تم تنظيف الذاكرة، الاحتفاظ بـ 100 منتج فقط');
    }
    
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cache_')) {
            try {
                const cached = JSON.parse(localStorage.getItem(key));
                if (Date.now() - cached.timestamp > 3600000) {
                    localStorage.removeItem(key);
                }
            } catch (e) {
                localStorage.removeItem(key);
            }
        }
    });
}

function initMemoryManagement() {
    setInterval(() => {
        cleanupUnusedData();
    }, 600000);
}

// ======================== التصدير للاستخدام العام ========================

window.initializeFirebaseApp = initializeFirebaseApp;
window.getFirebaseInstance = getFirebaseInstance;
window.checkFirebaseConnection = checkFirebaseConnection;
window.formatNumber = formatNumber;
window.showToast = showToast;
window.showLoadingSpinner = showLoadingSpinner;
window.hideLoadingSpinner = hideLoadingSpinner;
window.isValidEmail = isValidEmail;
window.isValidPhone = isValidPhone;
window.safeElementUpdate = safeElementUpdate;
window.generateGuestUID = generateGuestUID;
window.showAuthScreen = showAuthScreen;
window.showMainApp = showMainApp;
window.showEmailAuthForm = showEmailAuthForm;
window.hideEmailAuthForm = hideEmailAuthForm;
window.clearEmailForm = clearEmailForm;
window.goBack = goBack;
window.updateHeaderLayout = updateHeaderLayout;
window.adjustLayout = adjustLayout;
window.performSearch = performSearch;
window.filterProducts = filterProducts;
window.filterMainProducts = filterMainProducts;
window.hideLoader = hideLoader;
window.optimizeImageUrl = optimizeImageUrl;
window.loadWithCache = loadWithCache;
window.getLocalCache = getLocalCache;
window.clearCache = clearCache;
window.sanitizeUserInput = sanitizeUserInput;
window.sanitizeProducts = sanitizeProducts;

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 بدء تحميل التطبيق (المحسن)...');
    
    const loader = document.getElementById('initialLoader');
    if (loader) {
        loader.style.display = 'flex';
        loader.style.opacity = '1';
    }
    
    adjustLayout();
    updateHeaderLayout();
    initMemoryManagement();
    
    setTimeout(() => {
        if (typeof initializeAppSafely === 'function') initializeAppSafely();
    }, 100);
});

window.addEventListener('load', function() {
    console.log('📄 الصفحة تم تحميلها بالكامل');
    setTimeout(() => {
        const loader = document.getElementById('initialLoader');
        if (loader && loader.style.display !== 'none') {
            console.log('⚠️ شاشة التحميل لا تزال ظاهرة، إخفاء قسري...');
            forceHideLoader();
        }
    }, 2000);
});

window.addEventListener('error', function(e) {
    console.error('خطأ عام:', e);
    if (typeof showToast === 'function') showToast(`حدث خطأ: ${e.message}`, 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('وعد مرفوض:', e.reason);
    if (typeof showToast === 'function') showToast(`حدث خطأ غير متوقع: ${e.reason.message || e.reason}`, 'error');
});

console.log('✅ app-core.js المحسن loaded');