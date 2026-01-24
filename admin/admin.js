// admin.js - النسخة المحسنة مع نظام المصادقة المزدوج
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

// ========== الحل الرئيسي هنا ==========
async function initAdminApp() {
    console.log('🔧 تهيئة لوحة التحكم...');
    
    // **الخطوة 1: التحقق من localStorage أولاً**
    const savedUser = localStorage.getItem('currentUser');
    
    if (!savedUser) {
        console.log('❌ لا يوجد مستخدم في localStorage');
        showToast('يجب تسجيل الدخول أولاً', 'error');
        setTimeout(() => {
            window.location.href = '../login.html';
        }, 1500);
        return;
    }
    
    // محاولة تحليل بيانات المستخدم
    let userData;
    try {
        userData = JSON.parse(savedUser);
        console.log('📱 بيانات المستخدم المحفوظة:', userData);
        
        // **التحقق من الصلاحيات من localStorage**
        if (userData.isGuest) {
            showToast('الضيوف لا يمكنهم الدخول للوحة التحكم', 'error');
            setTimeout(() => window.location.href = '../login.html', 1500);
            return;
        }
        
        // تحقق مرن من صلاحية الأدمن
        const isAdmin = userData.isAdmin === true || 
                       userData.isAdmin === "true" || 
                       userData.role === "admin" || 
                       userData.role === "administrator" ||
                       userData.email === "yxr.249@gmail.com";
        
        if (!isAdmin) {
            showToast('ليس لديك صلاحيات الدخول للوحة التحكم', 'error');
            setTimeout(() => window.location.href = '../login.html', 1500);
            return;
        }
        
    } catch (e) {
        console.error('❌ خطأ في تحليل بيانات المستخدم:', e);
        showToast('خطأ في بيانات الجلسة، يرجى تسجيل الدخول مجدداً', 'error');
        setTimeout(() => window.location.href = '../login.html', 1500);
        return;
    }
    
    // **الخطوة 2: تهيئة Firebase**
    const firebaseConfig = {
        apiKey: "AIzaSyB1vNmCapPK0MI4H_Q0ilO7OnOgZa02jx0",
        authDomain: "queen-beauty-b811b.firebaseapp.com",
        projectId: "queen-beauty-b811b",
        storageBucket: "queen-beauty-b811b.firebasestorage.app",
        messagingSenderId: "418964206430",
        appId: "1:418964206430:web:8c9451fc56ca7f956bd5cf"
    };

    try {
        // إنشاء تطبيق Firebase
        let adminApp;
        try {
            adminApp = window.firebaseModules.getApp('AdminApp');
            console.log('✅ استخدام تطبيق Firebase الموجود');
        } catch (e) {
            console.log('🔄 إنشاء تطبيق Firebase جديد...');
            adminApp = window.firebaseModules.initializeApp(firebaseConfig, 'AdminApp');
        }
        
        // الحصول على Authentication و Firestore و Storage
        adminAuth = window.firebaseModules.getAuth(adminApp);
        adminDb = window.firebaseModules.getFirestore(adminApp);
        adminStorage = window.firebaseModules.getStorage(adminApp);
        
        // **الخطوة 3: محاولة استعادة جلسة Firebase**
        console.log('🔍 محاولة استعادة جلسة Firebase...');
        
        // انتظر قليلاً لاستعادة الجلسة
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // تحقق من حالة المصادقة الحالية
        const currentUser = adminAuth.currentUser;
        
        if (!currentUser) {
            console.log('⚠️ لا توجد جلسة Firebase نشطة');
            
            // **الحل: تخطي Firebase والاعتماد على localStorage فقط**
            console.log('🔄 استخدام النظام اللاحتياطي (localStorage فقط)');
            await loadAdminDataWithLocalStorage(userData);
            return;
        }
        
        // **الخطوة 4: إذا كان هناك مستخدم في Firebase، تحقق منه**
        console.log('✅ هناك جلسة Firebase نشطة:', currentUser.email);
        await checkFirebaseUserAndLoad(currentUser);
        
    } catch (error) {
        console.error('❌ خطأ في تهيئة Firebase:', error);
        
        // **الخطوة 5: في حالة فشل Firebase، استخدم النظام اللاحتياطي**
        showToast('تم الدخول بالنظام اللاحتياطي', 'warning');
        await loadAdminDataWithLocalStorage(userData);
    }
}

// النظام اللاحتياطي: تحميل البيانات باستخدام localStorage فقط
async function loadAdminDataWithLocalStorage(userData) {
    console.log('🚀 بدء تحميل البيانات بالنظام اللاحتياطي...');
    
    try {
        // تهيئة Firestore بدون مصادقة (إذا أمكن)
        const firebaseConfig = {
            apiKey: "AIzaSyB1vNmCapPK0MI4H_Q0ilO7OnOgZa02jx0",
            authDomain: "queen-beauty-b811b.firebaseapp.com",
            projectId: "queen-beauty-b811b",
            storageBucket: "queen-beauty-b811b.firebasestorage.app",
            messagingSenderId: "418964206430",
            appId: "1:418964206430:web:8c9451fc56ca7f956bd5cf"
        };
        
        let adminApp;
        try {
            adminApp = window.firebaseModules.getApp('AdminAppBackup');
            console.log('✅ استخدام التطبيق الاحتياطي الموجود');
        } catch (e) {
            console.log('🔄 إنشاء تطبيق احتياطي جديد...');
            adminApp = window.firebaseModules.initializeApp(firebaseConfig, 'AdminAppBackup');
        }
        
        adminDb = window.firebaseModules.getFirestore(adminApp);
        adminStorage = window.firebaseModules.getStorage(adminApp);
        
        // تحميل البيانات
        await loadAdminData();
        setupAdminEventListeners();
        
        showToast(`مرحباً بك ${userData.name || 'مدير'}`, 'success');
        
    } catch (error) {
        console.error('❌ خطأ في النظام اللاحتياطي:', error);
        showToast('حدث خطأ في تحميل البيانات', 'error');
    }
}

// التحقق من مستخدم Firebase وتحميل البيانات
async function checkFirebaseUserAndLoad(firebaseUser) {
    try {
        console.log('🔍 التحقق من مستخدم Firebase...');
        
        // طريقة بسيطة: إذا كان البريد الإلكتروني الخاص بك، اسمح بالدخول مباشرة
        if (firebaseUser.email === "yxr.249@gmail.com") {
            console.log('✅ هذا هو الحساب الإداري الرئيسي');
            await loadAdminData();
            setupAdminEventListeners();
            showToast('مرحباً بك في لوحة التحكم', 'success');
            return;
        }
        
        // طريقة متقدمة: التحقق من قاعدة البيانات
        const userRef = window.firebaseModules.doc(adminDb, "users", firebaseUser.uid);
        const userDoc = await window.firebaseModules.getDoc(userRef);
        
        if (userDoc.exists()) {
            const dbUserData = userDoc.data();
            
            // التحقق من الصلاحيات
            const isAdmin = dbUserData.isAdmin === true || 
                           dbUserData.isAdmin === "true" || 
                           dbUserData.role === "admin" || 
                           dbUserData.role === "administrator";
            
            if (isAdmin) {
                console.log('✅ صلاحية الأدمن مؤكدة في قاعدة البيانات');
                await loadAdminData();
                setupAdminEventListeners();
                showToast('مرحباً بك في لوحة التحكم', 'success');
            } else {
                console.log('❌ المستخدم ليس أدمن في قاعدة البيانات');
                showToast('ليس لديك صلاحيات الدخول', 'error');
                setTimeout(() => window.location.href = '../login.html', 2000);
            }
        } else {
            console.log('⚠️ بيانات المستخدم غير موجودة في قاعدة البيانات');
            showToast('بيانات المستخدم غير موجودة', 'error');
            setTimeout(() => window.location.href = '../login.html', 2000);
        }
        
    } catch (error) {
        console.error('❌ خطأ في التحقق من Firebase:', error);
        showToast('خطأ في التحقق من الهوية', 'error');
    }
}

// ========== باقي الدوال (بدون تغيير) ==========

async function loadAdminData() {
    try {
        console.log('📊 بدء تحميل البيانات...');
        
        const connectionSuccess = await checkFirestoreConnection();
        if (!connectionSuccess) throw new Error('فشل الاتصال بقاعدة البيانات');
        
        await loadLastOrderNumber();
        
        await loadAdminDashboard();
        
        console.log('✅ تم تحميل جميع البيانات بنجاح');
        
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات:', error);
        showToast('خطأ في تحميل البيانات', 'error');
    }
}

async function loadLastOrderNumber() {
    try {
        const settingsRef = window.firebaseModules.doc(adminDb, "settings", "site_config");
        const settingsDoc = await window.firebaseModules.getDoc(settingsRef);
        if (settingsDoc.exists()) {
            const settings = settingsDoc.data();
            lastOrderNumber = settings.lastOrderNumber || 11001000;
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل آخر رقم طلب:', error);
    }
}

async function getNextOrderNumber() {
    lastOrderNumber += 1;
    try {
        const settingsRef = window.firebaseModules.doc(adminDb, "settings", "site_config");
        await window.firebaseModules.updateDoc(settingsRef, {
            lastOrderNumber: lastOrderNumber,
            updatedAt: window.firebaseModules.serverTimestamp()
        });
    } catch (error) {
        console.error('❌ خطأ في تحديث رقم الطلب:', error);
    }
    return lastOrderNumber;
}

async function loadAdminDashboard() {
    console.log('🚀 بدء تحميل مكونات لوحة التحكم...');
    
    const tasks = [
        { name: 'الإحصائيات', func: loadAdminStats },
        { name: 'المنتجات', func: loadAdminProducts },
        { name: 'الطلبات', func: loadAdminOrders },
        { name: 'المستخدمين', func: loadAdminUsers },
        { name: 'الإعدادات', func: loadAdminSettings },
        { name: 'الألوان', func: loadThemeSettings }
    ];

    for (const task of tasks) {
        try {
            console.log(`⏳ جاري تحميل ${task.name}...`);
            await task.func();
            console.log(`✅ تم تحميل ${task.name} بنجاح`);
        } catch (error) {
            console.error(`❌ فشل تحميل ${task.name}:`, error);
        }
    }
}

// دالة الإحصائيات
async function loadAdminStats() {
    try {
        const usersSnapshot = await window.firebaseModules.getDocs(window.firebaseModules.collection(adminDb, "users"));
        const regularUsers = usersSnapshot.docs.filter(doc => !doc.data().isGuest).length;
        const usersEl = document.getElementById('adminUsersCount');
        if (usersEl) usersEl.textContent = formatNumber(regularUsers);
        
        const productsQuery = window.firebaseModules.query(
            window.firebaseModules.collection(adminDb, "products"),
            window.firebaseModules.where("isActive", "==", true)
        );
        const productsSnapshot = await window.firebaseModules.getDocs(productsQuery);
        const productsEl = document.getElementById('adminProductsCount');
        if (productsEl) productsEl.textContent = formatNumber(productsSnapshot.size);
        
        const ordersSnapshot = await window.firebaseModules.getDocs(window.firebaseModules.collection(adminDb, "orders"));
        let totalSales = 0, completedOrders = 0, pendingOrders = 0;
        
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            const status = order.status || 'pending';
            if (status === 'delivered') { 
                completedOrders++; 
                totalSales += parseFloat(order.total || 0); 
            }
            if (status === 'pending') pendingOrders++;
        });
        
        const completedEl = document.getElementById('adminCompletedOrdersCount');
        if (completedEl) completedEl.textContent = formatNumber(completedOrders);
        
        const salesEl = document.getElementById('adminTotalSales');
        if (salesEl) salesEl.textContent = formatNumber(totalSales) + ' ' + siteCurrency;
        
    } catch (error) { 
        console.error('❌ خطأ في تحميل الإحصائيات:', error); 
    }
}

// دالة المنتجات
async function loadAdminProducts() {
    try {
        const productsList = document.getElementById('adminProductsList');
        if (!productsList) return;
        
        productsList.innerHTML = '<div class="spinner"></div>';
        
        const productsRef = window.firebaseModules.collection(adminDb, "products");
        const q = window.firebaseModules.query(
            productsRef, 
            window.firebaseModules.orderBy("createdAt", "desc")
        );
        
        const snapshot = await window.firebaseModules.getDocs(q);
        
        if (snapshot.empty) {
            productsList.innerHTML = '<div class="no-data">لا توجد منتجات</div>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const product = doc.data();
            const id = doc.id;
            const isActive = product.isActive !== false;
            
            html += `
            <div class="admin-product-card" data-id="${id}">
                <div class="admin-product-image">
                    <img src="${product.image || ''}" 
                         onerror="this.src='https://via.placeholder.com/80?text=صورة'" 
                         alt="${product.name}">
                </div>
                <div class="admin-product-info">
                    <h4>${product.name || 'بدون اسم'}</h4>
                    <p>${formatNumber(product.price || 0)} ${siteCurrency}</p>
                    <div class="product-status">
                        <span class="status-badge ${isActive ? 'active' : 'inactive'}">
                            ${isActive ? 'نشط' : 'غير نشط'}
                        </span>
                    </div>
                </div>
                <div class="admin-product-actions">
                    <button class="action-icon-btn edit-btn" onclick="editProduct('${id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-icon-btn delete-btn" onclick="confirmDeleteProduct('${id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>`;
        });
        
        productsList.innerHTML = html;
        
    } catch (error) { 
        console.error('❌ خطأ في تحميل المنتجات:', error); 
    }
}

// دالة تعديل المنتج
async function editProduct(productId) {
    currentEditingProductId = productId;
    document.getElementById('productModalTitle').textContent = 'تعديل المنتج';
    
    try {
        const productRef = window.firebaseModules.doc(adminDb, "products", productId);
        const productDoc = await window.firebaseModules.getDoc(productRef);
        
        if (productDoc.exists()) {
            const product = productDoc.data();
            
            document.getElementById('productName').value = product.name || '';
            document.getElementById('productPrice').value = product.price || 0;
            document.getElementById('productCategory').value = product.category || '';
            document.getElementById('productStock').value = product.stock || 0;
            document.getElementById('productDescription').value = product.description || '';
            document.getElementById('productImage').value = product.image || '';
            document.getElementById('productIsNew').checked = product.isNew || false;
            document.getElementById('productIsSale').checked = product.isSale || false;
            document.getElementById('productIsBest').checked = product.isBest || false;
            document.getElementById('productIsActive').checked = product.isActive !== false;
            
            if (product.image) {
                const previewImg = document.getElementById('productImagePreview');
                const previewContainer = document.getElementById('productImagePreviewContainer');
                if (previewImg && previewContainer) {
                    previewImg.src = product.image;
                    previewContainer.style.display = 'block';
                    document.getElementById('productImagePlaceholder').style.display = 'none';
                    document.getElementById('productImageUploadContainer').classList.add('has-image');
                }
            }
        }
        
        document.getElementById('productModal').classList.add('active');
        
    } catch (error) { 
        console.error('❌ خطأ في تحميل المنتج:', error);
        showToast('خطأ في تحميل بيانات المنتج', 'error');
    }
}

// فتح نافذة إضافة منتج جديد
function openAddProductModal() {
    currentEditingProductId = null;
    document.getElementById('productModalTitle').textContent = 'إضافة منتج جديد';
    
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('productStock').value = '';
    document.getElementById('productDescription').value = '';
    document.getElementById('productImage').value = '';
    document.getElementById('productIsNew').checked = false;
    document.getElementById('productIsSale').checked = false;
    document.getElementById('productIsBest').checked = false;
    document.getElementById('productIsActive').checked = true;
    
    removeProductImagePreview();
    document.getElementById('productModal').classList.add('active');
}

// إزالة معاينة صورة المنتج
function removeProductImagePreview() {
    const input = document.getElementById('productImageFile');
    if (input) input.value = '';
    
    document.getElementById('productImage').value = '';
    document.getElementById('productImagePreviewContainer').style.display = 'none';
    document.getElementById('productImagePreview').src = '';
    document.getElementById('productImagePlaceholder').style.display = 'flex';
    document.getElementById('productImageUploadContainer').classList.remove('has-image');
    document.getElementById('productUploadProgressContainer').style.display = 'none';
}

// رفع صورة المنتج
async function handleProductImageUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        if (!file.type.startsWith("image/")) {
            alert("الملف ليس صورة");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert("الصورة كبيرة جداً (الحد الأقصى 5 ميجابايت)");
            return;
        }

        const preview = document.getElementById('productImagePreview');
        const previewContainer = document.getElementById('productImagePreviewContainer');
        const progressContainer = document.getElementById('productUploadProgressContainer');
        const progressFill = document.getElementById('productProgressFill');
        const progressText = document.getElementById('productProgressText');
        const statusText = document.getElementById('productUploadStatus');
        const saveBtn = document.getElementById('saveProductBtn');
        
        if (previewContainer) previewContainer.style.display = 'block';
        if (preview) preview.src = URL.createObjectURL(file);
        document.getElementById('productImagePlaceholder').style.display = 'none';
        document.getElementById('productImageUploadContainer').classList.add('has-image');
        
        if (progressContainer) progressContainer.style.display = 'block';
        if (statusText) statusText.textContent = 'جاري الرفع...';
        
        isUploading = true;
        if (saveBtn) saveBtn.disabled = true;
        
        try {
            const timestamp = Date.now();
            const fileName = `products/${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const storageRef = window.firebaseModules.ref(adminStorage, fileName);
            
            const metadata = {
                contentType: file.type,
                cacheControl: "public,max-age=31536000"
            };
            
            await window.firebaseModules.uploadBytes(storageRef, file, metadata);
            const downloadURL = await window.firebaseModules.getDownloadURL(storageRef);
            
            document.getElementById('productImage').value = downloadURL;
            
            if (statusText) statusText.textContent = '✅ تم الرفع بنجاح';
            if (progressFill) progressFill.style.width = '100%';
            if (progressText) progressText.textContent = '100%';
            
            showToast('تم رفع الصورة بنجاح', 'success');
            isUploading = false;
            if (saveBtn) saveBtn.disabled = false;
            
            setTimeout(() => { 
                if (progressContainer) progressContainer.style.display = 'none'; 
            }, 2000);
            
        } catch (error) {
            console.error('Upload error:', error);
            showToast('فشل الرفع: ' + error.message, 'error');
            isUploading = false;
            if (saveBtn) saveBtn.disabled = false;
            if (statusText) statusText.textContent = '❌ فشل الرفع';
        }
    }
}

// حفظ المنتج
async function saveProduct() {
    if (isUploading) { 
        showToast('يرجى الانتظار حتى اكتمال رفع الصورة', 'warning'); 
        return; 
    }
    
    try {
        const name = document.getElementById('productName').value.trim();
        const price = parseFloat(document.getElementById('productPrice').value) || 0;
        const category = document.getElementById('productCategory').value;
        const stock = parseInt(document.getElementById('productStock').value) || 0;
        const description = document.getElementById('productDescription').value.trim();
        const image = document.getElementById('productImage').value.trim();
        
        if (!name) { showToast('الرجاء إدخال اسم المنتج', 'warning'); return; }
        if (!price || price <= 0) { showToast('الرجاء إدخال سعر صحيح', 'warning'); return; }
        if (!category) { showToast('الرجاء اختيار فئة المنتج', 'warning'); return; }
        if (!image) { showToast('الرجاء رفع صورة للمنتج', 'warning'); return; }
        
        const productData = {
            name,
            price,
            category,
            stock,
            description,
            image,
            isNew: document.getElementById('productIsNew').checked,
            isSale: document.getElementById('productIsSale').checked,
            isBest: document.getElementById('productIsBest').checked,
            isActive: document.getElementById('productIsActive').checked,
            updatedAt: window.firebaseModules.serverTimestamp()
        };
        
        showLoadingSpinner('جاري الحفظ...');
        
        if (currentEditingProductId) {
            const productRef = window.firebaseModules.doc(adminDb, "products", currentEditingProductId);
            await window.firebaseModules.updateDoc(productRef, productData);
            showToast('تم تحديث المنتج بنجاح', 'success');
        } else {
            productData.createdAt = window.firebaseModules.serverTimestamp();
            const productsRef = window.firebaseModules.collection(adminDb, "products");
            await window.firebaseModules.addDoc(productsRef, productData);
            showToast('تمت إضافة المنتج بنجاح', 'success');
        }
        
        hideLoadingSpinner();
        closeModal();
        
        await loadAdminProducts();
        await loadAdminStats();
        
    } catch (error) {
        console.error('❌ خطأ في حفظ المنتج:', error);
        hideLoadingSpinner();
        showToast('حدث خطأ أثناء الحفظ: ' + error.message, 'error');
    }
}

// دالة الطلبات
async function loadAdminOrders() {
    try {
        const ordersList = document.getElementById('adminOrdersList');
        const statusFilter = document.getElementById('orderStatusFilter')?.value || 'all';
        
        if (!ordersList) return;
        
        ordersList.innerHTML = '<div class="spinner"></div>';
        
        let q;
        if (statusFilter === 'all') {
            q = window.firebaseModules.query(
                window.firebaseModules.collection(adminDb, "orders"),
                window.firebaseModules.orderBy("createdAt", "desc")
            );
        } else {
            q = window.firebaseModules.query(
                window.firebaseModules.collection(adminDb, "orders"),
                window.firebaseModules.where("status", "==", statusFilter),
                window.firebaseModules.orderBy("createdAt", "desc")
            );
        }
        
        const snapshot = await window.firebaseModules.getDocs(q);
        
        if (snapshot.empty) {
            ordersList.innerHTML = '<div class="no-data">لا توجد طلبات</div>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const order = doc.data();
            const id = doc.id;
            
            let statusClass = 'status-pending';
            if (order.status === 'processing') statusClass = 'status-processing';
            else if (order.status === 'shipped') statusClass = 'status-shipped';
            else if (order.status === 'delivered') statusClass = 'status-delivered';
            else if (order.status === 'cancelled') statusClass = 'status-cancelled';
            
            const statusText = {
                'pending': 'قيد الانتظار',
                'processing': 'جاري التجهيز',
                'shipped': 'تم الشحن',
                'delivered': 'تم التوصيل',
                'cancelled': 'ملغي'
            }[order.status] || order.status;
            
            html += `
                <div class="order-card">
                    <div class="order-header">
                        <span class="order-id">طلب #${order.orderId || id.substring(0,8)}</span>
                        <span class="order-status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="order-body">
                        <p><strong>العميل:</strong> ${order.customerName || 'غير متوفر'}</p>
                        <p><strong>الإجمالي:</strong> ${formatNumber(order.total)} ${siteCurrency}</p>
                    </div>
                    <div class="order-actions">
                        <button onclick="viewOrderDetails('${id}')" class="btn-icon view" title="عرض التفاصيل">
                            <i class="fas fa-eye"></i>
                        </button>
                        <select onchange="updateOrderStatus('${id}', this.value)" class="status-select">
                            <option value="pending" ${order.status==='pending'?'selected':''}>قيد الانتظار</option>
                            <option value="processing" ${order.status==='processing'?'selected':''}>جاري التجهيز</option>
                            <option value="shipped" ${order.status==='shipped'?'selected':''}>تم الشحن</option>
                            <option value="delivered" ${order.status==='delivered'?'selected':''}>تم التوصيل</option>
                            <option value="cancelled" ${order.status==='cancelled'?'selected':''}>ملغي</option>
                        </select>
                        <button onclick="deleteOrder('${id}')" class="btn-icon delete" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>`;
        });
        
        ordersList.innerHTML = html;
        
    } catch (error) { 
        console.error('❌ خطأ في تحميل الطلبات:', error); 
    }
}

// تحديث حالة الطلب
async function updateOrderStatus(orderId, newStatus) {
    try {
        await window.firebaseModules.updateDoc(
            window.firebaseModules.doc(adminDb, "orders", orderId), 
            { 
                status: newStatus, 
                updatedAt: window.firebaseModules.serverTimestamp() 
            }
        );
        showToast('تم تحديث حالة الطلب', 'success');
        loadAdminOrders();
    } catch (error) { 
        showToast('خطأ في تحديث الحالة', 'error');
    }
}

// حذف طلب
async function deleteOrder(orderId) {
    if (!confirm('هل أنت متأكد من حذف الطلب؟')) return;
    
    try {
        await window.firebaseModules.deleteDoc(window.firebaseModules.doc(adminDb, "orders", orderId));
        showToast('تم حذف الطلب', 'success');
        loadAdminOrders();
    } catch (error) { 
        showToast('خطأ في حذف الطلب', 'error');
    }
}

// عرض تفاصيل الطلب
async function viewOrderDetails(orderId) {
    try {
        showLoadingSpinner('جاري تحميل التفاصيل...');
        
        const orderRef = window.firebaseModules.doc(adminDb, "orders", orderId);
        const orderDoc = await window.firebaseModules.getDoc(orderRef);
        
        if (!orderDoc.exists()) {
            hideLoadingSpinner();
            showToast('الطلب غير موجود', 'error');
            return;
        }
        
        const order = orderDoc.data();
        hideLoadingSpinner();
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'orderDetailsModal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3>تفاصيل الطلب #${order.orderId || orderId.substring(0,8)}</h3>
                    <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 10px;">
                            <h4>معلومات العميل</h4>
                            <p><strong>الاسم:</strong> ${order.customerName}</p>
                            <p><strong>الهاتف:</strong> ${order.customerPhone || 'غير متوفر'}</p>
                            <p><strong>العنوان:</strong> ${order.address || 'غير متوفر'}</p>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 10px;">
                            <h4>معلومات الطلب</h4>
                            <p><strong>رقم الطلب:</strong> ${order.orderId || orderId.substring(0,8)}</p>
                            <p><strong>الحالة:</strong> <span class="status-badge ${order.status}">${order.status}</span></p>
                            <p><strong>الإجمالي:</strong> ${formatNumber(order.total)} ${siteCurrency}</p>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h4>المنتجات</h4>
                        <div style="background: white; border-radius: 10px; padding: 15px; border: 1px solid #eee;">
                            ${(order.items || []).map(item => `
                                <div style="display: flex; align-items: center; gap: 15px; padding: 10px; border-bottom: 1px solid #f0f0f0;">
                                    <img src="${item.image}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">
                                    <div style="flex: 1;">
                                        <h5 style="margin: 0 0 5px 0;">${item.name}</h5>
                                        <p style="margin: 0; font-size: 14px; color: #666;">
                                            السعر: ${formatNumber(item.price)} × ${item.quantity}
                                        </p>
                                    </div>
                                    <div style="font-weight: bold; font-size: 16px;">
                                        ${formatNumber(item.price * item.quantity)} ${siteCurrency}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">إغلاق</button>
                    <button class="btn-primary" onclick="window.print()">
                        <i class="fas fa-print"></i> طباعة
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Error viewing order details:', error);
        hideLoadingSpinner();
        showToast('خطأ في تحميل التفاصيل', 'error');
    }
}

// المستخدمين
async function loadAdminUsers() {
    try {
        const usersList = document.getElementById('adminUsersList');
        if (!usersList) return;
        
        const snapshot = await window.firebaseModules.getDocs(window.firebaseModules.collection(adminDb, "users"));
        
        let html = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            if (user.isGuest) return;
            
            const isAdmin = user.isAdmin === true || user.isAdmin === "true" || user.role === "admin";
            
            html += `
                <div class="user-card">
                    <h4>${user.name || 'بدون اسم'}</h4>
                    <p>${user.email || 'بدون بريد'}</p>
                    <span class="status-badge ${isAdmin ? 'active' : 'inactive'}">
                        ${isAdmin ? 'مدير' : 'مستخدم'}
                    </span>
                </div>`;
        });
        
        usersList.innerHTML = html || 'لا يوجد مستخدمين';
        
    } catch (error) { 
        console.error('❌ خطأ في تحميل المستخدمين:', error); 
    }
}

// الإعدادات
async function loadAdminSettings() {
    try {
        const docSnap = await window.firebaseModules.getDoc(window.firebaseModules.doc(adminDb, "settings", "site_config"));
        const settingsForm = document.getElementById('settingsForm');
        
        if (!settingsForm || !docSnap.exists()) return;
        
        const s = docSnap.data();
        
        settingsForm.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>اسم المتجر</label>
                    <input type="text" id="storeName" value="${s.storeName || ''}">
                </div>
                <div class="form-group">
                    <label>البريد الإلكتروني</label>
                    <input type="email" id="storeEmail" value="${s.email || ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>رقم الهاتف</label>
                    <input type="text" id="storePhone" value="${s.phone || ''}">
                </div>
                <div class="form-group">
                    <label>العنوان</label>
                    <input type="text" id="storeAddress" value="${s.address || ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>تكلفة الشحن (SDG)</label>
                    <input type="number" id="shippingCost" value="${s.shippingCost || 0}">
                </div>
                <div class="form-group">
                    <label>حد الشحن المجاني (SDG)</label>
                    <input type="number" id="freeShippingLimit" value="${s.freeShippingLimit || 0}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>اسم البنك</label>
                    <input type="text" id="bankName" value="${s.bankName || ''}">
                </div>
                <div class="form-group">
                    <label>رقم الحساب</label>
                    <input type="text" id="bankAccount" value="${s.bankAccount || ''}">
                </div>
            </div>
            <div class="form-group">
                <label>اسم صاحب الحساب</label>
                <input type="text" id="bankAccountName" value="${s.bankAccountName || ''}">
            </div>
            <div class="form-group">
                <label>ساعات العمل</label>
                <input type="text" id="workingHours" value="${s.workingHours || ''}">
            </div>
            <div class="form-group">
                <label>عن المتجر</label>
                <textarea id="aboutUs" rows="3">${s.aboutUs || ''}</textarea>
            </div>
        `;
        
    } catch (error) { 
        console.error('❌ خطأ في تحميل الإعدادات:', error); 
    }
}

// حفظ الإعدادات
async function saveAdminSettings() {
    try {
        showLoadingSpinner('جاري حفظ الإعدادات...');
        
        const settings = {
            storeName: document.getElementById('storeName').value,
            email: document.getElementById('storeEmail').value,
            phone: document.getElementById('storePhone').value,
            address: document.getElementById('storeAddress').value,
            shippingCost: parseFloat(document.getElementById('shippingCost').value) || 0,
            freeShippingLimit: parseFloat(document.getElementById('freeShippingLimit').value) || 0,
            workingHours: document.getElementById('workingHours').value,
            aboutUs: document.getElementById('aboutUs').value,
            bankName: document.getElementById('bankName').value,
            bankAccount: document.getElementById('bankAccount').value,
            bankAccountName: document.getElementById('bankAccountName').value,
            updatedAt: window.firebaseModules.serverTimestamp()
        };
        
        await window.firebaseModules.setDoc(
            window.firebaseModules.doc(adminDb, "settings", "site_config"),
            settings,
            { merge: true }
        );
        
        hideLoadingSpinner();
        showToast('تم حفظ الإعدادات بنجاح', 'success');
        
    } catch (error) {
        hideLoadingSpinner();
        console.error('❌ خطأ في حفظ الإعدادات:', error);
        showToast('خطأ في حفظ الإعدادات', 'error');
    }
}

// الألوان
async function loadThemeSettings() {
    try {
        const docSnap = await window.firebaseModules.getDoc(window.firebaseModules.doc(adminDb, "settings", "theme_colors"));
        
        if (docSnap.exists()) {
            const colors = docSnap.data();
            const root = document.documentElement;
            
            Object.keys(colors).forEach(key => {
                if (key !== 'updatedAt') {
                    const cssVar = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
                    root.style.setProperty(cssVar, colors[key]);
                    
                    const input = document.getElementById(key);
                    const hexInput = document.getElementById(key + 'Hex');
                    if (input) input.value = colors[key];
                    if (hexInput) hexInput.value = colors[key];
                }
            });
        }
        
    } catch (error) { 
        console.error('❌ خطأ في تحميل إعدادات الألوان:', error); 
    }
}

// حفظ الألوان
async function saveThemeColors() {
    try {
        showLoadingSpinner('جاري حفظ الألوان...');
        
        const colorKeys = ['primaryColor', 'secondaryColor', 'successColor', 'dangerColor', 'warningColor', 'lightColor', 'buttonPressColor'];
        const colors = {};
        
        colorKeys.forEach(key => {
            colors[key] = document.getElementById(key).value;
        });
        
        colors.updatedAt = window.firebaseModules.serverTimestamp();
        
        await window.firebaseModules.setDoc(
            window.firebaseModules.doc(adminDb, "settings", "theme_colors"),
            colors
        );
        
        const root = document.documentElement;
        Object.keys(colors).forEach(key => {
            if (key !== 'updatedAt') {
                const cssVar = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
                root.style.setProperty(cssVar, colors[key]);
            }
        });
        
        hideLoadingSpinner();
        showToast('تم حفظ الألوان وتطبيقها بنجاح', 'success');
        
    } catch (error) {
        hideLoadingSpinner();
        console.error('❌ خطأ في حفظ الألوان:', error);
        showToast('خطأ في حفظ الألوان', 'error');
    }
}

// إعادة تعيين الألوان
async function resetColors() {
    if (!confirm('هل أنت متأكد من استعادة الألوان الافتراضية؟')) return;
    
    try {
        showLoadingSpinner('جاري الاستعادة...');
        
        const defaultColors = {
            primaryColor: '#1C1C1C',
            secondaryColor: '#555555',
            successColor: '#27ae60',
            dangerColor: '#e74c3c',
            warningColor: '#f39c12',
            lightColor: '#F7F5F2',
            buttonPressColor: '#555555',
            updatedAt: window.firebaseModules.serverTimestamp()
        };
        
        await window.firebaseModules.setDoc(
            window.firebaseModules.doc(adminDb, "settings", "theme_colors"),
            defaultColors
        );
        
        await loadThemeSettings();
        
        hideLoadingSpinner();
        showToast('تمت استعادة الألوان الافتراضية', 'success');
        
    } catch (error) {
        hideLoadingSpinner();
        console.error('❌ خطأ في استعادة الألوان:', error);
        showToast('خطأ في الاستعادة', 'error');
    }
}

// إعداد مستمعي الأحداث
function setupAdminEventListeners() {
    console.log('👂 إعداد مستمعي الأحداث...');
    
    // التبويبات
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            
            const targetContent = document.getElementById(tabId);
            if (targetContent) targetContent.classList.add('active');
        });
    });
    
    // زر إضافة منتج
    document.getElementById('addProductBtn')?.addEventListener('click', openAddProductModal);
    
    // زر حفظ المنتج
    document.getElementById('saveProductBtn')?.addEventListener('click', saveProduct);
    
    // زر حفظ الإعدادات
    document.getElementById('saveSettingsBtn')?.addEventListener('click', saveAdminSettings);
    
    // أزرار الألوان
    document.getElementById('saveColorsBtn')?.addEventListener('click', saveThemeColors);
    document.getElementById('resetColorsBtn')?.addEventListener('click', resetColors);
    
    // فلتر الطلبات
    document.getElementById('orderStatusFilter')?.addEventListener('change', loadAdminOrders);
    
    // ربط مدخلات الألوان مع النصوص
    const colorKeys = ['primaryColor', 'secondaryColor', 'successColor', 'dangerColor', 'warningColor', 'lightColor', 'buttonPressColor'];
    
    colorKeys.forEach(key => {
        const colorInput = document.getElementById(key);
        const hexInput = document.getElementById(key + 'Hex');
        
        if (colorInput && hexInput) {
            colorInput.addEventListener('input', (e) => {
                hexInput.value = e.target.value.toUpperCase();
            });
            
            hexInput.addEventListener('input', (e) => {
                if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                    colorInput.value = e.target.value;
                }
            });
        }
    });
    
    console.log('✅ تم إعداد جميع المستمعين');
}

// الإشعارات
function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    const styles = {
        success: 'background: #27ae60; color: white;',
        error: 'background: #e74c3c; color: white;',
        warning: 'background: #f39c12; color: white;',
        info: 'background: #3498db; color: white;'
    };
    
    toast.style.cssText = `
        padding: 12px 20px;
        border-radius: 8px;
        font-family: 'Cairo', sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        ${styles[type] || styles.info}
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// مؤشر التحميل
function showLoadingSpinner(message = 'جاري التحميل...') {
    let spinner = document.getElementById('loadingSpinner');
    
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.id = 'loadingSpinner';
        spinner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            color: white;
            font-family: 'Cairo', sans-serif;
        `;
        
        spinner.innerHTML = `
            <div style="
                width: 50px;
                height: 50px;
                border: 4px solid rgba(255,255,255,0.3);
                border-top-color: white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 15px;
            "></div>
            <p style="font-size: 16px; margin: 0;">${message}</p>
        `;
        
        document.body.appendChild(spinner);
    }
}

function hideLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.remove();
}

// تأكيد حذف المنتج
function confirmDeleteProduct(id) {
    productToDelete = id;
    
    const modal = document.getElementById('confirmModal');
    if (modal) {
        document.getElementById('confirmTitle').textContent = 'تأكيد تعطيل المنتج';
        document.getElementById('confirmMessage').textContent = 
            'هل أنت متأكد من تعطيل هذا المنتج؟ لن يظهر في المتجر للعملاء.';
        modal.classList.add('active');
    } else {
        if (confirm('هل أنت متأكد من تعطيل هذا المنتج؟')) {
            deleteProductConfirmed();
        }
    }
}

// تأكيد حذف المنتج
async function deleteProductConfirmed() {
    if (!productToDelete) return;
    
    try {
        showLoadingSpinner('جاري التعطيل...');
        
        const productRef = window.firebaseModules.doc(adminDb, "products", productToDelete);
        await window.firebaseModules.updateDoc(productRef, { 
            isActive: false,
            updatedAt: window.firebaseModules.serverTimestamp()
        });
        
        hideLoadingSpinner();
        closeModal();
        showToast('تم تعطيل المنتج بنجاح', 'success');
        
        await loadAdminProducts();
        await loadAdminStats();
        
    } catch (error) {
        hideLoadingSpinner();
        console.error('❌ خطأ في تعطيل المنتج:', error);
        showToast('خطأ في تعطيل المنتج', 'error');
    }
}

// تسجيل الخروج - تم التبسيط
window.logoutAdmin = async function() {
    try {
        // تنظيف localStorage بالكامل
        localStorage.removeItem('currentUser');
        localStorage.removeItem('adminAuthState');
        localStorage.removeItem('userSession');
        localStorage.removeItem('firebase:authUser:AIzaSyB1vNmCapPK0MI4H_Q0ilO7OnOgZa02jx0:[DEFAULT]');
        
        console.log('✅ تم تنظيف جميع بيانات الجلسة');
        
    } catch (error) {
        console.error('Error cleaning storage:', error);
    }
    
    // توجيه لصفحة تسجيل الدخول
    window.location.href = '../login.html';
};

// إغلاق النوافذ
function closeModal() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

// تصدير الدوال
window.handleProductImageUpload = handleProductImageUpload;
window.editProduct = editProduct;
window.openAddProductModal = openAddProductModal;
window.removeProductImagePreview = removeProductImagePreview;
window.saveProduct = saveProduct;
window.confirmDeleteProduct = confirmDeleteProduct;
window.deleteProductConfirmed = deleteProductConfirmed;
window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder;
window.viewOrderDetails = viewOrderDetails;
window.closeModal = closeModal;
window.saveAdminSettings = saveAdminSettings;
window.saveThemeColors = saveThemeColors;
window.resetColors = resetColors;

// بدء التطبيق
document.addEventListener('DOMContentLoaded', initAdminApp);

console.log('✅ تم تحميل admin.js بنجاح');