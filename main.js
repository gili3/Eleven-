// main.js - النسخة الكاملة المحسنة مع تنبيهات الطلبات
// جميع الدوال من utils.js و firebase-config.js مدمجة هنا

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
    return /^[0-9+\-\s()]{7,}$/.test(phone);
}

// دوال FIREBASE-CONFIG المدمجة
const firebaseConfig = {
    apiKey: "AIzaSyB1vNmCapPK0MI4H_Q0ilO7OnOgZa02jx0",
    authDomain: "queen-beauty-b811b.firebaseapp.com",
    projectId: "queen-beauty-b811b",
    storageBucket: "queen-beauty-b811b.firebasestorage.app",
    messagingSenderId: "418964206430",
    appId: "1:418964206430:web:8c9451fc56ca7f956bd5cf"
};

let firebaseApp = null, firebaseAuth = null, firebaseDb = null, firebaseStorage = null;

function initializeFirebaseApp(appName = 'DefaultApp') {
    if (firebaseApp && appName === 'DefaultApp') {
        return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb, storage: firebaseStorage };
    }

    try {
        if (!window.firebaseModules) throw new Error('Firebase SDK لم يتم تحميله');
        const app = window.firebaseModules.initializeApp(firebaseConfig, appName);
        const auth = window.firebaseModules.getAuth(app);
        const db = window.firebaseModules.getFirestore(app);
        const storage = window.firebaseModules.getStorage(app);

        if (appName === 'DefaultApp') {
            firebaseApp = app; firebaseAuth = auth; firebaseDb = db; firebaseStorage = storage;
        }

        console.log(`✅ Firebase مهيأ (${appName})`);
        return { app, auth, db, storage };
    } catch (error) {
        console.error('❌ خطأ في تهيئة Firebase:', error);
        throw error;
    }
}

function getFirebaseInstance() {
    if (!firebaseApp) throw new Error('Firebase لم يتم تهيئته بعد');
    return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb, storage: firebaseStorage };
}

async function checkFirebaseConnection() {
    try {
        if (!firebaseDb) throw new Error('قاعدة البيانات غير مهيأة');
        const settingsRef = window.firebaseModules.collection(firebaseDb, "settings");
        await window.firebaseModules.getDocs(settingsRef);
        console.log('✅ اتصال Firebase ناجح');
        return true;
    } catch (error) {
        console.error('❌ فشل الاتصال:', error);
        return false;
    }
}

// تصدير الدوال للنظام
window.firebaseConfig = firebaseConfig;
window.initializeFirebaseApp = initializeFirebaseApp;
window.getFirebaseInstance = getFirebaseInstance;
window.checkFirebaseConnection = checkFirebaseConnection;
window.formatNumber = formatNumber;
window.showToast = showToast;
window.showLoadingSpinner = showLoadingSpinner;
window.hideLoadingSpinner = hideLoadingSpinner;
window.isValidEmail = isValidEmail;
window.isValidPhone = isValidPhone;

// ======================== بدء التطبيق الرئيسي ========================

let currentUser = null;
let isGuest = false;
let isAdmin = false;
let isLoading = false;
let appInitialized = false;
let cartItems = JSON.parse(localStorage.getItem('cart')) || [];
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let allProducts = [];
let siteCurrency = 'SDG ';
let siteSettings = {};
let selectedProductForQuantity = null;
let lastScrollTop = 0;
let app, auth, db;

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
                        <button onclick="window.location.reload()" style="padding: 10px 20px; background: var(--secondary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-family: 'Cairo';">
                            <i class="fas fa-redo"></i> تحديث الصفحة
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
    if (app && auth && db) {
        console.log('⚠️ Firebase مهيأ بالفعل');
        return { app, auth, db, storage: firebaseStorage };
    }
    
    try {
        console.log('🔄 جاري تهيئة Firebase...');
        app = window.firebaseModules.initializeApp(firebaseConfig, 'MainApp');
        auth = window.firebaseModules.getAuth(app);
        db = window.firebaseModules.getFirestore(app);
        firebaseStorage = window.firebaseModules.getStorage(app);
        
        console.log('✅ Firebase مهيأ بنجاح');
        return { app, auth, db, storage: firebaseStorage };
    } catch (error) {
        console.error('❌ خطأ في تهيئة Firebase:', error);
        
        // محاولة الحصول على التطبيق الحالي
        try {
            app = window.firebaseModules.getApp('MainApp');
            auth = window.firebaseModules.getAuth(app);
            db = window.firebaseModules.getFirestore(app);
            console.log('✅ تم استرداد مثيل Firebase الحالي');
            return { app, auth, db, storage: firebaseStorage };
        } catch (e) {
            console.error('❌ فشل استرداد مثيل Firebase');
            return null;
        }
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
            currentUser = user;
            isGuest = false;
            
            await checkAdminPermissions(user.uid);
            
            showMainApp();
            showSection('home');
            updateUserProfile();
            await loadProducts();
            updateCartCount();
            updateAdminButton();
            
            showToast(`مرحباً بعودتك ${user.displayName || 'مستخدم'}!`, 'success');
        } else {
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                try {
                    const userData = JSON.parse(savedUser);
                    if (userData.isGuest) {
                        currentUser = userData;
                        isGuest = true;
                        isAdmin = false;
                        
                        showMainApp();
                        showSection('home');
                        updateUserProfile();
                        await loadProducts();
                        updateCartCount();
                        updateAdminButton();
                        
                        console.log('👤 تم استعادة المستخدم الضيف');
                    } else {
                        showAuthScreen();
                    }
                } catch (e) {
                    console.error('❌ خطأ في قراءة بيانات المستخدم:', e);
                    localStorage.removeItem('currentUser');
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
    
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            const userData = JSON.parse(savedUser);
            if (userData.isGuest) {
                currentUser = userData;
                isGuest = true;
                isAdmin = false;
                
                showMainApp();
                showSection('home');
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
    
    localStorage.removeItem('currentUser');
    
    currentUser = {
        uid: 'guest_' + Date.now(),
        displayName: 'زائر',
        email: null,
        photoURL: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
        isGuest: true
    };
    
    isGuest = true;
    isAdmin = false;
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateAdminButton();
    showMainApp();
    showSection('home');
    updateUserProfile();
    loadProducts();
    updateCartCount();
    
    showToast('مرحباً بك يا زائر! يمكنك التسوق الآن', 'success');
    hideLoader();
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
        
        await checkAndCreateUserInFirestore(currentUser);
        await checkAdminPermissions(currentUser.uid);

        localStorage.setItem('currentUser', JSON.stringify({
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            isGuest: false,
            isAdmin: isAdmin
        }));
        
        showMainApp();
        showSection('home');
        updateUserProfile();
        await loadProducts();
        updateCartCount();
        
        showToast(`مرحباً بك ${currentUser.displayName}!`, 'success');
        
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول بـ Google:', error);
        showToast('حدث خطأ في تسجيل الدخول', 'error');
    }
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function clearRegistrationForm() {
    document.getElementById('registerName').value = '';
    document.getElementById('registerEmail').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('registerPhone').value = '';
    
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
        
        localStorage.setItem('currentUser', JSON.stringify({
            uid: currentUser.uid,
            displayName: name,
            email: email,
            photoURL: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
            isGuest: false,
            isAdmin: false,
            role: 'user'
        }));
        
        showMainApp();
        showSection('home');
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
        
        await checkAndUpdateUserInFirestore(currentUser);
        await checkAdminPermissions(currentUser.uid);
        
        localStorage.setItem('currentUser', JSON.stringify({
            uid: currentUser.uid,
            displayName: currentUser.displayName || currentUser.email.split('@')[0],
            email: currentUser.email,
            photoURL: currentUser.photoURL || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
            isGuest: false,
            isAdmin: isAdmin
        }));
        
        showMainApp();
        showSection('home');
        updateUserProfile();
        await loadProducts();
        updateCartCount();
        updateAdminButton();
        
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
        if (!isGuest && auth) {
            await window.firebaseModules.signOut(auth);
        }
        
        localStorage.removeItem('currentUser');
        currentUser = null;
        isGuest = false;
        isAdmin = false;
        
        if (window.authUnsubscribe) {
            window.authUnsubscribe();
        }
        
        updateAdminButton();
        showAuthScreen();
        
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
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x200?text=صورة'">
                    ${isNew ? '<div class="badge new">جديد</div>' : ''}
                    ${isSale ? '<div class="badge sale">عرض</div>' : ''}
                    ${isBest ? '<div class="badge best">الأفضل</div>' : ''}
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
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
        displayNoProductsMessage();
        return;
    }
    
    featuredGrid.innerHTML = productsToShow.map(product => {
        const isNew = product.isNew === true || product.isNew === 'true';
        const isSale = product.isSale === true || product.isSale === 'true';
        const isBest = product.isBest === true || product.isBest === 'true';
        
        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x200?text=صورة'">
                    ${isNew ? '<div class="badge new">جديد</div>' : ''}
                    ${isSale ? '<div class="badge sale">عرض</div>' : ''}
                    ${isBest ? '<div class="badge best">الأفضل</div>' : ''}
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <div class="product-price">
                        <span class="current-price">${formatNumber(product.price)} ${siteCurrency}</span>
                    </div>
                    <div class="product-actions">
                        <button class="action-btn add-to-cart" onclick="openQuantityModal('${product.id}')">
                            <i class="fas fa-shopping-bag"></i> شراء
                        </button>
                        <button class="action-btn favorite-btn" onclick="toggleFavorite('${product.id}')">
                            <i class="fas fa-heart"></i>
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
        tab.style.background = 'white';
        tab.style.color = 'black';
        tab.style.borderColor = '#ddd';
    });
    
    btn.style.background = 'var(--primary-color)';
    btn.style.color = 'white';
    btn.style.borderColor = 'var(--primary-color)';
    
    let filtered;
    if (filterType === 'all') {
        filtered = allProducts;
    } else {
        filtered = allProducts.filter(p => p[filterType] === true || p[filterType] === 'true');
    }
    
    displayFeaturedProducts(filtered);
}

// ======================== نافذة تحديد الكمية ========================

function openQuantityModal(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        showToast('المنتج غير موجود', 'error');
        return;
    }
    
    selectedProductForQuantity = product;
    
    document.getElementById('quantityProductName').textContent = product.name;
    document.getElementById('selectedQuantity').value = 1;
    
    document.getElementById('productModal').classList.add('active');
}

function closeQuantityModal() {
    document.getElementById('productModal').classList.remove('active');
    selectedProductForQuantity = null;
}

function addToCartFromModal() {
    if (!selectedProductForQuantity) return;
    
    const quantity = parseInt(document.getElementById('selectedQuantity').value) || 1;
    addToCartWithQuantity(selectedProductForQuantity.id, quantity);
    closeQuantityModal();
}

function buyNowFromModal() {
    if (!selectedProductForQuantity) return;
    
    const quantity = parseInt(document.getElementById('selectedQuantity').value) || 1;
    buyNowDirect(selectedProductForQuantity.id, quantity);
    closeQuantityModal();
}

// ======================== إدارة السلة ========================

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
    
    localStorage.setItem('cart', JSON.stringify(cartItems));
    updateCartCount();
    
    const cartSection = document.getElementById('cart');
    if (cartSection && cartSection.classList.contains('active')) {
        updateCartDisplay();
    }
    
    showToast(`تمت إضافة ${quantity} من المنتج إلى السلة`, 'success');
}

function updateCartCount() {
    const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);
    const cartCountElements = document.querySelectorAll('.cart-count');
    
    cartCountElements.forEach(element => {
        element.textContent = totalItems;
    });
}

function updateCartDisplay() {
    const cartItemsElement = document.getElementById('cartItems');
    const emptyCartMessage = document.getElementById('emptyCartMessage');
    const cartSummary = document.querySelector('.cart-summary');
    
    if (!cartItemsElement || !emptyCartMessage) return;
    
    if (cartItems.length === 0) {
        cartItemsElement.style.display = 'none';
        emptyCartMessage.style.display = 'block';
        if (cartSummary) cartSummary.style.display = 'none';
        return;
    }
    
    cartItemsElement.style.display = 'flex';
    cartItemsElement.style.flexDirection = 'column';
    emptyCartMessage.style.display = 'none';
    if (cartSummary) cartSummary.style.display = 'block';
    
    cartItemsElement.innerHTML = cartItems.map(item => {
        const totalPrice = item.price * item.quantity;
        
        return `
            <div class="cart-item">
                <div class="cart-item-image">
                    <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/100x100?text=صورة'">
                </div>
                <div class="cart-item-details">
                    <h3 class="cart-item-title">${item.name}</h3>
                    <p class="cart-item-price">${item.price} ${siteCurrency}</p>
                    <div class="cart-item-controls">
                        <div class="quantity-controls">
                            <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', -1)">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="quantity">${item.quantity}</span>
                            <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', 1)">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <button class="remove-item-btn" onclick="removeFromCart('${item.id}')">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                    <p class="cart-item-total">المجموع: ${totalPrice} ${siteCurrency}</p>
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
    
    if (newQuantity > (product?.stock || item.stock || 99)) {
        showToast('لا توجد كمية كافية في المخزون', 'warning');
        return;
    }
    
    item.quantity = newQuantity;
    localStorage.setItem('cart', JSON.stringify(cartItems));
    updateCartCount();
    updateCartDisplay();
}

function removeFromCart(productId) {
    if (!confirm('هل تريد إزالة هذا المنتج من السلة؟')) return;
    
    cartItems = cartItems.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cartItems));
    updateCartCount();
    updateCartDisplay();
    showToast('تم إزالة المنتج من السلة', 'info');
}

function updateCartSummary() {
    const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shippingCost = siteSettings.shippingCost || 15;
    const freeShippingLimit = siteSettings.freeShippingLimit || 200;
    
    let finalShippingCost = 0;
    if (subtotal > 0 && subtotal < freeShippingLimit) {
        finalShippingCost = shippingCost;
    }
    
    const total = subtotal + finalShippingCost;
    
    const subtotalElement = document.getElementById('cartSubtotal');
    const shippingCostElement = document.getElementById('shippingCost');
    const totalAmountElement = document.getElementById('totalAmount');
    const shippingNoteElement = document.getElementById('shippingNote');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (subtotalElement) subtotalElement.textContent = `${formatNumber(subtotal)} ${siteCurrency}`;
    if (shippingCostElement) shippingCostElement.textContent = `${formatNumber(finalShippingCost)} ${siteCurrency}`;
    if (totalAmountElement) totalAmountElement.textContent = `${formatNumber(total)} ${siteCurrency}`;
    
    if (shippingNoteElement) {
        if (subtotal > 0 && subtotal < freeShippingLimit) {
            const remaining = freeShippingLimit - subtotal;
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
    if (cartItems.length === 0) return;
    
    if (confirm('هل تريد تفريغ السلة بالكامل؟')) {
        cartItems = [];
        localStorage.removeItem('cart');
        updateCartCount();
        updateCartDisplay();
        showToast('تم تفريغ السلة', 'info');
    }
}

// ======================== دالة معاينة الإيصال المعدلة ========================

function previewReceipt(input) {
    const preview = document.getElementById('receiptPreviewContainer');
    const previewImg = document.getElementById('receiptPreviewImg');
    const confirmBtn = document.getElementById('confirmOrderBtn');
    
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // التحقق من حجم الملف (5MB كحد أقصى)
        if (file.size > 5 * 1024 * 1024) {
            showToast('حجم الملف كبير جداً. الحد الأقصى 5MB', 'error');
            input.value = '';
            return;
        }
        
        // التحقق من نوع الملف - دعم جميع أنواع الصور الشائعة
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
        const fileType = file.type.toLowerCase();
        const fileName = file.name.toLowerCase();
        const isImage = validTypes.includes(fileType) || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(fileName);

        if (!isImage) {
            showToast('نوع الملف غير مدعوم. يرجى رفع صورة (JPG, PNG, WebP)', 'error');
            input.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            preview.style.display = 'block';
            document.querySelector('.upload-label').style.display = 'none';
            if (confirmBtn) confirmBtn.disabled = false;
        };
        reader.onerror = function() {
            showToast('خطأ في قراءة الملف', 'error');
            input.value = '';
        };
        reader.readAsDataURL(file);
    }
}

// ======================== دالة إزالة معاينة الإيصال المعدلة ========================

function removeReceiptPreview() {
    const input = document.getElementById('receiptInput');
    const preview = document.getElementById('receiptPreviewContainer');
    const previewImg = document.getElementById('receiptPreviewImg');
    const confirmBtn = document.getElementById('confirmOrderBtn');
    
    if (input) input.value = '';
    if (preview) preview.style.display = 'none';
    if (previewImg) previewImg.src = '';
    if (confirmBtn) confirmBtn.disabled = true;
    
    const uploadLabel = document.querySelector('.upload-label');
    if (uploadLabel) uploadLabel.style.display = 'flex';
}

// ======================== دالة التحقق قبل الطلب ========================

async function validateOrderBeforeSubmit() {
    // 1. التحقق من اتصال Firebase
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
        showToast('تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى', 'error');
        return false;
    }
    
    // 2. التحقق من السلة أو الشراء المباشر
    if (!directPurchaseItem && cartItems.length === 0) {
        showToast('السلة فارغة', 'warning');
        return false;
    }
    
    // 3. التحقق من رقم الهاتف - إجباري
    const phone = document.getElementById('orderPhone')?.value.trim();
    if (!phone) {
        showToast('يرجى إدخال رقم الهاتف', 'warning');
        return false;
    }
    if (!isValidPhone(phone)) {
        showToast('يرجى إدخال رقم هاتف صحيح', 'warning');
        return false;
    }
    
    // 4. التحقق من الإيصال
    const receiptFile = document.getElementById('receiptInput')?.files[0];
    if (!receiptFile) {
        showToast('يرجى رفع صورة إيصال التحويل', 'warning');
        return false;
    }
    
    return true;
}

// ======================== دالة تأكيد الطلب المعدلة ========================

async function confirmOrder() {
    // التحقق قبل الإرسال
    const isValid = await validateOrderBeforeSubmit();
    if (!isValid) return;
    
    const confirmBtn = document.getElementById('confirmOrderBtn');
    const phone = document.getElementById('orderPhone').value.trim();
    const address = document.getElementById('orderAddress').value.trim();
    const notes = document.getElementById('orderNotes').value.trim();
    const receiptFile = document.getElementById('receiptInput').files[0];
    
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري إرسال الطلب...';
    confirmBtn.disabled = true;
    
    try {
        // 1. التأكد من تهيئة Firebase
        if (!db) {
            if (!initializeFirebase()) {
                throw new Error('تعذر الاتصال بقاعدة البيانات');
            }
        }
        
        // 2. رفع صورة الإيصال إلى Firebase Storage
        let receiptUrl = '';
        if (receiptFile) {
            try {
                const storageRef = window.firebaseModules.ref(firebaseStorage, `receipts/${Date.now()}_${receiptFile.name}`);
                const snapshot = await window.firebaseModules.uploadBytes(storageRef, receiptFile);
                receiptUrl = await window.firebaseModules.getDownloadURL(snapshot.ref);
                console.log('✅ تم رفع الإيصال بنجاح:', receiptUrl);
            } catch (uploadError) {
                console.error('Receipt Upload Error:', uploadError);
                throw new Error('فشل في رفع صورة الإيصال: ' + uploadError.message);
            }
        }
        
        // 3. حساب المبلغ الإجمالي
        const itemsToOrder = directPurchaseItem ? [directPurchaseItem] : cartItems;
        const subtotal = itemsToOrder.reduce((total, item) => total + (item.price * item.quantity), 0);
        const shippingCost = subtotal < (siteSettings.freeShippingLimit || 200) ? (siteSettings.shippingCost || 15) : 0;
        const total = subtotal + shippingCost;
        
        // 4. إنشاء رقم الطلب الفريد
        // جلب آخر رقم طلب من الإعدادات وتحديثه
        let orderNumber = 11001000;
        try {
            const settingsRef = window.firebaseModules.doc(db, "settings", "site_config");
            const settingsDoc = await window.firebaseModules.getDoc(settingsRef);
            if (settingsDoc.exists()) {
                const settingsData = settingsDoc.data();
                if (settingsData.lastOrderNumber && settingsData.lastOrderNumber >= 11001000) {
                    orderNumber = settingsData.lastOrderNumber + 1;
                }
            }
            // تحديث الرقم في قاعدة البيانات
            await window.firebaseModules.updateDoc(settingsRef, {
                lastOrderNumber: orderNumber,
                updatedAt: window.firebaseModules.serverTimestamp()
            });
        } catch (e) {
            console.error("Error updating order number:", e);
            orderNumber = 11001000 + Math.floor(Math.random() * 1000);
        }
        
        const orderId = 'NO:' + orderNumber;
        
        // 5. تحضير بيانات الطلب
        const orderData = {
            orderId: orderId,
            orderNumber: orderNumber,
            userId: currentUser?.uid || 'guest',
            customerName: currentUser?.displayName || currentUser?.name || 'مستخدم',
            customerEmail: currentUser?.email || '',
            customerPhone: phone || currentUser?.phone || '',
            address: address || '',
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
            status: 'pending',
            paymentMethod: 'bank_transfer',
            receiptImage: receiptUrl,
            receiptFileName: receiptFile.name,
            receiptFileType: receiptFile.type,
            receiptFileSize: receiptFile.size,
            receiptUploadDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            firestoreTimestamp: window.firebaseModules.serverTimestamp(),
            updatedAt: window.firebaseModules.serverTimestamp()
        };
        
        console.log('📤 إرسال الطلب إلى Firebase:', orderData);
        
        // 6. إرسال الطلب إلى Firebase
        const ordersRef = window.firebaseModules.collection(db, "orders");
        await window.firebaseModules.addDoc(ordersRef, orderData);
        
        console.log('✅ تم إرسال الطلب بنجاح:', orderId);
        
        // 7. تحديث إحصائيات المستخدم إذا لم يكن ضيفاً
        if (!isGuest && currentUser?.uid) {
            try {
                const userRef = window.firebaseModules.doc(db, "users", currentUser.uid);
                await window.firebaseModules.updateDoc(userRef, {
                    totalOrders: window.firebaseModules.increment(1),
                    totalSpent: window.firebaseModules.increment(total),
                    lastOrderDate: window.firebaseModules.serverTimestamp(),
                    updatedAt: window.firebaseModules.serverTimestamp()
                });
                console.log('✅ تم تحديث إحصائيات المستخدم');
            } catch (error) {
                console.error('⚠️ خطأ في تحديث إحصائيات المستخدم:', error);
            }
        }
        
        // 8. إرسال إشعار طلب جديد للمدير
        await sendAdminOrderNotification(orderData);
        
        // 9. تنظيف السلة أو الشراء المباشر وإظهار رسالة النجاح
        if (directPurchaseItem) {
            directPurchaseItem = null;
        } else {
            cartItems = [];
            localStorage.removeItem('cart');
            updateCartCount();
        }
        closeCheckoutModal();
        
        showSuccessOrderMessage(orderId);
        
        // 10. تحديث قسم الطلبات إذا كان مفتوحاً
        if (document.getElementById('my-orders').classList.contains('active')) {
            setTimeout(() => loadMyOrders(), 1000);
        }
        
        showToast(`تم إرسال طلبك بنجاح! رقم الطلب: ${orderId}`, 'success');
        
    } catch (error) {
        console.error('❌ خطأ في إرسال الطلب:', error);
        
        let errorMessage = 'حدث خطأ في إرسال الطلب';
        
        if (error.message.includes('permission')) {
            errorMessage = 'لا تملك صلاحية إرسال الطلبات. يرجى تسجيل الدخول كمسؤول أو الاتصال بالدعم.';
        } else if (error.message.includes('network')) {
            errorMessage = 'خطأ في الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت.';
        } else if (error.message.includes('database')) {
            errorMessage = 'خطأ في الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى.';
        }
        
        showToast(`${errorMessage}: ${error.message}`, 'error');
    } finally {
        confirmBtn.innerHTML = '<i class="fas fa-credit-card"></i> تأكيد الطلب وإرسال';
        confirmBtn.disabled = false;
    }
}

// ======================== نظام إشعارات الطلبات ========================

/**
 * إرسال إشعار طلب جديد للمدير
 */
async function sendAdminOrderNotification(orderData) {
    try {
        if (!db) return;
        
        const notificationsRef = window.firebaseModules.collection(db, "notifications");
        await window.firebaseModules.addDoc(notificationsRef, {
            type: 'new_order',
            title: 'طلب جديد!',
            message: `طلب جديد #${orderData.orderId} من ${orderData.customerName} بقيمة ${formatNumber(orderData.total)} ${siteCurrency}`,
            orderId: orderData.orderId,
            orderData: {
                customerName: orderData.customerName,
                total: orderData.total,
                itemsCount: orderData.items.length,
                status: orderData.status
            },
            read: false,
            priority: 'high',
            createdAt: window.firebaseModules.serverTimestamp()
        });
        
        console.log('🔔 تم إرسال إشعار طلب جديد للمدير');
        
    } catch (error) {
        console.error('❌ خطأ في إرسال إشعار الطلب:', error);
    }
}

function showSuccessOrderMessage(orderId) {
    const message = `
        <div style="text-align: center; padding: 40px 20px;">
            <i class="fas fa-check-circle" style="color: var(--success-color); font-size: 60px; margin-bottom: 20px;"></i>
            <h3 style="color: var(--primary-color); margin-bottom: 15px;">تم إرسال طلبك بنجاح!</h3>
            <div style="background: var(--light-color); padding: 20px; border-radius: 10px; margin-bottom: 25px; border: 1px solid var(--border-color);">
                <p style="margin-bottom: 10px;"><strong>رقم طلبك:</strong></p>
                <h2 style="color: var(--secondary-color); margin: 0;">${orderId}</h2>
            </div>
            <p style="color: var(--gray-color); margin-bottom: 20px; line-height: 1.6;">
                <i class="fas fa-info-circle"></i>
                تم استلام طلبك بنجاح وسيتم مراجعته خلال 24 ساعة.<br>
                سيتم التواصل معك على رقم الهاتف المسجل لتأكيد الطلب.
            </p>
            <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                <button onclick="showSection('my-orders')" class="btn-primary" style="padding: 12px 25px;">
                    <i class="fas fa-clipboard-list"></i> متابعة طلباتي
                </button>
                <button onclick="showSection('products')" class="btn-secondary" style="padding: 12px 25px;">
                    <i class="fas fa-shopping-bag"></i> مواصلة التسوق
                </button>
            </div>
        </div>
    `;
    
    const cartSection = document.getElementById('cart');
    if (cartSection) {
        const originalContent = cartSection.innerHTML;
        cartSection.innerHTML = message;
        
        setTimeout(() => {
            cartSection.innerHTML = originalContent;
            updateCartDisplay();
        }, 15000);
    }
}

async function loadMyOrders() {
    const ordersList = document.getElementById('myOrdersList');
    const emptyMessage = document.getElementById('emptyOrdersMessage');
    
    if (!ordersList) return;
    
    if (isGuest || !currentUser) {
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
        emptyMessage.style.display = 'none';
        return;
    }
    
    ordersList.innerHTML = '<div class="spinner"></div>';
    emptyMessage.style.display = 'none';

    try {
        const ordersRef = window.firebaseModules.collection(db, "orders");
        
        // استعلام أبسط: فقط تصفية حسب userId بدون ترتيب
        const q = window.firebaseModules.query(
            ordersRef,
            window.firebaseModules.where("userId", "==", currentUser.uid)
        );

        const querySnapshot = await window.firebaseModules.getDocs(q);

        if (querySnapshot.empty) {
            ordersList.innerHTML = '';
            emptyMessage.style.display = 'block';
            return;
        }

        let ordersHTML = '';
        
        // تحويل المستندات إلى مصفوفة وترتيبها يدوياً
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
            
            return dateB - dateA; // ترتيب تنازلي
        });
        
        ordersArray.forEach(order => {
            // معالجة التاريخ بشكل آمن
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
                'processing': 'يتم التجهيز',
                'shipped': 'تم الشحن',
                'delivered': 'تم التوصيل'
            }[order.status] || order.status;
            
            const statusClass = {
                'pending': 'status-pending',
                'paid': 'status-processing',
                'processing': 'status-processing',
                'shipped': 'status-shipped',
                'delivered': 'status-delivered'
            }[order.status] || 'status-pending';
            
            // معالجة الإيصال بشكل آمن
            const hasReceipt = order.receiptImage || order.receiptUrl;
            
            ordersHTML += `
                <div class="order-card">
                    <div class="order-header">
                        <div>
                            <span class="order-id">طلب #${order.orderId || order.id}</span>
                            <span class="order-date">${date}</span>
                        </div>
                        <span class="order-status-badge ${statusClass}">${statusText}</span>
                    </div>
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

let directPurchaseItem = null;

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
    
    // تعيين المنتج للشراء المباشر وتجاوز السلة
    directPurchaseItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: quantity,
        image: product.image
    };
    
    setTimeout(() => {
        openCheckoutModal(true);
    }, 100);
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
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    if (document.getElementById('favorites').classList.contains('active')) {
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
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x200?text=صورة'">
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <div class="product-price">
                        <span class="current-price">${formatNumber(product.price)} ${siteCurrency}</span>
                    </div>
                    <div class="product-actions">
                        <button class="action-btn add-to-cart" onclick="openQuantityModal('${product.id}')" style="background: var(--secondary-color); color: white; border-color: var(--secondary-color);">
                            <i class="fas fa-bolt"></i> شراء مباشر
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

// ======================== البحث والفلاتر ========================

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
    
    displayFilteredProducts(filteredProducts);
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
    
    displayFilteredProducts(filteredProducts);
}

function displayFilteredProducts(products) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    if (products.length === 0) {
        productsGrid.innerHTML = '<p class="no-products">لا توجد منتجات تطابق معايير البحث</p>';
        return;
    }
    
    productsGrid.innerHTML = products.map(product => {
        const isNew = product.isNew === true || product.isNew === 'true';
        const isSale = product.isSale === true || product.isSale === 'true';
        const isBest = product.isBest === true || product.isBest === 'true';
        const isInFavorites = favorites.some(f => f.id === product.id);
        
        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x200?text=صورة'">
                    ${isNew ? '<div class="badge new">جديد</div>' : ''}
                    ${isSale ? '<div class="badge sale">عرض</div>' : ''}
                    ${isBest ? '<div class="badge best">الأفضل</div>' : ''}
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="product-description">${product.description || ''}</p>
                    <div class="product-price">
                        <span class="current-price">${formatNumber(product.price)} ${siteCurrency}</span>
                        ${product.originalPrice ? `<span class="original-price">${formatNumber(product.originalPrice)} ${siteCurrency}</span>` : ''}
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

// ======================== الملف الشخصي ========================

function updateUserProfile() {
    if (!currentUser) return;
    
    const savedUser = JSON.parse(localStorage.getItem('currentUser')) || {};
    const userName = currentUser.displayName || savedUser.displayName || savedUser.name || 'زائر';
    const userEmail = currentUser.email || savedUser.email || 'ليس لديك حساب';
    
    const elements = [
        { id: 'profileName', text: userName },
        { id: 'mobileUserName', text: userName },
        { id: 'profileEmail', text: userEmail },
        { id: 'mobileUserEmail', text: userEmail },
        { id: 'detailName', text: userName },
        { id: 'detailEmail', text: userEmail }
    ];
    
    elements.forEach(el => {
        const element = document.getElementById(el.id);
        if (element) element.textContent = el.text;
    });
    
    if (currentUser.photoURL) {
        const images = document.querySelectorAll('#profileImage, #mobileUserImage');
        images.forEach(img => {
            img.src = currentUser.photoURL;
        });
    }
    
    updateProfileStats();
}

async function updateProfileStats() {
    const favoritesCount = favorites.length;
    document.getElementById('favoritesCount').textContent = favoritesCount;
    
    let ordersCount = 0;
    let totalSpent = 0;
    
    if (isGuest) {
        const orders = JSON.parse(localStorage.getItem('orders')) || [];
        ordersCount = orders.length;
        totalSpent = orders.reduce((total, order) => total + (order.total || 0), 0);
    } else if (db && currentUser) {
        try {
            const userRef = window.firebaseModules.doc(db, "users", currentUser.uid);
            const userDoc = await window.firebaseModules.getDoc(userRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                ordersCount = userData.totalOrders || 0;
                totalSpent = userData.totalSpent || 0;
            }
        } catch (error) {
            console.error('خطأ في تحميل إحصائيات المستخدم:', error);
        }
    }
    
    document.getElementById('ordersCount').textContent = ordersCount;
    document.getElementById('totalSpent').textContent = totalSpent;
}

function editProfile() {
    const modal = document.getElementById('editProfileModal');
    if (!modal) return;
    
    document.getElementById('editName').value = currentUser?.displayName || '';
    document.getElementById('editPhone').value = '';
    document.getElementById('editAddress').value = '';
    
    modal.classList.add('active');
}

async function saveProfileChanges() {
    const name = document.getElementById('editName').value;
    const phone = document.getElementById('editPhone').value;
    const address = document.getElementById('editAddress').value;
    
    if (!name.trim()) {
        showToast('الرجاء إدخال الاسم', 'warning');
        return;
    }
    
    try {
        if (!isGuest && currentUser && db) {
            await window.firebaseModules.updateProfile(currentUser, { displayName: name });
            
            const userRef = window.firebaseModules.doc(db, "users", currentUser.uid);
            await window.firebaseModules.updateDoc(userRef, {
                name: name,
                phone: phone,
                address: address,
                updatedAt: window.firebaseModules.serverTimestamp()
            });
        }
        
        currentUser.displayName = name;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        updateUserProfile();
        
        document.getElementById('editProfileModal').classList.remove('active');
        showToast('تم تحديث الملف الشخصي بنجاح', 'success');
        
    } catch (error) {
        console.error('خطأ في تحديث الملف الشخصي:', error);
        showToast('حدث خطأ في تحديث الملف الشخصي', 'error');
    }
}

// ======================== إعدادات الموقع ========================

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
        document.getElementById('dynamicTitle').textContent = siteSettings.storeName + ' - متجر العطور ومستحضرات التجميل';
        
        const storeNameElements = [
            document.getElementById('siteStoreName'),
            document.getElementById('footerStoreName')
        ];
        
        storeNameElements.forEach(el => {
            if (el) el.textContent = siteSettings.storeName;
        });
    }
    
    const footerElements = {
        'footerEmail': 'email',
        'footerPhone': 'phone',
        'footerAddress': 'address',
        'footerHours': 'workingHours'
    };
    
    for (const [elementId, settingKey] of Object.entries(footerElements)) {
        const element = document.getElementById(elementId);
        if (element && siteSettings[settingKey]) {
            element.textContent = siteSettings[settingKey];
        }
    }
    
    const aboutEl = document.getElementById('storeDescription');
    if (aboutEl && siteSettings.aboutUs) {
        aboutEl.textContent = siteSettings.aboutUs;
    }
    
    const socialContainer = document.querySelector('.footer-social') || document.querySelector('.social-links');
    if (socialContainer) {
        let socialHTML = '';
        if (siteSettings.whatsappUrl) socialHTML += `<a href="${siteSettings.whatsappUrl}" target="_blank" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>`;
        if (siteSettings.instagramUrl) socialHTML += `<a href="${siteSettings.instagramUrl}" target="_blank" title="Instagram"><i class="fab fa-instagram"></i></a>`;
        if (siteSettings.facebookUrl) socialHTML += `<a href="${siteSettings.facebookUrl}" target="_blank" title="Facebook"><i class="fab fa-facebook"></i></a>`;
        if (siteSettings.tiktokUrl) socialHTML += `<a href="${siteSettings.tiktokUrl}" target="_blank" title="TikTok"><i class="fab fa-tiktok"></i></a>`;
        
        if (socialHTML) socialContainer.innerHTML = socialHTML;
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
    setupQuantityModalEvents();
    setupCheckoutEventListeners();
    
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
    
    if (menuToggle && mobileNav) {
        menuToggle.addEventListener('click', () => mobileNav.classList.add('active'));
    }
    
    if (closeMenu && mobileNav) {
        closeMenu.addEventListener('click', () => mobileNav.classList.remove('active'));
    }
    
    document.querySelectorAll('a[data-section]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            showSection(sectionId);
            
            if (mobileNav) mobileNav.classList.remove('active');
        });
    });
    
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', signOutUser);
    }
}

function setupAppEventListeners() {
    const buttons = {
        'shopNowBtn': () => showSection('products'),
        'continueShoppingBtn': () => showSection('products'),
        'browseProductsBtn': () => showSection('products'),
        'homeBtn': () => showSection('home'),
        'cartBtn': () => showSection('cart'),
        'favoritesBtn': () => showSection('favorites'),
        'profileBtn': () => showSection('profile'),
        'logoutBtn': signOutUser,
        'checkoutBtn': openCheckoutModal,
        'confirmOrderBtn': confirmOrder,
        'cancelCheckoutBtn': closeCheckoutModal,
        'closeCheckoutModal': closeCheckoutModal,
        'editProfileBtn': editProfile,
        'saveProfileBtn': saveProfileChanges,
        'clearCartBtn': clearCart,
        'adminBtn': () => {
            console.log('🛠️ فتح لوحة التحكم...');
            window.open('admin.html', '_blank');
        }
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
        btn.addEventListener('click', function() {
            this.classList.toggle('active');
            filterProducts();
        });
    });
}

function setupModalEventListeners() {
    document.querySelectorAll('.close-modal, .btn-secondary.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
                if (modal.id === 'checkoutModal') {
                    if (typeof removeReceiptPreview === 'function') removeReceiptPreview();
                }
            }
        });
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
}

function setupQuantityModalEvents() {
    const increaseBtn = document.getElementById('increaseQuantity');
    if (increaseBtn) {
        increaseBtn.addEventListener('click', () => {
            const input = document.getElementById('selectedQuantity');
            let value = parseInt(input.value) || 1;
            if (value < 99) {
                input.value = value + 1;
            }
        });
    }
    
    const decreaseBtn = document.getElementById('decreaseQuantity');
    if (decreaseBtn) {
        decreaseBtn.addEventListener('click', () => {
            const input = document.getElementById('selectedQuantity');
            let value = parseInt(input.value) || 1;
            if (value > 1) {
                input.value = value - 1;
            }
        });
    }
    
    const quantityInput = document.getElementById('selectedQuantity');
    if (quantityInput) {
        quantityInput.addEventListener('change', function() {
            let value = parseInt(this.value) || 1;
            if (value < 1) value = 1;
            if (value > 99) value = 99;
            this.value = value;
        });
    }
    
    const addToCartBtn = document.getElementById('addToCartFromModal');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', addToCartFromModal);
    }
    
    const buyNowBtn = document.getElementById('buyNowFromModal');
    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', buyNowFromModal);
    }
}

function setupCheckoutEventListeners() {
    const receiptInput = document.getElementById('receiptInput');
    if (receiptInput) {
        receiptInput.addEventListener('change', function() {
            previewReceipt(this);
        });
    }
    
    const removeReceiptBtn = document.getElementById('removeReceiptBtn');
    if (removeReceiptBtn) {
        removeReceiptBtn.addEventListener('click', removeReceiptPreview);
    }
}

// ======================== أحداث التسجيل ========================

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
    
    const registerPassword = document.getElementById('registerPassword');
    if (registerPassword) {
        registerPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleRegistration();
            }
        });
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
    
    showAuthMessage('جاري تسجيل الدخول...', 'info');
    
    await signInWithEmail(email, password);
}

// ======================== دوال الواجهة ========================

function setupSmartHeader() {
    const header = document.querySelector('.header');
    const backToTopBtn = document.getElementById('backToTop');
    if (!header) return;

    window.addEventListener('scroll', function() {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            header.style.transform = 'translateY(-100%)';
        } else {
            header.style.transform = 'translateY(0)';
        }
        
        if (backToTopBtn) {
            if (scrollTop > 500) {
                backToTopBtn.style.display = 'block';
            } else {
                backToTopBtn.style.display = 'none';
            }
        }
        
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }, { passive: true });
    
    header.style.transition = 'transform 0.3s ease-in-out';
    
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

function showAuthScreen() {
    const authScreen = document.getElementById('authScreen');
    const appContainer = document.getElementById('appContainer');
    
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

function showAuthMessage(message, type = 'error') {
    const authMessage = document.getElementById('emailAuthMessage');
    if (authMessage) {
        authMessage.textContent = message;
        authMessage.className = `auth-message ${type}`;
    }
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        switch(sectionId) {
            case 'cart':
                updateCartDisplay();
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

// ======================== نافذة الدفع والطلب ========================

function openCheckoutModal(isDirect = false) {
    if (isGuest) {
        showToast('يرجى تسجيل الدخول لإتمام الطلب', 'warning');
        showAuthScreen();
        return;
    }

    if (!isDirect && cartItems.length === 0) {
        showToast('السلة فارغة', 'warning');
        return;
    }

    const itemsToProcess = isDirect ? [directPurchaseItem] : cartItems;
    const subtotal = itemsToProcess.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shippingCost = siteSettings.shippingCost || 15;
    const freeShippingLimit = siteSettings.freeShippingLimit || 200;
    const finalShippingCost = subtotal < freeShippingLimit ? shippingCost : 0;
    const total = subtotal + finalShippingCost;

    document.getElementById('checkoutTotalDisplay').textContent = `${formatNumber(total)} ${siteCurrency}`;
    if (document.getElementById('orderPhone')) {
        document.getElementById('orderPhone').value = currentUser?.phone || '';
    }
    document.getElementById('orderAddress').value = currentUser?.address || '';
    
    if (siteSettings.bankName) document.getElementById('displayBankName').textContent = siteSettings.bankName;
    if (siteSettings.bankAccount) document.getElementById('displayAccountNumber').textContent = siteSettings.bankAccount;
    if (siteSettings.bankAccountName) document.getElementById('displayAccountName').textContent = siteSettings.bankAccountName;

    document.getElementById('checkoutModal').classList.add('active');
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal').classList.remove('active');
    removeReceiptPreview();
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

window.addToCart = addToCartWithQuantity;
window.openQuantityModal = openQuantityModal;
window.closeQuantityModal = closeQuantityModal;
window.addToCartFromModal = addToCartFromModal;
window.buyNowFromModal = buyNowFromModal;
window.toggleFavorite = toggleFavorite;
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
window.signInAsGuest = signInAsGuest;
window.signInWithGoogle = signInWithGoogle;
window.signOutUser = signOutUser;
window.showSection = showSection;
window.clearCart = clearCart;
window.editProfile = editProfile;
window.saveProfileChanges = saveProfileChanges;
window.performSearch = performSearch;
window.filterProducts = filterProducts;
window.openCheckoutModal = openCheckoutModal;
window.closeCheckoutModal = closeCheckoutModal;
window.confirmOrder = confirmOrder;
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

window.addEventListener('resize', adjustLayout);

console.log('🚀 تطبيق Queen Beauty جاهز للعمل مع نظام تنبيهات الطلبات!');