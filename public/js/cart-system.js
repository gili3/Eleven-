// cart-system.js - إدارة سلة التسوق المحسنة
// ======================== إدارة السلة ========================

// تعريف المتغيرات عالمياً
if (typeof window.cartItems === 'undefined') window.cartItems = [];
if (typeof window.directPurchaseItem === 'undefined') window.directPurchaseItem = null;

/**
 * تحديث عداد السلة
 */
function updateCartCount() {
    let totalItems = 0;
    
    if (window.directPurchaseItem) {
        totalItems = window.directPurchaseItem.quantity || 1;
    } else {
        totalItems = (window.cartItems || []).reduce((total, item) => total + (parseInt(item.quantity) || 0), 0);
    }
    
    const cartCountElements = document.querySelectorAll('.cart-count');
    
    cartCountElements.forEach(element => {
        if (element) {
            element.textContent = totalItems;
            // إظهار/إخفاء العداد بناءً على العدد
            element.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    });
}

/**
 * إضافة منتج إلى السلة بكمية محددة
 */
async function addToCartWithQuantity(productId, quantity = 1) {
    console.log(`🛒 إضافة إلى السلة: ${productId} - الكمية: ${quantity}`);
    
    let product = null;
    
    // محاولة البحث في القائمة المحملة حالياً
    if (typeof window.allProducts !== 'undefined' && window.allProducts) {
        product = window.allProducts.find(p => p.id === productId);
    }
    
    // إذا لم يوجد، جلب بياناته مباشرة من Firebase
    if (!product) {
        try {
            showLoadingSpinner('جاري تحميل بيانات المنتج...');
            
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
                        price: parseFloat(data.price) || 0
                    };
                }
            }
            
            hideLoadingSpinner();
        } catch (e) {
            console.error("❌ خطأ في جلب المنتج للسلة:", e);
            hideLoadingSpinner();
        }
    }

    if (!product) {
        if (typeof showToast === 'function') {
            showToast('المنتج غير موجود أو حدث خطأ في الاتصال', 'error');
        }
        return;
    }
    
    if (product.stock <= 0) {
        if (typeof showToast === 'function') {
            showToast('المنتج غير متوفر في المخزون', 'warning');
        }
        return;
    }
    
    if (quantity > product.stock) {
        if (typeof showToast === 'function') {
            showToast(`الكمية المطلوبة غير متوفرة. المخزون الحالي: ${product.stock}`, 'warning');
        }
        return;
    }
    
    const existingItem = window.cartItems.find(item => item.id === productId);
    
    if (existingItem) {
        if (existingItem.quantity + quantity > product.stock) {
            if (typeof showToast === 'function') {
                showToast(`لا توجد كمية كافية في المخزون. المتاح: ${product.stock - existingItem.quantity}`, 'warning');
            }
            return;
        }
        existingItem.quantity += quantity;
    } else {
        window.cartItems.push({
            id: product.id,
            name: product.name,
            price: product.price,
            originalPrice: product.originalPrice,
            image: product.image,
            quantity: quantity,
            stock: product.stock
        });
    }
    
    await saveCartToFirebase();
    updateCartCount();
    
    const cartSection = document.getElementById('cart');
    if (cartSection && cartSection.classList.contains('active')) {
        updateCartDisplay();
    }
    
    if (typeof showToast === 'function') {
        showToast(`تمت إضافة ${quantity} من "${product.name}" إلى السلة`, 'success');
    }
}

/**
 * حفظ السلة في Firebase
 */
async function saveCartToFirebase() {
    try {
        // حفظ في localStorage كنسخة احتياطية
        localStorage.setItem('eleven_cart', JSON.stringify(window.cartItems || []));
        
        // التحقق من وجود المستخدم
        if (typeof window.currentUser === 'undefined' || !window.currentUser || 
            (typeof window.isGuest !== 'undefined' && window.isGuest)) {
            console.log('💾 تم حفظ السلة محلياً (ضيف)');
            return;
        }
        
        const db = getFirebaseReference();
        if (!db || !window.firebaseModules) return;
        
        const userRef = window.firebaseModules.doc(db, 'users', window.currentUser.uid);
        await window.firebaseModules.updateDoc(userRef, {
            cart: window.cartItems || [],
            updatedAt: window.firebaseModules.serverTimestamp()
        });
        console.log('✅ تم حفظ السلة في Firebase');
    } catch (error) {
        console.error('❌ خطأ في حفظ السلة:', error);
    }
}

/**
 * تحميل السلة من Firebase
 */
async function loadCartFromFirebase() {
    try {
        // تحميل من localStorage أولاً
        const localCart = localStorage.getItem('eleven_cart');
        if (localCart) {
            try {
                window.cartItems = JSON.parse(localCart);
                updateCartCount();
                console.log('💾 تم تحميل السلة من localStorage');
            } catch (e) {
                console.warn('⚠️ خطأ في قراءة localStorage');
            }
        }
        
        if (typeof window.currentUser === 'undefined' || !window.currentUser || 
            (typeof window.isGuest !== 'undefined' && window.isGuest)) {
            return;
        }
        
        const db = getFirebaseReference();
        if (!db || !window.firebaseModules) return;
        
        const userRef = window.firebaseModules.doc(db, 'users', window.currentUser.uid);
        const userSnap = await window.firebaseModules.getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.cart && Array.isArray(userData.cart) && userData.cart.length > 0) {
                window.cartItems = userData.cart;
                updateCartCount();
                localStorage.setItem('eleven_cart', JSON.stringify(window.cartItems));
                console.log('✅ تم تحميل السلة من Firebase');
            }
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل السلة:', error);
    }
}

/**
 * تحديث عرض السلة
 */
function updateCartDisplay() {
    const cartItemsElement = document.getElementById('cartItems');
    const emptyCartMessage = document.getElementById('emptyCartMessage');
    const cartSummary = document.querySelector('.cart-summary');
    
    if (!cartItemsElement || !emptyCartMessage) return;
    
    const isDirect = !!window.directPurchaseItem;
    const items = isDirect ? [window.directPurchaseItem] : (window.cartItems || []);
    
    if (items.length === 0) {
        cartItemsElement.style.display = 'none';
        emptyCartMessage.style.display = 'block';
        if (cartSummary) cartSummary.style.display = 'none';
        return;
    }
    
    cartItemsElement.style.display = 'flex';
    cartItemsElement.style.flexDirection = 'column';
    emptyCartMessage.style.display = 'none';
    if (cartSummary) cartSummary.style.display = 'block';
    
    const currency = typeof window.siteCurrency !== 'undefined' ? window.siteCurrency : 'SDG';
    
    cartItemsElement.innerHTML = items.map(item => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        const imageUrl = item.image || 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png';
        
        return `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-image">
                    <img src="${imageUrl}" alt="${item.name}" onerror="this.src='https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png'">
                </div>
                <div class="cart-item-details">
                    <h3 class="cart-item-title">${item.name}</h3>
                    <p class="cart-item-price">${formatNumber(price)} ${currency}</p>
                    <div class="cart-item-controls">
                        <div class="quantity-controls">
                            <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', 1)">+</button>
                            <span class="quantity">${quantity}</span>
                            <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', -1)">-</button>
                        </div>
                        ${!isDirect ? `
                        <button class="remove-item-btn" onclick="removeFromCart('${item.id}')">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    updateCartSummary();
}

/**
 * تحديث كمية منتج في السلة
 */
function updateCartQuantity(productId, change) {
    const isDirect = !!window.directPurchaseItem;
    const item = isDirect ? 
        (window.directPurchaseItem.id === productId ? window.directPurchaseItem : null) : 
        window.cartItems.find(i => i.id === productId);
    
    if (!item) return;
    
    const product = typeof window.allProducts !== 'undefined' ? 
        window.allProducts.find(p => p.id === productId) : null;
    
    const newQuantity = (parseInt(item.quantity) || 1) + change;
    
    if (newQuantity < 1) {
        if (!isDirect) removeFromCart(productId);
        return;
    }
    
    const availableStock = product ? product.stock : (item.stock || 99);
    if (newQuantity > availableStock) {
        if (typeof showToast === 'function') {
            showToast(`لا توجد كمية كافية. المتاح: ${availableStock}`, 'warning');
        }
        return;
    }
    
    item.quantity = newQuantity;
    
    if (!isDirect) {
        saveCartToFirebase();
    }
    
    updateCartCount();
    updateCartDisplay();
}

/**
 * إزالة منتج من السلة
 */
function removeFromCart(productId) {
    if (!confirm('هل تريد إزالة هذا المنتج من السلة؟')) return;
    
    if (window.directPurchaseItem && window.directPurchaseItem.id === productId) {
        window.directPurchaseItem = null;
    } else {
        window.cartItems = (window.cartItems || []).filter(item => item.id !== productId);
    }
    
    saveCartToFirebase();
    updateCartCount();
    updateCartDisplay();
    
    if (typeof showToast === 'function') {
        showToast('تم إزالة المنتج من السلة', 'info');
    }
}

/**
 * تحديث ملخص السلة
 */
function updateCartSummary() {
    const isDirect = !!window.directPurchaseItem;
    const itemsToCalculate = isDirect ? [window.directPurchaseItem] : (window.cartItems || []);
    
    const subtotal = itemsToCalculate.reduce((total, item) => {
        return total + (parseFloat(item.price || 0) * parseInt(item.quantity || 0));
    }, 0);
    
    const settings = typeof window.siteSettings !== 'undefined' ? window.siteSettings : { 
        shippingCost: 2000, 
        freeShippingLimit: 20000 
    };
    
    const shippingCost = parseFloat(settings.shippingCost) || 0;
    const freeShippingLimit = parseFloat(settings.freeShippingLimit) || 0;
    const currency = typeof window.siteCurrency !== 'undefined' ? window.siteCurrency : 'SDG';
    
    let finalShippingCost = 0;
    if (subtotal > 0 && (freeShippingLimit === 0 || subtotal < freeShippingLimit)) {
        finalShippingCost = shippingCost;
    }
    
    const total = subtotal + finalShippingCost;
    
    // تحديث العناصر
    const subtotalElement = document.getElementById('cartSubtotal');
    const shippingElement = document.getElementById('cartShipping');
    const totalElement = document.getElementById('cartTotal');
    const shippingNoteElement = document.getElementById('shippingNote');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (subtotalElement) {
        subtotalElement.textContent = `${formatNumber(subtotal)} ${currency}`;
    }
    
    if (shippingElement) {
        shippingElement.textContent = `${formatNumber(finalShippingCost)} ${currency}`;
    }
    
    if (totalElement) {
        totalElement.textContent = `${formatNumber(total)} ${currency}`;
    }
    
    if (shippingNoteElement) {
        if (subtotal > 0 && freeShippingLimit > 0 && subtotal < freeShippingLimit) {
            const remaining = freeShippingLimit - subtotal;
            shippingNoteElement.innerHTML = `
                <i class="fas fa-truck"></i>
                أضف ${formatNumber(remaining)} ${currency} أخرى للحصول على شحن مجاني
            `;
            shippingNoteElement.style.display = 'flex';
        } else if (subtotal >= freeShippingLimit && freeShippingLimit > 0) {
            shippingNoteElement.innerHTML = `
                <i class="fas fa-check-circle"></i>
                مبروك! لقد حصلت على شحن مجاني
            `;
            shippingNoteElement.style.display = 'flex';
        } else {
            shippingNoteElement.style.display = 'none';
        }
    }
    
    if (checkoutBtn) {
        checkoutBtn.disabled = subtotal === 0;
    }
}

/**
 * تفريغ السلة بالكامل
 */
function clearCart() {
    if (!window.directPurchaseItem && (window.cartItems || []).length === 0) return;
    
    if (confirm('هل تريد تفريغ السلة بالكامل؟')) {
        window.cartItems = [];
        window.directPurchaseItem = null;
        saveCartToFirebase();
        updateCartCount();
        updateCartDisplay();
        
        if (typeof showToast === 'function') {
            showToast('تم تفريغ السلة', 'info');
        }
    }
}

/**
 * شراء مباشر
 */
function buyNowDirect(productId, quantity = 1) {
    console.log(`⚡ شراء مباشر: ${productId} - الكمية: ${quantity}`);
    
    if (typeof window.allProducts === 'undefined' || !window.allProducts) {
        if (typeof showToast === 'function') {
            showToast('حدث خطأ، يرجى إعادة تحميل الصفحة', 'error');
        }
        return;
    }

    const product = window.allProducts.find(p => p.id === productId);
    if (!product) {
        if (typeof showToast === 'function') {
            showToast('المنتج غير موجود', 'error');
        }
        return;
    }
    
    if (product.stock <= 0) {
        if (typeof showToast === 'function') {
            showToast('المنتج غير متوفر في المخزون', 'warning');
        }
        return;
    }
    
    if (quantity > product.stock) {
        if (typeof showToast === 'function') {
            showToast(`الكمية المطلوبة غير متوفرة. المخزون الحالي: ${product.stock}`, 'warning');
        }
        return;
    }
    
    window.directPurchaseItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: quantity,
        image: product.image,
        stock: product.stock
    };
    
    updateCartCount();
    
    if (typeof showSection === 'function') {
        showSection("checkout");
    } else {
        // طريقة بديلة
        const checkoutSection = document.getElementById('checkout');
        if (checkoutSection) {
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            checkoutSection.classList.add('active');
        }
    }
}

/**
 * دالة مساعدة للحصول على مرجع Firebase
 */
function getFirebaseReference() {
    // استخدام Firebase الموحد أولاً
    if (window.firebaseInstance && window.firebaseInstance.db) return window.firebaseInstance.db;
    if (window.firebaseDb) return window.firebaseDb;
    if (typeof getFirebaseInstance === 'function') {
        const instance = getFirebaseInstance();
        if (instance && instance.db) return instance.db;
    }
    if (window.db) return window.db;
    return null;
}

// ======================== التصدير للاستخدام العام ========================

window.addToCart = addToCartWithQuantity;
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.updateCartCount = updateCartCount;
window.updateCartDisplay = updateCartDisplay;
window.updateCartSummary = updateCartSummary;
window.saveCartToFirebase = saveCartToFirebase;
window.loadCartFromFirebase = loadCartFromFirebase;
window.buyNowDirect = buyNowDirect;

// تهيئة السلة عند التحميل
document.addEventListener('DOMContentLoaded', () => {
    console.log('🛒 تهيئة نظام السلة...');
    loadCartFromFirebase();
});

console.log('✅ cart-system.js المحسن loaded');