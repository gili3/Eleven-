/**
 * admin-utils.js
 * وظائف مساعدة مشتركة للوحة التحكم - نسخة مصلحة ومكتملة
 * تم الإصلاح: إزالة الاعتماد الدائري، إضافة showToast مستقلة، تعزيز التحقق من الصلاحيات
 */

// ==================== دالة showToast مستقلة ====================
function showToast(message, type = 'info') {
    // إنشاء حاوية التوست إذا لم تكن موجودة
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 99999;
            display: flex; flex-direction: column; gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(toastContainer);
    }

    // أيقونات حسب النوع
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    const icon = icons[type] || icons.info;
    const bgColor = colors[type] || colors.info;

    // إنشاء عنصر التوست
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
        background: ${bgColor};
        color: ${type === 'warning' ? '#000' : '#fff'};
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: 'Cairo', sans-serif;
        font-size: 14px;
        min-width: 280px;
        max-width: 450px;
        opacity: 1;
        transform: translateX(0);
        transition: opacity 0.3s ease, transform 0.3s ease;
        pointer-events: auto;
    `;
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${escapeHTML(String(message))}</span>`;
    toastContainer.appendChild(toast);

    // إخفاء وإزالة التوست بعد 3 ثواني
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 300);
    }, 3000);
}

// ==================== دالة موحدة للتحقق من صلاحية المسؤول ====================
window.checkAdmin = function() {
    // 1. التحقق أولاً من وجود مستخدم مسجل في Firebase (مصدر الحقيقة)
    if (!window.auth || !window.auth.currentUser) {
        console.warn('⚠️ محاولة وصول بدون تسجيل دخول');
        showToast('يجب تسجيل الدخول أولاً', 'error');
        return false;
    }

    // 2. إعادة التحقق من AppState
    if (window.AppState && window.AppState.isAdmin === true) {
        // التحقق الإضافي: التأكد من أن AppState يطابق المستخدم الحالي
        if (window.AppState.user && 
            window.AppState.user.uid === window.auth.currentUser.uid) {
            return true;
        } else {
            // AppState غير متطابق - إعادة تعيينه
            console.warn('⚠️ AppState غير متطابق مع المستخدم الحالي');
            if (typeof AppState.reset === 'function') {
                AppState.reset();
            }
        }
    }

    // 3. محاولة أخيرة: التحقق من البيانات المخزنة محلياً (للجلسات المستعادة)
    const storedAdmin = sessionStorage.getItem('isAdmin');
    const storedUid = sessionStorage.getItem('currentUid');
    if (storedAdmin === 'true' && storedUid === window.auth.currentUser.uid) {
        // تحديث AppState
        if (window.AppState && typeof AppState.setUser === 'function') {
            AppState.setUser({ uid: storedUid, isAdmin: true }, false);
        }
        return true;
    }

    // 4. فشل جميع التحققات - تسجيل خروج تلقائي
    console.error('❌ وصول غير مصرح به للوحة التحكم');
    showToast('ليس لديك صلاحية الوصول لهذه الصفحة', 'error');
    
    // تسجيل الخروج بعد 2 ثانية
    setTimeout(() => {
        if (typeof window.logoutAdmin === 'function') {
            window.logoutAdmin();
        } else if (window.firebaseModules && window.firebaseModules.signOut) {
            window.firebaseModules.signOut(window.auth).then(() => {
                window.location.href = 'login.html';
            });
        } else {
            window.location.href = 'login.html';
        }
    }, 2000);
    
    return false;
};

// ==================== وظائف التنسيق ====================
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return new Intl.NumberFormat('ar-EG').format(num);
}

function formatDate(timestamp) {
    if (!timestamp) return '---';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        if (isNaN(date.getTime())) return '---';
        return new Intl.DateTimeFormat('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    } catch (e) {
        return '---';
    }
}

function getStatusColor(status) {
    const colors = {
        'pending': 'warning',
        'paid': 'info',
        'processing': 'primary',
        'shipped': 'secondary',
        'delivered': 'success',
        'cancelled': 'danger',
        'read': 'success',
        'unread': 'danger',
        'replied': 'info',
        'active': 'success',
        'inactive': 'danger',
        'approved': 'success',
        'pending_approval': 'warning',
        'rejected': 'danger'
    };
    return colors[status] || 'secondary';
}

function getStatusText(status) {
    const texts = {
        'pending': 'قيد الانتظار',
        'paid': 'تم الدفع',
        'processing': 'جاري التجهيز',
        'shipped': 'خرج للتوصيل',
        'delivered': 'تم التسليم',
        'cancelled': 'ملغي',
        'read': 'مقروءة',
        'unread': 'غير مقروءة',
        'replied': 'تم الرد',
        'active': 'نشط',
        'inactive': 'معطل',
        'approved': 'مقبول',
        'pending_approval': 'معلق',
        'rejected': 'مرفوض'
    };
    return texts[status] || status;
}

function escapeHTML(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            if (modal.parentNode) modal.remove();
        }, 300);
    }
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function confirmAction(message, callback) {
    if (typeof ModalManager !== 'undefined' && ModalManager.confirm) {
        ModalManager.confirm(message, 'تأكيد', callback);
    } else {
        if (confirm(message)) {
            callback();
        }
    }
}

function downloadFile(content, fileName, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('تم النسخ بنجاح', 'success');
    }).catch(() => {
        showToast('فشل النسخ', 'error');
    });
}

// ==================== تصدير الوظائف ====================
window.adminUtils = {
    formatNumber,
    formatDate,
    getStatusColor,
    getStatusText,
    escapeHTML,
    closeModal,
    scrollToTop,
    confirmAction,
    showToast,
    downloadFile,
    copyToClipboard,
    checkAdmin: window.checkAdmin
};

// تعريض الدوال بشكل منفصل أيضاً للاستخدام المباشر
window.showToast = showToast;
window.formatNumber = formatNumber;
window.formatDate = formatDate;
window.escapeHTML = escapeHTML;
window.getStatusColor = getStatusColor;
window.getStatusText = getStatusText;

console.log('✅ تم تحميل admin-utils.js بنجاح (نسخة مصلحة ومكتملة)');