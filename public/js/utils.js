// utils.js - أدوات مساعدة عامة (نسخة محسنة)
// ======================== دوال مساعدة عامة ========================

/**
 * تنسيق الأرقام بإضافة فواصل الآلاف
 */
function formatNumber(num) {
    if (num === null || num === undefined) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * التحقق من صحة البريد الإلكتروني
 */
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

/**
 * التحقق من صحة رقم الهاتف (سوداني)
 */
function isValidPhone(phone) {
    if (!phone) return false;
    const cleanPhone = phone.replace(/\D/g, '');
    return (cleanPhone.length >= 9 && cleanPhone.length <= 13);
}

/**
 * تنسيق رقم الهاتف السوداني
 */
function formatSudanPhone(phone) {
    if (!phone) return '';
    
    let clean = phone.replace(/\D/g, '');
    
    if (clean.startsWith('0')) {
        clean = '249' + clean.substring(1);
    } else if (!clean.startsWith('249')) {
        clean = '249' + clean;
    }
    
    return '+' + clean;
}

/**
 * تشغيل صوت تنبيه
 */
function playNotificationSound() {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
        audio.volume = 0.3;
        audio.play().catch(() => {});
    } catch (e) {
        // تجاهل الأخطاء الصوتية
    }
}

/**
 * تحميل البيانات المخزنة محلياً
 */
function loadLocalStorageData() {
    try {
        const savedPhone = localStorage.getItem('userPhone');
        const savedAddress = localStorage.getItem('userAddress');
        
        return {
            phone: savedPhone || '',
            address: savedAddress || ''
        };
    } catch (e) {
        console.error('خطأ في تحميل البيانات المحلية:', e);
        return { phone: '', address: '' };
    }
}

/**
 * حفظ البيانات محلياً
 */
function saveLocalStorageData(phone, address) {
    try {
        if (phone) localStorage.setItem('userPhone', phone);
        if (address) localStorage.setItem('userAddress', address);
        return true;
    } catch (e) {
        console.error('خطأ في حفظ البيانات المحلية:', e);
        return false;
    }
}

/**
 * تحويل التاريخ إلى صيغة عربية
 */
function formatArabicDate(date) {
    if (!date) return 'غير محدد';
    
    try {
        const dateObj = date.toDate ? date.toDate() : new Date(date);
        return dateObj.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return 'تاريخ غير صالح';
    }
}

/**
 * تقصير النصوص الطويلة
 */
function truncateText(text, maxLength = 100) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * إنشاء معرف فريد
 */
function generateUniqueId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * إنشاء معرف ضيف فريد
 */
function generateGuestUID() {
    return 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * تحميل الصور مع التعامل مع الأخطاء
 */
function loadImageWithFallback(imgElement, src, fallbackSrc = 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png') {
    if (!imgElement) return;
    
    imgElement.src = src;
    imgElement.onerror = function() {
        this.src = fallbackSrc;
        this.onerror = null;
    };
}

/**
 * التحقق من اتصال الإنترنت
 */
function checkInternetConnection() {
    return navigator.onLine;
}

/**
 * إعادة المحاولة بعد فشل
 */
async function retryWithBackoff(fn, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
    }
}

/**
 * تحديث عنصر بشكل آمن
 */
function safeElementUpdate(id, value, isHTML = false) {
    const element = document.getElementById(id);
    if (element) {
        if (isHTML) {
            element.innerHTML = window.SecurityCore?.sanitizeHTML(value) || value;
        } else {
            element.textContent = value;
        }
        return true;
    }
    return false;
}

/**
 * تنظيف النصوص من وسوم HTML
 */
function sanitizeHTML(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

/**
 * تنظيف مدخلات المستخدم
 */
function sanitizeUserInput(input) {
    if (!input || typeof input !== 'string') return input;
    return input.replace(/[<>]/g, '');
}

/**
 * تحسين رابط الصورة
 */
function optimizeImageUrl(url, width = 300) {
    if (!url) return 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png';
    if (!url.includes('firebasestorage')) return url;
    
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}alt=media&width=${width}&quality=75`;
}

/**
 * إظهار مؤشر التحميل
 */
function showLoadingSpinner(message = 'جاري التحميل...') {
    // إخفاء أي مؤشر موجود
    hideLoadingSpinner();
    
    const spinner = document.createElement('div');
    spinner.id = 'customLoadingSpinner';
    spinner.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); display: flex; flex-direction: column;
        justify-content: center; align-items: center; z-index: 9999;
        color: white; font-family: 'Cairo';
    `;
    spinner.innerHTML = `
        <div class="loader-spinner" style="width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid var(--primary-color, #c9a24d); border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <p style="margin-top: 15px;">${message}</p>
    `;
    document.body.appendChild(spinner);
}

/**
 * إخفاء مؤشر التحميل
 */
function hideLoadingSpinner() {
    const spinner = document.getElementById('customLoadingSpinner');
    if (spinner) spinner.remove();
}

/**
 * متغير خاص لتتبع وقت آخر إشعار
 * ملاحظة: نستخدم window لتجنب التصادم مع المتغيرات الأخرى
 */
if (typeof window.__lastToastTime === 'undefined') {
    window.__lastToastTime = 0;
}

/**
 * إظهار إشعار
 */
function showToast(message, type = 'info', duration = 3000) {
    const now = Date.now();
    if (now - window.__lastToastTime < 300) return;
    window.__lastToastTime = now;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fas fa-info-circle';
    let bgColor = '#3498db';
    
    switch(type) {
        case 'success':
            icon = 'fas fa-check-circle';
            bgColor = '#27ae60';
            break;
        case 'error':
            icon = 'fas fa-times-circle';
            bgColor = '#e74c3c';
            break;
        case 'warning':
            icon = 'fas fa-exclamation-circle';
            bgColor = '#f39c12';
            break;
    }
    
    toast.innerHTML = `<div style="display: flex; align-items: center; gap: 10px;"><i class="${icon}"></i><span>${message}</span></div>`;
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; 
        background: ${bgColor}; color: white; 
        padding: 15px 20px; border-radius: 8px; 
        box-shadow: 0 4px 12px rgba(0,0,0,0.15); 
        z-index: 10000; font-family: 'Cairo'; 
        animation: slideInUp 0.3s ease; 
        max-width: 300px;
        direction: rtl;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * تهيئة تحسينات الأداء
 */
function initPerformanceOptimizations() {
    // تفعيل التحميل الكسول للصور
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    observer.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => imageObserver.observe(img));
    }
}

// إضافة أنماط CSS للحركات
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInUp {
        from {
            transform: translateY(100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutDown {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(100%);
            opacity: 0;
        }
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// ======================== التصدير للاستخدام العام ========================

window.formatNumber = formatNumber;
window.validateEmail = validateEmail;
window.isValidPhone = isValidPhone;
window.formatSudanPhone = formatSudanPhone;
window.playNotificationSound = playNotificationSound;
window.loadLocalStorageData = loadLocalStorageData;
window.saveLocalStorageData = saveLocalStorageData;
window.formatArabicDate = formatArabicDate;
window.truncateText = truncateText;
window.generateUniqueId = generateUniqueId;
window.generateGuestUID = generateGuestUID;
window.loadImageWithFallback = loadImageWithFallback;
window.checkInternetConnection = checkInternetConnection;
window.retryWithBackoff = retryWithBackoff;
window.safeElementUpdate = safeElementUpdate;
window.sanitizeHTML = sanitizeHTML;
window.sanitizeUserInput = sanitizeUserInput;
window.optimizeImageUrl = optimizeImageUrl;
window.showLoadingSpinner = showLoadingSpinner;
window.hideLoadingSpinner = hideLoadingSpinner;
window.showToast = showToast;
window.initPerformanceOptimizations = initPerformanceOptimizations;

console.log('✅ utils.js المحسن loaded');