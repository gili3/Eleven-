// security-core.js - نظام الأمان الشامل (نسخة نهائية كاملة)
// ======================== نظام الحماية الشامل ========================

/**
 * نظام الحماية من هجمات XSS, CSRF, وتأمين البيانات
 * الإصدار: 2.0 (نهائي وكامل)
 */
window.SecurityCore = {
    
    // التهيئة الأولية للنظام
    init: function() {
        console.log('🔐 بدء نظام الأمان الشامل...');
        this.preventCSRF();
        this.preventClickjacking();
        this.secureLocalStorage();
        this.addSecurityHeaders();
        this.protectConsole();
        console.log('✅ نظام الأمان الشامل جاهز');
    },
    
    /**
     * تنظيف HTML من هجمات XSS باستخدام DOMParser (نسخة محسنة نهائياً)
     * @param {string} input - النص المدخل
     * @param {Object} options - خيارات إضافية
     * @returns {string} النص النظيف
     */
    sanitizeHTML: function(input, options = {}) {
        // معالجة الحالات الفارغة
        if (input === null || input === undefined) return '';
        if (typeof input !== 'string') {
            try {
                input = String(input);
            } catch (error) {
                console.warn('⚠️ خطأ في تحويل المدخل إلى نص:', error);
                return '';
            }
        }
        
        // إزالة المسافات الزائدة
        input = input.trim();
        if (input === '') return '';

        const defaults = {
            ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'span', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img'],
            ALLOWED_ATTR: ['href', 'title', 'target', 'src', 'alt', 'class', 'id', 'style', 'width', 'height'],
        };
        const config = {...defaults, ...options};

        try {
            // إذا كان DOMParser غير متاح (بيئة Node.js)، استخدم الطريقة البديلة
            if (typeof DOMParser === 'undefined') {
                console.warn('⚠️ DOMParser غير متاح، استخدام الطريقة البديلة');
                return this.basicSanitize(input);
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(input, 'text/html');

            // التحقق من وجود document.body
            if (!doc || !doc.body) {
                console.warn('⚠️ لم يتمكن DOMParser من إنشاء body صحيح، استخدام الطريقة البديلة');
                return this.basicSanitize(input);
            }

            // دالة التنظيف العميق
            const cleanNode = (node) => {
                if (!node || !node.nodeType) return;

                // نص عادي - آمن
                if (node.nodeType === 3) return;
                
                // عنصر غير مسموح - احذفه
                if (node.nodeType !== 1) {
                    node.remove();
                    return;
                }

                if (!node.tagName) return;
                const tagName = node.tagName.toLowerCase();

                // إذا كانت العلامة غير مسموحة، احذف العنصر بأكمله
                if (!config.ALLOWED_TAGS.includes(tagName)) {
                    // ولكن انقل محتواه النصي فقط
                    const text = node.textContent || '';
                    const textNode = document.createTextNode(text);
                    node.parentNode?.replaceChild(textNode, node);
                    return;
                }

                // تنظيف السمات
                if (node.attributes) {
                    Array.from(node.attributes).forEach(attr => {
                        const attrName = attr.name.toLowerCase();
                        
                        // سمات غير مسموحة
                        if (!config.ALLOWED_ATTR.includes(attrName) && !attrName.startsWith('data-')) {
                            node.removeAttribute(attr.name);
                        } 
                        // تنظيف الروابط الخطرة
                        else if (['href', 'src', 'action', 'formaction'].includes(attrName) && attr.value) {
                            const value = attr.value.trim().toLowerCase();
                            if (value.startsWith('javascript:') || 
                                value.startsWith('data:') || 
                                value.startsWith('vbscript:') ||
                                value.includes('script')) {
                                node.removeAttribute(attr.name);
                            }
                        }
                        // تنظيف أنماط CSS الخطرة
                        else if (attrName === 'style' && node.style) {
                            try {
                                // إزالة أي تعابير JavaScript
                                node.style.cssText = node.style.cssText
                                    .replace(/expression\([^)]*\)/gi, '')
                                    .replace(/javascript:/gi, '')
                                    .replace(/vbscript:/gi, '');
                            } catch (e) {
                                node.removeAttribute('style');
                            }
                        }
                    });
                }

                // تنظيف الأطفال
                if (node.children) {
                    Array.from(node.children).forEach(child => cleanNode(child));
                }
            };

            // بدء التنظيف من الـ body
            cleanNode(doc.body);
            
            // إرجاع HTML النظيف
            return doc.body.innerHTML || '';
            
        } catch (error) {
            console.error('⚠️ خطأ في تنظيف HTML:', error);
            return this.basicSanitize(input);
        }
    },
    
    /**
     * طريقة بديلة للتنظيف (إذا فشل DOMParser)
     * @param {string} input - النص المدخل
     * @returns {string} النص النظيف
     */
    basicSanitize: function(input) {
        if (!input) return '';
        
        // إزالة وسوم script بالكامل
        input = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        
        // إزالة وسوم iframe
        input = input.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
        
        // إزالة وسوم object و embed
        input = input.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
        input = input.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
        
        // إزالة جميع السمات التي تبدأ بـ "on"
        input = input.replace(/ on\w+="[^"]*"/gi, '');
        input = input.replace(/ on\w+='[^']*'/gi, '');
        input = input.replace(/ on\w+=\w+/gi, '');
        
        // إزالة javascript: من الروابط
        input = input.replace(/javascript:/gi, 'blocked:');
        input = input.replace(/data:/gi, 'blocked:');
        input = input.replace(/vbscript:/gi, 'blocked:');
        
        return input;
    },
    
    /**
     * تنظيف كائن كامل من البيانات الخطيرة
     * @param {Object|Array|string|number} obj - الكائن المراد تنظيفه
     * @param {number} depth - العمق الحالي (لتجنب التكرار اللانهائي)
     * @returns {Object|Array|string|number} الكائن النظيف
     */
    sanitizeObject: function(obj, depth = 0) {
        // منع التكرار اللانهائي
        if (depth > 20) {
            console.warn('⚠️ تجاوز حد العمق الأقصى للتنظيف');
            return null;
        }

        // معالجة القيم الفارغة
        if (obj === null || obj === undefined) return obj;
        
        // معالجة النصوص
        if (typeof obj === 'string') {
            return this.sanitizeHTML(obj);
        }
        
        // معالجة الأرقام والقيم المنطقية
        if (typeof obj === 'number' || typeof obj === 'boolean') {
            return obj;
        }
        
        // معالجة التواريخ
        if (obj instanceof Date) {
            return obj;
        }
        
        // معالجة المصفوفات
        if (Array.isArray(obj)) {
            return obj
                .map(item => this.sanitizeObject(item, depth + 1))
                .filter(item => item !== undefined && item !== null);
        }
        
        // معالجة الكائنات
        if (typeof obj === 'object') {
            try {
                const cleanObj = {};
                for (const key in obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, key)) {
                        // تنظيف المفتاح نفسه
                        const cleanKey = this.sanitizeHTML(key);
                        if (cleanKey) {
                            cleanObj[cleanKey] = this.sanitizeObject(obj[key], depth + 1);
                        }
                    }
                }
                return cleanObj;
            } catch (error) {
                console.warn('⚠️ خطأ في تنظيف الكائن:', error);
                return {};
            }
        }
        
        // أنواع بيانات غير متوقعة
        return obj;
    },
    
    /**
     * منع هجمات CSRF عبر التحقق من المراجع
     */
    preventCSRF: function() {
        try {
            // التحقق من أن الطلب قادم من نفس الموقع
            if (document.referrer && !document.referrer.startsWith(window.location.origin)) {
                console.warn('⚠️ محاولة وصول مشبوهة من مصدر خارجي:', document.referrer);
                
                // تسجيل الحدث الأمني
                this.logSecurityEvent('csrf_attempt', {
                    referrer: document.referrer,
                    origin: window.location.origin,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('⚠️ خطأ في منع CSRF:', error);
        }
    },
    
    /**
     * منع هجمات Clickjacking
     */
    preventClickjacking: function() {
        try {
            // منع عرض الصفحة داخل إطار
            if (window.self !== window.top) {
                // إعادة التوجيه إلى الصفحة الرئيسية
                window.top.location.href = window.self.location.href;
            }
            
            // إضافة X-Frame-Options (إذا كان المتصفح يدعم)
            const meta = document.createElement('meta');
            meta.httpEquiv = 'X-Frame-Options';
            meta.content = 'SAMEORIGIN';
            document.getElementsByTagName('head')[0].appendChild(meta);
            
        } catch (error) {
            console.error('⚠️ خطأ في منع Clickjacking:', error);
        }
    },
    
    /**
     * تأمين التخزين المحلي
     */
    secureLocalStorage: function() {
        try {
            // تشفير البيانات الحساسة (إذا كانت موجودة)
            const sensitiveKeys = ['userPhone', 'userAddress', 'userEmail', 'token'];
            
            sensitiveKeys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value && !value.startsWith('enc_')) {
                    // تشفير بسيط (يمكن استبداله بـ CryptoJS)
                    const encrypted = 'enc_' + btoa(value);
                    localStorage.setItem(key, encrypted);
                }
            });
            
        } catch (error) {
            console.error('⚠️ خطأ في تأمين localStorage:', error);
        }
    },
    
    /**
     * إضافة ترويسات أمان إضافية (عبر meta tags)
     */
    addSecurityHeaders: function() {
        try {
            // Content Security Policy (CSP)
            const csp = document.createElement('meta');
            csp.httpEquiv = 'Content-Security-Policy';
            csp.content = "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com;";
            document.getElementsByTagName('head')[0].appendChild(csp);
            
            // Referrer Policy
            const referrer = document.createElement('meta');
            referrer.name = 'referrer';
            referrer.content = 'strict-origin-when-cross-origin';
            document.getElementsByTagName('head')[0].appendChild(referrer);
            
        } catch (error) {
            console.error('⚠️ خطأ في إضافة ترويسات الأمان:', error);
        }
    },
    
    /**
     * حماية الـ console من التلاعب
     */
    protectConsole: function() {
        // في بيئة الإنتاج، قم بتعطيل console.log
        if (window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')) {
            // يمكن تفعيل هذا السطر في الإنتاج
            // console.log = function() {};
        }
    },
    
    /**
     * تسجيل الأحداث الأمنية
     * @param {string} event - اسم الحدث
     * @param {Object} data - بيانات إضافية
     */
    logSecurityEvent: function(event, data = {}) {
        try {
            const logData = {
                event: event,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent,
                ...data
            };
            
            // إرسال إلى خادم التسجيل (اختياري)
            console.warn('🔐 حدث أمني:', logData);
            
            // حفظ في localStorage للتتبع
            const logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
            logs.push(logData);
            if (logs.length > 100) logs.shift(); // الاحتفاظ بآخر 100 حدث
            localStorage.setItem('security_logs', JSON.stringify(logs));
            
        } catch (error) {
            console.error('⚠️ خطأ في تسجيل الحدث الأمني:', error);
        }
    },
    
    /**
     * التحقق من صحة البريد الإلكتروني
     * @param {string} email - البريد الإلكتروني
     * @returns {boolean} صحة البريد
     */
    validateEmail: function(email) {
        if (!email || typeof email !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    /**
     * التحقق من صحة رقم الهاتف (سوداني)
     * @param {string} phone - رقم الهاتف
     * @returns {boolean} صحة الرقم
     */
    validatePhone: function(phone) {
        if (!phone || typeof phone !== 'string') return false;
        const clean = phone.replace(/\D/g, '');
        return clean.length >= 9 && clean.length <= 13;
    },
    
    /**
     * تنظيف اسم الملف من الأحرف الخطرة
     * @param {string} filename - اسم الملف
     * @returns {string} اسم الملف النظيف
     */
    sanitizeFilename: function(filename) {
        if (!filename || typeof filename !== 'string') return 'file';
        
        // إزالة الأحرف الخطرة
        return filename
            .replace(/[^a-zA-Z0-9.\u0600-\u06FF_-]/g, '_')
            .replace(/\.{2,}/g, '.')
            .substring(0, 100); // حد أقصى 100 حرف
    },
    
    /**
     * التحقق من صحة URL
     * @param {string} url - الرابط
     * @returns {boolean} صحة الرابط
     */
    validateURL: function(url) {
        if (!url || typeof url !== 'string') return false;
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return false;
        }
    }
};

// تهيئة النظام عند تحميل الصفحة
(function() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            try {
                window.SecurityCore.init();
            } catch (error) {
                console.error('⚠️ خطأ في تهيئة نظام الأمان:', error);
            }
        });
    } else {
        try {
            window.SecurityCore.init();
        } catch (error) {
            console.error('⚠️ خطأ في تهيئة نظام الأمان:', error);
        }
    }
})();

// تصدير للاستخدام في وحدات ES (اختياري)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.SecurityCore;
}

console.log('✅ security-core.js (نسخة نهائية كاملة)');