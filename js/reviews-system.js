// reviews-system.js - نظام التقييمات والتعليقات
// ======================== نظام التقييمات ========================

/**
 * تحميل تقييمات منتج معين
 * @param {string} productId - معرف المنتج
 */
async function loadProductReviews(productId) {
    console.log(`📝 جاري تحميل تقييمات المنتج: ${productId}`);
    
    const reviewsContainer = document.getElementById('productReviews');
    const reviewsCount = document.getElementById('reviewsCount');
    const averageRating = document.getElementById('averageRating');
    
    if (!reviewsContainer) {
        console.warn('⚠️ عنصر productReviews غير موجود');
        return;
    }
    
    try {
        // عرض مؤشر التحميل
        reviewsContainer.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="spinner"></div></div>';
        
        // جلب التقييمات من Firebase
        const reviewsRef = window.firebaseModules.collection(db, "reviews");
        const q = window.firebaseModules.query(
            reviewsRef,
            window.firebaseModules.where("productId", "==", productId),
            window.firebaseModules.orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await window.firebaseModules.getDocs(q);
        
        if (querySnapshot.empty) {
            reviewsContainer.innerHTML = `
                <div style="text-align: center; padding: 30px 20px;">
                    <i class="fas fa-star-half-alt fa-2x" style="color: #ddd; margin-bottom: 15px;"></i>
                    <p style="color: var(--gray-color);">لا توجد تقييمات بعد. كن أول من يقيم هذا المنتج!</p>
                </div>
            `;
            if (reviewsCount) reviewsCount.textContent = '0';
            if (averageRating) averageRating.textContent = '0.0';
            return;
        }
        
        // معالجة التقييمات
        const reviews = [];
        let totalRating = 0;
        
        querySnapshot.forEach(doc => {
            const review = doc.data();
            review.id = doc.id;
            reviews.push(review);
            totalRating += review.rating || 0;
        });
        
        // حساب المتوسط
        const avgRating = (totalRating / reviews.length).toFixed(1);
        
        // تحديث الإحصائيات
        if (reviewsCount) reviewsCount.textContent = reviews.length.toString();
        if (averageRating) averageRating.textContent = avgRating;
        
        // عرض التقييمات
        reviewsContainer.innerHTML = reviews.map(review => renderReviewCard(review)).join('');
        
        console.log(`✅ تم تحميل ${reviews.length} تقييم`);
        
    } catch (error) {
        console.error('❌ خطأ في تحميل التقييمات:', error);
        reviewsContainer.innerHTML = `
            <div style="text-align: center; padding: 30px 20px;">
                <i class="fas fa-exclamation-triangle fa-2x" style="color: #f44336; margin-bottom: 15px;"></i>
                <p style="color: var(--gray-color);">حدث خطأ في تحميل التقييمات</p>
            </div>
        `;
    }
}

/**
 * عرض بطاقة تقييم واحدة
 * @param {Object} review - بيانات التقييم
 * @returns {string} HTML للتقييم
 */
function renderReviewCard(review) {
    const stars = generateStarsHTML(review.rating || 0);
    const date = review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString('ar-EG') : 'تاريخ غير محدد';
    const userName = review.userName || 'مستخدم';
    const comment = review.comment || '';
    
    return `
        <div class="review-card" style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div>
                    <strong style="color: var(--primary-color); font-size: 16px;">${userName}</strong>
                    <div style="margin-top: 5px;">${stars}</div>
                </div>
                <span style="color: var(--gray-color); font-size: 13px;">${date}</span>
            </div>
            ${comment ? `<p style="color: #333; line-height: 1.6; margin: 0;">${comment}</p>` : ''}
        </div>
    `;
}

/**
 * توليد نجوم التقييم
 * @param {number} rating - التقييم من 1 إلى 5
 * @returns {string} HTML للنجوم
 */
function generateStarsHTML(rating) {
    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            starsHTML += '<i class="fas fa-star" style="color: #ffc107; font-size: 14px;"></i>';
        } else {
            starsHTML += '<i class="far fa-star" style="color: #ddd; font-size: 14px;"></i>';
        }
    }
    return starsHTML;
}

/**
 * فتح نافذة إضافة تقييم
 * @param {string} productId - معرف المنتج
 */
function openReviewModal(productId) {
    if (!currentUser || isGuest) {
        if (typeof showToast === 'function') showToast('يجب تسجيل الدخول لإضافة تقييم', 'warning');
        return;
    }
    
    const modal = document.getElementById('reviewModal');
    if (!modal) {
        console.error('❌ نافذة التقييم غير موجودة');
        return;
    }
    
    // تعيين معرف المنتج
    window.currentReviewProductId = productId;
    
    // إعادة تعيين النموذج
    document.getElementById('reviewRating').value = '5';
    document.getElementById('reviewComment').value = '';
    updateReviewStars(5);
    
    modal.classList.add('active');
}

/**
 * إغلاق نافذة التقييم
 */
function closeReviewModal() {
    const modal = document.getElementById('reviewModal');
    if (modal) modal.classList.remove('active');
}

/**
 * تحديث عرض النجوم في نافذة التقييم
 * @param {number} rating - التقييم
 */
function updateReviewStars(rating) {
    const starsContainer = document.getElementById('reviewStarsDisplay');
    if (!starsContainer) return;
    
    starsContainer.innerHTML = generateStarsHTML(rating);
}

/**
 * إرسال تقييم جديد
 */
async function submitReview() {
    if (!currentUser || isGuest) {
        if (typeof showToast === 'function') showToast('يجب تسجيل الدخول لإضافة تقييم', 'warning');
        return;
    }
    
    const productId = window.currentReviewProductId;
    if (!productId) {
        if (typeof showToast === 'function') showToast('خطأ: لم يتم تحديد المنتج', 'error');
        return;
    }
    
    const rating = parseInt(document.getElementById('reviewRating').value);
    const comment = document.getElementById('reviewComment').value.trim();
    
    if (!rating || rating < 1 || rating > 5) {
        if (typeof showToast === 'function') showToast('يرجى اختيار تقييم صحيح', 'warning');
        return;
    }
    
    if (!comment) {
        if (typeof showToast === 'function') showToast('يرجى كتابة تعليق', 'warning');
        return;
    }
    
    try {
        // عرض مؤشر التحميل
        const submitBtn = document.getElementById('submitReviewBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
        }
        
        // إنشاء بيانات التقييم
        const reviewData = {
            productId: productId,
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email || 'مستخدم',
            rating: rating,
            comment: comment,
            createdAt: window.firebaseModules.serverTimestamp()
        };
        
        // حفظ في Firebase
        const reviewsRef = window.firebaseModules.collection(db, "reviews");
        await window.firebaseModules.addDoc(reviewsRef, reviewData);
        
        console.log('✅ تم إضافة التقييم بنجاح');
        
        if (typeof showToast === 'function') showToast('تم إضافة تقييمك بنجاح!', 'success');
        
        // إغلاق النافذة
        closeReviewModal();
        
        // إعادة تحميل التقييمات
        await loadProductReviews(productId);
        
    } catch (error) {
        console.error('❌ خطأ في إضافة التقييم:', error);
        if (typeof showToast === 'function') showToast('حدث خطأ في إضافة التقييم', 'error');
    } finally {
        // إعادة تفعيل الزر
        const submitBtn = document.getElementById('submitReviewBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال التقييم';
        }
    }
}

// تصدير الدوال للاستخدام العام
window.loadProductReviews = loadProductReviews;
window.openReviewModal = openReviewModal;
window.closeReviewModal = closeReviewModal;
window.updateReviewStars = updateReviewStars;
window.submitReview = submitReview;

console.log('✅ نظام التقييمات جاهز');
