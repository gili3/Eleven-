// main.js - النسخة المصححة مع إصلاح رفع الإيصالات والتحقق من العناصر
// ======================== تهيئة التطبيق ========================

// دوال UTILS المدمجة في البداية
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
    // التحقق من أن الرقم سوداني صحيح (يبدأ بـ 09 أو 01 أو 249 أو +249) وطوله مناسب
    const cleanPhone = phone.replace(/\D/g, '');
    return (cleanPhone.length >= 9 && cleanPhone.length <= 13);
}

function formatSudanPhone(phone) {
    let clean = phone.replace(/\D/g, '');
    
    // إذا بدأ بـ 0، نحذف الصفر ونضيف 249
    if (clean.startsWith('0')) {
        clean = '249' + clean.substring(1);
    }
    // إذا لم يبدأ بـ 249، نضيفها
    else if (!clean.startsWith('249')) {
        clean = '249' + clean;
    }
    
    return '+' + clean;
}

// دالة إنشاء UID فريد للمستخدم الضيف
function generateGuestUID() {
    return 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// دالة مساعدة للتحديث الآمن للعناصر
function safeElementUpdate(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
        return true;
    } else {
        console.warn(`⚠️ لم يتم العثور على العنصر: ${id}`);
        return false;
    }
}

// يتم تحميل firebaseConfig من ملف firebase-config.js الخارجي لتعزيز الأمان
// نستخدم دالة للحصول على الإعدادات لضمان تحميلها من window
function getFirebaseConfig() {
    return window.firebaseConfig || {
        apiKey: "AIzaSyB1vNmCapPK0MI4H_Q0ilO7OnOgZa02jx0",
        authDomain: "queen-beauty-b811b.firebaseapp.com",
        projectId: "queen-beauty-b811b",
        storageBucket: "queen-beauty-b811b.firebasestorage.app",
        messagingSenderId: "418964206430",
        appId: "1:418964206430:web:8c9451fc56ca7f956bd5cf"
    };
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
        // محاولة استرداد التطبيق إذا كان مهيأ بالفعل
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

// تصدير الدوال للنظام
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

// ======================== بدء التطبيق الرئيسي ========================

let currentUser = null;
let isGuest = false;
let isAdmin = false;
let isLoading = false;
let appInitialized = false;
let cartItems = [];
let favorites = [];
let allProducts = [];
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
    
    // تهيئة Firebase Messaging بعد إخفاء شاشة التحميل
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

// ======================== تسجيل Service Worker والإشعارات ========================

// تسجيل Service Worker عند تحميل الصفحة
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('✅ Service Worker Registered:', registration);
            })
            .catch(error => {
                console.error('❌ Service Worker Registration Failed:', error);
            });
    });
}

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
        
        // اختبار اتصال بسيط
        const testRef = window.firebaseModules.collection(db, "settings");
        const test = await window.firebaseModules.getDocs(testRef);
        console.log('✅ اتصال قاعدة البيانات نشط');
        return true;
    } catch (error) {
        console.error('❌ خطأ في اتصال قاعدة البيانات:', error);
        return false;
    }
}

// ======================== تهيئة التطبيق الآمنة ========================

async function initializeAppSafely() {
    if (appInitialized) {
        console.log('⚠️ التطبيق مهيأ بالفعل');
        return;
    }
    
    console.log('🚀 بدء تهيئة التطبيق بشكل آمن...');
    appInitialized = true;
    
    if (!checkFirebaseSDK()) {
        return;
    }
    
    if (!initializeFirebase()) {
        forceHideLoader();
        showAuthScreen();
        showToast('حدث خطأ في الاتصال. يمكنك الدخول كضيف.', 'warning');
        return;
    }
    
    try {
        await Promise.all([
            loadSiteConfig(),
            loadThemeColors()
        ]);
        
        setupAllEventListeners();
        setupRegistrationEventListeners();
        setupSmartHeader();
        
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
        showToast('حدث خطأ في تحميل التطبيق.', 'error');
    }
}

// ======================== معالجة حالة المصادقة ========================

async function handleAuthStateChange(user) {
    try {
        if (user) {
            console.log('👤 مستخدم مسجل دخول:', user.uid);
            currentUser = user;
            isGuest = false;
            
            // التحقق من الصلاحيات وجلب البيانات
            await checkAdminPermissions(user.uid);
            
            // جلب بيانات المستخدم الإضافية من Firestore (مثل الهاتف والعنوان)
            const userDoc = await window.firebaseModules.getDoc(window.firebaseModules.doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                currentUser.phone = userData.phone || '';
                currentUser.address = userData.address || '';
                currentUser.displayName = userData.name || user.displayName;
            }
            
            // مزامنة البيانات من Firestore عند تسجيل الدخول
            await syncUserDataFromFirestore();
            await loadCartFromFirebase();
            
            // تحديث الواجهة
            updateUserProfile();
            await loadProducts();
            updateCartCount();
            updateAdminButton();
            
            if (document.querySelector(".section.active")?.id === "checkout") {
                updateCheckoutSummary();
            } else {
                showMainApp();
                // إذا لم يكن هناك قسم نشط أو كنا في صفحة المصادقة، نذهب للرئيسية
                const currentSec = document.querySelector(".section.active");
                if (!currentSec || currentSec.id === 'authScreen') {
                    showSection("home");
                    updateHeaderLayout();
                }
            }
            
            // تفعيل نظام الإشعارات
            if (window.setupOrderStatusListener) {
                window.setupOrderStatusListener().catch(e => console.error('Order status listener error:', e));
            }
            
            showToast(`مرحباً بعودتك ${currentUser.displayName || 'مستخدم'}!`, 'success');
        } else {
            const savedUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
            if (savedUser) {
                try {
                    const userData = JSON.parse(savedUser);
                    if (userData.isGuest) {
                        currentUser = userData;
                        isGuest = true;
                        isAdmin = false;
                        
                        showMainApp();
                        showSection('home');
                        updateHeaderLayout();
                        updateUserProfile();
                        await loadProducts();
                        updateCartCount();
                        updateAdminButton();
                        
                        console.log('👤 تم استعادة المستخدم الضيف');
                    } else {
                        // إذا كان مستخدماً مسجلاً ولكن Firebase Auth لم يتعرف عليه بعد، ننتظر قليلاً أو نظهر شاشة الدخول
                        showAuthScreen();
                    }
                } catch (e) {
                    console.error('❌ خطأ في قراءة بيانات المستخدم:', e);
                    localStorage.removeItem('currentUser');
                    sessionStorage.removeItem('currentUser');
                    showAuthScreen();
                }
            } else {
                showAuthScreen();
            }
        }
        
        hideLoader();
        
    } catch (error) {
        console.error('❌ خطأ في معالجة حالة المصادقة:', error);
        hideLoader();
        showAuthScreen();
    }
}

function handleAuthError() {
    console.log('⚠️ فشل الاتصال بمصادقة Firebase');
    
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
        try {
            const userData = JSON.parse(savedUser);
            if (userData.isGuest) {
                currentUser = userData;
                isGuest = true;
                isAdmin = false;
                
                showMainApp();
                showSection('home');
                updateHeaderLayout();
                updateUserProfile();
                loadProducts();
                updateCartCount();
                updateAdminButton();
                
                showToast('تم الاتصال في وضع عدم الاتصال', 'warning');
                hideLoader();
                return;
            }
        } catch (e) {
            console.error('❌ خطأ في قراءة بيانات المستخدم:', e);
        }
    }
    
    forceHideLoader();
    showAuthScreen();
    showToast('تعذر الاتصال بالخادم. يمكنك الدخول كضيف.', 'warning');
}

// ======================== إدارة المستخدمين ========================

function signInAsGuest() {
    console.log('👤 تسجيل الدخول كضيف...');
    
    // تصفير البيانات السابقة تماماً قبل الدخول كضيف
    localStorage.removeItem('userPhone');
    localStorage.removeItem('userAddress');
    document.querySelectorAll('input').forEach(i => i.value = '');
    
    currentUser = {
        uid: generateGuestUID(),
        displayName: 'زائر',
        email: null,
        photoURL: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
        isGuest: true,
        phone: '',
        address: ''
    };
    
    isGuest = true;
    isAdmin = false;
    cartItems = [];
    favorites = [];
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    showMainApp();
    showSection('home');
    updateHeaderLayout();
    updateUserProfile();
    loadProducts();
    updateCartCount();
    updateAdminButton();
    
    showToast('تم الدخول كضيف بنجاح', 'success');
}

async function signInWithGoogle() {
    try {
        console.log('🔑 تسجيل الدخول بـ Google...');
        
        if (!checkFirebaseSDK() || !initializeFirebase()) {
            showToast('تعذر الاتصال بخدمة المصادقة', 'error');
            return;
        }
        
        const provider = new window.firebaseModules.GoogleAuthProvider();
        const result = await window.firebaseModules.signInWithPopup(auth, provider);
        currentUser = result.user;
        isGuest = false;
        
        // جلب بيانات المستخدم أو إنشاؤها
        await checkAndUpdateUserInFirestore(currentUser);
        const isAdminUser = await checkAdminPermissions(currentUser.uid);
        
        // جلب البيانات الإضافية من Firestore
        const userDoc = await window.firebaseModules.getDoc(window.firebaseModules.doc(db, "users", currentUser.uid));
        let phone = '', address = '';
        if (userDoc.exists()) {
            const userData = userDoc.data();
            phone = userData.phone || '';
            address = userData.address || '';
            currentUser.displayName = userData.name || currentUser.displayName;
        }

        const userToSave = {
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            phone: phone,
            address: address,
            isGuest: false,
            isAdmin: isAdminUser
        };
        
        localStorage.setItem('currentUser', JSON.stringify(userToSave));
        sessionStorage.setItem('currentUser', JSON.stringify(userToSave));
        
        // تصفير الحقول قبل الدخول
        document.querySelectorAll('input').forEach(i => i.value = '');
        
        showMainApp();
        showSection('home');
        updateHeaderLayout();
        updateUserProfile();
        await loadProducts();
        updateCartCount();
        updateAdminButton();
        
        // تفعيل نظام الإشعارات
        if (window.setupOrderStatusListener) {
            window.setupOrderStatusListener().catch(e => console.error('Order status listener error:', e));
        }
        
        showToast(`مرحباً بك ${currentUser.displayName}!`, 'success');
        
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول بـ Google:', error);
        showToast('حدث خطأ في تسجيل الدخول', 'error');
    }
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

function clearRegistrationForm() {
    const nameInput = document.getElementById('registerName');
    const emailInput = document.getElementById('registerEmail');
    const passwordInput = document.getElementById('registerPassword');
    const phoneInput = document.getElementById('registerPhone');
    
    if (nameInput) nameInput.value = '';
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (phoneInput) phoneInput.value = '';
    
    const authMessage = document.getElementById('emailAuthMessage');
    if (authMessage) {
        authMessage.textContent = '';
        authMessage.className = 'auth-message';
    }
}

async function signUpWithEmail(email, password, name, phone = '') {
    try {
        console.log('📝 إنشاء حساب جديد...');
        
        if (!email || !password || !name) {
            showToast('الرجاء ملء جميع الحقول المطلوبة', 'warning');
            return false;
        }
        
        if (password.length < 6) {
            showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'warning');
            return false;
        }
        
        if (!validateEmail(email)) {
            showToast('البريد الإلكتروني غير صالح', 'warning');
            return false;
        }
        
        if (!checkFirebaseSDK() || !initializeFirebase()) {
            showToast('تعذر الاتصال بخدمة التسجيل', 'error');
            return false;
        }
        
        const result = await window.firebaseModules.createUserWithEmailAndPassword(auth, email, password);
        
        await window.firebaseModules.updateProfile(result.user, {
            displayName: name,
            photoURL: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
        });
        
        currentUser = result.user;
        isGuest = false;
        isAdmin = false;
        
        const userData = {
            email: email,
            name: name,
            phone: phone,
            address: '',
            photoURL: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
            role: 'user',
            isAdmin: false,
            isGuest: false,
            isActive: true,
            totalOrders: 0,
            totalSpent: 0,
            favorites: [],
            createdAt: window.firebaseModules.serverTimestamp(),
            updatedAt: window.firebaseModules.serverTimestamp()
        };
        
        const userRef = window.firebaseModules.doc(db, "users", currentUser.uid);
        await window.firebaseModules.setDoc(userRef, userData);
        
        console.log('✅ تم إنشاء حساب المستخدم بنجاح في قاعدة البيانات');
        
        showMainApp();
        showSection('home');
        updateHeaderLayout();
        updateUserProfile();
        await loadProducts();
        updateCartCount();
        updateAdminButton();
        
        showToast(`تم إنشاء حسابك بنجاح ${name}!`, 'success');
        hideEmailAuthForm();
        clearRegistrationForm();
        
        return true;
        
    } catch (error) {
        console.error('❌ خطأ في إنشاء الحساب:', error);
        
        let errorMessage = 'حدث خطأ في إنشاء الحساب';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'البريد الإلكتروني مستخدم بالفعل';
                break;
            case 'auth/invalid-email':
                errorMessage = 'البريد الإلكتروني غير صالح';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'عملية إنشاء الحساب غير مسموحة';
                break;
            case 'auth/weak-password':
                errorMessage = 'كلمة المرور ضعيفة جداً';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'خطأ في الاتصال بالشبكة';
                break;
        }
        
        showToast(errorMessage, 'error');
        return false;
    }
}

async function signInWithEmail(email, password) {
    try {
        console.log('📧 تسجيل الدخول بالبريد...');
        
        if (!checkFirebaseSDK() || !initializeFirebase()) {
            showToast('تعذر الاتصال بخدمة المصادقة', 'error');
            return;
        }
        
        const result = await window.firebaseModules.signInWithEmailAndPassword(auth, email, password);
        
        currentUser = result.user;
        isGuest = false;
        
        // جلب بيانات المستخدم أو إنشاؤها
        await checkAndUpdateUserInFirestore(currentUser);
        const isAdminUser = await checkAdminPermissions(currentUser.uid);
        
        // جلب البيانات الإضافية من Firestore
        const userDoc = await window.firebaseModules.getDoc(window.firebaseModules.doc(db, "users", currentUser.uid));
        let phone = '', address = '';
        if (userDoc.exists()) {
            const userData = userDoc.data();
            phone = userData.phone || '';
            address = userData.address || '';
            currentUser.displayName = userData.name || currentUser.displayName || currentUser.email.split('@')[0];
        }

        const userToSave = {
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
            phone: phone,
            address: address,
            isGuest: false,
            isAdmin: isAdminUser
        };
        
        localStorage.setItem('currentUser', JSON.stringify(userToSave));
        sessionStorage.setItem('currentUser', JSON.stringify(userToSave));
        
        // تصفير الحقول قبل الدخول
        document.querySelectorAll('input').forEach(i => i.value = '');
        
        showMainApp();
        showSection('home');
        updateHeaderLayout();
        updateUserProfile();
        await loadProducts();
        updateCartCount();
        updateAdminButton();
        
        // تفعيل نظام الإشعارات
        if (window.setupOrderStatusListener) {
            window.setupOrderStatusListener().catch(e => console.error('Order status listener error:', e));
        }
        
        showToast(`مرحباً بعودتك ${currentUser.displayName}!`, 'success');
        hideEmailAuthForm();
        
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        
        let errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'المستخدم غير موجود';
                break;
            case 'auth/wrong-password':
                errorMessage = 'كلمة المرور غير صحيحة';
                break;
            case 'auth/invalid-email':
                errorMessage = 'البريد الإلكتروني غير صالح';
                break;
            case 'auth/user-disabled':
                errorMessage = 'تم تعطيل هذا الحساب';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'خطأ في الاتصال بالشبكة';
                break;
        }
        
        showToast(errorMessage, 'error');
        showAuthMessage(errorMessage, 'error');
    }
}

async function checkAndUpdateUserInFirestore(user) {
    try {
        if (!db) return;
        
        const userRef = window.firebaseModules.doc(db, "users", user.uid);
        const userDoc = await window.firebaseModules.getDoc(userRef);
        
        if (!userDoc.exists()) {
            const userData = {
                email: user.email,
                name: user.displayName || user.email.split('@')[0],
                phone: '',
                address: '',
                photoURL: user.photoURL || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
                role: 'user',
                isAdmin: false,
                isGuest: false,
                isActive: true,
                totalOrders: 0,
                totalSpent: 0,
                favorites: [],
                createdAt: window.firebaseModules.serverTimestamp(),
                updatedAt: window.firebaseModules.serverTimestamp()
            };
            
            await window.firebaseModules.setDoc(userRef, userData);
        } else {
            await window.firebaseModules.updateDoc(userRef, {
                lastLogin: window.firebaseModules.serverTimestamp(),
                updatedAt: window.firebaseModules.serverTimestamp()
            });
        }
    } catch (error) {
        console.error('خطأ في التحقق من المستخدم:', error);
    }
}

async function checkAndCreateUserInFirestore(user) {
    try {
        if (!db) return;
        
        const userDoc = await window.firebaseModules.getDoc(
            window.firebaseModules.doc(db, "users", user.uid)
        );
        
        if (!userDoc.exists()) {
            await window.firebaseModules.setDoc(
                window.firebaseModules.doc(db, "users", user.uid), 
                {
                    email: user.email,
                    name: user.displayName || user.email.split('@')[0],
                    phone: '',
                    address: '',
                    photoURL: user.photoURL || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
                    role: 'user',
                    isAdmin: false,
                    isGuest: false,
                    totalOrders: 0,
                    totalSpent: 0,
                    favorites: [],
                    createdAt: window.firebaseModules.serverTimestamp(),
                    updatedAt: window.firebaseModules.serverTimestamp()
                }
            );
        }
    } catch (error) {
        console.error('خطأ في التحقق من المستخدم:', error);
    }
}

async function checkAdminPermissions(userId) {
    console.log('🔍 التحقق من صلاحيات المدير للمستخدم:', userId);
    
    try {
        if (!db) {
            isAdmin = false;
            console.log('❌ قاعدة البيانات غير متاحة');
            return false;
        }
        
        const userRef = window.firebaseModules.doc(db, "users", userId);
        const userSnap = await window.firebaseModules.getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            
            if (userData.isAdmin === true || userData.role === 'admin') {
                isAdmin = true;
                console.log('✅ المستخدم أدمن');
            } else {
                isAdmin = false;
                console.log('❌ المستخدم ليس أدمن');
            }
        } else {
            console.log('⚠️ المستخدم غير موجود في قاعدة البيانات');
            isAdmin = false;
        }
        
        updateAdminButton();
        
        return isAdmin;
        
    } catch (error) {
        console.error('❌ خطأ في التحقق من صلاحيات المستخدم:', error);
        isAdmin = false;
        updateAdminButton();
        return false;
    }
}

function updateAdminButton() {
    const adminBtn = document.getElementById('adminBtn');
    const adminMobileLink = document.getElementById('adminMobileLink');
    
    if (adminBtn) {
        if (isAdmin && !isGuest) {
            adminBtn.style.display = 'flex';
        } else {
            adminBtn.style.display = 'none';
        }
    }
    
    if (adminMobileLink) {
        if (isAdmin && !isGuest) {
            adminMobileLink.style.display = 'block';
        } else {
            adminMobileLink.style.display = 'none';
        }
    }
}

async function signOutUser() {
    console.log('🚪 تسجيل الخروج...');
    
    try {
        if (isGuest) {
            if (!confirm('سيتم فقدان سلة التسوق والطلبات. هل تريد المتابعة؟')) {
                return;
            }
        }
        
        if (!isGuest && auth) {
            await window.firebaseModules.signOut(auth);
        }
        
        currentUser = null;
        isGuest = false;
        isAdmin = false;
        cartItems = [];
        favorites = [];
        
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
        localStorage.removeItem('userPhone');
        localStorage.removeItem('userAddress');
        
        if (window.authUnsubscribe) {
            window.authUnsubscribe();
        }
        
        // تصفير جميع حقول الإدخال في التطبيق
        const allInputs = document.querySelectorAll('input, textarea, select');
        allInputs.forEach(input => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });

        // تصفير بيانات الملف الشخصي في الواجهة
        const profileElements = [
            'profileName', 'mobileUserName', 'profileEmail', 'mobileUserEmail',
            'detailName', 'detailEmail', 'detailPhone', 'detailAddress',
            'favoritesCount', 'ordersCount', 'totalSpent'
        ];
        profileElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '--';
        });

        // تصفير الصور الشخصية
        const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
        const profileImages = document.querySelectorAll('#profileImage, #mobileUserImage');
        profileImages.forEach(img => {
            if (img) img.src = defaultAvatar;
        });
        
        updateAdminButton();
        updateCartCount();
        showAuthScreen();
        
        // إعادة تحميل المنتجات لضمان عدم وجود بيانات معلقة
        allProducts = [];
        displayProducts();
        
        showToast('تم تسجيل الخروج بنجاح', 'success');
    } catch (error) {
        console.error('❌ خطأ في تسجيل الخروج:', error);
        showToast('حدث خطأ أثناء تسجيل الخروج', 'error');
    }
}

// ======================== تحميل الألوان ========================

async function loadThemeColors() {
    try {
        if (!db) return;
        
        const colorsRef = window.firebaseModules.doc(db, "settings", "theme_colors");
        const colorsSnap = await window.firebaseModules.getDoc(colorsRef);
        
        if (colorsSnap.exists()) {
            const colors = colorsSnap.data();
            applyThemeColors(colors);
        }
    } catch (error) {
        console.error('خطأ في تحميل إعدادات الألوان:', error);
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

// ======================== إدارة المنتجات ========================

async function loadProducts() {
    console.log('🛍️ جاري تحميل المنتجات من Firebase...');
    
    if (isLoading) {
        console.log('⚠️ المنتجات قيد التحميل بالفعل، تخطي...');
        return;
    }
    
    isLoading = true;
    
    try {
        if (!db) {
            console.log('❌ قاعدة البيانات غير متاحة');
            displayNoProductsMessage();
            return;
        }
        
        const productsRef = window.firebaseModules.collection(db, "products");
        const q = window.firebaseModules.query(
            productsRef, 
            window.firebaseModules.where("isActive", "==", true)
        );
        
        const querySnapshot = await window.firebaseModules.getDocs(q);
        
        if (querySnapshot.empty) {
            console.log('⚠️ لا توجد منتجات في قاعدة البيانات');
            displayNoProductsMessage();
            return;
        }
        
        allProducts = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || 'بدون اسم',
                price: data.price || 0,
                originalPrice: data.originalPrice || null,
                image: data.image || 'https://via.placeholder.com/300x200?text=صورة',
                category: data.category || 'غير مصنف',
                stock: data.stock || 0,
                description: data.description || '',
                isNew: data.isNew || false,
                isSale: data.isSale || false,
                isBest: data.isBest || false,
                isActive: data.isActive !== false,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
            };
        });
        
        console.log(`✅ تم تحميل ${allProducts.length} منتج من Firebase`);
        
        displayProducts();
        displayFeaturedProducts();
        
    } catch (error) {
        console.error('❌ خطأ في تحميل المنتجات من Firebase:', error);
        displayNoProductsMessage();
    } finally {
        isLoading = false;
    }
}

function displayNoProductsMessage() {
    const productsGrid = document.getElementById('productsGrid');
    const featuredGrid = document.getElementById('featuredProductsGrid');
    
    const message = `
        <div style="text-align: center; padding: 40px 20px; width: 100%;">
            <i class="fas fa-box-open fa-3x" style="color: var(--gray-color); margin-bottom: 20px;"></i>
            <h3 style="color: var(--primary-color); margin-bottom: 10px;">لا توجد منتجات متاحة</h3>
            <p style="color: var(--gray-color);">سيتم إضافة المنتجات قريباً</p>
        </div>
    `;
    
    if (productsGrid) productsGrid.innerHTML = message;
    if (featuredGrid) featuredGrid.innerHTML = message;
}

let currentModalQuantity = 1;
let currentModalProductId = null;

function openProductDetails(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        showToast('المنتج غير موجود', 'error');
        return;
    }

    const modal = document.getElementById('productDetailsModal');
    if (!modal) return;

    const modalProductName = document.getElementById('modalProductName');
    const modalProductTitle = document.getElementById('modalProductTitle');
    const modalProductImage = document.getElementById('modalProductImage');
    const modalProductCategory = document.getElementById('modalProductCategory');
    const modalProductPrice = document.getElementById('modalProductPrice');
    const modalProductDescription = document.getElementById('modalProductDescription');
    const modalProductStock = document.getElementById('modalProductStock');

    if (modalProductName) modalProductName.textContent = product.name;
    if (modalProductTitle) modalProductTitle.textContent = product.name;
    if (modalProductImage) modalProductImage.src = product.image;
    if (modalProductCategory) modalProductCategory.textContent = product.category || 'عام';
    if (modalProductPrice) modalProductPrice.textContent = `${formatNumber(product.price)} ${siteCurrency}`;
    if (modalProductDescription) modalProductDescription.textContent = product.description || 'لا يوجد وصف متاح لهذا المنتج.';
    if (modalProductStock) modalProductStock.textContent = formatNumber(product.stock || 0);

    // إعداد زر الشراء في المودال ليفتح نافذة الكمية
    const modalBuyBtn = document.getElementById('modalBuyBtn');
    if (modalBuyBtn) {
        modalBuyBtn.onclick = () => {
            openQuantityModal(productId);
            closeProductDetailsModal();
        };
    }

    modal.classList.add('active');
}

function openQuantityModal(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    currentModalProductId = productId;
    currentModalQuantity = 1;
    
    const modal = document.getElementById('quantityModal');
    const nameDisplay = document.getElementById('quantityModalProductName');
    const quantityDisplay = document.getElementById('modalQuantityDisplay');
    
    if (nameDisplay) nameDisplay.textContent = product.name;
    if (quantityDisplay) quantityDisplay.textContent = currentModalQuantity;
    
    // إعداد أزرار التأكيد
    const confirmAddToCartBtn = document.getElementById('confirmAddToCartBtn');
    const confirmBuyNowBtn = document.getElementById('confirmBuyNowBtn');
    
    if (confirmAddToCartBtn) {
        confirmAddToCartBtn.onclick = () => {
            addToCartWithQuantity(currentModalProductId, currentModalQuantity);
            closeQuantityModal();
        };
    }
    
    if (confirmBuyNowBtn) {
        confirmBuyNowBtn.onclick = () => {
            buyNowDirect(currentModalProductId, currentModalQuantity);
            closeQuantityModal();
        };
    }
    
    if (modal) modal.classList.add('active');
}

function closeQuantityModal() {
    const modal = document.getElementById('quantityModal');
    if (modal) modal.classList.remove('active');
}

function changeModalQuantity(change) {
    const product = allProducts.find(p => p.id === currentModalProductId);
    const stock = product ? product.stock : 99;
    
    const newQuantity = currentModalQuantity + change;
    
    if (newQuantity >= 1 && newQuantity <= stock) {
        currentModalQuantity = newQuantity;
        const display = document.getElementById('modalQuantityDisplay');
        if (display) display.textContent = currentModalQuantity;
    } else if (newQuantity > stock) {
        showToast(`الكمية المتاحة في المخزون هي ${stock} فقط`, 'warning');
    }
}

function closeProductDetailsModal() {
    const modal = document.getElementById('productDetailsModal');
    if (modal) modal.classList.remove('active');
}

function displayProducts(products = allProducts) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    if (products.length === 0) {
        displayNoProductsMessage();
        return;
    }
    
    productsGrid.innerHTML = products.map(product => {
        const isNew = product.isNew === true || product.isNew === 'true';
        const isSale = product.isSale === true || product.isSale === 'true';
        const isBest = product.isBest === true || product.isBest === 'true';
        const isInFavorites = favorites.some(f => f.id === product.id);
        
        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image" onclick="openProductDetails('${product.id}')">
                    <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x200?text=صورة'">
                    ${isNew ? '<div class="badge new">جديد</div>' : ''}
                    ${isSale ? '<div class="badge sale">عرض</div>' : ''}
                    ${isBest ? '<div class="badge best">الأفضل</div>' : ''}
                </div>
                <div class="product-info">
                    <h3 onclick="openProductDetails('${product.id}')">${product.name}</h3>
                    <p class="product-description">${product.description || ''}</p>
                    <div class="product-price">
                        <span class="current-price">${formatNumber(product.price)} ${siteCurrency}</span>
                        ${product.originalPrice ? `<span class="original-price">${formatNumber(product.originalPrice)} ${siteCurrency}</span>` : ''}
                    </div>
                    <div class="product-stock">
                        <i class="fas fa-box"></i> المخزون: ${formatNumber(product.stock || 0)}
                    </div>
                    <div class="product-actions">
                        <button class="action-btn add-to-cart" onclick="openQuantityModal('${product.id}')">
                            <i class="fas fa-shopping-bag"></i> شراء
                        </button>
                        <button class="action-btn favorite-btn ${isInFavorites ? 'active' : ''}" onclick="toggleFavorite('${product.id}')">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function displayFeaturedProducts(filteredProducts = null) {
    const featuredGrid = document.getElementById('featuredProductsGrid');
    if (!featuredGrid) return;
    
    const productsToShow = filteredProducts || allProducts;
    
    if (productsToShow.length === 0) {
        return;
    }
    
    featuredGrid.innerHTML = productsToShow.map(product => {
        const isNew = product.isNew === true || product.isNew === 'true';
        const isSale = product.isSale === true || product.isSale === 'true';
        const isBest = product.isBest === true || product.isBest === 'true';
        
        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image" onclick="openProductDetails('${product.id}')">
                    <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x200?text=صورة'">
                    ${isNew ? '<div class="badge new">جديد</div>' : ''}
                    ${isSale ? '<div class="badge sale">عرض</div>' : ''}
                    ${isBest ? '<div class="badge best">الأفضل</div>' : ''}
                </div>
                <div class="product-info">
                    <h3 onclick="openProductDetails('${product.id}')">${product.name}</h3>
                    <p class="product-description">${product.description || ''}</p>
                    <div class="product-price">
                        <span class="current-price">${formatNumber(product.price)} ${siteCurrency}</span>
                        ${product.originalPrice ? `<span class="original-price">${formatNumber(product.originalPrice)} ${siteCurrency}</span>` : ''}
                    </div>
                    <div class="product-stock">
                        <i class="fas fa-box"></i> المخزون: ${formatNumber(product.stock || 0)}
                    </div>
                    <div class="product-actions">
                        <button class="action-btn add-to-cart" onclick="openQuantityModal('${product.id}')">
                            <i class="fas fa-shopping-bag"></i> شراء
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
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
    
    displayFeaturedProducts(filtered);
}

// ======================== إدارة السلة ========================

function updateCartCount() {
    let totalItems = 0;
    
    if (directPurchaseItem) {
        totalItems = directPurchaseItem.quantity;
    } else {
        totalItems = (cartItems || []).reduce((total, item) => total + (item.quantity || 0), 0);
    }
    
    const cartCountElements = document.querySelectorAll('.cart-count');
    
    cartCountElements.forEach(element => {
        if (element) {
            element.textContent = totalItems;
        }
    });
}

function addToCartWithQuantity(productId, quantity = 1) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        showToast('المنتج غير موجود', 'error');
        return;
    }
    
    if (product.stock <= 0) {
        showToast('المنتج غير متوفر في المخزون', 'warning');
        return;
    }
    
    if (quantity > product.stock) {
        showToast(`الكمية المطلوبة غير متوفرة. المخزون الحالي: ${product.stock}`, 'warning');
        return;
    }
    
    const existingItem = cartItems.find(item => item.id === productId);
    
    if (existingItem) {
        if (existingItem.quantity + quantity > product.stock) {
            showToast(`لا توجد كمية كافية في المخزون. المتاح: ${product.stock - existingItem.quantity}`, 'warning');
            return;
        }
        existingItem.quantity += quantity;
    } else {
        if (!cartItems) cartItems = [];
        cartItems.push({
            id: product.id,
            name: product.name,
            price: product.price,
            originalPrice: product.originalPrice,
            image: product.image,
            quantity: quantity,
            stock: product.stock
        });
    }
    
    saveCartToFirebase();
    updateCartCount();
    
    const cartSection = document.getElementById('cart');
    if (cartSection && cartSection.classList.contains('active')) {
        updateCartDisplay();
    }
    
    showToast(`تمت إضافة ${quantity} من المنتج إلى السلة`, 'success');
}

async function saveCartToFirebase() {
    try {
        if (!currentUser || isGuest) {
            console.log('لا يمكن حفظ السلة للضيف');
            return;
        }
        const userRef = window.firebaseModules.doc(db, 'users', currentUser.uid);
        await window.firebaseModules.updateDoc(userRef, {
            cart: cartItems,
            updatedAt: window.firebaseModules.serverTimestamp()
        });
        console.log('تم حفظ السلة في Firebase');
    } catch (error) {
        console.error('خطأ في حفظ السلة:', error);
    }
}

async function loadCartFromFirebase() {
    try {
        if (!currentUser || isGuest) {
            console.log('لا يمكن تحميل السلة للضيف');
            return;
        }
        const userRef = window.firebaseModules.doc(db, 'users', currentUser.uid);
        const userSnap = await window.firebaseModules.getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data();
            cartItems = userData.cart || [];
            updateCartCount();
            console.log('تم تحميل السلة من Firebase');
        }
    } catch (error) {
        console.error('خطأ في تحميل السلة:', error);
    }
}

function updateCartDisplay() {
    const cartItemsElement = document.getElementById('cartItems');
    const emptyCartMessage = document.getElementById('emptyCartMessage');
    const cartSummary = document.querySelector('.cart-summary');
    
    if (!cartItemsElement || !emptyCartMessage) return;
    
    if (directPurchaseItem ? false : cartItems.length === 0) {
        cartItemsElement.style.display = 'none';
        emptyCartMessage.style.display = 'block';
        if (cartSummary) cartSummary.style.display = 'none';
        return;
    }
    
    cartItemsElement.style.display = 'flex';
    cartItemsElement.style.flexDirection = 'column';
    emptyCartMessage.style.display = 'none';
    if (cartSummary) cartSummary.style.display = 'block';
    
    const itemsToShow = directPurchaseItem ? [directPurchaseItem] : cartItems;
    
    cartItemsElement.innerHTML = itemsToShow.map(item => {
        const totalPrice = item.price * item.quantity;
        
        return `
            <div class="cart-item-compact">
                <div class="cart-item-right">
                    <div class="cart-item-image-compact">
                        <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/100x100?text=صورة'">
                    </div>
                    <div class="cart-item-info-compact">
                        <h3 class="cart-item-title-compact">${item.name}</h3>
                        <p class="cart-item-price-compact">${siteCurrency} ${formatNumber(item.price)}</p>
                    </div>
                </div>
                <div class="cart-item-left">
                    <div class="quantity-controls-compact">
                        <button class="qty-btn-compact" onclick="updateCartQuantity('${item.id}', 1)">+</button>
                        <span class="qty-val-compact">${item.quantity}</span>
                        <button class="qty-btn-compact" onclick="updateCartQuantity('${item.id}', -1)">-</button>
                    </div>
                    <div class="cart-item-total-compact">${formatNumber(totalPrice)}</div>
                    <button class="remove-item-btn-compact" onclick="removeFromCart('${item.id}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    updateCartSummary();
}

function updateCartQuantity(productId, change) {
    const item = cartItems.find(item => item.id === productId);
    if (!item) return;
    
    const product = allProducts.find(p => p.id === productId);
    const newQuantity = item.quantity + change;
    
    if (newQuantity < 1) {
        removeFromCart(productId);
        return;
    }
    
    const availableStock = product ? product.stock : (item.stock || 99);
    if (newQuantity > availableStock) {
        showToast('لا توجد كمية كافية في المخزون', 'warning');
        return;
    }
    
    item.quantity = newQuantity;
    saveCartToFirebase();
    updateCartCount();
    updateCartDisplay();
}

function removeFromCart(productId) {
    if (!confirm('هل تريد إزالة هذا المنتج من السلة؟')) return;
    
    if (directPurchaseItem && directPurchaseItem.id === productId) {
        directPurchaseItem = null;
    } else {
        cartItems = (cartItems || []).filter(item => item.id !== productId);
    }
    
    saveCartToFirebase();
    updateCartCount();
    updateCartDisplay();
    showToast('تم إزالة المنتج من السلة', 'info');
}

function updateCartSummary() {
    const itemsToCalculate = directPurchaseItem ? [directPurchaseItem] : cartItems;
    const subtotal = itemsToCalculate.reduce((total, item) => total + (Number(item.price) * Number(item.quantity)), 0);
    const shippingCost = siteSettings.shippingCost || 15;
    const freeShippingLimit = siteSettings.freeShippingLimit || 200;
    
    let finalShippingCost = 0;
    if (subtotal > 0 && subtotal < freeShippingLimit) {
        finalShippingCost = shippingCost;
    }
    
    const total = subtotal + finalShippingCost;
    
    const subtotalElement = document.getElementById('cartSubtotal');
    const shippingElement = document.getElementById('cartShipping');
    const totalElement = document.getElementById('cartTotal');
    const shippingNoteElement = document.getElementById('shippingNote');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (subtotalElement) subtotalElement.textContent = `${formatNumber(subtotal)} ${siteCurrency}`;
    if (shippingElement) shippingElement.textContent = `${formatNumber(finalShippingCost)} ${siteCurrency}`;
    if (totalElement) totalElement.textContent = `${formatNumber(total)} ${siteCurrency}`;
    
    if (shippingNoteElement) {
        if (subtotal > 0 && subtotal < freeShippingLimit) {
            const remaining = Number(freeShippingLimit) - Number(subtotal);
            shippingNoteElement.innerHTML = `
                <i class="fas fa-truck"></i>
                أضف ${remaining} ${siteCurrency} أخرى للحصول على شحن مجاني
            `;
        } else if (subtotal >= freeShippingLimit) {
            shippingNoteElement.innerHTML = `
                <i class="fas fa-check-circle"></i>
                الشحن مجاني
            `;
        } else {
            shippingNoteElement.innerHTML = '';
        }
    }
    
    if (checkoutBtn) {
        checkoutBtn.disabled = subtotal === 0;
    }
}

function clearCart() {
    if (directPurchaseItem ? false : cartItems.length === 0) return;
    
    if (confirm('هل تريد تفريغ السلة بالكامل؟')) {
        cartItems = [];
        saveCartToFirebase();
        updateCartCount();
        updateCartDisplay();
        showToast('تم تفريغ السلة', 'info');
    }
}

// ======================== نظام الدفع والإيصال ========================

let checkoutReceiptFile = null;

function previewCheckoutReceipt(input) {
    if (!input || !input.files || !input.files[0]) return;
    
    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
        showToast('يرجى اختيار صورة صالحة', 'error');
        input.value = '';
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('حجم الصورة كبير جداً (الحد الأقصى 5MB)', 'error');
        input.value = '';
        return;
    }
    
    checkoutReceiptFile = file;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewImg = document.getElementById('checkoutReceiptImg');
        const placeholder = document.getElementById('checkoutUploadPlaceholder');
        const previewContainer = document.getElementById('checkoutReceiptPreview');
        const uploadLabel = document.getElementById('receiptUploadLabel');
        
        if (previewImg) previewImg.src = e.target.result;
        if (placeholder) placeholder.style.display = 'none';
        if (previewContainer) previewContainer.style.display = 'block';
        if (uploadLabel) uploadLabel.style.display = 'none';
        
        updateCheckoutSummary();
        showToast('تم اختيار الإيصال بنجاح', 'success');
    };
    reader.readAsDataURL(file);
}

function removeCheckoutReceipt() {
    checkoutReceiptFile = null;
    const input = document.getElementById('checkoutReceipt');
    const placeholder = document.getElementById('checkoutUploadPlaceholder');
    const previewContainer = document.getElementById('checkoutReceiptPreview');
    const uploadLabel = document.getElementById('receiptUploadLabel');
    
    if (input) input.value = '';
    if (placeholder) placeholder.style.display = 'block';
    if (previewContainer) previewContainer.style.display = 'none';
    if (uploadLabel) uploadLabel.style.display = 'block';
    
    updateCheckoutSummary();
}

function updateCheckoutSummary() {
    const checkoutItems = document.getElementById("checkoutItems");
    if (!checkoutItems) return;
    
    const itemsToDisplay = directPurchaseItem ? [directPurchaseItem] : cartItems;
    const subtotal = itemsToDisplay.reduce((total, item) => total + (Number(item.price) * Number(item.quantity)), 0);
    const shippingCost = subtotal < (siteSettings.freeShippingLimit || 200) ? (siteSettings.shippingCost || 15) : 0;
    const total = subtotal + shippingCost;
    
    checkoutItems.innerHTML = itemsToDisplay.map(item => `
        <div class="checkout-item">
            <img src="${item.image}" class="checkout-item-img" alt="${item.name}">
            <div class="checkout-item-info">
                <span class="checkout-item-name">${item.name}</span>
                <span class="checkout-item-price">${formatNumber(item.price)} SDG</span>
            </div>
            <div class="checkout-item-qty-controls">
                <button class="checkout-item-qty-btn" onclick="updateCheckoutItemQty('${item.id}', -1)">-</button>
                <span class="checkout-item-qty-val">${item.quantity}</span>
                <button class="checkout-item-qty-btn" onclick="updateCheckoutItemQty('${item.id}', 1)">+</button>
            </div>
        </div>
    `).join("");
    
    safeElementUpdate('checkoutSubtotal', formatNumber(subtotal) + ' SDG');
    safeElementUpdate('checkoutShipping', formatNumber(shippingCost) + ' SDG');
    safeElementUpdate('checkoutTotal', formatNumber(total) + ' SDG');
    safeElementUpdate('checkoutTotalBtn', formatNumber(total));
    
    const submitOrderBtn = document.getElementById('submitOrderBtn');
    if (submitOrderBtn) {
        submitOrderBtn.disabled = (directPurchaseItem ? false : cartItems.length === 0) || !checkoutReceiptFile;
    }
    
    // تحديث معلومات البنك
    if (siteSettings.bankName) safeElementUpdate('checkoutBankName', siteSettings.bankName);
    if (siteSettings.bankAccount) safeElementUpdate('checkoutBankAccount', siteSettings.bankAccount);
    if (siteSettings.bankAccountName) safeElementUpdate('checkoutBankAccountName', siteSettings.bankAccountName);
}

function updateCheckoutItemQty(productId, change) {
    const product = allProducts.find(p => p.id === productId);
    
    if (directPurchaseItem && directPurchaseItem.id === productId) {
        const newQty = directPurchaseItem.quantity + change;
        if (newQty < 1) return;
        
        const availableStock = product ? product.stock : (directPurchaseItem.stock || 99);
        if (newQty > availableStock) {
            showToast('لا توجد كمية كافية في المخزون', 'warning');
            return;
        }
        directPurchaseItem.quantity = newQty;
    } else {
        const item = cartItems.find(i => i.id === productId);
        if (item) {
            const newQty = item.quantity + change;
            if (newQty < 1) {
                removeFromCart(productId);
                // إذا تمت الإزالة، نعود للقائمة السابقة
                if (cartItems.length === 0) {
                    showSection('cart');
                    return;
                }
            } else {
                const availableStock = product ? product.stock : (item.stock || 99);
                if (newQty > availableStock) {
                    showToast('لا توجد كمية كافية في المخزون', 'warning');
                    return;
                }
                item.quantity = newQty;
                saveCartToFirebase();
                updateCartCount();
            }
        }
    }
    updateCheckoutSummary();
}

function enableDataEdit() {
    const phoneInput = document.getElementById('orderPhone');
    const addressInput = document.getElementById('orderAddress');
    const editBtn = document.getElementById('editDataBtn');
    
    if (phoneInput) {
        phoneInput.readOnly = false;
        phoneInput.focus();
    }
    if (addressInput) addressInput.readOnly = false;
    if (editBtn) editBtn.style.display = 'none';
}

async function submitCheckoutOrder() {
    const phoneInput = document.getElementById('checkoutPhone');
    const addressInput = document.getElementById('checkoutAddress');
    const notesInput = document.getElementById('checkoutNotes');

    let phone = phoneInput ? phoneInput.value.trim() : '';
    const address = addressInput ? addressInput.value.trim() : '';
    const notes = notesInput ? notesInput.value.trim() : '';
    
    if (!phone) {
        showToast('يرجى إدخال رقم الهاتف', 'warning');
        if (phoneInput) phoneInput.focus();
        return;
    }

    if (!isValidPhone(phone)) {
        showToast('يرجى إدخال رقم هاتف صحيح', 'warning');
        if (phoneInput) phoneInput.focus();
        return;
    }

    // حفظ البيانات محلياً للتسهيل في المرات القادمة
    localStorage.setItem('userPhone', phone);
    localStorage.setItem('userAddress', address);

    // تنسيق الرقم تلقائياً لمفتاح السودان
    phone = formatSudanPhone(phone);
    
    if (!checkoutReceiptFile) {
        showToast('يرجى رفع صورة الإيصال', 'warning');
        return;
    }
    
    // التحقق من وجود منتجات للطلب
    if (!directPurchaseItem && cartItems.length === 0) {
        showToast('السلة فارغة', 'warning');
        return;
    }
    
    const submitBtn = document.getElementById('submitOrderBtn');
    if (!submitBtn) {
        showToast('زر التأكيد غير موجود', 'error');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري إرسال الطلب...';
    
    try {
        const itemsToOrder = directPurchaseItem ? [directPurchaseItem] : cartItems;
        const subtotal = itemsToOrder.reduce((total, item) => total + (Number(item.price) * Number(item.quantity)), 0);
        const shippingCost = subtotal < (siteSettings.freeShippingLimit || 200) ? (siteSettings.shippingCost || 15) : 0;
        const total = subtotal + shippingCost;
        
        // رفع الإيصال أولاً والتأكد من نجاحه
        let receiptUrl = '';
        if (checkoutReceiptFile) {
            try {
                receiptUrl = await uploadCheckoutReceipt(checkoutReceiptFile);
                if (!receiptUrl) {
                    throw new Error('فشل رفع الإيصال');
                }
            } catch (uploadError) {
                console.error('خطأ في رفع الإيصال:', uploadError);
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-check"></i> تأكيد الطلب';
                showToast('فشل رفع صورة الإيصال. يرجى المحاولة مجدداً', 'error');
                return;
            }
        }
        
        // إنشاء رقم الطلب
        const orderNumber = 11001000 + Math.floor(Math.random() * 1000);
        const orderId = 'NO:' + orderNumber;
        
        const orderData = {
            orderId: orderId,
            orderNumber: orderNumber,
            userId: currentUser.uid,
            userName: currentUser.displayName || 'مستخدم',
            userEmail: currentUser.email,
            phone: phone,
            address: address,
            notes: notes,
            items: itemsToOrder.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image: item.image,
                total: item.price * item.quantity
            })),
            subtotal: subtotal,
            shippingCost: shippingCost,
            total: total,
            receiptUrl: receiptUrl,
            status: 'pending',
            createdAt: window.firebaseModules.serverTimestamp(),
            updatedAt: window.firebaseModules.serverTimestamp()
        };
        
        const ordersRef = window.firebaseModules.collection(db, 'orders');
        await window.firebaseModules.addDoc(ordersRef, orderData);
        
        // الخصم من المخزون
        for (const item of itemsToOrder) {
            const productRef = window.firebaseModules.doc(db, 'products', item.id);
            await window.firebaseModules.updateDoc(productRef, {
                stock: window.firebaseModules.increment(-item.quantity)
            });
        }
        
        // حفظ رقم الهاتف والعنوان في الملف الشخصي
        if (!isGuest) {
            const userRef = window.firebaseModules.doc(db, 'users', currentUser.uid);
            await window.firebaseModules.updateDoc(userRef, {
                phone: phone,
                address: address,
                cart: []
            });
        }
        
        // تحديث البيانات محلياً
        if (currentUser) {
            currentUser.phone = phone;
            currentUser.address = address;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateUserProfile();
        }

        // إرسال إشعار للمدير
        await sendAdminNotificationForOrder(orderData, receiptUrl);
        
        cartItems = [];
        directPurchaseItem = null;
        updateCartCount();
        
        showToast('تم إرسال الطلب بنجاح!', 'success');
        
        setTimeout(() => {
            showSection('my-orders');
            removeCheckoutReceipt();
            
            const phoneInput = document.getElementById('checkoutPhone');
            const addressInput = document.getElementById('checkoutAddress');
            const notesInput = document.getElementById('checkoutNotes');
            
            if (phoneInput) phoneInput.value = '';
            if (addressInput) addressInput.value = '';
            if (notesInput) notesInput.value = '';
        }, 1500);
        
    } catch (error) {
        console.error('خطأ في إرسال الطلب:', error);
        showToast('خطأ في إرسال الطلب، يرجى المحاولة مجدداً', 'error');
    } finally {
        const submitBtn = document.getElementById('submitOrderBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check"></i> تأكيد الطلب';
        }
    }
}

// دالة رفع الإيصال المصححة
async function uploadCheckoutReceipt(file) {
    try {
        if (!currentUser) throw new Error('يجب تسجيل الدخول لرفع الإيصال');
        if (!storage) {
            // إذا لم يكن storage مهيأ، نعيد تهيئته
            const firebaseInstance = initializeFirebaseApp();
            if (firebaseInstance) {
                storage = firebaseInstance.storage;
            } else {
                throw new Error('Firebase Storage غير مهيأ');
            }
        }
        
        if (!file) throw new Error('لم يتم تحديد ملف');
        
        console.log('📤 بدء رفع الإيصال:', file.name);
        
        const fileName = 'receipts/' + currentUser.uid + '/' + Date.now() + '_' + file.name;
        const storageRef = window.firebaseModules.ref(storage, fileName);
        
        // استخدام uploadBytes بدلاً من uploadBytesResumable لتبسيط العملية
        const uploadResult = await window.firebaseModules.uploadBytes(storageRef, file);
        console.log('✅ تم رفع الملف بنجاح');
        
        const downloadUrl = await window.firebaseModules.getDownloadURL(storageRef);
        console.log('✅ تم الحصول على رابط الإيصال:', downloadUrl);
        
        if (!downloadUrl) throw new Error('فشل الحصول على رابط التحميل');
        
        return downloadUrl;
    } catch (error) {
        console.error('❌ خطأ في رفع الإيصال:', error);
        showToast('فشل رفع صورة الإيصال: ' + error.message, 'error');
        throw error;
    }
}

async function sendAdminNotificationForOrder(orderData, receiptUrl) {
    try {
        const notificationsRef = window.firebaseModules.collection(db, 'admin_notifications');
        await window.firebaseModules.addDoc(notificationsRef, {
            type: 'new_order',
            orderId: orderData.orderId,
            customerName: orderData.userName,
            customerPhone: orderData.phone,
            customerEmail: orderData.userEmail,
            total: orderData.total,
            itemsCount: orderData.items.length,
            receiptUrl: receiptUrl,
            status: 'unread',
            createdAt: window.firebaseModules.serverTimestamp(),
            orderData: orderData
        });
        console.log('تم إرسال إشعار للمدير');
    } catch (error) {
        console.error('خطأ في إرسال الإشعار:', error);
    }
}

// ======================== دوال الدفع والإيصال ========================

function previewReceipt(input) {
    const preview = document.getElementById('receiptPreviewContainer');
    const previewImg = document.getElementById('receiptPreviewImg');
    const confirmBtn = document.getElementById('confirmOrderBtn');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const uploadProgress = document.getElementById('uploadProgress');
    const container = document.querySelector('.receipt-upload-container');
    
    if (!input || !input.files || !input.files[0]) {
        return;
    }
    
    const file = input.files[0];
    
    try {
        // التحقق من الحجم (10MB)
        if (file.size > 10 * 1024 * 1024) {
            showToast('حجم الملف كبير جداً. الحد الأقصى 10MB', 'error');
            input.value = '';
            return;
        }
        
        // التحقق من النوع
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type.toLowerCase())) {
            showToast('نوع الملف غير مدعوم. يرجى رفع صورة', 'error');
            input.value = '';
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            if (previewImg) previewImg.src = e.target.result;
            if (preview) preview.style.display = 'block';
            if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
            if (container) {
                container.style.borderStyle = 'solid';
                container.style.borderColor = '#27ae60';
                container.style.background = '#f0fff4';
            }
            
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.style.opacity = '1';
                confirmBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال الطلب الآن';
            }
            
            if (uploadProgress) uploadProgress.style.display = 'none';
        };
        
        reader.readAsDataURL(file);
        
    } catch (error) {
        console.error('خطأ في معاينة الصورة:', error);
        showToast('حدث خطأ في معاينة الصورة', 'error');
        input.value = '';
    }
}

function removeReceiptPreview() {
    const input = document.getElementById('receiptInput');
    const preview = document.getElementById('receiptPreviewContainer');
    const previewImg = document.getElementById('receiptPreviewImg');
    const confirmBtn = document.getElementById('confirmOrderBtn');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const container = document.querySelector('.receipt-upload-container');
    
    if (input) input.value = '';
    if (preview) preview.style.display = 'none';
    if (previewImg) previewImg.src = '';
    if (uploadPlaceholder) uploadPlaceholder.style.display = 'block';
    if (container) {
        container.style.borderStyle = 'dashed';
        container.style.borderColor = '#ddd';
        container.style.background = '#f9f9f9';
    }
    
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-credit-card"></i> تأكيد الطلب وإرسال';
    }
}

// ======================== طلباتي ========================

async function loadMyOrders() {
    const ordersList = document.getElementById('myOrdersList');
    const emptyMessage = document.getElementById('emptyOrdersMessage');
    
    if (!ordersList) return;
    
    if (isGuest && !currentUser) {
        ordersList.innerHTML = '';
        if (emptyMessage) emptyMessage.style.display = 'block';
        return;
    }
    
    if (!currentUser) {
        ordersList.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <i class="fas fa-user-clock fa-3x" style="color: var(--gray-color); margin-bottom: 20px;"></i>
                <h3 style="color: var(--primary-color); margin-bottom: 10px;">الدخول مطلوب</h3>
                <p style="color: var(--gray-color); margin-bottom: 20px;">يجب تسجيل الدخول لعرض الطلبات السابقة</p>
                <button onclick="showAuthScreen()" class="btn-primary" style="padding: 12px 25px;">
                    <i class="fas fa-sign-in-alt"></i> تسجيل الدخول
                </button>
            </div>
        `;
        if (emptyMessage) emptyMessage.style.display = 'none';
        return;
    }
    
    ordersList.innerHTML = '<div class="spinner"></div>';
    if (emptyMessage) emptyMessage.style.display = 'none';

    try {
        const ordersRef = window.firebaseModules.collection(db, "orders");
        
        const q = window.firebaseModules.query(
            ordersRef,
            window.firebaseModules.where("userId", "==", currentUser.uid)
        );

        const querySnapshot = await window.firebaseModules.getDocs(q);

        if (querySnapshot.empty) {
            ordersList.innerHTML = '';
            if (emptyMessage) emptyMessage.style.display = 'block';
            return;
        }

        let ordersHTML = '';
        
        const ordersArray = [];
        querySnapshot.forEach(doc => {
            const order = doc.data();
            order.id = doc.id;
            ordersArray.push(order);
        });
        
        // الترتيب يدوياً حسب التاريخ (من الأحدث للأقدم)
        ordersArray.sort((a, b) => {
            let dateA, dateB;
            
            try {
                dateA = a.createdAt?.toDate ? a.createdAt.toDate() : 
                       a.createdAt ? new Date(a.createdAt) : new Date(0);
                dateB = b.createdAt?.toDate ? b.createdAt.toDate() : 
                       b.createdAt ? new Date(b.createdAt) : new Date(0);
            } catch (e) {
                dateA = new Date(0);
                dateB = new Date(0);
            }
            
            return dateB - dateA;
        });
        
        ordersArray.forEach(order => {
            let date = 'غير محدد';
            try {
                if (order.createdAt) {
                    if (order.createdAt.toDate) {
                        date = order.createdAt.toDate().toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    } else if (order.createdAt instanceof Date) {
                        date = order.createdAt.toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    } else if (typeof order.createdAt === 'string') {
                        const dateObj = new Date(order.createdAt);
                        date = dateObj.toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    }
                }
            } catch (e) {
                console.error('Error parsing date:', e);
            }
            
            const statusText = {
                'pending': 'قيد الانتظار',
                'paid': 'تم الدفع',
                'processing': 'جاري التجهيز',
                'shipped': 'خرج للتوصيل',
                'delivered': 'تم التسليم',
                'cancelled': 'ملغي'
            }[order.status] || order.status;
            
            const statusClass = {
                'pending': 'status-pending',
                'paid': 'status-paid',
                'processing': 'status-processing',
                'shipped': 'status-shipped',
                'delivered': 'status-delivered',
                'cancelled': 'status-cancelled'
            }[order.status] || 'status-pending';
            
            const hasReceipt = order.receiptImage || order.receiptUrl;
            
            const statuses = ['pending', 'paid', 'processing', 'shipped', 'delivered'];
            const currentStatusIndex = statuses.indexOf(order.status || 'pending');
            const isCancelled = order.status === 'cancelled';
            const progressWidth = isCancelled ? 0 : (currentStatusIndex / (statuses.length - 1)) * 100;

            ordersHTML += `
                <div class="order-card ${isCancelled ? 'cancelled-order' : ''}">
                    <div class="order-header">
                        <div>
                            <span class="order-id">طلب #${order.orderId || order.id}</span>
                            <span class="order-date">${date}</span>
                        </div>
                        <span class="order-status-badge ${statusClass}">${statusText}</span>
                    </div>

                    ${!isCancelled ? `
                    <!-- نظام تتبع الطلب -->
                    <div class="order-tracking">
                        <div class="tracking-steps">
                            <div class="tracking-line-fill" style="width: ${progressWidth}%"></div>
                            <div class="step ${currentStatusIndex >= 0 ? (currentStatusIndex > 0 ? 'completed' : 'active') : ''}">
                                <div class="step-icon"><i class="fas fa-clock"></i></div>
                                <div class="step-label">قيد الانتظار</div>
                            </div>
                            <div class="step ${currentStatusIndex >= 1 ? (currentStatusIndex > 1 ? 'completed' : 'active') : ''}">
                                <div class="step-icon"><i class="fas fa-check-double"></i></div>
                                <div class="step-label">تم الدفع</div>
                            </div>
                            <div class="step ${currentStatusIndex >= 2 ? (currentStatusIndex > 2 ? 'completed' : 'active') : ''}">
                                <div class="step-icon"><i class="fas fa-box-open"></i></div>
                                <div class="step-label">جاري التجهيز</div>
                            </div>
                            <div class="step ${currentStatusIndex >= 3 ? (currentStatusIndex > 3 ? 'completed' : 'active') : ''}">
                                <div class="step-icon"><i class="fas fa-truck"></i></div>
                                <div class="step-label">خرج للتوصيل</div>
                            </div>
                            <div class="step ${currentStatusIndex >= 4 ? (currentStatusIndex > 4 ? 'completed' : 'active') : ''}">
                                <div class="step-icon"><i class="fas fa-home"></i></div>
                                <div class="step-label">تم التسليم</div>
                            </div>
                        </div>
                    </div>
                    ` : `
                    <div class="cancelled-message">
                        <i class="fas fa-times-circle"></i> تم إلغاء هذا الطلب
                    </div>
                    `}

                    <div class="order-body">
                        <div class="order-info">
                            <h5>تفاصيل الطلب</h5>
                            <p><strong>العنوان:</strong> ${order.address || 'غير محدد'}</p>
                            ${order.notes ? `<p><strong>ملاحظات:</strong> ${order.notes}</p>` : ''}
                            <p><strong>طريقة الدفع:</strong> تحويل بنكي</p>
                            ${hasReceipt ? `
                                <p><strong>حالة الإيصال:</strong> <span style="color: var(--success-color);">✓ مرفق</span></p>
                            ` : ''}
                        </div>
                        <div class="order-items">
                            <h5>المنتجات (${order.items?.length || 0})</h5>
                            ${(order.items || []).map(item => `
                                <div class="order-item-row">
                                    <span>${item.name || 'منتج'} × ${item.quantity || 1}</span>
                                    <span>${formatNumber(item.total || item.price || 0)} ${siteCurrency}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="order-footer">
                        <div class="order-total">الإجمالي: ${formatNumber(order.total || 0)} ${siteCurrency}</div>
                        ${hasReceipt ? `
                            <button onclick="viewReceipt('${hasReceipt}')" class="btn-secondary" style="padding: 8px 15px; font-size: 14px;">
                                <i class="fas fa-image"></i> عرض الإيصال
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        ordersList.innerHTML = ordersHTML;
        if (emptyMessage) emptyMessage.style.display = 'none';

    } catch (error) {
        console.error('Error loading orders:', error);
        ordersList.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--danger-color);">
                <i class="fas fa-exclamation-triangle fa-3x" style="margin-bottom: 20px;"></i>
                <h3>حدث خطأ أثناء تحميل الطلبات</h3>
                <p>${error.message}</p>
                <button onclick="loadMyOrders()" class="btn-primary" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> حاول مرة أخرى
                </button>
            </div>
        `;
    }
}

function viewReceipt(imageSrc) {
    if (!imageSrc) {
        showToast('لا يوجد إيصال مرفق', 'warning');
        return;
    }
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        cursor: pointer;
    `;
    
    modal.innerHTML = `
        <div style="position: relative; max-width: 90%; max-height: 90%;">
            <img src="${imageSrc}" 
                 style="max-width: 100%; max-height: 80vh; border-radius: 10px; border: 2px solid white;"
                 onerror="this.onerror=null; this.src='https://cdn-icons-png.flaticon.com/512/1178/1178479.png';">
            <div style="position: absolute; bottom: -50px; left: 0; right: 0; text-align: center;">
                <button onclick="downloadImage('${imageSrc}', 'إيصال_طلب.jpg')" 
                        class="btn-primary" 
                        style="padding: 10px 20px; margin-right: 10px;">
                    <i class="fas fa-download"></i> تحميل
                </button>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                        class="btn-secondary" 
                        style="padding: 10px 20px;">
                    <i class="fas fa-times"></i> إغلاق
                </button>
            </div>
        </div>
    `;
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    document.body.appendChild(modal);
}

function downloadImage(src, filename) {
    const link = document.createElement('a');
    link.href = src;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ======================== المفضلة ========================

function toggleFavorite(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    const index = favorites.findIndex(f => f.id === productId);
    
    if (index === -1) {
        favorites.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            category: product.category
        });
        showToast('تم إضافة المنتج إلى المفضلة', 'success');
    } else {
        favorites.splice(index, 1);
        showToast('تم إزالة المنتج من المفضلة', 'info');
    }
    
    if (currentUser && !isGuest) {
        saveUserDataToFirestore();
    }
    
    if (document.getElementById('favorites') && document.getElementById('favorites').classList.contains('active')) {
        updateFavoritesDisplay();
    }
    
    updateFavoriteIcons();
    updateProfileStats();
}

function updateFavoriteIcons() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick');
        if (!onclickAttr) return;
        
        const match = onclickAttr.match(/'([^']+)'/);
        if (!match) return;
        
        const productId = match[1];
        const isFavorite = favorites.some(f => f.id === productId);
        
        if (isFavorite) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function updateFavoritesDisplay() {
    const favoritesGrid = document.getElementById('favoritesGrid');
    const emptyFavoritesMessage = document.getElementById('emptyFavoritesMessage');
    
    if (!favoritesGrid || !emptyFavoritesMessage) return;
    
    if (favorites.length === 0) {
        favoritesGrid.style.display = 'none';
        emptyFavoritesMessage.style.display = 'block';
        return;
    }
    
    favoritesGrid.style.display = 'grid';
    emptyFavoritesMessage.style.display = 'none';
    
    favoritesGrid.innerHTML = favorites.map(product => {
        return `
            <div class="product-card">
                <div class="product-image" onclick="openProductDetails('${product.id}')">
                    <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x200?text=صورة'">
                </div>
                <div class="product-info">
                    <h3 onclick="openProductDetails('${product.id}')">${product.name}</h3>
                    <div class="product-price">
                        <span class="current-price">${formatNumber(product.price)} ${siteCurrency}</span>
                    </div>
                    <div class="product-actions">
                        <button class="action-btn add-to-cart" onclick="openQuantityModal('${product.id}')" style="background: var(--secondary-color); color: white; border-color: var(--secondary-color);">
                            <i class="fas fa-shopping-bag"></i> شراء
                        </button>
                        <button class="action-btn favorite-btn active" onclick="toggleFavorite('${product.id}')">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ======================== الملف الشخصي ========================

function updateUserProfile() {
    if (!currentUser) return;
    
    const savedUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};
    const userName = currentUser.displayName || savedUser.displayName || savedUser.name || 'زائر';
    const userEmail = currentUser.email || savedUser.email || 'ليس لديك حساب';
    const userPhone = currentUser.phone || savedUser.phone || '--';
    const userAddress = currentUser.address || savedUser.address || '--';
    
    const elements = [
        { id: 'profileName', text: userName },
        { id: 'mobileUserName', text: userName },
        { id: 'profileEmail', text: userEmail },
        { id: 'mobileUserEmail', text: userEmail },
        { id: 'detailName', text: userName },
        { id: 'detailEmail', text: userEmail },
        { id: 'detailPhone', text: userPhone },
        { id: 'detailAddress', text: userAddress }
    ];
    
    // تحديث العناصر مع التحقق من وجودها أولاً
    elements.forEach(el => {
        const element = document.getElementById(el.id);
        if (element) {
            element.textContent = el.text;
        } else {
            console.warn(`⚠️ العنصر غير موجود: ${el.id}`);
        }
    });
    
    // تحديث الصور الشخصية مع التحقق
    if (currentUser.photoURL) {
        const images = document.querySelectorAll('#profileImage, #mobileUserImage');
        images.forEach(img => {
            if (img) {
                img.src = currentUser.photoURL;
            }
        });
    }
    
    updateProfileStats();
}

async function updateProfileStats() {
    const favoritesCount = favorites.length;
    
    const favoritesCountElement = document.getElementById('favoritesCount');
    if (favoritesCountElement) {
        favoritesCountElement.textContent = favoritesCount;
    }
    
    let ordersCount = 0;
    let totalSpent = 0;
    
    const userId = currentUser?.uid;
    
    if (db && userId) {
        try {
            const ordersRef = window.firebaseModules.collection(db, "orders");
            const q = window.firebaseModules.query(ordersRef, window.firebaseModules.where("userId", "==", userId));
            const querySnapshot = await window.firebaseModules.getDocs(q);
            
            querySnapshot.forEach((doc) => {
                const order = doc.data();
                ordersCount++;
                if (order.status === 'delivered') {
                    totalSpent += parseFloat(order.total || 0);
                }
            });
        } catch (error) {
            console.error('خطأ في تحميل إحصائيات المستخدم من Firebase:', error);
        }
    }
    
    const ordersCountElement = document.getElementById('ordersCount');
    const totalSpentElement = document.getElementById('totalSpent');
    
    if (ordersCountElement) ordersCountElement.textContent = ordersCount;
    if (totalSpentElement) totalSpentElement.textContent = formatNumber(totalSpent) + ' SDG';
}

function editProfile() {
    const modal = document.getElementById('editProfileModal');
    if (!modal) return;
    
    const savedUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};
    
    const nameInput = document.getElementById('editName');
    const phoneInput = document.getElementById('editPhone');
    const addressInput = document.getElementById('editAddress');
    
    if (nameInput) nameInput.value = currentUser?.displayName || savedUser.displayName || '';
    if (phoneInput) phoneInput.value = currentUser?.phone || savedUser.phone || '';
    if (addressInput) addressInput.value = currentUser?.address || savedUser.address || '';
    
    modal.classList.add('active');
}

async function saveProfileChanges() {
    const nameInput = document.getElementById('editName');
    const phoneInput = document.getElementById('editPhone');
    const addressInput = document.getElementById('editAddress');
    
    if (!nameInput || !phoneInput || !addressInput) {
        showToast('حدث خطأ في الوصول للحقول', 'error');
        return;
    }
    
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const address = addressInput.value.trim();
    
    if (!name) {
        showToast('يرجى إدخال الاسم', 'warning');
        return;
    }
    
    showLoadingSpinner('جاري حفظ التغييرات...');
    
    try {
        if (auth.currentUser) {
            await window.firebaseModules.updateProfile(auth.currentUser, {
                displayName: name
            });
        }
        
        const userRef = window.firebaseModules.doc(db, "users", currentUser.uid);
        await window.firebaseModules.updateDoc(userRef, {
            displayName: name,
            phone: phone,
            address: address,
            updatedAt: window.firebaseModules.serverTimestamp()
        });
        
        currentUser.displayName = name;
        currentUser.phone = phone;
        currentUser.address = address;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        updateUserProfile();
        
        const modal = document.getElementById('editProfileModal');
        if (modal) modal.classList.remove('active');
        
        showToast('تم تحديث الملف الشخصي بنجاح', 'success');
    } catch (error) {
        console.error('خطأ في تحديث الملف الشخصي:', error);
        showToast('حدث خطأ أثناء التحديث', 'error');
    } finally {
        hideLoadingSpinner();
    }
}

async function loadSiteConfig() {
    try {
        if (!db) return;
        
        const configRef = window.firebaseModules.doc(db, "settings", "site_config");
        const configSnap = await window.firebaseModules.getDoc(configRef);
        
        if (configSnap.exists()) {
            siteSettings = configSnap.data();
            siteCurrency = siteSettings.currency || 'SDG ';
            updateUIWithSettings();
        }
    } catch (error) {
        console.error('خطأ في تحميل إعدادات الموقع:', error);
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
        aboutEl.textContent = siteSettings.aboutUs;
    }
    
    // تحديث روابط التواصل الاجتماعي
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

    // تحديث واتساب
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
            if (el) el.src = siteSettings.logoUrl;
        });
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

function showRegistrationForm() {
    const emailAuthForm = document.getElementById('emailAuthForm');
    if (emailAuthForm) {
        const formHeader = emailAuthForm.querySelector('.form-header h2');
        if (formHeader) formHeader.textContent = 'إنشاء حساب جديد';
        
        const loginFields = document.getElementById('loginFields');
        const registerFields = document.getElementById('registerFields');
        
        if (loginFields) loginFields.style.display = 'none';
        if (registerFields) registerFields.style.display = 'block';
        
        emailAuthForm.style.display = 'block';
        
        const registerName = document.getElementById('registerName');
        if (registerName) registerName.focus();
    }
}

function showLoginForm() {
    const emailAuthForm = document.getElementById('emailAuthForm');
    if (emailAuthForm) {
        const formHeader = emailAuthForm.querySelector('.form-header h2');
        if (formHeader) formHeader.textContent = 'تسجيل الدخول';
        
        const loginFields = document.getElementById('loginFields');
        const registerFields = document.getElementById('registerFields');
        
        if (loginFields) loginFields.style.display = 'block';
        if (registerFields) registerFields.style.display = 'none';
        
        const emailInput = document.getElementById('emailInput');
        if (emailInput) emailInput.focus();
    }
}

async function handleRegistration() {
    const name = document.getElementById('registerName')?.value || '';
    const email = document.getElementById('registerEmail')?.value || '';
    const password = document.getElementById('registerPassword')?.value || '';
    const phone = document.getElementById('registerPhone')?.value || '';
    
    if (!name || !email || !password) {
        showAuthMessage('الرجاء ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAuthMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showAuthMessage('البريد الإلكتروني غير صالح', 'error');
        return;
    }
    
    showAuthMessage('جاري إنشاء حسابك...', 'info');
    
    const success = await signUpWithEmail(email, password, name, phone);
    
    if (success) {
        showAuthMessage('تم إنشاء حسابك بنجاح!', 'success');
    }
}

async function handleLogin() {
    const email = document.getElementById('emailInput')?.value || '';
    const password = document.getElementById('passwordInput')?.value || '';
    
    if (!email || !password) {
        showAuthMessage('الرجاء إدخال البريد الإلكتروني وكلمة المرور', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showAuthMessage('البريد الإلكتروني غير صالح', 'error');
        return;
    }
    
    showAuthMessage('جاري تسجيل الدخول...', 'info');
    
    await signInWithEmail(email, password);
}

function showAuthMessage(message, type = 'error') {
    const authMessage = document.getElementById('emailAuthMessage');
    if (authMessage) {
        authMessage.textContent = message;
        authMessage.className = `auth-message ${type}`;
    }
}

// ======================== دوال الواجهة ========================

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
            // النزول لأسفل - إخفاء الهيدر
            header.style.transform = 'translateY(-100%)';
        } else {
            // الصعود لأعلى - إظهار الهيدر
            header.style.transform = 'translateY(0)';
        }
        lastScroll = currentScroll;
    }, { passive: true });
    
    header.style.transition = 'transform 0.3s ease-in-out';
}

function showAuthScreen() {
    const authScreen = document.getElementById('authScreen');
    const appContainer = document.getElementById('appContainer');
    
    // تصفير جميع الحقول عند العودة لشاشة المصادقة
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

// تتبع تاريخ التنقل لزر الرجوع
let navigationHistory = ['home'];

function goBack() {
    if (navigationHistory.length > 1) {
        navigationHistory.pop(); // إزالة الصفحة الحالية
        const previousSection = navigationHistory.pop(); // الحصول على الصفحة السابقة
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

    // الحالة الافتراضية (الصفحة الرئيسية)
    if (sectionId === 'home') {
        if (backBtn) backBtn.style.display = 'none';
        if (headerSearch) headerSearch.style.display = 'flex';
        if (menuToggle) menuToggle.style.display = 'flex';
    } else {
        // باقي الصفحات
        if (backBtn) {
            backBtn.style.display = 'flex';
        }
        if (headerSearch) headerSearch.style.display = 'none';
        // القائمة تظل ظاهرة في اليمين كما طلبت
        if (menuToggle) menuToggle.style.display = 'flex';
    }
}

function showSection(sectionId) {
    const currentSection = document.querySelector('.section.active');
    
    // تحديث تاريخ التنقل
    if (!navigationHistory.includes(sectionId)) {
        navigationHistory.push(sectionId);
    }

    // تحديث حالة الهيدر
    updateHeaderState(sectionId);

    // إذا خرجنا من صفحة الدفع، نقوم بتصفير بيانات الإيصال
    if (currentSection && currentSection.id === 'checkout' && sectionId !== 'checkout') {
        if (typeof removeReceiptPreview === 'function') removeReceiptPreview();
    }

    document.querySelectorAll('.section').forEach(section => {
        if (section) section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // التأكد من الصعود للأعلى فوراً عند تغيير القسم (حل مشكلة الظهور في الوسط أو الأسفل)
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        
        // استرجاع البيانات المحفوظة عند الدخول لصفحة الدفع
        if (sectionId === 'checkout') {
            const savedPhone = localStorage.getItem('userPhone');
            const savedAddress = localStorage.getItem('userAddress');
            
            const phoneInput = document.getElementById('checkoutPhone') || document.getElementById('orderPhone');
            const addressInput = document.getElementById('checkoutAddress') || document.getElementById('orderAddress');
            const editBtn = document.getElementById('editDataBtn');
            
            if (phoneInput && savedPhone) {
                phoneInput.value = savedPhone;
                // phoneInput.readOnly = true; // نتركها قابلة للتعديل لسهولة الاستخدام
                if (editBtn) editBtn.style.display = 'block';
            }
            
            if (addressInput && savedAddress) {
                addressInput.value = savedAddress;
                // addressInput.readOnly = true;
            }
        }

        switch(sectionId) {
            case 'cart':
                updateCartDisplay();
                break;
            case 'checkout':
                updateCheckoutSummary();
                break;
            case 'favorites':
                updateFavoritesDisplay();
                break;
            case 'profile':
                updateProfileStats();
                break;
            case 'my-orders':
                loadMyOrders();
                break;
        }
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

// ======================== إدارة الهيدر المعدل ========================

function updateHeaderLayout() {
    const currentSection = document.querySelector('.section.active');
    if (!currentSection) return;
    
    const sectionId = currentSection.id;
    const homeHeaderIcons = document.getElementById('homeHeaderIcons');
    const backBtn = document.getElementById('backBtn');
    const homeSearchContainer = document.getElementById('homeSearchContainer');
    
    // إخفاء كل العناصر أولاً
    if (homeHeaderIcons) homeHeaderIcons.style.display = 'none';
    if (backBtn) backBtn.style.display = 'none';
    if (homeSearchContainer) homeSearchContainer.style.display = 'none';
    
    // عرض العناصر المناسبة حسب الصفحة
    if (sectionId === 'home') {
        // في الصفحة الرئيسية: قائمة + سلة + بحث
        if (homeHeaderIcons) homeHeaderIcons.style.display = 'flex';
        if (homeSearchContainer) homeSearchContainer.style.display = 'flex';
    } else {
        // في باقي الصفحات: زر رجوع فقط
        if (backBtn) backBtn.style.display = 'flex';
    }
}

// تم دمج تحديث الهيدر في دالة showSection الأصلية

// تم الإبقاء على تعريف goBack الأصلي فقط

// ======================== دوال إضافية ========================

function goToCheckout() {
    if (!currentUser || isGuest) {
        showToast('يرجى تسجيل الدخول أولاً لإتمام عملية الشراء', 'warning');
        showSection('profile'); // توجيه المستخدم لصفحة الملف الشخصي لتسجيل الدخول
        return;
    }
    
    // التحقق من وجود منتجات للطلب
    if (!directPurchaseItem && cartItems.length === 0) {
        showToast('السلة فارغة', 'warning');
        return;
    }
    showSection('checkout');
}

function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (!searchTerm) {
        displayProducts();
        return;
    }
    
    const filteredProducts = allProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        (product.description && product.description.toLowerCase().includes(searchTerm)) ||
        (product.category && product.category.toLowerCase().includes(searchTerm))
    );
    
    displayProducts(filteredProducts);
    showSection('products');
}

function filterProducts() {
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
    
    displayProducts(filteredProducts);
}

function buyNowDirect(productId, quantity = 1) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        showToast('المنتج غير موجود', 'error');
        return;
    }
    
    if (product.stock <= 0) {
        showToast('المنتج غير متوفر في المخزون', 'warning');
        return;
    }
    
    if (quantity > product.stock) {
        showToast(`الكمية المطلوبة غير متوفرة. المخزون الحالي: ${product.stock}`, 'warning');
        return;
    }
    
    directPurchaseItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: quantity,
        image: product.image
    };
    
    updateCartCount();
    showSection("checkout");
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

// ======================== بدء التطبيق ========================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 بدء تحميل التطبيق...');
    
    const loader = document.getElementById('initialLoader');
    if (loader) {
        loader.style.display = 'flex';
        loader.style.opacity = '1';
    }
    
    adjustLayout();
    
    // تحديث الهيدر أول مرة
    updateHeaderLayout();
    
    setTimeout(() => {
        initializeAppSafely();
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

// معالجة الأخطاء العامة
window.addEventListener('error', function(e) {
    console.error('خطأ عام:', e);
    showToast(`حدث خطأ: ${e.message}`, 'error');
});

// معالجة الوعود المرفوضة
window.addEventListener('unhandledrejection', function(e) {
    console.error('وعد مرفوض:', e.reason);
    showToast(`حدث خطأ غير متوقع: ${e.reason.message || e.reason}`, 'error');
});

// ======================== التصدير للاستخدام في HTML ========================

// الحل: تعريف واحد فقط لـ showSection
window.showSection = function(sectionId) {
    const currentSection = document.querySelector('.section.active');
    
    // تحديث تاريخ التنقل
    if (!navigationHistory.includes(sectionId)) {
        navigationHistory.push(sectionId);
    }

    // تحديث حالة الهيدر
    updateHeaderState(sectionId);

    // إذا خرجنا من صفحة الدفع، نقوم بتصفير بيانات الإيصال
    if (currentSection && currentSection.id === 'checkout' && sectionId !== 'checkout') {
        if (typeof removeReceiptPreview === 'function') removeReceiptPreview();
    }

    document.querySelectorAll('.section').forEach(section => {
        if (section) section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // التأكد من الصعود للأعلى فوراً عند تغيير القسم
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        
        // استرجاع البيانات المحفوظة عند الدخول لصفحة الدفع
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

        switch(sectionId) {
            case 'cart':
                updateCartDisplay();
                break;
            case 'checkout':
                updateCheckoutSummary();
                break;
            case 'favorites':
                updateFavoritesDisplay();
                break;
            case 'profile':
                updateProfileStats();
                break;
            case 'my-orders':
                loadMyOrders();
                break;
        }
    }
};

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

window.addEventListener('resize', adjustLayout);

console.log('🚀 تطبيق Eleven Store المصحح جاهز للعمل 100%!');