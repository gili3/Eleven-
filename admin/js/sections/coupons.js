/**
 * coupons.js - قسم إدارة الكوبونات (نسخة مصلحة)
 */

let allCoupons = [];
let lastCouponDoc = null;
let hasMoreCoupons = true;
let isLoadingCoupons = false;
const COUPONS_PER_PAGE = 8;
let couponsObserver = null;

// ==================== تحميل الكوبونات ====================

async function loadCoupons(isNextPage = false) {
    if (!window.checkAdmin()) return;
    if (isLoadingCoupons) return;
    
    if (!isNextPage) {
        allCoupons = [];
        lastCouponDoc = null;
        hasMoreCoupons = true;
        const tbody = document.getElementById('couponsBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">جاري التحميل...</td></tr>';
    }

    if (!hasMoreCoupons && isNextPage) return;

    isLoadingCoupons = true;
    try {
        console.log('🎫 جاري تحميل الكوبونات...');
        const { db, firebaseModules } = window;
        
        if (!db || !firebaseModules) {
            console.error('❌ Firebase not initialized');
            return;
        }

        let constraints = [
            firebaseModules.collection(db, 'coupons'),
            firebaseModules.orderBy('createdAt', 'desc'),
            firebaseModules.limit(COUPONS_PER_PAGE)
        ];

        if (isNextPage && lastCouponDoc) {
            constraints.splice(2, 0, firebaseModules.startAfter(lastCouponDoc));
        }
        
        const q = firebaseModules.query(...constraints);
        const snapshot = await firebaseModules.getDocs(q);
        
        if (snapshot.empty) {
            hasMoreCoupons = false;
            if (!isNextPage) displayCoupons();
            return;
        }

        lastCouponDoc = snapshot.docs[snapshot.docs.length - 1];
        hasMoreCoupons = snapshot.docs.length === COUPONS_PER_PAGE;

        const newCoupons = [];
        snapshot.forEach(doc => {
            newCoupons.push({ id: doc.id, ...doc.data() });
        });

        allCoupons = [...allCoupons, ...newCoupons];
        window.allCoupons = allCoupons;
        
        displayCoupons(isNextPage);
        
        if (!isNextPage) setupCouponsInfiniteScroll();
        
        console.log(`✅ تم تحميل ${newCoupons.length} كوبون إضافي`);
    } catch (error) {
        console.error('❌ خطأ في تحميل الكوبونات:', error);
        ErrorHandler.handle(error, 'loadCoupons');
        if (window.adminUtils) {
            window.adminUtils.showToast('فشل تحميل الكوبونات', 'error');
        }
    } finally {
        isLoadingCoupons = false;
    }
}

function setupCouponsInfiniteScroll() {
    const sentinel = document.getElementById('couponsScrollSentinel');
    if (!sentinel) return;

    if (couponsObserver) {
        couponsObserver.disconnect();
        couponsObserver = null;
    }

    couponsObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreCoupons && !isLoadingCoupons) {
            loadCoupons(true);
        }
    }, { threshold: 0.1 });

    couponsObserver.observe(sentinel);
}

function displayCoupons(append = false) {
    const tbody = document.getElementById('couponsBody');
    if (!tbody) return;
    
    if (allCoupons.length === 0 && !append) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">لا توجد كوبونات</td></tr>';
        return;
    }

    const now = new Date();
    
    const html = allCoupons.map(coupon => {
        const expiryDate = new Date(coupon.expiryDate);
        const isExpired = expiryDate < now;
        const isActive = coupon.isActive !== false && !isExpired;
        
        const safeCode = window.adminUtils.escapeHTML(coupon.code || '');
        
        return `
        <tr class="compact-row">
            <td data-label="الكود"><strong>${safeCode}</strong></td>
            <td data-label="الخصم">${coupon.type === 'percent' ? coupon.value + '%' : window.adminUtils.formatNumber(coupon.value) + ' SDG'}</td>
            <td data-label="الحد الأدنى">${window.adminUtils.formatNumber(coupon.minOrder || 0)} SDG</td>
            <td data-label="الاستخدامات">${coupon.usageCount || 0} / ${coupon.limit || '∞'}</td>
            <td data-label="تاريخ الانتهاء">${window.adminUtils.formatDate(coupon.expiryDate)}</td>
            <td data-label="الحالة">
                <span class="badge badge-${isActive ? 'success' : (isExpired ? 'danger' : 'warning')}" style="padding: 2px 8px; font-size: 10px;">
                    ${isActive ? 'نشط' : (isExpired ? 'منتهي' : 'معطل')}
                </span>
            </td>
            <td data-label="الإجراءات">
                <div class="action-buttons-compact">
                    <button class="btn btn-sm ${isActive ? 'btn-warning' : 'btn-success'}" 
                            onclick="window.toggleCouponStatus('${coupon.id}', ${isActive})"
                            title="${isActive ? 'تعطيل' : 'تفعيل'}">
                        <i class="fas fa-${isActive ? 'pause' : 'play'}"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="window.editCoupon('${coupon.id}')" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="window.deleteCoupon('${coupon.id}')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');

    if (append) {
        tbody.insertAdjacentHTML('beforeend', html);
    } else {
        tbody.innerHTML = html;
    }
}

// ✅ فتح نافذة الكوبون مع إصلاح زر الإلغاء
window.openCouponModal = function(couponId = null) {
    if (!window.checkAdmin()) return;
    
    const coupon = couponId ? allCoupons.find(c => c.id === couponId) : null;
    const expiryValue = coupon?.expiryDate ? new Date(coupon.expiryDate).toISOString().split('T')[0] : '';
    
    const content = `
        <form id="couponForm" onsubmit="window.saveCoupon(event, ${couponId ? `'${couponId}'` : 'null'})">
            <div class="form-group">
                <label>كود الكوبون <span style="color: red;">*</span></label>
                <input type="text" id="couponCode" value="${coupon ? window.adminUtils.escapeHTML(coupon.code) : ''}" required 
                       placeholder="مثال: SAVE20" class="form-control" style="text-transform: uppercase;">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="form-group">
                    <label>نوع الخصم</label>
                    <select id="couponType" class="form-control">
                        <option value="percent" ${coupon?.type === 'percent' ? 'selected' : ''}>نسبة مئوية (%)</option>
                        <option value="fixed" ${coupon?.type === 'fixed' ? 'selected' : ''}>مبلغ ثابت (SDG)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>قيمة الخصم <span style="color: red;">*</span></label>
                    <input type="number" id="couponValue" value="${coupon?.value || ''}" min="0" step="0.01" required class="form-control">
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="form-group">
                    <label>الحد الأدنى للطلب</label>
                    <input type="number" id="couponMinOrder" value="${coupon?.minOrder || 0}" min="0" step="0.01" class="form-control">
                </div>
                <div class="form-group">
                    <label>حد الاستخدام</label>
                    <input type="number" id="couponLimit" value="${coupon?.limit || 100}" min="1" class="form-control">
                </div>
            </div>

            <div class="form-group">
                <label>تاريخ الانتهاء <span style="color: red;">*</span></label>
                <input type="date" id="couponExpiry" value="${expiryValue}" required class="form-control">
            </div>

            <div class="form-group">
                <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="couponIsActive" ${coupon?.isActive !== false ? 'checked' : ''}> 
                    الكوبون نشط
                </label>
            </div>
        </form>
    `;

    // ✅ إصلاح: إضافة معالج إلغاء صريح
    ModalManager.open({
        id: 'couponModal',
        title: couponId ? 'تعديل كوبون' : 'كوبون جديد',
        content: content,
        size: 'medium',
        buttons: [
            { 
                text: 'حفظ', 
                class: 'btn-primary', 
                onClick: () => {
                    const form = document.getElementById('couponForm');
                    if (form) form.dispatchEvent(new Event('submit'));
                }
            },
            { 
                text: 'إلغاء', 
                class: 'btn-secondary',
                onClick: () => ModalManager.close('couponModal')
            }
        ]
    });
};

// ✅ حفظ الكوبون
window.saveCoupon = async function(event, couponId) {
    if (!window.checkAdmin()) return;
    if (event) event.preventDefault();
    
    const modalButtons = document.querySelectorAll('#couponModal .modal-footer button');
    let submitBtn = null;
    modalButtons.forEach(btn => {
        if (btn.textContent.includes('حفظ') || btn.classList.contains('btn-primary')) {
            submitBtn = btn;
        }
    });
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
    }
    
    try {
        const { db, firebaseModules } = window;
        
        const expiryDateValue = document.getElementById('couponExpiry')?.value;
        
        // التحقق من صحة التاريخ
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiryDateObj = new Date(expiryDateValue);
        
        if (expiryDateObj < today) {
            window.adminUtils.showToast('⚠️ لا يمكن إضافة كوبون منتهي الصلاحية', 'warning');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'حفظ';
            }
            return;
        }
        
        const couponData = {
            code: (document.getElementById('couponCode')?.value || '').toUpperCase().trim().replace(/[^A-Z0-9]/g, ''),
            type: document.getElementById('couponType')?.value || 'percent',
            value: Math.max(0, parseFloat(document.getElementById('couponValue')?.value) || 0),
            minOrder: Math.max(0, parseFloat(document.getElementById('couponMinOrder')?.value) || 0),
            limit: Math.max(1, parseInt(document.getElementById('couponLimit')?.value) || 100),
            expiryDate: expiryDateValue,
            isActive: document.getElementById('couponIsActive')?.checked ?? true,
            updatedAt: firebaseModules.serverTimestamp()
        };

        if (!couponData.code || !couponData.value || !couponData.expiryDate) {
            window.adminUtils.showToast('الرجاء ملء جميع الحقول المطلوبة', 'warning');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'حفظ';
            }
            return;
        }

        if (couponId && couponId !== 'null') {
            await firebaseModules.updateDoc(firebaseModules.doc(db, 'coupons', couponId), couponData);
            window.adminUtils.showToast('✅ تم تحديث الكوبون بنجاح', 'success');
        } else {
            couponData.createdAt = firebaseModules.serverTimestamp();
            couponData.usageCount = 0;
            await firebaseModules.addDoc(firebaseModules.collection(db, 'coupons'), couponData);
            window.adminUtils.showToast('✅ تم إضافة الكوبون بنجاح', 'success');
        }
        
        ModalManager.close('couponModal');
        await loadCoupons(false);
    } catch (error) {
        console.error('❌ خطأ في حفظ الكوبون:', error);
        window.adminUtils.showToast('حدث خطأ في حفظ الكوبون', 'error');
        ErrorHandler.handle(error, 'saveCoupon');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'حفظ';
        }
    }
};

// ✅ تبديل حالة الكوبون
window.toggleCouponStatus = async function(couponId, currentStatus) {
    if (!window.checkAdmin()) return;
    
    try {
        const { db, firebaseModules } = window;
        await firebaseModules.updateDoc(firebaseModules.doc(db, 'coupons', couponId), {
            isActive: !currentStatus
        });
        
        window.adminUtils.showToast(`✅ تم ${!currentStatus ? 'تفعيل' : 'تعطيل'} الكوبون`, 'success');
        
        const coupon = allCoupons.find(c => c.id === couponId);
        if (coupon) coupon.isActive = !currentStatus;
        displayCoupons(false);
    } catch (error) {
        console.error('❌ خطأ في تحديث حالة الكوبون:', error);
        window.adminUtils.showToast('حدث خطأ', 'error');
        ErrorHandler.handle(error, 'toggleCouponStatus');
    }
};

// ✅ حذف الكوبون
window.deleteCoupon = async function(id) {
    if (!window.checkAdmin()) return;
    
    ModalManager.confirm('هل أنت متأكد من حذف هذا الكوبون؟', 'تأكيد', async () => {
        try {
            const { db, firebaseModules } = window;
            await firebaseModules.deleteDoc(firebaseModules.doc(db, 'coupons', id));
            
            window.adminUtils.showToast('✅ تم حذف الكوبون بنجاح', 'success');
            allCoupons = allCoupons.filter(c => c.id !== id);
            window.allCoupons = allCoupons;
            displayCoupons(false);
        } catch (error) {
            console.error('❌ خطأ في حذف الكوبون:', error);
            window.adminUtils.showToast('حدث خطأ في الحذف', 'error');
            ErrorHandler.handle(error, 'deleteCoupon');
        }
    });
};

// ✅ تعديل الكوبون
window.editCoupon = function(id) {
    if (!window.checkAdmin()) return;
    window.openCouponModal(id);
};

// ==================== التهيئة ====================

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('couponsBody')) {
        loadCoupons();
    }
});

// ✅ تعريض الدوال
window.loadCoupons = loadCoupons;
window.openCouponModal = window.openCouponModal;
window.saveCoupon = window.saveCoupon;
window.deleteCoupon = window.deleteCoupon;
window.toggleCouponStatus = window.toggleCouponStatus;
window.editCoupon = window.editCoupon;