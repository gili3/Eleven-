// checkout-system.js - نظام الدفع والإيصالات (نسخة محسنة أمنياً)
// ======================== نظام الدفع والإيصال ========================

// دوال مساعدة للتحقق من الملفات
const FileValidator = {
    allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    maxFileSize: 5 * 1024 * 1024,
    
    isValidImageType: function(file) {
        if (!file || !file.type) return false;
        return this.allowedImageTypes.includes(file.type.toLowerCase());
    },
    
    isValidFileSize: function(file) {
        if (!file || !file.size) return false;
        return file.size <= this.maxFileSize;
    },
    
    isValidImageExtension: function(filename) {
        if (!filename) return false;
        const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        return validExtensions.includes(ext);
    },
    
    validateImageFile: function(file) {
        if (!file) {
            return { valid: false, error: 'لم يتم اختيار ملف' };
        }
        
        if (!this.isValidImageType(file)) {
            return { valid: false, error: 'نوع الملف غير مدعوم (فقط JPG, PNG, GIF, WEBP)' };
        }
        
        if (!this.isValidImageExtension(file.name)) {
            return { valid: false, error: 'امتداد الملف غير صحيح' };
        }
        
        if (!this.isValidFileSize(file)) {
            return { valid: false, error: 'حجم الملف كبير جداً (الحد الأقصى 5MB)' };
        }
        
        return { valid: true };
    }
};

let checkoutReceiptFile = null;

function previewCheckoutReceipt(input) {
    if (!input || !input.files || !input.files[0]) return;
    
    const file = input.files[0];
    
    const validation = FileValidator.validateImageFile(file);
    if (!validation.valid) {
        if (typeof showToast === 'function') showToast(validation.error, 'error');
        input.value = '';
        return;
    }
    
    checkoutReceiptFile = file;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewImg = document.getElementById('checkoutReceiptImg');
        const placeholder = document.getElementById('checkoutUploadPlaceholder');
        const previewContainer = document.getElementById('checkoutReceiptPreview');
        const uploadLabel = document.getElementById('receiptUploadLabel');
        
        if (previewImg) previewImg.src = e.target.result;
        if (placeholder) placeholder.style.display = 'none';
        if (previewContainer) previewContainer.style.display = 'block';
        if (uploadLabel) uploadLabel.style.display = 'none';
        
        if (typeof updateCheckoutSummary === 'function') updateCheckoutSummary();
        if (typeof showToast === 'function') showToast('تم اختيار الإيصال بنجاح', 'success');
    };
    reader.readAsDataURL(file);
}

function removeCheckoutReceipt() {
    checkoutReceiptFile = null;
    const input = document.getElementById('checkoutReceipt');
    const placeholder = document.getElementById('checkoutUploadPlaceholder');
    const previewContainer = document.getElementById('checkoutReceiptPreview');
    const uploadLabel = document.getElementById('receiptUploadLabel');
    
    if (input) input.value = '';
    if (placeholder) placeholder.style.display = 'block';
    if (previewContainer) previewContainer.style.display = 'none';
    if (uploadLabel) uploadLabel.style.display = 'block';
    
    if (typeof updateCheckoutSummary === 'function') updateCheckoutSummary();
}

function updateCheckoutSummary() {
    const checkoutItems = document.getElementById("checkoutItems");
    if (!checkoutItems) return;
    
    const itemsToDisplay = window.directPurchaseItem ? [window.directPurchaseItem] : (window.cartItems || []);
    const subtotal = itemsToDisplay.reduce((total, item) => total + (Number(item.price) * Number(item.quantity)), 0);
    const shippingCost = subtotal < (window.siteSettings?.freeShippingLimit || 20000) ? (window.siteSettings?.shippingCost || 2000) : 0;
    const total = subtotal + shippingCost;
    
    checkoutItems.innerHTML = itemsToDisplay.map(item => {
        const safeName = (window.SecurityCore && window.SecurityCore.sanitizeHTML) 
            ? window.SecurityCore.sanitizeHTML(item.name) 
            : (typeof window.sanitizeHTML === 'function' ? window.sanitizeHTML(item.name) : item.name);
        const safeImage = (window.SecurityCore && window.SecurityCore.sanitizeHTML) 
            ? window.SecurityCore.sanitizeHTML(item.image) 
            : (typeof window.sanitizeHTML === 'function' ? window.sanitizeHTML(item.image) : item.image);
        
        return `
            <div class="checkout-item">
                <img src="${safeImage}" class="checkout-item-img" alt="${safeName}">
                <div class="checkout-item-info">
                    <span class="checkout-item-name">${safeName}</span>
                    <span class="checkout-item-price">${formatNumber(item.price)} SDG</span>
                </div>
                <div class="checkout-item-qty-controls">
                    <button class="checkout-item-qty-btn" onclick="updateCheckoutItemQty('${item.id}', -1)">-</button>
                    <span class="checkout-item-qty-val">${item.quantity}</span>
                    <button class="checkout-item-qty-btn" onclick="updateCheckoutItemQty('${item.id}', 1)">+</button>
                </div>
            </div>
        `;
    }).join("");
    
    if (typeof safeElementUpdate === 'function') {
        safeElementUpdate('checkoutSubtotal', formatNumber(subtotal) + ' SDG');
        safeElementUpdate('checkoutShipping', formatNumber(shippingCost) + ' SDG');
        safeElementUpdate('checkoutTotal', formatNumber(total) + ' SDG');
        safeElementUpdate('checkoutTotalBtn', formatNumber(total));
    }
    
    const submitOrderBtn = document.getElementById('submitOrderBtn');
    if (submitOrderBtn) {
        submitOrderBtn.disabled = (window.directPurchaseItem ? false : (window.cartItems || []).length === 0) || !checkoutReceiptFile;
    }
    
    if (window.siteSettings?.bankName && typeof safeElementUpdate === 'function') {
        safeElementUpdate('checkoutBankName', window.siteSettings.bankName);
    }
    if (window.siteSettings?.bankAccount && typeof safeElementUpdate === 'function') {
        safeElementUpdate('checkoutBankAccount', window.siteSettings.bankAccount);
    }
    if (window.siteSettings?.bankAccountName && typeof safeElementUpdate === 'function') {
        safeElementUpdate('checkoutBankAccountName', window.siteSettings.bankAccountName);
    }
}

function updateCheckoutItemQty(productId, change) {
    const product = typeof window.allProducts !== 'undefined' ? window.allProducts.find(p => p.id === productId) : null;
    
    if (window.directPurchaseItem && window.directPurchaseItem.id === productId) {
        const newQty = window.directPurchaseItem.quantity + change;
        if (newQty < 1) return;
        
        const availableStock = product ? product.stock : (window.directPurchaseItem.stock || 99);
        if (newQty > availableStock) {
            if (typeof showToast === 'function') showToast('لا توجد كمية كافية في المخزون', 'warning');
            return;
        }
        window.directPurchaseItem.quantity = newQty;
    } else {
        const item = window.cartItems.find(i => i.id === productId);
        if (item) {
            const newQty = item.quantity + change;
            if (newQty < 1) {
                if (typeof removeFromCart === 'function') removeFromCart(productId);
                if (window.cartItems.length === 0) {
                    if (typeof showSection === 'function') showSection('cart');
                    return;
                }
            } else {
                const availableStock = product ? product.stock : (item.stock || 99);
                if (newQty > availableStock) {
                    if (typeof showToast === 'function') showToast('لا توجد كمية كافية في المخزون', 'warning');
                    return;
                }
                item.quantity = newQty;
                if (typeof saveCartToFirebase === 'function') saveCartToFirebase();
                if (typeof updateCartCount === 'function') updateCartCount();
            }
        }
    }
    if (typeof updateCheckoutSummary === 'function') updateCheckoutSummary();
}

function enableDataEdit() {
    const phoneInput = document.getElementById('orderPhone');
    const addressInput = document.getElementById('orderAddress');
    const editBtn = document.getElementById('editDataBtn');
    
    if (phoneInput) {
        phoneInput.readOnly = false;
        phoneInput.focus();
    }
    if (addressInput) addressInput.readOnly = false;
    if (editBtn) editBtn.style.display = 'none';
}

async function submitCheckoutOrder() {
    const phoneInput = document.getElementById('checkoutPhone');
    const addressInput = document.getElementById('checkoutAddress');
    const notesInput = document.getElementById('checkoutNotes');

    let phone = phoneInput ? phoneInput.value.trim() : '';
    let address = addressInput ? addressInput.value.trim() : '';
    let notes = notesInput ? notesInput.value.trim() : '';
    
    if (window.SecurityCore && window.SecurityCore.sanitizeHTML) {
        address = window.SecurityCore.sanitizeHTML(address);
        notes = window.SecurityCore.sanitizeHTML(notes);
    }
    
    if (!phone) {
        if (typeof showToast === 'function') showToast('يرجى إدخال رقم الهاتف', 'warning');
        if (phoneInput) phoneInput.focus();
        return;
    }

    if (!isValidPhone(phone)) {
        if (typeof showToast === 'function') showToast('يرجى إدخال رقم هاتف صحيح', 'warning');
        if (phoneInput) phoneInput.focus();
        return;
    }

    if (window.AuthSecurity && window.AuthSecurity.encryptData) {
        const encryptedPhone = window.AuthSecurity.encryptData(phone);
        const encryptedAddress = window.AuthSecurity.encryptData(address);
        if (encryptedPhone) localStorage.setItem('_ph', encryptedPhone);
        if (encryptedAddress) localStorage.setItem('_ad', encryptedAddress);
    } else {
        localStorage.setItem('userPhone', phone);
        localStorage.setItem('userAddress', address);
    }

    phone = formatSudanPhone(phone);
    
    if (!checkoutReceiptFile) {
        if (typeof showToast === 'function') showToast('يرجى رفع صورة الإيصال', 'warning');
        return;
    }
    
    if (!window.directPurchaseItem && (!window.cartItems || window.cartItems.length === 0)) {
        if (typeof showToast === 'function') showToast('السلة فارغة', 'warning');
        return;
    }
    
    const submitBtn = document.getElementById('submitOrderBtn');
    if (!submitBtn) {
        if (typeof showToast === 'function') showToast('زر التأكيد غير موجود', 'error');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري إرسال الطلب...';
    
    try {
        const db = getFirebaseReference();
        if (!db || !window.firebaseModules) {
            throw new Error('❌ Firebase غير مهيأ');
        }

        const itemsToOrder = window.directPurchaseItem ? [window.directPurchaseItem] : window.cartItems;
        
        // التحقق من المخزون مرة أخرى قبل إنشاء الطلب
        for (const item of itemsToOrder) {
            const productRef = window.firebaseModules.doc(db, 'products', item.id);
            const productDoc = await window.firebaseModules.getDoc(productRef);
            
            if (!productDoc.exists()) {
                throw new Error(`المنتج ${item.name} غير موجود`);
            }
            
            const currentStock = productDoc.data().stock || 0;
            if (currentStock < item.quantity) {
                throw new Error(`المنتج ${item.name} لا يتوفر منه سوى ${currentStock}`);
            }
        }

        const subtotal = itemsToOrder.reduce((total, item) => total + (Number(item.price) * Number(item.quantity)), 0);
        const shippingCost = subtotal < (window.siteSettings?.freeShippingLimit || 200) ? (window.siteSettings?.shippingCost || 15) : 0;
        const total = subtotal + shippingCost;
        
        let receiptUrl = '';
        if (checkoutReceiptFile) {
            try {
                receiptUrl = await uploadCheckoutReceipt(checkoutReceiptFile);
                if (!receiptUrl) {
                    throw new Error('فشل رفع الإيصال');
                }
            } catch (uploadError) {
                console.error('خطأ في رفع الإيصال:', uploadError);
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-check"></i> تأكيد الطلب';
                if (typeof showToast === 'function') showToast('فشل رفع صورة الإيصال. يرجى المحاولة مجدداً', 'error');
                return;
            }
        }
        
        const settingsRef = window.firebaseModules.doc(db, 'settings', 'site_config');
        const settingsDoc = await window.firebaseModules.getDoc(settingsRef);
        let nextOrderNumber = 11001000;
        
        if (settingsDoc.exists() && settingsDoc.data().lastOrderNumber) {
            nextOrderNumber = settingsDoc.data().lastOrderNumber + 1;
        }
        
        await window.firebaseModules.updateDoc(settingsRef, {
            lastOrderNumber: nextOrderNumber
        });

        const orderId = 'NO:' + nextOrderNumber;
        
        const orderData = {
            orderId: orderId,
            orderNumber: nextOrderNumber,
            userId: window.currentUser?.uid || 'guest',
            userName: window.currentUser?.displayName || 'مستخدم',
            userEmail: window.currentUser?.email || '',
            phone: phone,
            address: address,
            notes: notes,
            items: itemsToOrder.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image: item.image,
                total: item.price * item.quantity
            })),
            subtotal: subtotal,
            shippingCost: shippingCost,
            total: total,
            receiptUrl: receiptUrl,
            status: 'pending',
            createdAt: window.firebaseModules.serverTimestamp(),
            updatedAt: window.firebaseModules.serverTimestamp()
        };
        
        const ordersRef = window.firebaseModules.collection(db, 'orders');
        await window.firebaseModules.addDoc(ordersRef, orderData);
        
        // الخصم من المخزون
        for (const item of itemsToOrder) {
            const productRef = window.firebaseModules.doc(db, 'products', item.id);
            const productDoc = await window.firebaseModules.getDoc(productRef);
            
            if (productDoc.exists()) {
                const currentStock = productDoc.data().stock || 0;
                const newStock = Math.max(0, currentStock - item.quantity);
                
                await window.firebaseModules.updateDoc(productRef, {
                    stock: newStock,
                    isActive: newStock > 0
                });
                
                console.log(`📦 تم تحديث مخزون المنتج ${item.name}: ${newStock} (نشط: ${newStock > 0})`);
            }
        }
        
        if (window.currentUser && !window.isGuest) {
            const userRef = window.firebaseModules.doc(db, 'users', window.currentUser.uid);
            await window.firebaseModules.updateDoc(userRef, {
                phone: phone,
                address: address,
                cart: []
            });
        }
        
        if (window.currentUser) {
            window.currentUser.phone = phone;
            window.currentUser.address = address;
            sessionStorage.setItem('currentUser', JSON.stringify(window.currentUser));
            if (typeof updateUserProfile === 'function') updateUserProfile();
        }

        window.cartItems = [];
        window.directPurchaseItem = null;
        if (typeof updateCartCount === 'function') updateCartCount();
        
        if (typeof showToast === 'function') showToast('تم إرسال الطلب بنجاح!', 'success');
        
        setTimeout(() => {
            if (typeof showSection === 'function') showSection('my-orders');
            if (typeof removeCheckoutReceipt === 'function') removeCheckoutReceipt();
            
            const phoneInput = document.getElementById('checkoutPhone');
            const addressInput = document.getElementById('checkoutAddress');
            const notesInput = document.getElementById('checkoutNotes');
            
            if (phoneInput) phoneInput.value = '';
            if (addressInput) addressInput.value = '';
            if (notesInput) notesInput.value = '';
        }, 1500);
        
    } catch (error) {
        console.error('خطأ في إرسال الطلب:', error);
        if (typeof showToast === 'function') showToast(error.message || 'خطأ في إرسال الطلب، يرجى المحاولة مجدداً', 'error');
    } finally {
        const submitBtn = document.getElementById('submitOrderBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check"></i> تأكيد الطلب';
        }
    }
}

// دالة رفع الإيصال المصححة مع دعم التحميل التدريجي
async function uploadCheckoutReceipt(file) {
    try {
        if (!window.currentUser) throw new Error('يجب تسجيل الدخول لرفع الإيصال');
        
        const storage = getFirebaseStorageReference();
        if (!storage) {
            throw new Error('Firebase Storage غير مهيأ');
        }
        
        if (!file) throw new Error('لم يتم تحديد ملف');
        
        console.log('📤 بدء رفع الإيصال:', file.name);
        
        const fileName = 'receipts/' + window.currentUser.uid + '/' + Date.now() + '_' + file.name;
        const storageRef = window.firebaseModules.ref(storage, fileName);
        
        // استخدام uploadBytesResumable لدعم شريط التقدم
        const uploadTask = window.firebaseModules.uploadBytesResumable(storageRef, file);
        
        // إظهار شريط التقدم
        const progressContainer = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressContainer) progressContainer.style.display = 'block';
        
        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (progressFill) progressFill.style.width = progress + '%';
                    if (progressText) progressText.textContent = Math.round(progress) + '%';
                },
                (error) => {
                    console.error('❌ خطأ في رفع الإيصال:', error);
                    if (progressContainer) progressContainer.style.display = 'none';
                    reject(error);
                },
                async () => {
                    const downloadUrl = await window.firebaseModules.getDownloadURL(storageRef);
                    if (progressContainer) progressContainer.style.display = 'none';
                    resolve(downloadUrl);
                }
            );
        });
        
    } catch (error) {
        console.error('❌ خطأ في رفع الإيصال:', error);
        if (typeof showToast === 'function') showToast('فشل رفع صورة الإيصال: ' + error.message, 'error');
        throw error;
    }
}

function previewReceipt(input) {
    const preview = document.getElementById('receiptPreviewContainer');
    const previewImg = document.getElementById('receiptPreviewImg');
    const confirmBtn = document.getElementById('confirmOrderBtn');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const uploadProgress = document.getElementById('uploadProgress');
    const container = document.querySelector('.receipt-upload-container');
    
    if (!input || !input.files || !input.files[0]) {
        return;
    }
    
    const file = input.files[0];
    
    try {
        if (file.size > 10 * 1024 * 1024) {
            if (typeof showToast === 'function') showToast('حجم الملف كبير جداً. الحد الأقصى 10MB', 'error');
            input.value = '';
            return;
        }
        
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type.toLowerCase())) {
            if (typeof showToast === 'function') showToast('نوع الملف غير مدعوم. يرجى رفع صورة', 'error');
            input.value = '';
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            if (previewImg) previewImg.src = e.target.result;
            if (preview) preview.style.display = 'block';
            if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
            if (container) {
                container.style.borderStyle = 'solid';
                container.style.borderColor = '#27ae60';
                container.style.background = '#f0fff4';
            }
            
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.style.opacity = '1';
                confirmBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال الطلب الآن';
            }
            
            if (uploadProgress) uploadProgress.style.display = 'none';
        };
        
        reader.readAsDataURL(file);
        
    } catch (error) {
        console.error('خطأ في معاينة الصورة:', error);
        if (typeof showToast === 'function') showToast('حدث خطأ في معاينة الصورة', 'error');
        input.value = '';
    }
}

function removeReceiptPreview() {
    const input = document.getElementById('receiptInput');
    const preview = document.getElementById('receiptPreviewContainer');
    const previewImg = document.getElementById('receiptPreviewImg');
    const confirmBtn = document.getElementById('confirmOrderBtn');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const container = document.querySelector('.receipt-upload-container');
    
    if (input) input.value = '';
    if (preview) preview.style.display = 'none';
    if (previewImg) previewImg.src = '';
    if (uploadPlaceholder) uploadPlaceholder.style.display = 'block';
    if (container) {
        container.style.borderStyle = 'dashed';
        container.style.borderColor = '#ddd';
        container.style.background = '#f9f9f9';
    }
    
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-credit-card"></i> تأكيد الطلب وإرسال';
    }
}

function goToCheckout() {
    if (!window.currentUser || window.isGuest) {
        if (typeof showToast === 'function') showToast('يرجى تسجيل الدخول أولاً لإتمام عملية الشراء', 'warning');
        if (typeof showSection === 'function') showSection('profile');
        return;
    }
    
    if (!window.directPurchaseItem && (!window.cartItems || window.cartItems.length === 0)) {
        if (typeof showToast === 'function') showToast('السلة فارغة', 'warning');
        return;
    }
    if (typeof showSection === 'function') showSection('checkout');
}

// ======================== التصدير للاستخدام العام ========================

window.previewCheckoutReceipt = previewCheckoutReceipt;
window.removeCheckoutReceipt = removeCheckoutReceipt;
window.submitCheckoutOrder = submitCheckoutOrder;
window.updateCheckoutSummary = updateCheckoutSummary;
window.updateCheckoutItemQty = updateCheckoutItemQty;
window.enableDataEdit = enableDataEdit;
window.goToCheckout = goToCheckout;
window.previewReceipt = previewReceipt;
window.removeReceiptPreview = removeReceiptPreview;
window.uploadCheckoutReceipt = uploadCheckoutReceipt;

console.log('✅ checkout-system.js loaded');