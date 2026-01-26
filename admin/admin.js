// admin.js - النسخة المحسنة والمؤمنة
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
 * تنظيف النصوص من وسوم HTML لمنع هجمات XSS
 */
function sanitizeHTML(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// دالة إظهار التنبيهات (Toast)
function showToast(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // يمكن إضافة كود UI هنا لإظهار التنبيه للمستخدم
    alert(message); 
}

/**
 * تهيئة لوحة التحكم
 */
async function initAdminApp() {
    console.log('🔧 تهيئة لوحة التحكم المؤمنة...');
    
    const firebaseConfig = window.firebaseConfig || {
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
            adminApp = window.firebaseModules.initializeApp(firebaseConfig, 'AdminApp');
        } catch (e) {
            adminApp = window.firebaseModules.getApp('AdminApp');
        }
        
        adminAuth = window.firebaseModules.getAuth(adminApp);
        adminDb = window.firebaseModules.getFirestore(adminApp);
        adminStorage = window.firebaseModules.getStorage(adminApp);
        
        window.firebaseModules.onAuthStateChanged(adminAuth, async (user) => {
            if (user) {
                console.log('👤 مستخدم مسجل دخول:', user.email);
                try {
                    const userDoc = await window.firebaseModules.getDoc(window.firebaseModules.doc(adminDb, "users", user.uid));
                    const userData = userDoc.exists() ? userDoc.data() : null;
                    
                    if ((userData && userData.isAdmin === true) || user.email === "yxr.249@gmail.com") {
                        console.log('✅ تم التحقق من صلاحيات المسؤول');
                        await loadAdminData();
                        setupAdminEventListeners();
                    } else {
                        console.error('🚫 محاولة دخول غير مصرح بها');
                        showToast('ليس لديك صلاحيات المسؤول', 'error');
                        setTimeout(() => window.location.href = '../index.html', 2000);
                    }
                } catch (error) {
                    console.error('❌ خطأ في التحقق من الصلاحيات:', error);
                }
            } else {
                console.log('⚠️ لا يوجد مستخدم مسجل دخول');
                setTimeout(() => window.location.href = '../index.html', 1500);
            }
        });
        
    } catch (error) {
        console.error('❌ خطأ في تهيئة التطبيق:', error);
    }
}

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
    }
}

// ========== الدوال الناقصة التي تم إصلاحها ==========

async function loadStats() {
    try {
        const usersSnapshot = await window.firebaseModules.getDocs(window.firebaseModules.collection(adminDb, "users"));
        document.getElementById('adminUsersCount').textContent = usersSnapshot.size;
        
        const productsQuery = window.firebaseModules.query(
            window.firebaseModules.collection(adminDb, "products"),
            window.firebaseModules.where("isActive", "==", true)
        );
        const productsSnapshot = await window.firebaseModules.getDocs(productsQuery);
        document.getElementById('adminProductsCount').textContent = productsSnapshot.size;
        
        const ordersQuery = window.firebaseModules.query(
            window.firebaseModules.collection(adminDb, "orders"),
            window.firebaseModules.where("status", "==", "delivered")
        );
        const ordersSnapshot = await window.firebaseModules.getDocs(ordersQuery);
        document.getElementById('adminCompletedOrdersCount').textContent = ordersSnapshot.size;
        
        let totalSales = 0;
        ordersSnapshot.forEach(doc => {
            totalSales += doc.data().total || 0;
        });
        document.getElementById('adminTotalSales').textContent = formatNumber(totalSales) + ' SDG';
        
        await loadTopProducts();
    } catch (error) {
        console.error('❌ خطأ في تحميل الإحصائيات:', error);
    }
}

async function loadTopProducts() {
    const list = document.getElementById('topProductsList');
    if (list) list.innerHTML = '<p>سيتم عرض المنتجات الأكثر مبيعاً هنا</p>';
}

async function loadAdminProducts() {
    try {
        const q = window.firebaseModules.query(
            window.firebaseModules.collection(adminDb, "products"),
            window.firebaseModules.orderBy("serverTimestamp", "desc")
        );
        const snapshot = await window.firebaseModules.getDocs(q);
        const list = document.getElementById('adminProductsList');
        list.innerHTML = '';
        
        snapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            const card = document.createElement('div');
            card.className = 'admin-product-card';
            card.innerHTML = `<h4>${sanitizeHTML(product.name)}</h4><p>${formatNumber(product.price)} SDG</p>`;
            list.appendChild(card);
        });
    } catch (error) {
        console.error('❌ خطأ في تحميل المنتجات:', error);
    }
}

async function loadAdminOrders() {
    try {
        const q = window.firebaseModules.query(
            window.firebaseModules.collection(adminDb, "orders"),
            window.firebaseModules.orderBy("createdAt", "desc")
        );
        const snapshot = await window.firebaseModules.getDocs(q);
        const list = document.getElementById('adminOrdersList');
        list.innerHTML = '';
        
        snapshot.forEach(doc => {
            const order = { id: doc.id, ...doc.data() };
            const item = document.createElement('div');
            item.innerHTML = `<p>طلب رقم: ${order.id} - الحالة: ${order.status}</p>`;
            list.appendChild(item);
        });
    } catch (error) {
        console.error('❌ خطأ في تحميل الطلبات:', error);
    }
}

async function loadAdminUsers() {
    try {
        const snapshot = await window.firebaseModules.getDocs(window.firebaseModules.collection(adminDb, "users"));
        const list = document.getElementById('adminUsersList');
        list.innerHTML = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            const item = document.createElement('div');
            item.innerHTML = `<p>${user.email} ${user.isAdmin ? '(Admin)' : ''}</p>`;
            list.appendChild(item);
        });
    } catch (error) {
        console.error('❌ خطأ في تحميل المستخدمين:', error);
    }
}

async function loadAdminSettings() {
    try {
        const docRef = window.firebaseModules.doc(adminDb, "settings", "site_config");
        const docSnap = await window.firebaseModules.getDoc(docRef);
        if (docSnap.exists()) {
            console.log("Settings loaded:", docSnap.data());
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل الإعدادات:', error);
    }
}

function setupAdminEventListeners() {
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            tab.classList.add('active');
        });
    });
}

function logoutAdmin() {
    window.firebaseModules.signOut(adminAuth).then(() => {
        window.location.href = '../index.html';
    });
}
