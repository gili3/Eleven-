// products-system.js - نظام إدارة المنتجات والتحميل اللانهائي (إصدار Firebase Firestore المطور)
// ======================== إدارة المنتجات ==========================

// ------------------------ متغيرات عامة ------------------------
let lastProductDoc = null;          // آخر مستند في صفحة المنتجات
let hasMoreProducts = true;         // هل توجد منتجات إضافية؟
let isLoadingProducts = false;      // حالة التحميل
const PRODUCTS_PER_PAGE = 12;       // عدد المنتجات لكل صفحة

// متغيرات منفصلة للصفحة الرئيسية
let homeLastProductDoc = null;
let homeHasMoreProducts = true;
let homeIsLoadingProducts = false;

// تخزين آخر معايير الفلتر المستخدمة لضمان الاتساق
let lastUsedFilters = {
    category: '',
    sort: 'newest',
    search: '',
    activeFilters: []  // مصفوفة تحتوي على أسماء الفلاتر النشطة (مثل ['isNew', 'isSale'])
};

// ------------------------ دوال مساعدة ------------------------
function localFormatNumber(num) {
    if (num === null || num === undefined) return "0";
    if (typeof formatNumber === 'function') return formatNumber(num);
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
    // محاولة الحصول على db من عدة مصادر
    if (window.firebaseDb) return window.firebaseDb;
    if (typeof getFirebaseInstance === 'function') {
        const instance = getFirebaseInstance();
        if (instance && instance.db) return instance.db;
    }
    if (window.db) return window.db;
    return null;
}

// ------------------------ تحميل المنتجات (صفحة "جميع المنتجات") ------------------------
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
        lastUsedFilters = currentFilters; // تحديث الفلاتر المخزنة
        
        // تفريغ الشبكة الحالية
        const productsGrid = document.getElementById('productsGrid');
        if (productsGrid) {
            productsGrid.innerHTML = '';
        }
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
        // الحصول على مرجع قاعدة البيانات
        const db = getFirebaseReference();
        if (!db || !window.firebaseModules) {
            throw new Error('❌ Firebase غير مهيأ بشكل صحيح');
        }

        const productsRef = window.firebaseModules.collection(db, "products");
        let constraints = [];

        // ========== بناء شروط الاستعلام ==========
        
        // 1. المنتجات النشطة فقط
        constraints.push(window.firebaseModules.where("isActive", "==", true));

        // 2. فلتر الفئة (إذا تم اختيار فئة محددة)
        if (currentFilters.category) {
            constraints.push(window.firebaseModules.where("category", "==", currentFilters.category));
        }

        // 3. فلاتر الأزرار (isNew, isSale, isBest)
        currentFilters.activeFilters.forEach(filter => {
            let dbField = filter;
            // توحيد أسماء الحقول
            if (filter === 'isNew' || filter === 'new') dbField = 'isNew';
            if (filter === 'isSale' || filter === 'sale') dbField = 'isSale';
            if (filter === 'isBest' || filter === 'best') dbField = 'isBest';
            
            // التأكد من أن الحقل موجود وقيمته true
            constraints.push(window.firebaseModules.where(dbField, "==", true));
        });

        // 4. معالجة البحث والنص
        if (currentFilters.search && currentFilters.search.length > 0) {
            // البحث باستخدام حقل name_lowercase (مفهرس)
            constraints.push(
                window.firebaseModules.where("name_lowercase", ">=", currentFilters.search),
                window.firebaseModules.where("name_lowercase", "<=", currentFilters.search + '\uf8ff')
            );
            
            // عند البحث، يجب الترتيب حسب name_lowercase ليتوافق مع استعلام المدى
            constraints.push(window.firebaseModules.orderBy("name_lowercase", "asc"));
        } else {
            // 5. الترتيب حسب الاختيار (إذا لم يكن هناك بحث)
            if (currentFilters.sort === 'price-low') {
                constraints.push(window.firebaseModules.orderBy("price", "asc"));
            } else if (currentFilters.sort === 'price-high') {
                constraints.push(window.firebaseModules.orderBy("price", "desc"));
            } else {
                // افتراضي: الأحدث (createdAt)
                constraints.push(window.firebaseModules.orderBy("createdAt", "desc"));
            }
        }

        // 6. إضافة pagination (startAfter) إذا كنا في الصفحة التالية
        if (isNextPage && lastProductDoc) {
            constraints.push(window.firebaseModules.startAfter(lastProductDoc));
        }

        // 7. تحديد عدد النتائج
        constraints.push(window.firebaseModules.limit(PRODUCTS_PER_PAGE));

        // إنشاء الاستعلام
        const q = window.firebaseModules.query(productsRef, ...constraints);
        
        // تنفيذ الاستعلام
        console.log('🔍 تنفيذ استعلام Firebase...');
        const querySnapshot = await window.firebaseModules.getDocs(q);

        // معالجة النتائج
        if (querySnapshot.empty) {
            console.log('📭 لا توجد نتائج');
            hasMoreProducts = false;
            
            if (!isNextPage) {
                // عرض رسالة عدم وجود منتجات
                const message = currentFilters.search 
                    ? `لا توجد نتائج للبحث عن "${currentFilters.search}"` 
                    : 'لم يتم العثور على منتجات';
                displayNoProductsMessage(message);
            }
            
            updateLoadMoreButton();
            isLoadingProducts = false;
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            return;
        }

        // تحديث مؤشر الصفحة التالية
        lastProductDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        hasMoreProducts = querySnapshot.docs.length === PRODUCTS_PER_PAGE;

        console.log(`✅ تم تحميل ${querySnapshot.docs.length} منتج، المزيد: ${hasMoreProducts}`);

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

        // تحديث القائمة العامة (allProducts) إذا كانت موجودة
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
        updateLoadMoreButton();

    } catch (error) {
        console.error('❌ خطأ في تحميل المنتجات:', error);
        
        // معالجة أخطاء الفهارس
        if (error.message && error.message.includes('index')) {
            console.log('🔗 رابط إنشاء الفهرس:', error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/));
            
            displayNoProductsMessage(
                'تحتاج الفلاتر المحددة إلى فهرس في قاعدة البيانات',
                'يرجى النقر على الرابط في console لإنشاء الفهرس أو الاتصال بالدعم الفني'
            );
        } else if (!isNextPage) {
            displayNoProductsMessage('عذراً، حدث خطأ في تحميل المنتجات');
        }
        
        // إعادة تعيين حالة التحميل
        hasMoreProducts = false;
    } finally {
        isLoadingProducts = false;
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
}

// ------------------------ تحميل منتجات الصفحة الرئيسية ------------------------
/**
 * تحميل منتجات الصفحة الرئيسية
 * @param {boolean} isNextPage - هل هذه الصفحة التالية؟
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
            window.firebaseModules.orderBy("createdAt", "desc")
        ];

        if (isNextPage && homeLastProductDoc) {
            constraints.push(window.firebaseModules.startAfter(homeLastProductDoc));
        }

        constraints.push(window.firebaseModules.limit(PRODUCTS_PER_PAGE));

        const q = window.firebaseModules.query(productsRef, ...constraints);
        const querySnapshot = await window.firebaseModules.getDocs(q);

        if (querySnapshot.empty) {
            homeHasMoreProducts = false;
            homeIsLoadingProducts = false;
            if (loadingIndicator) loadingIndicator.style.display = 'none';
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

// ------------------------ عرض المنتجات ------------------------
/**
 * عرض المنتجات في شبكة المنتجات
 * @param {Array} productsToDisplay - مصفوفة المنتجات للعرض
 * @param {boolean} append - هل نضيف إلى المحتوى الحالي أم نستبدله؟
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
    const isInFavorites = typeof window.favorites !== 'undefined' && 
                          window.favorites.some(f => f.id === product.id);
    
    const hasSale = product.originalPrice && product.originalPrice > product.price;
    const discount = hasSale ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

    // معالجة الصورة
    const imageUrl = product.image || 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png';

    return `
        <div class="product-card" data-id="${product.id}">
            ${hasSale ? `<div class="sale-badge">-${discount}%</div>` : ''}
            <div class="product-image" onclick="openProductDetails('${product.id}')">
                <img 
                    src="${imageUrl}" 
                    alt="${product.name}" 
                    loading="lazy" 
                    onerror="this.src='https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png'"
                >
            </div>
            <div class="product-info">
                <div class="product-category">${product.category || 'عام'}</div>
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
}

// ------------------------ تحديث زر "تحميل المزيد" ------------------------
function updateLoadMoreButton() {
    const loadMoreBtn = document.getElementById('loadMoreProductsBtn');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = hasMoreProducts ? 'block' : 'none';
    }
}

// ------------------------ رسالة عدم وجود منتجات ------------------------
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

// ------------------------ إعادة تعيين جميع الفلاتر ------------------------
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

// ------------------------ دوال تفاصيل المنتج والكمية ------------------------
/**
 * فتح نافذة تفاصيل المنتج
 */
async function openProductDetails(productId) {
    console.log(`🔍 فتح تفاصيل المنتج: ${productId}`);
    
    // البحث عن المنتج في القائمة المحملة
    let product = null;
    
    if (typeof window.allProducts !== 'undefined') {
        product = window.allProducts.find(p => p.id === productId);
    }
    
    // إذا لم يوجد، جلب من Firebase مباشرة
    if (!product) {
        try {
            showLoadingSpinner('جاري تحميل تفاصيل المنتج...');
            
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
            
            hideLoadingSpinner();
        } catch (error) {
            console.error('خطأ في جلب تفاصيل المنتج:', error);
            hideLoadingSpinner();
            showToast('حدث خطأ في تحميل تفاصيل المنتج', 'error');
            return;
        }
    }
    
    if (!product) {
        showToast('المنتج غير موجود', 'error');
        return;
    }
    
    // تعبئة بيانات النافذة
    const modal = document.getElementById('productDetailsModal');
    if (!modal) return;
    
    // تعبئة البيانات
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
    
    // تخزين معرف المنتج الحالي للاستخدام لاحقاً
    modal.setAttribute('data-product-id', productId);
    
    // إظهار النافذة
    modal.classList.add('active');
}

/**
 * إغلاق نافذة تفاصيل المنتج
 */
function closeProductDetailsModal() {
    const modal = document.getElementById('productDetailsModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * فتح نافذة تحديد الكمية
 */
function openQuantityModal(productId) {
    console.log(`🔢 فتح نافذة تحديد الكمية للمنتج: ${productId}`);
    
    // البحث عن المنتج
    let product = null;
    
    if (typeof window.allProducts !== 'undefined') {
        product = window.allProducts.find(p => p.id === productId);
    }
    
    if (!product) {
        showToast('المنتج غير موجود', 'error');
        return;
    }
    
    // تخزين المنتج المحدد
    window.selectedProductForQuantity = product;
    
    // تعبئة اسم المنتج
    const nameEl = document.getElementById('quantityModalProductName');
    if (nameEl) nameEl.textContent = product.name;
    
    // إعادة تعيين الكمية إلى 1
    const displayEl = document.getElementById('modalQuantityDisplay');
    if (displayEl) displayEl.textContent = '1';
    
    // إظهار النافذة
    const modal = document.getElementById('quantityModal');
    if (modal) modal.classList.add('active');
}

/**
 * إغلاق نافذة تحديد الكمية
 */
function closeQuantityModal() {
    const modal = document.getElementById('quantityModal');
    if (modal) {
        modal.classList.remove('active');
        window.selectedProductForQuantity = null;
    }
}

/**
 * تغيير الكمية في نافذة تحديد الكمية
 */
function changeModalQuantity(change) {
    const displayEl = document.getElementById('modalQuantityDisplay');
    if (!displayEl) return;
    
    let currentQty = parseInt(displayEl.textContent) || 1;
    const newQty = currentQty + change;
    
    if (newQty < 1) return;
    
    // التحقق من المخزون إذا كان المنتج محدداً
    if (window.selectedProductForQuantity) {
        const maxStock = window.selectedProductForQuantity.stock || 99;
        if (newQty > maxStock) {
            showToast(`الكمية المتوفرة: ${maxStock}`, 'warning');
            return;
        }
    }
    
    displayEl.textContent = newQty;
}

/**
 * تأكيد إضافة المنتج إلى السلة من نافذة الكمية
 */
function confirmAddToCart() {
    if (!window.selectedProductForQuantity) {
        closeQuantityModal();
        return;
    }
    
    const qtyEl = document.getElementById('modalQuantityDisplay');
    const quantity = qtyEl ? parseInt(qtyEl.textContent) || 1 : 1;
    
    // إضافة إلى السلة
    if (typeof addToCart === 'function') {
        addToCart(window.selectedProductForQuantity.id, quantity);
    } else if (typeof addToCartWithQuantity === 'function') {
        addToCartWithQuantity(window.selectedProductForQuantity.id, quantity);
    }
    
    closeQuantityModal();
}

/**
 * تأكيد الشراء المباشر من نافذة الكمية
 */
function confirmBuyNow() {
    if (!window.selectedProductForQuantity) {
        closeQuantityModal();
        return;
    }
    
    const qtyEl = document.getElementById('modalQuantityDisplay');
    const quantity = qtyEl ? parseInt(qtyEl.textContent) || 1 : 1;
    
    // شراء مباشر
    if (typeof buyNowDirect === 'function') {
        buyNowDirect(window.selectedProductForQuantity.id, quantity);
    }
    
    closeQuantityModal();
}

// ------------------------ التمرير اللانهائي ------------------------
function setupInfiniteScroll() {
    if (window.infiniteScrollSetupDone) {
        console.log('🔄 التمرير اللانهائي مفعل بالفعل');
        return;
    }

    let scrollTimeout;
    
    window.addEventListener('scroll', () => {
        // منع التنفيذ المتكرر
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        
        scrollTimeout = setTimeout(() => {
            // 1. صفحة المنتجات
            const productsSection = document.getElementById('products');
            if (productsSection && productsSection.classList.contains('active')) {
                const scrollHeight = document.documentElement.scrollHeight;
                const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
                const clientHeight = document.documentElement.clientHeight;
                
                // التحميل عندما يتبقى 500px فقط
                if (scrollTop + clientHeight >= scrollHeight - 500) {
                    if (!isLoadingProducts && hasMoreProducts) {
                        console.log('📜 التمرير اللانهائي - تحميل المزيد من المنتجات');
                        loadProducts(true);
                    }
                }
            }
            
            // 2. الصفحة الرئيسية
            const homeSection = document.getElementById('home');
            if (homeSection && homeSection.classList.contains('active')) {
                const scrollHeight = document.documentElement.scrollHeight;
                const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
                const clientHeight = document.documentElement.clientHeight;
                
                if (scrollTop + clientHeight >= scrollHeight - 500) {
                    if (!homeIsLoadingProducts && homeHasMoreProducts) {
                        console.log('📜 التمرير اللانهائي - تحميل المزيد من منتجات الرئيسية');
                        loadHomeProducts(true);
                    }
                }
            }
        }, 100); // تأخير بسيط لتحسين الأداء
    });

    window.infiniteScrollSetupDone = true;
    console.log('✅ تم إعداد التمرير اللانهائي بنجاح');
}

// ------------------------ تهيئة الصفحة الرئيسية ------------------------
function initializeHomePage() {
    console.log('🏠 تهيئة الصفحة الرئيسية...');
    
    // تحميل المنتجات إذا كانت الشبكة فارغة
    const homeGrid = document.getElementById('homeProductsGrid');
    if (homeGrid && homeGrid.children.length === 0) {
        loadHomeProducts(false);
    }
}

// ======================== التصدير للاستخدام العام ========================
window.loadProducts = loadProducts;
window.loadHomeProducts = loadHomeProducts;
window.displayProducts = displayProducts;
window.displayHomeProducts = displayHomeProducts;
window.resetAllFilters = resetAllFilters;
window.setupInfiniteScroll = setupInfiniteScroll;
window.initializeHomePage = initializeHomePage;
window.openProductDetails = openProductDetails;
window.closeProductDetailsModal = closeProductDetailsModal;
window.openQuantityModal = openQuantityModal;
window.closeQuantityModal = closeQuantityModal;
window.changeModalQuantity = changeModalQuantity;
window.confirmAddToCart = confirmAddToCart;
window.confirmBuyNow = confirmBuyNow;

// تهيئة عند تحميل الملف
document.addEventListener('DOMContentLoaded', () => {
    console.log('📦 products-system.js جاهز');
    setupInfiniteScroll();
    
    // تهيئة الصفحة الرئيسية إذا كانت نشطة
    setTimeout(() => {
        const homeSection = document.getElementById('home');
        if (homeSection && homeSection.classList.contains('active')) {
            initializeHomePage();
        }
    }, 500);
});

console.log('✅ products-system.js المحسن loaded');