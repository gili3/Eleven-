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
