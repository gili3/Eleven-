// products-system.js - نظام إدارة المنتجات (نسخة محسنة أمنياً)
// ======================== إدارة المنتجات ==========================

async function loadProducts() {
    console.log('🛍️ جاري تحميل المنتجات من Firebase...');
    
    if (isLoading) {
        console.log('⚠️ المنتجات قيد التحميل بالفعل، تخطي...');
        return;
    }
    
    isLoading = true;
    
    try {
        if (!db) {
            console.log('❌ قاعدة البيانات غير متاحة');
            if (typeof displayNoProductsMessage === 'function') displayNoProductsMessage();
            return;
        }
        
        const productsRef = window.firebaseModules.collection(db, "products");
        // تحسين: جلب المنتجات النشطة فقط وترتيبها حسب الأحدث
        // جلب جميع المنتجات وترتيبها حسب الأحدث
        const q = window.firebaseModules.query(
            productsRef, 
            window.firebaseModules.orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await window.firebaseModules.getDocs(q);
        
        if (querySnapshot.empty) {
            console.log('⚠️ لا توجد منتجات في قاعدة البيانات');
            if (typeof displayNoProductsMessage === 'function') displayNoProductsMessage();
            return;
        }
        
        allProducts = querySnapshot.docs.map(doc => {
            const data = doc.data();
            
            // تنظيف البيانات باستخدام SecurityCore
            const sanitize = (str) => {
                if (!str) return str;
                if (window.SecurityCore && window.SecurityCore.sanitizeHTML) {
                    return window.SecurityCore.sanitizeHTML(str);
                }
                return str;
            };
            
            return {
                id: doc.id,
                name: sanitize(data.name) || 'بدون اسم',
                price: data.price || 0,
                originalPrice: data.originalPrice || null,
                image: sanitize(data.image) || 'https://via.placeholder.com/300x200?text=صورة',
                category: sanitize(data.category) || 'غير مصنف',
                stock: data.stock || 0,
                description: sanitize(data.description) || '',
                isNew: data.isNew || false,
                isSale: data.isSale || false,
                isBest: data.isBest || false,
                isActive: data.isActive !== false,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
            };
        }).filter(product => product.isActive && product.stock > 0);
        
        console.log(`✅ تم تحميل ${allProducts.length} منتج من Firebase`);
        
        // إعادة تعيين عدد المنتجات المعروضة عند التحميل الجديد
        displayedProductsCount = 8;
        if (typeof displayProducts === 'function') displayProducts();
        if (typeof displayFeaturedProducts === 'function') displayFeaturedProducts();
        
    } catch (error) {
        console.error('❌ خطأ في تحميل المنتجات من Firebase:', error);
        if (typeof displayNoProductsMessage === 'function') displayNoProductsMessage();
    } finally {
        isLoading = false;
    }
}

function displayNoProductsMessage() {
    const productsGrid = document.getElementById('productsGrid');
    const featuredGrid = document.getElementById('featuredProductsGrid');
    
    const message = `
        <div style="text-align: center; padding: 40px 20px; width: 100%;">
            <i class="fas fa-box-open fa-3x" style="color: var(--gray-color); margin-bottom: 20px;"></i>
            <h3 style="color: var(--primary-color); margin-bottom: 10px;">لا توجد منتجات متاحة</h3>
            <p style="color: var(--gray-color);">سيتم إضافة المنتجات قريباً</p>
        </div>
    `;
    
    if (productsGrid) productsGrid.innerHTML = message;
    if (featuredGrid) featuredGrid.innerHTML = message;
}

let currentModalQuantity = 1;
let currentModalProductId = null;

function openProductDetails(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        if (typeof showToast === 'function') showToast('المنتج غير موجود', 'error');
        return;
    }

    currentModalProductId = productId; // تحديد معرف المنتج الحالي للتقييمات

    const modal = document.getElementById('productDetailsModal');
    if (!modal) return;

    const modalProductName = document.getElementById('modalProductName');
    const modalProductTitle = document.getElementById('modalProductTitle');
    const modalProductImage = document.getElementById('modalProductImage');
    const modalProductCategory = document.getElementById('modalProductCategory');
    const modalProductPrice = document.getElementById('modalProductPrice');
    const modalProductDescription = document.getElementById('modalProductDescription');
    const modalProductStock = document.getElementById('modalProductStock');

    if (modalProductName) modalProductName.textContent = product.name;
    if (modalProductTitle) modalProductTitle.textContent = product.name;
    if (modalProductImage) modalProductImage.src = product.image;
    if (modalProductCategory) modalProductCategory.textContent = product.category || 'عام';
    if (modalProductPrice) modalProductPrice.textContent = `${formatNumber(product.price)} ${siteCurrency}`;
    if (modalProductDescription) modalProductDescription.textContent = product.description || 'لا يوجد وصف متاح لهذا المنتج.';
    if (modalProductStock) modalProductStock.textContent = formatNumber(product.stock || 0);

    // إعداد زر الشراء في المودال ليفتح نافذة الكمية
    const modalBuyBtn = document.getElementById('modalBuyBtn');
    if (modalBuyBtn) {
        modalBuyBtn.onclick = () => {
            openQuantityModal(productId);
            closeProductDetailsModal();
        };
    }

    modal.classList.add('active');
    
    // تحميل التقييمات عند فتح المودال
    if (typeof loadProductReviews === 'function') {
        loadProductReviews(productId);
    }
}

function openQuantityModal(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    currentModalProductId = productId;
    currentModalQuantity = 1;
    
    const modal = document.getElementById('quantityModal');
    const nameDisplay = document.getElementById('quantityModalProductName');
    const quantityDisplay = document.getElementById('modalQuantityDisplay');
    
    if (nameDisplay) nameDisplay.textContent = product.name;
    if (quantityDisplay) quantityDisplay.textContent = currentModalQuantity;
    
    // إعداد أزرار التأكيد
    const confirmAddToCartBtn = document.getElementById('confirmAddToCartBtn');
    const confirmBuyNowBtn = document.getElementById('confirmBuyNowBtn');
    
    if (confirmAddToCartBtn) {
        confirmAddToCartBtn.onclick = () => {
            if (typeof addToCartWithQuantity === 'function') addToCartWithQuantity(currentModalProductId, currentModalQuantity);
            closeQuantityModal();
        };
    }
    
    if (confirmBuyNowBtn) {
        confirmBuyNowBtn.onclick = () => {
            if (typeof buyNowDirect === 'function') buyNowDirect(currentModalProductId, currentModalQuantity);
            closeQuantityModal();
        };
    }
    
    if (modal) modal.classList.add('active');
}

function closeQuantityModal() {
    const modal = document.getElementById('quantityModal');
    if (modal) modal.classList.remove('active');
}

function changeModalQuantity(change) {
    const product = allProducts.find(p => p.id === currentModalProductId);
    const stock = product ? product.stock : 99;
    
    const newQuantity = currentModalQuantity + change;
    
    if (newQuantity >= 1 && newQuantity <= stock) {
        currentModalQuantity = newQuantity;
        const display = document.getElementById('modalQuantityDisplay');
        if (display) display.textContent = currentModalQuantity;
    } else if (newQuantity > stock) {
        if (typeof showToast === 'function') showToast(`الكمية المتاحة في المخزون هي ${stock} فقط`, 'warning');
    }
}

function closeProductDetailsModal() {
    const modal = document.getElementById('productDetailsModal');
    if (modal) modal.classList.remove('active');
}

function displayProducts(products = allProducts) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    if (products.length === 0) {
        displayNoProductsMessage();
        return;
    }
    
    const productsToDisplay = products.slice(0, displayedProductsCount);
    
    productsGrid.innerHTML = productsToDisplay.map(product => {
        const isNew = product.isNew === true || product.isNew === 'true';
        const isSale = product.isSale === true || product.isSale === 'true';
        const isBest = product.isBest === true || product.isBest === 'true';
        const isInFavorites = favorites.some(f => f.id === product.id);
        
        const safeName = typeof window.sanitizeHTML === 'function' ? window.sanitizeHTML(product.name) : product.name;
        const safeDescription = typeof window.sanitizeHTML === 'function' ? window.sanitizeHTML(product.description) : product.description;
        const safeImage = typeof window.sanitizeHTML === 'function' ? window.sanitizeHTML(product.image) : product.image;
        
        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image" onclick="openProductDetails('${product.id}')">
                    <img src="${safeImage}" alt="${safeName}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200?text=صورة'">
                    ${isNew ? '<div class="badge new">جديد</div>' : ''}
                    ${isSale ? '<div class="badge sale">عرض</div>' : ''}
                    ${isBest ? '<div class="badge best">الأفضل</div>' : ''}
                </div>
                <div class="product-info">
                    <h3 onclick="openProductDetails('${product.id}')">${safeName}</h3>
                    <p class="product-description">${safeDescription || ''}</p>
                    <div class="product-price">
                        <span class="current-price">${formatNumber(product.price)} ${siteCurrency}</span>
                        ${product.originalPrice ? `<span class="original-price">${formatNumber(product.originalPrice)} ${siteCurrency}</span>` : ''}
                    </div>
                    <div class="product-stock">
                        <i class="fas fa-box"></i> المخزون: ${formatNumber(product.stock || 0)}
                    </div>
                    <div class="product-actions">
                        <button class="action-btn add-to-cart" onclick="openQuantityModal('${product.id}')">
                            <i class="fas fa-shopping-bag"></i> شراء
                        </button>
                        <button class="action-btn favorite-btn ${isInFavorites ? 'active' : ''}" onclick="toggleFavorite('${product.id}')">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    setupInfiniteScroll();
}

function setupInfiniteScroll() {
    if (window.infiniteScrollSet) return;
    
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 800) {
            if (displayedProductsCount < allProducts.length) {
                displayedProductsCount += productsPerPage;
                displayProducts(allProducts);
            }
        }
    });
    
    window.infiniteScrollSet = true;
}

function displayFeaturedProducts(filteredProducts = null) {
    const featuredGrid = document.getElementById('featuredProductsGrid');
    if (!featuredGrid) return;
    
    const productsToShow = filteredProducts || allProducts;
    
    if (productsToShow.length === 0) {
        return;
    }
    
    featuredGrid.innerHTML = productsToShow.map(product => {
        const isNew = product.isNew === true || product.isNew === 'true';
        const isSale = product.isSale === true || product.isSale === 'true';
        const isBest = product.isBest === true || product.isBest === 'true';
        
        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image" onclick="openProductDetails('${product.id}')">
                    <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x200?text=صورة'">
                    ${isNew ? '<div class="badge new">جديد</div>' : ''}
                    ${isSale ? '<div class="badge sale">عرض</div>' : ''}
                    ${isBest ? '<div class="badge best">الأفضل</div>' : ''}
                </div>
                <div class="product-info">
                    <h3 onclick="openProductDetails('${product.id}')">${product.name}</h3>
                    <p class="product-description">${product.description || ''}</p>
                    <div class="product-price">
                        <span class="current-price">${formatNumber(product.price)} ${siteCurrency}</span>
                        ${product.originalPrice ? `<span class="original-price">${formatNumber(product.originalPrice)} ${siteCurrency}</span>` : ''}
                    </div>
                    <div class="product-stock">
                        <i class="fas fa-box"></i> المخزون: ${formatNumber(product.stock || 0)}
                    </div>
                    <div class="product-actions">
                        <button class="action-btn add-to-cart" onclick="openQuantityModal('${product.id}')">
                            <i class="fas fa-shopping-bag"></i> شراء
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ======================== نظام المفضلة ========================

function toggleFavorite(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    const index = favorites.findIndex(f => f.id === productId);
    
    if (index === -1) {
        favorites.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            category: product.category
        });
        if (typeof showToast === 'function') showToast('تم إضافة المنتج إلى المفضلة', 'success');
    } else {
        favorites.splice(index, 1);
        if (typeof showToast === 'function') showToast('تم إزالة المنتج من المفضلة', 'info');
    }
    
    if (currentUser && !isGuest) {
        if (typeof saveUserDataToFirestore === 'function') saveUserDataToFirestore();
    }
    
    if (document.getElementById('favorites') && document.getElementById('favorites').classList.contains('active')) {
        if (typeof updateFavoritesDisplay === 'function') updateFavoritesDisplay();
    }
    
    if (typeof updateFavoriteIcons === 'function') updateFavoriteIcons();
    if (typeof updateProfileStats === 'function') updateProfileStats();
}

function updateFavoriteIcons() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick');
        if (!onclickAttr) return;
        
        const match = onclickAttr.match(/'([^']+)'/);
        if (!match) return;
        
        const productId = match[1];
        const isFavorite = favorites.some(f => f.id === productId);
        
        if (isFavorite) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function updateFavoritesDisplay() {
    const favoritesGrid = document.getElementById('favoritesGrid');
    const emptyFavoritesMessage = document.getElementById('emptyFavoritesMessage');
    
    if (!favoritesGrid || !emptyFavoritesMessage) return;
    
    if (favorites.length === 0) {
        favoritesGrid.style.display = 'none';
        emptyFavoritesMessage.style.display = 'block';
        return;
    }
    
    favoritesGrid.style.display = 'grid';
    emptyFavoritesMessage.style.display = 'none';
    
    favoritesGrid.innerHTML = favorites.map(product => {
        return `
            <div class="product-card">
                <div class="product-image" onclick="openProductDetails('${product.id}')">
                    <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x200?text=صورة'">
                </div>
                <div class="product-info">
                    <h3 onclick="openProductDetails('${product.id}')">${product.name}</h3>
                    <div class="product-price">
                        <span class="current-price">${formatNumber(product.price)} ${siteCurrency}</span>
                    </div>
                    <div class="product-actions">
                        <button class="action-btn add-to-cart" onclick="openQuantityModal('${product.id}')" style="background: var(--secondary-color); color: white; border-color: var(--secondary-color);">
                            <i class="fas fa-shopping-bag"></i> شراء
                        </button>
                        <button class="action-btn favorite-btn active" onclick="toggleFavorite('${product.id}')">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ======================== نظام التقييمات (Reviews System) ========================

/**
 * تبديل ظهور نموذج إضافة تقييم
 */
window.toggleReviewForm = function() {
    const form = document.getElementById('reviewForm');
    if (!form) return;
    
    if (!currentUser || isGuest) {
        if (typeof showToast === 'function') showToast('يجب تسجيل الدخول لإضافة تقييم', 'warning');
        return;
    }
    
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
    
    // تهيئة نظام النجوم عند فتح النموذج
    if (form.style.display !== 'none') {
        initializeRatingStars();
    }
};

/**
 * تهيئة نظام النجوم للتقييم
 */
let selectedRating = 5; // القيمة الافتراضية
function initializeRatingStars() {
    const stars = document.querySelectorAll('.rating-input i');
    if (!stars || stars.length === 0) return;
    
    // تعيين التقييم الافتراضي (5 نجوم)
    selectedRating = 5;
    updateStarsDisplay(selectedRating);
    
    stars.forEach(star => {
        // عند التمرير فوق النجمة
        star.addEventListener('mouseenter', function() {
            const value = parseInt(this.getAttribute('data-value'));
            updateStarsDisplay(value);
        });
        
        // عند النقر على النجمة
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.getAttribute('data-value'));
            updateStarsDisplay(selectedRating);
        });
    });
    
    // عند مغادرة منطقة النجوم، إرجاع التقييم المحدد
    const ratingContainer = document.querySelector('.rating-input');
    if (ratingContainer) {
        ratingContainer.addEventListener('mouseleave', function() {
            updateStarsDisplay(selectedRating);
        });
    }
}

/**
 * تحديث عرض النجوم
 */
function updateStarsDisplay(rating) {
    const stars = document.querySelectorAll('.rating-input i');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('far');
            star.classList.add('fas');
            star.style.color = '#f1c40f';
        } else {
            star.classList.remove('fas');
            star.classList.add('far');
            star.style.color = '#ddd';
        }
    });
}

/**
 * معاينة صورة التقييم
 */
let reviewImageFile = null;
window.previewReviewImage = function(input) {
    if (!input || !input.files || !input.files[0]) return;
    
    reviewImageFile = input.files[0];
    const previewContainer = document.getElementById('reviewImagePreview');
    if (!previewContainer) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        previewContainer.innerHTML = `
            <div style="position: relative; display: inline-block;">
                <img src="${e.target.result}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 2px solid var(--secondary-color);">
                <button onclick="removeReviewImage()" style="position: absolute; top: -5px; right: -5px; background: #ff4757; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 12px;">&times;</button>
            </div>
        `;
    };
    reader.readAsDataURL(reviewImageFile);
};

window.removeReviewImage = function() {
    reviewImageFile = null;
    const previewContainer = document.getElementById('reviewImagePreview');
    const input = document.getElementById('reviewImageInput');
    if (previewContainer) previewContainer.innerHTML = '';
    if (input) input.value = '';
};

/**
 * إرسال التقييم
 */
window.submitReview = async function() {
    if (!currentUser || isGuest) {
        if (typeof showToast === 'function') showToast('يجب تسجيل الدخول أولاً', 'error');
        return;
    }

    const comment = document.getElementById('reviewComment').value.trim();
    const rating = selectedRating || 5; // استخدام التقييم المحدد من النجوم
    const productId = currentModalProductId;

    if (!comment) {
        if (typeof showToast === 'function') showToast('يرجى كتابة تعليق', 'warning');
        return;
    }

    // منع التقييمات الوهمية: التحقق مما إذا كان المستخدم قد اشترى المنتج فعلاً (اختياري ولكن مفضل)
    // هنا سنكتفي بالتحقق من تسجيل الدخول ومنع التكرار السريع

    if (typeof showLoadingSpinner === 'function') showLoadingSpinner('جاري إرسال تقييمك...');

    try {
        let imageUrl = '';
        if (reviewImageFile) {
            const fileName = `reviews/${productId}/${currentUser.uid}_${Date.now()}_${reviewImageFile.name}`;
            const storageRef = window.firebaseModules.ref(storage, fileName);
            const uploadResult = await window.firebaseModules.uploadBytes(storageRef, reviewImageFile);
            imageUrl = await window.firebaseModules.getDownloadURL(uploadResult.ref);
        }

        const reviewData = {
            productId,
            userId: currentUser.uid,
            userName: currentUser.displayName || 'عميل Eleven',
            userImage: currentUser.photoURL || '',
            rating,
            comment,
            imageUrl,
            createdAt: window.firebaseModules.serverTimestamp(),
            status: 'approved' // يمكن تغييرها لـ pending للمراجعة اليدوية
        };

        const reviewsRef = window.firebaseModules.collection(db, 'reviews');
        await window.firebaseModules.addDoc(reviewsRef, reviewData);

        if (typeof showToast === 'function') showToast('شكراً لتقييمك! تم النشر بنجاح', 'success');
        
        // إعادة تعيين النموذج
        document.getElementById('reviewComment').value = '';
        removeReviewImage();
        selectedRating = 5; // إعادة تعيين التقييم
        updateStarsDisplay(5);
        toggleReviewForm();
        
        // تحديث قائمة التقييمات
        if (typeof loadProductReviews === 'function') loadProductReviews(productId);

    } catch (error) {
        console.error('Error submitting review:', error);
        if (typeof showToast === 'function') showToast('فشل إرسال التقييم، حاول مجدداً', 'error');
    } finally {
        if (typeof hideLoadingSpinner === 'function') hideLoadingSpinner();
    }
};

/**
 * تحميل تقييمات المنتج
 */
window.loadProductReviews = async function(productId) {
    const reviewsList = document.getElementById('productReviewsList');
    const reviewCountElem = document.getElementById('reviewCount');
    if (!reviewsList) return;

    try {
        const q = window.firebaseModules.query(
            window.firebaseModules.collection(db, 'reviews'),
            window.firebaseModules.where('productId', '==', productId),
            window.firebaseModules.orderBy('createdAt', 'desc')
        );

        const snapshot = await window.firebaseModules.getDocs(q);
        
        if (reviewCountElem) reviewCountElem.textContent = snapshot.size;

        if (snapshot.empty) {
            reviewsList.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">لا توجد تقييمات لهذا المنتج بعد.</p>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const review = doc.data();
            const date = review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString('ar-SA') : 'منذ قليل';
            
            let stars = '';
            for (let i = 1; i <= 5; i++) {
                stars += `<i class="fa${i <= review.rating ? 's' : 'r'} fa-star" style="color: #f1c40f; font-size: 12px;"></i>`;
            }

            html += `
                <div class="review-item" style="padding: 15px; border-bottom: 1px solid #eee; margin-bottom: 10px;">
                    <div class="review-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 35px; height: 35px; border-radius: 50%; background: #eee; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                                ${review.userImage ? `<img src="${review.userImage}" style="width: 100%; height: 100%; object-fit: cover;">` : `<i class="fas fa-user" style="color: #ccc;"></i>`}
                            </div>
                            <div>
                                <h5 style="margin: 0; font-size: 14px;">${review.userName}</h5>
                                <div class="stars">${stars}</div>
                            </div>
                        </div>
                        <span style="font-size: 12px; color: #999;">${date}</span>
                    </div>
                    <p style="margin: 8px 0; font-size: 14px; color: #444; line-height: 1.6;">${review.comment}</p>
                    ${review.imageUrl ? `<img src="${review.imageUrl}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-top: 8px; cursor: pointer;" onclick="window.open('${review.imageUrl}')">` : ''}
                </div>
            `;
        });

        reviewsList.innerHTML = html;

    } catch (error) {
        console.error('Error loading reviews:', error);
        reviewsList.innerHTML = '<p style="text-align: center; color: #e74c3c;">فشل تحميل التقييمات</p>';
    }
};

// تحديث دالة فتح تفاصيل المنتج لتشمل تحميل التقييمات
const originalOpenProductDetails = window.openProductDetails;
window.openProductDetails = function(productId) {
    if (typeof originalOpenProductDetails === 'function') {
        originalOpenProductDetails(productId);
    }
    if (typeof loadProductReviews === 'function') loadProductReviews(productId);
};

// ======================== التصدير للاستخدام العام ========================

window.loadProducts = loadProducts;
window.displayProducts = displayProducts;
window.displayFeaturedProducts = displayFeaturedProducts;
window.openProductDetails = openProductDetails;
window.closeProductDetailsModal = closeProductDetailsModal;
window.openQuantityModal = openQuantityModal;
window.closeQuantityModal = closeQuantityModal;
window.changeModalQuantity = changeModalQuantity;
window.toggleFavorite = toggleFavorite;
window.updateFavoriteIcons = updateFavoriteIcons;
window.updateFavoritesDisplay = updateFavoritesDisplay;

console.log('✅ products-system.js loaded');