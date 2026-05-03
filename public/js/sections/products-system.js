// products-system.js - نظام إدارة المنتجات والتحميل اللانهائي (نسخة تعتمد على Firebase مباشرة)
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

// تخزين آخر معايير الفلتر المستخدمة لضمان الاتساق
window.lastUsedFilters = {
    categoryId: '',
    sort: 'newest',
    search: '',
    activeFilters: []
};

// مراقبو التقاطع (Intersection Observers)
window.productsObserver = null;
window.homeObserver = null;

// ------------------------ دوال مساعدة ------------------------
function localFormatNumber(num) {
    if (num === null || num === undefined) return "0";
    if (typeof window.formatNumber === 'function') return window.formatNumber(num);
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * الحصول على مرجع Firebase
 */
function getFirebaseReference() {
    if (window.firebaseDb) return window.firebaseDb;
    if (window.db) return window.db;
    if (typeof window.getFirebaseReference === 'function') return window.getFirebaseReference();
    return null;
}

/**
 * جلب منتج واحد من Firebase مباشرة باستخدام معرفه
 * @param {string} productId - معرف المنتج
 * @returns {Promise<Object|null>} - بيانات المنتج أو null
 */
async function fetchProductFromFirebase(productId) {
    if (!productId) return null;
    try {
        const db = getFirebaseReference();
        if (!db || !window.firebaseModules) {
            console.warn('⚠️ Firebase غير جاهز');
            return null;
        }
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
        console.error('❌ خطأ في جلب المنتج من Firebase:', error);
        return null;
    }
}

/**
 * الحصول على معايير الفلتر الحالية من واجهة المستخدم
 */
function getCurrentFilters() {
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    const searchInput = document.getElementById('searchInput');

    const categoryId = categoryFilter ? categoryFilter.value : '';
    const sort = sortFilter ? sortFilter.value : 'newest';
    const search = searchInput ? searchInput.value.trim().toLowerCase() : '';

    const activeFilters = [];
    document.querySelectorAll('.filter-btn.active').forEach(btn => {
        const filter = btn.getAttribute('data-filter');
        if (filter) activeFilters.push(filter);
    });

    return { categoryId, sort, search, activeFilters };
}

/**
 * التحقق من تغير الفلاتر
 */
function haveFiltersChanged(currentFilters) {
    return (
        currentFilters.categoryId !== window.lastUsedFilters.categoryId ||
        currentFilters.sort !== window.lastUsedFilters.sort ||
        currentFilters.search !== window.lastUsedFilters.search ||
        JSON.stringify(currentFilters.activeFilters) !== JSON.stringify(window.lastUsedFilters.activeFilters)
    );
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

// ======================== تحميل المنتجات (صفحة "جميع المنتجات") ========================

async function loadProducts(isNextPage = false) {
    if (window.isLoadingProducts) return;
    const currentFilters = getCurrentFilters();
    if (isNextPage && haveFiltersChanged(currentFilters)) { loadProducts(false); return; }

    if (!isNextPage) {
        window.lastProductDoc = null;
        window.hasMoreProducts = true;
        window.lastUsedFilters = { ...currentFilters };
        const productsGrid = document.getElementById('productsGrid');
        if (productsGrid) productsGrid.innerHTML = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (!window.hasMoreProducts) return;

    window.isLoadingProducts = true;
    const loadingIndicator = document.getElementById('productsLoading');
    if (loadingIndicator) loadingIndicator.style.display = 'block';

    try {
        const db = getFirebaseReference();
        if (!db || !window.firebaseModules) throw new Error('❌ Firebase غير مهيأ');

        const productsRef = window.firebaseModules.collection(db, "products");
        let constraints = [
            window.firebaseModules.where("isActive", "==", true)
        ];

        // في Firebase، لا يمكن الجمع بين فلتر النطاق (stock > 0) وفلتر آخر على حقل مختلف (مثل categoryId) بسهولة دون فهارس مركبة
        // لذا سنكتفي بـ isActive حالياً ونقوم بفلترة stock برمجياً إذا لزم الأمر أو نعتمد على isActive فقط
        // constraints.push(window.firebaseModules.where("stock", ">", 0));

        if (currentFilters.categoryId) {
            constraints.push(window.firebaseModules.where("categoryId", "==", currentFilters.categoryId));
        }

        // دعم الفلاتر المتعددة (isNew, isSale, isBest)
        // ملاحظة: Firebase يدعم استعلام "==" واحد فقط على حقول مختلفة في الاستعلامات البسيطة
        // سنستخدم أول فلتر نشط للاستعلام من الخادم
        if (currentFilters.activeFilters.length > 0) {
            const firstFilter = currentFilters.activeFilters[0];
            let field = firstFilter;
            if (firstFilter === 'isNew' || firstFilter === 'new') field = 'isNew';
            else if (firstFilter === 'isSale' || firstFilter === 'sale') field = 'isSale';
            else if (firstFilter === 'isBest' || firstFilter === 'best') field = 'isBest';
            constraints.push(window.firebaseModules.where(field, "==", true));
        }

        const hasSearch = currentFilters.search && currentFilters.search.length > 0;
        if (hasSearch) {
            // البحث يتطلب الترتيب حسب الحقل المبحوث عنه أولاً
            constraints.push(
                window.firebaseModules.where("name_lowercase", ">=", currentFilters.search),
                window.firebaseModules.where("name_lowercase", "<=", currentFilters.search + '\uf8ff')
            );
            constraints.push(window.firebaseModules.orderBy("name_lowercase", "asc"));
        } else {
            // الترتيب العادي في حالة عدم وجود بحث
            if (currentFilters.sort === 'price-low') {
                constraints.push(window.firebaseModules.orderBy("price", "asc"));
            } else if (currentFilters.sort === 'price-high') {
                constraints.push(window.firebaseModules.orderBy("price", "desc"));
            } else {
                constraints.push(window.firebaseModules.orderBy("createdAt", "desc"));
            }
        }
        
        // إضافة الترتيب الثانوي لضمان ثبات النتائج والتحميل اللانهائي
        constraints.push(window.firebaseModules.orderBy("__name__", hasSearch ? "asc" : (currentFilters.sort === 'price-high' || currentFilters.sort === 'newest' ? "desc" : "asc")));

        if (isNextPage && window.lastProductDoc) {
            constraints.push(window.firebaseModules.startAfter(window.lastProductDoc));
        }
        constraints.push(window.firebaseModules.limit(window.PRODUCTS_PER_PAGE));

        const q = window.firebaseModules.query(productsRef, ...constraints);
        const querySnapshot = await window.firebaseModules.getDocs(q);

        if (querySnapshot.empty) {
            window.hasMoreProducts = false;
            if (!isNextPage) displayNoProductsMessage('لا توجد منتجات');
            return;
        }

        window.lastProductDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        window.hasMoreProducts = querySnapshot.docs.length === window.PRODUCTS_PER_PAGE;

        let newProducts = querySnapshot.docs.map(doc => {
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

        // تصفية إضافية برمجياً للتعامل مع قيود Firebase (مثل stock > 0 والفلاتر المتعددة)
        newProducts = newProducts.filter(p => {
            // فلتر المخزون
            if (p.stock <= 0) return false;
            
            // فلتر الفئات المتعددة (إذا كان هناك أكثر من فلتر نشط)
            if (currentFilters.activeFilters.length > 1) {
                for (let i = 1; i < currentFilters.activeFilters.length; i++) {
                    const filter = currentFilters.activeFilters[i];
                    let field = filter;
                    if (filter === 'isNew' || filter === 'new') field = 'isNew';
                    else if (filter === 'isSale' || filter === 'sale') field = 'isSale';
                    else if (filter === 'isBest' || filter === 'best') field = 'isBest';
                    
                    if (p[field] !== true) return false;
                }
            }
            return true;
        });

        // تحديث allProducts (للاستخدام في العروض فقط، وليس للجلب)
        if (typeof window.allProducts !== 'undefined') {
            if (!isNextPage) window.allProducts = newProducts;
            else newProducts.forEach(p => { if (!window.allProducts.find(ex => ex.id === p.id)) window.allProducts.push(p); });
        }

        displayProducts(newProducts, isNextPage);
        setTimeout(() => {
            const sentinel = document.getElementById('productsScrollSentinel');
            if (sentinel && window.hasMoreProducts && window.productsObserver) {
                window.productsObserver.unobserve(sentinel);
                window.productsObserver.observe(sentinel);
            }
        }, 100);

    } catch (error) {
        console.error('❌ خطأ في تحميل المنتجات:', error);
        window.hasMoreProducts = false;
        if (!isNextPage) displayNoProductsMessage('حدث خطأ في تحميل المنتجات');
    } finally {
        window.isLoadingProducts = false;
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

// تحميل منتجات الصفحة الرئيسية (مشابه)
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

// عرض المنتجات (نفس الكود السابق لكن مع safeHTML)
function displayProducts(productsToDisplay, append = false) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    const currency = window.siteCurrency || 'SDG';
    const html = productsToDisplay.map(p => generateProductCardHTML(p, currency)).join('');
    if (append) productsGrid.insertAdjacentHTML('beforeend', html);
    else productsGrid.innerHTML = html;
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

    const safeName = window.safeHTML ? window.safeHTML(product.name) : product.name;
    const safeCategory = window.safeHTML ? window.safeHTML(categoryName) : categoryName;
    const safeId = product.id.replace(/[^a-zA-Z0-9_-]/g, '');
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
    const safeMsg = window.safeHTML ? window.safeHTML(message) : message;
    productsGrid.innerHTML = `<div class="no-products-container" style="text-align:center; padding:60px;"><i class="fas fa-search fa-3x"></i><h3>${safeMsg}</h3><button onclick="resetAllFilters()" class="btn-secondary">إعادة تعيين الفلاتر</button></div>`;
}

function resetAllFilters() {
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    const searchInput = document.getElementById('searchInput');
    if (categoryFilter) categoryFilter.value = '';
    if (sortFilter) sortFilter.value = 'newest';
    if (searchInput) searchInput.value = '';
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (typeof window.filterByCategory === 'function') window.filterByCategory('');
    else { window.lastProductDoc = null; window.hasMoreProducts = true; loadProducts(false); }
}

// ======================== دوال تفاصيل المنتج والكمية (جلب مباشر من Firebase) ========================

async function openProductDetails(productId) {
    console.log(`🔍 فتح تفاصيل المنتج: ${productId}`);
    if (!productId) { showToast('بيانات المنتج غير صالحة', 'error'); return; }

    // جلب المنتج مباشرة من Firebase
    let product = await fetchProductFromFirebase(productId);
    if (!product) {
        showToast('المنتج غير موجود', 'error');
        return;
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

    const safeName = window.safeHTML ? window.safeHTML(product.name) : product.name;
    const safeDesc = window.safeHTML ? window.safeHTML(product.description) : product.description;
    const safeCategory = window.safeHTML ? window.safeHTML(categoryName) : categoryName;

    if (titleEl) titleEl.textContent = safeName;
    if (imageEl) {
        imageEl.src = product.image;
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

    // زر الشراء المباشر
    const buyBtn = document.getElementById('modalBuyBtn');
    if (buyBtn) {
        const newBtn = buyBtn.cloneNode(true);
        buyBtn.parentNode.replaceChild(newBtn, buyBtn);
        newBtn.onclick = () => {
            modal.classList.remove('active');
            setTimeout(() => openQuantityModal(productId), 100);
        };
    }
    modal.setAttribute('data-product-id', productId);
    modal.classList.add('active');
}

async function openQuantityModal(productId) {
    console.log(`🔢 فتح نافذة الكمية: ${productId}`);
    if (!productId) { showToast('بيانات المنتج غير صالحة', 'error'); return; }

    let product = await fetchProductFromFirebase(productId);
    if (!product) {
        showToast('المنتج غير موجود', 'error');
        return;
    }
    if (product.stock <= 0) {
        showToast('المنتج غير متوفر حالياً', 'warning');
        return;
    }

    window.selectedProductForQuantity = product;
    const nameEl = document.getElementById('quantityModalProductName');
    if (nameEl) nameEl.textContent = window.safeHTML ? window.safeHTML(product.name) : product.name;
    const displayEl = document.getElementById('modalQuantityDisplay');
    if (displayEl) displayEl.textContent = '1';
    const modal = document.getElementById('quantityModal');
    if (modal) modal.classList.add('active');
}

function closeProductDetailsModal() {
    const modal = document.getElementById('productDetailsModal');
    if (modal) modal.classList.remove('active');
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
            showToast(`الكمية المتوفرة: ${maxStock}`, 'warning');
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

function watchSectionChanges() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            if (m.type === 'attributes' && m.attributeName === 'class') {
                const section = m.target;
                if (section.classList.contains('active')) {
                    if (section.id === 'home') setupHomeInfiniteScroll();
                    else if (section.id === 'products') setupProductsInfiniteScroll();
                }
            }
        });
    });
    document.querySelectorAll('.section').forEach(s => observer.observe(s, { attributes: true }));
}

function resetProductsState() {
    window.lastProductDoc = null;
    window.hasMoreProducts = true;
    window.isLoadingProducts = false;
}

// ======================== إدارة المفضلة ========================
function toggleFavorite(productId) {
    if (!window.AppState) return;
    fetchProductFromFirebase(productId).then(product => {
        if (!product) return;
        window.AppState.toggleFavorite({
            id: product.id, name: product.name, price: product.price, image: product.image
        });
        updateFavoriteButtons();
        showToast(window.AppState.favorites.some(f => f.id === productId) ? 'تمت الإضافة للمفضلة' : 'تم الحذف من المفضلة', 'info');
    });
}

function updateFavoriteButtons() {
    const favorites = window.AppState?.favorites || [];
    const favIds = favorites.map(f => f.id);
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const pid = btn.getAttribute('data-id');
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
    favoritesList.innerHTML = favorites.map(product => `
        <div class="product-card" data-id="${product.id}">
            <div class="product-image-container" style="position:relative;">
                <img src="${product.image || 'https://via.placeholder.com/200'}" alt="${window.safeHTML ? window.safeHTML(product.name) : product.name}" style="width:100%; cursor:pointer;" onclick="openProductDetails('${product.id}')">
                <button class="favorite-btn active" data-id="${product.id}" onclick="toggleFavorite('${product.id}')" style="position:absolute; top:10px; right:10px; background:white; border-radius:50%; width:40px; height:40px;"><i class="fas fa-heart" style="color:#e74c3c;"></i></button>
            </div>
            <div style="padding:12px;">
                <h3 style="font-size:14px;">${window.safeHTML ? window.safeHTML(product.name) : product.name}</h3>
                <span style="font-size:16px; font-weight:700;">${formatNum(product.price)} ${currency}</span>
            </div>
        </div>
    `).join('');
}

// تصدير الدوال
window.resetProductsState = resetProductsState;
window.loadProducts = loadProducts;
window.loadHomeProducts = loadHomeProducts;
window.resetAllFilters = resetAllFilters;
window.initializeHomePage = initializeHomePage;
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

// تهيئة
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        watchSectionChanges();
        const homeSection = document.getElementById('home');
        if (homeSection?.classList.contains('active')) initializeHomePage();
        const productsSection = document.getElementById('products');
        if (productsSection?.classList.contains('active')) {
            setupProductsInfiniteScroll();
            if (document.getElementById('productsGrid')?.children.length === 0) loadProducts(false);
        }
    }, 500);
});

if (window.AppState) {
    window.AppState.subscribe('favorites', () => { updateFavoriteButtons(); updateFavoritesDisplay(); });
}

console.log('✅ products-system.js (نسخة تعتمد على Firebase مباشرة)');