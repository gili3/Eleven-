// products-system.js - نظام إدارة المنتجات والتحميل اللانهائي (إصدار قاعدة البيانات المحدث)
// ======================== إدارة المنتجات ==========================

let lastProductDoc = null; // لتتبع آخر مستند تم تحميله للتحميل اللانهائي
let hasMoreProducts = true;
let isLoadingProducts = false;
const PRODUCTS_PER_PAGE = 12;  
// allProducts معرف مسبقاً في app-core.js

let homeLastProductDoc = null;
let homeHasMoreProducts = true;
let homeIsLoadingProducts = false;

// دالة مساعدة للتنسيق في حال عدم توفر formatNumber العالمية
function localFormatNumber(num) {
    if (typeof formatNumber === 'function') return formatNumber(num);
    if (num === null || num === undefined) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function loadProducts(isNextPage = false) {
    console.log(`🛍️ جاري تحميل المنتجات من Firebase (صفحة جديدة: ${isNextPage})...`);
    
    if (isLoadingProducts || (!hasMoreProducts && isNextPage)) {
        return;
    }
    
    if (!isNextPage) {
        lastProductDoc = null;
        hasMoreProducts = true;
        if (typeof allProducts !== 'undefined') allProducts = [];
        const productsGrid = document.getElementById('productsGrid');
        if (productsGrid) productsGrid.innerHTML = '';
    }
    
    isLoadingProducts = true;
    const loadingIndicator = document.getElementById('productsLoading');
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    
    try {
        const db = window.firebaseDb || (typeof getFirebaseInstance === 'function' ? getFirebaseInstance().db : (window.db || null));
        if (!db || !window.firebaseModules) {
            console.error("❌ Firebase not initialized");
            return;
        }
        
        const productsRef = window.firebaseModules.collection(db, "products");
        
        // جلب قيم الفلاتر والبحث
        const categoryFilter = document.getElementById('categoryFilter');
        const sortFilter = document.getElementById('sortFilter');
        const searchInput = document.getElementById('searchInput');
        
        const selectedCategory = categoryFilter ? categoryFilter.value : '';
        const selectedSort = sortFilter ? sortFilter.value : 'newest';
        const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
        
        let constraints = [];
        
        // إضافة شرط المنتجات النشطة دائماً
        constraints.push(window.firebaseModules.where("isActive", "==", true));
        
        // فلتر الفئة
        if (selectedCategory) {
            constraints.push(window.firebaseModules.where("category", "==", selectedCategory));
        }
        
        // فلاتر الأزرار (جديد، عروض، الأفضل)
        const activeFilters = document.querySelectorAll('.filter-btn.active');
        activeFilters.forEach(btn => {
            const filter = btn.getAttribute('data-filter');
            if (filter && filter !== 'all') {
                let dbField = filter;
                if (filter === 'new') dbField = 'isNew';
                if (filter === 'sale') dbField = 'isSale';
                if (filter === 'best') dbField = 'isBest';
                constraints.push(window.firebaseModules.where(dbField, "==", true));
            }
        });

        // البحث المعتمد على قاعدة البيانات (Prefix search)
        if (searchTerm) {
            constraints.push(window.firebaseModules.where("name_lowercase", ">=", searchTerm));
            constraints.push(window.firebaseModules.where("name_lowercase", "<=", searchTerm + '\uf8ff'));
        }

        // الترتيب
        if (selectedSort === 'price-low') {
            constraints.push(window.firebaseModules.orderBy("price", "asc"));
        } else if (selectedSort === 'price-high') {
            constraints.push(window.firebaseModules.orderBy("price", "desc"));
        } else {
            // ملاحظة: إذا كان هناك بحث، يجب أن يكون الترتيب متوافقاً مع حقل البحث في Firebase
            if (searchTerm) {
                constraints.push(window.firebaseModules.orderBy("name_lowercase", "asc"));
            } else {
                constraints.push(window.firebaseModules.orderBy("createdAt", "desc"));
            }
        }

        if (isNextPage && lastProductDoc) {
            constraints.push(window.firebaseModules.startAfter(lastProductDoc));
        }
        
        constraints.push(window.firebaseModules.limit(PRODUCTS_PER_PAGE));
        
        const q = window.firebaseModules.query(productsRef, ...constraints);
        const querySnapshot = await window.firebaseModules.getDocs(q);
        
        if (querySnapshot.empty) {
            hasMoreProducts = false;
            if (!isNextPage) {
                if (searchTerm) {
                    displayNoProductsMessage(`لا توجد نتائج للبحث عن "${searchTerm}"`, 'جرب كلمات بحث أخرى أو تصفح الأقسام');
                } else {
                    displayNoProductsMessage();
                }
            }
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            return;
        }
        
        lastProductDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        if (querySnapshot.docs.length < PRODUCTS_PER_PAGE) {
            hasMoreProducts = false;
        }
        
        const newProducts = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || 'بدون اسم',
                price: parseFloat(data.price) || 0,
                originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : null,
                image: data.image || 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png',
                category: data.category || 'غير مصنف',
                stock: parseInt(data.stock) || 0,
                description: data.description || '',
                isNew: data.isNew === true,
                isSale: data.isSale === true,
                isBest: data.isBest === true,
                isActive: data.isActive !== false,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
            };
        }).filter(product => product.stock > 0);
        
        if (!isNextPage) {
            allProducts = newProducts;
        } else {
            newProducts.forEach(newP => {
                if (!allProducts.find(p => p.id === newP.id)) {
                    allProducts.push(newP);
                }
            });
        }
        
        displayProducts(newProducts, isNextPage);
        updateLoadMoreButton();
        
    } catch (error) {
        console.error('❌ خطأ في تحميل المنتجات:', error);
        if (error.message.includes('index')) {
            displayNoProductsMessage('يتطلب النظام إعداد فهارس قاعدة البيانات', 'يرجى مراجعة كونسول Firebase');
        } else if (!isNextPage) {
            displayNoProductsMessage('عذراً، حدث خطأ في تحميل المنتجات');
        }
    } finally {
        isLoadingProducts = false;
        if (loadingIndicator) {
            loadingIndicator.style.display = hasMoreProducts ? 'block' : 'none';
        }
    }
}

function resetAllFilters() {
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    const searchInput = document.getElementById('searchInput');
    
    if (categoryFilter) categoryFilter.value = '';
    if (sortFilter) sortFilter.value = 'newest';
    if (searchInput) searchInput.value = '';
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
    if (allBtn) allBtn.classList.add('active');
    
    loadProducts(false);
}

function displayNoProductsMessage(message = 'لم يتم العثور على منتجات', subMessage = 'حاول تغيير معايير البحث أو الفلاتر') {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    productsGrid.innerHTML = `
        <div class="no-products-container" style="text-align: center; padding: 60px 20px; width: 100%; grid-column: 1/-1; background: #f9f9f9; border-radius: 15px; border: 1px dashed #ddd; margin: 20px 0;">
            <i class="fas fa-search fa-3x" style="color: #ccc; margin-bottom: 20px;"></i>
            <h3 style="color: var(--primary-color); margin-bottom: 10px; font-weight: 700;">${message}</h3>
            <p style="color: #888; font-size: 15px;">${subMessage}</p>
            <button onclick="resetAllFilters()" class="btn-secondary" style="margin-top: 20px; padding: 10px 25px; border-radius: 20px; cursor: pointer;">إعادة تعيين الفلاتر</button>
        </div>
    `;
}

function displayProducts(productsToDisplay, append = false) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    if (!append && productsToDisplay.length === 0) {
        displayNoProductsMessage();
        return;
    }
    
    const currency = typeof siteCurrency !== 'undefined' ? siteCurrency : 'SDG';
    
    const html = productsToDisplay.map(product => {
        const isInFavorites = typeof favorites !== 'undefined' && favorites.some(f => f.id === product.id);
        const hasSale = product.originalPrice && product.originalPrice > product.price;
        const discount = hasSale ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

        return `
            <div class="product-card" data-id="${product.id}">
                ${hasSale ? `<div class="sale-badge">خصم ${discount}%</div>` : ''}
                <div class="product-image" onclick="openProductDetails('${product.id}')">
                    <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png'">
                </div>
                <div class="product-info">
                    <div class="product-category">${product.category}</div>
                    <h3 class="product-title" onclick="openProductDetails('${product.id}')">${product.name}</h3>
                    <div class="product-price">
                        <span class="current-price">${localFormatNumber(product.price)} ${currency}</span>
                        ${hasSale ? `<span class="original-price">${localFormatNumber(product.originalPrice)} ${currency}</span>` : ''}
                    </div>
                    <div class="product-actions">
                        <button class="add-to-cart-btn" onclick="openQuantityModal('${product.id}')" title="إضافة للسلة">
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                        <button class="favorite-btn ${isInFavorites ? 'active' : ''}" onclick="toggleFavorite('${product.id}')" title="إضافة للمفضلة">
                            <i class="${isInFavorites ? 'fas' : 'far'} fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    if (append) {
        productsGrid.insertAdjacentHTML('beforeend', html);
    } else {
        productsGrid.innerHTML = html;
    }
}

function updateLoadMoreButton() {
    const loadMoreBtn = document.getElementById('loadMoreProductsBtn');
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
}

// تصدير الدوال
window.loadProducts = loadProducts;
window.displayProducts = displayProducts;
window.resetAllFilters = resetAllFilters;
window.updateLoadMoreButton = updateLoadMoreButton;
