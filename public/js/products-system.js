// products-system.js - نظام إدارة المنتجات والتحميل اللانهائي
// ======================== إدارة المنتجات ==========================

let lastProductDoc = null; // لتتبع آخر مستند تم تحميله للتحميل اللانهائي
let hasMoreProducts = true;
let isLoadingProducts = false;
const PRODUCTS_PER_PAGE = 5;
// allProducts معرف مسبقاً في app-core.js

async function loadProducts(isNextPage = false) {
    console.log(`🛍️ جاري تحميل المنتجات من Firebase (صفحة جديدة: ${isNextPage})...`);
    
    if (isLoadingProducts || (!hasMoreProducts && isNextPage)) {
        console.log('⚠️ تخطي التحميل: قيد التحميل بالفعل أو لا توجد منتجات إضافية');
        return;
    }
    
    if (!isNextPage) {
        lastProductDoc = null;
        hasMoreProducts = true;
        if (typeof allProducts !== 'undefined') allProducts = []; // إعادة تعيين المصفوفة عند التحميل الأول
        const productsGrid = document.getElementById('productsGrid');
        if (productsGrid) productsGrid.innerHTML = ''; // مسح الشبكة عند إعادة التحميل
    }
    
    isLoadingProducts = true;
    const loadingIndicator = document.getElementById('productsLoading');
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    
    try {
        if (!db) {
            console.error('❌ قاعدة البيانات غير متاحة');
            if (!isNextPage) displayNoProductsMessage();
            return;
        }
        
        const productsRef = window.firebaseModules.collection(db, "products");
        
        let q;
        // نستخدم orderBy("createdAt", "desc") لضمان ترتيب ثابت للتحميل اللانهائي
        if (isNextPage && lastProductDoc) {
            q = window.firebaseModules.query(
                productsRef, 
                window.firebaseModules.orderBy("createdAt", "desc"),
                window.firebaseModules.startAfter(lastProductDoc),
                window.firebaseModules.limit(PRODUCTS_PER_PAGE)
            );
        } else {
            q = window.firebaseModules.query(
                productsRef, 
                window.firebaseModules.orderBy("createdAt", "desc"),
                window.firebaseModules.limit(PRODUCTS_PER_PAGE)
            );
        }
        
        const querySnapshot = await window.firebaseModules.getDocs(q);
        
        if (querySnapshot.empty) {
            hasMoreProducts = false;
            if (!isNextPage) {
                console.log('⚠️ لا توجد منتجات في قاعدة البيانات');
                displayNoProductsMessage();
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
            
            // دالة تنظيف النصوص
            const sanitize = (str) => {
                if (!str) return '';
                if (window.SecurityCore && window.SecurityCore.sanitizeHTML) {
                    return window.SecurityCore.sanitizeHTML(str);
                }
                return str;
            };
            
            return {
                id: doc.id,
                name: sanitize(data.name) || 'بدون اسم',
                price: parseFloat(data.price) || 0,
                originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : null,
                image: data.image || 'https://via.placeholder.com/300x200?text=صورة',
                category: sanitize(data.category) || 'غير مصنف',
                stock: parseInt(data.stock) || 0,
                description: sanitize(data.description) || '',
                isNew: data.isNew === true || data.isNew === 'true',
                isSale: data.isSale === true || data.isSale === 'true',
                isBest: data.isBest === true || data.isBest === 'true',
                isActive: data.isActive !== false,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
            };
        }).filter(product => product.isActive); // نعرض المنتجات النشطة حتى لو نفد المخزون (مع وضع علامة نفد)
        
        allProducts = [...allProducts, ...newProducts];
        
        console.log(`✅ تم تحميل ${newProducts.length} منتج جديد. الإجمالي: ${allProducts.length}`);
        
        // عرض المنتجات الجديدة فقط إذا كان تحميلاً لصفحة تالية، أو الكل إذا كان تحميلاً أولياً
        displayProducts(isNextPage ? newProducts : allProducts, isNextPage);
        
        // تحديث المنتجات المميزة في الصفحة الرئيسية فقط عند التحميل الأول
        if (!isNextPage) {
            displayFeaturedProducts();
        }
        
    } catch (error) {
        console.error('❌ خطأ في تحميل المنتجات من Firebase:', error);
        if (!isNextPage) displayNoProductsMessage();
        if (typeof showToast === 'function') showToast('حدث خطأ أثناء تحميل المنتجات', 'error');
    } finally {
        isLoadingProducts = false;
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

function displayNoProductsMessage() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    productsGrid.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; width: 100%; grid-column: 1/-1;">
            <i class="fas fa-box-open fa-3x" style="color: #ccc; margin-bottom: 20px;"></i>
            <h3 style="color: var(--primary-color); margin-bottom: 10px;">لا توجد منتجات متاحة حالياً</h3>
            <p style="color: #888;">سيتم إضافة منتجات جديدة قريباً، تابعنا!</p>
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
    
    const html = productsToDisplay.map(product => {
        const isInFavorites = typeof favorites !== 'undefined' && favorites.some(f => f.id === product.id);
        const isOutOfStock = product.stock <= 0;
        
        return `
            <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}" data-id="${product.id}">
                <div class="product-image" onclick="openProductDetails('${product.id}')">
                    <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200?text=صورة'">
                    ${product.isNew ? '<div class="badge new">جديد</div>' : ''}
                    ${product.isSale ? '<div class="badge sale">عرض</div>' : ''}
                    ${product.isBest ? '<div class="badge best">الأفضل</div>' : ''}
                    ${isOutOfStock ? '<div class="out-of-stock-overlay">نفد من المخزون</div>' : ''}
                </div>
                <div class="product-info">
                    <div class="product-category-tag">${product.category}</div>
                    <h3 onclick="openProductDetails('${product.id}')">${product.name}</h3>
                    <div class="product-price">
                        <span class="current-price">${formatNumber(product.price)} ${siteCurrency}</span>
                        ${product.originalPrice ? `<span class="original-price">${formatNumber(product.originalPrice)} ${siteCurrency}</span>` : ''}
                    </div>
                    <div class="product-actions">
                        <button class="add-to-cart-btn" onclick="openQuantityModal('${product.id}')" ${isOutOfStock ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i> ${isOutOfStock ? 'نفد' : 'إضافة'}
                        </button>
                        <button class="favorite-btn ${isInFavorites ? 'active' : ''}" onclick="toggleFavorite('${product.id}')">
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

function displayFeaturedProducts(filtered = null) {
    const featuredGrid = document.getElementById('featuredProductsGrid');
    if (!featuredGrid) return;
    
    const productsToUse = filtered || allProducts;
    // عرض أول 8 منتجات كمميزة في الصفحة الرئيسية
    const featuredProducts = productsToUse.slice(0, 8);
    
    if (featuredProducts.length === 0) {
        featuredGrid.innerHTML = '<p style="text-align:center; width:100%; grid-column:1/-1;">لا توجد منتجات مميزة حالياً</p>';
        return;
    }
    
    featuredGrid.innerHTML = featuredProducts.map(product => {
        const isInFavorites = typeof favorites !== 'undefined' && favorites.some(f => f.id === product.id);
        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image" onclick="openProductDetails('${product.id}')">
                    <img src="${product.image}" alt="${product.name}" loading="lazy">
                    ${product.isSale ? '<div class="badge sale">عرض</div>' : ''}
                </div>
                <div class="product-info">
                    <h3 onclick="openProductDetails('${product.id}')">${product.name}</h3>
                    <div class="product-price">
                        <span class="current-price">${formatNumber(product.price)} ${siteCurrency}</span>
                    </div>
                    <div class="product-actions">
                        <button class="add-to-cart-btn" onclick="openQuantityModal('${product.id}')">
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                        <button class="favorite-btn ${isInFavorites ? 'active' : ''}" onclick="toggleFavorite('${product.id}')">
                            <i class="${isInFavorites ? 'fas' : 'far'} fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// إعداد مراقب التمرير للتحميل اللانهائي
function setupInfiniteScroll() {
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        
        scrollTimeout = setTimeout(() => {
            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
            
            // التحقق من الوصول للقاع (مع هامش 200 بكسل)
            if (scrollTop + clientHeight >= scrollHeight - 200) {
                const productsSection = document.getElementById('products');
                const ordersSection = document.getElementById('my-orders');
                
                if (productsSection && productsSection.classList.contains('active')) {
                    if (hasMoreProducts && !isLoadingProducts) {
                        loadProducts(true);
                    }
                } else if (ordersSection && ordersSection.classList.contains('active')) {
                    if (typeof hasMoreOrders !== 'undefined' && hasMoreOrders && !isLoadingOrders) {
                        if (typeof loadMyOrders === 'function') loadMyOrders(true);
                    }
                }
            }
        }, 100);
    });
}

// استدعاء التهيئة عند تحميل الملف
document.addEventListener('DOMContentLoaded', () => {
    setupInfiniteScroll();
});

// ======================== إدارة المفضلة ========================

function toggleFavorite(productId) {
    if (!currentUser || isGuest) {
        if (typeof showToast === 'function') showToast('يرجى تسجيل الدخول لإضافة المنتجات للمفضلة', 'warning');
        return;
    }

    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const index = favorites.findIndex(f => f.id === productId);
    
    if (index === -1) {
        // إضافة للمفضلة
        favorites.push(product);
        if (typeof showToast === 'function') showToast('تمت الإضافة للمفضلة', 'success');
    } else {
        // إزالة من المفضلة
        favorites.splice(index, 1);
        if (typeof showToast === 'function') showToast('تمت الإزالة من المفضلة', 'info');
    }

    // حفظ في localStorage للاستخدام السريع
    localStorage.setItem(`favorites_${currentUser.uid}`, JSON.stringify(favorites));
    
    // تحديث العرض في كل مكان
    if (typeof displayProducts === 'function') displayProducts(allProducts, false);
    if (typeof displayFeaturedProducts === 'function') displayFeaturedProducts();
    if (typeof updateProfileStats === 'function') updateProfileStats();
    
    // تحديث قسم المفضلة إذا كان مفتوحاً
    const favoritesSection = document.getElementById('favorites');
    if (favoritesSection && favoritesSection.classList.contains('active')) {
        displayFavorites();
    }
}

function displayFavorites() {
    const favoritesGrid = document.getElementById('favoritesGrid');
    if (!favoritesGrid) return;

    if (favorites.length === 0) {
        favoritesGrid.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; width: 100%; grid-column: 1/-1;">
                <i class="far fa-heart fa-3x" style="color: #ccc; margin-bottom: 20px;"></i>
                <h3 style="color: var(--primary-color); margin-bottom: 10px;">قائمة المفضلة فارغة</h3>
                <p style="color: #888;">أضف بعض المنتجات التي تعجبك للوصول إليها لاحقاً!</p>
                <button class="btn-primary" onclick="showSection('products')" style="margin-top: 20px; padding: 10px 25px;">تصفح المنتجات</button>
            </div>
        `;
        return;
    }

    favoritesGrid.innerHTML = favorites.map(product => {
        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image" onclick="openProductDetails('${product.id}')">
                    <img src="${product.image}" alt="${product.name}" loading="lazy">
                </div>
                <div class="product-info">
                    <h3 onclick="openProductDetails('${product.id}')">${product.name}</h3>
                    <div class="product-price">
                        <span class="current-price">${formatNumber(product.price)} ${siteCurrency}</span>
                    </div>
                    <div class="product-actions">
                        <button class="add-to-cart-btn" onclick="openQuantityModal('${product.id}')">
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                        <button class="favorite-btn active" onclick="toggleFavorite('${product.id}')">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// تصدير الدوال للنافذة العالمية
window.loadProducts = loadProducts;
window.displayProducts = displayProducts;
window.displayFeaturedProducts = displayFeaturedProducts;
window.setupInfiniteScroll = setupInfiniteScroll;
window.toggleFavorite = toggleFavorite;
window.displayFavorites = displayFavorites;

// ======================== إدارة النوافذ المنبثقة (Modals) ========================

let currentModalProductId = null;
let currentModalQuantity = 1;

function openProductDetails(productId) {
    console.log('🔍 فتح تفاصيل المنتج:', productId);
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        console.error('❌ لم يتم العثور على المنتج:', productId);
        return;
    }

    const modal = document.getElementById('productDetailsModal');
    if (!modal) return;

    safeElementUpdate('modalProductName', product.name);
    safeElementUpdate('modalProductTitle', product.name);
    
    const modalImg = document.getElementById('modalProductImage');
    if (modalImg) modalImg.src = product.image;
    
    safeElementUpdate('modalProductCategory', product.category);
    safeElementUpdate('modalProductPrice', `${formatNumber(product.price)} ${siteCurrency}`);
    
    const descEl = document.getElementById('modalProductDescription');
    if (descEl) {
        descEl.innerHTML = product.description || 'لا يوجد وصف متاح لهذا المنتج.';
    }
    
    safeElementUpdate('modalProductStock', product.stock);

    // تحديث زر الشراء في المودال
    const modalBuyBtn = document.getElementById('modalBuyBtn');
    if (modalBuyBtn) {
        modalBuyBtn.onclick = () => {
            closeProductDetailsModal();
            openQuantityModal(productId);
        };
    }

    modal.classList.add('active');
}

function closeProductDetailsModal() {
    const modal = document.getElementById('productDetailsModal');
    if (modal) modal.classList.remove('active');
}

function openQuantityModal(productId) {
    console.log('🛒 فتح نافذة الكمية للمنتج:', productId);
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    currentModalProductId = productId;
    currentModalQuantity = 1;
    
    const modal = document.getElementById('quantityModal');
    if (!modal) return;

    safeElementUpdate('quantityModalProductName', product.name);
    safeElementUpdate('modalQuantityDisplay', currentModalQuantity);
    
    const confirmAddToCartBtn = document.getElementById('confirmAddToCartBtn');
    if (confirmAddToCartBtn) {
        confirmAddToCartBtn.onclick = () => {
            if (typeof addToCart === 'function') {
                addToCart(currentModalProductId, currentModalQuantity);
                closeQuantityModal();
            } else if (window.addToCart) {
                window.addToCart(currentModalProductId, currentModalQuantity);
                closeQuantityModal();
            }
        };
    }

    const confirmBuyNowBtn = document.getElementById('confirmBuyNowBtn');
    if (confirmBuyNowBtn) {
        confirmBuyNowBtn.onclick = () => {
            if (typeof buyNowDirect === 'function') {
                buyNowDirect(currentModalProductId, currentModalQuantity);
                closeQuantityModal();
            } else if (window.buyNowDirect) {
                window.buyNowDirect(currentModalProductId, currentModalQuantity);
                closeQuantityModal();
            }
        };
    }

    modal.classList.add('active');
}

function closeQuantityModal() {
    const modal = document.getElementById('quantityModal');
    if (modal) modal.classList.remove('active');
}

function changeModalQuantity(change) {
    const product = allProducts.find(p => p.id === currentModalProductId);
    if (!product) return;

    const newQuantity = currentModalQuantity + change;
    
    if (newQuantity >= 1 && newQuantity <= product.stock) {
        currentModalQuantity = newQuantity;
        safeElementUpdate('modalQuantityDisplay', currentModalQuantity);
    } else if (newQuantity > product.stock) {
        if (typeof showToast === 'function') showToast(`عذراً، الكمية المتاحة هي ${product.stock} فقط`, 'warning');
    }
}

// تحديث التصدير ليشمل الدوال الجديدة
window.openProductDetails = openProductDetails;
window.closeProductDetailsModal = closeProductDetailsModal;
window.openQuantityModal = openQuantityModal;
window.closeQuantityModal = closeQuantityModal;
window.changeModalQuantity = changeModalQuantity;
