// auth-system.js - نظام المصادقة والمستخدمين (نسخة محسنة أمنياً - مصلحة)
// ======================== معالجة حالة المصادقة ========================

// دوال مساعدة للتشفير وفك التشفير (استخدام Web Crypto API)
const AuthSecurity = {
    _key: null,

    // جلب أو توليد مفتاح التشفير
    async getKey() {
        if (this._key) return this._key;
        try {
            // ✅ تم الإصلاح: استخدام sessionStorage بدلاً من localStorage
            let keyData = sessionStorage.getItem('auth_encryption_key');
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
                // ✅ تم الإصلاح: حفظ في sessionStorage (ينتهي عند إغلاق المتصفح)
                sessionStorage.setItem('auth_encryption_key', JSON.stringify(jwk));
            }
            return this._key;
        } catch (error) {
            console.error('❌ خطأ في إدارة مفتاح التشفير:', error);
            throw error;
        }
    },

    // تشفير البيانات قبل التخزين
    async encryptData(data) {
        try {
            const key = await this.getKey();
            const text = JSON.stringify(data);
            const encoded = new TextEncoder().encode(text);
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            
            const ciphertext = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encoded
            );
            
            const combined = new Uint8Array(iv.length + ciphertext.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(ciphertext), iv.length);
            
            return btoa(String.fromCharCode.apply(null, combined));
        } catch (e) {
            console.error('❌ خطأ في تشفير البيانات:', e);
            return null;
        }
    },
    
    // فك تشفير البيانات بعد الاسترجاع
    async decryptData(encryptedData) {
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
        } catch (e) {
            console.error('❌ خطأ في فك تشفير البيانات:', e);
            return null;
        }
    },
    
    // تنظيف وتحقق من بيانات المستخدم
    // تم الإصلاح: معالجة آمنة للبيانات الفارغة والقيم الخاصة
    sanitizeUserData: function(userData) {
        if (!userData || typeof userData !== 'object') return null;
        
        // استخدام SecurityCore إذا كان متاحاً
        if (window.SecurityCore && typeof window.SecurityCore.sanitizeObject === 'function') {
            try {
                const sanitized = window.SecurityCore.sanitizeObject(userData);
                return sanitized && typeof sanitized === 'object' ? sanitized : null;
            } catch (error) {
                console.error('خطأ في تنظيف بيانات المستخدم:', error);
                // المتابعة بالتنظيف الأساسي
            }
        }
        
        // تنظيف أساسي إذا لم يكن SecurityCore متاحاً
        try {
            const cleaned = {};
            for (const key in userData) {
                if (Object.prototype.hasOwnProperty.call(userData, key)) {
                    const value = userData[key];
                    if (typeof value === 'string') {
                        cleaned[key] = value.replace(/<script[^>]*>.*?<\/script>/gi, '').replace(/<[^>]+>/g, '');
                    } else if (value !== null && value !== undefined) {
                        cleaned[key] = value;
                    }
                }
            }
            return Object.keys(cleaned).length > 0 ? cleaned : null;
        } catch (error) {
            console.error('خطأ في التنظيف الأساسي:', error);
            return null;
        }
    },
    
    // حفظ بيانات المستخدم بشكل آمن (يتم حفظها في Firebase بدلاً من localStorage فقط)
    async saveUserData(userData, useSession = true) {
        try {
            const sanitized = this.sanitizeUserData(userData);
            if (!sanitized) return false;
            
            const encrypted = await this.encryptData(sanitized);
            if (!encrypted) return false;
        
            try {
                // ✅ تم الإصلاح: استخدام sessionStorage افتراضياً (أكثر أماناً)
                sessionStorage.setItem('_usr', encrypted);
                // حذف من localStorage إن وجد (تنظيف البيانات القديمة)
                localStorage.removeItem('_usr');
            } catch (error) {
                console.error('❌ خطأ في حفظ بيانات المستخدم:', error);
                return false;
            }
            
            // حفظ في Firebase أيضاً للتزامن عبر الأجهزة
            if (window.currentUser && !window.currentUser.isGuest && window.db) {
                this.syncUserDataToFirebase(sanitized).catch(e => {
                    console.warn('⚠️ تعذر مزامنة البيانات مع Firebase:', e);
                });
            }
            
            return true;
        } catch (e) {
            console.error('❌ خطأ في حفظ البيانات:', e);
            return false;
        }
    },
    
    // استرجاع بيانات المستخدم بشكل آمن
    async loadUserData() {
        try {
            // ✅ تم الإصلاح: البحث في sessionStorage فقط (أكثر أماناً)
            const encrypted = sessionStorage.getItem('_usr');
            if (!encrypted) {
                // محاولة تحميل من localStorage القديم وتحويله
                const oldEncrypted = localStorage.getItem('_usr');
                if (oldEncrypted) {
                    const decrypted = await this.decryptData(oldEncrypted);
                    if (decrypted) {
                        // حفظ في sessionStorage الآمن
                        await this.saveUserData(decrypted, true);
                        // حذف من localStorage
                        localStorage.removeItem('_usr');
                        return decrypted;
                    }
                }
                return null;
            }
            
            const decrypted = await this.decryptData(encrypted);
            if (!decrypted) return null;
            
            return this.sanitizeUserData(decrypted);
        } catch (e) {
            console.error('❌ خطأ في تحميل البيانات:', e);
            return null;
        }
    },
    
    // حذف بيانات المستخدم
    clearUserData: function() {
        // ✅ تم الإصلاح: حذف شامل من جميع أماكن التخزين
        localStorage.removeItem('_usr');
        sessionStorage.removeItem('_usr');
        sessionStorage.removeItem('auth_encryption_key');
        // حذف البيانات القديمة غير المشفرة
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
        // حذف بيانات السلة
        localStorage.removeItem('cart');
        sessionStorage.removeItem('cart');
        this._key = null;
        console.log('✅ تم تنظيف جميع بيانات المستخدم');
    },
    
    // مزامنة بيانات المستخدم مع Firebase
    syncUserDataToFirebase: async function(userData) {
        try {
            if (!window.currentUser || !window.currentUser.uid || window.currentUser.isGuest) {
                return false;
            }
            
            if (!window.firebaseModules || !window.db) {
                console.warn('⚠️ Firebase غير متاح للمزامنة');
                return false;
            }
            
            const userRef = window.firebaseModules.doc(window.db, 'users', window.currentUser.uid);
            await window.firebaseModules.setDoc(userRef, {
                ...userData,
                lastSyncedAt: window.firebaseModules.serverTimestamp()
            }, { merge: true });
            
            console.log('✅ تم مزامنة بيانات المستخدم مع Firebase');
            return true;
        } catch (e) {
            console.error('❌ خطأ في مزامنة البيانات مع Firebase:', e);
            return false;
        }
    }
};

/**
 * ✅ تم الإصلاح: دالة للتحقق من صحة البيانات المدخلة
 */
function validateUserInput(input, type = 'text') {
    if (!input || typeof input !== 'string') return false;
    
    switch(type) {
        case 'email':
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
        case 'password':
            return input.length >= 6;
        case 'phone':
            return /^[0-9+\-\s()]+$/.test(input);
        case 'text':
            return input.trim().length > 0;
        default:
            return true;
    }
}

/**
 * ✅ تم الإصلاح: دالة للتحقق من قوة كلمة المرور
 */
function getPasswordStrength(password) {
    if (!password) return { score: 0, label: 'ضعيفة جداً' };

    let score = 0;
    const checks = {
        length: password.length >= 12,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        numbers: /\d/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
        noCommon: !/(password|123456|qwerty|admin|user)/i.test(password)
    };

    Object.values(checks).forEach(check => {
        if (check) score++;
    });

    const labels = {
        0: 'ضعيفة جداً',
        1: 'ضعيفة',
        2: 'متوسطة',
        3: 'جيدة',
        4: 'قوية',
        5: 'قوية جداً',
        6: 'قوية جداً'
    };

    return {
        score: score,
        label: labels[score],
        checks: checks
    };
}

// تصدير الدوال
window.AuthSecurity = AuthSecurity;
window.validateUserInput = validateUserInput;
window.getPasswordStrength = getPasswordStrength;

console.log('✅ Auth System (Secure Version) Loaded');
