
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
     */
    sanitizeHTML: function(input, options = {}) {
        if (input === null || input === undefined) return '';
        if (typeof input !== 'string') return String(input);

        const defaults = {
            ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'span', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img'],
            ALLOWED_ATTR: ['href', 'title', 'target', 'src', 'alt', 'class', 'id', 'style', 'width', 'height'],
        };
        const config = {...defaults, ...options};

        const parser = new DOMParser();
        const doc = parser.parseFromString(input, 'text/html');

        const walk = (node) => {
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

            const attributes = Array.from(node.attributes);
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
                    if (attrName === 'style') {
                        node.style.cssText = node.style.cssText.replace(/url\(["']?.*?["']?\)/ig, '');
                    }
                }
            }

            for (const child of Array.from(node.children)) {
                walk(child);
            }
        };

        walk(doc.body);
        return doc.body.innerHTML;
    },
    
    /**
     * تنظيف كائن كامل من البيانات الخطيرة
     */
    sanitizeObject: function(obj, depth = 0) {
        if (depth > 10) return null; // منع التعمق الشديد
        if (obj === null || obj === undefined) return obj;
        
        if (typeof obj === 'string') {
            return this.sanitizeHTML(obj);
        }
        
        if (typeof obj === 'number' || typeof obj === 'boolean') {
            return obj;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item, depth + 1));
        }
        
        if (typeof obj === 'object') {
            const cleanObj = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    const cleanKey = this.sanitizeHTML(key);
                    cleanObj[cleanKey] = this.sanitizeObject(obj[key], depth + 1);
                }
            }
            return cleanObj;
        }
        
        return String(obj);
    },

    /**
     * منع هجمات CSRF
     */
    preventCSRF: function() {
        if (!sessionStorage.getItem('csrf_token')) {
            const token = this.generateCSRFToken();
            sessionStorage.setItem('csrf_token', token);
        }
        
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            const token = sessionStorage.getItem('csrf_token');
            if (token && options.method && options.method.toUpperCase() !== 'GET') {
                options.headers = {
                    ...options.headers,
                    'X-CSRF-Token': token,
                    'X-Requested-With': 'XMLHttpRequest'
                };
            }
            return originalFetch(url, options);
        };
    },
    
    generateCSRFToken: function() {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    preventClickjacking: function() {
        if (window.top !== window.self) {
            window.top.location.href = window.self.location.href;
        }
    },
};

/**
 * نظام تخزين آمن باستخدام Web Crypto API (AES-GCM)
 */
window.SecureStorage = {
    _key: null,

    // جلب أو توليد مفتاح التشفير
    async getKey() {
        if (this._key) return this._key;

        try {
            let keyData = sessionStorage.getItem('encryption_key');
            if (keyData) {
                const jwk = JSON.parse(keyData);
                this._key = await window.crypto.subtle.importKey(
                    'jwk',
                    jwk,
                    { name: 'AES-GCM' },
                    true,
                    ['encrypt', 'decrypt']
                );
            } else {
                this._key = await window.crypto.subtle.generateKey(
                    { name: 'AES-GCM', length: 256 },
                    true,
                    ['encrypt', 'decrypt']
                );
                const jwk = await window.crypto.subtle.exportKey('jwk', this._key);
                sessionStorage.setItem('encryption_key', JSON.stringify(jwk));
            }
            return this._key;
        } catch (error) {
            console.error('❌ خطأ في إدارة مفتاح التشفير:', error);
            throw new Error('لا يمكن إعداد مفتاح التشفير.');
        }
    },

    // تشفير البيانات
    async encrypt(data) {
        try {
            const key = await this.getKey();
            const text = JSON.stringify(data);
            const encoded = new TextEncoder().encode(text);
            
            const iv = window.crypto.getRandomValues(new Uint8Array(12)); // IV for AES-GCM
            
            const ciphertext = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encoded
            );
            
            // دمج IV مع البيانات المشفرة
            const combined = new Uint8Array(iv.length + ciphertext.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(ciphertext), iv.length);
            
            // تحويل إلى Base64 لتسهيل التخزين
            return btoa(String.fromCharCode.apply(null, combined));
        } catch (error) {
            console.error('❌ خطأ في التشفير:', error);
            return null;
        }
    },

    // فك تشفير البيانات
    async decrypt(encryptedData) {
        try {
            const key = await this.getKey();
            const combined = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
            
            const iv = combined.slice(0, 12);
            const ciphertext = combined.slice(12);

            const decrypted = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                ciphertext
            );

            const decoded = new TextDecoder().decode(decrypted);
            return JSON.parse(decoded);
        } catch (error) {
            console.error('❌ خطأ في فك التشفير:', error);
            return null;
        }
    },

    // تخزين البيانات بشكل آمن
    async setItem(key, value) {
        try {
            const encryptedValue = await this.encrypt(value);
            if (encryptedValue) {
                localStorage.setItem(`secure_${key}`, encryptedValue);
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ خطأ في التخزين الآمن:', error);
            return false;
        }
    },

    // قراءة البيانات بشكل آمن
    async getItem(key) {
        try {
            const encryptedValue = localStorage.getItem(`secure_${key}`);
            if (!encryptedValue) return null;
            return await this.decrypt(encryptedValue);
        } catch (error) {
            console.error('❌ خطأ في القراءة الآمنة:', error);
            return null;
        }
    },

    // إزالة البيانات
    removeItem(key) {
        localStorage.removeItem(`secure_${key}`);
    },

    // مسح كل البيانات المشفرة
    clear() {
        Object.keys(localStorage)
            .filter(key => key.startsWith('secure_'))
            .forEach(key => localStorage.removeItem(key));
        sessionStorage.removeItem('encryption_key');
        this._key = null;
    }
};

// تهيئة نظام الحماية عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.SecurityCore.init();
});
