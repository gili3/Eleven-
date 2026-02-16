/**
 * admin-utils.js
 * وظائف مساعدة مشتركة للوحة التحكم
 */

// تنسيق الأرقام
function formatNumber(num) {
    return new Intl.NumberFormat('ar-EG').format(num || 0);
}

// تنسيق التاريخ
function formatDate(timestamp) {
    if (!timestamp) return '---';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// الحصول على لون الحالة
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
        'pending_approval': 'warning'
    };
    return colors[status] || 'secondary';
}

// الحصول على نص الحالة بالعربية
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
        'pending_approval': 'معلق'
    };
    return texts[status] || status;
}

// إغلاق المودال
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            if (modal.parentNode) modal.remove();
        }, 300);
    }
}

// التمرير للأعلى عند فتح قسم
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// عرض رسالة تأكيد
function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// عرض إشعار
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer') || (() => {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        document.body.appendChild(container);
        return container;
    })();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// تحميل ملف
function downloadFile(content, fileName, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
}

// نسخ النص
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('تم النسخ بنجاح', 'success');
    }).catch(() => {
        alert('فشل النسخ');
    });
}

// تصدير الوظائف للنافذة العالمية
window.adminUtils = {
    formatNumber,
    formatDate,
    getStatusColor,
    getStatusText,
    closeModal,
    scrollToTop,
    confirmAction,
    showToast,
    downloadFile,
    copyToClipboard
};