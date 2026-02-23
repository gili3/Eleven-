/**
 * products.js - قسم إدارة المنتجات (نسخة محسنة مع التحميل بالتمرير والبطاقات المصغرة)
 */

let localAllProducts = [];
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
        localAllProducts = [];
        lastProductDoc = null;
        hasMoreProducts = true;
        const tbody = document.getElementById('productsBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;">جاري التحميل...</td></tr>';
        }
    }

    if (!hasMoreProducts && isNextPage) return;

    isLoadingProducts = true;
    try {
        console.log('📦 جاري تحميل المنتجات...');
        const db = window.db;
        const firebaseModules = window.firebaseModules;
        
        if (!db || !firebaseModules) {
            console.error('❌ Firebase not initialized');
            return;
        }

        let constraints = [];

        // تطبيق الفلترة
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
        
        const q = firebaseModules.query(firebaseModules.collection(db, 'products'), ...constraints);
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

        localAllProducts = [...localAllProducts, ...newProducts];
        window.allProducts = localAllProducts;
        
        displayProducts(isNextPage);
        if (window.updateStats) window.updateStats();
        
        if (!isNextPage) setupProductsInfiniteScroll();
        
        console.log(`✅ تم تحميل ${newProducts.length} منتج إضافي`);
    } catch (error) {
        console.error('❌ خطأ في تحميل المنتجات:', error);
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
            loadProducts(true);
        }
    }, { threshold: 0.1 });

    productsObserver.observe(sentinel);
}

function displayProducts(append = false) {
    const tbody = document.getElementById('productsBody');
    if (!tbody) return;
    
    if (localAllProducts.length === 0 && !append) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">لا توجد منتجات تطابق البحث</td></tr>';
        return;
    }

    const html = localAllProducts.map(product => `
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
            <td data-label="السعر" style="font-weight: bold; color: var(--primary-color);">${product.price}</td>
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

window.loadProducts = loadProducts;
window.applyProductsFilter = () => loadProducts(false);
window.resetProductsFilter = () => {
    document.getElementById('productsSearchInput').value = '';
    document.getElementById('productsCategoryFilter').value = '';
    document.getElementById('productsStatusFilter').value = '';
    loadProducts(false);
};

/**
 * دوال إدارة المنتجات المضافة لإصلاح المشكلة
 */

window.openProductModal = function(productId = null) {
    currentEditingProductId = productId;
    const product = productId ? localAllProducts.find(p => p.id === productId) : null;
    
    const modalHtml = `
        <div id="productModal" class="modal-overlay active">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${productId ? 'تعديل منتج' : 'إضافة منتج جديد'}</h3>
                    <button onclick="closeModal('productModal')" class="btn-close"><i class="fas fa-times"></i></button>
                </div>
                <form id="productForm" onsubmit="saveProduct(event)">
                    <div class="form-group">
                        <label>اسم المنتج</label>
                        <input type="text" id="prodName" value="${product ? product.name : ''}" required>
                    </div>
                    <div class="form-group">
                        <label>الفئة</label>
                        <select id="prodCategory" required>
                            <option value="">اختر الفئة</option>
                            ${window.allCategories.map(cat => `<option value="${cat.id}" ${product && product.category === cat.id ? 'selected' : ''}>${cat.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>السعر (SDG)</label>
                        <input type="number" id="prodPrice" value="${product ? product.price : ''}" required>
                    </div>
                    <div class="form-group">
                        <label>المخزون</label>
                        <input type="number" id="prodStock" value="${product ? product.stock : '0'}" required>
                    </div>
                    <div class="form-group">
                        <label>الوصف</label>
                        <textarea id="prodDescription" rows="3">${product ? product.description || '' : ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>صورة المنتج</label>
                        <input type="file" id="prodImageFile" accept="image/*" onchange="previewImageWithValidation(event, 'prodImagePreview')">
                        <img id="prodImagePreview" src="${product ? product.image : ''}" style="max-width: 100px; margin-top: 10px; display: ${product && product.image ? 'block' : 'none'};">
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="prodIsActive" ${!product || product.isActive ? 'checked' : ''}> نشط
                        </label>
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">حفظ</button>
                        <button type="button" class="btn btn-secondary" onclick="closeModal('productModal')" style="flex: 1;">إلغاء</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.saveProduct = async function(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerText = 'جاري الحفظ...';

    try {
        const name = document.getElementById('prodName').value;
        const category = document.getElementById('prodCategory').value;
        const price = parseFloat(document.getElementById('prodPrice').value);
        const stock = parseInt(document.getElementById('prodStock').value);
        const description = document.getElementById('prodDescription').value;
        const isActive = document.getElementById('prodIsActive').checked;
        const imageFile = document.getElementById('prodImageFile').files[0];

        let imageUrl = currentEditingProductId ? (localAllProducts.find(p => p.id === currentEditingProductId).image || '') : '';

        if (imageFile) {
            imageUrl = await window.uploadImageWithValidation(imageFile, 'products');
        }

        const productData = {
            name,
            category,
            price,
            stock,
            description,
            isActive,
            image: imageUrl,
            updatedAt: window.firebaseModules.serverTimestamp()
        };

        if (!currentEditingProductId) {
            productData.createdAt = window.firebaseModules.serverTimestamp();
            await window.firebaseModules.addDoc(window.firebaseModules.collection(window.db, 'products'), productData);
            window.adminUtils.showToast('تم إضافة المنتج بنجاح', 'success');
        } else {
            await window.firebaseModules.updateDoc(window.firebaseModules.doc(window.db, 'products', currentEditingProductId), productData);
            window.adminUtils.showToast('تم تحديث المنتج بنجاح', 'success');
        }

        closeModal('productModal');
        loadProducts(false);
    } catch (error) {
        console.error('❌ خطأ في حفظ المنتج:', error);
        window.adminUtils.showToast('حدث خطأ أثناء الحفظ', 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = 'حفظ';
    }
};

window.editProduct = function(id) {
    window.openProductModal(id);
};

window.deleteProduct = async function(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    try {
        await window.firebaseModules.deleteDoc(window.firebaseModules.doc(window.db, 'products', id));
        window.adminUtils.showToast('تم حذف المنتج بنجاح', 'success');
        loadProducts(false);
    } catch (error) {
        console.error('❌ خطأ في حذف المنتج:', error);
        window.adminUtils.showToast('حدث خطأ أثناء الحذف', 'error');
    }
};

window.viewProduct = function(id) {
    // يمكن إضافة نافذة عرض تفاصيل المنتج هنا
    console.log('عرض المنتج:', id);
};
