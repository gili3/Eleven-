/**
 * products.js - قسم إدارة المنتجات
 * تم تحديثه لاستخدام Firebase الموحد وإصلاح مشكلة الفلاتر.
 */

let localAllProducts = [];
let lastProductDoc = null;
let hasMoreProducts = true;
let isLoadingProducts = false;
const PRODUCTS_PER_PAGE = 10;
let productsObserver = null;

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

    isLoadingProducts = true;
    try {
        const { db } = window.firebaseInstance;
        const { collection, query, where, orderBy, startAfter, limit, getDocs } = window.firebaseModules;
        
        let constraints = [];
        if (filterCategory) constraints.push(where('categoryId', '==', filterCategory));
        if (filterStatus) constraints.push(where('isActive', '==', filterStatus === 'active'));
        
        if (searchTerm) {
            constraints.push(where('name_lowercase', '>=', searchTerm));
            constraints.push(where('name_lowercase', '<=', searchTerm + '\uf8ff'));
        }

        constraints.push(orderBy('createdAt', 'desc'));
        if (isNextPage && lastProductDoc) constraints.push(startAfter(lastProductDoc));
        constraints.push(limit(PRODUCTS_PER_PAGE));
        
        const q = query(collection(db, 'products'), ...constraints);
        const snapshot = await getDocs(q);
        
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
        
        displayProducts();
        if (!isNextPage) setupProductsInfiniteScroll();
    } catch (error) {
        console.error('❌ Load Products Error:', error);
        window.adminUtils.showToast('فشل تحميل المنتجات', 'error');
    } finally {
        isLoadingProducts = false;
    }
}

function displayProducts() {
    const tbody = document.getElementById('productsBody');
    if (!tbody) return;
    
    if (localAllProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">لا توجد منتجات</td></tr>';
        return;
    }

    tbody.innerHTML = localAllProducts.map(product => {
        // تنظيف البيانات قبل العرض لمنع هجمات XSS
        const safeName = window.adminUtils ? window.adminUtils.escapeHTML(product.name) : product.name;
        const safeCategory = window.getCategoryName ? window.adminUtils.escapeHTML(window.getCategoryName(product.categoryId)) : (product.categoryId || '---');
        const safeImage = (product.image && product.image.startsWith('http')) ? product.image : 'https://via.placeholder.com/40';

        return `
        <tr class="compact-row" onclick="viewProduct('${product.id}')" style="cursor: pointer;">
            <td><input type="checkbox" class="product-select" value="${product.id}" onclick="event.stopPropagation()"></td>
            <td><img src="${safeImage}" style="width: 30px; height: 30px; border-radius: 4px; object-fit: cover;"></td>
            <td style="font-weight: 600;">${safeName}</td>
            <td>${safeCategory}</td>
            <td style="font-weight: bold; color: var(--primary-color);">${product.price} SDG</td>
            <td>${product.stock || 0}</td>
            <td><span class="badge badge-${product.isActive ? 'success' : 'danger'}">${product.isActive ? 'نشط' : 'معطل'}</span></td>
            <td onclick="event.stopPropagation()">
                <button class="btn btn-sm btn-primary" onclick="editProduct('${product.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product.id}')"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>
    `}).join('');
}

window.saveProduct = async function(event) {
    event.preventDefault();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
        const productId = document.getElementById('productId')?.value;
        const name = document.getElementById('prodName').value.trim();
        const categoryId = document.getElementById('prodCategory').value;
        const price = parseFloat(document.getElementById('prodPrice').value);
        const stock = parseInt(document.getElementById('prodStock').value);
        const description = document.getElementById('prodDescription').value.trim();
        const isActive = document.getElementById('prodIsActive').checked;
        const imageFile = document.getElementById('prodImageFile').files[0];

        let imageUrl = productId ? localAllProducts.find(p => p.id === productId)?.image : '';
        if (imageFile) imageUrl = await uploadProductImage(imageFile);

        const productData = {
            name, name_lowercase: name.toLowerCase(),
            categoryId, price, stock, description, isActive,
            image: imageUrl,
            updatedAt: window.firebaseModules.serverTimestamp()
        };

        const { db } = window.firebaseInstance;
        if (productId) {
            await window.firebaseModules.updateDoc(window.firebaseModules.doc(db, 'products', productId), productData);
        } else {
            productData.createdAt = window.firebaseModules.serverTimestamp();
            await window.firebaseModules.addDoc(window.firebaseModules.collection(db, 'products'), productData);
        }

        window.adminUtils.showToast('✅ تم حفظ المنتج بنجاح', 'success');
        ModalManager.close('productModal');
        loadProducts(false);
    } catch (error) {
        console.error('❌ خطأ في حفظ المنتج:', error);
        const errorMsg = error.code === 'permission-denied' ? 'ليس لديك صلاحية لحفظ المنتجات' : 'حدث خطأ أثناء حفظ المنتج';
        window.adminUtils.showToast(errorMsg, 'error');
        if (window.ErrorHandler) window.ErrorHandler.handle(error, 'saveProduct');
    }
};

async function uploadProductImage(file) {
    const { storage } = window.firebaseInstance;
    const { ref, uploadBytes, getDownloadURL } = window.firebaseModules;
    const fileName = `products/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
}

function setupProductsInfiniteScroll() {
    const sentinel = document.getElementById('productsScrollSentinel');
    if (!sentinel) return;
    if (productsObserver) productsObserver.disconnect();
    productsObserver = new IntersectionObserver(e => { if (e[0].isIntersecting && hasMoreProducts && !isLoadingProducts) loadProducts(true); });
    productsObserver.observe(sentinel);
}

window.loadProducts = loadProducts;
window.editProduct = (id) => window.openProductModal(id);
window.deleteProduct = async (id) => {
    if (!confirm('هل أنت متأكد؟')) return;
    await window.firebaseModules.deleteDoc(window.firebaseModules.doc(window.firebaseInstance.db, 'products', id));
    loadProducts(false);
};
window.applyProductsFilter = () => loadProducts(false);
window.resetProductsFilter = () => {
    document.getElementById('productsSearchInput').value = '';
    document.getElementById('productsCategoryFilter').value = '';
    document.getElementById('productsStatusFilter').value = '';
    loadProducts(false);
};
