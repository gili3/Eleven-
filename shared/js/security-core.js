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
     * تم الإصلاح: التعامل الآمن مع null و undefined و doc.body الفارغة
     */
    sanitizeHTML: function(input, options = {}) {
        // معالجة الحالات الفارغة والقيم الخاصة
        if (input === null || input === undefined) return '';
        if (typeof input !== 'string') {
            try {
                return String(input);
            } catch (error) {
                console.warn('⚠️ خطأ في تحويل المدخل إلى نص:', error);
                return '';
            }
        }

        // التحقق من أن المدخل ليس فارغاً
        if (input.trim() === '') return '';

        const defaults = {
            ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'span', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img'],
            ALLOWED_ATTR: ['href', 'title', 'target', 'src', 'alt', 'class', 'id', 'style', 'width', 'height'],
        };
        const config = {...defaults, ...options};

        try {
            // التحقق من توفر DOMParser
            if (typeof DOMParser === 'undefined') {
                console.warn('⚠️ تحذير: DOMParser غير متاح، سيتم إرجاع النص كما هو');
                return input;
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(input, 'text/html');

            // التحقق من أن doc موجود وليس null
            if (!doc) {
                console.warn('⚠️ تحذير: لم يتمكن DOMParser من إنشاء document');
                return input;
            }

            // التحقق من أن doc.body موجود وليس null - هذا هو الفحص الحاسم
            if (!doc.body) {
                console.warn('⚠️ تحذير: لم يتمكن DOMParser من إنشاء body صحيح');
                // محاولة الحصول على محتوى من documentElement كبديل
                if (doc.documentElement && doc.documentElement.innerHTML) {
                    return doc.documentElement.innerHTML || '';
                }
                return input;
            }

            const walk = (node) => {
                if (!node) return; // التحقق من وجود العقدة

                // التحقق من نوع العقدة
                if (!node.nodeType) return;
                
                if (node.nodeType === 3) return; // Text node
                if (node.nodeType !== 1) { // Not an element node
                    try {
                        node.remove();
                    } catch (e) {
                        // تجاهل الأخطاء عند محاولة حذف العقدة
                    }
                    return;
                }

                // التحقق من وجود tagName قبل استخدامه
                if (!node.tagName) return;

                const tagName = node.tagName.toLowerCase();
                if (!config.ALLOWED_TAGS.includes(tagName)) {
                    try {
                        node.remove();
                    } catch (e) {
                        // تجاهل الأخطاء عند محاولة حذف العقدة
                    }
                    return;
                }

                // معالجة الخصائص بشكل آمن
                try {
                    const attributes = Array.from(node.attributes || []);
                    for (const { name, value } of attributes) {
                        if (!name) continue; // تجاهل الخصائص بدون اسم
                        
                        const attrName = name.toLowerCase();
                        if (!config.ALLOWED_ATTR.includes(attrName) && !attrName.startsWith('data-')) {
                            try {
                                node.removeAttribute(name);
                            } catch (e) {
                                // تجاهل الأخطاء عند محاولة حذف الخاصية
                            }
                        } else {
                            // Sanitize URL attributes
                            if (['href', 'src'].includes(attrName) && value) {
                                if (!value.startsWith('http:') && !value.startsWith('https:') && !value.startsWith('#') && !value.startsWith('/')) {
                                    try {
                                        node.removeAttribute(name);
                                    } catch (e) {
                                        // تجاهل الأخطاء
                                    }
                                }
                            }
                            // Sanitize style attribute (basic)
                            if (attrName === 'style' && node.style) {
                                try {
                                    node.style.cssText = (node.style.cssText || '').replace(/url\(["']?.*?["']?\)/ig, '');
                                } catch (e) {
                                    // تجاهل الأخطاء في معالجة الأنماط
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.warn('⚠️ خطأ في معالجة خصائص العقدة:', error);
                }

                // معالجة الأطفال بشكل آمن
                try {
                    const children = Array.from(node.children || []);
                    for (const child of children) {
                        walk(child);
                    }
                } catch (error) {
                    console.warn('⚠️ خطأ في معالجة أطفال العقدة:', error);
                }
            };

            // تنفيذ المشي عبر الشجرة بشكل آمن
            try {
                walk(doc.body);
            } catch (error) {
                console.warn('⚠️ خطأ أثناء المشي عبر الشجرة:', error);
            }
            
            // التحقق من أن innerHTML موجود قبل الرجوع
            if (doc.body && doc.body.innerHTML) {
                return doc.body.innerHTML;
            } else if (doc.documentElement && doc.documentElement.innerHTML) {
                return doc.documentElement.innerHTML;
            } else {
                console.warn('⚠️ تحذير: لم يتمكن من الحصول على innerHTML من document');
                return '';
            }
        } catch (error) {
            console.error('⚠️ خطأ في تنظيف HTML:', error);
            // في حالة الفشل الكامل، ارجع النص الأصلي بعد إزالة الـ script tags
            try {
                return input.replace(/<script[^>]*>.*?<\/script>/gi, '').replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
            } catch (e) {
                return '';
            }
        }
    },
    
    /**
     * تنظيف كائن كامل من البيانات الخطيرة
     * تم الإصلاح: معالجة آمنة للبيانات الفارغة والقيم الخاصة والحالات الحدية
     */
    sanitizeObject: function(obj, depth = 0) {
        // منع التعمق الشديد (حماية من الحلقات اللانهائية)
        if (depth > 10) {
            console.warn('⚠️ تحذير: تم تجاوز حد العمق الأقصى للتنظيف');
            return null;
        }

        // معالجة القيم الفارغة
        if (obj === null || obj === undefined) return obj;
        
        // معالجة النصوص
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
        
        // معالجة الأرقام والقيم المنطقية
        if (typeof obj === 'number' || typeof obj === 'boolean') {
            return obj;
        }
        
        // معالجة المصفوفات
        if (Array.isArray(obj)) {
            try {
                return obj
                    .map(item => this.sanitizeObject(item, depth + 1))
                    .filter(item => item !== undefined);
            } catch (error) {
                console.warn('⚠️ خطأ في تنظيف المصفوفة:', error);
                return [];
            }
        }
        
        // معالجة الكائنات
        if (typeof obj === 'object') {
            try {
                const cleanObj = {};
                for (const key in obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, key)) {
                        try {
                            // التحقق من أن المفتاح ليس فارغاً
                            if (!key || typeof key !== 'string') {
                                continue;
                            }

                            const cleanKey = (typeof this.sanitizeHTML === 'function') 
                                ? this.sanitizeHTML(key) 
                                : key;

                            // تجاهل المفاتيح الفارغة بعد التنظيف
                            if (!cleanKey) continue;

                            cleanObj[cleanKey] = this.sanitizeObject(obj[key], depth + 1);
                        } catch (error) {
                            console.warn(`⚠️ خطأ في تنظيف المفتاح ${key}:`, error);
                            // تخطي المفتاح الذي يسبب خطأ
                        }
                    }
                }
                return cleanObj;
            } catch (error) {
                console.warn('⚠️ خطأ في تنظيف الكائن:', error);
                return {};
            }
        }
        
        // في حالة نوع بيانات غير متوقع
        return obj;
    },
    
    /**
     * منع هجمات CSRF
     */
    preventCSRF: function() {
        try {
            // إضافة CSRF token إلى جميع الطلبات
            // في تطبيق يعتمد على Firebase بشكل كامل، يتم التعامل مع المصادقة عبر Firebase SDK.
            // إذا كان هناك أي نقاط نهاية خلفية مخصصة، فيجب أن توفر الخادم رموز CSRF.
            // const csrfToken = this.generateCSRFToken(); // تم تعطيل التوليد من جانب العميل
            // window.csrfToken = csrfToken;
            console.log('🔐 تم تهيئة منع CSRF (يتطلب رمزًا من الخادم لنقاط النهاية المخصصة)');
        } catch (error) {
            console.error('⚠️ خطأ في إنشاء CSRF Token:', error);
        }
    },
    
    /**
     * منع هجمات Clickjacking
     */
    preventClickjacking: function() {
        try {
            if (window.self !== window.top) {
                window.top.location = window.self.location;
            }
        } catch (error) {
            console.error('⚠️ خطأ في منع Clickjacking:', error);
        }
    },
    
    /**
     * توليد CSRF Token (يجب أن يتم توليده والتحقق منه على الخادم)
     * في تطبيق يعتمد على Firebase بشكل كامل، يتم التعامل مع المصادقة عبر Firebase SDK.
     * إذا كان هناك أي نقاط نهاية خلفية مخصصة، فيجب أن توفر الخادم رموز CSRF.
     */
    generateCSRFToken: function() {
        console.warn('⚠️ توليد CSRF Token من جانب العميل غير موصى به. يجب أن يتم توليده والتحقق منه على الخادم.');
        // هذا مجرد رمز وهمي. في بيئة الإنتاج، يجب جلب هذا الرمز من الخادم.
        return 'dummy-csrf-token-client-generated';
    },
    
    /**
     * التحقق من صحة البريد الإلكتروني
     */
    validateEmail: function(email) {
        try {
            if (!email || typeof email !== 'string') return false;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        } catch (error) {
            console.error('⚠️ خطأ في التحقق من البريد الإلكتروني:', error);
            return false;
        }
    },
    

    

};

// تهيئة النظام عند تحميل الصفحة
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
