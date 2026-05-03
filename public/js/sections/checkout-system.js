// checkout-system.js - نظام الدفع والإيصالات (نسخة محسنة أمنياً تعتمد على المعاملات)

const FileValidator = {
    allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    maxFileSize: 5 * 1024 * 1024,
    validateImageFile: function(file) {
        if (!file) return { valid: false, error: 'لم يتم اختيار ملف' };
        if (!this.allowedImageTypes.includes(file.type.toLowerCase())) return { valid: false, error: 'نوع الملف غير مدعوم' };
        if (file.size > this.maxFileSize) return { valid: false, error: 'حجم الملف كبير جداً (الحد الأقصى 5MB)' };
        return { valid: true };
    }
};

let checkoutReceiptFile = null;

window.previewCheckoutReceipt = function(input) {
    if (!input || !input.files || !input.files[0]) return;
    const file = input.files[0];
    const validation = FileValidator.validateImageFile(file);
    if (!validation.valid) {
        if (window.adminUtils) window.adminUtils.showToast(validation.error, 'error');
        input.value = '';
        return;
    }
    checkoutReceiptFile = file;
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewImg = document.getElementById('checkoutReceiptImg');
        if (previewImg) previewImg.src = e.target.result;
        document.getElementById('checkoutUploadPlaceholder').style.display = 'none';
        document.getElementById('checkoutReceiptPreview').style.display = 'block';
        document.getElementById('receiptUploadLabel').style.display = 'none';
        updateCheckoutSummary();
    };
    reader.readAsDataURL(file);
};

window.removeCheckoutReceipt = function() {
    checkoutReceiptFile = null;
    document.getElementById('checkoutReceipt').value = '';
    document.getElementById('checkoutUploadPlaceholder').style.display = 'block';
    document.getElementById('checkoutReceiptPreview').style.display = 'none';
    document.getElementById('receiptUploadLabel').style.display = 'block';
    updateCheckoutSummary();
};

window.updateCheckoutSummary = function() {
    const checkoutItems = document.getElementById("checkoutItems");
    if (!checkoutItems) return;
    
    const itemsToDisplay = window.directPurchaseItem ? [window.directPurchaseItem] : (window.AppState ? window.AppState.cart : []);
    const subtotal = itemsToDisplay.reduce((total, item) => total + (Number(item.price) * Number(item.quantity)), 0);
    const shippingCost = subtotal < (window.AppState?.settings?.freeShippingLimit || 20000) ? (window.AppState?.settings?.shippingCost || 2000) : 0;
    const total = subtotal + shippingCost;
    
    checkoutItems.innerHTML = itemsToDisplay.map(item => `
        <div class="checkout-item">
            <img src="${item.image}" class="checkout-item-img" alt="${item.name}">
            <div class="checkout-item-info">
                <span class="checkout-item-name">${item.name}</span>
                <span class="checkout-item-price">${item.price} SDG</span>
            </div>
            <div class="checkout-item-qty-controls">
                <button class="checkout-item-qty-btn" onclick="updateCheckoutItemQty('${item.id}', -1)">-</button>
                <span class="checkout-item-qty-val">${item.quantity}</span>
                <button class="checkout-item-qty-btn" onclick="updateCheckoutItemQty('${item.id}', 1)">+</button>
            </div>
        </div>
    `).join("");
    
    document.getElementById('checkoutSubtotal').textContent = subtotal + ' SDG';
    document.getElementById('checkoutShipping').textContent = shippingCost + ' SDG';
    document.getElementById('checkoutTotal').textContent = total + ' SDG';
    
    const submitBtn = document.getElementById('submitOrderBtn');
    if (submitBtn) submitBtn.disabled = itemsToDisplay.length === 0 || !checkoutReceiptFile;
};

window.updateCheckoutItemQty = function(productId, change) {
    if (window.directPurchaseItem && window.directPurchaseItem.id === productId) {
        const newQty = window.directPurchaseItem.quantity + change;
        if (newQty >= 1) window.directPurchaseItem.quantity = newQty;
    } else if (window.AppState) {
        window.AppState.updateCartItemQuantity(productId, change);
    }
    updateCheckoutSummary();
};

window.submitCheckoutOrder = async function() {
    const phone = document.getElementById('checkoutPhone')?.value.trim();
    const address = document.getElementById('checkoutAddress')?.value.trim();
    const notes = document.getElementById('checkoutNotes')?.value.trim();

    if (!phone || !address) {
        window.adminUtils.showToast('يرجى إكمال البيانات المطلوبة', 'warning');
        return;
    }

    if (!checkoutReceiptFile) {
        window.adminUtils.showToast('يرجى رفع صورة الإيصال', 'warning');
        return;
    }

    const itemsToOrder = window.directPurchaseItem ? [window.directPurchaseItem] : (window.AppState ? window.AppState.cart : []);
    if (itemsToOrder.length === 0) return;

    const submitBtn = document.getElementById('submitOrderBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري المعالجة...';

    try {
        const { db, storage } = window.firebaseInstance;
        const { runTransaction, doc, collection, serverTimestamp, addDoc } = window.firebaseModules;

        // 1. رفع الإيصال أولاً
        const receiptUrl = await uploadCheckoutReceipt(checkoutReceiptFile);

        // 2. استخدام Transaction لضمان دقة رقم الطلب والمخزون
        await runTransaction(db, async (transaction) => {
            // أ. التحقق من المخزون لجميع المنتجات
            const productDocs = [];
            for (const item of itemsToOrder) {
                const pRef = doc(db, 'products', item.id);
                const pSnap = await transaction.get(pRef);
                if (!pSnap.exists()) throw new Error(`المنتج ${item.name} غير موجود`);
                if (pSnap.data().stock < item.quantity) throw new Error(`عذراً، المخزون غير كافٍ للمنتج: ${item.name}`);
                productDocs.push({ ref: pRef, newStock: pSnap.data().stock - item.quantity });
            }

            // ب. الحصول على رقم الطلب التالي
            const settingsRef = doc(db, 'settings', 'site_config');
            const settingsSnap = await transaction.get(settingsRef);
            let nextOrderNumber = 11001000;
            if (settingsSnap.exists() && settingsSnap.data().lastOrderNumber) {
                nextOrderNumber = settingsSnap.data().lastOrderNumber + 1;
            }

            // ج. تحديث المخزون ورقم الطلب
            productDocs.forEach(p => transaction.update(p.ref, { stock: p.newStock }));
            transaction.set(settingsRef, { lastOrderNumber: nextOrderNumber }, { merge: true });

            // د. تجهيز بيانات الطلب مع التحقق من صحة الأسعار
            // ملاحظة أمنية: في النظام المثالي، يجب جلب الأسعار من pSnap (الخادم) بدلاً من item.price (العميل)
            let calculatedSubtotal = 0;
            const verifiedItems = [];
            
            for (let i = 0; i < itemsToOrder.length; i++) {
                const item = itemsToOrder[i];
                const pSnap = await transaction.get(doc(db, 'products', item.id));
                const realPrice = pSnap.data().price;
                calculatedSubtotal += (realPrice * item.quantity);
                verifiedItems.push({
                    ...item,
                    price: realPrice // استخدام السعر الحقيقي من قاعدة البيانات
                });
            }

            const shipping = calculatedSubtotal < (window.AppState?.settings?.freeShippingLimit || 20000) ? (window.AppState?.settings?.shippingCost || 2000) : 0;
            const finalTotal = calculatedSubtotal + shipping;
            
            const orderData = {
                orderId: 'NO:' + nextOrderNumber,
                orderNumber: nextOrderNumber,
                userId: window.AppState?.user?.uid || 'guest',
                userName: window.AppState?.user?.name || 'مستخدم',
                phone, address, notes,
                items: verifiedItems,
                subtotal: calculatedSubtotal, 
                shippingCost: shipping, 
                total: finalTotal,
                receiptUrl, status: 'pending',
                clientCalculatedTotal: itemsToOrder.reduce((t, i) => t + (i.price * i.quantity), 0) + shipping, // للتتبع في حال التلاعب
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            // هـ. إضافة الطلب (خارج الـ transaction لأن addDoc لا يدعمها مباشرة، سنستخدم doc() مع set)
            const newOrderRef = doc(collection(db, 'orders'));
            transaction.set(newOrderRef, orderData);

            // و. تحديث بيانات المستخدم
            if (window.AppState?.user && !window.AppState.isGuest) {
                const userRef = doc(db, 'users', window.AppState.user.uid);
                transaction.update(userRef, { phone, address, cart: [] });
            }
        });

        window.adminUtils.showToast('تم إرسال الطلب بنجاح!', 'success');
        if (window.AppState) window.AppState.clearCart();
        window.directPurchaseItem = null;
        setTimeout(() => {
            if (window.showSection) window.showSection('my-orders');
            removeCheckoutReceipt();
        }, 1500);

    } catch (error) {
        console.error('Order Error:', error);
        window.adminUtils.showToast(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-check"></i> تأكيد الطلب';
    }
};

async function uploadCheckoutReceipt(file) {
    const { storage } = window.firebaseInstance;
    const { ref, uploadBytes, getDownloadURL } = window.firebaseModules;
    const fileName = `receipts/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
}
