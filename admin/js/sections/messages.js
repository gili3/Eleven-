/**
 * messages.js - قسم الرسائل والتقييمات والفئات (نسخة محسنة أمنياً)
 */

let allMessages = [];
let lastMessageDoc = null;
let hasMoreMessages = true;
let isLoadingMessages = false;
const MESSAGES_PER_PAGE = 8;
let messagesObserver = null;

let allReviews = [];
let lastReviewDoc = null;
let hasMoreReviews = true;
let isLoadingReviews = false;
const REVIEWS_PER_PAGE = 15;
let reviewsObserver = null;

let allCategories = [];

// --- إدارة الرسائل ---
async function loadMessages(isNextPage = false) {
    if (isLoadingMessages) return;
    
    if (!isNextPage) {
        allMessages = [];
        lastMessageDoc = null;
        hasMoreMessages = true;
        const tbody = document.getElementById('messagesBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">جاري التحميل...</td></tr>';
    }

    if (!hasMoreMessages && isNextPage) return;

    isLoadingMessages = true;
    try {
        console.log('📧 جاري تحميل الرسائل...');
        const { db, firebaseModules } = window;
        
        let constraints = [
            firebaseModules.collection(db, 'messages'),
            firebaseModules.orderBy('createdAt', 'desc'),
            firebaseModules.limit(MESSAGES_PER_PAGE)
        ];

        if (isNextPage && lastMessageDoc) {
            constraints.splice(2, 0, firebaseModules.startAfter(lastMessageDoc));
        }
        
        const q = firebaseModules.query(...constraints);
        const snapshot = await firebaseModules.getDocs(q);
        
        if (snapshot.empty) {
            hasMoreMessages = false;
            if (!isNextPage) displayMessages();
            return;
        }

        lastMessageDoc = snapshot.docs[snapshot.docs.length - 1];
        hasMoreMessages = snapshot.docs.length === MESSAGES_PER_PAGE;

        const newMessages = [];
        snapshot.forEach(doc => {
            newMessages.push({ id: doc.id, ...doc.data() });
        });

        allMessages = [...allMessages, ...newMessages];
        window.allMessages = allMessages;
        
        displayMessages(isNextPage);
        
        if (!isNextPage) setupMessagesInfiniteScroll();
        
        console.log(`✅ تم تحميل ${newMessages.length} رسالة إضافية`);
    } catch (error) {
        console.error('❌ خطأ في تحميل الرسائل:', error);
        if (window.adminUtils) window.adminUtils.showToast('فشل تحميل الرسائل', 'error');
    } finally {
        isLoadingMessages = false;
    }
}

function setupMessagesInfiniteScroll() {
    const sentinel = document.getElementById('messagesScrollSentinel');
    if (!sentinel) return;

    if (messagesObserver) messagesObserver.disconnect();

    messagesObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreMessages && !isLoadingMessages) {
            loadMessages(true);
        }
    }, { threshold: 0.1 });

    messagesObserver.observe(sentinel);
}

/**
 * دالة آمنة لتنقية النصوص قبل العرض
 */
function escapeHTML(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function displayMessages(append = false) {
    const tbody = document.getElementById('messagesBody');
    if (!tbody) return;
    
    if (allMessages.length === 0 && !append) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">لا توجد رسائل</td></tr>';
        return;
    }
    
    tbody.innerHTML = allMessages.map(msg => {
        // تنقية جميع البيانات قبل العرض
        const safeName = escapeHTML(msg.name || '---');
        const safeEmail = escapeHTML(msg.email || '---');
        const safeSubject = escapeHTML(msg.subject || '---');
        const safeId = escapeHTML(msg.id);
        
        return `
        <tr class="compact-row">
            <td data-label="الاسم">${safeName}</td>
            <td data-label="البريد">${safeEmail}</td>
            <td data-label="الموضوع">${safeSubject}</td>
            <td data-label="الحالة">
                <span class="badge badge-${window.adminUtils.getStatusColor(msg.status || 'unread')}" style="padding: 2px 8px; font-size: 10px;">
                    ${window.adminUtils.getStatusText(msg.status || 'unread')}
                </span>
            </td>
            <td data-label="التاريخ">${window.adminUtils.formatDate(msg.createdAt)}</td>
            <td data-label="الإجراءات">
                <div class="action-buttons-compact">
                    <button class="btn btn-sm btn-info" onclick="viewMessage('${safeId}')" title="عرض">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="replyMessage('${safeId}')" title="رد">
                        <i class="fas fa-reply"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteMessage('${safeId}')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// --- إدارة التقييمات ---
async function loadReviews(isNextPage = false) {
    if (isLoadingReviews) return;
    
    if (!isNextPage) {
        allReviews = [];
        lastReviewDoc = null;
        hasMoreReviews = true;
        const tbody = document.getElementById('reviewsBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">جاري التحميل...</td></tr>';
    }

    if (!hasMoreReviews && isNextPage) return;

    isLoadingReviews = true;
    try {
        console.log('⭐ جاري تحميل التقييمات...');
        const { db, firebaseModules } = window;
        
        let constraints = [
            firebaseModules.collection(db, 'reviews'),
            firebaseModules.orderBy('createdAt', 'desc'),
            firebaseModules.limit(REVIEWS_PER_PAGE)
        ];

        if (isNextPage && lastReviewDoc) {
            constraints.splice(2, 0, firebaseModules.startAfter(lastReviewDoc));
        }
        
        const q = firebaseModules.query(...constraints);
        const snapshot = await firebaseModules.getDocs(q);
        
        if (snapshot.empty) {
            hasMoreReviews = false;
            if (!isNextPage) displayReviews();
            return;
        }

        lastReviewDoc = snapshot.docs[snapshot.docs.length - 1];
        hasMoreReviews = snapshot.docs.length === REVIEWS_PER_PAGE;

        const newReviews = [];
        snapshot.forEach(doc => {
            newReviews.push({ id: doc.id, ...doc.data() });
        });

        allReviews = [...allReviews, ...newReviews];
        window.allReviews = allReviews;
        
        displayReviews(isNextPage);
        
        if (!isNextPage) setupReviewsInfiniteScroll();
        
        console.log(`✅ تم تحميل ${newReviews.length} تقييم إضافي`);
    } catch (error) {
        console.error('❌ خطأ في تحميل التقييمات:', error);
        if (window.adminUtils) window.adminUtils.showToast('فشل تحميل التقييمات', 'error');
    } finally {
        isLoadingReviews = false;
    }
}

function setupReviewsInfiniteScroll() {
    const sentinel = document.getElementById('reviewsScrollSentinel');
    if (!sentinel) return;

    if (reviewsObserver) reviewsObserver.disconnect();

    reviewsObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreReviews && !isLoadingReviews) {
            loadReviews(true);
        }
    }, { threshold: 0.1 });

    reviewsObserver.observe(sentinel);
}

function displayReviews(append = false) {
    const tbody = document.getElementById('reviewsBody');
    if (!tbody) return;
    
    if (allReviews.length === 0 && !append) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">لا توجد تقييمات</td></tr>';
        return;
    }
    
    tbody.innerHTML = allReviews.map(rev => {
        // تنقية البيانات قبل العرض
        const safeComment = escapeHTML(rev.comment || '---');
        const safeId = escapeHTML(rev.id);
        
        return `
        <tr class="compact-row">
            <td data-label="المنتج">${window.getProductName(rev.productId)}</td>
            <td data-label="المستخدم">${window.getUserName(rev.userId)}</td>
            <td data-label="التقييم">
                <div style="color: #f1c40f; font-size: 12px;">
                    ${'<i class="fas fa-star"></i>'.repeat(rev.rating)}${'<i class="far fa-star"></i>'.repeat(5 - rev.rating)}
                </div>
            </td>
            <td data-label="التعليق" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${safeComment}</td>
            <td data-label="الحالة">
                <span class="badge badge-${rev.status === 'approved' ? 'success' : (rev.status === 'rejected' ? 'danger' : 'warning')}" style="padding: 2px 8px; font-size: 10px;">
                    ${rev.status === 'approved' ? 'مقبول' : (rev.status === 'rejected' ? 'مرفوض' : 'معلق')}
                </span>
            </td>
            <td data-label="التاريخ">${window.adminUtils.formatDate(rev.createdAt)}</td>
            <td data-label="الإجراءات">
                <div class="action-buttons-compact">
                    <button class="btn btn-sm btn-success" onclick="updateReviewStatus('${safeId}', 'approved')" title="قبول"><i class="fas fa-check"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="updateReviewStatus('${safeId}', 'rejected')" title="رفض"><i class="fas fa-times"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteReview('${safeId}')" title="حذف"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// --- إدارة الفئات ---
async function loadCategories() {
    try {
        console.log('📂 جاري تحميل الفئات...');
        const { db, firebaseModules } = window;
        const q = firebaseModules.query(
            firebaseModules.collection(db, 'categories'), 
            firebaseModules.orderBy('createdAt', 'desc')
        );
        const snapshot = await firebaseModules.getDocs(q);
        
        allCategories = [];
        snapshot.forEach(doc => allCategories.push({ id: doc.id, ...doc.data() }));
        
        window.allCategories = allCategories;
        displayCategories();
        
        console.log(`✅ تم تحميل ${allCategories.length} فئة`);
    } catch (error) { 
        console.error('❌ خطأ في تحميل الفئات:', error);
    }
}

function displayCategories() {
    const tbody = document.getElementById('categoriesBody');
    if (!tbody) return;
    
    if (allCategories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">لا توجد فئات</td></tr>';
        return;
    }
    
    tbody.innerHTML = allCategories.map(cat => {
        // تنقية البيانات قبل العرض
        const safeName = escapeHTML(cat.name || '');
        const safeSlug = escapeHTML(cat.slug || '---');
        const safeId = escapeHTML(cat.id);
        const safeImage = escapeHTML(cat.image || 'https://via.placeholder.com/30');
        
        return `
        <tr class="compact-row">
            <td data-label="الصورة"><img src="${safeImage}" style="width: 30px; height: 30px; border-radius: 4px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/30'"></td>
            <td data-label="الاسم">${safeName}</td>
            <td data-label="الاسم البرمجي">${safeSlug}</td>
            <td data-label="الترتيب">${cat.order || 0}</td>
            <td data-label="الإجراءات">
                <div class="action-buttons-compact">
                    <button class="btn btn-sm btn-primary" onclick="editCategory('${safeId}')" title="تعديل"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCategory('${safeId}')" title="حذف"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}
