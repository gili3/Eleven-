// auth-system.js - نظام المصادقة والمستخدمين (نسخة محسنة أمنياً)
// ======================== معالجة حالة المصادقة ========================

// دوال مساعدة للتشفير وفك التشفير
const AuthSecurity = {
    // تشفير البيانات قبل التخزين
    encryptData: function(data) {
        try {
            const jsonStr = JSON.stringify(data);
            return btoa(encodeURIComponent(jsonStr));
        } catch (e) {
            console.error('❌ خطأ في تشفير البيانات:', e);
            return null;
        }
    },
    
    // فك تشفير البيانات بعد الاسترجاع
    decryptData: function(encryptedData) {
        try {
            const jsonStr = decodeURIComponent(atob(encryptedData));
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error('❌ خطأ في فك تشفير البيانات:', e);
            return null;
        }
    },
    
    // تنظيف وتحقق من بيانات المستخدم
    sanitizeUserData: function(userData) {
        if (!userData || typeof userData !== 'object') return null;
        
        // استخدام SecurityCore إذا كان متاحاً
        if (window.SecurityCore && typeof window.SecurityCore.sanitizeObject === 'function') {
            return window.SecurityCore.sanitizeObject(userData);
        }
        
        // تنظيف أساسي إذا لم يكن SecurityCore متاحاً
        const cleaned = {};
        for (const key in userData) {
            if (Object.prototype.hasOwnProperty.call(userData, key)) {
                const value = userData[key];
                if (typeof value === 'string') {
                    cleaned[key] = value.replace(/<script[^>]*>.*?<\/script>/gi, '').replace(/<[^>]+>/g, '');
                } else {
                    cleaned[key] = value;
                }
            }
        }
        return cleaned;
    },
    
    // حفظ بيانات المستخدم بشكل آمن
    saveUserData: function(userData, useSession = false) {
        const sanitized = this.sanitizeUserData(userData);
        if (!sanitized) return false;
        
        const encrypted = this.encryptData(sanitized);
        if (!encrypted) return false;
        
        try {
            if (useSession) {
                sessionStorage.setItem('_usr', encrypted);
            } else {
                localStorage.setItem('_usr', encrypted);
            }
            return true;
        } catch (e) {
            console.error('❌ خطأ في حفظ البيانات:', e);
            return false;
        }
    },
    
    // استرجاع بيانات المستخدم بشكل آمن
    loadUserData: function() {
        try {
            const encrypted = localStorage.getItem('_usr') || sessionStorage.getItem('_usr');
            if (!encrypted) return null;
            
            const decrypted = this.decryptData(encrypted);
            if (!decrypted) return null;
            
            return this.sanitizeUserData(decrypted);
        } catch (e) {
            console.error('❌ خطأ في تحميل البيانات:', e);
            return null;
        }
    },
    
    // حذف بيانات المستخدم
    clearUserData: function() {
        localStorage.removeItem('_usr');
        sessionStorage.removeItem('_usr');
        // حذف البيانات القديمة غير المشفرة
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
    }
};

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
            if (typeof loadCartFromFirebase === 'function') await loadCartFromFirebase();
            
            // تحديث الواجهة
            if (typeof updateUserProfile === 'function') updateUserProfile();
            if (typeof loadProducts === 'function') await loadProducts();
            if (typeof updateCartCount === 'function') updateCartCount();
            if (typeof updateAdminButton === 'function') updateAdminButton();
            
            if (document.querySelector(".section.active")?.id === "checkout") {
                if (typeof updateCheckoutSummary === 'function') updateCheckoutSummary();
            } else {
                showMainApp();
                // إذا لم يكن هناك قسم نشط أو كنا في صفحة المصادقة، نذهب للرئيسية
                const currentSec = document.querySelector(".section.active");
                if (!currentSec || currentSec.id === 'authScreen') {
                    if (typeof showSection === 'function') showSection("home");
                    updateHeaderLayout();
                }
            }
            
            // تفعيل نظام الإشعارات
            if (window.setupOrderStatusListener) {
                window.setupOrderStatusListener().catch(e => console.error('Order status listener error:', e));
            }
            
            if (typeof showToast === 'function') showToast(`مرحباً بعودتك ${currentUser.displayName || 'مستخدم'}!`, 'success');
        } else {
            // محاولة تحميل البيانات المشفرة أولاً
            let userData = AuthSecurity.loadUserData();
            
            // إذا لم توجد بيانات مشفرة، نحاول البيانات القديمة ونشفرها
            if (!userData) {
                const oldSavedUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
                if (oldSavedUser) {
                    try {
                        userData = JSON.parse(oldSavedUser);
                        // تنظيف وتشفير البيانات القديمة
                        userData = AuthSecurity.sanitizeUserData(userData);
                        if (userData) {
                            AuthSecurity.saveUserData(userData);
                            // حذف البيانات القديمة
                            localStorage.removeItem('currentUser');
                            sessionStorage.removeItem('currentUser');
                        }
                    } catch (e) {
                        console.error('❌ خطأ في قراءة البيانات القديمة:', e);
                        userData = null;
                    }
                }
            }
            
            if (userData) {
                try {
                    if (userData.isGuest) {
                        currentUser = userData;
                        isGuest = true;
                        isAdmin = false;
                        
                        showMainApp();
                        if (typeof showSection === 'function') showSection('home');
                        updateHeaderLayout();
                        if (typeof updateUserProfile === 'function') updateUserProfile();
                        if (typeof loadProducts === 'function') await loadProducts();
                        if (typeof updateCartCount === 'function') updateCartCount();
                        if (typeof updateAdminButton === 'function') updateAdminButton();
                        
                        console.log('👤 تم استعادة المستخدم الضيف');
                    } else {
                        // إذا كان مستخدماً مسجلاً ولكن Firebase Auth لم يتعرف عليه بعد، ننتظر قليلاً أو نظهر شاشة الدخول
                        showAuthScreen();
                    }
                } catch (e) {
                    console.error('❌ خطأ في قراءة بيانات المستخدم:', e);
                    AuthSecurity.clearUserData();
                    showAuthScreen();
                }
            } else {
                showAuthScreen();
            }
        }
        
        if (typeof hideLoader === 'function') hideLoader();
        
    } catch (error) {
        console.error('❌ خطأ في معالجة حالة المصادقة:', error);
        if (typeof hideLoader === 'function') hideLoader();
        showAuthScreen();
    }
}

function handleAuthError() {
    console.log('⚠️ فشل الاتصال بمصادقة Firebase');
    
    const userData = AuthSecurity.loadUserData();
    if (userData) {
        try {
            if (userData.isGuest) {
                currentUser = userData;
                isGuest = true;
                isAdmin = false;
                
                showMainApp();
                if (typeof showSection === 'function') showSection('home');
                updateHeaderLayout();
                if (typeof updateUserProfile === 'function') updateUserProfile();
                if (typeof loadProducts === 'function') loadProducts();
                if (typeof updateCartCount === 'function') updateCartCount();
                if (typeof updateAdminButton === 'function') updateAdminButton();
                
                if (typeof showToast === 'function') showToast('تم الاتصال في وضع عدم الاتصال', 'warning');
                if (typeof hideLoader === 'function') hideLoader();
                return;
            }
        } catch (e) {
            console.error('❌ خطأ في قراءة بيانات المستخدم:', e);
        }
    }
    
    if (typeof forceHideLoader === 'function') forceHideLoader();
    showAuthScreen();
    if (typeof showToast === 'function') showToast('تعذر الاتصال بالخادم. يمكنك الدخول كضيف.', 'warning');
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
    
    // حفظ البيانات بشكل مشفر
    AuthSecurity.saveUserData(currentUser);
    AuthSecurity.saveUserData(currentUser, true); // حفظ في session أيضاً
    
    showMainApp();
    if (typeof showSection === 'function') showSection('home');
    updateHeaderLayout();
    if (typeof updateUserProfile === 'function') updateUserProfile();
    if (typeof loadProducts === 'function') loadProducts();
    if (typeof updateCartCount === 'function') updateCartCount();
    if (typeof updateAdminButton === 'function') updateAdminButton();
    
    if (typeof showToast === 'function') showToast('تم الدخول كضيف بنجاح', 'success');
}

async function signInWithGoogle() {
    try {
        console.log('🔑 تسجيل الدخول بـ Google...');
        
        if (typeof checkFirebaseSDK === 'function' && !checkFirebaseSDK()) {
            if (typeof showToast === 'function') showToast('تعذر تحميل مكتبات Firebase', 'error');
            return;
        }
        
        if (!auth || !db) {
            console.log('🔄 محاولة تهيئة Firebase...');
            if (typeof initializeFirebase === 'function') {
                initializeFirebase();
            }
        }
        
        if (!auth) {
            if (typeof showToast === 'function') showToast('تعذر الاتصال بخدمة Firebase', 'error');
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
        
        // حفظ البيانات بشكل مشفر
        AuthSecurity.saveUserData(userToSave);
        AuthSecurity.saveUserData(userToSave, true);
        
        // تصفير الحقول قبل الدخول
        document.querySelectorAll('input').forEach(i => i.value = '');
        
        showMainApp();
        if (typeof showSection === 'function') showSection('home');
        updateHeaderLayout();
        if (typeof updateUserProfile === 'function') updateUserProfile();
        if (typeof loadProducts === 'function') await loadProducts();
        if (typeof updateCartCount === 'function') updateCartCount();
        if (typeof updateAdminButton === 'function') updateAdminButton();
        
        // تفعيل نظام الإشعارات
        if (window.setupOrderStatusListener) {
            window.setupOrderStatusListener().catch(e => console.error('Order status listener error:', e));
        }
        
        if (typeof showToast === 'function') showToast(`مرحباً بك ${currentUser.displayName}!`, 'success');
        
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول بـ Google:', error);
        if (typeof showToast === 'function') showToast('حدث خطأ في تسجيل الدخول', 'error');
    }
}

function validateEmail(email) {
    // استخدام SecurityCore إذا كان متاحاً
    if (window.SecurityCore && typeof window.SecurityCore.validateEmail === 'function') {
        return window.SecurityCore.validateEmail(email);
    }
    
    // التحقق الأساسي
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
            if (typeof showToast === 'function') showToast('الرجاء ملء جميع الحقول المطلوبة', 'warning');
            return false;
        }
        
        if (password.length < 6) {
            if (typeof showToast === 'function') showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'warning');
            return false;
        }
        
        if (!validateEmail(email)) {
            if (typeof showToast === 'function') showToast('البريد الإلكتروني غير صالح', 'warning');
            return false;
        }
        
        if (typeof checkFirebaseSDK === 'function' && !checkFirebaseSDK()) {
            if (typeof showToast === 'function') showToast('تعذر تحميل مكتبات Firebase', 'error');
            return false;
        }
        
        if (!auth || !db) {
            console.log('🔄 محاولة تهيئة Firebase...');
            if (typeof initializeFirebase === 'function') {
                initializeFirebase();
            }
        }
        
        if (!auth) {
            if (typeof showToast === 'function') showToast('تعذر الاتصال بخدمة Firebase', 'error');
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
        if (typeof showSection === 'function') showSection('home');
        updateHeaderLayout();
        if (typeof updateUserProfile === 'function') updateUserProfile();
        if (typeof loadProducts === 'function') await loadProducts();
        if (typeof updateCartCount === 'function') updateCartCount();
        if (typeof updateAdminButton === 'function') updateAdminButton();
        
        if (typeof showToast === 'function') showToast(`تم إنشاء حسابك بنجاح ${name}!`, 'success');
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
        
        if (typeof showToast === 'function') showToast(errorMessage, 'error');
        return false;
    }
}
// نظام الحماية من هجمات التخمين (Brute Force)
const LoginProtector = {
    attempts: 0,
    lastAttempt: 0,
    lockUntil: 0,
    
    check: function() {
        const now = Date.now();
        if (now < this.lockUntil) {
            const remaining = Math.ceil((this.lockUntil - now) / 1000);
            if (typeof showToast === 'function') showToast(`تم قفل المحاولات مؤقتاً. انتظر ${remaining} ثانية`, 'error');
            return false;
        }
        return true;
    },
    
    recordFailure: function() {
        this.attempts++;
        this.lastAttempt = Date.now();
        if (this.attempts >= 5) {
            this.lockUntil = Date.now() + (60 * 1000); // قفل لمدة دقيقة بعد 5 محاولات فاشلة
            this.attempts = 0;
        }
    },
    
    recordSuccess: function() {
        this.attempts = 0;
        this.lockUntil = 0;
    }
};

async function signInWithEmail(email, password) {
    if (!LoginProtector.check()) return;
    
    try {
        console.log('🔑 تسجيل الدخول بالبريد الإلكتروني...');
        
        if (typeof checkFirebaseSDK === 'function' && !checkFirebaseSDK()) {
            if (typeof showToast === 'function') showToast('تعذر تحميل مكتبات Firebase', 'error');
            return;
        }
        
        if (!auth || !db) {
            console.log('🔄 محاولة تهيئة Firebase...');
            if (typeof initializeFirebase === 'function') {
                initializeFirebase();
            }
        }
        
        if (!auth) {
            if (typeof showToast === 'function') showToast('تعذر الاتصال بخدمة Firebase', 'error');
            return;
        }
        
        const result = await window.firebaseModules.signInWithEmailAndPassword(auth, email, password);
        LoginProtector.recordSuccess();
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
        
        // حفظ البيانات بشكل مشفر
        AuthSecurity.saveUserData(userToSave);
        AuthSecurity.saveUserData(userToSave, true);
        
        // تصفير الحقول قبل الدخول
        document.querySelectorAll('input').forEach(i => i.value = '');
        
        showMainApp();
        if (typeof showSection === 'function') showSection('home');
        updateHeaderLayout();
        if (typeof updateUserProfile === 'function') updateUserProfile();
        if (typeof loadProducts === 'function') await loadProducts();
        if (typeof updateCartCount === 'function') updateCartCount();
        if (typeof updateAdminButton === 'function') updateAdminButton();
        
        // تفعيل نظام الإشعارات
        if (window.setupOrderStatusListener) {
            window.setupOrderStatusListener().catch(e => console.error('Order status listener error:', e));
        }
        
        if (typeof showToast === 'function') showToast(`مرحباً بعودتك ${currentUser.displayName}!`, 'success');
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
        
        if (typeof showToast === 'function') showToast(errorMessage, 'error');
        if (typeof showAuthMessage === 'function') showAuthMessage(errorMessage, 'error');
        LoginProtector.recordFailure();
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
        
        if (typeof updateAdminButton === 'function') updateAdminButton();
        
        return isAdmin;
        
    } catch (error) {
        console.error('❌ خطأ في التحقق من صلاحيات المستخدم:', error);
        isAdmin = false;
        if (typeof updateAdminButton === 'function') updateAdminButton();
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
        
        // حذف بيانات المستخدم المشفرة والقديمة
        AuthSecurity.clearUserData();
        
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
        
        if (typeof updateAdminButton === 'function') updateAdminButton();
        if (typeof updateCartCount === 'function') updateCartCount();
        showAuthScreen();
        
        // إعادة تحميل المنتجات لضمان عدم وجود بيانات معلقة
        allProducts = [];
        if (typeof displayProducts === 'function') displayProducts();
        
        if (typeof showToast === 'function') showToast('تم تسجيل الخروج بنجاح', 'success');
    } catch (error) {
        console.error('❌ خطأ في تسجيل الخروج:', error);
        if (typeof showToast === 'function') showToast('حدث خطأ أثناء تسجيل الخروج', 'error');
    }
}

// ======================== إدارة تسجيل المستخدمين ========================

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
        if (typeof showAuthMessage === 'function') showAuthMessage('الرجاء ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    if (password.length < 6) {
        if (typeof showAuthMessage === 'function') showAuthMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        if (typeof showAuthMessage === 'function') showAuthMessage('البريد الإلكتروني غير صالح', 'error');
        return;
    }
    
    if (typeof showAuthMessage === 'function') showAuthMessage('جاري إنشاء حسابك...', 'info');
    
    const success = await signUpWithEmail(email, password, name, phone);
    
    if (success) {
        if (typeof showAuthMessage === 'function') showAuthMessage('تم إنشاء حسابك بنجاح!', 'success');
    }
}

async function handleLogin() {
    const email = document.getElementById('emailInput')?.value || '';
    const password = document.getElementById('passwordInput')?.value || '';
    
    if (!email || !password) {
        if (typeof showAuthMessage === 'function') showAuthMessage('الرجاء إدخال البريد الإلكتروني وكلمة المرور', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        if (typeof showAuthMessage === 'function') showAuthMessage('البريد الإلكتروني غير صالح', 'error');
        return;
    }
    
    if (typeof showAuthMessage === 'function') showAuthMessage('جاري تسجيل الدخول...', 'info');
    
    await signInWithEmail(email, password);
}

function showAuthMessage(message, type = 'error') {
    const authMessage = document.getElementById('emailAuthMessage');
    if (authMessage) {
        authMessage.textContent = message;
        authMessage.className = `auth-message ${type}`;
    }
}

// ======================== التصدير للاستخدام العام ========================

window.signInAsGuest = signInAsGuest;
window.signInWithGoogle = signInWithGoogle;
window.signOutUser = signOutUser;
window.signUpWithEmail = signUpWithEmail;
window.handleRegistration = handleRegistration;
window.handleLogin = handleLogin;
window.showRegistrationForm = showRegistrationForm;
window.showLoginForm = showLoginForm;
window.validateEmail = validateEmail;

console.log('✅ auth-system.js loaded');