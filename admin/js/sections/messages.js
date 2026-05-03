/**
 * messages.js - قسم الرسائل والتقييمات (نسخة محسنة)
 */

let allMessages = [];
let lastMessageDoc = null;
let hasMoreMessages = true;
let isLoadingMessages = false;
const MESSAGES_PER_PAGE = 10;
let messagesObserver = null;

let allReviews = [];
let lastReviewDoc = null;
let hasMoreReviews = true;
let isLoadingReviews = false;
const REVIEWS_PER_PAGE = 15;
let reviewsObserver = null;

// --- إدارة الرسائل ---
async function loadMessages(isNextPage = false) {
    if (!window.checkAdmin()) return;
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
        
        if (!db || !firebaseModules) {
            console.error('❌ Firebase not initialized');
            return;
        }

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
        ErrorHandler.handle(error, 'loadMessages');
        if (window.adminUtils) {
            window.adminUtils.showToast('فشل تحميل الرسائل', 'error');
        }
    } finally {
        isLoadingMessages = false;
    }
}

function setupMessagesInfiniteScroll() {
    const sentinel = document.getElementById('messagesScrollSentinel');
    if (!sentinel) return;

    if (messagesObserver) {
        messagesObserver.disconnect();
        messagesObserver = null;
    }

    messagesObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreMessages && !isLoadingMessages) {
            loadMessages(true);
        }
    }, { threshold: 0.1 });

    messagesObserver.observe(sentinel);
}

function displayMessages(append = false) {
    const tbody = document.getElementById('messagesBody');
    if (!tbody) return;
    
    if (allMessages.length === 0 && !append) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">لا توجد رسائل</td></tr>';
        return;
    }
    
    tbody.innerHTML = allMessages.map(msg => {
        const safeName = adminUtils.escapeHTML(msg.name || '---');
        const safeEmail = adminUtils.escapeHTML(msg.email || '---');
        const safeSubject = adminUtils.escapeHTML(msg.subject || '---');
        const safeId = msg.id;
        
        return `
        <tr class="compact-row">
            <td data-label="الاسم">${safeName}</td>
            <td data-label="البريد">${safeEmail}</td>
            <td data-label="الموضوع">${safeSubject}</td>
            <td data-label="الحالة">
                <span class="badge badge-${adminUtils.getStatusColor(msg.status || 'unread')}" style="padding: 2px 8px; font-size: 10px;">
                    ${adminUtils.getStatusText(msg.status || 'unread')}
                </span>
            </td>
            <td data-label="التاريخ">${adminUtils.formatDate(msg.createdAt)}</td>
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

function viewMessage(messageId) {
    if (!window.checkAdmin()) return;
    const message = allMessages.find(m => m.id === messageId);
    if (!message) return;

    const safeName = adminUtils.escapeHTML(message.name || '---');
    const safeEmail = adminUtils.escapeHTML(message.email || '---');
    const safeSubject = adminUtils.escapeHTML(message.subject || '---');
    const safeMessage = adminUtils.escapeHTML(message.message || '---');

    const content = `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 15px;">
            <p><strong>الاسم:</strong> ${safeName}</p>
            <p><strong>البريد:</strong> ${safeEmail}</p>
            <p><strong>الموضوع:</strong> ${safeSubject}</p>
            <p><strong>التاريخ:</strong> ${adminUtils.formatDate(message.createdAt)}</p>
        </div>
        <div style="padding: 15px; background: white; border: 1px solid #eee; border-radius: 8px;">
            <h4>نص الرسالة:</h4>
            <p style="line-height: 1.8;">${safeMessage}</p>
        </div>
    `;

    ModalManager.open({
        id: 'viewMessageModal',
        title: 'عرض الرسالة',
        content: content,
        size: 'medium',
        buttons: [
            { text: 'رد', class: 'btn-primary', onClick: () => {
                ModalManager.close('viewMessageModal');
                replyMessage(messageId);
            }},
            { text: 'حذف', class: 'btn-danger', onClick: () => {
                ModalManager.close('viewMessageModal');
                deleteMessage(messageId);
            }},
            { text: 'إغلاق', class: 'btn-secondary' }
        ]
    });

    // تحديث حالة الرسالة إلى مقروءة
    if (message.status !== 'read') {
        updateMessageStatus(messageId, 'read');
    }
}

async function updateMessageStatus(messageId, status) {
    try {
        const { db, firebaseModules } = window;
        await firebaseModules.updateDoc(
            firebaseModules.doc(db, 'messages', messageId),
            { status }
        );
        
        const message = allMessages.find(m => m.id === messageId);
        if (message) message.status = status;
        displayMessages();
    } catch (error) {
        console.error('❌ خطأ في تحديث حالة الرسالة:', error);
        ErrorHandler.handle(error, 'updateMessageStatus');
    }
}

function replyMessage(messageId) {
    const message = allMessages.find(m => m.id === messageId);
    if (!message) return;

    const content = `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <p><strong>إلى:</strong> ${adminUtils.escapeHTML(message.email)}</p>
            <p><strong>الموضوع الأصلي:</strong> ${adminUtils.escapeHTML(message.subject)}</p>
        </div>
        <div class="form-group">
            <label>الرد:</label>
            <textarea id="replyMessage" rows="6" class="form-control" placeholder="اكتب ردك هنا..."></textarea>
        </div>
    `;

    ModalManager.open({
        id: 'replyModal',
        title: 'الرد على الرسالة',
        content: content,
        size: 'medium',
        buttons: [
            { text: 'إرسال', class: 'btn-primary', onClick: async () => {
                const replyInput = document.getElementById('replyMessage');
                const replyText = replyInput ? replyInput.value.trim() : '';
                
                if (!replyText) {
                    adminUtils.showToast('الرجاء كتابة الرد', 'warning');
                    return;
                }

                // تنظيف الرد قبل المعالجة
                const safeReply = SecurityCore.sanitizeHTML(replyText);

                // هنا يمكن إرسال البريد الإلكتروني عبر خدمة خارجية
                console.log(`📤 إرسال رد إلى ${message.email}: ${safeReply}`);
                adminUtils.showToast('تم إرسال الرد بنجاح (محاكاة آمنة)', 'success');
                
                // تحديث حالة الرسالة إلى "تم الرد"
                await updateMessageStatus(messageId, 'replied');
                
                ModalManager.close('replyModal');
            }},
            { text: 'إلغاء', class: 'btn-secondary' }
        ]
    });
}

async function deleteMessage(messageId) {
    if (!window.checkAdmin()) return;
    
    ModalManager.confirm('هل أنت متأكد من حذف هذه الرسالة؟', 'تأكيد', async () => {
        try {
            const { db, firebaseModules } = window;
            await firebaseModules.deleteDoc(firebaseModules.doc(db, 'messages', messageId));
            adminUtils.showToast('✅ تم حذف الرسالة بنجاح', 'success');
            allMessages = allMessages.filter(m => m.id !== messageId);
            displayMessages();
        } catch (error) {
            console.error('❌ خطأ في حذف الرسالة:', error);
            adminUtils.showToast('حدث خطأ أثناء الحذف', 'error');
            ErrorHandler.handle(error, 'deleteMessage');
        }
    });
}

// --- إدارة التقييمات ---
async function loadReviews(isNextPage = false) {
    if (!window.checkAdmin()) return;
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
        
        if (!db || !firebaseModules) {
            console.error('❌ Firebase not initialized');
            return;
        }

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
        ErrorHandler.handle(error, 'loadReviews');
        if (window.adminUtils) {
            window.adminUtils.showToast('فشل تحميل التقييمات', 'error');
        }
    } finally {
        isLoadingReviews = false;
    }
}

function setupReviewsInfiniteScroll() {
    const sentinel = document.getElementById('reviewsScrollSentinel');
    if (!sentinel) return;

    if (reviewsObserver) {
        reviewsObserver.disconnect();
        reviewsObserver = null;
    }

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
        const safeComment = adminUtils.escapeHTML(rev.comment || '---');
        const safeId = rev.id;
        const productName = window.getProductName ? window.getProductName(rev.productId) : 'منتج';
        const userName = rev.userName || 'مستخدم';
        
        return `
        <tr class="compact-row">
            <td data-label="المنتج">${adminUtils.escapeHTML(productName)}</td>
            <td data-label="المستخدم">${adminUtils.escapeHTML(userName)}</td>
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
            <td data-label="التاريخ">${adminUtils.formatDate(rev.createdAt)}</td>
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

async function updateReviewStatus(reviewId, status) {
    if (!window.checkAdmin()) return;
    
    try {
        const { db, firebaseModules } = window;
        await firebaseModules.updateDoc(
            firebaseModules.doc(db, 'reviews', reviewId),
            { status }
        );
        
        adminUtils.showToast(`✅ تم ${status === 'approved' ? 'قبول' : 'رفض'} التقييم`, 'success');
        
        const review = allReviews.find(r => r.id === reviewId);
        if (review) review.status = status;
        displayReviews();
    } catch (error) {
        console.error('❌ خطأ في تحديث حالة التقييم:', error);
        adminUtils.showToast('حدث خطأ', 'error');
        ErrorHandler.handle(error, 'updateReviewStatus');
    }
}

async function deleteReview(reviewId) {
    if (!window.checkAdmin()) return;
    
    ModalManager.confirm('هل أنت متأكد من حذف هذا التقييم؟', 'تأكيد', async () => {
        try {
            const { db, firebaseModules } = window;
            await firebaseModules.deleteDoc(firebaseModules.doc(db, 'reviews', reviewId));
            adminUtils.showToast('✅ تم حذف التقييم', 'success');
            allReviews = allReviews.filter(r => r.id !== reviewId);
            displayReviews();
        } catch (error) {
            console.error('❌ خطأ في حذف التقييم:', error);
            adminUtils.showToast('حدث خطأ في الحذف', 'error');
            ErrorHandler.handle(error, 'deleteReview');
        }
    });
}

// --- إدارة الفئات (اختصار) ---
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
        
        console.log(`✅ تم تحميل ${allCategories.length} فئة`);
    } catch (error) { 
        console.error('❌ خطأ في تحميل الفئات:', error);
        ErrorHandler.handle(error, 'loadCategories');
    }
}

// تصدير الدوال
window.loadMessages = loadMessages;
window.viewMessage = viewMessage;
window.replyMessage = replyMessage;
window.deleteMessage = deleteMessage;
window.loadReviews = loadReviews;
window.updateReviewStatus = updateReviewStatus;
window.deleteReview = deleteReview;
window.loadCategories = loadCategories;