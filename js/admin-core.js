// admin-core.js - المحرك البرمجي للوحة التحكم الشاملة
// ========================================================================

/**
 * تهيئة لوحة التحكم
 */
async function initAdminPanel() {
    console.log('🛠️ بدء تهيئة لوحة التحكم الموحدة...');
    setupAdminTabs();
    await refreshAdminData();
    console.log('✅ لوحة التحكم جاهزة');
}

/**
 * إعداد التبويبات
 */
function setupAdminTabs() {
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            handleTabChange(tabId);
        });
    });
}

async function handleTabChange(tabId) {
    switch(tabId) {
        case 'dashboard': await loadAdminStats(); break;
        case 'products': await loadAdminProducts(); break;
        case 'orders': await loadAdminOrders(); break;
        case 'users': await loadAdminUsers(); break;
        case 'settings': await loadAdminSettings(); break;
    }
}

async function refreshAdminData() {
    if (typeof showLoadingSpinner === 'function') showLoadingSpinner('جاري جلب البيانات...');
    try {
        await loadAdminStats();
    } catch (e) {
        console.error("Error refreshing data:", e);
    } finally {
        if (typeof hideLoadingSpinner === 'function') hideLoadingSpinner();
    }
}

// ======================== 1. الإحصائيات ========================

async function loadAdminStats() {
    try {
        const usersSnap = await window.firebaseModules.getDocs(window.firebaseModules.collection(db, "users"));
        const productsSnap = await window.firebaseModules.getDocs(window.firebaseModules.collection(db, "products"));
        const ordersSnap = await window.firebaseModules.getDocs(
            window.firebaseModules.query(window.firebaseModules.collection(db, "orders"), window.firebaseModules.where("status", "==", "delivered"))
        );
        
        let totalSales = 0;
        ordersSnap.forEach(doc => totalSales += (doc.data().total || 0));
        
        safeElementUpdate('statUsers', usersSnap.size);
        safeElementUpdate('statProducts', productsSnap.size);
        safeElementUpdate('statOrders', ordersSnap.size);
        safeElementUpdate('statSales', formatNumber(totalSales) + ' SDG');
        
        await loadRecentOrders();
    } catch (e) { console.error("Stats Error:", e); }
}

async function loadRecentOrders() {
    const list = document.getElementById('recentOrdersList');
    if (!list) return;
    try {
        const q = window.firebaseModules.query(window.firebaseModules.collection(db, "orders"), window.firebaseModules.orderBy("createdAt", "desc"), window.firebaseModules.limit(5));
        const snap = await window.firebaseModules.getDocs(q);
        list.innerHTML = snap.empty ? '<p>لا توجد طلبات حديثة</p>' : '';
        snap.forEach(doc => {
            const o = doc.data();
            const div = document.createElement('div');
            div.className = 'admin-card';
            div.style.margin = '10px 0';
            div.innerHTML = `<strong>#${doc.id.substring(0,8)}</strong> - ${o.userName} - ${formatNumber(o.total)} SDG - <span class="status-${o.status}">${o.status}</span>`;
            list.appendChild(div);
        });
    } catch (e) { console.error(e); }
}

// ======================== 2. إدارة المنتجات ========================

async function loadAdminProducts() {
    const tbody = document.getElementById('adminProductsTableBody');
    if (!tbody) return;
    try {
        const q = window.firebaseModules.query(window.firebaseModules.collection(db, "products"), window.firebaseModules.orderBy("serverTimestamp", "desc"));
        const snap = await window.firebaseModules.getDocs(q);
        tbody.innerHTML = '';
        snap.forEach(doc => {
            const p = { id: doc.id, ...doc.data() };
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${p.image}" style="width:50px; height:50px; object-fit:cover; border-radius:5px;"></td>
                <td><strong>${p.name}</strong></td>
                <td>${p.category}</td>
                <td>${formatNumber(p.price)} SDG</td>
                <td>${p.stock || 0}</td>
                <td><span class="status-badge ${p.isActive ? 'active' : 'inactive'}">${p.isActive ? 'نشط' : 'معطل'}</span></td>
                <td>
                    <button class="action-btn btn-edit" onclick="openProductModal('${p.id}')"><i class="fas fa-edit"></i></button>
                    <button class="action-btn btn-delete" onclick="deleteProduct('${p.id}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error(e); }
}

function openProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    form.reset();
    document.getElementById('prodImagePreview').innerHTML = '<i class="fas fa-cloud-upload-alt fa-2x"></i><p>اضغط لرفع صورة</p>';
    document.getElementById('editProductId').value = productId || '';
    document.getElementById('productModalTitle').textContent = productId ? 'تعديل منتج' : 'إضافة منتج جديد';
    
    if (productId) {
        loadProductToForm(productId);
    }
    modal.classList.add('active');
}

async function loadProductToForm(id) {
    const docSnap = await window.firebaseModules.getDoc(window.firebaseModules.doc(db, "products", id));
    if (docSnap.exists()) {
        const p = docSnap.data();
        document.getElementById('prodName').value = p.name;
        document.getElementById('prodPrice').value = p.price;
        document.getElementById('prodCategory').value = p.category;
        document.getElementById('prodStock').value = p.stock || 0;
        document.getElementById('prodStatus').value = p.isActive.toString();
        document.getElementById('prodDesc').value = p.description || '';
        document.getElementById('prodImageUrl').value = p.image;
        document.getElementById('prodImagePreview').innerHTML = `<img src="${p.image}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">`;
    }
}

async function saveProductData() {
    const id = document.getElementById('editProductId').value;
    const data = {
        name: document.getElementById('prodName').value,
        price: parseFloat(document.getElementById('prodPrice').value),
        category: document.getElementById('prodCategory').value,
        stock: parseInt(document.getElementById('prodStock').value),
        isActive: document.getElementById('prodStatus').value === 'true',
        description: document.getElementById('prodDesc').value,
        image: document.getElementById('prodImageUrl').value,
        serverTimestamp: window.firebaseModules.serverTimestamp()
    };

    if (!data.name || !data.price || !data.image) {
        showToast("يرجى ملء جميع الحقول الأساسية وصورة المنتج", "warning");
        return;
    }

    try {
        showLoadingSpinner('جاري الحفظ...');
        if (id) {
            await window.firebaseModules.updateDoc(window.firebaseModules.doc(db, "products", id), data);
        } else {
            await window.firebaseModules.addDoc(window.firebaseModules.collection(db, "products"), data);
        }
        showToast("تم حفظ المنتج بنجاح", "success");
        closeAdminModal('productModal');
        loadAdminProducts();
    } catch (e) { showToast("خطأ في الحفظ", "error"); }
    finally { hideLoadingSpinner(); }
}

async function handleAdminImageUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    const preview = document.getElementById('prodImagePreview');
    preview.innerHTML = '<div class="spinner"></div>';
    
    try {
        const storageRef = window.firebaseModules.ref(storage, `products/${Date.now()}_${file.name}`);
        const uploadTask = await window.firebaseModules.uploadBytes(storageRef, file);
        const url = await window.firebaseModules.getDownloadURL(uploadTask.ref);
        
        document.getElementById('prodImageUrl').value = url;
        preview.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">`;
        showToast("تم رفع الصورة بنجاح", "success");
    } catch (e) {
        preview.innerHTML = '<i class="fas fa-exclamation-triangle"></i><p>فشل الرفع</p>';
        showToast("فشل رفع الصورة", "error");
    }
}

async function deleteProduct(id) {
    if (confirm("هل أنت متأكد من حذف هذا المنتج نهائياً؟")) {
        try {
            await window.firebaseModules.deleteDoc(window.firebaseModules.doc(db, "products", id));
            showToast("تم حذف المنتج", "success");
            loadAdminProducts();
        } catch (e) { showToast("خطأ في الحذف", "error"); }
    }
}

// ======================== 3. إدارة الطلبات ========================

async function loadAdminOrders(status = 'all') {
    const container = document.getElementById('adminOrdersContainer');
    if (!container) return;
    try {
        let q = window.firebaseModules.query(window.firebaseModules.collection(db, "orders"), window.firebaseModules.orderBy("createdAt", "desc"));
        if (status !== 'all') {
            q = window.firebaseModules.query(window.firebaseModules.collection(db, "orders"), window.firebaseModules.where("status", "==", status), window.firebaseModules.orderBy("createdAt", "desc"));
        }
        const snap = await window.firebaseModules.getDocs(q);
        container.innerHTML = snap.empty ? '<p style="text-align:center; padding:20px;">لا توجد طلبات في هذا القسم</p>' : '';
        
        snap.forEach(doc => {
            const o = { id: doc.id, ...doc.data() };
            const card = document.createElement('div');
            card.className = 'admin-card';
            card.style.borderRight = `5px solid var(--secondary-color)`;
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <h4 style="margin:0;">طلب #${o.id.substring(0,8)}</h4>
                        <p style="margin:5px 0; font-size:14px; color:#666;">العميل: ${o.userName} | ${o.phone}</p>
                        <p style="margin:5px 0; font-weight:bold;">الإجمالي: ${formatNumber(o.total)} SDG</p>
                    </div>
                    <div style="text-align:left;">
                        <select onchange="updateOrderStatus('${o.id}', this.value)" class="form-control" style="width:150px; margin-bottom:10px;">
                            <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
                            <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>جاري التجهيز</option>
                            <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>تم الشحن</option>
                            <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>تم التوصيل</option>
                            <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>ملغي</option>
                        </select>
                        <button class="btn-receipt" onclick="viewOrderDetails('${o.id}')">عرض التفاصيل</button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (e) { console.error(e); }
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        await window.firebaseModules.updateDoc(window.firebaseModules.doc(db, "orders", orderId), { status: newStatus });
        showToast("تم تحديث حالة الطلب", "success");
        loadAdminStats(); // لتحديث إجمالي المبيعات إذا تم التوصيل
    } catch (e) { showToast("فشل التحديث", "error"); }
}

async function viewOrderDetails(id) {
    const modal = document.getElementById('orderDetailModal');
    const body = document.getElementById('orderDetailBody');
    body.innerHTML = '<div class="spinner"></div>';
    modal.classList.add('active');
    
    try {
        const docSnap = await window.firebaseModules.getDoc(window.firebaseModules.doc(db, "orders", id));
        const o = docSnap.data();
        let itemsHtml = o.items.map(item => `<li>${item.name} (x${item.quantity}) - ${formatNumber(item.price * item.quantity)} SDG</li>`).join('');
        
        body.innerHTML = `
            <h4>معلومات العميل</h4>
            <p>الاسم: ${o.userName}</p>
            <p>الهاتف: ${o.phone}</p>
            <p>العنوان: ${o.address}</p>
            <hr>
            <h4>المنتجات</h4>
            <ul>${itemsHtml}</ul>
            <hr>
            <p><strong>طريقة الدفع:</strong> ${o.paymentMethod === 'bank' ? 'تحويل بنكي' : 'عند الاستلام'}</p>
            ${o.receiptImage ? `<p><strong>إيصال الدفع:</strong><br><img src="${o.receiptImage}" style="max-width:100%; border-radius:10px; margin-top:10px;"></p>` : ''}
        `;
    } catch (e) { body.innerHTML = 'خطأ في تحميل البيانات'; }
}

// ======================== 4. إدارة المستخدمين ========================

async function loadAdminUsers() {
    const tbody = document.getElementById('adminUsersTableBody');
    if (!tbody) return;
    try {
        const snap = await window.firebaseModules.getDocs(window.firebaseModules.collection(db, "users"));
        tbody.innerHTML = '';
        snap.forEach(doc => {
            const u = doc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${u.name || 'بدون اسم'}</strong></td>
                <td>${u.email}</td>
                <td>${u.phone || '-'}</td>
                <td><span class="status-badge ${u.isAdmin ? 'active' : ''}">${u.isAdmin ? 'مدير' : 'عميل'}</span></td>
                <td>${u.createdAt ? new Date(u.createdAt.seconds * 1000).toLocaleDateString('ar-EG') : '-'}</td>
                <td>
                    <button class="action-btn btn-edit" onclick="toggleAdminRole('${doc.id}', ${!u.isAdmin})"><i class="fas fa-shield-alt"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error(e); }
}

async function toggleAdminRole(uid, makeAdmin) {
    if (confirm(`هل تريد ${makeAdmin ? 'منح' : 'سحب'} صلاحيات المدير لهذا المستخدم؟`)) {
        try {
            await window.firebaseModules.updateDoc(window.firebaseModules.doc(db, "users", uid), { isAdmin: makeAdmin });
            showToast("تم تحديث الصلاحيات", "success");
            loadAdminUsers();
        } catch (e) { showToast("فشل التحديث", "error"); }
    }
}

// ======================== 5. الإعدادات ========================

async function loadAdminSettings() {
    try {
        const docSnap = await window.firebaseModules.getDoc(window.firebaseModules.doc(db, "settings", "site_config"));
        if (docSnap.exists()) {
            const s = docSnap.data();
            document.getElementById('setStoreName').value = s.storeName || '';
            document.getElementById('setStorePhone').value = s.phone || '';
            document.getElementById('setShippingCost').value = s.shippingCost || 0;
            document.getElementById('setFreeShippingLimit').value = s.freeShippingLimit || 0;
            document.getElementById('setAboutUs').value = s.aboutUs || '';
        }
    } catch (e) { console.error(e); }
}

async function saveAdminSettings() {
    const data = {
        storeName: document.getElementById('setStoreName').value,
        phone: document.getElementById('setStorePhone').value,
        shippingCost: parseFloat(document.getElementById('setShippingCost').value),
        freeShippingLimit: parseFloat(document.getElementById('setFreeShippingLimit').value),
        aboutUs: document.getElementById('setAboutUs').value,
        updatedAt: window.firebaseModules.serverTimestamp()
    };
    try {
        await window.firebaseModules.setDoc(window.firebaseModules.doc(db, "settings", "site_config"), data, { merge: true });
        showToast("تم حفظ الإعدادات بنجاح", "success");
    } catch (e) { showToast("فشل الحفظ", "error"); }
}
