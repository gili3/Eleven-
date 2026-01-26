// admin.js - النسخة المحسنة والمؤمنة (تمت إزالة التحقق المحلي الهش)
console.log('🚀 بدء تحميل لوحة تحكم Queen Beauty');

// المتغيرات العامة
let adminDb = null;
let adminStorage = null;
let adminAuth = null;
let siteCurrency = 'SDG';
let currentEditingProductId = null;
let productToDelete = null;
let lastOrderNumber = 11001000;
let isUploading = false;

// دالة تنسيق الأرقام
function formatNumber(num) {
    if (num === null || num === undefined) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * تنظيف النصوص من وسوم HTML لمنع هجمات XSS (نسخة محسنة)
 */
function sanitizeHTML(str) {
    if (!str) return '';
    
    // استخدام SecurityCore إذا كان متاحاً
    if (window.parent && window.parent.SecurityCore && typeof window.parent.SecurityCore.sanitizeHTML === 'function') {
        return window.parent.SecurityCore.sanitizeHTML(str);
    }
    
    // تنظيف أساسي محسّن
    let cleaned = str;
    
    // إزالة الوسوم الخطيرة
    const dangerousTags = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi,
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe\s*>/gi,
        /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object\s*>/gi,
        /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed\s*>/gi,
        /on\w+\s*=\s*["'][^"']*["']/gi,
        /javascript\s*:/gi
    ];
    
    dangerousTags.forEach(pattern => {
        cleaned = cleaned.replace(pattern, '');
    });
    
    // استخدام textContent للتنظيف النهائي
    const temp = document.createElement('div');
    temp.textContent = cleaned;
    return temp.innerHTML;
}

// اختبار اتصال قاعدة البيانات
async function checkFirestoreConnection() {
    try {
        console.log('🔍 اختبار الاتصال بقاعدة البيانات...');
        const settingsRef = window.firebaseModules.collection(adminDb, "settings");
        const settingsSnapshot = await window.firebaseModules.getDocs(settingsRef);
        console.log('✅ اتصال قاعدة البيانات ناجح');
        if (settingsSnapshot.empty) {
            console.log('⚠️ لا توجد إعدادات، سيتم إنشاؤها...');
            await createDefaultSettings();
        }
        return true;
    } catch (error) {
        console.error('❌ فشل الاتصال بقاعدة البيانات:', error);
        showToast('فشل الاتصال بقاعدة البيانات: ' + error.message, 'error');
        return false;
    }
}

// إنشاء الإعدادات الافتراضية
async function createDefaultSettings() {
    try {
        const settingsRef = window.firebaseModules.doc(adminDb, "settings", "site_config");
        const defaultSettings = {
            storeName: 'Queen Beauty',
            email: 'yxr.249@gmail.com',
            phone: '+249933002015',
            address: 'السودان - الخرطوم',
            shippingCost: 15,
            freeShippingLimit: 200,
            workingHours: 'من الأحد إلى الخميس: 9 صباحاً - 10 مساءً',
            aboutUs: 'متجر متخصص في بيع العطور ومستحضرات التجميل الأصلية',
            logoUrl: 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png',
            bankName: 'بنك الخرطوم (بنكك)',
            bankAccount: '1234567',
            bankAccountName: 'متجر Eleven للعطور',
            lastOrderNumber: 11001000,
            createdAt: window.firebaseModules.serverTimestamp(),
            updatedAt: window.firebaseModules.serverTimestamp()
        };
        await window.firebaseModules.setDoc(settingsRef, defaultSettings);
        console.log('✅ تم إنشاء الإعدادات الافتراضية');
        return true;
    } catch (error) {
        console.error('❌ خطأ في إنشاء الإعدادات:', error);
        return false;
    }
}

/**
 * تهيئة لوحة التحكم - النسخة المؤمنة
 * تعتمد حصرياً على Firebase Auth و Firestore Security Rules
 */
async function initAdminApp() {
    console.log('🔧 تهيئة لوحة التحكم المؤمنة...');
    
    // تهيئة Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyB1vNmCapPK0MI4H_Q0ilO7OnOgZa02jx0",
        authDomain: "queen-beauty-b811b.firebaseapp.com",
        projectId: "queen-beauty-b811b",
        storageBucket: "queen-beauty-b811b.firebasestorage.app",
        messagingSenderId: "418964206430",
        appId: "1:418964206430:web:8c9451fc56ca7f956bd5cf"
    };

    try {
        let adminApp;
        try {
            adminApp = window.firebaseModules.getApp('AdminApp');
        } catch (e) {
            adminApp = window.firebaseModules.initializeApp(firebaseConfig, 'AdminApp');
        }
        
        adminAuth = window.firebaseModules.getAuth(adminApp);
        adminDb = window.firebaseModules.getFirestore(adminApp);
        adminStorage = window.firebaseModules.getStorage(adminApp);
        
        // مراقبة حالة المصادقة
        window.firebaseModules.onAuthStateChanged(adminAuth, async (user) => {
            if (user) {
                console.log('👤 مستخدم مسجل دخول:', user.email);
                
                // التحقق من الصلاحيات عبر Firestore (هذا هو التحقق الحقيقي)
                try {
                    const userDoc = await window.firebaseModules.getDoc(window.firebaseModules.doc(adminDb, "users", user.uid));
                    const userData = userDoc.exists() ? userDoc.data() : null;
                    
                    // السماح فقط إذا كان isAdmin true أو كان البريد الإلكتروني للمسؤول الرئيسي
                    if ((userData && userData.isAdmin === true) || user.email === "yxr.249@gmail.com") {
                        console.log('✅ تم التحقق من صلاحيات المسؤول');
                        await loadAdminData();
                        setupAdminEventListeners();
                        showToast('مرحباً بك في لوحة التحكم', 'success');
                    } else {
                        console.error('🚫 محاولة دخول غير مصرح بها');
                        showToast('ليس لديك صلاحيات المسؤول', 'error');
                        setTimeout(() => window.location.href = '../index.html', 2000);
                    }
                } catch (error) {
                    console.error('❌ خطأ في التحقق من الصلاحيات:', error);
                    showToast('حدث خطأ أثناء التحقق من الصلاحيات', 'error');
                    // في حالة الخطأ، نعتمد على Security Rules لمنع الوصول للبيانات
                }
            } else {
                console.log('⚠️ لا يوجد مستخدم مسجل دخول');
                showToast('يرجى تسجيل الدخول أولاً', 'warning');
                setTimeout(() => window.location.href = '../index.html', 1500);
            }
        });
        
    } catch (error) {
        console.error('❌ خطأ في تهيئة التطبيق:', error);
        showToast('فشل تحميل لوحة التحكم', 'error');
    }
}

// تحميل البيانات (ستفشل إذا لم تكن هناك Security Rules تسمح بذلك)
async function loadAdminData() {
    console.log('📊 تحميل بيانات لوحة التحكم...');
    try {
        await Promise.all([
            loadStats(),
            loadAdminProducts(),
            loadAdminOrders(),
            loadAdminUsers(),
            loadAdminSettings()
        ]);
        console.log('✅ تم تحميل جميع البيانات بنجاح');
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات:', error);
        // لا نظهر توست هنا لأن القواعد قد تمنع بعض البيانات وهذا طبيعي
    }
}

// بقية الدوال (loadStats, loadAdminProducts, إلخ) تبقى كما هي ولكنها ستعتمد على صلاحيات Firebase
// ... (سيتم الاحتفاظ ببقية الكود الأصلي للدوال الوظيفية)
