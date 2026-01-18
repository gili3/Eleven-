// admin.js - النسخة النهائية المحسنة مع نظام عرض الصور والطلبات المرقمة

console.log('🚀 بدء تحميل لوحة تحكم Queen Beauty');

function formatNumber(num) {
    if (num === null || num === undefined) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

let adminDb = null;
let adminStorage = null;
let siteCurrency = 'SDG';
let currentEditingProductId = null;
let productToDelete = null;
let lastOrderNumber = 11001000;
let isUploading = false;

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
            logoUrl: 'https://i.ibb.co/N6Bfb1KW/file-00000000e020720cbb1ddc5fc4577270.png',
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

async function initAdminApp() {
    console.log('🔧 تهيئة لوحة التحكم...');
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) {
        showToast('يجب تسجيل الدخول أولاً', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }
    try {
        const userData = JSON.parse(savedUser);
        if (userData.isGuest) {
            showToast('الضيوف لا يمكنهم الدخول للوحة التحكم', 'error');
            setTimeout(() => window.location.href = 'index.html', 2000);
            return;
        }
        if (!userData.isAdmin && userData.role !== 'admin') {
            showToast('ليس لديك صلاحيات الدخول للوحة التحكم', 'error');
            setTimeout(() => window.location.href = 'index.html', 2000);
            return;
        }
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
            adminApp = window.firebaseModules.getApp('AdminApp');
        } catch (e) {
            try {
                adminApp = window.firebaseModules.initializeApp(firebaseConfig, 'AdminApp');
            } catch (e2) {
                adminApp = window.firebaseModules.initializeApp(firebaseConfig);
            }
        }
        adminDb = window.firebaseModules.getFirestore(adminApp);
        adminStorage = window.firebaseModules.getStorage(adminApp);
        const connectionSuccess = await checkFirestoreConnection();
        if (!connectionSuccess) throw new Error('فشل الاتصال بقاعدة البيانات');
        await loadLastOrderNumber();
        setupAdminEventListeners();
        loadAdminDashboard().catch(e => console.error('Dashboard load error:', e));
        try { setupOrderNotificationsListener(); } catch(e) { console.error('Notif listener error:', e); }
        console.log('🎉 لوحة التحكم جاهزة');
    } catch (error) {
        console.error('❌ خطأ في التهيئة:', error);
        showToast('حدث خطأ في تحميل لوحة التحكم: ' + error.message, 'error');
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
    try {
        await Promise.all([
            loadAdminStats(),
            loadAdminProducts(),
            loadAdminOrders(),
            loadAdminUsers(),
            loadAdminSettings(),
            loadThemeSettings()
        ]);
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات:', error);
    }
}

async function loadAdminStats() {
    try {
        const usersSnapshot = await window.firebaseModules.getDocs(window.firebaseModules.collection(adminDb, "users"));
        const regularUsers = usersSnapshot.docs.filter(doc => !doc.data().isGuest).length;
        document.getElementById('adminUsersCount').textContent = formatNumber(regularUsers);
        
        const productsQuery = window.firebaseModules.query(window.firebaseModules.collection(adminDb, "products"), window.firebaseModules.where("isActive", "==", true));
        const productsSnapshot = await window.firebaseModules.getDocs(productsQuery);
        document.getElementById('adminProductsCount').textContent = formatNumber(productsSnapshot.size);
        
        const ordersSnapshot = await window.firebaseModules.getDocs(window.firebaseModules.collection(adminDb, "orders"));
        let totalSales = 0, completedOrders = 0, pendingOrders = 0;
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            if (order.status === 'delivered') { completedOrders++; totalSales += parseFloat(order.total || 0); }
            if (order.status === 'pending') pendingOrders++;
        });
        document.getElementById('adminCompletedOrdersCount').textContent = formatNumber(completedOrders);
        document.getElementById('adminTotalSales').textContent = formatNumber(totalSales) + ' ' + siteCurrency;
    } catch (error) { console.error('❌ خطأ في الإحصائيات:', error); }
}

async function loadAdminProducts() {
    try {
        const productsList = document.getElementById('adminProductsList');
        if (!productsList) return;
        productsList.innerHTML = '<div class="spinner"></div>';
        const productsRef = window.firebaseModules.collection(adminDb, "products");
        const q = window.firebaseModules.query(productsRef, window.firebaseModules.orderBy("createdAt", "desc"));
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
                    <div class="admin-product-image"><img src="${product.image || ''}" onerror="this.src='https://via.placeholder.com/80'"></div>
                    <div class="admin-product-info">
                        <h4>${product.name || 'بدون اسم'}</h4>
                        <p>${formatNumber(product.price || 0)} ${siteCurrency}</p>
                        <div class="product-status"><span class="status-badge ${isActive ? 'active' : 'inactive'}">${isActive ? 'نشط' : 'غير نشط'}</span></div>
                    </div>
                    <div class="admin-product-actions">
                        <button class="action-icon-btn edit-btn" onclick="editProduct('${id}')"><i class="fas fa-edit"></i></button>
                        <button class="action-icon-btn delete-btn" onclick="confirmDeleteProduct('${id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`;
        });
        productsList.innerHTML = html;
    } catch (error) { console.error('❌ خطأ في تحميل المنتجات:', error); }
}

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
    } catch (error) { console.error('❌ خطأ في تحميل المنتج:', error); }
    document.getElementById('productModal').classList.add('active');
}

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

async function handleProductImageUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // التحقق من الملف قبل الرفع
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
        const placeholder = document.getElementById('productImagePlaceholder');
        if (placeholder) placeholder.style.display = 'none';
        const uploadContainer = document.getElementById('productImageUploadContainer');
        if (uploadContainer) uploadContainer.classList.add('has-image');
        if (progressContainer) progressContainer.style.display = 'block';
        if (statusText) statusText.textContent = 'جاري الرفع...';
        
        isUploading = true;
        if (saveBtn) saveBtn.disabled = true;
        
        try {
            const timestamp = Date.now();
            const path = `products/${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const storageRef = window.firebaseModules.ref(adminStorage, path);
            
            // Metadata إلزامي لمتصفح Chrome لضمان استقرار الرفع
            const metadata = {
                contentType: file.type,
                cacheControl: "public,max-age=31536000"
            };
            
            console.log('🚀 بدء الرفع المباشر لمتصفح Chrome:', file.name, file.type);
            
            // استخدام uploadBytes مباشرة لضمان التوافق مع Chrome
            await window.firebaseModules.uploadBytes(storageRef, file, metadata);
            const downloadURL = await window.firebaseModules.getDownloadURL(storageRef);
            
            const productImageInput = document.getElementById('productImage');
            if (productImageInput) productImageInput.value = downloadURL;
            
            if (statusText) statusText.textContent = '✅ تم الرفع بنجاح';
            if (progressFill) progressFill.style.width = '100%';
            if (progressText) progressText.textContent = '100%';
            
            showToast('تم رفع الصورة بنجاح', 'success');
            isUploading = false;
            if (saveBtn) saveBtn.disabled = false;
            setTimeout(() => { if (progressContainer) progressContainer.style.display = 'none'; }, 2000);
            
        } catch (error) {
            console.error('Upload error:', error);
            showToast('فشل الرفع: ' + error.message, 'error');
            isUploading = false;
            if (saveBtn) saveBtn.disabled = false;
            if (statusText) statusText.textContent = '❌ فشل الرفع';
        }
    }
}

async function saveProduct() {
    console.log('💾 محاولة حفظ المنتج...');
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
        
        console.log('📊 بيانات المنتج المستخرجة:', { name, price, category, image });

        // التحقق من الحقول المطلوبة
        if (!name) { showToast('الرجاء إدخال اسم المنتج', 'warning'); return; }
        if (!price || price <= 0) { showToast('الرجاء إدخال سعر صحيح', 'warning'); return; }
        if (!category) { showToast('الرجاء اختيار فئة المنتج', 'warning'); return; }
        if (!image) { 
            showToast('الرجاء رفع صورة للمنتج أولاً', 'warning'); 
            return; 
        }

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
            console.log('📝 تحديث منتج موجود:', currentEditingProductId);
            const productRef = window.firebaseModules.doc(adminDb, "products", currentEditingProductId);
            await window.firebaseModules.updateDoc(productRef, productData);
            showToast('تم تحديث المنتج بنجاح', 'success');
        } else {
            console.log('➕ إضافة منتج جديد');
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

async function loadAdminOrders() {
    try {
        const ordersList = document.getElementById('adminOrdersList');
        const statusFilter = document.getElementById('orderStatusFilter')?.value || 'all';
        if (!ordersList) return;
        ordersList.innerHTML = '<div class="spinner"></div>';
        let q = window.firebaseModules.query(window.firebaseModules.collection(adminDb, "orders"), window.firebaseModules.orderBy("createdAt", "desc"));
        if (statusFilter !== 'all') q = window.firebaseModules.query(window.firebaseModules.collection(adminDb, "orders"), window.firebaseModules.where("status", "==", statusFilter), window.firebaseModules.orderBy("createdAt", "desc"));
        const snapshot = await window.firebaseModules.getDocs(q);
        if (snapshot.empty) { ordersList.innerHTML = '<div class="no-data">لا توجد طلبات</div>'; return; }
        let html = '';
        snapshot.forEach(doc => {
            const order = doc.data();
            const id = doc.id;
            const statusClass = order.status === 'delivered' ? 'status-delivered' : 'status-pending';
            html += `
                <div class="order-card">
                    <div class="order-header">
                        <span class="order-id">طلب #${order.orderId || id.substring(0,8)}</span>
                        <span class="order-status-badge ${statusClass}">${order.status}</span>
                    </div>
                    <div class="order-body">
                        <p><strong>العميل:</strong> ${order.customerName}</p>
                        <p><strong>الإجمالي:</strong> ${formatNumber(order.total)} ${siteCurrency}</p>
                    </div>
                    <div class="order-actions">
                        <button onclick="viewOrderDetails('${id}')" class="btn-icon view" title="عرض التفاصيل"><i class="fas fa-eye"></i></button>
                        <select onchange="updateOrderStatus('${id}', this.value)" class="status-select">
                            <option value="pending" ${order.status==='pending'?'selected':''}>قيد الانتظار</option>
                            <option value="processing" ${order.status==='processing'?'selected':''}>جاري التجهيز</option>
                            <option value="shipped" ${order.status==='shipped'?'selected':''}>تم الشحن</option>
                            <option value="delivered" ${order.status==='delivered'?'selected':''}>تم التوصيل</option>
                            <option value="cancelled" ${order.status==='cancelled'?'selected':''}>ملغي</option>
                        </select>
                        <button onclick="deleteOrder('${id}')" class="btn-icon delete" title="حذف"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`;
        });
        ordersList.innerHTML = html;
    } catch (error) { console.error(error); }
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        await window.firebaseModules.updateDoc(window.firebaseModules.doc(adminDb, "orders", orderId), { status: newStatus, updatedAt: window.firebaseModules.serverTimestamp() });
        showToast('تم تحديث الحالة', 'success');
        loadAdminOrders();
    } catch (error) { showToast('خطأ في التحديث', 'error'); }
}

async function deleteOrder(orderId) {
    if (!confirm('هل أنت متأكد من حذف الطلب؟')) return;
    try {
        await window.firebaseModules.deleteDoc(window.firebaseModules.doc(adminDb, "orders", orderId));
        showToast('تم حذف الطلب', 'success');
        loadAdminOrders();
    } catch (error) { showToast('خطأ في الحذف', 'error'); }
}

async function loadAdminUsers() {
    try {
        const usersList = document.getElementById('adminUsersList');
        if (!usersList) return;
        const snapshot = await window.firebaseModules.getDocs(window.firebaseModules.collection(adminDb, "users"));
        let html = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            if (user.isGuest) return;
            html += `<div class="user-card"><h4>${user.name}</h4><p>${user.email}</p></div>`;
        });
        usersList.innerHTML = html || 'لا يوجد مستخدمين';
    } catch (error) { console.error(error); }
}

async function loadAdminSettings() {
    try {
        const docSnap = await window.firebaseModules.getDoc(window.firebaseModules.doc(adminDb, "settings", "site_config"));
        const settingsForm = document.getElementById('settingsForm');
        if (!settingsForm) return;
        
        if (docSnap.exists()) {
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
                
                <div class="form-group">
                    <label>شعار المتجر</label>
                    <div class="image-upload-container" id="logoUploadContainer" onclick="document.getElementById('logoInput').click()">
                        <div class="image-placeholder" id="logoPlaceholder" style="${s.logoUrl ? 'display:none' : ''}">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <span>اضغط لرفع الشعار</span>
                        </div>
                        <div class="image-preview-container" id="logoPreviewContainer" style="${s.logoUrl ? 'display:block' : ''}">
                            <img src="${s.logoUrl || ''}" id="logoPreview" onerror="this.src='https://via.placeholder.com/150?text=Logo'">
                        </div>
                        <div class="upload-progress-container" id="logoProgressContainer">
                            <div class="progress-bar-bg">
                                <div class="progress-bar-fill" id="logoProgressFill"></div>
                            </div>
                            <div class="progress-status" id="logoProgressStatus">0%</div>
                        </div>
                    </div>
                    <input type="file" id="logoInput" class="hidden-input" accept="image/*" onchange="handleLogoUpload(this)">
                    <input type="hidden" id="logoUrl" value="${s.logoUrl || ''}">
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
        }
    } catch (error) { console.error('Error loading settings:', error); }
}

async function handleLogoUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    // التحقق من الملف قبل الرفع
    if (!file.type.startsWith("image/")) {
        alert("الملف ليس صورة");
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        alert("شعار المتجر يجب أن يكون أقل من 2 ميجابايت");
        return;
    }

    const container = document.getElementById('logoUploadContainer');
    const placeholder = document.getElementById('logoPlaceholder');
    const previewContainer = document.getElementById('logoPreviewContainer');
    const preview = document.getElementById('logoPreview');
    const progressContainer = document.getElementById('logoProgressContainer');
    const progressFill = document.getElementById('logoProgressFill');
    const progressStatus = document.getElementById('logoProgressStatus');
    const logoUrlInput = document.getElementById('logoUrl');

    if (preview) preview.src = URL.createObjectURL(file);
    if (previewContainer) previewContainer.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
    if (progressContainer) progressContainer.style.display = 'block';

    try {
        isUploading = true;
        const timestamp = Date.now();
        const fileName = `logo_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const storageRef = window.firebaseModules.ref(adminStorage, `settings/${fileName}`);
        
        // Metadata إلزامي لمتصفح Chrome لضمان استقرار الرفع
        const metadata = {
            contentType: file.type,
            cacheControl: "public,max-age=31536000"
        };
        
        console.log('🚀 بدء رفع الشعار المباشر لمتصفح Chrome:', file.name);
        
        // استخدام uploadBytes مباشرة لضمان التوافق مع Chrome
        await window.firebaseModules.uploadBytes(storageRef, file, metadata);
        const downloadURL = await window.firebaseModules.getDownloadURL(storageRef);
        
        if (logoUrlInput) logoUrlInput.value = downloadURL;
        showToast('تم رفع الشعار بنجاح', 'success');
        isUploading = false;
        if (progressContainer) progressContainer.style.display = 'none';
        if (container) container.classList.add('has-image');
        
    } catch (error) {
        console.error('Logo upload error:', error);
        showToast('فشل رفع الشعار: ' + error.message, 'error');
        isUploading = false;
    }
}

async function saveAdminSettings() {
    try {
        showLoadingSpinner('جاري حفظ الإعدادات...');
        const s = {
            storeName: document.getElementById('storeName').value,
            email: document.getElementById('storeEmail').value,
            phone: document.getElementById('storePhone').value,
            address: document.getElementById('storeAddress').value,
            shippingCost: parseFloat(document.getElementById('shippingCost').value) || 0,
            freeShippingLimit: parseFloat(document.getElementById('freeShippingLimit').value) || 0,
            logoUrl: document.getElementById('logoUrl').value,
            bankName: document.getElementById('bankName').value,
            bankAccount: document.getElementById('bankAccount').value,
            bankAccountName: document.getElementById('bankAccountName').value,
            workingHours: document.getElementById('workingHours').value,
            aboutUs: document.getElementById('aboutUs').value,
            updatedAt: window.firebaseModules.serverTimestamp()
        };
        await window.firebaseModules.setDoc(window.firebaseModules.doc(adminDb, "settings", "site_config"), s, { merge: true });
        hideLoadingSpinner();
        showToast('تم حفظ الإعدادات بنجاح', 'success');
    } catch (error) { 
        hideLoadingSpinner();
        console.error('Error saving settings:', error);
        showToast('خطأ في الحفظ: ' + error.message, 'error'); 
    }
}

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
                    
                    // تحديث المدخلات في الواجهة إذا كانت موجودة
                    const input = document.getElementById(key);
                    const hexInput = document.getElementById(key + 'Hex');
                    if (input) input.value = colors[key];
                    if (hexInput) hexInput.value = colors[key];
                }
            });
        }
    } catch (error) { console.error('Error loading theme settings:', error); }
}

async function saveThemeColors() {
    try {
        showLoadingSpinner('جاري حفظ الألوان...');
        const colorKeys = ['primaryColor', 'secondaryColor', 'successColor', 'dangerColor', 'warningColor', 'lightColor', 'buttonPressColor'];
        const colors = {};
        colorKeys.forEach(key => {
            colors[key] = document.getElementById(key).value;
        });
        colors.updatedAt = window.firebaseModules.serverTimestamp();
        
        await window.firebaseModules.setDoc(window.firebaseModules.doc(adminDb, "settings", "theme_colors"), colors);
        
        // تطبيق الألوان فوراً
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
        showToast('خطأ في حفظ الألوان', 'error');
    }
}

function setupOrderNotificationsListener() {
    if (!adminDb) return;
    window.firebaseModules.onSnapshot(window.firebaseModules.collection(adminDb, "notifications"), (snapshot) => {
        snapshot.docChanges().forEach(change => {
            if (change.type === "added" && !change.doc.data().read) {
                showToast('تنبيه: طلب جديد!', 'warning');
            }
        });
    });
}

function setupAdminEventListeners() {
    console.log('👂 إعداد مستمعي الأحداث...');
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
    
    // زر إضافة منتج جديد
    const addProductBtn = document.getElementById('addProductBtn') || document.querySelector('.add-product-btn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', openAddProductModal);
    }
    
    // زر حفظ المنتج
    document.getElementById('saveProductBtn')?.addEventListener('click', saveProduct);
    
    // إعدادات أخرى
    document.getElementById('saveSettingsBtn')?.addEventListener('click', saveAdminSettings);
    document.getElementById('saveColorsBtn')?.addEventListener('click', saveThemeColors);
    document.getElementById('resetColorsBtn')?.addEventListener('click', window.resetColors);
    document.getElementById('orderStatusFilter')?.addEventListener('change', loadAdminOrders);
    
    // ربط مدخلات الألوان
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
}

function closeModal() { document.querySelectorAll('.modal').forEach(m => m.classList.remove('active')); }

function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div'); container.id = 'toastContainer';
        container.style.cssText = 'position:fixed;top:20px;left:20px;z-index:10000;display:flex;flex-direction:column;gap:10px;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `background:${type==='success'?'#27ae60':type==='error'?'#e74c3c':'#3498db'};color:white;padding:12px 20px;border-radius:8px;font-family:Cairo;`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showLoadingSpinner(m) {
    const s = document.createElement('div'); s.id = 'loadingSpinner';
    s.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;justify-content:center;align-items:center;z-index:9999;color:white;';
    s.innerHTML = `<p>${m}</p>`; document.body.appendChild(s);
}
function hideLoadingSpinner() { document.getElementById('loadingSpinner')?.remove(); }

function confirmDeleteProduct(id) {
    productToDelete = id;
    const modal = document.getElementById('confirmModal');
    if (modal) {
        document.getElementById('confirmTitle').textContent = 'تأكيد تعطيل المنتج';
        document.getElementById('confirmMessage').textContent = 'هل أنت متأكد من تعطيل هذا المنتج؟ لن يظهر في المتجر للعملاء.';
        modal.classList.add('active');
    } else {
        if (confirm('هل أنت متأكد من تعطيل هذا المنتج؟')) {
            window.deleteProductConfirmed();
        }
    }
}

window.handleProductImageUpload = handleProductImageUpload;
window.handleLogoUpload = handleLogoUpload;
window.editProduct = editProduct;
window.logoutAdmin = function() {
    localStorage.removeItem('currentUser');
    window.location.href = '../index.html';
};
window.confirmDeleteProduct = confirmDeleteProduct;
window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder;
window.saveProduct = saveProduct;
window.closeModal = closeModal;
window.saveAdminSettings = saveAdminSettings;
window.saveThemeColors = saveThemeColors;
window.resetColors = async function() {
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
        await window.firebaseModules.setDoc(window.firebaseModules.doc(adminDb, "settings", "theme_colors"), defaultColors);
        await loadThemeSettings();
        hideLoadingSpinner();
        showToast('تمت استعادة الألوان الافتراضية', 'success');
    } catch (error) {
        hideLoadingSpinner();
        showToast('خطأ في الاستعادة', 'error');
    }
};
window.openAddProductModal = openAddProductModal;
window.closeModal = closeModal;
window.removeProductImagePreview = removeProductImagePreview;
window.deleteProductConfirmed = async function() {
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
        loadAdminProducts();
        loadAdminStats();
    } catch (error) {
        hideLoadingSpinner();
        showToast('خطأ في التعطيل', 'error');
    }
};

window.viewOrderDetails = async function(orderId) {
    try {
        showLoadingSpinner('جاري تحميل تفاصيل الطلب...');
        const orderRef = window.firebaseModules.doc(adminDb, "orders", orderId);
        const orderDoc = await window.firebaseModules.getDoc(orderRef);
        
        if (!orderDoc.exists()) {
            hideLoadingSpinner();
            showToast('الطلب غير موجود', 'error');
            return;
        }
        
        const order = orderDoc.data();
        hideLoadingSpinner();
        
        // إنشاء نافذة منبثقة لعرض التفاصيل
        let modal = document.getElementById('orderDetailsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'orderDetailsModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        
        const itemsHtml = (order.items || []).map(item => `
            <div style="display: flex; align-items: center; gap: 10px; padding: 10px; border-bottom: 1px solid #eee;">
                <img src="${item.image}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;">
                <div style="flex: 1;">
                    <h5 style="margin: 0;">${item.name}</h5>
                    <p style="margin: 0; font-size: 12px; color: #666;">${formatNumber(item.price)} x ${item.quantity}</p>
                </div>
                <div style="font-weight: bold;">${formatNumber(item.price * item.quantity)}</div>
            </div>
        `).join('');
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>تفاصيل الطلب #${order.orderId || orderId.substring(0,8)}</h3>
                    <button class="close-modal" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 10px;">
                        <div>
                            <p><strong>العميل:</strong> ${order.customerName}</p>
                            <p><strong>الهاتف:</strong> ${order.customerPhone || 'غير متوفر'}</p>
                            <p><strong>العنوان:</strong> ${order.address || 'غير متوفر'}</p>
                        </div>
                        <div>
                            <p><strong>الحالة:</strong> <span class="status-badge ${order.status}">${order.status}</span></p>
                            <p><strong>التاريخ:</strong> ${order.createdAt ? new Date(order.createdAt).toLocaleString('ar-EG') : 'غير متوفر'}</p>
                            <p><strong>الإجمالي:</strong> ${formatNumber(order.total)} ${siteCurrency}</p>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h4>المنتجات</h4>
                        ${itemsHtml}
                    </div>
                    
                    ${order.receiptImage ? `
                        <div style="margin-top: 20px;">
                            <h4>إيصال الدفع</h4>
                            <a href="${order.receiptImage}" target="_blank">
                                <img src="${order.receiptImage}" style="width: 100%; border-radius: 10px; border: 1px solid #ddd; cursor: pointer;" title="اضغط للتكبير">
                            </a>
                        </div>
                    ` : '<p style="color: #e74c3c;">لا يوجد إيصال دفع مرفق</p>'}
                    
                    ${order.notes ? `
                        <div style="margin-top: 20px; background: #fff3cd; padding: 10px; border-radius: 5px;">
                            <strong>ملاحظات:</strong> ${order.notes}
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal()">إغلاق</button>
                    <button class="btn-primary" onclick="window.print()">طباعة الطلب</button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    } catch (error) {
        console.error('Error viewing order details:', error);
        hideLoadingSpinner();
        showToast('خطأ في تحميل التفاصيل', 'error');
    }
};

document.addEventListener('DOMContentLoaded', initAdminApp);
