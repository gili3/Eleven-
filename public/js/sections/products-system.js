// products-system.js - نظام إدارة المنتجات والتحميل اللانهائي (نسخة محسنة مع Session Storage)
// ======================== دالة التعقيم الافتراضية (أمان ضد XSS) ========================

const secureHTML = (function() {
    if (typeof DOMParser !== 'undefined') {
        return function(str) {
            if (!str) return '';
            try {
                const doc = new DOMParser().parseFromString(String(str), 'text/html');
                return doc.body.textContent || '';
            } catch (e) {
                return String(str).replace(/[<>\"']/g, '');
            }
        };
    }
    return function(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };
})();

function getSafeHTML(str) {
    if (window.SecurityCore && typeof window.SecurityCore.sanitizeHTML === 'function') {
        return window.SecurityCore.sanitizeHTML(str);
    }
    if (window.safeHTML && typeof window.safeHTML === 'function') {
        return window.safeHTML(str);
    }
    return secureHTML(str);
}

window.safeHTML = window.safeHTML || getSafeHTML;
window.getSafeHTML = getSafeHTML;

// ======================== نظام الفلاتر (Session Storage) ========================
const FILTERS_KEY = 'products_filters';
const defaultFilters = { q: '', cat: '', sort: 'newest', filter: '' };

function getFilters() {
    try {
        const saved = sessionStorage.getItem(FILTERS_KEY);
        return saved ? { ...defaultFilters, ...JSON.parse(saved) } : { ...defaultFilters };
    } catch (e) { return { ...defaultFilters }; }
}

function saveFilters(f) {
    try { sessionStorage.setItem(FILTERS_KEY, JSON.stringify(f)); } catch (e) {}
}

function syncUI() {
    const f = getFilters();
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = f.q;
    const catSelect = document.getElementById('categoryFilter');
    if (catSelect) catSelect.value = f.cat;
    const sortSelect = document.getElementById('sortFilter');
    if (sortSelect) sortSelect.value = f.sort;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === f.filter);
    });
}

// ======================== دوال الفلاتر العامة ========================
window.executeSearch = function(query) {
    if (!query || query.trim().length < 2) {
        if (typeof showToast === 'function') showToast('اكتب كلمتين على الأقل للبحث', 'info');
        return;
    }
    
    const cleanQuery = query.trim();
    console.log('🔍 تنفيذ البحث:', cleanQuery);
    
    // التأكد من وجود allProducts
    if (!window.allProducts || window.allProducts.length === 0) {
        if (typeof showToast === 'function') showToast('جاري تحميل المنتجات...', 'info');
        // محاولة تحميل المنتجات أولاً
        fetchAllActiveProducts().then(products => {
            window.allProducts = products;
            dispatchProductsLoaded(products);
            performSearchWithProducts(cleanQuery);
        });
        return;
    }
    
    performSearchWithProducts(cleanQuery);
};

function performSearchWithProducts(query) {
    const f = getFilters();
    f.q = query;
    f.cat = '';
    saveFilters(f);
    syncUI();
    
    // الانتقال إلى صفحة المنتجات
    if (typeof showSection === 'function') {
        showSection('products');
    }
    
    // تحميل المنتجات مع الفلتر
    setTimeout(() => {
        resetAndLoad();
    }, 200);
}

window.filterByCategory = function(catId) {
    const f = getFilters();
    f.cat = catId || '';
    saveFilters(f);
    syncUI();
    resetAndLoad();
};

window.toggleFilter = function(filterType) {
    const f = getFilters();
    f.filter = f.filter === filterType ? '' : filterType;
    saveFilters(f);
    syncUI();
    resetAndLoad();
};

window.changeSort = function(sortVal) {
    const f = getFilters();
    f.sort = sortVal || 'newest';
    saveFilters(f);
    syncUI();
    resetAndLoad();
};

window.clearAllFilters = function() {
    saveFilters({ ...defaultFilters });
    syncUI();
    resetAndLoad();
};

// ======================== إدارة المنتجات ==========================

// ------------------------ متغيرات عامة ------------------------
window.lastProductDoc = null;
window.hasMoreProducts = true;
window.isLoadingProducts = false;
window.PRODUCTS_PER_PAGE = 8;

// متغيرات منفصلة للصفحة الرئيسية
window.homeLastProductDoc = null;
window.homeHasMoreProducts = true;
window.homeIsLoadingProducts = false;

// مراقبو التقاطع (Intersection Observers)
window.productsObserver = null;
window.homeObserver = null;

// تخزين جميع المنتجات للبحث المحلي
window.allProducts = [];

// ------------------------ دوال مساعدة ------------------------
function localFormatNumber(num) {
    if (num === null || num === undefined) return "0";
    if (typeof window.formatNumber === 'function') return window.formatNumber(num);
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getFirebaseReference() {
    if (window.firebaseDb) return window.firebaseDb;
    if (window.db) return window.db;
    return null;
}

// ======================== دوال البحث المحلي ========================

function normalizeArabicText(text) {
    if (!text) return '';
    return text
        .replace(/[إأٱآا]/g, 'ا')
        .replace(/[ىي]/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/[ؤئ]/g, 'ء')
        .toLowerCase()
        .trim();
}

function filterProductsBySearch(products, query) {
    if (!query || query.length < 2) return products;
    
    const cleanedQuery = query.toLowerCase().trim();
    const normalizedQuery = normalizeArabicText(query);
    
    return products.filter(product => {
        if (!product || !product.name) return false;
        
        const name = (product.name || '').toLowerCase();
        const desc = (product.description || '').toLowerCase();
        const categoryName = (product.categoryName || product.category || '').toLowerCase();
        const brand = (product.brand || '').toLowerCase();
        
        const nameNormalized = normalizeArabicText(name);
        const descNormalized = normalizeArabicText(desc);
        
        return (
            name.includes(cleanedQuery) ||
            desc.includes(cleanedQuery) ||
            categoryName.includes(cleanedQuery) ||
            brand.includes(cleanedQuery) ||
            nameNormalized.includes(normalizedQuery) ||
            descNormalized.includes(normalizedQuery) ||
            cleanedQuery.split(' ').every(word => name.includes(word)) ||
            name.split(' ').some(word => word.startsWith(cleanedQuery)) ||
            name.replace(/\s+/g, '').includes(cleanedQuery.replace(/\s+/g, ''))
        );
    });
}

// حدث مخصص عند تحديث المنتجات
function dispatchProductsLoaded(products) {
    window.dispatchEvent(new CustomEvent('allProductsUpdated', { 
        detail: { products: products } 
    }));
}

// ======================== إعداد مراقبي التحميل اللانهائي ========================

function setupHomeInfiniteScroll() {
    const sentinel = document.getElementById('homeScrollSentinel');
    if (!sentinel) return;
    if (window.homeObserver) window.homeObserver.disconnect();
    window.homeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && window.homeHasMoreProducts && !window.homeIsLoadingProducts) {
                loadHomeProducts(true);
            }
        });
    }, { root: null, rootMargin: '200px', threshold: 0.1 });
    window.homeObserver.observe(sentinel);
}

function setupProductsInfiniteScroll() {
    const sentinel = document.getElementById('productsScrollSentinel');
    if (!sentinel) return;
    if (window.productsObserver) window.productsObserver.disconnect();
    window.productsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && window.hasMoreProducts && !window.isLoadingProducts) {
                loadProducts(true);
            }
        });
    }, { root: null, rootMargin: '300px', threshold: 0.1 });
    window.productsObserver.observe(sentinel);
}

function resetObservers() {
    if (window.productsObserver) { window.productsObserver.disconnect(); window.productsObserver = null; }
    if (window.homeObserver) { window.homeObserver.disconnect(); window.homeObserver = null; }
    setTimeout(() => {
        const activeSection = document.querySelector('.section.active');
        if (activeSection?.id === 'home') setupHomeInfiniteScroll();
        else if (activeSection?.id === 'products') setupProductsInfiniteScroll();
    }, 300);
}

// ======================== جلب المنتجات من Firestore ========================

async function fetchAllActiveProducts() {
    try {
        const db = getFirebaseReference();
        if (!db || !window.firebaseModules) {
            console.warn('⚠️ Firebase غير جاهز');
            return [];
        }
        
        const productsRef = window.firebaseModules.collection(db, "products");
        const q = window.firebaseModules.query(
            productsRef,
            window.firebaseModules.where("isActive", "==", true),
            window.firebaseModules.limit(500)
        );
        
        const querySnapshot = await window.firebaseModules.getDocs(q);
        
        const products = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            products.push({
                id: doc.id,
                ...data,
                price: parseFloat(data.price) || 0,
                originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : null,
                image: data.image || 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png',
                name: data.name || 'منتج بدون اسم',
                name_lowercase: (data.name || '').toLowerCase(),
                categoryId: data.categoryId || data.category || 'عام',
                stock: data.stock || 0,
                description: data.description || ''
            });
        });
        
        return products;
    } catch (error) {
        console.error('❌ خطأ في جلب المنتجات:', error);
        return [];
    }
}

// ======================== تحميل المنتجات (صفحة "جميع المنتجات") ========================

async function loadProducts(isNextPage = false) {
    if (window.isLoadingProducts) {
        console.log('⏳ التحميل جاري بالفعل');
        return;
    }
    
    const f = getFilters();
    const searchQuery = f.q;
    const categoryId = f.cat;
    const sort = f.sort;
    const activeFilter = f.filter;
    
    if (!isNextPage) {
        window.lastProductDoc = null;
        window.hasMoreProducts = true;
        window.currentPage = 0;
        const productsGrid = document.getElementById('productsGrid');
        if (productsGrid) productsGrid.innerHTML = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (!window.hasMoreProducts) {
        console.log('📭 لا يوجد المزيد من المنتجات');
        return;
    }

    window.isLoadingProducts = true;
    const loadingIndicator = document.getElementById('productsLoading');
    if (loadingIndicator) loadingIndicator.style.display = 'block';

    try {
        if (!isNextPage || window.allProducts.length === 0) {
            if (typeof showLoadingSpinner === 'function' && !isNextPage) {
                showLoadingSpinner('جاري تحميل المنتجات...');
            }
            window.allProducts = await fetchAllActiveProducts();
            dispatchProductsLoaded(window.allProducts);
            if (typeof hideLoadingSpinner === 'function') {
                hideLoadingSpinner();
            }
            console.log(`✅ تم تحميل ${window.allProducts.length} منتج من Firestore`);
        }
        
        let filteredProducts = [...window.allProducts];
        
        if (categoryId) {
            filteredProducts = filteredProducts.filter(p => p.categoryId === categoryId);
        }
        
        if (activeFilter) {
            let field = activeFilter;
            if (activeFilter === 'new') field = 'isNew';
            else if (activeFilter === 'sale') field = 'isSale';
            else if (activeFilter === 'best') field = 'isBest';
            filteredProducts = filteredProducts.filter(p => p[field] === true);
        }
        
        filteredProducts = filteredProducts.filter(p => p.stock > 0);
        
        if (searchQuery && searchQuery.length >= 2) {
            console.log('🔍 تطبيق البحث:', searchQuery);
            filteredProducts = filterProductsBySearch(filteredProducts, searchQuery);
            console.log(`🔍 نتائج البحث: ${filteredProducts.length} منتج`);
        }
        
        if (sort === 'price-low') {
            filteredProducts.sort((a, b) => a.price - b.price);
        } else if (sort === 'price-high') {
            filteredProducts.sort((a, b) => b.price - a.price);
        } else {
            filteredProducts.sort((a, b) => {
                const aTime = a.createdAt?.toDate?.() || a.createdAt || 0;
                const bTime = b.createdAt?.toDate?.() || b.createdAt || 0;
                return new Date(bTime) - new Date(aTime);
            });
        }
        
        const startIndex = isNextPage ? window.currentPage * window.PRODUCTS_PER_PAGE : 0;
        const endIndex = startIndex + window.PRODUCTS_PER_PAGE;
        const pageProducts = filteredProducts.slice(startIndex, endIndex);
        
        window.currentPage = isNextPage ? (window.currentPage || 0) + 1 : 0;
        window.hasMoreProducts = endIndex < filteredProducts.length;
        
        if (pageProducts.length === 0 && !isNextPage) {
            displayNoProductsMessage(
                searchQuery && searchQuery.length >= 2 ? `لا توجد منتجات تطابق "${searchQuery}"` : 'لا توجد منتجات في هذه الفئة'
            );
        } else {
            displayProducts(pageProducts, isNextPage);
        }
        
        console.log(`📄 عرض الصفحة ${window.currentPage}: ${pageProducts.length} منتج (المجموع: ${filteredProducts.length})`);
        
    } catch (error) {
        console.error('❌ خطأ في تحميل المنتجات:', error);
        if (!isNextPage) {
            displayNoProductsMessage('حدث خطأ في تحميل المنتجات');
        }
    } finally {
        window.isLoadingProducts = false;
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

function resetAndLoad() {
    window.lastProductDoc = null;
    window.hasMoreProducts = true;
    window.isLoadingProducts = false;
    window.currentPage = 0;
    const productsGrid = document.getElementById('productsGrid');
    if (productsGrid) productsGrid.innerHTML = '';
    loadProducts(false);
}

// للتوافق مع باقي الأنظمة
window.resetProductsState = resetAndLoad;
window.resetAllFilters = window.clearAllFilters;
window.clearSearchAndReload = function() {
    const f = getFilters();
    f.q = '';
    saveFilters(f);
    syncUI();
    resetAndLoad();
};

// ======================== تحميل منتجات الصفحة الرئيسية ========================

async function loadHomeProducts(isNextPage = false) {
    if (window.homeIsLoadingProducts) return;
    if (!isNextPage) {
        window.homeLastProductDoc = null;
        window.homeHasMoreProducts = true;
        const homeGrid = document.getElementById('homeProductsGrid');
        if (homeGrid) homeGrid.innerHTML = '';
    } else if (!window.homeHasMoreProducts) return;

    window.homeIsLoadingProducts = true;
    const loadingIndicator = document.getElementById('homeProductsLoading');
    if (loadingIndicator) loadingIndicator.style.display = 'block';

    try {
        const db = getFirebaseReference();
        if (!db || !window.firebaseModules) throw new Error('❌ Firebase غير مهيأ');

        const productsRef = window.firebaseModules.collection(db, "products");
        let constraints = [
            window.firebaseModules.where("isActive", "==", true),
            window.firebaseModules.orderBy("createdAt", "desc"),
            window.firebaseModules.orderBy("__name__", "desc")
        ];
        if (isNextPage && window.homeLastProductDoc) {
            constraints.push(window.firebaseModules.startAfter(window.homeLastProductDoc));
        }
        constraints.push(window.firebaseModules.limit(window.PRODUCTS_PER_PAGE));

        const q = window.firebaseModules.query(productsRef, ...constraints);
        const querySnapshot = await window.firebaseModules.getDocs(q);

        if (querySnapshot.empty) {
            window.homeHasMoreProducts = false;
            if (!isNextPage) {
                const homeGrid = document.getElementById('homeProductsGrid');
                if (homeGrid) homeGrid.innerHTML = '<p style="text-align:center; padding:20px;">لا توجد منتجات حالياً</p>';
            }
            return;
        }

        window.homeLastProductDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        window.homeHasMoreProducts = querySnapshot.docs.length === window.PRODUCTS_PER_PAGE;

        const products = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                price: parseFloat(data.price) || 0,
                originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : null,
                image: data.image || 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png',
                name: data.name || 'منتج بدون اسم',
                categoryId: data.categoryId || data.category || 'عام',
                stock: data.stock || 0
            };
        });
        displayHomeProducts(products, isNextPage);
    } catch (error) {
        console.error('❌ خطأ في تحميل منتجات الرئيسية:', error);
    } finally {
        window.homeIsLoadingProducts = false;
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

// ======================== عرض المنتجات ========================

function displayProducts(productsToDisplay, append = false) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    const currency = window.siteCurrency || 'SDG';
    const html = productsToDisplay.map(p => generateProductCardHTML(p, currency)).join('');
    if (append) productsGrid.insertAdjacentHTML('beforeend', html);
    else productsGrid.innerHTML = html;
    
    const f = getFilters();
    if (f.q && f.q.length >= 2 && !append) {
        const searchInfo = document.createElement('div');
        searchInfo.style.cssText = 'text-align:center; padding:10px; margin-bottom:15px; color:#666; font-size:14px; grid-column:1/-1;';
        searchInfo.textContent = `نتائج البحث عن "${f.q}" (${productsToDisplay.length} منتج)`;
        productsGrid.prepend(searchInfo);
    }
}

function displayHomeProducts(products, append = false) {
    const homeGrid = document.getElementById('homeProductsGrid');
    if (!homeGrid) return;
    const currency = window.siteCurrency || 'SDG';
    const html = products.map(p => generateProductCardHTML(p, currency)).join('');
    if (append) homeGrid.insertAdjacentHTML('beforeend', html);
    else homeGrid.innerHTML = html;
}

function generateProductCardHTML(product, currency) {
    const favorites = window.AppState?.favorites || [];
    const isInFavorites = favorites.some(f => f?.id === product.id);
    const hasSale = product.originalPrice && product.originalPrice > product.price;
    const discount = hasSale ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
    const imageUrl = product.image || 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png';
    
    let categoryName = 'منتجات';
    if (window.getCategoryName) categoryName = window.getCategoryName(product.categoryId) || 'منتجات';
    else if (product.category) categoryName = product.category;

    const safeName = getSafeHTML(product.name || 'منتج بدون اسم');
    const safeCategory = getSafeHTML(categoryName);
    const safeId = String(product.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
    
    return `
        <div class="product-card" data-id="${safeId}">
            ${hasSale ? `<div class="badge sale">-${discount}%</div>` : ''}
            ${product.isNew ? '<div class="badge new">جديد</div>' : ''}
            ${product.isBest ? '<div class="badge best">الأفضل</div>' : ''}
            <div class="product-image" onclick="openProductDetails('${safeId}')">
                <img src="${imageUrl}" alt="${safeName}" loading="lazy" onerror="this.src='https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png'">
            </div>
            <div class="product-info">
                <div class="product-category-tag">${safeCategory}</div>
                <h3 onclick="openProductDetails('${safeId}')">${safeName}</h3>
                <div class="product-price">
                    <span class="current-price">${product.price === 0 ? 'اتصل للسعر' : localFormatNumber(product.price) + ' ' + currency}</span>
                    ${hasSale ? `<span class="original-price">${localFormatNumber(product.originalPrice)} ${currency}</span>` : ''}
                </div>
                <div class="product-actions">
                    ${product.price === 0 ? '' : `<button class="add-to-cart-btn" onclick="openQuantityModal('${safeId}')"><i class="fas fa-shopping-cart"></i> إضافة</button>`}
                    <button class="favorite-btn ${isInFavorites ? 'active' : ''}" onclick="toggleFavorite('${safeId}')"><i class="${isInFavorites ? 'fas' : 'far'} fa-heart"></i></button>
                </div>
            </div>
        </div>
    `;
}

function displayNoProductsMessage(message) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    const safeMsg = getSafeHTML(message);
    const f = getFilters();
    
    productsGrid.innerHTML = `
        <div class="no-products-container" style="text-align:center; padding:60px; grid-column:1/-1;">
            <i class="fas fa-search fa-3x" style="color:#ccc;margin-bottom:15px;"></i>
            <h3 style="color:#666;">${safeMsg}</h3>
            <div style="margin-top:20px; display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                ${f.q && f.q.length >= 2 ? `
                <button onclick="window.clearSearchAndReload()" class="btn-secondary" style="padding:10px 20px; background:var(--secondary-color); color:white; border:none; border-radius:8px; cursor:pointer; font-family:'Cairo';">مسح البحث</button>
                ` : ''}
                <button onclick="window.clearAllFilters()" class="btn-secondary" style="padding:10px 20px; background:var(--primary-color); color:white; border:none; border-radius:8px; cursor:pointer; font-family:'Cairo';">إعادة تعيين الفلاتر</button>
            </div>
        </div>
    `;
}

// ======================== دوال تفاصيل المنتج والكمية ========================

async function fetchProductFromFirebase(productId) {
    if (!productId) return null;
    try {
        const db = getFirebaseReference();
        if (!db || !window.firebaseModules) return null;
        
        const docSnap = await window.firebaseModules.getDoc(
            window.firebaseModules.doc(db, "products", productId)
        );
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                price: parseFloat(data.price) || 0,
                originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : null,
                image: data.image || 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png',
                name: data.name || 'منتج بدون اسم',
                categoryId: data.categoryId || data.category || 'عام',
                stock: data.stock || 0,
                description: data.description || 'لا يوجد وصف'
            };
        }
        return null;
    } catch (error) {
        console.error('❌ خطأ في جلب المنتج:', error);
        return null;
    }
}

async function openProductDetails(productId) {
    console.log(`🔍 فتح تفاصيل المنتج: ${productId}`);
    if (!productId) return;

    let product = await fetchProductFromFirebase(productId);
    if (!product) {
        product = window.allProducts.find(p => p.id === productId);
        if (!product) {
            if (typeof showToast === 'function') showToast('المنتج غير موجود', 'error');
            return;
        }
    }

    const modal = document.getElementById('productDetailsModal');
    if (!modal) return;

    const titleEl = document.getElementById('modalProductTitle');
    const imageEl = document.getElementById('modalProductImage');
    const priceEl = document.getElementById('modalProductPrice');
    const descEl = document.getElementById('modalProductDescription');
    const stockEl = document.getElementById('modalProductStock');
    const categoryEl = document.getElementById('modalProductCategory');

    let categoryName = 'منتجات';
    if (window.getCategoryName) categoryName = window.getCategoryName(product.categoryId) || 'منتجات';
    else if (product.category) categoryName = product.category;

    const safeName = getSafeHTML(product.name);
    const safeDesc = getSafeHTML(product.description || 'لا يوجد وصف');
    const safeCategory = getSafeHTML(categoryName);

    if (titleEl) titleEl.textContent = safeName;
    if (imageEl) {
        imageEl.src = product.image || 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png';
        imageEl.onerror = () => { imageEl.src = 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png'; };
    }
    const currency = window.siteCurrency || 'SDG';
    const formatNum = window.formatNumber || localFormatNumber;
    if (priceEl) {
        if (product.price === 0) priceEl.innerHTML = '<span class="current-price">اتصل للسعر</span>';
        else if (product.originalPrice && product.originalPrice > product.price) {
            priceEl.innerHTML = `<span class="current-price">${formatNum(product.price)} ${currency}</span>
                                 <span class="original-price">${formatNum(product.originalPrice)} ${currency}</span>`;
        } else priceEl.innerHTML = `<span class="current-price">${formatNum(product.price)} ${currency}</span>`;
    }
    if (descEl) descEl.innerHTML = safeDesc;
    if (stockEl) {
        stockEl.textContent = product.stock > 0 ? product.stock : 'غير متوفر';
        stockEl.style.color = product.stock > 0 ? '#27ae60' : '#e74c3c';
    }
    if (categoryEl) categoryEl.textContent = safeCategory;

    const buyBtn = document.getElementById('modalBuyBtn');
    if (buyBtn) {
        const newBtn = buyBtn.cloneNode(true);
        buyBtn.parentNode.replaceChild(newBtn, buyBtn);
        newBtn.onclick = () => {
            modal.classList.remove('active');
            setTimeout(() => openQuantityModal(productId), 100);
        };
    }
    modal.classList.add('active');
}

function closeProductDetailsModal() {
    const modal = document.getElementById('productDetailsModal');
    if (modal) modal.classList.remove('active');
}

async function openQuantityModal(productId) {
    if (!productId) return;

    let product = await fetchProductFromFirebase(productId);
    if (!product) {
        product = window.allProducts.find(p => p.id === productId);
        if (!product) {
            if (typeof showToast === 'function') showToast('المنتج غير متوفر حالياً', 'warning');
            return;
        }
    }
    
    if (product.stock <= 0) {
        if (typeof showToast === 'function') showToast('المنتج غير متوفر حالياً', 'warning');
        return;
    }

    window.selectedProductForQuantity = product;
    const nameEl = document.getElementById('quantityModalProductName');
    if (nameEl) nameEl.textContent = getSafeHTML(product.name);
    const displayEl = document.getElementById('modalQuantityDisplay');
    if (displayEl) displayEl.textContent = '1';
    const modal = document.getElementById('quantityModal');
    if (modal) modal.classList.add('active');
}

function closeQuantityModal() {
    const modal = document.getElementById('quantityModal');
    if (modal) {
        modal.classList.remove('active');
        window.selectedProductForQuantity = null;
    }
}

function changeModalQuantity(change) {
    const displayEl = document.getElementById('modalQuantityDisplay');
    if (!displayEl) return;
    let current = parseInt(displayEl.textContent) || 1;
    let newQty = current + change;
    if (newQty < 1) return;
    if (window.selectedProductForQuantity) {
        const maxStock = window.selectedProductForQuantity.stock || 99;
        if (newQty > maxStock) {
            if (typeof showToast === 'function') showToast(`الكمية المتوفرة: ${maxStock}`, 'warning');
            return;
        }
    }
    displayEl.textContent = newQty;
}

function confirmAddToCart() {
    if (!window.selectedProductForQuantity) { closeQuantityModal(); return; }
    const qtyEl = document.getElementById('modalQuantityDisplay');
    const quantity = qtyEl ? parseInt(qtyEl.textContent) || 1 : 1;
    if (typeof window.addToCart === 'function') {
        window.addToCart(window.selectedProductForQuantity.id, quantity);
    }
    closeQuantityModal();
}

function confirmBuyNow() {
    if (!window.selectedProductForQuantity) { closeQuantityModal(); return; }
    const qtyEl = document.getElementById('modalQuantityDisplay');
    const quantity = qtyEl ? parseInt(qtyEl.textContent) || 1 : 1;
    if (typeof window.buyNowDirect === 'function') {
        window.buyNowDirect(window.selectedProductForQuantity.id, quantity);
    }
    closeQuantityModal();
}

function initializeHomePage() {
    const homeGrid = document.getElementById('homeProductsGrid');
    if (homeGrid && homeGrid.children.length === 0) loadHomeProducts(false);
    setupHomeInfiniteScroll();
}

function initializeProductsPage() {
    syncUI();
    resetAndLoad();
    setupProductsInfiniteScroll();
}

// ======================== إدارة المفضلة ========================
function toggleFavorite(productId) {
    if (!window.AppState) return;
    const product = window.allProducts.find(p => p.id === productId);
    if (!product) return;
    window.AppState.toggleFavorite({
        id: product.id, name: product.name, price: product.price, image: product.image
    });
    updateFavoriteButtons();
    if (typeof showToast === 'function') {
        showToast(window.AppState.favorites.some(f => f.id === productId) ? 'تمت الإضافة للمفضلة' : 'تم الحذف من المفضلة', 'info');
    }
}

function updateFavoriteButtons() {
    const favorites = window.AppState?.favorites || [];
    const favIds = favorites.map(f => f.id);
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const card = btn.closest('.product-card');
        const pid = card ? card.getAttribute('data-id') : btn.getAttribute('data-id');
        if (favIds.includes(pid)) {
            btn.classList.add('active');
            const icon = btn.querySelector('i');
            if (icon) icon.className = 'fas fa-heart';
        } else {
            btn.classList.remove('active');
            const icon = btn.querySelector('i');
            if (icon) icon.className = 'far fa-heart';
        }
    });
}

function updateFavoritesDisplay() {
    const favoritesList = document.getElementById('favoritesList');
    const emptyMessage = document.getElementById('emptyFavoritesMessage');
    if (!favoritesList) return;
    const favorites = window.AppState?.favorites || [];
    if (favorites.length === 0) {
        favoritesList.innerHTML = '';
        if (emptyMessage) emptyMessage.style.display = 'block';
        return;
    }
    if (emptyMessage) emptyMessage.style.display = 'none';
    const currency = window.siteCurrency || 'SDG';
    const formatNum = window.formatNumber || localFormatNumber;
    favoritesList.innerHTML = favorites.map(product => {
        const safeName = getSafeHTML(product.name || '');
        const safeId = String(product.id).replace(/[^a-zA-Z0-9_-]/g, '');
        return `
        <div class="product-card" data-id="${safeId}">
            <div class="product-image-container" style="position:relative;">
                <img src="${product.image || 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png'}" alt="${safeName}" style="width:100%; cursor:pointer;" onclick="openProductDetails('${safeId}')">
                <button class="favorite-btn active" data-id="${safeId}" onclick="toggleFavorite('${safeId}')" style="position:absolute; top:10px; right:10px; background:white; border-radius:50%; width:40px; height:40px;"><i class="fas fa-heart" style="color:#e74c3c;"></i></button>
            </div>
            <div style="padding:12px;">
                <h3 style="font-size:14px;">${safeName}</h3>
                <span style="font-size:16px; font-weight:700;">${formatNum(product.price)} ${currency}</span>
            </div>
        </div>
    `}).join('');
}

// ======================== تصدير الدوال العامة ========================

window.resetProductsState = resetAndLoad;
window.loadProducts = loadProducts;
window.loadHomeProducts = loadHomeProducts;
window.resetAllFilters = window.clearAllFilters;
window.clearSearchAndReload = window.clearSearchAndReload;
window.initializeHomePage = initializeHomePage;
window.initializeProductsPage = initializeProductsPage;
window.openProductDetails = openProductDetails;
window.closeProductDetailsModal = closeProductDetailsModal;
window.openQuantityModal = openQuantityModal;
window.closeQuantityModal = closeQuantityModal;
window.changeModalQuantity = changeModalQuantity;
window.confirmAddToCart = confirmAddToCart;
window.confirmBuyNow = confirmBuyNow;
window.resetObservers = resetObservers;
window.setupProductsInfiniteScroll = setupProductsInfiniteScroll;
window.setupHomeInfiniteScroll = setupHomeInfiniteScroll;
window.toggleFavorite = toggleFavorite;
window.updateFavoriteButtons = updateFavoriteButtons;
window.updateFavoritesDisplay = updateFavoritesDisplay;
window.getSafeHTML = getSafeHTML;
window.filterProductsBySearch = filterProductsBySearch;
window.fetchAllActiveProducts = fetchAllActiveProducts;
window.getFilters = getFilters;
window.syncUI = syncUI;
window.dispatchProductsLoaded = dispatchProductsLoaded;
window.performSearchWithProducts = performSearchWithProducts;

// ======================== التهيئة ========================

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const homeSection = document.getElementById('home');
        if (homeSection?.classList.contains('active')) initializeHomePage();
        const productsSection = document.getElementById('products');
        if (productsSection?.classList.contains('active')) initializeProductsPage();
    }, 500);
});

// الاستماع لتحديث المنتجات
window.addEventListener('allProductsUpdated', function(e) {
    if (e.detail && e.detail.products) {
        console.log('✅ تم تحديث allProducts من حدث allProductsUpdated');
    }
});

if (window.AppState) {
    window.AppState.subscribe('favorites', () => {
        updateFavoriteButtons();
        updateFavoritesDisplay();
    });
}

console.log('✅ products-system.js جاهز');