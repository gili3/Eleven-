// cart-system.js - إدارة سلة التسوق
// ======================== إدارة السلة ========================

function updateCartCount() {
    let totalItems = 0;
    
    if (directPurchaseItem) {
        totalItems = directPurchaseItem.quantity;
    } else {
        totalItems = (cartItems || []).reduce((total, item) => total + (item.quantity || 0), 0);
    }
    
    const cartCountElements = document.querySelectorAll('.cart-count');
    
    cartCountElements.forEach(element => {
        if (element) {
            element.textContent = totalItems;
        }
    });
}

function addToCartWithQuantity(productId, quantity = 1) {
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
    
    const existingItem = cartItems.find(item => item.id === productId);
    
    if (existingItem) {
        if (existingItem.quantity + quantity > product.stock) {
            if (typeof showToast === 'function') showToast(`لا توجد كمية كافية في المخزون. المتاح: ${product.stock - existingItem.quantity}`, 'warning');
            return;
        }
        existingItem.quantity += quantity;
    } else {
        if (!cartItems) cartItems = [];
        cartItems.push({
            id: product.id,
            name: product.name,
            price: product.price,
            originalPrice: product.originalPrice,
            image: product.image,
            quantity: quantity,
            stock: product.stock
        });
    }
    
    if (typeof saveCartToFirebase === 'function') saveCartToFirebase();
    updateCartCount();
    
    const cartSection = document.getElementById('cart');
    if (cartSection && cartSection.classList.contains('active')) {
        if (typeof updateCartDisplay === 'function') updateCartDisplay();
    }
    
    if (typeof showToast === 'function') showToast(`تمت إضافة ${quantity} من المنتج إلى السلة`, 'success');
}

async function saveCartToFirebase() {
    try {
        if (!currentUser || isGuest) {
            console.log('لا يمكن حفظ السلة للضيف');
            return;
        }
        const userRef = window.firebaseModules.doc(db, 'users', currentUser.uid);
        await window.firebaseModules.updateDoc(userRef, {
            cart: cartItems,
            updatedAt: window.firebaseModules.serverTimestamp()
        });
        console.log('تم حفظ السلة في Firebase');
    } catch (error) {
        console.error('خطأ في حفظ السلة:', error);
    }
}

async function loadCartFromFirebase() {
    try {
        if (!currentUser || isGuest) {
            console.log('لا يمكن تحميل السلة للضيف');
            return;
        }
        const userRef = window.firebaseModules.doc(db, 'users', currentUser.uid);
        const userSnap = await window.firebaseModules.getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data();
            cartItems = userData.cart || [];
            updateCartCount();
            console.log('تم تحميل السلة من Firebase');
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
    
    if (directPurchaseItem ? false : cartItems.length === 0) {
        cartItemsElement.style.display = 'none';
        emptyCartMessage.style.display = 'block';
        if (cartSummary) cartSummary.style.display = 'none';
        return;
    }
    
    cartItemsElement.style.display = 'flex';
    cartItemsElement.style.flexDirection = 'column';
    emptyCartMessage.style.display = 'none';
    if (cartSummary) cartSummary.style.display = 'block';
    
    const itemsToShow = directPurchaseItem ? [directPurchaseItem] : cartItems;
    
    cartItemsElement.innerHTML = itemsToShow.map(item => {
        const totalPrice = item.price * item.quantity;
        
        return `
            <div class="cart-item-compact">
                <div class="cart-item-right">
                    <div class="cart-item-image-compact">
                        <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/100x100?text=صورة'">
                    </div>
                    <div class="cart-item-info-compact">
                        <h3 class="cart-item-title-compact">${item.name}</h3>
                        <p class="cart-item-price-compact">${siteCurrency} ${formatNumber(item.price)}</p>
                    </div>
                </div>
                <div class="cart-item-left">
                    <div class="quantity-controls-compact">
                        <button class="qty-btn-compact" onclick="updateCartQuantity('${item.id}', 1)">+</button>
                        <span class="qty-val-compact">${item.quantity}</span>
                        <button class="qty-btn-compact" onclick="updateCartQuantity('${item.id}', -1)">-</button>
                    </div>
                    <div class="cart-item-total-compact">${formatNumber(totalPrice)}</div>
                    <button class="remove-item-btn-compact" onclick="removeFromCart('${item.id}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    if (typeof updateCartSummary === 'function') updateCartSummary();
}

function updateCartQuantity(productId, change) {
    const item = cartItems.find(item => item.id === productId);
    if (!item) return;
    
    const product = allProducts.find(p => p.id === productId);
    const newQuantity = item.quantity + change;
    
    if (newQuantity < 1) {
        removeFromCart(productId);
        return;
    }
    
    const availableStock = product ? product.stock : (item.stock || 99);
    if (newQuantity > availableStock) {
        if (typeof showToast === 'function') showToast('لا توجد كمية كافية في المخزون', 'warning');
        return;
    }
    
    item.quantity = newQuantity;
    if (typeof saveCartToFirebase === 'function') saveCartToFirebase();
    updateCartCount();
    if (typeof updateCartDisplay === 'function') updateCartDisplay();
}

function removeFromCart(productId) {
    if (!confirm('هل تريد إزالة هذا المنتج من السلة؟')) return;
    
    if (directPurchaseItem && directPurchaseItem.id === productId) {
        directPurchaseItem = null;
    } else {
        cartItems = (cartItems || []).filter(item => item.id !== productId);
    }
    
    if (typeof saveCartToFirebase === 'function') saveCartToFirebase();
    updateCartCount();
    if (typeof updateCartDisplay === 'function') updateCartDisplay();
    if (typeof showToast === 'function') showToast('تم إزالة المنتج من السلة', 'info');
}

function updateCartSummary() {
    const itemsToCalculate = directPurchaseItem ? [directPurchaseItem] : cartItems;
    const subtotal = itemsToCalculate.reduce((total, item) => total + (Number(item.price) * Number(item.quantity)), 0);
    const shippingCost = siteSettings.shippingCost || 15;
    const freeShippingLimit = siteSettings.freeShippingLimit || 200;
    
    let finalShippingCost = 0;
    if (subtotal > 0 && subtotal < freeShippingLimit) {
        finalShippingCost = shippingCost;
    }
    
    const total = subtotal + finalShippingCost;
    
    const subtotalElement = document.getElementById('cartSubtotal');
    const shippingElement = document.getElementById('cartShipping');
    const totalElement = document.getElementById('cartTotal');
    const shippingNoteElement = document.getElementById('shippingNote');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (subtotalElement) subtotalElement.textContent = `${formatNumber(subtotal)} ${siteCurrency}`;
    if (shippingElement) shippingElement.textContent = `${formatNumber(finalShippingCost)} ${siteCurrency}`;
    if (totalElement) totalElement.textContent = `${formatNumber(total)} ${siteCurrency}`;
    
    if (shippingNoteElement) {
        if (subtotal > 0 && subtotal < freeShippingLimit) {
            const remaining = Number(freeShippingLimit) - Number(subtotal);
            shippingNoteElement.innerHTML = `
                <i class="fas fa-truck"></i>
                أضف ${remaining} ${siteCurrency} أخرى للحصول على شحن مجاني
            `;
        } else if (subtotal >= freeShippingLimit) {
            shippingNoteElement.innerHTML = `
                <i class="fas fa-check-circle"></i>
                الشحن مجاني
            `;
        } else {
            shippingNoteElement.innerHTML = '';
        }
    }
    
    if (checkoutBtn) {
        checkoutBtn.disabled = subtotal === 0;
    }
}

function clearCart() {
    if (directPurchaseItem ? false : cartItems.length === 0) return;
    
    if (confirm('هل تريد تفريغ السلة بالكامل؟')) {
        cartItems = [];
        if (typeof saveCartToFirebase === 'function') saveCartToFirebase();
        updateCartCount();
        if (typeof updateCartDisplay === 'function') updateCartDisplay();
        if (typeof showToast === 'function') showToast('تم تفريغ السلة', 'info');
    }
}

// ======================== دوال الشراء المباشر ========================

function buyNowDirect(productId, quantity = 1) {
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
    
    directPurchaseItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: quantity,
        image: product.image
    };
    
    updateCartCount();
    if (typeof showSection === 'function') showSection("checkout");
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

console.log('✅ cart-system.js loaded');