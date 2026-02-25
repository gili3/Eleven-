/**
 * login.js - نظام تسجيل الدخول المستقل
 * نسخة منفصلة تماماً عن باقي ملفات التطبيق
 */

// ======================== المتغيرات العامة ========================

let currentUser = null;
let isGuest = false;
let firebaseApp = null;
let auth = null;
let db = null;

// ======================== إظهار وإخفاء شاشة التحميل ========================

function hideInitialLoader() {
    const loader = document.getElementById('initialLoader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }
}

// ======================== دوال مساعدة ========================

function showAuthMessage(message, type = 'error') {
    const authMessage = document.getElementById('emailAuthMessage');
    if (authMessage) {
        authMessage.textContent = message;
        authMessage.className = `auth-message ${type}`;
    }
}

function clearAuthMessage() {
    const authMessage = document.getElementById('emailAuthMessage');
    if (authMessage) {
        authMessage.textContent = '';
        authMessage.className = 'auth-message';
    }
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

function generateGuestUID() {
    return 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ======================== دوال Firebase ========================

async function initializeFirebase() {
    if (firebaseApp) return { app: firebaseApp, auth, db };

    try {
        if (!window.firebaseModules) {
            console.error('❌ Firebase Modules غير متوفرة');
            return null;
        }

        const config = {
            apiKey: "AIzaSyB1vNmCapPK0MI4H_Q0ilO7OnOgZa02jx0",
            authDomain: "queen-beauty-b811b.firebaseapp.com",
            projectId: "queen-beauty-b811b",
            storageBucket: "queen-beauty-b811b.firebasestorage.app",
            messagingSenderId: "418964206430",
            appId: "1:418964206430:web:8c9451fc56ca7f956bd5cf"
        };

        // الحصول على التطبيق الموجود أو إنشاء جديد
        let app;
        try {
            app = window.firebaseModules.getApp();
        } catch (e) {
            app = window.firebaseModules.initializeApp(config);
        }

        auth = window.firebaseModules.getAuth(app);
        db = window.firebaseModules.getFirestore(app);

        // ضبط استمرارية الجلسة على LOCAL
        if (window.firebaseModules.setPersistence && window.firebaseModules.browserLocalPersistence) {
            try {
                await window.firebaseModules.setPersistence(auth, window.firebaseModules.browserLocalPersistence);
                console.log('✅ تم ضبط استمرارية الجلسة على LOCAL');
            } catch (err) {
                console.warn('⚠️ خطأ في ضبط persistence:', err);
            }
        }

        firebaseApp = app;
        console.log('✅ تم تهيئة Firebase بنجاح');
        return { app, auth, db };
    } catch (error) {
        console.error('❌ خطأ في تهيئة Firebase:', error);
        return null;
    }
}

// ======================== دوال المصادقة ========================

async function signInWithGoogle() {
    try {
        console.log('🔑 تسجيل الدخول بـ Google...');
        
        if (!auth) {
            const instance = await initializeFirebase();
            if (!instance) {
                showAuthMessage('تعذر الاتصال بخدمة المصادقة', 'error');
                return;
            }
        }

        const provider = new window.firebaseModules.GoogleAuthProvider();
        const result = await window.firebaseModules.signInWithPopup(auth, provider);
        
        // حفظ بيانات المستخدم في Firestore
        await checkAndCreateUserInFirestore(result.user);
        
        console.log('✅ تم تسجيل الدخول بنجاح');
        
        // التوجيه للصفحة الرئيسية
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول بـ Google:', error);
        showAuthMessage('حدث خطأ في تسجيل الدخول. يرجى المحاولة مرة أخرى.', 'error');
    }
}

async function signInAsGuest() {
    try {
        console.log('👤 تسجيل الدخول كضيف...');
        
        // إنشاء مستخدم ضيف
        currentUser = {
            uid: generateGuestUID(),
            displayName: 'زائر',
            email: null,
            photoURL: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
            isGuest: true
        };
        
        // حفظ في sessionStorage
        sessionStorage.setItem('guest_user', JSON.stringify(currentUser));
        
        console.log('✅ تم الدخول كضيف بنجاح');
        
        // التوجيه للصفحة الرئيسية
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('❌ خطأ في الدخول كضيف:', error);
        showAuthMessage('حدث خطأ في الدخول كضيف', 'error');
    }
}

async function signInWithEmail(email, password) {
    try {
        console.log('🔑 تسجيل الدخول بالبريد الإلكتروني...');
        
        if (!email || !password) {
            showAuthMessage('الرجاء إدخال البريد الإلكتروني وكلمة المرور', 'error');
            return;
        }

        if (!validateEmail(email)) {
            showAuthMessage('البريد الإلكتروني غير صالح', 'error');
            return;
        }

        if (!auth) {
            const instance = await initializeFirebase();
            if (!instance) {
                showAuthMessage('تعذر الاتصال بخدمة المصادقة', 'error');
                return;
            }
        }

        const result = await window.firebaseModules.signInWithEmailAndPassword(auth, email, password);
        
        console.log('✅ تم تسجيل الدخول بنجاح');
        
        // التوجيه للصفحة الرئيسية
        window.location.href = 'index.html';
        
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
        
        showAuthMessage(errorMessage, 'error');
    }
}

async function signUpWithEmail(email, password, name, phone = '') {
    try {
        console.log('📝 إنشاء حساب جديد...');
        
        if (!email || !password || !name) {
            showAuthMessage('الرجاء ملء جميع الحقول المطلوبة', 'error');
            return false;
        }
        
        if (password.length < 6) {
            showAuthMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
            return false;
        }
        
        if (!validateEmail(email)) {
            showAuthMessage('البريد الإلكتروني غير صالح', 'error');
            return false;
        }

        if (!auth || !db) {
            const instance = await initializeFirebase();
            if (!instance) {
                showAuthMessage('تعذر الاتصال بخدمة المصادقة', 'error');
                return false;
            }
        }

        const result = await window.firebaseModules.createUserWithEmailAndPassword(auth, email, password);
        
        // تحديث الملف الشخصي
        await window.firebaseModules.updateProfile(result.user, {
            displayName: name,
            photoURL: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
        });

        // إنشاء وثيقة المستخدم في Firestore
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
        
        const userRef = window.firebaseModules.doc(db, "users", result.user.uid);
        await window.firebaseModules.setDoc(userRef, userData);
        
        console.log('✅ تم إنشاء الحساب بنجاح');
        
        showAuthMessage('تم إنشاء الحساب بنجاح! جاري التوجيه...', 'success');
        
        // التوجيه للصفحة الرئيسية بعد ثانية
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
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
            case 'auth/weak-password':
                errorMessage = 'كلمة المرور ضعيفة جداً';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'خطأ في الاتصال بالشبكة';
                break;
        }
        
        showAuthMessage(errorMessage, 'error');
        return false;
    }
}

async function checkAndCreateUserInFirestore(user) {
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
            console.log('✅ تم إنشاء وثيقة المستخدم في Firestore');
        } else {
            await window.firebaseModules.updateDoc(userRef, {
                lastLogin: window.firebaseModules.serverTimestamp()
            });
        }
    } catch (error) {
        console.error('❌ خطأ في التحقق من المستخدم:', error);
    }
}

// ======================== دوال التحقق من حالة المصادقة ========================

async function checkAuthState() {
    try {
        const instance = await initializeFirebase();
        if (!instance) {
            hideInitialLoader();
            return;
        }

        window.firebaseModules.onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log('👤 مستخدم مسجل دخول، جاري التوجيه للصفحة الرئيسية');
                window.location.href = 'index.html';
            } else {
                // التحقق من وجود مستخدم ضيف في sessionStorage
                const guestUser = sessionStorage.getItem('guest_user');
                if (guestUser) {
                    console.log('👤 مستخدم ضيف موجود، جاري التوجيه للصفحة الرئيسية');
                    window.location.href = 'index.html';
                } else {
                    console.log('👤 لا يوجد مستخدم مسجل');
                    hideInitialLoader();
                }
            }
        });
    } catch (error) {
        console.error('❌ خطأ في التحقق من حالة المصادقة:', error);
        hideInitialLoader();
    }
}

// ======================== دوال التحكم في واجهة المستخدم ========================

function showEmailAuthForm() {
    document.getElementById('authOptions').style.display = 'none';
    document.getElementById('emailAuthForm').style.display = 'block';
    showLoginForm();
}

function hideEmailAuthForm() {
    document.getElementById('authOptions').style.display = 'flex';
    document.getElementById('emailAuthForm').style.display = 'none';
    clearAuthMessage();
    clearForms();
}

function showLoginForm() {
    document.getElementById('loginFields').style.display = 'block';
    document.getElementById('registerFields').style.display = 'none';
    document.getElementById('authFormTitle').textContent = 'تسجيل الدخول';
    clearAuthMessage();
}

function showRegistrationForm() {
    document.getElementById('loginFields').style.display = 'none';
    document.getElementById('registerFields').style.display = 'block';
    document.getElementById('authFormTitle').textContent = 'إنشاء حساب جديد';
    clearAuthMessage();
}

function clearForms() {
    // مسح حقول تسجيل الدخول
    document.getElementById('emailInput').value = '';
    document.getElementById('passwordInput').value = '';
    
    // مسح حقول التسجيل
    document.getElementById('registerName').value = '';
    document.getElementById('registerEmail').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('registerPhone').value = '';
}

// ======================== معالجات الأحداث ========================

async function handleLogin() {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    
    if (!email || !password) {
        showAuthMessage('الرجاء إدخال البريد الإلكتروني وكلمة المرور', 'error');
        return;
    }
    
    showAuthMessage('جاري تسجيل الدخول...', 'info');
    await signInWithEmail(email, password);
}

async function handleRegistration() {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const phone = document.getElementById('registerPhone').value.trim();
    
    showAuthMessage('جاري إنشاء الحساب...', 'info');
    await signUpWithEmail(email, password, name, phone);
}

// ======================== إعداد مستمعي الأحداث ========================

function setupEventListeners() {
    // أزرار المصادقة الرئيسية
    document.getElementById('googleSignInBtn').addEventListener('click', signInWithGoogle);
    document.getElementById('guestSignInBtn').addEventListener('click', signInAsGuest);
    document.getElementById('emailSignInBtn').addEventListener('click', showEmailAuthForm);
    document.getElementById('backToAuthOptions').addEventListener('click', hideEmailAuthForm);
    
    // أزرار النماذج
    document.getElementById('signInBtn').addEventListener('click', handleLogin);
    document.getElementById('signUpBtn').addEventListener('click', showRegistrationForm);
    document.getElementById('completeSignUpBtn').addEventListener('click', handleRegistration);
    document.getElementById('switchToLoginBtn').addEventListener('click', showLoginForm);
    
    // دعم مفتاح Enter
    document.getElementById('passwordInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    document.getElementById('registerPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRegistration();
    });
}

// ======================== التهيئة ========================

document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 بدء تحميل صفحة تسجيل الدخول المستقلة');
    
    // التحقق من حالة المصادقة أولاً
    checkAuthState();
    
    // إعداد مستمعي الأحداث
    setupEventListeners();
    
    // إخفاء شاشة التحميل بعد 5 ثوان كحد أقصى
    setTimeout(hideInitialLoader, 5000);
});

// الاستماع لحدث Firebase الجاهز
window.addEventListener('firebase-ready', () => {
    console.log('🔥 Firebase جاهز للاستخدام');
});

console.log('✅ login.js تم التحميل بنجاح');
