/**
 * products.js - قسم إدارة المنتجات (نسخة نهائية مصلحة)
 */

let localAllProducts = [];
let lastProductDoc = null;
let hasMoreProducts = true;
let isLoadingProducts = false;
const PRODUCTS_PER_PAGE = 10;
let productsObserver = null;

// ==================== دوال التحميل والعرض ====================

async function loadProducts(isNextPage = false) {
    if (!window.checkAdmin()) return;
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
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;">جاري التحميل...</td></tr>';
    }

    if (!hasMoreProducts && isNextPage) return;

    isLoadingProducts = true;
    try {
        const { db, firebaseModules } = window;
        
        if (!db || !firebaseModules) {
            console.error('❌ Firebase not initialized');
            return;
        }

        let constraints = [firebaseModules.collection(db, 'products')];
        
        if (filterCategory) constraints.push(firebaseModules.where('categoryId', '==', filterCategory));
        if (filterStatus) constraints.push(firebaseModules.where('isActive', '==', filterStatus === 'active'));
        
        if (searchTerm) {
            constraints.push(firebaseModules.where('name_lowercase', '>=', searchTerm));
            constraints.push(firebaseModules.where('name_lowercase', '<=', searchTerm + '\uf8ff'));
        }

        constraints.push(firebaseModules.orderBy('createdAt', 'desc'));
        if (isNextPage && lastProductDoc) constraints.push(firebaseModules.startAfter(lastProductDoc));
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

        const newProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        localAllProducts = isNextPage ? [...localAllProducts, ...newProducts] : newProducts;
        window.allProducts = localAllProducts;
        
        displayProducts(isNextPage);
        if (!isNextPage) setupProductsInfiniteScroll();
        
        console.log(`✅ تم تحميل ${newProducts.length} منتج`);
    } catch (error) {
        console.error('❌ Load Products Error:', error);
        if (window.adminUtils) window.adminUtils.showToast('فشل تحميل المنتجات', 'error');
        ErrorHandler.handle(error, 'loadProducts');
    } finally {
        isLoadingProducts = false;
    }
}

function displayProducts(append = false) {
    const tbody = document.getElementById('productsBody');
    if (!tbody) return;
    
    if (localAllProducts.length === 0 && !append) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">لا توجد منتجات</td></tr>';
        return;
    }

    const html = localAllProducts.map(product => {
        const safeName = window.adminUtils ? window.adminUtils.escapeHTML(product.name) : product.name;
        const safeCategory = window.getCategoryName ? window.adminUtils.escapeHTML(window.getCategoryName(product.categoryId)) : (product.categoryId || '---');
        const safeImage = (product.image && product.image.startsWith('http')) ? product.image : 'https://via.placeholder.com/40';

        return `
        <tr class="compact-row" onclick="window.viewProduct('${product.id}')" style="cursor: pointer;">
            <td><input type="checkbox" class="product-select" value="${product.id}" onclick="event.stopPropagation()"></td>
            <td><img src="${safeImage}" style="width: 30px; height: 30px; border-radius: 4px; object-fit: cover;"></td>
            <td style="font-weight: 600;">${safeName}</td>
            <td>${safeCategory}</td>
            <td style="font-weight: bold; color: var(--primary-color);">${product.price} SDG</td>
            <td>${product.stock || 0}</td>
            <td><span class="badge badge-${product.isActive ? 'success' : 'danger'}">${product.isActive ? 'نشط' : 'معطل'}</span></td>
            <td onclick="event.stopPropagation()">
                <div class="action-buttons-compact">
                    <button class="btn btn-sm btn-primary" onclick="window.editProduct('${product.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="window.deleteProduct('${product.id}')"><i class="fas fa-trash-alt"></i></button>
                </div>
            </td>
        </tr>
    `}).join('');

    if (append) {
        tbody.insertAdjacentHTML('beforeend', html);
    } else {
        tbody.innerHTML = html;
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

// ==================== دوال إدارة المنتجات (CRUD) ====================

window.openProductModal = function(productId = null) {
    if (!window.checkAdmin()) return;
    
    const product = productId ? localAllProducts.find(p => p.id === productId) : null;
    
    // ✅ إصلاح: التأكد من تحميل الفئات
    if (!window.allCategories || window.allCategories.length === 0) {
        if (typeof window.loadCategories === 'function') {
            window.loadCategories().then(() => {
                window.openProductModal(productId);
            });
        } else {
            // تحميل الفئات مباشرة إذا كانت دالة loadCategories غير متوفرة
            loadCategoriesDirectly().then(() => {
                window.openProductModal(productId);
            });
        }
        return;
    }
    
    const content = `
        <form id="productForm" onsubmit="window.saveProduct(event)">
            <input type="hidden" id="productId" value="${productId || ''}">
            
            <div class="form-group">
                <label>اسم المنتج <span style="color: red;">*</span></label>
                <input type="text" id="prodName" value="${product ? window.adminUtils.escapeHTML(product.name) : ''}" required class="form-control" placeholder="أدخل اسم المنتج">
            </div>
            
            <div class="form-group">
                <label>الفئة</label>
                <select id="prodCategory" class="form-control">
                    <option value="">اختر الفئة</option>
                    ${(window.allCategories || []).map(cat => 
                        `<option value="${cat.id}" ${product && product.categoryId === cat.id ? 'selected' : ''}>${window.adminUtils.escapeHTML(cat.name)}</option>`
                    ).join('')}
                </select>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="form-group">
                    <label>السعر <span style="color: red;">*</span></label>
                    <input type="number" id="prodPrice" value="${product ? product.price : ''}" min="0" step="0.01" required class="form-control">
                </div>
                <div class="form-group">
                    <label>المخزون</label>
                    <input type="number" id="prodStock" value="${product ? (product.stock || 0) : 0}" min="0" class="form-control">
                </div>
            </div>
            
            <div class="form-group">
                <label>الوصف</label>
                <textarea id="prodDescription" rows="4" class="form-control" placeholder="وصف المنتج">${product ? window.adminUtils.escapeHTML(product.description || '') : ''}</textarea>
            </div>
            
            <div class="form-group">
                <label>صورة المنتج</label>
                <input type="file" id="prodImageFile" accept="image/*" class="form-control" onchange="window.previewImage(event, 'productImagePreview')">
                <div style="margin-top: 10px; text-align: center;">
                    <img id="productImagePreview" src="${product && product.image ? product.image : ''}" 
                         style="max-width: 150px; max-height: 150px; border-radius: 8px; border: 1px solid #ddd; display: ${product && product.image ? 'block' : 'none'}; margin: 0 auto;">
                </div>
            </div>
            
            <div class="form-group">
                <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="prodIsActive" ${!product || product.isActive !== false ? 'checked' : ''}> 
                    منتج نشط
                </label>
            </div>
        </form>
    `;

    ModalManager.open({
        id: 'productModal',
        title: productId ? 'تعديل منتج' : 'إضافة منتج جديد',
        content: content,
        size: 'medium',
        buttons: [
            { 
                text: 'حفظ', 
                class: 'btn-primary', 
                onClick: () => {
                    const form = document.getElementById('productForm');
                    if (form) form.dispatchEvent(new Event('submit'));
                }
            },
            { 
                text: 'إلغاء', 
                class: 'btn-secondary',
                onClick: () => ModalManager.close('productModal')
            }
        ]
    });
};

// ✅ دالة مساعدة لتحميل الفئات مباشرة
async function loadCategoriesDirectly() {
    try {
        const { db, firebaseModules } = window;
        if (!db || !firebaseModules) return;
        
        const q = firebaseModules.query(
            firebaseModules.collection(db, 'categories'),
            firebaseModules.orderBy('createdAt', 'desc')
        );
        const snapshot = await firebaseModules.getDocs(q);
        
        window.allCategories = [];
        snapshot.forEach(doc => {
            window.allCategories.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`✅ تم تحميل ${window.allCategories.length} فئة`);
    } catch (error) {
        console.error('❌ خطأ في تحميل الفئات:', error);
        window.allCategories = [];
    }
}

window.saveProduct = async function(event) {
    if (!window.checkAdmin()) return;
    if (event) event.preventDefault();
    
    const modalButtons = document.querySelectorAll('#productModal .modal-footer button');
    let submitBtn = null;
    modalButtons.forEach(btn => {
        if (btn.textContent.includes('حفظ') || btn.classList.contains('btn-primary')) {
            submitBtn = btn;
        }
    });
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
    }

    try {
        const productId = document.getElementById('productId')?.value;
        const name = document.getElementById('prodName')?.value?.trim();
        const categoryId = document.getElementById('prodCategory')?.value || '';
        const price = parseFloat(document.getElementById('prodPrice')?.value) || 0;
        const stock = parseInt(document.getElementById('prodStock')?.value) || 0;
        const description = document.getElementById('prodDescription')?.value?.trim() || '';
        const isActive = document.getElementById('prodIsActive')?.checked ?? true;
        const imageFile = document.getElementById('prodImageFile')?.files[0];

        if (!name || !price) {
            window.adminUtils.showToast('الرجاء إدخال اسم المنتج والسعر', 'warning');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'حفظ';
            }
            return;
        }

        let imageUrl = productId ? localAllProducts.find(p => p.id === productId)?.image || '' : '';
        if (imageFile) {
            imageUrl = await uploadProductImage(imageFile);
        }

        const productData = {
            name: SecurityCore.sanitizeHTML(name),
            name_lowercase: name.toLowerCase(),
            categoryId,
            price,
            stock,
            description: SecurityCore.sanitizeHTML(description),
            isActive,
            image: imageUrl,
            updatedAt: window.firebaseModules.serverTimestamp()
        };

        const { db, firebaseModules } = window;
        
        if (productId) {
            await firebaseModules.updateDoc(firebaseModules.doc(db, 'products', productId), productData);
            window.adminUtils.showToast('✅ تم تحديث المنتج بنجاح', 'success');
        } else {
            productData.createdAt = firebaseModules.serverTimestamp();
            await firebaseModules.addDoc(firebaseModules.collection(db, 'products'), productData);
            window.adminUtils.showToast('✅ تم إضافة المنتج بنجاح', 'success');
        }

        ModalManager.close('productModal');
        await loadProducts(false);
        
    } catch (error) {
        console.error('❌ خطأ في حفظ المنتج:', error);
        const errorMsg = error.code === 'permission-denied' ? 'ليس لديك صلاحية لحفظ المنتجات' : 'حدث خطأ أثناء حفظ المنتج';
        window.adminUtils.showToast(errorMsg, 'error');
        ErrorHandler.handle(error, 'saveProduct');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'حفظ';
        }
    }
};

async function uploadProductImage(file) {
    if (!file) return '';
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        throw new Error('نوع الملف غير مدعوم');
    }
    
    if (file.size > 2 * 1024 * 1024) {
        throw new Error('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
    }
    
    const { storage, firebaseModules } = window;
    const ext = file.type.split('/')[1] || 'jpg';
    const fileName = `products/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const storageRef = firebaseModules.ref(storage, fileName);
    await firebaseModules.uploadBytes(storageRef, file);
    return await firebaseModules.getDownloadURL(storageRef);
}

window.viewProduct = function(productId) {
    const product = localAllProducts.find(p => p.id === productId);
    if (!product) return;
    
    const content = `
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="${product.image || 'https://via.placeholder.com/150'}" style="max-width: 200px; border-radius: 10px;">
        </div>
        <table class="details-table" style="width: 100%;">
            <tr><th>الاسم:</th><td>${window.adminUtils.escapeHTML(product.name)}</td></tr>
            <tr><th>الفئة:</th><td>${window.getCategoryName ? window.adminUtils.escapeHTML(window.getCategoryName(product.categoryId)) : (product.categoryId || '---')}</td></tr>
            <tr><th>السعر:</th><td>${product.price} SDG</td></tr>
            <tr><th>المخزون:</th><td>${product.stock || 0}</td></tr>
            <tr><th>الحالة:</th><td><span class="badge badge-${product.isActive ? 'success' : 'danger'}">${product.isActive ? 'نشط' : 'معطل'}</span></td></tr>
            <tr><th>الوصف:</th><td>${window.adminUtils.escapeHTML(product.description || '---')}</td></tr>
        </table>
    `;
    
    ModalManager.open({
        id: 'viewProductModal',
        title: 'تفاصيل المنتج',
        content: content,
        size: 'medium',
        buttons: [
            { text: 'تعديل', class: 'btn-primary', onClick: () => {
                ModalManager.close('viewProductModal');
                window.editProduct(productId);
            }},
            { text: 'إغلاق', class: 'btn-secondary', onClick: () => ModalManager.close('viewProductModal') }
        ]
    });
};

window.editProduct = function(id) {
    if (!window.checkAdmin()) return;
    window.openProductModal(id);
};

window.deleteProduct = async function(id) {
    if (!window.checkAdmin()) return;
    
    ModalManager.confirm('هل أنت متأكد من حذف هذا المنتج؟', 'تأكيد الحذف', async () => {
        try {
            const { db, firebaseModules } = window;
            await firebaseModules.deleteDoc(firebaseModules.doc(db, 'products', id));
            window.adminUtils.showToast('✅ تم حذف المنتج بنجاح', 'success');
            localAllProducts = localAllProducts.filter(p => p.id !== id);
            window.allProducts = localAllProducts;
            displayProducts(false);
        } catch (error) {
            console.error('❌ خطأ في حذف المنتج:', error);
            window.adminUtils.showToast('حدث خطأ أثناء الحذف', 'error');
            ErrorHandler.handle(error, 'deleteProduct');
        }
    });
};

// ==================== دوال الفلترة ====================

window.applyProductsFilter = () => loadProducts(false);

window.resetProductsFilter = () => {
    const searchInput = document.getElementById('productsSearchInput');
    const categoryFilter = document.getElementById('productsCategoryFilter');
    const statusFilter = document.getElementById('productsStatusFilter');
    
    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    
    loadProducts(false);
};

// ==================== التهيئة ====================

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('productsBody')) {
        loadProducts();
    }
});

// ✅ تعريض جميع الدوال
window.loadProducts = loadProducts;
window.openProductModal = window.openProductModal;
window.saveProduct = window.saveProduct;
window.editProduct = window.editProduct;
window.deleteProduct = window.deleteProduct;
window.viewProduct = window.viewProduct;
window.loadCategoriesDirectly = loadCategoriesDirectly;