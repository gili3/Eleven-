/**
 * products.js - قسم إدارة المنتجات (نسخة محسنة مع التحميل بالتمرير والبطاقات المصغرة)
 */

let allProducts = [];
let currentEditingProductId = null;
let lastProductDoc = null;
let hasMoreProducts = true;
let isLoadingProducts = false;
const PRODUCTS_PER_PAGE = 8;
let productsObserver = null;

async function loadProducts(isNextPage = false) {
    if (isLoadingProducts) return;
    
    const searchInput = document.getElementById('productsSearchInput');
    const categoryFilter = document.getElementById('productsCategoryFilter');
    const statusFilter = document.getElementById('productsStatusFilter');
    
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const filterCategory = categoryFilter ? categoryFilter.value : '';
    const filterStatus = statusFilter ? statusFilter.value : '';

    if (!isNextPage) {
        allProducts = [];
        lastProductDoc = null;
        hasMoreProducts = true;
        const tbody = document.getElementById('productsBody');
        if (tbody) {
            tbody.innerHTML = Array(5).fill(0).map(() => `
                <tr class="skeleton-row">
                    <td><div class="skeleton skeleton-text" style="width: 20px;"></div></td>
                    <td><div class="skeleton skeleton-circle" style="width: 30px; height: 30px;"></div></td>
                    <td><div class="skeleton skeleton-text"></div></td>
                    <td><div class="skeleton skeleton-text" style="width: 60px;"></div></td>
                    <td><div class="skeleton skeleton-text" style="width: 50px;"></div></td>
                    <td><div class="skeleton skeleton-text" style="width: 30px;"></div></td>
                    <td><div class="skeleton skeleton-text" style="width: 40px;"></div></td>
                    <td><div class="skeleton skeleton-text" style="width: 80px;"></div></td>
                </tr>
            `).join('');
        }
    }

    if (!hasMoreProducts && isNextPage) return;

    isLoadingProducts = true;
    try {
        console.log('📦 جاري تحميل المنتجات...');
        const { db, firebaseModules } = window;
        
        let constraints = [
            firebaseModules.collection(db, 'products')
        ];

        // تطبيق الفلترة من Firebase
        if (filterCategory) {
            constraints.push(firebaseModules.where('category', '==', filterCategory));
        }
        
        if (filterStatus) {
            constraints.push(firebaseModules.where('isActive', '==', filterStatus === 'active'));
        }

        // الترتيب
        constraints.push(firebaseModules.orderBy('createdAt', 'desc'));

        if (isNextPage && lastProductDoc) {
            constraints.push(firebaseModules.startAfter(lastProductDoc));
        }
        
        constraints.push(firebaseModules.limit(PRODUCTS_PER_PAGE));
        
        const q = firebaseModules.query(...constraints);
        const snapshot = await firebaseModules.getDocs(q);
        
        if (snapshot.empty) {
            hasMoreProducts = false;
            if (!isNextPage) displayProducts();
            return;
        }

        lastProductDoc = snapshot.docs[snapshot.docs.length - 1];
        hasMoreProducts = snapshot.docs.length === PRODUCTS_PER_PAGE;

        const newProducts = [];
        snapshot.forEach(doc => {
            newProducts.push({ id: doc.id, ...doc.data() });
        });

        allProducts = [...allProducts, ...newProducts];
        window.allProducts = allProducts;
        
        displayProducts(isNextPage);
        if (window.updateStats) window.updateStats();
        
        if (!isNextPage) setupProductsInfiniteScroll();
        
        console.log(`✅ تم تحميل ${newProducts.length} منتج إضافي`);
    } catch (error) {
        console.error('❌ خطأ في تحميل المنتجات:', error);
        if (window.adminUtils) window.adminUtils.showToast('فشل تحميل المنتجات', 'error');
    } finally {
        isLoadingProducts = false;
    }
}

function setupProductsInfiniteScroll() {
    const sentinel = document.getElementById('productsScrollSentinel');
    if (!sentinel) return;

    if (productsObserver) productsObserver.disconnect();

    productsObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreProducts && !isLoadingProducts) {
            sentinel.innerHTML = '<div class="loading-indicator"><div class="spinner"></div><span style="margin-right: 10px; font-size: 13px;">جاري تحميل المزيد...</span></div>';
            loadProducts(true).then(() => {
                sentinel.innerHTML = '';
            });
        }
    }, { threshold: 0.1 });

    productsObserver.observe(sentinel);
}

function displayProducts(append = false) {
    const tbody = document.getElementById('productsBody');
    if (!tbody) return;
    
    if (allProducts.length === 0 && !append) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">لا توجد منتجات تطابق البحث</td></tr>';
        return;
    }

    const html = allProducts.map(product => `
        <tr class="compact-row" onclick="viewProduct('${product.id}')" style="cursor: pointer;">
            <td data-label="التحديد" onclick="event.stopPropagation()">
                <input type="checkbox" class="custom-checkbox product-select" value="${product.id}">
            </td>
            <td data-label="الصورة">
                <img src="${product.image || 'https://via.placeholder.com/40'}" 
                     style="width: 30px; height: 30px; border-radius: 4px; object-fit: cover;"
                     onerror="this.src='https://via.placeholder.com/40'">
            </td>
            <td data-label="الاسم" style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600;">${product.name}</td>
            <td data-label="الفئة" style="font-size: 11px;">${window.getCategoryName ? window.getCategoryName(product.category) : (product.category || '---')}</td>
            <td data-label="السعر" style="font-weight: bold; color: var(--primary-color);">${window.adminUtils.formatNumber(product.price)}</td>
            <td data-label="المخزون" style="font-size: 11px;">${product.stock || 0}</td>
            <td data-label="الحالة">
                <span class="badge badge-${product.isActive ? 'success' : 'danger'}" style="padding: 1px 6px; font-size: 9px; border-radius: 4px;">
                    ${product.isActive ? 'نشط' : 'معطل'}
                </span>
            </td>
            <td data-label="الإجراءات" onclick="event.stopPropagation()">
                <div class="action-buttons-compact">
                    <button class="btn btn-sm btn-primary" onclick="editProduct('${product.id}')" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product.id}')" title="حذف">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    tbody.innerHTML = html;
}

function applyProductsFilter() {
    loadProducts(false);
}

function resetProductsFilter() {
    const searchInput = document.getElementById('productsSearchInput');
    const categoryFilter = document.getElementById('productsCategoryFilter');
    const statusFilter = document.getElementById('productsStatusFilter');
    
    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    
    loadProducts(false);
}

function viewProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'viewProductModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>تفاصيل المنتج</h2>
                <button class="modal-close" onclick="window.adminUtils.closeModal('viewProductModal')">&times;</button>
            </div>
            <div style="padding: 20px; text-align: center;">
                <img src="${product.image || 'https://via.placeholder.com/150'}" style="width: 150px; height: 150px; border-radius: 10px; object-fit: cover; margin-bottom: 15px;">
                <h3 style="margin-bottom: 10px;">${product.name}</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; text-align: right; background: #f9f9f9; padding: 15px; border-radius: 8px;">
                    <p><strong>الفئة:</strong> ${window.getCategoryName(product.category)}</p>
                    <p><strong>السعر:</strong> ${window.adminUtils.formatNumber(product.price)} SDG</p>
                    <p><strong>المخزون:</strong> ${product.stock || 0}</p>
                    <p><strong>الحالة:</strong> ${product.isActive ? 'نشط' : 'معطل'}</p>
                    <p><strong>تخفيض:</strong> ${product.isSale ? 'نعم' : 'لا'}</p>
                    <p><strong>جديد:</strong> ${product.isNew ? 'نعم' : 'لا'}</p>
                </div>
                ${product.description ? `<div style="margin-top: 15px; text-align: right;"><strong>الوصف:</strong><p style="font-size: 14px; color: #666;">${product.description}</p></div>` : ''}
            </div>
            <div class="modal-footer" style="display: flex; justify-content: center; gap: 10px; padding: 15px;">
                <button class="btn btn-primary" onclick="window.adminUtils.closeModal('viewProductModal'); editProduct('${product.id}')">تعديل</button>
                <button class="btn btn-secondary" onclick="window.adminUtils.closeModal('viewProductModal')">إغلاق</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function toggleProductStatus(id, newStatus) {
    try {
        const { db, firebaseModules } = window;
        await firebaseModules.updateDoc(firebaseModules.doc(db, 'products', id), {
            isActive: newStatus,
            updatedAt: firebaseModules.serverTimestamp()
        });
        window.adminUtils.showToast(newStatus ? '✅ تم تفعيل المنتج' : '✅ تم تعطيل المنتج', 'success');
        
        const product = allProducts.find(p => p.id === id);
        if (product) product.isActive = newStatus;
        displayProducts();
    } catch (error) {
        console.error('❌ خطأ في تغيير حالة المنتج:', error);
        window.adminUtils.showToast('حدث خطأ في تغيير حالة المنتج', 'error');
    }
}

async function deleteProduct(id) {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا المنتج؟')) return;
    
    try {
        const { db, firebaseModules } = window;
        await firebaseModules.deleteDoc(firebaseModules.doc(db, 'products', id));
        window.adminUtils.showToast('✅ تم حذف المنتج', 'success');
        allProducts = allProducts.filter(p => p.id !== id);
        displayProducts();
    } catch (error) {
        console.error('❌ خطأ في حذف المنتج:', error);
        window.adminUtils.showToast('حدث خطأ في حذف المنتج', 'error');
    }
}

function editProduct(productId) {
    openProductModal(productId);
}

function openProductModal(productId = null) {
    currentEditingProductId = productId;
    const product = productId ? allProducts.find(p => p.id === productId) : null;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'productModal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${productId ? 'تعديل منتج' : 'منتج جديد'}</h2>
                <button class="modal-close" onclick="window.adminUtils.closeModal('productModal')">&times;</button>
            </div>
            
            <form id="productForm" onsubmit="saveProduct(event)">
                <div class="form-group">
                    <label>اسم المنتج *</label>
                    <input type="text" id="productName" value="${product?.name || ''}" required>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="form-group">
                        <label>السعر *</label>
                        <input type="number" id="productPrice" value="${product?.price || ''}" min="0" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label>المخزون</label>
                        <input type="number" id="productStock" value="${product?.stock || 0}" min="0">
                    </div>
                </div>

                <div class="form-group">
                    <label>الفئة</label>
                    <select id="productCategory">
                        ${window.allCategories.map(cat => `<option value="${cat.id}" ${product?.category === cat.id ? 'selected' : ''}>${cat.name}</option>`).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label>الوصف</label>
                    <textarea id="productDescription" rows="3">${product?.description || ''}</textarea>
                </div>

                <div class="form-group">
                    <label>رابط الصورة</label>
                    <input type="text" id="productImageUrl" value="${product?.image || ''}" placeholder="https://...">
                </div>

                <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                    <label><input type="checkbox" id="productIsActive" ${product ? (product.isActive ? 'checked' : '') : 'checked'}> نشط</label>
                    <label><input type="checkbox" id="productIsSale" ${product?.isSale ? 'checked' : ''}> تخفيض</label>
                    <label><input type="checkbox" id="productIsNew" ${product?.isNew ? 'checked' : ''}> جديد</label>
                </div>

                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">حفظ المنتج</button>
                    <button type="button" class="btn btn-secondary" onclick="window.adminUtils.closeModal('productModal')">إلغاء</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

async function saveProduct(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';

    const productData = {
        name: document.getElementById('productName').value,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value) || 0,
        category: document.getElementById('productCategory').value,
        description: document.getElementById('productDescription').value,
        image: document.getElementById('productImageUrl').value,
        isActive: document.getElementById('productIsActive').checked,
        isSale: document.getElementById('productIsSale').checked,
        isNew: document.getElementById('productIsNew').checked,
        updatedAt: window.firebaseModules.serverTimestamp()
    };

    try {
        const { db, firebaseModules } = window;
        if (currentEditingProductId) {
            await firebaseModules.updateDoc(firebaseModules.doc(db, 'products', currentEditingProductId), productData);
            window.adminUtils.showToast('✅ تم تحديث المنتج بنجاح', 'success');
        } else {
            productData.createdAt = firebaseModules.serverTimestamp();
            await firebaseModules.addDoc(firebaseModules.collection(db, 'products'), productData);
            window.adminUtils.showToast('✅ تم إضافة المنتج بنجاح', 'success');
        }
        window.adminUtils.closeModal('productModal');
        loadProducts();
    } catch (error) {
        console.error('❌ خطأ في حفظ المنتج:', error);
        window.adminUtils.showToast('حدث خطأ أثناء الحفظ', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'حفظ المنتج';
    }
}

window.loadProducts = loadProducts;
window.editProduct = editProduct;
window.toggleProductStatus = toggleProductStatus;
window.deleteProduct = deleteProduct;
window.viewProduct = viewProduct;
window.saveProduct = saveProduct;
window.openProductModal = openProductModal;
