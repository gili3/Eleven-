/**
 * data-encryption.js
 * نظام تشفير البيانات الحساسة المحفوظة محلياً
 */

class DataEncryption {
    constructor() {
        // مفتاح التشفير - يجب أن يكون فريداً لكل جلسة
        this.encryptionKey = null;
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        this.init();
    }

    /**
     * تهيئة نظام التشفير
     */
    async init() {
        try {
            // توليد مفتاح تشفير فريد للجلسة
            this.encryptionKey = await this.generateEncryptionKey();
            console.log('🔐 تم تهيئة نظام التشفير');
        } catch (error) {
            console.error('❌ خطأ في تهيئة نظام التشفير:', error);
        }
    }

    /**
     * توليد مفتاح تشفير آمن
     */
    async generateEncryptionKey() {
        try {
            const key = await window.crypto.subtle.generateKey(
                {
                    name: this.algorithm,
                    length: this.keyLength
                },
                false, // لا يمكن استخراج المفتاح
                ['encrypt', 'decrypt']
            );
            return key;
        } catch (error) {
            console.error('❌ خطأ في توليد مفتاح التشفير:', error);
            throw error;
        }
    }

    /**
     * تشفير بيانات نصية
     */
    async encryptData(data) {
        try {
            if (!this.encryptionKey) {
                throw new Error('Encryption key not initialized');
            }

            // تحويل البيانات إلى نص
            const encodedData = new TextEncoder().encode(JSON.stringify(data));

            // توليد IV عشوائي
            const iv = window.crypto.getRandomValues(new Uint8Array(12));

            // تشفير البيانات
            const encryptedData = await window.crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                this.encryptionKey,
                encodedData
            );

            // دمج IV والبيانات المشفرة
            const combined = new Uint8Array(iv.length + encryptedData.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encryptedData), iv.length);

            // تحويل إلى Base64
            return btoa(String.fromCharCode.apply(null, combined));
        } catch (error) {
            console.error('❌ خطأ في تشفير البيانات:', error);
            throw error;
        }
    }

    /**
     * فك تشفير البيانات
     */
    async decryptData(encryptedData) {
        try {
            if (!this.encryptionKey) {
                throw new Error('Encryption key not initialized');
            }

            // تحويل من Base64
            const binaryString = atob(encryptedData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // استخراج IV والبيانات المشفرة
            const iv = bytes.slice(0, 12);
            const encrypted = bytes.slice(12);

            // فك التشفير
            const decryptedData = await window.crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                this.encryptionKey,
                encrypted
            );

            // تحويل إلى نص
            const decodedData = new TextDecoder().decode(decryptedData);
            return JSON.parse(decodedData);
        } catch (error) {
            console.error('❌ خطأ في فك تشفير البيانات:', error);
            throw error;
        }
    }

    /**
     * حفظ بيانات مشفرة في localStorage
     */
    async saveEncrypted(key, data) {
        try {
            const encrypted = await this.encryptData(data);
            localStorage.setItem(`enc_${key}`, encrypted);
            console.log(`✅ تم حفظ البيانات المشفرة: ${key}`);
        } catch (error) {
            console.error(`❌ خطأ في حفظ البيانات المشفرة: ${key}`, error);
        }
    }

    /**
     * استرجاع بيانات مشفرة من localStorage
     */
    async getEncrypted(key) {
        try {
            const encrypted = localStorage.getItem(`enc_${key}`);
            if (!encrypted) return null;

            const decrypted = await this.decryptData(encrypted);
            return decrypted;
        } catch (error) {
            console.error(`❌ خطأ في استرجاع البيانات المشفرة: ${key}`, error);
            return null;
        }
    }

    /**
     * حذف بيانات مشفرة من localStorage
     */
    deleteEncrypted(key) {
        try {
            localStorage.removeItem(`enc_${key}`);
            console.log(`✅ تم حذف البيانات المشفرة: ${key}`);
        } catch (error) {
            console.error(`❌ خطأ في حذف البيانات المشفرة: ${key}`, error);
        }
    }

    /**
     * تنظيف جميع البيانات المشفرة
     */
    clearAllEncrypted() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('enc_')) {
                    localStorage.removeItem(key);
                }
            });
            console.log('✅ تم تنظيف جميع البيانات المشفرة');
        } catch (error) {
            console.error('❌ خطأ في تنظيف البيانات المشفرة:', error);
        }
    }

    /**
     * التحقق من قوة كلمة المرور
     */
    getPasswordStrength(password) {
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

    /**
     * تجزئة البيانات (للتحقق من السلامة)
     */
    async hashData(data) {
        try {
            const encodedData = new TextEncoder().encode(JSON.stringify(data));
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', encodedData);
            
            // تحويل إلى hex
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('❌ خطأ في تجزئة البيانات:', error);
            throw error;
        }
    }
}

// إنشاء instance عام
window.dataEncryption = new DataEncryption();

// تصدير الفئة
window.DataEncryption = DataEncryption;
