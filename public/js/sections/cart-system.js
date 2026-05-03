// cart-system.js - إدارة سلة التسوق المحسنة (نسخة تعتمد على AppState و Firebase)
// ======================== إدارة السلة ========================

// تهيئة cartItems كمصفوفة دائماً لتجنب الأخطاء
window.cartItems = window.cartItems || [];

// ======================== دوال مساعدة ========================

/**
 * تنسيق الأرقام
 */
function formatNumber(num) {
    if (typeof num !== 'number') num = parseFloat(num) || 0;
    return num.toLocaleString('ar-SD', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

// تصديرها للاستخدام العام
window.formatNumber = formatNumber;

/**
 * تحديث عداد السلة
 */
function updateCartCount() {
    let totalItems = 0;
    
    try {
        if (window.directPurchaseItem && typeof window.directPurchaseItem === 'object' && window.directPurchaseItem.id) {
            totalItems = window.directPurchaseItem.quantity || 1;
        } else {
            // جمع من كل المصادر الممكنة
            let items = [];
            
            if (window.AppState && window.AppState.cart && Array.isArray(window.AppState.cart)) {
                items = window.AppState.cart;
            } else if (window.cartItems && Array.isArray(window.cartItems)) {
                items = window.cartItems;
            }
            
            totalItems = items.reduce((total, item) => {
                if (item && typeof item === 'object') {
                    return total + (parseInt(item.quantity) || 0);
                }
                return total;
            }, 0);
        }
    } catch (error) {
        console.error('❌ خطأ في تحديث عداد السلة:', error);
        totalItems = 0;
    }
    
    console.log('🔢 تحديث عداد السلة:', totalItems);
    
    const cartCountElements = document.querySelectorAll('.cart-count');
    
    cartCountElements.forEach(element => {
        if (element) {
            element.textContent = totalItems;
            element.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    });
    
    window.cartTotalItems = totalItems;
    return totalItems;
}

/**
 * إضافة منتج إلى السلة بكمية محددة
 */
async function addToCartWithQuantity(productId, quantity = 1) {
    console.log(`🛒 إضافة إلى السلة: ${productId} - الكمية: ${quantity}`);
    
    let product = null;
    
    // البحث عن المنتج في allProducts
    if (typeof window.allProducts !== 'undefined' && window.allProducts && Array.isArray(window.allProducts)) {
        product = window.allProducts.find(p => p.id === productId);
        if (product) console.log('✅ تم العثور على المنتج في allProducts');
    }
    
    // إذا لم يوجد، نحاول من Firebase
    if (!product) {
        try {
            if (typeof showLoadingSpinner === 'function') showLoadingSpinner('جاري تحميل بيانات المنتج...');
            
            const db = window.db;
            if (db && window.firebaseModules) {
                const docSnap = await window.firebaseModules.getDoc(
                    window.firebaseModules.doc(db, "products", productId)
                );
                
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    product = { 
                        id: docSnap.id, 
                        ...data,
                        price: parseFloat(data.price) || 0
                    };
                    console.log('✅ تم العثور على المنتج في Firebase');
                }
            }
            
            if (typeof hideLoadingSpinner === 'function') hideLoadingSpinner();
        } catch (e) {
            console.error("❌ خطأ في جلب المنتج للسلة:", e);
            if (typeof hideLoadingSpinner === 'function') hideLoadingSpinner();
        }
    }

    if (!product) {
        console.error('❌ لم يتم العثور على المنتج:', productId);
        if (typeof showToast === 'function') {
            showToast('المنتج غير موجود أو حدث خطأ في الاتصال', 'error');
        }
        return false;
    }
    
    // التحقق من الحقول المطلوبة
    if (!product.name || !product.price) {
        console.error('❌ بيانات المنتج غير كاملة:', product);
        if (typeof showToast === 'function') {
            showToast('بيانات المنتج غير كاملة', 'error');
        }
        return false;
    }
    
    // التحقق من المخزون
    const stock = parseInt(product.stock) || 0;
    if (stock <= 0) {
        if (typeof showToast === 'function') {
            showToast('المنتج غير متوفر في المخزون', 'warning');
        }
        return false;
    }
    
    if (quantity > stock) {
        if (typeof showToast === 'function') {
            showToast(`الكمية المطلوبة غير متوفرة. المخزون الحالي: ${stock}`, 'warning');
        }
        return false;
    }
    
    // الكائن المراد إضافته
    const cartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice || null,
        image: product.image || null,
        quantity: quantity,
        stock: stock
    };
    
    // إضافة إلى AppState أو cartItems
    if (window.AppState && typeof window.AppState.addToCart === 'function') {
        console.log('📦 إضافة عبر AppState');
        window.AppState.addToCart(cartItem);
    } else {
        // Fallback
        console.log('📦 إضافة عبر cartItems الاحتياطية');
        window.cartItems = window.cartItems || [];
        
        const existingItem = window.cartItems.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity += quantity;
            console.log('🔄 تحديث كمية منتج موجود:', existingItem.quantity);
        } else {
            window.cartItems.push(cartItem);
            console.log('➕ إضافة منتج جديد للسلة');
        }
    }
    
    // تحديث العداد
    updateCartCount();
    
    // تحديث عرض السلة إذا كانت مفتوحة
    const cartSection = document.getElementById('cart');
    if (cartSection && cartSection.classList.contains('active')) {
        setTimeout(() => forceUpdateCartDisplay(), 100);
    }
    
    if (typeof showToast === 'function') {
        showToast(`تمت إضافة ${quantity} من "${product.name}" إلى السلة`, 'success');
    }
    
    return true;
}

/**
 * تحديث عرض السلة
 */
function updateCartDisplay() {
    forceUpdateCartDisplay();
}

// ======================== عرض السلة المحسن ========================

/**
 * عرض السلة عند فتحها - نسخة مصححة
 */
function showCartSection() {
    console.log('🛒 فتح قسم السلة...');
    const cartSection = document.getElementById('cart');
    if (!cartSection) {
        console.error('❌ قسم السلة غير موجود في DOM');
        return;
    }
    
    // تفعيل قسم السلة
    if (typeof showSection === 'function') {
        showSection('cart');
    } else {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        cartSection.classList.add('active');
    }
    
    // تحديث عرض السلة بعد تأخير قصير للتأكد من تفعيل القسم
    setTimeout(() => {
        forceUpdateCartDisplay();
    }, 150);
}

/**
 * تحديث عرض السلة بشكل إجباري
 */
function forceUpdateCartDisplay() {
    console.log('🔄 تحديث عرض السلة...');
    
    const cartItemsElement = document.getElementById('cartItems');
    const emptyCartMessage = document.getElementById('emptyCartMessage');
    const cartSummary = document.querySelector('.cart-summary');
    
    if (!cartItemsElement || !emptyCartMessage) {
        console.error('❌ عناصر السلة غير موجودة في DOM');
        return;
    }
    
    // تجميع المنتجات من كل المصادر
    let items = [];
    
    // المصدر 1: directPurchaseItem
    if (window.directPurchaseItem && typeof window.directPurchaseItem === 'object' && window.directPurchaseItem.id) {
        items = [window.directPurchaseItem];
        console.log('📦 المصدر: شراء مباشر');
    }
    // المصدر 2: AppState
    else if (window.AppState && window.AppState.cart && Array.isArray(window.AppState.cart) && window.AppState.cart.length > 0) {
        items = window.AppState.cart;
        console.log('📦 المصدر: AppState');
    }
    // المصدر 3: window.cartItems
    else if (window.cartItems && Array.isArray(window.cartItems) && window.cartItems.length > 0) {
        items = window.cartItems;
        console.log('📦 المصدر: cartItems الاحتياطية');
    }
    
    console.log('🛒 عرض السلة - عدد المنتجات:', items.length);
    
    // تصفية العناصر غير الصالحة
    items = items.filter(item => item && typeof item === 'object' && item.id);
    
    // إظهار أو إخفاء الرسائل المناسبة
    if (!items || items.length === 0) {
        console.log('🛒 السلة فارغة');
        cartItemsElement.innerHTML = '';
        cartItemsElement.style.display = 'none';
        emptyCartMessage.style.display = 'block';
        if (cartSummary) cartSummary.style.display = 'none';
        updateCartCount();
        return;
    }
    
    // عرض المنتجات
    cartItemsElement.style.display = 'flex';
    cartItemsElement.style.flexDirection = 'column';
    cartItemsElement.style.gap = '12px';
    emptyCartMessage.style.display = 'none';
    if (cartSummary) cartSummary.style.display = 'block';
    
    const currency = (window.AppState && window.AppState.currency) || 'SDG';
    const isDirect = !!(window.directPurchaseItem && window.directPurchaseItem.id);
    
    cartItemsElement.innerHTML = items.map((item, index) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        const itemTotal = price * quantity;
        const imageUrl = item.image || 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png';
        const safeName = String(item.name || 'منتج').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeId = String(item.id || index).replace(/[^a-zA-Z0-9_-]/g, '');
        
        return `
            <div class="cart-item" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);" data-id="${safeId}">
                <div class="cart-item-image" style="width: 70px; height: 70px; flex-shrink: 0; border-radius: 8px; overflow: hidden;">
                    <img src="${imageUrl}" alt="${safeName}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png'">
                </div>
                <div class="cart-item-details" style="flex: 1; min-width: 0;">
                    <h3 style="margin: 0 0 5px 0; font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${safeName}</h3>
                    <p style="margin: 0 0 8px 0; color: var(--secondary-color, #c9a24d); font-weight: 700; font-size: 13px;">
                        ${formatNumber(price)} ${currency} × ${quantity} = <strong>${formatNumber(itemTotal)} ${currency}</strong>
                    </p>
                    <div class="cart-item-controls" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <div class="quantity-controls" style="display: flex; align-items: center; gap: 5px; background: #f5f5f5; border-radius: 20px; padding: 3px;">
                            <button class="quantity-btn" onclick="window.updateCartQuantity('${safeId}', 1)" style="width: 30px; height: 30px; border: none; background: white; border-radius: 50%; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--primary-color, #333); font-weight: bold;">+</button>
                            <span style="min-width: 25px; text-align: center; font-weight: 600; font-size: 14px;">${quantity}</span>
                            <button class="quantity-btn" onclick="window.updateCartQuantity('${safeId}', -1)" style="width: 30px; height: 30px; border: none; background: white; border-radius: 50%; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--primary-color, #333); font-weight: bold;">-</button>
                        </div>
                        ${!isDirect ? `
                        <button class="remove-item-btn" onclick="window.removeFromCart('${safeId}')" style="background: #fee; color: #e74c3c; border: none; padding: 5px 10px; border-radius: 15px; cursor: pointer; font-size: 12px; margin-right: auto; display: flex; align-items: center; gap: 5px;">
                            <i class="fas fa-trash-alt"></i> حذف
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // تحديث الملخص
    updateCartSummaryEnhanced(items, currency);
    updateCartCount();
    
    console.log('✅ تم عرض السلة بنجاح -', items.length, 'منتجات');
}

/**
 * تحديث ملخص السلة المحسن
 */
function updateCartSummaryEnhanced(items, currency) {
    const subtotalElement = document.getElementById('cartSubtotal');
    const shippingElement = document.getElementById('cartShipping');
    const totalElement = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const shippingNote = document.getElementById('shippingNote');
    
    if (!subtotalElement || !totalElement) {
        console.warn('⚠️ عناصر ملخص السلة غير موجودة');
        return;
    }
    
    // الحصول على إعدادات الشحن
    const settings = (window.AppState && window.AppState.settings) || {};
    const freeShippingThreshold = parseFloat(settings.freeShippingThreshold) || 5000;
    const shippingCost = parseFloat(settings.shippingCost) || 0;
    
    const subtotal = items.reduce((total, item) => {
        return total + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
    }, 0);
    
    const finalShipping = subtotal >= freeShippingThreshold ? 0 : shippingCost;
    const total = subtotal + finalShipping;
    
    subtotalElement.textContent = `${formatNumber(subtotal)} ${currency}`;
    
    if (shippingElement) {
        shippingElement.textContent = finalShipping === 0 ? 'مجاني 🎉' : `${formatNumber(finalShipping)} ${currency}`;
    }
    
    totalElement.textContent = `${formatNumber(total)} ${currency}`;
    
    // تفعيل/تعطيل زر إتمام الشراء
    if (checkoutBtn) {
        checkoutBtn.disabled = items.length === 0;
    }
    
    // تحديث ملاحظة الشحن
    if (shippingNote) {
        if (finalShipping > 0 && freeShippingThreshold > 0) {
            const remaining = freeShippingThreshold - subtotal;
            shippingNote.innerHTML = `<i class="fas fa-truck"></i> أضف ${formatNumber(remaining)} ${currency} أخرى للشحن المجاني`;
            shippingNote.style.display = 'block';
        } else if (finalShipping === 0 && subtotal > 0) {
            shippingNote.innerHTML = `<i class="fas fa-check-circle" style="color: #27ae60;"></i> أنت تستحق الشحن المجاني! 🎉`;
            shippingNote.style.display = 'block';
        } else {
            shippingNote.style.display = 'none';
        }
    }
}

/**
 * تحديث كمية منتج في السلة
 */
function updateCartQuantity(productId, change) {
    console.log(`🔄 تغيير كمية المنتج ${productId} بمقدار ${change}`);
    
    const isDirect = !!(window.directPurchaseItem && window.directPurchaseItem.id);
    
    if (isDirect) {
        if (window.directPurchaseItem.id === productId || String(window.directPurchaseItem.id) === String(productId)) {
            const newQty = (parseInt(window.directPurchaseItem.quantity) || 1) + change;
            if (newQty >= 1) {
                window.directPurchaseItem.quantity = newQty;
                forceUpdateCartDisplay();
                updateCartCount();
                console.log('✅ تم تحديث كمية المنتج المباشر:', newQty);
            } else if (newQty <= 0) {
                // إذا وصلت الكمية لصفر، نحذف المنتج
                window.directPurchaseItem = null;
                forceUpdateCartDisplay();
                updateCartCount();
                if (typeof showToast === 'function') showToast('تم حذف المنتج من السلة', 'info');
            }
        }
        return;
    }

    if (window.AppState && typeof window.AppState.updateCartItemQuantity === 'function') {
        window.AppState.updateCartItemQuantity(productId, change);
    } else {
        // Fallback
        window.cartItems = window.cartItems || [];
        const item = window.cartItems.find(i => String(i.id) === String(productId));
        if (item) {
            const newQty = (parseInt(item.quantity) || 1) + change;
            if (newQty >= 1) {
                item.quantity = newQty;
            } else {
                window.cartItems = window.cartItems.filter(i => String(i.id) !== String(productId));
                if (typeof showToast === 'function') showToast('تم حذف المنتج من السلة', 'info');
            }
        }
    }
    
    forceUpdateCartDisplay();
    updateCartCount();
}

/**
 * حذف منتج من السلة
 */
function removeFromCart(productId) {
    console.log(`🗑️ حذف المنتج ${productId} من السلة`);
    
    if (window.directPurchaseItem && (window.directPurchaseItem.id === productId || String(window.directPurchaseItem.id) === String(productId))) {
        window.directPurchaseItem = null;
        console.log('✅ تم حذف المنتج المباشر');
    }
    
    if (window.AppState && typeof window.AppState.removeFromCart === 'function') {
        window.AppState.removeFromCart(productId);
    }
    
    // Fallback
    if (window.cartItems && Array.isArray(window.cartItems)) {
        window.cartItems = window.cartItems.filter(i => String(i.id) !== String(productId));
    }
    
    forceUpdateCartDisplay();
    updateCartCount();
    
    if (typeof showToast === 'function') showToast('تم حذف المنتج من السلة', 'info');
}

/**
 * تحديث ملخص السلة (متوافق مع الاستدعاءات القديمة)
 */
function updateCartSummary() {
    const isDirect = !!(window.directPurchaseItem && window.directPurchaseItem.id);
    let items = [];
    
    if (isDirect) {
        items = [window.directPurchaseItem];
    } else if (window.AppState && window.AppState.cart && Array.isArray(window.AppState.cart)) {
        items = window.AppState.cart;
    } else if (window.cartItems && Array.isArray(window.cartItems)) {
        items = window.cartItems;
    }
    
    const currency = (window.AppState && window.AppState.currency) || 'SDG';
    updateCartSummaryEnhanced(items, currency);
}

// ======================== مستمعات الأحداث ========================

// عرض السلة تلقائياً عند فتحها
document.addEventListener('sectionChanged', function(e) {
    if (e.detail && e.detail.section === 'cart') {
        console.log('🛒 تم فتح قسم السلة عبر sectionChanged');
        setTimeout(() => {
            forceUpdateCartDisplay();
        }, 100);
    }
});

// تهيئة السلة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    console.log('🛒 تهيئة نظام السلة...');
    
    // تأكد من وجود cartItems
    window.cartItems = window.cartItems || [];
    
    // تحديث العداد
    updateCartCount();
    
    // ربط زر السلة
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) {
        cartBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showCartSection();
        });
        console.log('✅ تم ربط زر السلة');
    }
    
    // زر متابعة التسوق
    const continueShoppingBtn = document.getElementById('continueShoppingBtn');
    if (continueShoppingBtn) {
        continueShoppingBtn.addEventListener('click', function() {
            if (typeof showSection === 'function') {
                showSection('products');
            }
        });
    }
    
    // ربط زر إتمام الشراء
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function() {
            if (typeof goToCheckout === 'function') {
                goToCheckout();
            } else if (typeof showSection === 'function') {
                showSection('checkout');
            }
        });
    }
    
    console.log('✅ نظام السلة جاهز');
});

// ======================== تصدير الدوال العامة ========================

window.updateCartCount = updateCartCount;
window.addToCartWithQuantity = addToCartWithQuantity;
window.updateCartDisplay = forceUpdateCartDisplay;
window.updateCartDisplayOriginal = updateCartDisplay;
window.forceUpdateCartDisplay = forceUpdateCartDisplay;
window.showCartSection = showCartSection;
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
window.updateCartSummary = updateCartSummary;
window.formatNumber = formatNumber;

console.log('🚀 cart-system.js المحسن جاهز للعمل!');