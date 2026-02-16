/**
 * coupons.js - قسم إدارة الكوبونات (نسخة محسنة مع التحميل بالتمرير والبطاقات المصغرة)
 */

let allCoupons = [];
let lastCouponDoc = null;
let hasMoreCoupons = true;
let isLoadingCoupons = false;
const COUPONS_PER_PAGE = 8;
let couponsObserver = null;

async function loadCoupons(isNextPage = false) {
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
        if (window.adminUtils) window.adminUtils.showToast('فشل تحميل الكوبونات', 'error');
    } finally {
        isLoadingCoupons = false;
    }
}

function setupCouponsInfiniteScroll() {
    const sentinel = document.getElementById('couponsScrollSentinel');
    if (!sentinel) return;

    if (couponsObserver) couponsObserver.disconnect();

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
    
    tbody.innerHTML = allCoupons.map(coupon => {
        const expiryDate = new Date(coupon.expiryDate);
        const isExpired = expiryDate < now;
        const isActive = coupon.isActive !== false && !isExpired;
        
        return `
        <tr class="compact-row">
            <td data-label="الكود"><strong>${coupon.code}</strong></td>
            <td data-label="الخصم">${coupon.type === 'percent' ? coupon.value + '%' : window.adminUtils.formatNumber(coupon.value) + ' SDG'}</td>
            <td data-label="الحد الأدنى">${window.adminUtils.formatNumber(coupon.minOrder || 0)} SDG</td>
            <td data-label="الاستخدامات">${coupon.usageCount || 0} / ${coupon.limit || '∞'}</td>
            <td data-label="تاريخ الانتهاء">${window.adminUtils.formatDate(coupon.expiryDate)}</td>
            <td data-label="الحالة">
                <span class="badge ${isActive ? 'badge-success' : 'badge-danger'}" style="padding: 2px 8px; font-size: 10px;">
                    ${isActive ? 'نشط' : (isExpired ? 'منتهي' : 'معطل')}
                </span>
            </td>
            <td data-label="الإجراءات">
                <div class="action-buttons-compact">
                    <button class="btn btn-sm ${isActive ? 'btn-warning' : 'btn-success'}" 
                            onclick="toggleCouponStatus('${coupon.id}', ${isActive})"
                            title="${isActive ? 'تعطيل' : 'تفعيل'}">
                        <i class="fas fa-${isActive ? 'pause' : 'play'}"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="editCoupon('${coupon.id}')" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCoupon('${coupon.id}')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');
}

function openCouponModal(couponId = null) {
    const coupon = couponId ? allCoupons.find(c => c.id === couponId) : null;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'couponModal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${couponId ? 'تعديل كوبون' : 'كوبون جديد'}</h2>
                <button class="modal-close" onclick="window.adminUtils.closeModal('couponModal')">&times;</button>
            </div>
            
            <form id="couponForm" onsubmit="saveCoupon(event, ${couponId ? `'${couponId}'` : 'null'})">
                <div class="form-group">
                    <label>كود الكوبون *</label>
                    <input type="text" id="couponCode" value="${coupon?.code || ''}" required placeholder="مثال: SAVE20">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="form-group">
                        <label>نوع الخصم</label>
                        <select id="couponType">
                            <option value="percent" ${coupon?.type === 'percent' ? 'selected' : ''}>نسبة مئوية (%)</option>
                            <option value="fixed" ${coupon?.type === 'fixed' ? 'selected' : ''}>مبلغ ثابت (SDG)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>قيمة الخصم *</label>
                        <input type="number" id="couponValue" value="${coupon?.value || ''}" min="0" step="0.01" required>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="form-group">
                        <label>الحد الأدنى للطلب</label>
                        <input type="number" id="couponMinOrder" value="${coupon?.minOrder || 0}" min="0" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>حد الاستخدام</label>
                        <input type="number" id="couponLimit" value="${coupon?.limit || 100}" min="1">
                    </div>
                </div>

                <div class="form-group">
                    <label>تاريخ الانتهاء *</label>
                    <input type="date" id="couponExpiry" value="${coupon?.expiryDate ? new Date(coupon.expiryDate).toISOString().split('T')[0] : ''}" required>
                </div>

                <div class="form-group">
                    <label>
                        <input type="checkbox" id="couponIsActive" ${coupon?.isActive !== false ? 'checked' : ''}> 
                        الكوبون نشط
                    </label>
                </div>

                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">حفظ الكوبون</button>
                    <button type="button" class="btn btn-secondary" onclick="window.adminUtils.closeModal('couponModal')">إلغاء</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
}

async function saveCoupon(event, couponId) {
    event.preventDefault();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري الحفظ...';
    
    try {
        const { db, firebaseModules } = window;
        
        const couponData = {
            code: document.getElementById('couponCode').value.toUpperCase().trim(),
            type: document.getElementById('couponType').value,
            value: parseFloat(document.getElementById('couponValue').value),
            minOrder: parseFloat(document.getElementById('couponMinOrder').value) || 0,
            limit: parseInt(document.getElementById('couponLimit').value) || null,
            expiryDate: document.getElementById('couponExpiry').value,
            isActive: document.getElementById('couponIsActive').checked,
            updatedAt: firebaseModules.serverTimestamp()
        };

        if (couponId && couponId !== 'null') {
            await firebaseModules.updateDoc(firebaseModules.doc(db, 'coupons', couponId), couponData);
            window.adminUtils.showToast('✅ تم تحديث الكوبون بنجاح', 'success');
        } else {
            couponData.createdAt = firebaseModules.serverTimestamp();
            couponData.usageCount = 0;
            await firebaseModules.addDoc(firebaseModules.collection(db, 'coupons'), couponData);
            window.adminUtils.showToast('✅ تم إضافة الكوبون بنجاح', 'success');
        }
        
        window.adminUtils.closeModal('couponModal');
        loadCoupons();
    } catch (error) {
        console.error('❌ خطأ في حفظ الكوبون:', error);
        window.adminUtils.showToast('حدث خطأ في حفظ الكوبون', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'حفظ الكوبون';
    }
}

async function toggleCouponStatus(couponId, currentStatus) {
    try {
        const { db, firebaseModules } = window;
        await firebaseModules.updateDoc(firebaseModules.doc(db, 'coupons', couponId), {
            isActive: !currentStatus
        });
        
        window.adminUtils.showToast(`✅ تم ${!currentStatus ? 'تفعيل' : 'تعطيل'} الكوبون`, 'success');
        loadCoupons();
    } catch (error) {
        console.error('❌ خطأ في تحديث حالة الكوبون:', error);
        window.adminUtils.showToast('حدث خطأ', 'error');
    }
}

async function deleteCoupon(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return;
    
    try {
        const { db, firebaseModules } = window;
        await firebaseModules.deleteDoc(firebaseModules.doc(db, 'coupons', id));
        
        window.adminUtils.showToast('✅ تم حذف الكوبون بنجاح', 'success');
        loadCoupons();
    } catch (error) {
        console.error('❌ خطأ في حذف الكوبون:', error);
        window.adminUtils.showToast('حدث خطأ في الحذف', 'error');
    }
}

function editCoupon(id) {
    openCouponModal(id);
}

window.loadCoupons = loadCoupons;
window.openCouponModal = openCouponModal;
window.saveCoupon = saveCoupon;
window.deleteCoupon = deleteCoupon;
window.toggleCouponStatus = toggleCouponStatus;
window.editCoupon = editCoupon;
