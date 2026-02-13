// cart-system.js - إدارة سلة التسوق المحسنة
// ======================== إدارة السلة ========================

// تعريف المتغيرات عالمياً لضمان الوصول إليها
if (typeof window.cartItems === 'undefined') window.cartItems = [];
if (typeof window.directPurchaseItem === 'undefined') window.directPurchaseItem = null;

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
            if (totalItems > 0) {
                element.style.display = 'flex';
            } else {
                element.style.display = 'none';
            }
        }
    });
}

function addToCartWithQuantity(productId, quantity = 1) {
    if (typeof allProducts === 'undefined') {
        console.error('allProducts is not defined');
        if (typeof showToast === 'function') showToast('حدث خطأ في النظام، يرجى المحاولة لاحقاً', 'error');
        return;
    }
    
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        if (typeof showToast === 'function') showToast('المنتج غير موجود', 'error');
        return;
    }
    
    if (product.stock <= 0) {
        if (typeof showToast === 'function') showToast('المنتج غير متوفر في المخزون', 'warning');
        return;
    }
    
    if (quantity > product.stock) {
        if (typeof showToast === 'function') showToast(`الكمية المطلوبة غير متوفرة. المخزون الحالي: ${product.stock}`, 'warning');
        return;
    }
    
    const existingItem = window.cartItems.find(item => item.id === productId);
    
    if (existingItem) {
        if (existingItem.quantity + quantity > product.stock) {
            if (typeof showToast === 'function') showToast(`لا توجد كمية كافية في المخزون. المتاح: ${product.stock - existingItem.quantity}`, 'warning');
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
    
    saveCartToFirebase();
    updateCartCount();
    
    const cartSection = document.getElementById('cart');
    if (cartSection && cartSection.classList.contains('active')) {
        updateCartDisplay();
    }
    
    if (typeof showToast === 'function') showToast(`تمت إضافة ${quantity} من المنتج إلى السلة`, 'success');
}

async function saveCartToFirebase() {
    try {
        // حفظ في localStorage كنسخة احتياطية وللضيوف
        localStorage.setItem('eleven_cart', JSON.stringify(window.cartItems || []));
        
        // التحقق من وجود المستخدم وقاعدة البيانات
        if (typeof currentUser === 'undefined' || !currentUser || (typeof isGuest !== 'undefined' && isGuest)) {
            console.log('تم حفظ السلة محلياً (ضيف)');
            return;
        }
        
        const db = window.firebaseDb || (typeof getFirebaseInstance === 'function' ? getFirebaseInstance().db : null);
        if (!db || !window.firebaseModules) return;
        
        const userRef = window.firebaseModules.doc(db, 'users', currentUser.uid);
        await window.firebaseModules.updateDoc(userRef, {
            cart: window.cartItems || [],
            updatedAt: window.firebaseModules.serverTimestamp()
        });
        console.log('تم حفظ السلة في Firebase');
    } catch (error) {
        console.error('خطأ في حفظ السلة:', error);
    }
}

async function loadCartFromFirebase() {
    try {
        // تحميل من localStorage أولاً للسرعة وللضيوف
        const localCart = localStorage.getItem('eleven_cart');
        if (localCart) {
            window.cartItems = JSON.parse(localCart);
            updateCartCount();
        }
        
        if (typeof currentUser === 'undefined' || !currentUser || (typeof isGuest !== 'undefined' && isGuest)) {
            return;
        }
        
        const db = window.firebaseDb || (typeof getFirebaseInstance === 'function' ? getFirebaseInstance().db : null);
        if (!db || !window.firebaseModules) return;
        
        const userRef = window.firebaseModules.doc(db, 'users', currentUser.uid);
        const userSnap = await window.firebaseModules.getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.cart && Array.isArray(userData.cart)) {
                window.cartItems = userData.cart;
                updateCartCount();
                // تحديث localStorage بالبيانات القادمة من Firebase
                localStorage.setItem('eleven_cart', JSON.stringify(window.cartItems));
                console.log('تم تحميل السلة من Firebase');
            }
        }
    } catch (error) {
        console.error('خطأ في تحميل السلة:', error);
    }
}

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
    
    const currency = typeof siteCurrency !== 'undefined' ? siteCurrency : 'SDG';
    
    cartItemsElement.innerHTML = items.map(item => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        
        return `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-image">
                    <img src="${item.image || 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png'}" alt="${item.name}" onerror="this.src='https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png'">
                </div>
                <div class="cart-item-details">
                    <h3 class="cart-item-title">${item.name}</h3>
                    <p class="cart-item-price">${currency} ${typeof formatNumber === 'function' ? formatNumber(price) : price}</p>
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

function updateCartQuantity(productId, change) {
    const isDirect = !!window.directPurchaseItem;
    const item = isDirect ? (window.directPurchaseItem.id === productId ? window.directPurchaseItem : null) : window.cartItems.find(i => i.id === productId);
    
    if (!item) return;
    
    const product = typeof allProducts !== 'undefined' ? allProducts.find(p => p.id === productId) : null;
    const newQuantity = (parseInt(item.quantity) || 1) + change;
    
    if (newQuantity < 1) {
        if (!isDirect) removeFromCart(productId);
        return;
    }
    
    const availableStock = product ? product.stock : (item.stock || 99);
    if (newQuantity > availableStock) {
        if (typeof showToast === 'function') showToast('لا توجد كمية كافية في المخزون', 'warning');
        return;
    }
    
    item.quantity = newQuantity;
    
    if (!isDirect) {
        saveCartToFirebase();
    }
    
    updateCartCount();
    updateCartDisplay();
}

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
    if (typeof showToast === 'function') showToast('تم إزالة المنتج من السلة', 'info');
}

function updateCartSummary() {
    const isDirect = !!window.directPurchaseItem;
    const itemsToCalculate = isDirect ? [window.directPurchaseItem] : (window.cartItems || []);
    const subtotal = itemsToCalculate.reduce((total, item) => total + (parseFloat(item.price || 0) * parseInt(item.quantity || 0)), 0);
    
    const settings = typeof siteSettings !== 'undefined' ? siteSettings : { shippingCost: 2000, freeShippingLimit: 20000 };
    const shippingCost = parseFloat(settings.shippingCost) || 0;
    const freeShippingLimit = parseFloat(settings.freeShippingLimit) || 0;
    const currency = typeof siteCurrency !== 'undefined' ? siteCurrency : 'SDG';
    
    let finalShippingCost = 0;
    if (subtotal > 0 && (freeShippingLimit === 0 || subtotal < freeShippingLimit)) {
        finalShippingCost = shippingCost;
    }
    
    const total = subtotal + finalShippingCost;
    
    const subtotalElement = document.getElementById('cartSubtotal');
    const shippingElement = document.getElementById('cartShipping');
    const totalElement = document.getElementById('cartTotal');
    const shippingNoteElement = document.getElementById('shippingNote');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (subtotalElement) subtotalElement.textContent = `${typeof formatNumber === 'function' ? formatNumber(subtotal) : subtotal} ${currency}`;
    if (shippingElement) shippingElement.textContent = `${typeof formatNumber === 'function' ? formatNumber(finalShippingCost) : finalShippingCost} ${currency}`;
    if (totalElement) totalElement.textContent = `${typeof formatNumber === 'function' ? formatNumber(total) : total} ${currency}`;
    
    if (shippingNoteElement) {
        if (subtotal > 0 && freeShippingLimit > 0 && subtotal < freeShippingLimit) {
            const remaining = freeShippingLimit - subtotal;
            shippingNoteElement.innerHTML = `
                <i class="fas fa-truck"></i>
                أضف ${typeof formatNumber === 'function' ? formatNumber(remaining) : remaining} ${currency} أخرى للحصول على شحن مجاني
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

function clearCart() {
    if (!window.directPurchaseItem && (window.cartItems || []).length === 0) return;
    
    if (confirm('هل تريد تفريغ السلة بالكامل؟')) {
        window.cartItems = [];
        window.directPurchaseItem = null;
        saveCartToFirebase();
        updateCartCount();
        updateCartDisplay();
        if (typeof showToast === 'function') showToast('تم تفريغ السلة', 'info');
    }
}

// ======================== دوال الشراء المباشر ========================

function buyNowDirect(productId, quantity = 1) {
    if (typeof allProducts === 'undefined') {
        if (typeof showToast === 'function') showToast('حدث خطأ، يرجى إعادة تحميل الصفحة', 'error');
        return;
    }

    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        if (typeof showToast === 'function') showToast('المنتج غير موجود', 'error');
        return;
    }
    
    if (product.stock <= 0) {
        if (typeof showToast === 'function') showToast('المنتج غير متوفر في المخزون', 'warning');
        return;
    }
    
    if (quantity > product.stock) {
        if (typeof showToast === 'function') showToast(`الكمية المطلوبة غير متوفرة. المخزون الحالي: ${product.stock}`, 'warning');
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
        // إذا لم تكن دالة showSection متاحة، نحاول فتح صفحة الدفع بطريقة أخرى
        const checkoutSection = document.getElementById('checkout');
        if (checkoutSection) {
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            checkoutSection.classList.add('active');
        }
    }
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
    loadCartFromFirebase();
});

console.log('✅ cart-system.js loaded and improved');
