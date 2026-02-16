// products-system.js - نظام إدارة المنتجات والتحميل اللانهائي (نسخة مُصلحة)
// ======================== إدارة المنتجات ==========================

// ------------------------ متغيرات عامة ------------------------
let lastProductDoc = null;          // آخر مستند في صفحة المنتجات
let hasMoreProducts = true;         // هل توجد منتجات إضافية؟
let isLoadingProducts = false;      // حالة التحميل
const PRODUCTS_PER_PAGE = 3;        // عدد المنتجات لكل صفحة (قللنا العدد للاختبار)

// متغيرات منفصلة للصفحة الرئيسية
let homeLastProductDoc = null;
let homeHasMoreProducts = true;
let homeIsLoadingProducts = false;

// تخزين آخر معايير الفلتر المستخدمة لضمان الاتساق
let lastUsedFilters = {
    category: '',
    sort: 'newest',
    search: '',
    activeFilters: []  // مصفوفة تحتوي على أسماء الفلاتر النشطة
};

// مراقبو التقاطع (Intersection Observers)
let productsObserver = null;
let homeObserver = null;

// متغير للتأكد من إعداد المراقبين
let observersInitialized = false;

// ------------------------ دوال مساعدة ------------------------
function localFormatNumber(num) {
    if (num === null || num === undefined) return "0";
    if (typeof window.formatNumber === 'function') return window.formatNumber(num);
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * الحصول على معايير الفلتر الحالية من واجهة المستخدم
 */
function getCurrentFilters() {
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    const searchInput = document.getElementById('searchInput');

    const category = categoryFilter ? categoryFilter.value : '';
    const sort = sortFilter ? sortFilter.value : 'newest';
    const search = searchInput ? searchInput.value.trim().toLowerCase() : '';

    // جمع أزرار الفلاتر النشطة
    const activeFilters = [];
    document.querySelectorAll('.filter-btn.active').forEach(btn => {
        const filter = btn.getAttribute('data-filter');
        if (filter) activeFilters.push(filter);
    });

    return { category, sort, search, activeFilters };
}

/**
 * التحقق من تغير الفلاتر
 */
function haveFiltersChanged(currentFilters) {
    return (
        currentFilters.category !== lastUsedFilters.category ||
        currentFilters.sort !== lastUsedFilters.sort ||
        currentFilters.search !== lastUsedFilters.search ||
        JSON.stringify(currentFilters.activeFilters) !== JSON.stringify(lastUsedFilters.activeFilters)
    );
}

/**
 * دالة مساعدة للحصول على مرجع Firebase
 */
function getFirebaseReference() {
    if (window.firebaseDb) return window.firebaseDb;
    if (typeof window.getFirebaseInstance === 'function') {
        const instance = window.getFirebaseInstance();
        if (instance && instance.db) return instance.db;
    }
    if (window.db) return window.db;
    return null;
}

// ======================== إعداد مراقبي التحميل اللانهائي (مُحسّن) ========================

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

    // إلغاء المراقب القديم إن وجد
    if (homeObserver) {
        homeObserver.disconnect();
    }

    homeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            console.log('🏠 [Observer] حالة التقاطع:', entry.isIntersecting, 'hasMore:', homeHasMoreProducts, 'isLoading:', homeIsLoadingProducts);
            
            if (entry.isIntersecting && homeHasMoreProducts && !homeIsLoadingProducts) {
                console.log('🏠 [Observer] ✅ تحميل المزيد من منتجات الرئيسية');
                loadHomeProducts(true);
            }
        });
    }, {
        root: null,
        rootMargin: '200px',
        threshold: 0.1
    });

    homeObserver.observe(sentinel);
    console.log('✅ [Observer] تم إعداد مراقب الصفحة الرئيسية بنجاح');
}

/**
 * إعداد Intersection Observer لصفحة المنتجات (مُحسّن)
 */
function setupProductsInfiniteScroll() {
    console.log('📜 [Observer] محاولة إعداد مراقب صفحة المنتجات...');
    
    const sentinel = document.getElementById('productsScrollSentinel');
    if (!sentinel) {
        console.warn('⚠️ [Observer] عنصر مراقبة صفحة المنتجات غير موجود، سيتم المحاولة لاحقاً');
        setTimeout(setupProductsInfiniteScroll, 500);
        return;
    }

    // إلغاء المراقب القديم إن وجد
    if (productsObserver) {
        productsObserver.disconnect();
    }

    productsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            console.log('📜 [Observer] حالة التقاطع:', entry.isIntersecting, 'hasMore:', hasMoreProducts, 'isLoading:', isLoadingProducts);
            
            if (entry.isIntersecting && hasMoreProducts && !isLoadingProducts) {
                console.log('📜 [Observer] ✅ تحميل المزيد من المنتجات');
                loadProducts(true);
            }
        });
    }, {
        root: null,
        rootMargin: '300px',
        threshold: 0.1
    });

    productsObserver.observe(sentinel);
    console.log('✅ [Observer] تم إعداد مراقب صفحة المنتجات بنجاح');
}

/**
 * إعادة تعيين المراقبين عند تغيير القسم (مُحسّن)
 */
function resetObservers() {
    console.log('🔄 إعادة تعيين المراقبين...');
    
    // إعادة تعيين المراقبين بعد تأخير للتأكد من وجود العناصر
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

// ======================== تحميل المنتجات (صفحة "جميع المنتجات") - مُحسّن ========================

/**
 * تحميل المنتجات من Firestore مع دعم الفلاتر والتحميل التدريجي
 * @param {boolean} isNextPage - هل هذه الصفحة التالية؟
 */
async function loadProducts(isNextPage = false) {
    console.log(`🛍️ جاري جلب المنتجات (صفحة جديدة: ${isNextPage})...`);

    // منع التحميل المتكرر
    if (isLoadingProducts) {
        console.log('⏳ جاري التحميل بالفعل...');
        return;
    }

    // الحصول على معايير الفلتر الحالية
    const currentFilters = getCurrentFilters();
    console.log('📊 الفلاتر الحالية:', currentFilters);

    // إذا تغيرت الفلاتر أثناء وجود صفحة تالية، نبدأ من جديد
    if (isNextPage && haveFiltersChanged(currentFilters)) {
        console.log('🔄 تغيرت الفلاتر، إعادة تحميل من البداية');
        loadProducts(false);
        return;
    }

    // إعادة تعيين المؤشرات إذا كنا نبدأ تحميل جديد
    if (!isNextPage) {
        lastProductDoc = null;
        hasMoreProducts = true;
        lastUsedFilters = { ...currentFilters }; // تحديث الفلاتر المخزنة
        
        // تفريغ الشبكة الحالية
        const productsGrid = document.getElementById('productsGrid');
        if (productsGrid) {
            productsGrid.innerHTML = '';
        }

        // التمرير للأعلى عند تغيير الفلاتر أو البحث
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        // إذا طلبنا الصفحة التالية ولكن لا يوجد المزيد، نخرج
        if (!hasMoreProducts) {
            console.log('🏁 لا توجد منتجات إضافية');
            return;
        }
    }

    isLoadingProducts = true;
    
    // إظهار مؤشر التحميل
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

        // ========== بناء شروط الاستعلام ==========
        
        // 1. المنتجات النشطة فقط
        constraints.push(window.firebaseModules.where("isActive", "==", true));

        // 2. فلتر الفئة
        if (currentFilters.category) {
            constraints.push(window.firebaseModules.where("category", "==", currentFilters.category));
        }

        // 3. فلاتر الأزرار
        currentFilters.activeFilters.forEach(filter => {
            let dbField = filter;
            if (filter === 'isNew' || filter === 'new') dbField = 'isNew';
            if (filter === 'isSale' || filter === 'sale') dbField = 'isSale';
            if (filter === 'isBest' || filter === 'best') dbField = 'isBest';
            
            constraints.push(window.firebaseModules.where(dbField, "==", true));
        });

        // 4. معالجة البحث
        const hasSearch = currentFilters.search && currentFilters.search.length > 0;
        
        if (hasSearch) {
            // عند البحث، نستخدم الترتيب حسب الاسم
            constraints.push(
                window.firebaseModules.where("name_lowercase", ">=", currentFilters.search),
                window.firebaseModules.where("name_lowercase", "<=", currentFilters.search + '\uf8ff')
            );
        }

        // 5. الترتيب حسب الاختيار (مع إضافة __name__ لضمان التفرد)
        if (hasSearch) {
            // عند البحث، نرتب حسب الاسم ثم المعرف
            constraints.push(window.firebaseModules.orderBy("name_lowercase", "asc"));
            constraints.push(window.firebaseModules.orderBy("__name__", "asc"));
        } else if (currentFilters.sort === 'price-low') {
            constraints.push(window.firebaseModules.orderBy("price", "asc"));
            constraints.push(window.firebaseModules.orderBy("__name__", "asc"));
        } else if (currentFilters.sort === 'price-high') {
            constraints.push(window.firebaseModules.orderBy("price", "desc"));
            constraints.push(window.firebaseModules.orderBy("__name__", "desc"));
        } else {
            // الترتيب الافتراضي حسب تاريخ الإنشاء
            constraints.push(window.firebaseModules.orderBy("createdAt", "desc"));
            constraints.push(window.firebaseModules.orderBy("__name__", "desc"));
        }

        // 6. إضافة pagination باستخدام startAfter
        if (isNextPage && lastProductDoc) {
            constraints.push(window.firebaseModules.startAfter(lastProductDoc));
        }

        // 7. تحديد عدد النتائج
        constraints.push(window.firebaseModules.limit(PRODUCTS_PER_PAGE));

        console.log('🔍 تنفيذ الاستعلام مع:', constraints.length, 'شرط');

        // إنشاء وتنفيذ الاستعلام
        const q = window.firebaseModules.query(productsRef, ...constraints);
        const querySnapshot = await window.firebaseModules.getDocs(q);

        console.log(`📦 عدد النتائج: ${querySnapshot.size}`);

        // معالجة النتائج
        if (querySnapshot.empty) {
            console.log('📭 لا توجد نتائج');
            hasMoreProducts = false;
            
            if (!isNextPage) {
                displayNoProductsMessage(
                    currentFilters.search 
                        ? `لا توجد نتائج للبحث عن "${currentFilters.search}"` 
                        : 'لم يتم العثور على منتجات'
                );
            }
            
            isLoadingProducts = false;
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            return;
        }

        // تحديث مؤشر الصفحة التالية - نستخدم آخر مستند فعلياً
        lastProductDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        
        // التحقق من وجود المزيد من المنتجات
        hasMoreProducts = querySnapshot.docs.length === PRODUCTS_PER_PAGE;
        
        console.log(`✅ تم تحميل ${querySnapshot.docs.length} منتج`);
        console.log('📌 آخر منتج:', lastProductDoc.id);
        console.log('🔜 المزيد متاح:', hasMoreProducts);

        // تحويل البيانات إلى كائنات منتج
        const newProducts = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                price: parseFloat(data.price) || 0,
                originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : null,
                image: data.image || 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png',
                name: data.name || 'منتج بدون اسم',
                category: data.category || 'عام',
                stock: data.stock || 0
            };
        });

        // تحديث القائمة العامة
        if (typeof window.allProducts !== 'undefined') {
            if (!isNextPage) {
                window.allProducts = newProducts;
            } else {
                // تجنب التكرار
                newProducts.forEach(p => {
                    if (!window.allProducts.find(ex => ex.id === p.id)) {
                        window.allProducts.push(p);
                    }
                });
            }
        }

        // عرض المنتجات
        displayProducts(newProducts, isNextPage);

        // بعد عرض المنتجات، تأكد من أن عنصر المراقبة لا يزال مرئياً
        setTimeout(() => {
            const sentinel = document.getElementById('productsScrollSentinel');
            if (sentinel && hasMoreProducts) {
                // إعادة ربط المراقب للتأكد من عمله
                if (productsObserver) {
                    productsObserver.unobserve(sentinel);
                    productsObserver.observe(sentinel);
                }
            }
        }, 100);

    } catch (error) {
        console.error('❌ خطأ في تحميل المنتجات:', error);
        
        if (error.message && error.message.includes('index')) {
            const indexUrl = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
            if (indexUrl) {
                console.log('🔗 رابط إنشاء الفهرس:', indexUrl[0]);
                displayNoProductsMessage(
                    'تحتاج الفلاتر المحددة إلى فهرس في قاعدة البيانات',
                    'يرجى النقر على الرابط في وحدة التحكم لإنشاء الفهرس'
                );
            }
        } else if (!isNextPage) {
            displayNoProductsMessage('عذراً، حدث خطأ في تحميل المنتجات');
        }
        
        hasMoreProducts = false;
    } finally {
        isLoadingProducts = false;
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
}

// ======================== تحميل منتجات الصفحة الرئيسية (مُحسّن) ========================

/**
 * تحميل منتجات الصفحة الرئيسية
 */
async function loadHomeProducts(isNextPage = false) {
    console.log(`🏠 جاري تحميل منتجات الصفحة الرئيسية (صفحة جديدة: ${isNextPage})...`);

    if (homeIsLoadingProducts) {
        console.log('⏳ جاري تحميل الصفحة الرئيسية بالفعل...');
        return;
    }

    if (!isNextPage) {
        homeLastProductDoc = null;
        homeHasMoreProducts = true;
        
        const homeGrid = document.getElementById('homeProductsGrid');
        if (homeGrid) {
            homeGrid.innerHTML = '';
        }
    } else {
        if (!homeHasMoreProducts) {
            console.log('🏁 لا توجد منتجات إضافية في الصفحة الرئيسية');
            return;
        }
    }

    homeIsLoadingProducts = true;
    
    const loadingIndicator = document.getElementById('homeProductsLoading');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }

    try {
        const db = getFirebaseReference();
        if (!db || !window.firebaseModules) {
            throw new Error('Firebase غير مهيأ');
        }

        const productsRef = window.firebaseModules.collection(db, "products");
        
        // الصفحة الرئيسية تعرض أحدث المنتجات فقط
        let constraints = [
            window.firebaseModules.where("isActive", "==", true),
            window.firebaseModules.orderBy("createdAt", "desc"),
            window.firebaseModules.orderBy("__name__", "desc") // إضافة لضمان التفرد
        ];

        if (isNextPage && homeLastProductDoc) {
            constraints.push(window.firebaseModules.startAfter(homeLastProductDoc));
        }

        constraints.push(window.firebaseModules.limit(PRODUCTS_PER_PAGE));

        const q = window.firebaseModules.query(productsRef, ...constraints);
        const querySnapshot = await window.firebaseModules.getDocs(q);

        console.log(`🏠 عدد النتائج: ${querySnapshot.size}`);

        if (querySnapshot.empty) {
            homeHasMoreProducts = false;
            if (!isNextPage) {
                const homeGrid = document.getElementById('homeProductsGrid');
                if (homeGrid) homeGrid.innerHTML = '<p style="text-align:center; padding:20px; width:100%;">لا توجد منتجات حالياً</p>';
            }
            return;
        }

        homeLastProductDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        homeHasMoreProducts = querySnapshot.docs.length === PRODUCTS_PER_PAGE;

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
                category: data.category || 'عام'
            };
        });

        displayHomeProducts(products, isNextPage);

    } catch (error) {
        console.error('❌ خطأ في تحميل منتجات الصفحة الرئيسية:', error);
    } finally {
        homeIsLoadingProducts = false;
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
 * إنشاء HTML لبطاقة المنتج
 */
function generateProductCardHTML(product, currency) {
    const favoritesArray = window.favorites || [];
    const isInFavorites = Array.isArray(favoritesArray) && 
                          favoritesArray.some(f => f && f.id === product.id);
    
    const hasSale = product.originalPrice && product.originalPrice > product.price;
    const discount = hasSale ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
    const imageUrl = product.image || 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png';

    return `
        <div class="product-card" data-id="${product.id}">
            ${hasSale ? `<div class="badge sale">-${discount}%</div>` : ''}
            ${product.isNew ? '<div class="badge new">جديد</div>' : ''}
            ${product.isBest ? '<div class="badge best">الأفضل</div>' : ''}
            <div class="product-image" onclick="openProductDetails('${product.id}')">
                <img 
                    src="${imageUrl}" 
                    alt="${product.name}" 
                    loading="lazy" 
                    onerror="this.src='https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png'"
                >
            </div>
            <div class="product-info">
                <div class="product-category-tag">${product.category || 'عام'}</div>
                <h3 onclick="openProductDetails('${product.id}')">${product.name}</h3>
                <div class="product-price">
                    <span class="current-price">${localFormatNumber(product.price)} ${currency}</span>
                    ${hasSale ? `<span class="original-price">${localFormatNumber(product.originalPrice)} ${currency}</span>` : ''}
                </div>
                <div class="product-actions">
                    <button class="add-to-cart-btn" onclick="openQuantityModal('${product.id}')" title="إضافة للسلة">
                        <i class="fas fa-shopping-cart"></i> إضافة
                    </button>
                    <button class="favorite-btn ${isInFavorites ? 'active' : ''}" onclick="toggleFavorite('${product.id}')" title="إضافة للمفضلة">
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
            <h3 style="color: var(--primary-color); margin-bottom: 10px; font-weight: 700;">${message}</h3>
            <p style="color: #888; font-size: 15px;">${subMessage}</p>
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

    // إعادة تعيين المؤشرات
    lastProductDoc = null;
    hasMoreProducts = true;
    
    // تحديث الفلاتر المخزنة
    lastUsedFilters = getCurrentFilters();
    
    // تحميل المنتجات من جديد
    loadProducts(false);
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
            window.showLoadingSpinner?.('جاري تحميل تفاصيل المنتج...');
            
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
            
            window.hideLoadingSpinner?.();
        } catch (error) {
            console.error('خطأ في جلب تفاصيل المنتج:', error);
            window.hideLoadingSpinner?.();
            window.showToast?.('حدث خطأ في تحميل تفاصيل المنتج', 'error');
            return;
        }
    }
    
    if (!product) {
        window.showToast?.('المنتج غير موجود', 'error');
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
    
    if (titleEl) titleEl.textContent = product.name;
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
    
    if (descEl) descEl.innerHTML = product.description || 'لا يوجد وصف لهذا المنتج';
    if (stockEl) stockEl.textContent = product.stock || 0;
    if (categoryEl) categoryEl.textContent = product.category || 'عام';
    
    // عرض الخيارات إذا وجدت
    const optionsContainer = document.getElementById('modalProductOptions');
    if (optionsContainer) {
        if (product.options && product.options.length > 0) {
            optionsContainer.innerHTML = product.options.map(opt => `
                <div class="product-option-group" style="margin-top: 15px;">
                    <h4 style="font-size: 14px; margin-bottom: 8px; color: #555;">${opt.name}:</h4>
                    <div class="option-choices" style="display: flex; flex-wrap: wrap; gap: 10px;">
                        ${opt.values.map(val => `
                            <div class="option-choice" onclick="selectOption(this, '${opt.name}')" data-value="${val}" style="padding: 8px 15px; border: 1px solid #ddd; border-radius: 20px; cursor: pointer; font-size: 13px; transition: all 0.2s; position: relative; display: flex; align-items: center; gap: 5px;">
                                <span>${val}</span>
                                <i class="fas fa-check-circle check-mark" style="display: none; color: var(--secondary-color);"></i>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
            optionsContainer.style.display = 'block';
        } else {
            optionsContainer.innerHTML = '';
            optionsContainer.style.display = 'none';
        }
    }

    modal.setAttribute('data-product-id', productId);
    modal.classList.add('active');
}

// دالة اختيار الخيار مع إظهار علامة صح
function selectOption(element, optionName) {
    // إزالة التحديد من الخيارات الأخرى في نفس المجموعة
    const group = element.parentElement;
    group.querySelectorAll('.option-choice').forEach(el => {
        el.style.borderColor = '#ddd';
        el.style.background = 'white';
        el.querySelector('.check-mark').style.display = 'none';
        el.classList.remove('selected');
    });

    // إضافة التحديد للعنصر المختار
    element.style.borderColor = 'var(--secondary-color)';
    element.style.background = '#f0f7f4';
    element.querySelector('.check-mark').style.display = 'inline-block';
    element.classList.add('selected');
    
    console.log(`✅ تم اختيار ${element.getAttribute('data-value')} للخيار ${optionName}`);
}

window.selectOption = selectOption;

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
        window.showToast?.('المنتج غير موجود', 'error');
        return;
    }
    
    window.selectedProductForQuantity = product;
    
    const nameEl = document.getElementById('quantityModalProductName');
    if (nameEl) nameEl.textContent = product.name;
    
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
            window.showToast?.(`الكمية المتوفرة: ${maxStock}`, 'warning');
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
    } else if (typeof window.addToCartWithQuantity === 'function') {
        window.addToCartWithQuantity(window.selectedProductForQuantity.id, quantity);
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

// ======================== تهيئة الصفحة الرئيسية (مُحسّن) ========================

function initializeHomePage() {
    console.log('🏠 تهيئة الصفحة الرئيسية...');
    
    const homeGrid = document.getElementById('homeProductsGrid');
    if (homeGrid && homeGrid.children.length === 0) {
        loadHomeProducts(false);
    }
    
    // إعداد مراقب الصفحة الرئيسية
    setupHomeInfiniteScroll();
}

// ======================== مراقبة تغيير الأقسام (مُحسّن) ========================

/**
 * تحديث المراقبين عند تغيير القسم النشط
 */
function watchSectionChanges() {
    console.log('👀 بدء مراقبة تغييرات الأقسام...');
    
    // مراقبة التغييرات في القسم النشط
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

    // مراقبة جميع الأقسام
    document.querySelectorAll('.section').forEach(section => {
        observer.observe(section, { attributes: true });
    });
    
    console.log('✅ تم تفعيل مراقبة تغييرات الأقسام');
}

// ======================== إعادة تعيين حالة المنتجات ========================

function resetProductsState() {
    lastProductDoc = null;
    hasMoreProducts = true;
    isLoadingProducts = false;
    console.log('🔄 تم إعادة تعيين حالة المنتجات');
}

// ======================== دالة للتحقق من وجود المنتجات (للاختبار) ========================

function checkProductsAvailability() {
    console.log('🔍 التحقق من توفر المنتجات...');
    
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) {
        console.log('❌ productsGrid غير موجود');
        return;
    }
    
    console.log(`📊 عدد المنتجات المعروضة: ${productsGrid.children.length}`);
    console.log(`📌 hasMoreProducts: ${hasMoreProducts}`);
    console.log(`📌 lastProductDoc:`, lastProductDoc?.id || 'null');
    
    const sentinel = document.getElementById('productsScrollSentinel');
    if (sentinel) {
        const rect = sentinel.getBoundingClientRect();
        console.log('📍 موقع عنصر المراقبة:', {
            top: rect.top,
            bottom: rect.bottom,
            isVisible: rect.top < window.innerHeight && rect.bottom > 0
        });
    }
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
window.checkProductsAvailability = checkProductsAvailability; // للاختبار

// تهيئة عند تحميل الملف
document.addEventListener('DOMContentLoaded', () => {
    console.log('📦 products-system.js جاهز (نسخة مُصلحة)');
    
    // تأخير بسيط للتأكد من وجود العناصر
    setTimeout(() => {
        watchSectionChanges();
        
        // تهيئة الصفحة الرئيسية إذا كانت نشطة
        const homeSection = document.getElementById('home');
        if (homeSection && homeSection.classList.contains('active')) {
            initializeHomePage();
        }
        
        // تهيئة صفحة المنتجات إذا كانت نشطة
        const productsSection = document.getElementById('products');
        if (productsSection && productsSection.classList.contains('active')) {
            setupProductsInfiniteScroll();
            if (document.getElementById('productsGrid')?.children.length === 0) {
                loadProducts(false);
            }
        }
        
        // إضافة زر للاختبار في الكونسول
        console.log('ℹ️ للتحقق من حالة التحميل، استخدم: checkProductsAvailability()');
    }, 500);
});

console.log('✅ products-system.js المحسن والمحترف loaded');