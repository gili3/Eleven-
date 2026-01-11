// admin.js - النسخة النهائية المحسنة مع نظام عرض الصور والطلبات المرقمة

console.log('🚀 بدء تحميل لوحة تحكم Queen Beauty');

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

let adminDb = null;
let adminStorage = null;
let siteCurrency = 'SDG';
let currentEditingProductId = null;
let productToDelete = null;
let lastOrderNumber = 11001000; // الرقم الأولي للطلبات الجديد

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
            lastOrderNumber: 11001000, // تخزين آخر رقم طلب الجديد
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
        console.log('👤 بيانات المستخدم:', userData);
        
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
            // محاولة الحصول على التطبيق إذا كان موجوداً بالفعل لتجنب خطأ التكرار
            adminApp = window.firebaseModules.getApp('AdminApp');
        } catch (e) {
            adminApp = window.firebaseModules.initializeApp(firebaseConfig, 'AdminApp');
        }
        adminDb = window.firebaseModules.getFirestore(adminApp);
        adminStorage = window.firebaseModules.getStorage(adminApp);
        console.log('✅ Firebase مهيأ');
        
        const connectionSuccess = await checkFirestoreConnection();
        if (!connectionSuccess) {
            throw new Error('فشل الاتصال بقاعدة البيانات');
        }
        
        await loadLastOrderNumber(); // تحميل آخر رقم طلب
        
        setupAdminEventListeners();
        await loadAdminDashboard();
        setupOrderNotificationsListener();
        
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
            console.log('🔢 آخر رقم طلب محمل:', lastOrderNumber);
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل آخر رقم طلب:', error);
        lastOrderNumber = 11001000;
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
        console.log('🔢 تم تحديث رقم الطلب الجديد:', lastOrderNumber);
    } catch (error) {
        console.error('❌ خطأ في تحديث رقم الطلب:', error);
    }
    
    return lastOrderNumber;
}

async function loadAdminDashboard() {
    try {
        console.log('📊 تحميل البيانات...');
        
        await Promise.all([
            loadAdminStats(),
            loadAdminProducts(),
            loadAdminOrders(),
            loadAdminUsers(),
            loadAdminSettings(),
            loadThemeSettings(),
            loadButtonPressColorSettings()
        ]);
        
        console.log('✅ تم تحميل جميع البيانات');
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات:', error);
        showToast('حدث خطأ في تحميل البيانات', 'error');
    }
}

async function loadAdminStats() {
    try {
        console.log('📈 جاري تحميل الإحصائيات...');
        
        // 1. عدد المستخدمين (باستثناء الضيوف)
        const usersSnapshot = await window.firebaseModules.getDocs(
            window.firebaseModules.collection(adminDb, "users")
        );
        
        const regularUsers = usersSnapshot.docs.filter(doc => {
            const data = doc.data();
            return !data.isGuest;
        }).length;
        
        document.getElementById('adminUsersCount').textContent = formatNumber(regularUsers);
        
        // 2. عدد المنتجات المتوفرة (isActive == true)
        const productsQuery = window.firebaseModules.query(
            window.firebaseModules.collection(adminDb, "products"),
            window.firebaseModules.where("isActive", "==", true)
        );
        
        const productsSnapshot = await window.firebaseModules.getDocs(productsQuery);
        document.getElementById('adminProductsCount').textContent = formatNumber(productsSnapshot.size);
        
        // 3. إحصائيات الطلبات والمبيعات
        const ordersSnapshot = await window.firebaseModules.getDocs(
            window.firebaseModules.collection(adminDb, "orders")
        );
        
        let totalSales = 0;
        let completedOrders = 0;
        let pendingOrders = 0;
        
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            
            // الطلبات المكتملة (delivered)
            if (order.status === 'delivered') {
                completedOrders++;
                totalSales += parseFloat(order.total || 0);
            }
            
            if (order.status === 'pending') {
                pendingOrders++;
            }
        });
        
        document.getElementById('adminCompletedOrdersCount').textContent = formatNumber(completedOrders);
        document.getElementById('adminTotalSales').textContent = formatNumber(totalSales) + ' ' + siteCurrency;
        
        // تحديث الحاوية المتقدمة بتصميم مبسط
        const statsContainer = document.getElementById('advancedStatsContainer');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div style="margin-top: 30px; padding: 20px; background: #fff; border-radius: 12px; border: 1px solid var(--border-color);">
                    <h4 style="margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-info-circle" style="color: var(--secondary-color);"></i>
                        نظرة عامة إضافية
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                        <div style="padding: 15px; background: var(--light-color); border-radius: 8px; text-align: center;">
                            <span style="display: block; font-size: 20px; font-weight: 700; color: var(--warning-color);">${pendingOrders}</span>
                            <span style="font-size: 12px; color: var(--gray-color);">طلبات قيد الانتظار</span>
                        </div>
                        <div style="padding: 15px; background: var(--light-color); border-radius: 8px; text-align: center;">
                            <span style="display: block; font-size: 20px; font-weight: 700; color: var(--primary-color);">${ordersSnapshot.size}</span>
                            <span style="font-size: 12px; color: var(--gray-color);">إجمالي الطلبات</span>
                        </div>
                        <div style="padding: 15px; background: var(--light-color); border-radius: 8px; text-align: center; display: none;">
                            <span style="display: block; font-size: 20px; font-weight: 700; color: var(--secondary-color);">NO:${lastOrderNumber}</span>
                            <span style="font-size: 12px; color: var(--gray-color);">آخر رقم طلب</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('❌ خطأ في تحميل الإحصائيات:', error);
    }
}

async function loadAdminProducts() {
    try {
        console.log('📦 جاري تحميل المنتجات...');
        
        const productsList = document.getElementById('adminProductsList');
        if (!productsList) {
            console.error('❌ عنصر قائمة المنتجات غير موجود');
            return;
        }
        
        productsList.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="width: 40px; height: 40px; border: 4px solid #ddd; border-top-color: var(--secondary-color); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                <p style="color: var(--gray-color);">جاري تحميل المنتجات...</p>
            </div>
        `;
        
        const productsQuery = window.firebaseModules.query(
            window.firebaseModules.collection(adminDb, "products"),
            window.firebaseModules.orderBy("createdAt", "desc")
        );
        
        const snapshot = await window.firebaseModules.getDocs(productsQuery);
        console.log('📥 عدد المنتجات المستلمة:', snapshot.size);
        
        if (snapshot.empty) {
            console.log('⚠️ لا توجد منتجات');
            productsList.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-box-open fa-3x" style="color: var(--gray-color); margin-bottom: 20px;"></i>
                    <h3 style="color: var(--primary-color); margin-bottom: 10px;">لا توجد منتجات</h3>
                    <p style="color: var(--gray-color); margin-bottom: 20px;">قم بإضافة منتج جديد</p>
                    <button class="btn-primary" onclick="openAddProductModal()" 
                            style="padding: 12px 25px; background: var(--secondary-color); color: white; border: none; border-radius: 10px; font-family: 'Cairo'; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-plus"></i> إضافة منتج جديد
                    </button>
                </div>
            `;
            return;
        }
        
        let productsHTML = '';
        snapshot.forEach(doc => {
            const product = doc.data();
            const productId = doc.id;
            
            console.log('📝 معالجة منتج:', product.name);
            
            const isNew = product.isNew === true;
            const isSale = product.isSale === true;
            const isBest = product.isBest === true;
            const isActive = product.isActive !== false;
            
            productsHTML += `
                <div class="admin-product-card" data-id="${productId}">
                    <div class="admin-product-image">
                        <img src="${product.image || 'https://via.placeholder.com/80x80'}" 
                             alt="${product.name}"
                             onerror="this.src='https://via.placeholder.com/80x80'">
                    </div>
                    <div class="admin-product-info">
                        <h4>${product.name || 'بدون اسم'}</h4>
                        <p style="color: var(--gray-color); font-size: 12px; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 34px;">
                            ${product.description || 'لا يوجد وصف للمنتج'}
                        </p>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 10px;">
                            <p><i class="fas fa-tag"></i> ${product.category || 'بدون فئة'}</p>
                            <p><i class="fas fa-box"></i> ${formatNumber(product.stock || 0)} قطعة</p>
                        </div>
                        <p style="font-size: 18px; font-weight: 700; color: var(--secondary-color); margin-bottom: 10px;">
                            ${formatNumber(product.price || 0)} ${siteCurrency}
                        </p>
                        <div class="product-status">
                            <span class="status-badge ${isActive ? 'active' : 'inactive'}">
                                ${isActive ? 'نشط' : 'غير نشط'}
                            </span>
                            ${isNew ? '<span class="status-badge new">جديد</span>' : ''}
                            ${isSale ? '<span class="status-badge sale">عرض</span>' : ''}
                            ${isBest ? '<span class="status-badge best">الأفضل</span>' : ''}
                        </div>
                    </div>
                    <div class="admin-product-actions">
                        <button class="action-icon-btn edit-btn" onclick="editProduct('${productId}')" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-icon-btn delete-btn" onclick="confirmDeleteProduct('${productId}')" title="تعطيل">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        productsList.innerHTML = productsHTML;
        console.log('✅ تم تحميل المنتجات بنجاح');
        
    } catch (error) {
        console.error('❌ خطأ في تحميل المنتجات:', error);
        document.getElementById('adminProductsList').innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <i class="fas fa-exclamation-triangle fa-3x" style="color: var(--danger-color); margin-bottom: 20px;"></i>
                <h3 style="color: var(--primary-color); margin-bottom: 10px;">خطأ في تحميل المنتجات</h3>
                <p style="color: var(--gray-color); margin-bottom: 20px;">${error.message}</p>
                <button class="btn-primary" onclick="loadAdminProducts()" 
                        style="padding: 12px 25px; background: var(--secondary-color); color: white; border: none; border-radius: 10px; font-family: 'Cairo'; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-redo"></i> إعادة المحاولة
                </button>
            </div>
        `;
    }
}

async function loadAdminUsers() {
    try {
        console.log('👥 جاري تحميل المستخدمين...');
        
        const usersList = document.getElementById('adminUsersList');
        if (!usersList) return;
        
        const snapshot = await window.firebaseModules.getDocs(
            window.firebaseModules.collection(adminDb, "users")
        );
        
        console.log('📥 عدد المستخدمين المستلم:', snapshot.size);
        
        if (snapshot.empty) {
            usersList.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-users fa-3x" style="color: var(--gray-color); margin-bottom: 20px;"></i>
                    <h3 style="color: var(--primary-color);">لا يوجد مستخدمين</h3>
                </div>
            `;
            return;
        }
        
        let usersHTML = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            const userId = doc.id;
            
            if (user.isGuest) return;
            
            const joinDate = user.createdAt?.toDate ? 
                user.createdAt.toDate().toLocaleDateString('ar-SA') : 'غير محدد';
            
            const userType = user.isAdmin ? '👑 مسؤول' : '👤 مستخدم عادي';
            const userTypeClass = user.isAdmin ? 'admin-user' : 'regular-user';
            
            usersHTML += `
                <div class="user-card ${userTypeClass}" data-id="${userId}">
                    <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                        <img src="${user.photoURL || 'https://i.ibb.co/nNx4v1x5/images-1.png'}" 
                             alt="صورة المستخدم"
                             style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 5px 0; color: var(--primary-color);">${user.name || 'بدون اسم'}</h4>
                            <p style="margin: 0 0 5px 0; color: var(--gray-color);"><i class="fas fa-envelope"></i> ${user.email || 'بدون بريد'}</p>
                            <p style="margin: 0 0 10px 0; color: ${user.isAdmin ? 'var(--secondary-color)' : 'var(--primary-color)'}; font-weight: bold;">
                                ${userType}
                            </p>
                            <div style="display: flex; gap: 15px; margin: 10px 0; flex-wrap: wrap;">
                                <span style="color: var(--gray-color);"><i class="fas fa-shopping-cart"></i> ${user.totalOrders || 0} طلبات</span>
                                <span style="color: var(--gray-color);"><i class="fas fa-money-bill-wave"></i> ${user.totalSpent || 0} ${siteCurrency}</span>
                            </div>
                            <p style="margin: 0; color: var(--gray-color); font-size: 14px;"><i class="fas fa-calendar-alt"></i> ${joinDate}</p>
                        </div>
                    </div>
                </div>
            `;
        });
        
        usersList.innerHTML = usersHTML;
        console.log('✅ تم تحميل المستخدمين بنجاح');
        
    } catch (error) {
        console.error('❌ خطأ في تحميل المستخدمين:', error);
        usersList.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <i class="fas fa-exclamation-triangle" style="color: var(--danger-color); font-size: 40px; margin-bottom: 15px;"></i>
                <h4 style="color: var(--primary-color);">حدث خطأ في تحميل المستخدمين</h4>
                <button class="btn-primary" onclick="loadAdminUsers()" 
                        style="padding: 10px 20px; background: var(--secondary-color); color: white; border: none; border-radius: 8px; margin-top: 10px; font-family: 'Cairo';">
                    إعادة المحاولة
                </button>
            </div>
        `;
    }
}

async function loadAdminOrders() {
    try {
        console.log('🛒 جاري تحميل الطلبات...');
        const ordersList = document.getElementById('adminOrdersList');
        const statusFilter = document.getElementById('orderStatusFilter')?.value || 'all';
        
        if (!ordersList) return;

        ordersList.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="width: 40px; height: 40px; border: 4px solid #ddd; border-top-color: var(--secondary-color); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                <p style="color: var(--gray-color);">جاري تحميل الطلبات...</p>
            </div>
        `;

        let ordersQuery = window.firebaseModules.query(
            window.firebaseModules.collection(adminDb, "orders"),
            window.firebaseModules.orderBy("createdAt", "desc")
        );

        if (statusFilter !== 'all') {
            ordersQuery = window.firebaseModules.query(
                window.firebaseModules.collection(adminDb, "orders"),
                window.firebaseModules.where("status", "==", statusFilter),
                window.firebaseModules.orderBy("createdAt", "desc")
            );
        }

        const snapshot = await window.firebaseModules.getDocs(ordersQuery);
        
        if (snapshot.empty) {
            ordersList.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-shopping-basket fa-3x" style="color: var(--gray-color); margin-bottom: 20px;"></i>
                    <h3 style="color: var(--primary-color);">لا توجد طلبات حالياً</h3>
                </div>
            `;
            return;
        }

        let ordersHTML = '';
        snapshot.forEach(doc => {
            const order = doc.data();
            const orderDocId = doc.id;
            let date = 'غير محدد';
            try {
                if (order.createdAt) {
                    const dateObj = order.createdAt.seconds ? new Date(order.createdAt.seconds * 1000) : new Date(order.createdAt);
                    date = dateObj.toLocaleString('ar-EG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
            } catch (e) { console.error("Error formatting date:", e); }
            
            const statusText = {
                'pending': 'قيد الانتظار',
                'paid': 'تم الدفع',
                'processing': 'يتم التجهيز',
                'shipped': 'تم الشحن',
                'delivered': 'تم التوصيل',
                'cancelled': 'ملغي'
            }[order.status] || order.status;
            
            const statusClass = {
                'pending': 'status-pending',
                'paid': 'status-processing',
                'processing': 'status-processing',
                'shipped': 'status-shipped',
                'delivered': 'status-delivered',
                'cancelled': 'status-cancelled'
            }[order.status] || 'status-pending';
            
            // استخدام الرقم الجديد للطلب
            const orderNumber = order.orderId || `NO:${311000 + (parseInt(orderDocId.substring(0, 8), 16) % 1000)}`;
            
            ordersHTML += `
                <div class="order-card" id="order-${orderDocId}">
                    <div class="order-header">
                        <div>
                            <span class="order-id">طلب ${orderNumber}</span>
                            <span class="order-date">${date}</span>
                        </div>
                        <span class="order-status-badge ${statusClass}">
                            ${statusText}
                        </span>
                    </div>
                    <div class="order-body">
                        <div class="order-info">
                            <h5>بيانات العميل</h5>
                            <p><strong>الاسم:</strong> ${order.customerName || 'غير معروف'}</p>
                            <p><strong>الهاتف:</strong> ${order.customerPhone || 'غير محدد'}</p>
                            <p><strong>العنوان:</strong> ${order.address || 'غير محدد'}</p>
                            ${order.notes ? `<p><strong>ملاحظات:</strong> ${order.notes}</p>` : ''}
                        </div>
                        <div class="order-items">
                            <h5>المنتجات (${order.items?.length || 0})</h5>
                            ${(order.items || []).map(item => `
                                <div class="order-item-row">
                                    <span>${item.name} × ${item.quantity || 1}</span>
                                    <span>${formatNumber((item.price || 0) * (item.quantity || 1))} ${siteCurrency}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="receipt-section" style="margin: 15px 0; padding: 15px; background: var(--light-color); border-radius: 10px; border: 1px solid var(--border-color);">
                        <h5 style="margin-bottom: 10px;">إيصال التحويل</h5>
                        ${order.receiptImage ? `
                            <div style="display: flex; align-items: flex-start; gap: 15px; flex-wrap: wrap;">
                                <img src="${order.receiptImage}" 
                                     alt="إيصال التحويل" 
                                     style="width: 150px; height: 150px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 2px solid var(--secondary-color);"
                                     onclick="showFullImage('${order.receiptImage}')"
                                     onerror="this.style.display='none'">
                                <div>
                                    <p style="margin: 5px 0;"><strong>اسم الملف:</strong> ${order.receiptFileName || 'إيصال'}</p>
                                    <p style="margin: 5px 0;"><strong>نوع الملف:</strong> ${order.receiptFileType || 'غير معروف'}</p>
                                    <p style="margin: 5px 0;"><strong>حجم الملف:</strong> ${formatFileSize(order.receiptFileSize || 0)}</p>
                                    <div style="display: flex; gap: 10px; margin-top: 10px;">
                                        <button onclick="showFullImage('${order.receiptImage}')" 
                                                class="btn-secondary" 
                                                style="padding: 8px 15px; font-size: 14px;">
                                            <i class="fas fa-expand"></i> عرض كامل
                                        </button>
                                        <button onclick="downloadImage('${order.receiptImage}', 'إيصال_${orderNumber}.jpg')" 
                                                class="btn-primary" 
                                                style="padding: 8px 15px; font-size: 14px;">
                                            <i class="fas fa-download"></i> تحميل
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ` : `
                            <div style="text-align: center; padding: 20px;">
                                <i class="fas fa-exclamation-circle fa-2x" style="color: var(--danger-color); margin-bottom: 10px;"></i>
                                <p style="color: var(--danger-color); margin: 0;">لا يوجد إيصال مرفق</p>
                            </div>
                        `}
                    </div>
                    
                    <div class="order-footer">
                        <div class="order-total">الإجمالي: ${formatNumber(order.total || 0)} ${siteCurrency}</div>
                        <div class="order-actions">
                            <select class="status-select" onchange="updateOrderStatus('${orderDocId}', this.value)">
                                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
                                <option value="paid" ${order.status === 'paid' ? 'selected' : ''}>تم الدفع</option>
                                <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>يتم التجهيز</option>
                                <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>تم الشحن</option>
                                <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>تم التوصيل</option>
                                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>ملغي</option>
                            </select>
                            <button class="delete-btn action-icon-btn" onclick="deleteOrder('${orderDocId}')" title="حذف الطلب">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        ordersList.innerHTML = ordersHTML;

    } catch (error) {
        console.error('❌ خطأ في تحميل الطلبات:', error);
        showToast('حدث خطأ في تحميل الطلبات', 'error');
    }
}

function showFullImage(imageSrc) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.95);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
        padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="position: relative; max-width: 90%; max-height: 90%;">
            <img src="${imageSrc}" 
                 style="max-width: 100%; max-height: 80vh; border-radius: 5px; box-shadow: 0 5px 30px rgba(0,0,0,0.5); display: block; margin: 0 auto;">
            <div style="position: absolute; top: 20px; right: 20px; display: flex; gap: 10px;">
                <button onclick="downloadImage('${imageSrc}', 'إيصال_${Date.now()}.jpg')" 
                        class="btn-primary" 
                        style="padding: 10px 15px; font-size: 14px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-download"></i>
                </button>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                        class="btn-secondary" 
                        style="padding: 10px 15px; font-size: 14px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-times"></i>
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

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        console.log(`🔄 تحديث حالة الطلب ${orderId} إلى ${newStatus}`);
        const orderRef = window.firebaseModules.doc(adminDb, "orders", orderId);
        
        // جلب بيانات الطلب الحالية للتحقق من الحالة السابقة
        const orderDoc = await window.firebaseModules.getDoc(orderRef);
        if (!orderDoc.exists()) throw new Error("الطلب غير موجود");
        const orderData = orderDoc.data();
        const oldStatus = orderData.status;

        await window.firebaseModules.updateDoc(orderRef, {
            status: newStatus,
            updatedAt: window.firebaseModules.serverTimestamp()
        });

        // إرسال إشعار تغيير الحالة للعميل
        if (orderData.userId && orderData.userId !== 'guest') {
            await sendOrderStatusNotification(orderData, newStatus);
        }

        // إذا تم تغيير الحالة إلى "مدفوع" (تأكيد الطلب) ولم يكن مؤكداً من قبل
        const confirmedStatuses = ['paid', 'processing', 'shipped', 'delivered'];
        if (confirmedStatuses.includes(newStatus) && !confirmedStatuses.includes(oldStatus)) {
            // تحديث إحصائيات المستخدم
            if (orderData.userId && orderData.userId !== 'guest') {
                try {
                    const userRef = window.firebaseModules.doc(adminDb, "users", orderData.userId);
                    await window.firebaseModules.updateDoc(userRef, {
                        totalOrders: window.firebaseModules.increment(1),
                        totalSpent: window.firebaseModules.increment(orderData.total),
                        lastOrderDate: window.firebaseModules.serverTimestamp()
                    });
                } catch (e) {
                    console.error("Error updating user stats:", e);
                }
            }
        }
        
        showToast('تم تحديث حالة الطلب بنجاح', 'success');
        
        loadAdminOrders();
        loadAdminStats(); // تحديث الإحصائيات في لوحة التحكم
    } catch (error) {
        console.error('❌ خطأ في تحديث حالة الطلب:', error);
        showToast('حدث خطأ أثناء تحديث الحالة', 'error');
    }
}

async function deleteOrder(orderId) {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب نهائياً؟')) return;
    
    try {
        const orderRef = window.firebaseModules.doc(adminDb, "orders", orderId);
        await window.firebaseModules.deleteDoc(orderRef);
        
        showToast('تم حذف الطلب بنجاح', 'success');
        loadAdminOrders();
        loadAdminStats();
    } catch (error) {
        console.error('❌ خطأ في حذف الطلب:', error);
        showToast('فشل حذف الطلب', 'error');
    }
}

async function loadAdminSettings() {
    try {
        console.log('⚙️ جاري تحميل الإعدادات...');
        
        const form = document.getElementById('settingsForm');
        if (!form) return;
        
        const configRef = window.firebaseModules.doc(adminDb, "settings", "site_config");
        const configDoc = await window.firebaseModules.getDoc(configRef);
        
        let config = {};
        if (configDoc.exists()) {
            config = configDoc.data();
            console.log('📄 الإعدادات المحملة:', config);
        } else {
            console.log('⚠️ الإعدادات غير موجودة');
        }
        
        form.innerHTML = `
            <div style="margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color);">
                <h4><i class="fas fa-store"></i> معلومات المتجر</h4>
                
                <div class="form-group">
                    <label>اسم المتجر *</label>
                    <input type="text" id="storeName" value="${config.storeName || 'Queen Beauty'}" required>
                </div>
                
                <div class="form-group">
                    <label>شعار المتجر (Logo)</label>
                    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                        <input type="file" id="logoUrlFile" accept="image/*" style="display: none;" onchange="handleLogoUpload(this)">
                        <button type="button" class="btn-secondary" onclick="document.getElementById('logoUrlFile').click()" style="flex: 1;">
                            <i class="fas fa-upload"></i> رفع شعار
                        </button>
                        <input type="url" id="logoUrl" value="${config.logoUrl || 'https://i.ibb.co/N6Bfb1KW/file-00000000e020720cbb1ddc5fc4577270.png'}" placeholder="https://example.com/logo.png" style="flex: 2;">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>البريد الإلكتروني *</label>
                        <input type="email" id="email" value="${config.email || 'yxr.249@gmail.com'}" required>
                    </div>
                    <div class="form-group">
                        <label>رقم الهاتف *</label>
                        <input type="tel" id="phone" value="${config.phone || config.Phone || '+249933002015'}" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>العنوان *</label>
                    <input type="text" id="address" value="${config.address || 'السودان - الخرطوم'}" required>
                </div>
            </div>
            
            <div style="margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color);">
                <h4><i class="fas fa-truck"></i> إعدادات الشحن</h4>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>تكلفة الشحن (${siteCurrency})</label>
                        <input type="number" id="shippingCost" value="${config.shippingCost || 15}" min="0">
                    </div>
                    <div class="form-group">
                        <label>التوصيل المجاني من (${siteCurrency})</label>
                        <input type="number" id="freeShippingLimit" value="${config.freeShippingLimit || 200}" min="0">
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h4><i class="fas fa-info-circle"></i> معلومات إضافية</h4>
                <div class="form-group">
                    <label>ساعات العمل</label>
                    <input type="text" id="workingHours" value="${config.workingHours || 'من الأحد إلى الخميس: 9 صباحاً - 10 مساءً'}">
                </div>

                <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid var(--border-color);">
                    <h4><i class="fas fa-university"></i> بيانات التحويل البنكي</h4>
                    <div class="form-group">
                        <label>اسم البنك</label>
                        <input type="text" id="bankName" value="${config.bankName || 'بنك الخرطوم (بنكك)'}">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>رقم الحساب</label>
                            <input type="text" id="bankAccount" value="${config.bankAccount || '1234567'}">
                        </div>
                        <div class="form-group">
                            <label>اسم صاحب الحساب</label>
                            <input type="text" id="bankAccountName" value="${config.bankAccountName || 'متجر Eleven للعطور'}">
                        </div>
                    </div>
                </div>              
                <div class="form-group">
                    <label>وصف المتجر</label>
                    <textarea id="aboutUs" rows="3">${config.aboutUs || 'متجر متخصص في بيع العطور ومستحضرات التجميل الأصلية'}</textarea>
                </div>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h4><i class="fas fa-share-alt"></i> روابط التواصل الاجتماعي</h4>
                
                <div class="form-group">
                    <label><i class="fab fa-whatsapp"></i> رابط واتساب</label>
                    <input type="url" id="whatsappUrl" value="${config.whatsappUrl || ''}" placeholder="https://wa.me/yournumber">
                </div>
                
                <div class="form-group">
                    <label><i class="fab fa-instagram"></i> رابط انستقرام</label>
                    <input type="url" id="instagramUrl" value="${config.instagramUrl || ''}" placeholder="https://instagram.com/yourprofile">
                </div>
                
                <div class="form-group">
                    <label><i class="fab fa-facebook"></i> رابط فيسبوك</label>
                    <input type="url" id="facebookUrl" value="${config.facebookUrl || ''}" placeholder="https://facebook.com/yourpage">
                </div>
                
                <div class="form-group">
                    <label><i class="fab fa-tiktok"></i> رابط تيك توك</label>
                    <input type="url" id="tiktokUrl" value="${config.tiktokUrl || ''}" placeholder="https://tiktok.com/@youruser">
                </div>
            </div>
            
            <button type="button" id="saveSettingsBtn" class="btn-primary" style="width: 100%;">
                <i class="fas fa-save"></i> حفظ الإعدادات
            </button>
        `;
        
        document.getElementById('saveSettingsBtn').addEventListener('click', saveAdminSettings);
        console.log('✅ تم تحميل الإعدادات بنجاح');
        
    } catch (error) {
        console.error('❌ خطأ في تحميل الإعدادات:', error);
        document.getElementById('settingsForm').innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <i class="fas fa-exclamation-triangle" style="color: var(--danger-color); font-size: 40px; margin-bottom: 15px;"></i>
                <h4 style="color: var(--primary-color);">حدث خطأ في تحميل الإعدادات</h4>
                <button class="btn-primary" onclick="loadAdminSettings()" 
                        style="padding: 10px 20px; background: var(--secondary-color); color: white; border: none; border-radius: 8px; margin-top: 10px; font-family: 'Cairo';">
                    إعادة المحاولة
                </button>
            </div>
        `;
    }
}

async function saveAdminSettings() {
    try {
        console.log('💾 جاري حفظ الإعدادات...');
        
        const settings = {
            storeName: document.getElementById('storeName').value.trim(),
            logoUrl: document.getElementById('logoUrl').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            address: document.getElementById('address').value.trim(),
            shippingCost: parseFloat(document.getElementById('shippingCost').value) || 15,
            freeShippingLimit: parseFloat(document.getElementById('freeShippingLimit').value) || 200,
            workingHours: document.getElementById('workingHours').value.trim(),
            aboutUs: document.getElementById('aboutUs').value.trim(),
            whatsappUrl: document.getElementById('whatsappUrl').value.trim(),
            instagramUrl: document.getElementById('instagramUrl').value.trim(),
            facebookUrl: document.getElementById('facebookUrl').value.trim(),
            tiktokUrl: document.getElementById('tiktokUrl').value.trim(),
            bankName: document.getElementById('bankName').value.trim(),
            bankAccount: document.getElementById('bankAccount').value.trim(),
            bankAccountName: document.getElementById('bankAccountName').value.trim(),
            lastOrderNumber: lastOrderNumber, // حفظ آخر رقم طلب
            updatedAt: window.firebaseModules.serverTimestamp()
        };
        
        if (!settings.storeName || !settings.email || !settings.phone) {
            showToast('الرجاء ملء الحقول المطلوبة', 'warning');
            return;
        }
        
        if (settings.logoUrl && !settings.logoUrl.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i)) {
            showToast('رابط الشعار يجب أن يكون رابط صورة صالح', 'warning');
            return;
        }
        
        const configRef = window.firebaseModules.doc(adminDb, "settings", "site_config");
        await window.firebaseModules.setDoc(configRef, settings, { merge: true });
        
        showToast('تم حفظ الإعدادات بنجاح', 'success');
        console.log('✅ تم حفظ الإعدادات:', settings);
        
    } catch (error) {
        console.error('❌ خطأ في حفظ الإعدادات:', error);
        showToast('حدث خطأ في حفظ الإعدادات: ' + error.message, 'error');
    }
}

async function loadThemeSettings() {
    try {
        console.log('🎨 جاري تحميل إعدادات الألوان...');
        
        const themeRef = window.firebaseModules.doc(adminDb, "settings", "theme_colors");
        const themeDoc = await window.firebaseModules.getDoc(themeRef);
        
        let colors = {};
        if (themeDoc.exists()) {
            colors = themeDoc.data();
            console.log('🎨 الألوان المحملة:', colors);
        } else {
            colors = {
                primaryColor: '#1C1C1C',
                secondaryColor: '#555555',
                successColor: '#27ae60',
                dangerColor: '#e74c3c',
                warningColor: '#f39c12',
                lightColor: '#F7F5F2',
                buttonPressColor: '#555555',
                updatedAt: window.firebaseModules.serverTimestamp()
            };
        }
        
        document.getElementById('primaryColor').value = colors.primaryColor || '#1C1C1C';
        document.getElementById('primaryColorHex').value = colors.primaryColor || '#1C1C1C';
        document.getElementById('secondaryColor').value = colors.secondaryColor || '#555555';
        document.getElementById('secondaryColorHex').value = colors.secondaryColor || '#555555';
        document.getElementById('successColor').value = colors.successColor || '#27ae60';
        document.getElementById('successColorHex').value = colors.successColor || '#27ae60';
        document.getElementById('dangerColor').value = colors.dangerColor || '#e74c3c';
        document.getElementById('dangerColorHex').value = colors.dangerColor || '#e74c3c';
        document.getElementById('warningColor').value = colors.warningColor || '#f39c12';
        document.getElementById('warningColorHex').value = colors.warningColor || '#f39c12';
        document.getElementById('lightColor').value = colors.lightColor || '#F7F5F2';
        document.getElementById('lightColorHex').value = colors.lightColor || '#F7F5F2';
        document.getElementById('buttonPressColor').value = colors.buttonPressColor || '#555555';
        document.getElementById('buttonPressColorHex').value = colors.buttonPressColor || '#555555';
        
        // تطبيق الألوان المحملة على لوحة التحكم
        const root = document.documentElement;
        Object.keys(colors).forEach(key => {
            if (key !== 'updatedAt') {
                const cssVarName = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
                root.style.setProperty(cssVarName, colors[key]);
                updateColorPreview(key, colors[key]);
            }
        });

        setupColorInputEvents();
        
        console.log('✅ تم تحميل إعدادات الألوان');
        
    } catch (error) {
        console.error('❌ خطأ في تحميل إعدادات الألوان:', error);
    }
}

function setupColorInputEvents() {
    const colorInputs = [
        'primaryColor', 'secondaryColor', 'successColor', 
        'dangerColor', 'warningColor', 'lightColor', 'buttonPressColor'
    ];
    
    colorInputs.forEach(inputId => {
        const colorInput = document.getElementById(inputId);
        const hexInput = document.getElementById(inputId + 'Hex');
        
        if (colorInput && hexInput) {
            colorInput.addEventListener('input', function() {
                hexInput.value = this.value;
                updateColorPreview(inputId, this.value);
            });
            
            hexInput.addEventListener('input', function() {
                const value = this.value.trim();
                if (value.match(/^#[0-9A-F]{6}$/i)) {
                    colorInput.value = value;
                    updateColorPreview(inputId, value);
                }
            });
            
            hexInput.addEventListener('change', function() {
                const value = this.value.trim();
                if (!value.startsWith('#')) {
                    this.value = '#' + value;
                }
                if (value.match(/^#[0-9A-F]{6}$/i)) {
                    colorInput.value = this.value;
                    updateColorPreview(inputId, this.value);
                }
            });
        }
    });
    
    document.getElementById('saveColorsBtn').addEventListener('click', saveThemeColors);
    document.getElementById('resetColorsBtn').addEventListener('click', resetThemeColors);
}

function updateColorPreview(colorId, value) {
    const previewElement = document.querySelector(`.preview-${colorId.replace('Color', '')}`);
    
    // تطبيق اللون فوراً على المتغيرات في لوحة التحكم
    const root = document.documentElement;
    const cssVarName = '--' + colorId.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(cssVarName, value);

    if (previewElement) {
        previewElement.style.backgroundColor = value;
        
        if (colorId === 'lightColor') {
            const rgb = hexToRgb(value);
            const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
            previewElement.style.color = brightness > 125 ? 'var(--dark-color)' : 'white';
        }
    }
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

async function saveThemeColors() {
    try {
        console.log('💾 جاري حفظ الألوان...');
        
        const colors = {
            primaryColor: document.getElementById('primaryColorHex').value.trim(),
            secondaryColor: document.getElementById('secondaryColorHex').value.trim(),
            successColor: document.getElementById('successColorHex').value.trim(),
            dangerColor: document.getElementById('dangerColorHex').value.trim(),
            warningColor: document.getElementById('warningColorHex').value.trim(),
            lightColor: document.getElementById('lightColorHex').value.trim(),
            buttonPressColor: document.getElementById('buttonPressColorHex').value.trim(),
            updatedAt: window.firebaseModules.serverTimestamp()
        };
        
        const colorRegex = /^#[0-9A-F]{6}$/i;
        for (const [key, value] of Object.entries(colors)) {
            if (!colorRegex.test(value) && key !== 'updatedAt') {
                showToast(`اللون ${key} غير صالح (يجب أن يكون بتنسيق #RRGGBB)`, 'error');
                return;
            }
        }
        
        const themeRef = window.firebaseModules.doc(adminDb, "settings", "theme_colors");
        await window.firebaseModules.setDoc(themeRef, colors, { merge: true });
        
        showToast('تم حفظ الألوان بنجاح', 'success');
        console.log('✅ تم حفظ الألوان:', colors);
        
    } catch (error) {
        console.error('❌ خطأ في حفظ الألوان:', error);
        showToast('حدث خطأ في حفظ الألوان: ' + error.message, 'error');
    }
}

async function resetThemeColors() {
    if (!confirm('هل تريد استعادة الألوان الافتراضية؟')) return;
    
    try {
        const defaultColors = {
            primaryColor: '#1C1C1C',
            secondaryColor: '#555555',
            successColor: '#27ae60',
            dangerColor: '#e74c3c',
            warningColor: '#f39c12',
            lightColor: '#F7F5F2'
        };
        
        document.getElementById('primaryColor').value = defaultColors.primaryColor;
        document.getElementById('primaryColorHex').value = defaultColors.primaryColor;
        document.getElementById('secondaryColor').value = defaultColors.secondaryColor;
        document.getElementById('secondaryColorHex').value = defaultColors.secondaryColor;
        document.getElementById('successColor').value = defaultColors.successColor;
        document.getElementById('successColorHex').value = defaultColors.successColor;
        document.getElementById('dangerColor').value = defaultColors.dangerColor;
        document.getElementById('dangerColorHex').value = defaultColors.dangerColor;
        document.getElementById('warningColor').value = defaultColors.warningColor;
        document.getElementById('warningColorHex').value = defaultColors.warningColor;
        document.getElementById('lightColor').value = defaultColors.lightColor;
        document.getElementById('lightColorHex').value = defaultColors.lightColor;
        
        for (const [key, value] of Object.entries(defaultColors)) {
            updateColorPreview(key, value);
        }
        
        showToast('تم استعادة الألوان الافتراضية', 'success');
        
    } catch (error) {
        console.error('❌ خطأ في استعادة الألوان:', error);
        showToast('حدث خطأ في استعادة الألوان', 'error');
    }
}

function openAddProductModal() {
    currentEditingProductId = null;
    document.getElementById('productModalTitle').textContent = 'إضافة منتج جديد';
    clearProductForm();
    document.getElementById('productModal').classList.add('active');
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
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل المنتج:', error);
        showToast('حدث خطأ في تحميل بيانات المنتج', 'error');
    }
    
    document.getElementById('productModal').classList.add('active');
}

function clearProductForm() {
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('productStock').value = '';
    document.getElementById('productDescription').value = '';
    document.getElementById('productImage').value = '';
    document.getElementById('productImageFile').value = '';
    document.getElementById('productImagePreviewContainer').style.display = 'none';
    document.getElementById('productImagePreview').src = '';
    document.getElementById('productIsNew').checked = false;
    document.getElementById('productIsSale').checked = false;
    document.getElementById('productIsBest').checked = false;
    document.getElementById('productIsActive').checked = true;
}

async function handleProductImageUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const preview = document.getElementById('productImagePreview');
        const container = document.getElementById('productImagePreviewContainer');
        const progressSpan = document.getElementById('uploadProgress');
        
        container.style.display = 'block';
        preview.src = URL.createObjectURL(file);
        progressSpan.textContent = 'جاري الرفع...';
        
        try {
            const storageRef = window.firebaseModules.ref(adminStorage, `products/${Date.now()}_${file.name}`);
            const uploadTask = window.firebaseModules.uploadBytesResumable(storageRef, file);
            
            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    progressSpan.textContent = `جاري الرفع: ${Math.round(progress)}%`;
                }, 
                (error) => {
                    console.error('Upload error:', error);
                    showToast('فشل رفع الصورة', 'error');
                    progressSpan.textContent = 'فشل الرفع';
                }, 
                async () => {
                    const downloadURL = await window.firebaseModules.getDownloadURL(uploadTask.snapshot.ref);
                    document.getElementById('productImage').value = downloadURL;
                    progressSpan.textContent = '✅ تم الرفع بنجاح';
                    showToast('تم رفع الصورة بنجاح', 'success');
                }
            );
        } catch (error) {
            console.error('Error:', error);
            showToast('حدث خطأ أثناء الرفع', 'error');
        }
    }
}

async function handleLogoUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        showToast('جاري رفع الشعار...', 'info');
        
        try {
            const storageRef = window.firebaseModules.ref(adminStorage, `site/logo_${Date.now()}_${file.name}`);
            const snapshot = await window.firebaseModules.uploadBytes(storageRef, file);
            const downloadURL = await window.firebaseModules.getDownloadURL(snapshot.ref);
            
            document.getElementById('logoUrl').value = downloadURL;
            showToast('تم رفع الشعار بنجاح', 'success');
        } catch (error) {
            console.error('Logo upload error:', error);
            showToast('فشل رفع الشعار', 'error');
        }
    }
}

async function saveProduct() {
    try {
        const productData = {
            name: document.getElementById('productName').value.trim(),
            price: parseFloat(document.getElementById('productPrice').value) || 0,
            category: document.getElementById('productCategory').value,
            stock: parseInt(document.getElementById('productStock').value) || 0,
            description: document.getElementById('productDescription').value.trim(),
            image: document.getElementById('productImage').value.trim(),
            isNew: document.getElementById('productIsNew').checked,
            isSale: document.getElementById('productIsSale').checked,
            isBest: document.getElementById('productIsBest').checked,
            isActive: document.getElementById('productIsActive').checked,
            updatedAt: window.firebaseModules.serverTimestamp()
        };
        
        if (!productData.name || !productData.price || !productData.category || !productData.image) {
            showToast('الرجاء ملء جميع الحقول المطلوبة', 'warning');
            return;
        }
        
        if (!productData.image.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i)) {
            showToast('رابط الصورة يجب أن يكون رابط صورة صالح', 'warning');
            return;
        }
        
        if (currentEditingProductId) {
            const productRef = window.firebaseModules.doc(adminDb, "products", currentEditingProductId);
            await window.firebaseModules.updateDoc(productRef, productData);
            showToast('تم تحديث المنتج بنجاح', 'success');
        } else {
            productData.createdAt = window.firebaseModules.serverTimestamp();
            const productsRef = window.firebaseModules.collection(adminDb, "products");
            await window.firebaseModules.addDoc(productsRef, productData);
            showToast('تم إضافة المنتج بنجاح', 'success');
        }
        
        closeModal();
        await loadAdminProducts();
        await loadAdminStats();
        
    } catch (error) {
        console.error('❌ خطأ في حفظ المنتج:', error);
        showToast('حدث خطأ في حفظ المنتج: ' + error.message, 'error');
    }
}

function confirmDeleteProduct(productId) {
    productToDelete = productId;
    document.getElementById('confirmTitle').textContent = 'هل أنت متأكد؟';
    document.getElementById('confirmMessage').textContent = 'سيتم تعطيل المنتج وعدم عرضه في المتجر.';
    document.getElementById('confirmModal').classList.add('active');
}

async function deleteProductConfirmed() {
    if (!productToDelete) return;
    
    try {
        const productRef = window.firebaseModules.doc(adminDb, "products", productToDelete);
        await window.firebaseModules.updateDoc(productRef, {
            isActive: false,
            updatedAt: window.firebaseModules.serverTimestamp()
        });
        
        showToast('تم تعطيل المنتج بنجاح', 'success');
        closeModal();
        
        await loadAdminProducts();
        await loadAdminStats();
        
        productToDelete = null;
        
    } catch (error) {
        console.error('❌ خطأ في تعطيل المنتج:', error);
        showToast('حدث خطأ في تعطيل المنتج', 'error');
    }
}

function setupAdminEventListeners() {
    console.log('🔗 إعداد الأحداث...');
    
    setupColorInputSync();
    
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            if (!tabId) return;
            
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.admin-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const targetTab = document.getElementById(tabId);
            if (targetTab) {
                targetTab.classList.add('active');
            }
        });
    });
    
    document.getElementById('addProductBtn').addEventListener('click', openAddProductModal);
    document.getElementById('saveProductBtn').addEventListener('click', saveProduct);
    
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveAdminSettings);
    }
    
    const saveColorsBtn = document.getElementById('saveColorsBtn');
    if (saveColorsBtn) {
        saveColorsBtn.addEventListener('click', saveButtonPressColor);
    }
    
    const resetColorsBtn = document.getElementById('resetColorsBtn');
    if (resetColorsBtn) {
        resetColorsBtn.addEventListener('click', resetButtonPressColor);
    }
    
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('close-modal') || 
            e.target.classList.contains('modal') ||
            (e.target.classList.contains('btn-secondary') && e.target.textContent.includes('إلغاء'))) {
            closeModal();
        }
    });
    
    loadAdminStats();

    const orderFilter = document.getElementById('orderStatusFilter');
    if (orderFilter) {
        orderFilter.addEventListener('change', loadAdminOrders);
    }
    
    console.log('✅ الأحداث جاهزة');
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    productToDelete = null;
}

function showToast(message, type = 'info') {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `
        background: white;
        padding: 15px 20px;
        border-radius: 12px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideIn 0.3s ease;
        max-width: 300px;
        border-right: 5px solid ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--danger-color)' : type === 'warning' ? 'var(--warning-color)' : 'var(--secondary-color)'};
    `;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    else if (type === 'error') icon = 'exclamation-circle';
    else if (type === 'warning') icon = 'exclamation-triangle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}" style="color: ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--danger-color)' : type === 'warning' ? 'var(--warning-color)' : 'var(--secondary-color)'}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', initAdminApp);

async function loadButtonPressColorSettings() {
    try {
        console.log('🎨 جاري تحميل إعدادات لون الأزرار...');
        
        const settingsRef = window.firebaseModules.doc(adminDb, "settings", "theme_colors");
        const settingsSnap = await window.firebaseModules.getDoc(settingsRef);
        
        if (settingsSnap.exists()) {
            const data = settingsSnap.data();
            const buttonPressColor = data.buttonPressColor || '#555555';
            
            const buttonPressColorInput = document.getElementById('buttonPressColor');
            const buttonPressColorHex = document.getElementById('buttonPressColorHex');
            
            if (buttonPressColorInput) {
                buttonPressColorInput.value = buttonPressColor;
            }
            if (buttonPressColorHex) {
                buttonPressColorHex.value = buttonPressColor;
            }
            
            document.documentElement.style.setProperty('--button-press-color', buttonPressColor);
            
            console.log('✅ تم تحميل إعدادات لون الأزرار:', buttonPressColor);
        } else {
            console.log('⚠️ لا توجد إعدادات لون أزرار، سيتم استخدام الافتراضي');
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل إعدادات لون الأزرار:', error);
    }
}

async function saveButtonPressColor() {
    try {
        console.log('💾 جاري حفظ لون الأزرار...');
        
        const buttonPressColor = document.getElementById('buttonPressColor').value;
        
        if (!buttonPressColor) {
            showToast('يرجى اختيار لون', 'warning');
            return;
        }
        
        const settingsRef = window.firebaseModules.doc(adminDb, "settings", "theme_colors");
        
        await window.firebaseModules.setDoc(settingsRef, {
            buttonPressColor: buttonPressColor,
            updatedAt: window.firebaseModules.serverTimestamp()
        }, { merge: true });
        
        document.documentElement.style.setProperty('--button-press-color', buttonPressColor);
        
        showToast('تم حفظ لون الأزرار بنجاح', 'success');
        console.log('✅ تم حفظ لون الأزرار:', buttonPressColor);
    } catch (error) {
        console.error('❌ خطأ في حفظ لون الأزرار:', error);
        showToast('حدث خطأ في حفظ لون الأزرار: ' + error.message, 'error');
    }
}

function setupColorInputSync() {
    const colorInputs = [
        { color: 'buttonPressColor', hex: 'buttonPressColorHex' }
    ];
    
    colorInputs.forEach(({ color, hex }) => {
        const colorInput = document.getElementById(color);
        const hexInput = document.getElementById(hex);
        
        if (colorInput && hexInput) {
            colorInput.addEventListener('change', (e) => {
                hexInput.value = e.target.value;
                updateButtonPressPreview(e.target.value);
            });
            
            hexInput.addEventListener('change', (e) => {
                const value = e.target.value;
                if (/^#[0-9A-F]{6}$/i.test(value)) {
                    colorInput.value = value;
                    updateButtonPressPreview(value);
                } else {
                    showToast('صيغة اللون غير صحيحة. استخدم صيغة HEX مثل #RRGGBB', 'warning');
                    hexInput.value = colorInput.value;
                }
            });
        }
    });
}

function updateButtonPressPreview(color) {
    const preview = document.getElementById('buttonPressPreview');
    if (preview) {
        preview.style.background = color;
    }
    
    const previewButton = document.getElementById('previewButtonPress');
    if (previewButton) {
        previewButton.style.background = color;
    }
}

async function resetButtonPressColor() {
    try {
        const defaultColor = '#555555';
        
        const buttonPressColorInput = document.getElementById('buttonPressColor');
        const buttonPressColorHex = document.getElementById('buttonPressColorHex');
        
        if (buttonPressColorInput) {
            buttonPressColorInput.value = defaultColor;
        }
        if (buttonPressColorHex) {
            buttonPressColorHex.value = defaultColor;
        }
        
        updateButtonPressPreview(defaultColor);
        
        const settingsRef = window.firebaseModules.doc(adminDb, "settings", "theme_colors");
        await window.firebaseModules.setDoc(settingsRef, {
            buttonPressColor: defaultColor,
            updatedAt: window.firebaseModules.serverTimestamp()
        }, { merge: true });
        
        document.documentElement.style.setProperty('--button-press-color', defaultColor);
        
        showToast('تم استعادة لون الأزرار الافتراضي', 'success');
    } catch (error) {
        console.error('❌ خطأ في استعادة اللون الافتراضي:', error);
        showToast('حدث خطأ في استعادة اللون الافتراضي', 'error');
    }
}

function logoutAdmin() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('cart');
    localStorage.removeItem('favorites');
    window.location.href = 'index.html';
}

// ======================== نظام تنبيهات الطلبات ========================

let orderNotificationsUnsubscribe = null;

/**
 * تهيئة مستمع إشعارات الطلبات الحية
 */
function setupOrderNotificationsListener() {
    if (!adminDb) return;
    
    console.log('🔔 بدء الاستماع لإشعارات الطلبات...');
    
    const notificationsRef = window.firebaseModules.collection(adminDb, "notifications");
    
    // إلغاء الاشتراك السابق إذا وجد
    if (orderNotificationsUnsubscribe) {
        orderNotificationsUnsubscribe();
    }
    
    orderNotificationsUnsubscribe = window.firebaseModules.onSnapshot(notificationsRef, (snapshot) => {
        const newOrderCount = snapshot.docs.filter(doc => {
            const data = doc.data();
            return data.type === 'new_order' && !data.read;
        }).length;
        
        if (newOrderCount > 0) {
            showToast(`لديك ${newOrderCount} طلب جديد يحتاج للمراجعة`, 'warning');
        }
        
    }, (error) => {
        console.error('❌ خطأ في الاستماع لإشعارات الطلبات:', error);
    });
}

/**
 * إرسال إشعار تغيير حالة الطلب للعميل
 */
async function sendOrderStatusNotification(orderData, newStatus) {
    try {
        if (!adminDb || !orderData.userId || orderData.userId === 'guest') return;
        
        const statusNames = {
            'pending': 'قيد الانتظار',
            'paid': 'تم الدفع',
            'processing': 'قيد التجهيز',
            'shipped': 'تم الشحن',
            'delivered': 'تم التوصيل',
            'cancelled': 'ملغي'
        };
        
        const notificationsRef = window.firebaseModules.collection(adminDb, "notifications");
        await window.firebaseModules.addDoc(notificationsRef, {
            type: 'order_status',
            title: 'تحديث حالة طلبك',
            message: `تم تغيير حالة طلبك رقم ${orderData.orderId} إلى "${statusNames[newStatus] || newStatus}"`,
            orderId: orderData.orderId,
            userId: orderData.userId,
            read: false,
            priority: 'medium',
            createdAt: window.firebaseModules.serverTimestamp()
        });
        
        console.log('🔔 تم إرسال إشعار حالة الطلب للعميل');
        
    } catch (error) {
        console.error('❌ خطأ في إرسال إشعار حالة الطلب:', error);
    }
}

// Export functions to window object
window.openAddProductModal = openAddProductModal;
window.editProduct = editProduct;
window.confirmDeleteProduct = confirmDeleteProduct;
window.deleteProductConfirmed = deleteProductConfirmed;
window.saveProduct = saveProduct;
window.loadAdminProducts = loadAdminProducts;
window.loadAdminUsers = loadAdminUsers;
window.loadAdminSettings = loadAdminSettings;
window.loadAdminOrders = loadAdminOrders;
window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder;
window.showFullImage = showFullImage;
window.downloadImage = downloadImage;
window.closeModal = closeModal;
window.logoutAdmin = logoutAdmin;
window.saveAdminSettings = saveAdminSettings;
window.saveButtonPressColor = saveButtonPressColor;
window.resetButtonPressColor = resetButtonPressColor;
window.loadButtonPressColorSettings = loadButtonPressColorSettings;

// إضافة دالة لإنشاء رقم طلب جديد
async function generateOrderNumber() {
    const nextNumber = await getNextOrderNumber();
    return `NO:${nextNumber}`;
}