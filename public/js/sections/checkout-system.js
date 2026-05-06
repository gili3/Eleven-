// checkout-system.js - نظام الدفع والإيصالات (نسخة محسنة أمنياً)

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

// دالة تعقيم آمنة (fallback إذا لم تكن SecurityCore متاحة)
function safeSanitize(str) {
    if (!str) return '';
    if (window.SecurityCore && typeof window.SecurityCore.sanitizeHTML === 'function') {
        return window.SecurityCore.sanitizeHTML(String(str));
    }
    // Fallback: إزالة الوسوم الخطرة
    return String(str)
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/on\w+='[^']*'/gi, '');
}

let checkoutReceiptFile = null;

window.previewCheckoutReceipt = function(input) {
    if (!input || !input.files || !input.files[0]) return;
    const file = input.files[0];
    const validation = FileValidator.validateImageFile(file);
    if (!validation.valid) {
        if (window.showToast) showToast(validation.error, 'error');
        input.value = '';
        return;
    }
    checkoutReceiptFile = file;
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewImg = document.getElementById('checkoutReceiptImg');
        if (previewImg) previewImg.src = e.target.result;
        const placeholder = document.getElementById('checkoutUploadPlaceholder');
        const preview = document.getElementById('checkoutReceiptPreview');
        const label = document.getElementById('receiptUploadLabel');
        if (placeholder) placeholder.style.display = 'none';
        if (preview) preview.style.display = 'block';
        if (label) label.style.display = 'none';
        updateCheckoutSummary();
    };
    reader.readAsDataURL(file);
};

window.removeCheckoutReceipt = function() {
    checkoutReceiptFile = null;
    const receiptInput = document.getElementById('checkoutReceipt');
    if (receiptInput) receiptInput.value = '';
    const placeholder = document.getElementById('checkoutUploadPlaceholder');
    const preview = document.getElementById('checkoutReceiptPreview');
    const label = document.getElementById('receiptUploadLabel');
    if (placeholder) placeholder.style.display = 'block';
    if (preview) preview.style.display = 'none';
    if (label) label.style.display = 'block';
    updateCheckoutSummary();
};

window.updateCheckoutSummary = function() {
    const checkoutItems = document.getElementById("checkoutItems");
    if (!checkoutItems) return;
    
    const itemsToDisplay = window.directPurchaseItem ? [window.directPurchaseItem] : (window.AppState ? window.AppState.cart : []);
    const subtotal = itemsToDisplay.reduce((total, item) => total + (Number(item.price) * Number(item.quantity)), 0);
    const freeShippingLimit = (window.AppState?.settings?.freeShippingLimit) || 20000;
    const shippingCostValue = (window.AppState?.settings?.shippingCost) || 2000;
    const shippingCost = subtotal < freeShippingLimit ? shippingCostValue : 0;
    const total = subtotal + shippingCost;
    
    checkoutItems.innerHTML = itemsToDisplay.map(item => `
        <div class="checkout-item">
            <img src="${safeSanitize(item.image)}" class="checkout-item-img" alt="${safeSanitize(item.name)}">
            <div class="checkout-item-info">
                <span class="checkout-item-name">${safeSanitize(item.name)}</span>
                <span class="checkout-item-price">${item.price} SDG</span>
            </div>
            <div class="checkout-item-qty-controls">
                <button class="checkout-item-qty-btn" onclick="updateCheckoutItemQty('${safeSanitize(item.id)}', -1)">-</button>
                <span class="checkout-item-qty-val">${item.quantity}</span>
                <button class="checkout-item-qty-btn" onclick="updateCheckoutItemQty('${safeSanitize(item.id)}', 1)">+</button>
            </div>
        </div>
    `).join("");
    
    const subtotalEl = document.getElementById('checkoutSubtotal');
    const shippingEl = document.getElementById('checkoutShipping');
    const totalEl = document.getElementById('checkoutTotal');
    
    if (subtotalEl) subtotalEl.textContent = subtotal + ' SDG';
    if (shippingEl) shippingEl.textContent = shippingCost + ' SDG';
    if (totalEl) totalEl.textContent = total + ' SDG';
    
    const submitBtn = document.getElementById('submitOrderBtn');
    if (submitBtn) submitBtn.disabled = itemsToDisplay.length === 0 || !checkoutReceiptFile;
};

window.updateCheckoutItemQty = function(productId, change) {
    if (window.directPurchaseItem && window.directPurchaseItem.id === productId) {
        const newQty = (window.directPurchaseItem.quantity || 1) + change;
        if (newQty >= 1) window.directPurchaseItem.quantity = newQty;
    } else if (window.AppState) {
        window.AppState.updateCartItemQuantity(productId, change);
    }
    updateCheckoutSummary();
};

window.submitCheckoutOrder = async function() {
    // ✅ تعقيم المدخلات قبل الاستخدام
    const phone = safeSanitize(document.getElementById('checkoutPhone')?.value.trim());
    const address = safeSanitize(document.getElementById('checkoutAddress')?.value.trim());
    const notes = safeSanitize(document.getElementById('checkoutNotes')?.value.trim());

    if (!phone || !address) {
        if (window.showToast) showToast('يرجى إكمال البيانات المطلوبة', 'warning');
        return;
    }

    if (!checkoutReceiptFile) {
        if (window.showToast) showToast('يرجى رفع صورة الإيصال', 'warning');
        return;
    }

    const itemsToOrder = window.directPurchaseItem ? [window.directPurchaseItem] : (window.AppState ? window.AppState.cart : []);
    if (itemsToOrder.length === 0) return;

    const submitBtn = document.getElementById('submitOrderBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري المعالجة...';
    }

    try {
        const { db, storage } = window.firebaseInstance || {};
        const { doc, collection, serverTimestamp, runTransaction } = window.firebaseModules;

        if (!db || !storage) {
            throw new Error('قاعدة البيانات غير متاحة');
        }

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
                if ((pSnap.data().stock || 0) < (item.quantity || 1)) {
                    throw new Error(`عذراً، المخزون غير كافٍ للمنتج: ${item.name}`);
                }
                productDocs.push({ ref: pRef, newStock: (pSnap.data().stock || 0) - (item.quantity || 1) });
            }

            // ب. الحصول على رقم الطلب التالي
            const settingsRef = doc(db, 'settings', 'site_config');
            const settingsSnap = await transaction.get(settingsRef);
            let nextOrderNumber = 11001000;
            if (settingsSnap.exists() && settingsSnap.data().lastOrderNumber) {
                nextOrderNumber = (settingsSnap.data().lastOrderNumber || 0) + 1;
            }

            // ج. تحديث المخزون ورقم الطلب
            productDocs.forEach(p => transaction.update(p.ref, { stock: p.newStock }));
            transaction.set(settingsRef, { lastOrderNumber: nextOrderNumber }, { merge: true });

            // د. تجهيز بيانات الطلب مع التحقق من صحة الأسعار
            let calculatedSubtotal = 0;
            const verifiedItems = [];
            
            for (let i = 0; i < itemsToOrder.length; i++) {
                const item = itemsToOrder[i];
                const pSnap = await transaction.get(doc(db, 'products', item.id));
                const realPrice = parseFloat(pSnap.data().price) || 0;
                calculatedSubtotal += realPrice * (item.quantity || 1);
                verifiedItems.push({
                    id: item.id,
                    name: safeSanitize(item.name),
                    price: realPrice,
                    quantity: item.quantity || 1,
                    image: item.image || ''
                });
            }

            const freeShippingLimit = (window.AppState?.settings?.freeShippingLimit) || 20000;
            const shippingCostValue = (window.AppState?.settings?.shippingCost) || 2000;
            const shipping = calculatedSubtotal < freeShippingLimit ? shippingCostValue : 0;
            const finalTotal = calculatedSubtotal + shipping;
            
            const orderData = {
                orderId: 'NO:' + nextOrderNumber,
                orderNumber: nextOrderNumber,
                userId: (window.AppState?.user?.uid) || 'guest',
                userName: safeSanitize((window.AppState?.user?.displayName || window.AppState?.user?.name) || 'مستخدم'),
                phone: safeSanitize(phone),
                address: safeSanitize(address),
                notes: safeSanitize(notes),
                items: verifiedItems,
                subtotal: calculatedSubtotal, 
                shippingCost: shipping, 
                total: finalTotal,
                receiptUrl: receiptUrl,
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            // هـ. إضافة الطلب
            const newOrderRef = doc(collection(db, 'orders'));
            transaction.set(newOrderRef, orderData);

            // و. تحديث بيانات المستخدم
            if (window.AppState?.user && !window.AppState.isGuest) {
                const userRef = doc(db, 'users', window.AppState.user.uid);
                transaction.update(userRef, { 
                    phone: safeSanitize(phone), 
                    address: safeSanitize(address), 
                    cart: [] 
                });
            }
        });

        if (window.showToast) showToast('تم إرسال الطلب بنجاح!', 'success');
        if (window.AppState) window.AppState.clearCart();
        window.directPurchaseItem = null;
        setTimeout(() => {
            if (window.showSection) window.showSection('my-orders');
            window.removeCheckoutReceipt();
        }, 1500);

    } catch (error) {
        console.error('Order Error:', error);
        if (window.showToast) showToast(error.message || 'حدث خطأ في إرسال الطلب', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check"></i> تأكيد الطلب';
        }
    }
};

async function uploadCheckoutReceipt(file) {
    const { storage } = window.firebaseInstance || {};
    const { ref, uploadBytes, getDownloadURL } = window.firebaseModules;
    if (!storage) throw new Error('خدمة التخزين غير متاحة');
    
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.\u0600-\u06FF_-]/g, '_');
    const fileName = `receipts/${Date.now()}_${safeFileName}`;
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
}