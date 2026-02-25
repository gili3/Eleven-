// products-system.js - نظام إدارة المنتجات والتحميل اللانهائي (نسخة مصححة مع دعم الفئات)
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
 * الحصول على معايير الفلتر الحالية من واجهة المستخدم (محسنة للفئات)
 */
function getCurrentFilters() {
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    const searchInput = document.getElementById('searchInput');

    const categoryId = categoryFilter ? categoryFilter.value : '';
    const sort = sortFilter ? sortFilter.value : 'newest';
    const search = searchInput ? searchInput.value.trim().toLowerCase() : '';

    // جمع أزرار الفلاتر النشطة
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

/**
 * إعداد Intersection Observer للصفحة الرئيسية
 */
function setupHomeInfiniteScroll() {
    console.log('🏠 [Observer] محاولة إعداد مراقب الصفحة الرئيسية...');
    
    const sentinel = document.getElementById('homeScrollSentinel');
    if (!sentinel) {
        console.warn('⚠️ [Observer] عنصر مراقبة الصفحة الرئيسية غير موجود، سيتم المحاولة لاحقاً');
        setTimeout(setupHomeInfiniteScroll, 500);
        return;
    }

    if (window.homeObserver) {
        window.homeObserver.disconnect();
    }

    window.homeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && window.homeHasMoreProducts && !window.homeIsLoadingProducts) {
                console.log('🏠 [Observer] ✅ تحميل المزيد من منتجات الرئيسية');
                loadHomeProducts(true);
            }
        });
    }, {
        root: null,
        rootMargin: '200px',
        threshold: 0.1
    });

    window.homeObserver.observe(sentinel);
    console.log('✅ [Observer] تم إعداد مراقب الصفحة الرئيسية بنجاح');
}

/**
 * إعداد Intersection Observer لصفحة المنتجات
 */
function setupProductsInfiniteScroll() {
    console.log('📜 [Observer] محاولة إعداد مراقب صفحة المنتجات...');
    
    const sentinel = document.getElementById('productsScrollSentinel');
    if (!sentinel) {
        console.warn('⚠️ [Observer] عنصر مراقبة صفحة المنتجات غير موجود، سيتم المحاولة لاحقاً');
        setTimeout(setupProductsInfiniteScroll, 500);
        return;
    }

    if (window.productsObserver) {
        window.productsObserver.disconnect();
    }

    window.productsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && window.hasMoreProducts && !window.isLoadingProducts) {
                console.log('📜 [Observer] ✅ تحميل المزيد من المنتجات');
                loadProducts(true);
            }
        });
    }, {
        root: null,
        rootMargin: '300px',
        threshold: 0.1
    });

    window.productsObserver.observe(sentinel);
    console.log('✅ [Observer] تم إعداد مراقب صفحة المنتجات بنجاح');
}

/**
 * إعادة تعيين المراقبين عند تغيير القسم
 */
function resetObservers() {
    console.log('🔄 إعادة تعيين المراقبين...');
    
    setTimeout(() => {
        const activeSection = document.querySelector('.section.active');
        if (!activeSection) {
            console.log('⚠️ لا يوجد قسم نشط');
            return;
        }

        console.log(`📱 القسم النشط: ${activeSection.id}`);

        if (activeSection.id === 'home') {
            setupHomeInfiniteScroll();
        } else if (activeSection.id === 'products') {
            setupProductsInfiniteScroll();
        }
    }, 300);
}

// ======================== تحميل المنتجات (صفحة "جميع المنتجات") ========================

/**
 * تحميل المنتجات من Firestore مع دعم الفلاتر والتحميل التدريجي
 * @param {boolean} isNextPage - هل هذه الصفحة التالية؟
 */
async function loadProducts(isNextPage = false) {
    console.log(`🛍️ جاري جلب المنتجات (صفحة جديدة: ${isNextPage})...`);

    if (window.isLoadingProducts) {
        console.log('⏳ جاري التحميل بالفعل...');
        return;
    }

    const currentFilters = getCurrentFilters();
    console.log('📊 الفلاتر الحالية:', currentFilters);

    if (isNextPage && haveFiltersChanged(currentFilters)) {
        console.log('🔄 تغيرت الفلاتر، إعادة تحميل من البداية');
        loadProducts(false);
        return;
    }

    if (!isNextPage) {
        window.lastProductDoc = null;
        window.hasMoreProducts = true;
        window.lastUsedFilters = { ...currentFilters };
        
        const productsGrid = document.getElementById('productsGrid');
        if (productsGrid) {
            productsGrid.innerHTML = '';
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        if (!window.hasMoreProducts) {
            console.log('🏁 لا توجد منتجات إضافية');
            return;
        }
    }

    window.isLoadingProducts = true;
    
    const loadingIndicator = document.getElementById('productsLoading');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }

    try {
        const db = getFirebaseReference();
        if (!db || !window.firebaseModules) {
            throw new Error('❌ Firebase غير مهيأ بشكل صحيح');
        }

        const productsRef = window.firebaseModules.collection(db, "products");
        let constraints = [];

        // 1. المنتجات النشطة فقط
        constraints.push(window.firebaseModules.where("isActive", "==", true));

        // 2. فلتر الفئة باستخدام categoryId
        if (currentFilters.categoryId) {
            console.log(`📁 تطبيق فلتر الفئة بالمعرف: ${currentFilters.categoryId}`);
            constraints.push(window.firebaseModules.where("categoryId", "==", currentFilters.categoryId));
        }

        // 3. فلاتر الأزرار (isNew, isSale, isBest)
        if (currentFilters.activeFilters.length > 0) {
            console.log(`🔘 تطبيق فلاتر الأزرار: ${currentFilters.activeFilters.join(', ')}`);
            
            // نطبق أول فلتر فقط
            const firstActiveFilter = currentFilters.activeFilters[0];
            let dbField = firstActiveFilter;
            
            if (firstActiveFilter === 'isNew' || firstActiveFilter === 'new') dbField = 'isNew';
            if (firstActiveFilter === 'isSale' || firstActiveFilter === 'sale') dbField = 'isSale';
            if (firstActiveFilter === 'isBest' || firstActiveFilter === 'best') dbField = 'isBest';
            
            constraints.push(window.firebaseModules.where(dbField, "==", true));
            
            if (currentFilters.activeFilters.length > 1) {
                console.warn('⚠️ تم تطبيق أول فلتر فقط');
                if (typeof window.showToast === 'function') {
                    window.showToast('يمكن تطبيق فلتر واحد فقط من (جديد، عروض، الأفضل)', 'warning');
                }
            }
        }

        // 4. معالجة البحث
        const hasSearch = currentFilters.search && currentFilters.search.length > 0;
        
        if (hasSearch) {
            console.log(`🔍 تطبيق بحث: ${currentFilters.search}`);
            constraints.push(
                window.firebaseModules.where("name_lowercase", ">=", currentFilters.search),
                window.firebaseModules.where("name_lowercase", "<=", currentFilters.search + '\uf8ff')
            );
        }

        // 5. الترتيب
        if (hasSearch) {
            constraints.push(window.firebaseModules.orderBy("name_lowercase", "asc"));
            constraints.push(window.firebaseModules.orderBy("__name__", "asc"));
        } else if (currentFilters.sort === 'price-low') {
            constraints.push(window.firebaseModules.orderBy("price", "asc"));
            constraints.push(window.firebaseModules.orderBy("__name__", "asc"));
        } else if (currentFilters.sort === 'price-high') {
            constraints.push(window.firebaseModules.orderBy("price", "desc"));
            constraints.push(window.firebaseModules.orderBy("__name__", "desc"));
        } else {
            // الترتيب الافتراضي: الأحدث أولاً
            constraints.push(window.firebaseModules.orderBy("createdAt", "desc"));
            constraints.push(window.firebaseModules.orderBy("__name__", "desc"));
        }

        // 6. إضافة pagination
        if (isNextPage && window.lastProductDoc) {
            constraints.push(window.firebaseModules.startAfter(window.lastProductDoc));
        }

        // 7. تحديد عدد النتائج
        constraints.push(window.firebaseModules.limit(window.PRODUCTS_PER_PAGE));

        console.log(`🔍 تنفيذ الاستعلام مع ${constraints.length} شرط`);

        const q = window.firebaseModules.query(productsRef, ...constraints);
        const querySnapshot = await window.firebaseModules.getDocs(q);

        console.log(`📦 عدد النتائج: ${querySnapshot.size}`);

        if (querySnapshot.empty) {
            console.log('📭 لا توجد نتائج');
            window.hasMoreProducts = false;
            
            if (!isNextPage) {
                const categoryName = currentFilters.categoryId ? 
                    (window.getCategoryName ? window.getCategoryName(currentFilters.categoryId) : 'هذه الفئة') : 
                    'المنتجات';
                
                displayNoProductsMessage(
                    currentFilters.search 
                        ? `لا توجد نتائج للبحث عن "${currentFilters.search}"` 
                        : (currentFilters.categoryId 
                            ? `لا توجد منتجات في ${categoryName}` 
                            : 'لم يتم العثور على منتجات')
                );
            }
            
            window.isLoadingProducts = false;
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            return;
        }

        window.lastProductDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        window.hasMoreProducts = querySnapshot.docs.length === window.PRODUCTS_PER_PAGE;
        
        console.log(`✅ تم تحميل ${querySnapshot.docs.length} منتج`);
        console.log(`🔜 المزيد متاح: ${window.hasMoreProducts}`);

        const newProducts = querySnapshot.docs.map(doc => {
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

        // تحديث allProducts
        if (typeof window.allProducts !== 'undefined') {
            if (!isNextPage) {
                window.allProducts = newProducts;
            } else {
                newProducts.forEach(p => {
                    if (!window.allProducts.find(ex => ex.id === p.id)) {
                        window.allProducts.push(p);
                    }
                });
            }
        }

        displayProducts(newProducts, isNextPage);

        // إعادة ربط المراقب
        setTimeout(() => {
            const sentinel = document.getElementById('productsScrollSentinel');
            if (sentinel && window.hasMoreProducts && window.productsObserver) {
                window.productsObserver.unobserve(sentinel);
                window.productsObserver.observe(sentinel);
            }
        }, 100);

    } catch (error) {
        console.error('❌ خطأ في تحميل المنتجات:', error);
        
        // معالجة أخطاء الفهارس
        if (error.message && error.message.includes('index')) {
            const indexUrl = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
            if (indexUrl) {
                console.log('🔗 رابط إنشاء الفهرس:', indexUrl[0]);
                
                // عرض رسالة للمستخدم
                if (!isNextPage) {
                    displayNoProductsMessage(
                        'تحتاج الفلاتر المحددة إلى فهرس في قاعدة البيانات',
                        'يرجى التواصل مع الدعم الفني أو المحاولة لاحقاً'
                    );
                }
                
                if (typeof window.showToast === 'function') {
                    window.showToast('خطأ في الاستعلام، يرجى المحاولة لاحقاً', 'warning', 8000);
                }
            } else {
                if (!isNextPage) {
                    displayNoProductsMessage('خطأ في تحميل المنتجات');
                }
            }
        } else if (!isNextPage) {
            displayNoProductsMessage('عذراً، حدث خطأ في تحميل المنتجات');
        }
        
        window.hasMoreProducts = false;
    } finally {
        window.isLoadingProducts = false;
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
}

// ======================== تحميل منتجات الصفحة الرئيسية ========================

/**
 * تحميل منتجات الصفحة الرئيسية
 */
async function loadHomeProducts(isNextPage = false) {
    console.log(`🏠 جاري تحميل منتجات الصفحة الرئيسية (صفحة جديدة: ${isNextPage})...`);

    if (window.homeIsLoadingProducts) {
        console.log('⏳ جاري تحميل الصفحة الرئيسية بالفعل...');
        return;
    }

    if (!isNextPage) {
        window.homeLastProductDoc = null;
        window.homeHasMoreProducts = true;
        
        const homeGrid = document.getElementById('homeProductsGrid');
        if (homeGrid) {
            homeGrid.innerHTML = '';
        }
    } else {
        if (!window.homeHasMoreProducts) {
            console.log('🏁 لا توجد منتجات إضافية في الصفحة الرئيسية');
            return;
        }
    }

    window.homeIsLoadingProducts = true;
    
    const loadingIndicator = document.getElementById('homeProductsLoading');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }

    try {
        const db = getFirebaseReference();
        if (!db || !window.firebaseModules) {
            console.warn('⚠️ تحذير: Firebase غير مهيأ بعد. سيتم إعادة المحاولة...');
            setTimeout(() => loadHomeProducts(isNextPage), 500);
            return;
        }

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

        console.log(`🏠 عدد النتائج: ${querySnapshot.size}`);

        if (querySnapshot.empty) {
            window.homeHasMoreProducts = false;
            if (!isNextPage) {
                const homeGrid = document.getElementById('homeProductsGrid');
                if (homeGrid) homeGrid.innerHTML = '<p style="text-align:center; padding:20px; width:100%;">لا توجد منتجات حالياً</p>';
            }
            return;
        }

        window.homeLastProductDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        window.homeHasMoreProducts = querySnapshot.docs.length === window.PRODUCTS_PER_PAGE;

        console.log(`🏠 تم تحميل ${querySnapshot.docs.length} منتج للصفحة الرئيسية`);

        const products = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                price: parseFloat(data.price) || 0,
                originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : null,
                image: data.image || 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png',
                name: data.name || 'منتج بدون اسم',
                categoryId: data.categoryId || data.category || 'عام'
            };
        });

        displayHomeProducts(products, isNextPage);

    } catch (error) {
        console.error('❌ خطأ في تحميل منتجات الصفحة الرئيسية:', error);
    } finally {
        window.homeIsLoadingProducts = false;
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
}

// ======================== عرض المنتجات ========================

/**
 * عرض المنتجات في شبكة المنتجات
 */
function displayProducts(productsToDisplay, append = false) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) {
        console.error('❌ عنصر productsGrid غير موجود');
        return;
    }

    const currency = typeof window.siteCurrency !== 'undefined' ? window.siteCurrency : 'SDG';
    const html = productsToDisplay.map(product => generateProductCardHTML(product, currency)).join('');

    if (append) {
        productsGrid.insertAdjacentHTML('beforeend', html);
    } else {
        productsGrid.innerHTML = html;
    }
    
    console.log(`📦 تم عرض ${productsToDisplay.length} منتج في شبكة المنتجات`);
}

/**
 * عرض المنتجات في الصفحة الرئيسية
 */
function displayHomeProducts(products, append = false) {
    const homeGrid = document.getElementById('homeProductsGrid');
    if (!homeGrid) {
        console.error('❌ عنصر homeProductsGrid غير موجود');
        return;
    }

    const currency = typeof window.siteCurrency !== 'undefined' ? window.siteCurrency : 'SDG';
    const html = products.map(product => generateProductCardHTML(product, currency)).join('');

    if (append) {
        homeGrid.insertAdjacentHTML('beforeend', html);
    } else {
        homeGrid.innerHTML = html;
    }
    
    console.log(`🏠 تم عرض ${products.length} منتج في الصفحة الرئيسية`);
}

/**
 * إنشاء HTML لبطاقة المنتج (مع تنظيف البيانات)
 */
function generateProductCardHTML(product, currency) {
    const favoritesArray = window.favorites || [];
    const isInFavorites = Array.isArray(favoritesArray) && 
                          favoritesArray.some(f => f && f.id === product.id);
    
    const hasSale = product.originalPrice && product.originalPrice > product.price;
    const discount = hasSale ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
    const imageUrl = product.image || 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png';

    // الحصول على اسم الفئة للعرض
    let categoryName = 'منتجات';
    if (window.getCategoryName) {
        categoryName = window.getCategoryName(product.categoryId) || 'منتجات';
    } else if (product.category) {
        categoryName = product.category;
    }

    // تنظيف البيانات قبل الإدراج في HTML
    const safeName = window.SecurityCore?.sanitizeHTML(product.name) || product.name;
    const safeCategory = window.SecurityCore?.sanitizeHTML(categoryName) || 'منتجات';
    const safeId = window.SecurityCore?.sanitizeHTML(product.id) || product.id;
    const safeImage = imageUrl;

    return `
        <div class="product-card" data-id="${safeId}">
            ${hasSale ? `<div class="badge sale">-${discount}%</div>` : ''}
            ${product.isNew ? '<div class="badge new">جديد</div>' : ''}
            ${product.isBest ? '<div class="badge best">الأفضل</div>' : ''}
            <div class="product-image" onclick="openProductDetails('${safeId}')">
                <img 
                    src="${safeImage}" 
                    alt="${safeName}" 
                    loading="lazy" 
                    onerror="this.src='https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png'"
                >
            </div>
            <div class="product-info">
                <div class="product-category-tag">${safeCategory}</div>
                <h3 onclick="openProductDetails('${safeId}')">${safeName}</h3>
                <div class="product-price">
                    <span class="current-price">${localFormatNumber(product.price)} ${currency}</span>
                    ${hasSale ? `<span class="original-price">${localFormatNumber(product.originalPrice)} ${currency}</span>` : ''}
                </div>
                <div class="product-actions">
                    <button class="add-to-cart-btn" onclick="openQuantityModal('${safeId}')" title="إضافة للسلة">
                        <i class="fas fa-shopping-cart"></i> إضافة
                    </button>
                    <button class="favorite-btn ${isInFavorites ? 'active' : ''}" onclick="toggleFavorite('${safeId}')" title="إضافة للمفضلة">
                        <i class="${isInFavorites ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ======================== رسالة عدم وجود منتجات ========================

function displayNoProductsMessage(message = 'لم يتم العثور على منتجات', subMessage = 'حاول تغيير معايير البحث أو الفلاتر') {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;

    productsGrid.innerHTML = `
        <div class="no-products-container" style="text-align: center; padding: 60px 20px; width: 100%; grid-column: 1/-1; background: #f9f9f9; border-radius: 15px; border: 1px dashed #ddd; margin: 20px 0;">
            <i class="fas fa-search fa-3x" style="color: #ccc; margin-bottom: 20px;"></i>
            <h3 style="color: var(--primary-color); margin-bottom: 10px; font-weight: 700;">${window.SecurityCore?.sanitizeHTML(message) || message}</h3>
            <p style="color: #888; font-size: 15px;">${window.SecurityCore?.sanitizeHTML(subMessage) || subMessage}</p>
            <button onclick="resetAllFilters()" class="btn-secondary" style="margin-top: 20px; padding: 10px 25px; border-radius: 20px; cursor: pointer;">إعادة تعيين الفلاتر</button>
        </div>
    `;
}

// ======================== إعادة تعيين جميع الفلاتر ========================

function resetAllFilters() {
    console.log('🔄 إعادة تعيين جميع الفلاتر');
    
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    const searchInput = document.getElementById('searchInput');

    if (categoryFilter) categoryFilter.value = '';
    if (sortFilter) sortFilter.value = 'newest';
    if (searchInput) searchInput.value = '';

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // إعادة تعيين الفئة الحالية في نظام الفئات
    if (typeof window.filterByCategory === 'function') {
        window.filterByCategory('');
    } else {
        window.lastProductDoc = null;
        window.hasMoreProducts = true;
        window.lastUsedFilters = getCurrentFilters();
        loadProducts(false);
    }
}

// ======================== دوال تفاصيل المنتج والكمية ========================

async function openProductDetails(productId) {
    console.log(`🔍 فتح تفاصيل المنتج: ${productId}`);
    
    let product = null;
    
    if (typeof window.allProducts !== 'undefined') {
        product = window.allProducts.find(p => p.id === productId);
    }
    
    if (!product) {
        try {
            if (typeof window.showLoadingSpinner === 'function') {
                window.showLoadingSpinner('جاري تحميل تفاصيل المنتج...');
            }
            
            const db = getFirebaseReference();
            if (db && window.firebaseModules) {
                const docSnap = await window.firebaseModules.getDoc(
                    window.firebaseModules.doc(db, "products", productId)
                );
                
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    product = {
                        id: docSnap.id,
                        ...data,
                        price: parseFloat(data.price) || 0,
                        originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : null
                    };
                }
            }
            
            if (typeof window.hideLoadingSpinner === 'function') {
                window.hideLoadingSpinner();
            }
        } catch (error) {
            console.error('خطأ في جلب تفاصيل المنتج:', error);
            if (typeof window.hideLoadingSpinner === 'function') {
                window.hideLoadingSpinner();
            }
            if (typeof window.showToast === 'function') {
                window.showToast('حدث خطأ في تحميل تفاصيل المنتج', 'error');
            }
            return;
        }
    }
    
    if (!product) {
        if (typeof window.showToast === 'function') {
            window.showToast('المنتج غير موجود', 'error');
        }
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
    
    // الحصول على اسم الفئة للعرض
    let categoryName = 'منتجات';
    if (window.getCategoryName) {
        categoryName = window.getCategoryName(product.categoryId) || 'منتجات';
    } else if (product.category) {
        categoryName = product.category;
    }
    
    // تنظيف البيانات للعرض
    const safeName = window.SecurityCore?.sanitizeHTML(product.name) || product.name;
    const safeDesc = window.SecurityCore?.sanitizeHTML(product.description || 'لا يوجد وصف لهذا المنتج') || 'لا يوجد وصف لهذا المنتج';
    const safeCategory = window.SecurityCore?.sanitizeHTML(categoryName) || 'منتجات';
    
    if (titleEl) titleEl.textContent = safeName;
    if (imageEl) imageEl.src = product.image || 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png';
    
    const currency = typeof window.siteCurrency !== 'undefined' ? window.siteCurrency : 'SDG';
    if (priceEl) {
        if (product.originalPrice && product.originalPrice > product.price) {
            priceEl.innerHTML = `
                <span class="current-price">${localFormatNumber(product.price)} ${currency}</span>
                <span class="original-price" style="text-decoration: line-through; color: #999; margin-right: 10px;">${localFormatNumber(product.originalPrice)} ${currency}</span>
            `;
        } else {
            priceEl.innerHTML = `<span class="current-price">${localFormatNumber(product.price)} ${currency}</span>`;
        }
    }
    
    if (descEl) descEl.innerHTML = safeDesc;
    if (stockEl) stockEl.textContent = product.stock || 0;
    if (categoryEl) categoryEl.textContent = safeCategory;
    
    modal.setAttribute('data-product-id', productId);
    modal.classList.add('active');
}

function closeProductDetailsModal() {
    const modal = document.getElementById('productDetailsModal');
    if (modal) modal.classList.remove('active');
}

function openQuantityModal(productId) {
    console.log(`🔢 فتح نافذة تحديد الكمية للمنتج: ${productId}`);
    
    let product = null;
    
    if (typeof window.allProducts !== 'undefined') {
        product = window.allProducts.find(p => p.id === productId);
    }
    
    if (!product) {
        if (typeof window.showToast === 'function') {
            window.showToast('المنتج غير موجود', 'error');
        }
        return;
    }
    
    window.selectedProductForQuantity = product;
    
    const nameEl = document.getElementById('quantityModalProductName');
    if (nameEl) {
        const safeName = window.SecurityCore?.sanitizeHTML(product.name) || product.name;
        nameEl.textContent = safeName;
    }
    
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
    
    let currentQty = parseInt(displayEl.textContent) || 1;
    const newQty = currentQty + change;
    
    if (newQty < 1) return;
    
    if (window.selectedProductForQuantity) {
        const maxStock = window.selectedProductForQuantity.stock || 99;
        if (newQty > maxStock) {
            if (typeof window.showToast === 'function') {
                window.showToast(`الكمية المتوفرة: ${maxStock}`, 'warning');
            }
            return;
        }
    }
    
    displayEl.textContent = newQty;
}

function confirmAddToCart() {
    if (!window.selectedProductForQuantity) {
        closeQuantityModal();
        return;
    }
    
    const qtyEl = document.getElementById('modalQuantityDisplay');
    const quantity = qtyEl ? parseInt(qtyEl.textContent) || 1 : 1;
    
    if (typeof window.addToCart === 'function') {
        window.addToCart(window.selectedProductForQuantity.id, quantity);
    }
    
    closeQuantityModal();
}

function confirmBuyNow() {
    if (!window.selectedProductForQuantity) {
        closeQuantityModal();
        return;
    }
    
    const qtyEl = document.getElementById('modalQuantityDisplay');
    const quantity = qtyEl ? parseInt(qtyEl.textContent) || 1 : 1;
    
    if (typeof window.buyNowDirect === 'function') {
        window.buyNowDirect(window.selectedProductForQuantity.id, quantity);
    }
    
    closeQuantityModal();
}

// ======================== تهيئة الصفحة الرئيسية ========================

function initializeHomePage() {
    console.log('🏠 تهيئة الصفحة الرئيسية...');
    
    try {
        const db = getFirebaseReference();
        if (!db || !window.firebaseModules) {
            console.warn('⚠️ تحذير: Firebase غير مهيأ بعد. سيتم إعادة المحاولة...');
            setTimeout(() => initializeHomePage(), 500);
            return;
        }
        
        const homeGrid = document.getElementById('homeProductsGrid');
        if (homeGrid && homeGrid.children.length === 0) {
            loadHomeProducts(false);
        }
        
        setupHomeInfiniteScroll();
    } catch (error) {
        console.error('❌ خطأ في تهيئة الصفحة الرئيسية:', error);
        setTimeout(() => initializeHomePage(), 1000);
    }
}

// ======================== مراقبة تغيير الأقسام ========================

/**
 * تحديث المراقبين عند تغيير القسم النشط
 */
function watchSectionChanges() {
    console.log('👀 بدء مراقبة تغييرات الأقسام...');
    
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const section = mutation.target;
                if (section.classList.contains('active')) {
                    console.log(`📱 تم التبديل إلى القسم: ${section.id}`);
                    if (section.id === 'home') {
                        setupHomeInfiniteScroll();
                    } else if (section.id === 'products') {
                        setupProductsInfiniteScroll();
                    }
                }
            }
        });
    });

    document.querySelectorAll('.section').forEach(section => {
        observer.observe(section, { attributes: true });
    });
    
    console.log('✅ تم تفعيل مراقبة تغييرات الأقسام');
}

// ======================== إعادة تعيين حالة المنتجات ========================

function resetProductsState() {
    window.lastProductDoc = null;
    window.hasMoreProducts = true;
    window.isLoadingProducts = false;
    console.log('🔄 تم إعادة تعيين حالة المنتجات');
}

// ======================== التصدير للاستخدام العام ========================

window.resetProductsState = resetProductsState;
window.loadProducts = loadProducts;
window.loadHomeProducts = loadHomeProducts;
window.displayProducts = displayProducts;
window.displayHomeProducts = displayHomeProducts;
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

// تهيئة عند تحميل الملف
document.addEventListener('DOMContentLoaded', () => {
    console.log('📦 products-system.js جاهز (نسخة مصححة)');
    
    setTimeout(() => {
        watchSectionChanges();
        
        const homeSection = document.getElementById('home');
        if (homeSection && homeSection.classList.contains('active')) {
            initializeHomePage();
        }
        
        const productsSection = document.getElementById('products');
        if (productsSection && productsSection.classList.contains('active')) {
            setupProductsInfiniteScroll();
            if (document.getElementById('productsGrid')?.children.length === 0) {
                loadProducts(false);
            }
        }
    }, 500);
});

console.log('✅ products-system.js المحسن والمصحح loaded');