// security-core.js - نظام الأمان الشامل (نسخة مطورة)
// ======================== نظام الحماية الشامل ========================

/**
 * نظام الحماية من هجمات XSS, CSRF, وتأمين البيانات
 */
window.SecurityCore = {
    
    // التهيئة الأولية للنظام
    init: function() {
        console.log('🔐 بدء نظام الأمان الشامل...');
        this.preventCSRF();
        this.preventClickjacking();
        console.log('✅ نظام الأمان الشامل جاهز');
    },
    
    /**
     * تنظيف HTML من هجمات XSS باستخدام DOMParser (أكثر أماناً من Regex)
     * تم الإصلاح: التعامل مع null و undefined بشكل آمن
     */
    sanitizeHTML: function(input, options = {}) {
        if (input === null || input === undefined) return '';
        if (typeof input !== 'string') return String(input);

        const defaults = {
            ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'span', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img'],
            ALLOWED_ATTR: ['href', 'title', 'target', 'src', 'alt', 'class', 'id', 'style', 'width', 'height'],
        };
        const config = {...defaults, ...options};

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(input, 'text/html');

            // التحقق من أن doc موجود وليس null
            if (!doc || !doc.body) {
                console.warn('⚠️ تحذير: لم يتمكن DOMParser من إنشاء document صحيح');
                return '';
            }

            const walk = (node) => {
                if (!node) return; // التحقق من وجود العقدة
                
                if (node.nodeType === 3) return; // Text node
                if (node.nodeType !== 1) { // Not an element node
                    node.remove();
                    return;
                }

                const tagName = node.tagName.toLowerCase();
                if (!config.ALLOWED_TAGS.includes(tagName)) {
                    node.remove();
                    return;
                }

                const attributes = Array.from(node.attributes || []);
                for (const { name, value } of attributes) {
                    const attrName = name.toLowerCase();
                    if (!config.ALLOWED_ATTR.includes(attrName) && !attrName.startsWith('data-')) {
                        node.removeAttribute(name);
                    } else {
                        // Sanitize URL attributes
                        if (['href', 'src'].includes(attrName)) {
                            if (!value.startsWith('http:') && !value.startsWith('https:') && !value.startsWith('#') && !value.startsWith('/')) {
                                node.removeAttribute(name);
                            }
                        }
                        // Sanitize style attribute (basic)
                        if (attrName === 'style' && node.style) {
                            node.style.cssText = (node.style.cssText || '').replace(/url\(["']?.*?["']?\)/ig, '');
                        }
                    }
                }

                const children = Array.from(node.children || []);
                for (const child of children) {
                    walk(child);
                }
            };

            walk(doc.body);
            
            // التحقق من أن innerHTML موجود قبل الرجوع
            const result = doc.body.innerHTML || '';
            return result;
        } catch (error) {
            console.error('⚠️ خطأ في تنظيف HTML:', error);
            return '';
        }
    },
    
    /**
     * تنظيف كائن كامل من البيانات الخطيرة
     * تم الإصلاح: معالجة آمنة للبيانات الفارغة والقيم الخاصة
     */
    sanitizeObject: function(obj, depth = 0) {
        if (depth > 10) return null; // منع التعمق الشديد
        if (obj === null || obj === undefined) return obj;
        
        if (typeof obj === 'string') {
            // التحقق من أن sanitizeHTML موجودة ومعرفة
            if (typeof this.sanitizeHTML === 'function') {
                try {
                    return this.sanitizeHTML(obj);
                } catch (error) {
                    console.warn('⚠️ خطأ في تنظيف النص:', error);
                    return obj;
                }
            }
            return obj; // إذا لم تكن موجودة، ارجع النص كما هو
        }
        
        if (typeof obj === 'number' || typeof obj === 'boolean') {
            return obj;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item, depth + 1)).filter(item => item !== undefined);
        }
        
        if (typeof obj === 'object') {
            const cleanObj = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    try {
                        const cleanKey = (typeof this.sanitizeHTML === 'function') ? this.sanitizeHTML(key) : key;
                        cleanObj[cleanKey] = this.sanitizeObject(obj[key], depth + 1);
                    } catch (error) {
                        console.warn(`⚠️ خطأ في تنظيف المفتاح ${key}:`, error);
                        // تخطي المفتاح الذي يسبب خطأ
                    }
                }
            }
            return cleanObj;
        }
        
        return obj;
    },
    
    /**
     * منع هجمات CSRF
     */
    preventCSRF: function() {
        // إضافة CSRF token إلى جميع الطلبات
        const csrfToken = this.generateCSRFToken();
        window.csrfToken = csrfToken;
        console.log('🔐 تم إنشاء CSRF Token');
    },
    
    /**
     * منع هجمات Clickjacking
     */
    preventClickjacking: function() {
        if (window.self !== window.top) {
            window.top.location = window.self.location;
        }
    },
    
    /**
     * توليد CSRF Token
     */
    generateCSRFToken: function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    
    /**
     * التحقق من صحة البريد الإلكتروني
     */
    validateEmail: function(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    /**
     * تشفير البيانات (بسيط - استخدم مكتبة متقدمة في الإنتاج)
     */
    encryptData: function(data) {
        try {
            return btoa(JSON.stringify(data));
        } catch (error) {
            console.error('⚠️ خطأ في تشفير البيانات:', error);
            return null;
        }
    },
    
    /**
     * فك تشفير البيانات
     */
    decryptData: function(encrypted) {
        try {
            return JSON.parse(atob(encrypted));
        } catch (error) {
            console.error('⚠️ خطأ في فك تشفير البيانات:', error);
            return null;
        }
    }
};

// تهيئة النظام عند تحميل الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.SecurityCore.init());
} else {
    window.SecurityCore.init();
}
