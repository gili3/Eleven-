// utils.js - أدوات مساعدة عامة
// ======================== دوال مساعدة عامة ========================

/**
 * التحقق من صحة البريد الإلكتروني
 */
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
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
 * تحميل الصور مع التعامل مع الأخطاء
 */
function loadImageWithFallback(imgElement, src, fallbackSrc = 'https://via.placeholder.com/300x200?text=صورة') {
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
 * تهيئة تحسينات الأداء
 */
function initPerformanceOptimizations() {
    // تفعيل خاصية التحميل الكسول للصور
    document.addEventListener('DOMContentLoaded', function() {
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    });
}

// ======================== التصدير للاستخدام العام ========================

window.validateEmail = validateEmail;
window.playNotificationSound = playNotificationSound;
window.loadLocalStorageData = loadLocalStorageData;
window.saveLocalStorageData = saveLocalStorageData;
window.formatArabicDate = formatArabicDate;
window.truncateText = truncateText;
window.generateUniqueId = generateUniqueId;
window.loadImageWithFallback = loadImageWithFallback;
window.checkInternetConnection = checkInternetConnection;
window.retryWithBackoff = retryWithBackoff;
window.initPerformanceOptimizations = initPerformanceOptimizations;

console.log('✅ utils.js loaded');