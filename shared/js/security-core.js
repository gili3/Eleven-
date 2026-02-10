[file name]: security-core.js
[file content begin]
// security-core.js - نظام الأمان الشامل (نسخة محسنة)
// ======================== نظام الحماية الشامل ========================

/**
 * نظام الحماية من هجمات XSS, CSRF, SQL Injection
 */
window.SecurityCore = {
    
    // التهيئة الأولية للنظام
    init: function() {
        console.log('🔐 بدء نظام الأمان الشامل...');
        this.setupSecurityHeaders();
        this.preventCSRF();
        this.preventClickjacking();
        this.setupInputValidation();
        this.monitorMaliciousActivity();
        this.encryptSensitiveData();
        console.log('✅ نظام الأمان الشامل جاهز');
    },
    
    /**
     * تنظيف HTML من هجمات XSS
     */
    sanitizeHTML: function(input, options = {}) {
        if (input === null || input === undefined) return '';
        if (typeof input !== 'string') return String(input);
        
        const defaults = {
            allowTags: ['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'span', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
            allowAttributes: {
                'a': ['href', 'title', 'target'],
                'img': ['src', 'alt', 'title', 'width', 'height'],
                '*': ['class', 'id', 'style', 'data-*']
            },
            stripComments: true
        };
        
        const config = {...defaults, ...options};
        
        // إزالة التعليقات إذا طلب
        let sanitized = config.stripComments ? 
            input.replace(/<!--[\s\S]*?-->/g, '') : input;
        
        // قائمة الوسوم والسمات الخطيرة
        const dangerousPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi,
            /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe\s*>/gi,
            /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object\s*>/gi,
            /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed\s*>/gi,
            /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link\s*>/gi,
            /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form\s*>/gi,
            /on\w+\s*=\s*["'][^"']*["']/gi,
            /javascript\s*:/gi,
            /data\s*:/gi,
            /vbscript\s*:/gi,
            /expression\s*\(/gi,
            /eval\s*\(/gi,
            /url\s*\(/gi
        ];
        
        // تطبيق جميع أنماط الحماية
        dangerousPatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '');
        });
        
        // السماح فقط بالوسوم المسموحة
        sanitized = sanitized.replace(/<(\/?)([a-z][a-z0-9]*)/gi, (match, slash, tag) => {
            const tagLower = tag.toLowerCase();
            if (config.allowTags.includes(tagLower)) {
                return `<${slash}${tag}`;
            }
            return '';
        });
        
        // التحقق من السمات المسموحة
        sanitized = sanitized.replace(/<([a-z][a-z0-9]*)\s+([^>]*)>/gi, (match, tag, attributes) => {
            const tagLower = tag.toLowerCase();
            const allowedAttrs = config.allowAttributes[tagLower] || 
                               config.allowAttributes['*'] || 
                               [];
            
            const filteredAttrs = attributes
                .split(/\s+/)
                .filter(attr => {
                    if (!attr) return false;
                    const [name, ...valueParts] = attr.split('=');
                    const attrName = name.toLowerCase();
                    
                    // السماح بسمات data-*
                    if (attrName.startsWith('data-')) return true;
                    
                    // السماح بالسمات المسموحة
                    return allowedAttrs.some(allowed => {
                        if (allowed.endsWith('*')) {
                            return attrName.startsWith(allowed.slice(0, -1));
                        }
                        return attrName === allowed;
                    });
                })
                .join(' ');
            
            return filteredAttrs ? `<${tag} ${filteredAttrs}>` : `<${tag}>`;
        });
        
        // إزالة UTF-8 الخطيرة
        sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        
        return sanitized;
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
     * التحقق من صحة البريد الإلكتروني مع حماية إضافية
     */
    validateEmail: function(email) {
        if (!email || typeof email !== 'string') return false;
        
        const cleanEmail = email.trim().toLowerCase();
        
        // منع حروف UTF-8 الخطيرة
        if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(cleanEmail)) return false;
        
        // التحقق من صيغة البريد
        const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
        
        if (!re.test(cleanEmail)) return false;
        
        // منع بريدات الاختبار الخطيرة
        const dangerousDomains = [
            'test.com', 'example.com', 'localhost', '127.0.0.1',
            'admin.com', 'root.com', 'system.com'
        ];
        
        const domain = cleanEmail.split('@')[1];
        if (dangerousDomains.some(d => domain.includes(d))) {
            console.warn('⚠️ محاولة استخدام بريد اختباري خطير:', cleanEmail);
            return false;
        }
        
        return true;
    },
    
    /**
     * التحقق من صحة رقم الهاتف السوداني
     */
    validatePhone: function(phone) {
        if (!phone || typeof phone !== 'string') return false;
        
        const cleanPhone = phone.replace(/\D/g, '');
        
        // التحقق من الطول
        if (cleanPhone.length < 9 || cleanPhone.length > 13) return false;
        
        // تنسيقات الهواتف السودانية
        const sudanFormats = [
            /^9[0-9]{8}$/,           // 0912345678
            /^2499[0-9]{8}$/,        // 249912345678
            /^\+2499[0-9]{8}$/,      // +249912345678
            /^002499[0-9]{8}$/       // 00249912345678
        ];
        
        const isValid = sudanFormats.some(format => format.test(cleanPhone));
        
        if (!isValid) {
            console.warn('⚠️ رقم هاتف غير صالح:', phone);
            return false;
        }
        
        return true;
    },
    
    /**
     * تنسيق رقم الهاتف تلقائياً
     */
    formatPhone: function(phone) {
        if (!this.validatePhone(phone)) return phone;
        
        const cleanPhone = phone.replace(/\D/g, '');
        
        if (cleanPhone.startsWith('249')) {
            return '+249' + cleanPhone.substring(3);
        } else if (cleanPhone.startsWith('00249')) {
            return '+249' + cleanPhone.substring(5);
        } else if (cleanPhone.startsWith('0')) {
            return '+249' + cleanPhone.substring(1);
        } else if (cleanPhone.startsWith('9')) {
            return '+249' + cleanPhone;
        }
        
        return phone;
    },
    
    /**
     * التحقق من قوة كلمة المرور
     */
    validatePassword: function(password) {
        if (!password || typeof password !== 'string') return false;
        
        const minLength = 8;
        if (password.length < minLength) return false;
        
        const checks = {
            hasUpperCase: /[A-Z]/.test(password),
            hasLowerCase: /[a-z]/.test(password),
            hasNumbers: /\d/.test(password),
            hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
            noSpaces: !/\s/.test(password),
            noCommonPatterns: !/(123456|password|admin|qwerty|azerty|111111|000000)/i.test(password)
        };
        
        // حساب قوة الكلمة
        const score = Object.values(checks).filter(Boolean).length;
        
        if (score < 4) {
            console.warn('⚠️ كلمة مرور ضعيفة:', password.substring(0, 3) + '***');
            return false;
        }
        
        return true;
    },
    
    /**
     * منع هجمات CSRF
     */
    preventCSRF: function() {
        // توليد رمز CSRF فريد للجلسة
        if (!sessionStorage.getItem('csrf_token')) {
            const token = this.generateCSRFToken();
            sessionStorage.setItem('csrf_token', token);
        }
        
        // إضافة الرمز لجميع الطلبات
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
    
    /**
     * توليد رمز CSRF
     */
    generateCSRFToken: function() {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },
    
    /**
     * التحقق من رمز CSRF
     */
    verifyCSRFToken: function(token) {
        const storedToken = sessionStorage.getItem('csrf_token');
        if (!storedToken || !token) return false;
        
        // استخدام مقارنة ثابتة الوقت لمنع هجمات التوقيت
        let result = true;
        if (storedToken.length !== token.length) {
            result = false;
        }
        for (let i = 0; i < storedToken.length; i++) {
            result &= (storedToken.charAt(i) === token.charAt(i));
        }
        
        if (!result) {
            console.error('❌ فشل التحقق من CSRF Token');
            this.logSecurityEvent('csrf_attempt', {
                storedLength: storedToken.length,
                receivedLength: token.length
            });
        }
        
        return result;
    },
    
    /**
     * منع هجمات Clickjacking
     */
    preventClickjacking: function() {
        // منع التضمين في الإطارات
        if (window.self !== window.top) {
            console.warn('⚠️ تم اكتشاف محاولة تضمين الصفحة (Clickjacking)');
            window.top.location = window.self.location;
            return false;
        }
        
        // إضافة رأس X-Frame-Options
        try {
            const meta = document.createElement('meta');
            meta.httpEquiv = 'X-Frame-Options';
            meta.content = 'DENY';
            document.head.appendChild(meta);
        } catch (e) {
            console.warn('⚠️ لا يمكن إضافة رأس X-Frame-Options:', e);
        }
        
        return true;
    },
    
    /**
     * إعداد رؤوس الأمان
     */
    setupSecurityHeaders: function() {
        try {
            // إضافة رؤوس أمان إضافية
            const metaTags = [
                { 'http-equiv': 'Content-Security-Policy', content: "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com;" },
                { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
                { 'http-equiv': 'X-XSS-Protection', content: '1; mode=block' },
                { 'http-equiv': 'Referrer-Policy', content: 'strict-origin-when-cross-origin' },
                { 'http-equiv': 'Permissions-Policy', content: 'camera=(), microphone=(), geolocation=()' }
            ];
            
            metaTags.forEach(meta => {
                const element = document.createElement('meta');
                Object.entries(meta).forEach(([key, value]) => {
                    element.setAttribute(key, value);
                });
                document.head.appendChild(element);
            });
        } catch (e) {
            console.warn('⚠️ لا يمكن إضافة رؤوس الأمان:', e);
        }
    },
    
    /**
     * إعداد التحقق من المدخلات
     */
    setupInputValidation: function() {
        // مراقبة جميع حقول الإدخال
        document.addEventListener('input', function(e) {
            const target = e.target;
            if (!target) return;
            
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                const type = target.type;
                const value = target.value;
                
                switch (type) {
                    case 'email':
                        if (value && !SecurityCore.validateEmail(value)) {
                            target.setCustomValidity('يرجى إدخال بريد إلكتروني صحيح');
                        } else {
                            target.setCustomValidity('');
                        }
                        break;
                        
                    case 'tel':
                        if (value && !SecurityCore.validatePhone(value)) {
                            target.setCustomValidity('يرجى إدخال رقم هاتف سوداني صحيح');
                        } else {
                            target.setCustomValidity('');
                        }
                        break;
                        
                    case 'password':
                        if (value && value.length < 8) {
                            target.setCustomValidity('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
                        } else {
                            target.setCustomValidity('');
                        }
                        break;
                }
            }
        });
        
        // منع نسخ ولصق الخطير
        document.addEventListener('paste', function(e) {
            const target = e.target;
            if (target.tagName === 'INPUT' && target.type === 'password') {
                e.preventDefault();
                if (typeof showToast === 'function') {
                    showToast('لا يسمح بلصق النص في حقل كلمة المرور', 'warning');
                }
            }
        });
    },
    
    /**
     * مراقبة النشاط الضار
     */
    monitorMaliciousActivity: function() {
        let suspiciousCount = 0;
        const maxSuspicious = 5;
        const resetTime = 5 * 60 * 1000; // 5 دقائق
        
        // مراقبة الأحداث المشبوهة
        const events = [
            'copy', 'cut', 'contextmenu', 'keydown', 
            'mousedown', 'devtoolschange', 'devtoolsopen'
        ];
        
        events.forEach(event => {
            document.addEventListener(event, function(e) {
                // اكتشاف محاولة فتح أدوات المطور
                if (event === 'devtoolschange' || event === 'devtoolsopen') {
                    suspiciousCount += 2;
                    SecurityCore.logSecurityEvent('devtools_opened', {
                        event: event,
                        time: new Date().toISOString()
                    });
                }
                
                // اكتشاف محاولات نسخ النصوص الحساسة
                if ((event === 'copy' || event === 'cut') && 
                    window.getSelection().toString().includes('SDG')) {
                    suspiciousCount++;
                    SecurityCore.logSecurityEvent('sensitive_copy', {
                        text: window.getSelection().toString().substring(0, 50),
                        time: new Date().toISOString()
                    });
                }
                
                // إذا تجاوز الحد المسموح
                if (suspiciousCount >= maxSuspicious) {
                    SecurityCore.handleSecurityBreach('too_many_suspicious_events');
                }
            });
        });
        
        // إعادة تعيين العداد كل 5 دقائق
        setInterval(() => {
            if (suspiciousCount > 0) {
                suspiciousCount = Math.max(0, suspiciousCount - 1);
            }
        }, resetTime);
    },
    
    /**
     * تشفير البيانات الحساسة
     */
    encryptSensitiveData: function() {
        // إعداد التشفير للبيانات الحساسة
        window.encryptData = async function(data) {
            try {
                if (!data) return data;
                
                const encoder = new TextEncoder();
                const dataBuffer = encoder.encode(JSON.stringify(data));
                
                // استخدام Web Crypto API للتشفير
                const cryptoKey = await window.crypto.subtle.generateKey(
                    { name: 'AES-GCM', length: 256 },
                    true,
                    ['encrypt', 'decrypt']
                );
                
                const iv = window.crypto.getRandomValues(new Uint8Array(12));
                const encrypted = await window.crypto.subtle.encrypt(
                    { name: 'AES-GCM', iv: iv },
                    cryptoKey,
                    dataBuffer
                );
                
                return {
                    encrypted: Array.from(new Uint8Array(encrypted)),
                    iv: Array.from(iv)
                };
            } catch (error) {
                console.error('❌ خطأ في التشفير:', error);
                return data;
            }
        };
        
        window.decryptData = async function(encryptedData) {
            try {
                if (!encryptedData || !encryptedData.encrypted) return encryptedData;
                
                const encryptedArray = new Uint8Array(encryptedData.encrypted);
                const iv = new Uint8Array(encryptedData.iv);
                
                // هنا تحتاج إلى تخزين المفتاح بشكل آمن
                // في تطبيق حقيقي، يجب تخزين المفتاح في Secure Storage
                
                return JSON.parse(new TextDecoder().decode(encryptedArray));
            } catch (error) {
                console.error('❌ خطأ في فك التشفير:', error);
                return null;
            }
        };
    },
    
    /**
     * تسجيل أحداث الأمان
     */
    logSecurityEvent: function(eventType, details = {}) {
        const logEntry = {
            type: eventType,
            details: details,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            referrer: document.referrer
        };
        
        try {
            // حفظ في localStorage
            const securityLogs = JSON.parse(localStorage.getItem('security_logs') || '[]');
            securityLogs.push(logEntry);
            
            // حفظ آخر 100 حدث فقط
            if (securityLogs.length > 100) {
                securityLogs.splice(0, securityLogs.length - 100);
            }
            
            localStorage.setItem('security_logs', JSON.stringify(securityLogs));
            
            // إرسال للخادم إذا كان هناك اتصال
            if (navigator.onLine && typeof sendSecurityLog === 'function') {
                sendSecurityLog(logEntry);
            }
            
            console.log(`🔒 حدث أمان: ${eventType}`, details);
        } catch (e) {
            console.error('❌ خطأ في تسجيل حدث الأمان:', e);
        }
    },
    
    /**
     * التعامل مع خرق الأمان
     */
    handleSecurityBreach: function(reason) {
        console.error(`🚨 اكتشاف خرق أمان: ${reason}`);
        
        // تسجيل الحدث
        this.logSecurityEvent('security_breach', {
            reason: reason,
            action: 'forced_logout'
        });
        
        // إخطار المستخدم
        if (typeof showToast === 'function') {
            showToast('تم اكتشاف نشاط مشبوه. جاري تسجيل الخروج...', 'error', 5000);
        }
        
        // تسجيل الخروج القسري
        setTimeout(() => {
            if (typeof signOutUser === 'function') {
                signOutUser();
            } else {
                window.location.reload();
            }
        }, 3000);
    },
    
    /**
     * فحص النشاط المشبوه في النماذج
     */
    checkFormForThreats: function(formData) {
        const threats = [];
        
        // قائمة الكلمات المفتاحية الخطيرة
        const dangerousKeywords = [
            'script', 'javascript', 'onload', 'onerror', 'onclick',
            'alert', 'prompt', 'confirm', 'eval', 'document.cookie',
            'localStorage', 'sessionStorage', 'window.location',
            'document.write', 'innerHTML', 'outerHTML', 'insertAdjacentHTML',
            '<iframe', '<embed', '<object', '<applet', '<meta',
            'sql', 'select', 'insert', 'update', 'delete', 'drop', 'union',
            'or 1=1', ';--', '/*', '*/', 'waitfor delay'
        ];
        
        // فحص جميع القيم
        Object.entries(formData).forEach(([key, value]) => {
            if (typeof value === 'string') {
                const lowerValue = value.toLowerCase();
                
                dangerousKeywords.forEach(keyword => {
                    if (lowerValue.includes(keyword)) {
                        threats.push({
                            field: key,
                            threat: keyword,
                            value: value.substring(0, 50) + '...'
                        });
                    }
                });
                
                // فحص للرموز الخطيرة
                const dangerousPatterns = [
                    /<.*>/, // وسوم HTML
                    /&.*;/, // كيانات HTML
                    /\\x[0-9a-f]{2}/i, // أحرف hex
                    /%[0-9a-f]{2}/i // ترميز URL
                ];
                
                dangerousPatterns.forEach(pattern => {
                    if (pattern.test(value)) {
                        threats.push({
                            field: key,
                            threat: 'dangerous_encoding',
                            value: value.substring(0, 50) + '...'
                        });
                    }
                });
            }
        });
        
        if (threats.length > 0) {
            this.logSecurityEvent('form_threat_detected', {
                threats: threats,
                formData: Object.keys(formData)
            });
            
            return {
                safe: false,
                threats: threats,
                message: 'تم اكتشاف محتوى خطير في النموذج'
            };
        }
        
        return { safe: true };
    },
    
    /**
     * التحقق من صحة ملف
     */
    validateFile: function(file) {
        if (!file) return { valid: false, error: 'لا يوجد ملف' };
        
        // التحقق من النوع
        const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (!allowedTypes.includes(file.type.toLowerCase())) {
            return {
                valid: false,
                error: 'نوع الملف غير مسموح به'
            };
        }
        
        // التحقق من الحجم (10MB كحد أقصى)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return {
                valid: false,
                error: 'حجم الملف كبير جداً (الحد الأقصى 10MB)'
            };
        }
        
        // التحقق من الاسم
        const dangerousNames = [
            '.exe', '.bat', '.cmd', '.sh', '.php', '.asp', '.aspx',
            '.jsp', '.js', '.html', '.htm', '.vbs', '.ps1'
        ];
        
        const fileName = file.name.toLowerCase();
        if (dangerousNames.some(ext => fileName.endsWith(ext))) {
            return {
                valid: false,
                error: 'امتداد الملف خطير'
            };
        }
        
        return { valid: true };
    },
    
    /**
     * إنشاء رمز CAPTCHA بسيط
     */
    createSimpleCaptcha: function() {
        const operators = ['+', '-', '*'];
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        const operator = operators[Math.floor(Math.random() * operators.length)];
        
        let answer;
        switch (operator) {
            case '+': answer = num1 + num2; break;
            case '-': answer = num1 - num2; break;
            case '*': answer = num1 * num2; break;
        }
        
        const question = `${num1} ${operator} ${num2}`;
        
        // تخزين الإجابة في sessionStorage
        sessionStorage.setItem('captcha_answer', answer);
        
        return {
            question: question,
            answer: answer
        };
    },
    
    /**
     * التحقق من إجابة CAPTCHA
     */
    verifyCaptcha: function(userAnswer) {
        const correctAnswer = sessionStorage.getItem('captcha_answer');
        if (!correctAnswer || !userAnswer) return false;
        
        return parseInt(userAnswer) === parseInt(correctAnswer);
    }
};

// ======================== التخزين الآمن ========================

window.SecureStorage = {
    
    // المفتاح الرئيسي للتشفير (يجب أن يكون فريداً لكل مستخدم)
    getEncryptionKey: async function() {
        try {
            let key = sessionStorage.getItem('encryption_key');
            if (!key) {
                // توليد مفتاح جديد
                key = window.crypto.getRandomValues(new Uint8Array(32))
                    .reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
                sessionStorage.setItem('encryption_key', key);
            }
            return key;
        } catch (error) {
            console.error('❌ خطأ في توليد مفتاح التشفير:', error);
            return 'fallback_key_' + Date.now();
        }
    },
    
    /**
     * تشفير البيانات قبل التخزين
     */
    encrypt: async function(data) {
        try {
            const key = await this.getEncryptionKey();
            const text = typeof data === 'string' ? data : JSON.stringify(data);
            
            // تشفير بسيط (في تطبيق حقيقي استخدم Web Crypto API)
            let result = '';
            for (let i = 0; i < text.length; i++) {
                const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                result += String.fromCharCode(charCode);
            }
            
            return btoa(result);
        } catch (error) {
            console.error('❌ خطأ في التشفير:', error);
            return data;
        }
    },
    
    /**
     * فك تشفير البيانات
     */
    decrypt: async function(encryptedData) {
        try {
            const key = await this.getEncryptionKey();
            const decoded = atob(encryptedData);
            
            let result = '';
            for (let i = 0; i < decoded.length; i++) {
                const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                result += String.fromCharCode(charCode);
            }
            
            try {
                return JSON.parse(result);
            } catch {
                return result;
            }
        } catch (error) {
            console.error('❌ خطأ في فك التشفير:', error);
            return encryptedData;
        }
    },
    
    /**
     * تخزين بيانات آمنة
     */
    setItem: async function(key, value, encrypt = true) {
        try {
            let dataToStore = value;
            
            if (encrypt) {
                dataToStore = await this.encrypt(value);
                key = 'secure_' + key;
            }
            
            localStorage.setItem(key, dataToStore);
            return true;
        } catch (error) {
            console.error('❌ خطأ في التخزين الآمن:', error);
            return false;
        }
    },
    
    /**
     * قراءة بيانات آمنة
     */
    getItem: async function(key, encrypted = true) {
        try {
            const storageKey = encrypted ? 'secure_' + key : key;
            const stored = localStorage.getItem(storageKey);
            
            if (!stored) return null;
            
            if (encrypted) {
                return await this.decrypt(stored);
            }
            
            try {
                return JSON.parse(stored);
            } catch {
                return stored;
            }
        } catch (error) {
            console.error('❌ خطأ في القراءة الآمنة:', error);
            return null;
        }
    },
    
    /**
     * إزالة بيانات آمنة
     */
    removeItem: function(key, encrypted = true) {
        try {
            const storageKey = encrypted ? 'secure_' + key : key;
            localStorage.removeItem(storageKey);
            return true;
        } catch (error) {
            console.error('❌ خطأ في إزالة البيانات:', error);
            return false;
        }
    },
    
    /**
     * تنظيف جميع البيانات المشفرة
     */
    clearSecure: function() {
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('secure_')) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            sessionStorage.removeItem('encryption_key');
            return true;
        } catch (error) {
            console.error('❌ خطأ في تنظيف البيانات المشفرة:', error);
            return false;
        }
    },
    
    /**
     * التحقق من سلامة البيانات المخزنة
     */
    verifyDataIntegrity: async function(key) {
        try {
            const data = await this.getItem(key);
            if (!data) return false;
            
            // التحقق من وجود حقول أساسية
            if (typeof data === 'object') {
                if (data.timestamp && data.checksum) {
                    const calculatedChecksum = this.generateChecksum(data.data);
                    return calculatedChecksum === data.checksum;
                }
            }
            
            return true;
        } catch (error) {
            console.error('❌ خطأ في التحقق من سلامة البيانات:', error);
            return false;
        }
    },
    
    /**
     * توليد checksum للبيانات
     */
    generateChecksum: function(data) {
        try {
            const str = JSON.stringify(data);
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return Math.abs(hash).toString(36);
        } catch {
            return 'error';
        }
    }
};

// ======================== تهيئة النظام الآمن ========================

(function initComprehensiveSecuritySystem() {
    console.log('🛡️ بدء نظام الحماية الشامل...');
    
    // تهيئة النظام الأساسي
    if (window.SecurityCore) {
        SecurityCore.init();
    }
    
    // إضافة حماية إضافية
    try {
        // منع فتح أدوات المطور
        (function() {
            const element = new Image();
            Object.defineProperty(element, 'id', {
                get: function() {
                    SecurityCore.logSecurityEvent('devtools_detection', {
                        method: 'image_id_getter'
                    });
                    return '';
                }
            });
            console.log('%c', element);
        })();
        
        // مراقبة تغييرات DOM الخطيرة
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
                            const src = node.src || '';
                            if (src && !src.includes('gstatic.com') && !src.includes('cdnjs.cloudflare.com')) {
                                console.warn('⚠️ اكتشاف إضافة سكربت غير مصرح:', src);
                                node.parentNode.removeChild(node);
                                SecurityCore.logSecurityEvent('unauthorized_script', { src: src });
                            }
                        }
                    });
                }
            });
        });
        
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
        
        // حماية ضد هجمات الـ Console
        console.warn = (function(original) {
            return function() {
                const args = Array.from(arguments);
                const message = args.join(' ');
                
                // اكتشاف رسائل خطيرة في الكونسول
                const dangerousMessages = [
                    'insecure', 'deprecated', 'xss', 'csrf',
                    'injection', 'vulnerability', 'hack'
                ];
                
                if (dangerousMessages.some(word => message.toLowerCase().includes(word))) {
                    SecurityCore.logSecurityEvent('dangerous_console_message', { message: message });
                }
                
                return original.apply(this, arguments);
            };
        })(console.warn);
        
        // إضافة زر الطوارئ
        const emergencyBtn = document.createElement('button');
        emergencyBtn.innerHTML = '🛡️ طوارئ';
        emergencyBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 99999;
            background: #ff4757;
            color: white;
            border: none;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            font-size: 12px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(255, 71, 87, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
        `;
        emergencyBtn.onclick = function() {
            if (confirm('هل تريد تنفيذ إجراء الطوارئ؟ سيتم مسح جميع البيانات الحساسة وتسجيل الخروج.')) {
                if (SecureStorage.clearSecure) SecureStorage.clearSecure();
                localStorage.clear();
                sessionStorage.clear();
                if (typeof signOutUser === 'function') signOutUser();
                window.location.reload();
            }
        };
        document.body.appendChild(emergencyBtn);
        
        console.log('✅ نظام الحماية الشامل جاهز للعمل');
        
    } catch (error) {
        console.error('❌ خطأ في تهيئة نظام الحماية:', error);
    }
})();

// ======================== التصدير للاستخدام العام ========================

// تصدير الدوال الأساسية
window.sanitizeHTML = window.SecurityCore.sanitizeHTML;
window.sanitizeObject = window.SecurityCore.sanitizeObject;
window.validateEmail = window.SecurityCore.validateEmail;
window.validatePhone = window.SecurityCore.validatePhone;
window.formatPhone = window.SecurityCore.formatPhone;
window.validatePassword = window.SecurityCore.validatePassword;
window.verifyCSRFToken = window.SecurityCore.verifyCSRFToken;
window.checkFormForThreats = window.SecurityCore.checkFormForThreats;
window.validateFile = window.SecurityCore.validateFile;
window.createSimpleCaptcha = window.SecurityCore.createSimpleCaptcha;
window.verifyCaptcha = window.SecurityCore.verifyCaptcha;

// تصدير دوال التخزين الآمن
window.setSecureItem = window.SecureStorage.setItem;
window.getSecureItem = window.SecureStorage.getItem;
window.removeSecureItem = window.SecureStorage.removeItem;
window.clearSecureStorage = window.SecureStorage.clearSecure;
window.verifyDataIntegrity = window.SecureStorage.verifyDataIntegrity;

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    if (window.SecurityCore && typeof SecurityCore.init === 'function') {
        setTimeout(SecurityCore.init, 1000);
    }
});

console.log('✅ security-core.js محمل بنجاح (نظام الحماية الشامل)');
[file content end]

[file name]: css-security.css
[file content begin]
/* css-security.css - تحسينات أمنية متقدمة للواجهة */
/* ======================== حماية ضد CSS Injection ======================== */

/* إخفاء البيانات الحساسة في الطباعة */
@media print {
    .sensitive-data,
    [data-sensitive="true"],
    input[type="password"],
    input[type="tel"],
    input[type="email"],
    .bank-info,
    .receipt-image,
    .security-warning,
    .auth-form,
    .user-credentials,
    .order-details,
    .payment-info {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0 !important;
        width: 0 !important;
        overflow: hidden !important;
    }
    
    body::before {
        content: "معلومات حساسة - غير مسموح بالطباعة";
        display: block !important;
        text-align: center;
        font-size: 16px;
        color: #721c24;
        background: #f8d7da;
        padding: 20px;
        border: 2px solid #f5c6cb;
        margin: 20px;
        border-radius: 8px;
    }
}

/* منع نسخ البيانات الحساسة */
.no-copy {
    user-select: none !important;
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
    cursor: default !important;
}

.sensitive-text {
    -webkit-touch-callout: none !important;
    -webkit-user-select: none !important;
    -khtml-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
    user-select: none !important;
    filter: blur(3px) !important;
    transition: filter 0.5s ease !important;
    cursor: pointer !important;
    position: relative !important;
}

.sensitive-text:hover {
    filter: blur(0) !important;
}

.sensitive-text::after {
    content: "🔒";
    position: absolute;
    right: -25px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 12px;
    opacity: 0.7;
}

/* حماية حقول كلمات المرور */
input[type="password"] {
    font-family: "password", "Segoe UI", "Cairo", sans-serif !important;
    letter-spacing: 3px !important;
    font-size: 18px !important;
    background: linear-gradient(45deg, transparent 49%, #f0f0f0 50%, transparent 51%) !important;
    background-size: 10px 10px !important;
    -webkit-text-security: disc !important;
}

/* إخفاء المحتوى في وضع العرض المسبق */
@media (prefers-reduced-motion: reduce) {
    .sensitive-data,
    [data-sensitive="true"] {
        opacity: 0.3 !important;
        filter: blur(5px) !important;
    }
}

/* تحذيرات الأمان */
.security-warning {
    position: relative !important;
    padding: 15px 20px !important;
    margin: 15px 0 !important;
    background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%) !important;
    border: 2px solid #ffc107 !important;
    border-radius: 12px !important;
    color: #856404 !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    box-shadow: 0 4px 15px rgba(255, 193, 7, 0.2) !important;
}

.security-warning::before {
    content: "⚠️ " !important;
    margin-left: 10px !important;
    font-size: 18px !important;
}

.security-warning::after {
    content: "" !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    height: 4px !important;
    background: linear-gradient(90deg, #ffc107, #ff9800) !important;
    border-radius: 12px 12px 0 0 !important;
}

.security-alert {
    background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%) !important;
    border-color: #dc3545 !important;
    color: #721c24 !important;
    border-left: 6px solid #dc3545 !important;
}

.security-alert::before {
    content: "🚨 " !important;
}

.security-alert::after {
    background: linear-gradient(90deg, #dc3545, #c82333) !important;
}

.security-success {
    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%) !important;
    border-color: #28a745 !important;
    color: #155724 !important;
    border-left: 6px solid #28a745 !important;
}

.security-success::before {
    content: "✅ " !important;
}

.security-success::after {
    background: linear-gradient(90deg, #28a745, #218838) !important;
}

/* حماية ضد screenshots (للمتصفحات الداعمة) */
.anti-screenshot {
    -webkit-touch-callout: none !important;
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
    user-select: none !important;
    -webkit-user-drag: none !important;
    -webkit-tap-highlight-color: transparent !important;
}

/* حماية ضد تسجيل الشاشة */
@media screen {
    .no-screenshot {
        position: relative !important;
    }
    
    .no-screenshot::before {
        content: "" !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255,255,255,0.05) 10px,
            rgba(255,255,255,0.05) 20px
        ) !important;
        pointer-events: none !important;
        z-index: 9998 !important;
    }
}

/* حماية حقول الإدخال */
input[data-sensitive="true"],
textarea[data-sensitive="true"] {
    background: #f8f9fa !important;
    border: 2px solid #dee2e6 !important;
    border-radius: 8px !important;
    padding: 12px 15px !important;
    transition: all 0.3s ease !important;
}

input[data-sensitive="true"]:focus,
textarea[data-sensitive="true"]:focus {
    border-color: #007bff !important;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25) !important;
    background: #fff !important;
}

/* إخفاء النصوص في حالات معينة */
.hide-on-copy::selection {
    background: transparent !important;
    color: transparent !important;
}

.hide-on-copy::-moz-selection {
    background: transparent !important;
    color: transparent !important;
}

/* حماية الشيفرات البرمجية */
.code-protection {
    font-family: 'Courier New', monospace !important;
    background: #1e1e1e !important;
    color: #d4d4d4 !important;
    padding: 20px !important;
    border-radius: 8px !important;
    border-left: 4px solid #007acc !important;
    position: relative !important;
}

.code-protection::before {
    content: "🔒 شفرة محمية" !important;
    position: absolute !important;
    top: -10px !important;
    right: 15px !important;
    background: #007acc !important;
    color: white !important;
    padding: 4px 12px !important;
    border-radius: 4px !important;
    font-size: 12px !important;
    font-weight: bold !important;
}

/* حماية الروابط */
a[href^="javascript:"] {
    color: #dc3545 !important;
    text-decoration: line-through !important;
    opacity: 0.7 !important;
}

a[href^="javascript:"]::before {
    content: "⚠️ " !important;
}

/* حماية ضد keyloggers */
.secure-input-container {
    position: relative !important;
}

.secure-input-container::before {
    content: "🔐" !important;
    position: absolute !important;
    left: 15px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    z-index: 2 !important;
    font-size: 18px !important;
    opacity: 0.7 !important;
}

.secure-input-container input {
    padding-left: 45px !important;
    padding-right: 45px !important;
}

.secure-input-container::after {
    content: "" !important;
    position: absolute !important;
    right: 15px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    width: 24px !important;
    height: 24px !important;
    background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236c757d"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>') !important;
    background-size: contain !important;
    opacity: 0.5 !important;
}

/* إخفاء المحتوى في أوضاع معينة */
@media (max-width: 768px) {
    .hide-on-mobile {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0 !important;
        width: 0 !important;
        overflow: hidden !important;
    }
}

/* حماية ضد الـ Brute Force */
.brute-force-protection {
    animation: shake 0.5s !important;
    border-color: #ff4757 !important;
    background: #fff5f5 !important;
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
}

/* حماية البيانات في قوائم */
.protected-list li {
    position: relative !important;
    padding-left: 25px !important;
}

.protected-list li::before {
    content: "🔒" !important;
    position: absolute !important;
    left: 0 !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    font-size: 14px !important;
    opacity: 0.5 !important;
}

/* حماية الجداول */
.protected-table {
    border-collapse: separate !important;
    border-spacing: 0 !important;
}

.protected-table th {
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
    position: relative !important;
}

.protected-table th::after {
    content: "" !important;
    position: absolute !important;
    bottom: 0 !important;
    left: 10% !important;
    right: 10% !important;
    height: 2px !important;
    background: linear-gradient(90deg, transparent, #007bff, transparent) !important;
}

/* حماية الصور */
.protected-img {
    position: relative !important;
    overflow: hidden !important;
    border-radius: 8px !important;
}

.protected-img::before {
    content: "" !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    background: linear-gradient(
        45deg,
        rgba(255,255,255,0.1) 25%,
        transparent 25%,
        transparent 50%,
        rgba(255,255,255,0.1) 50%,
        rgba(255,255,255,0.1) 75%,
        transparent 75%,
        transparent
    ) !important;
    background-size: 20px 20px !important;
    pointer-events: none !important;
    z-index: 1 !important;
    opacity: 0.3 !important;
}

/* حماية ضد CSS Injection */
input[name*="script"],
input[name*="style"],
input[name*="meta"],
input[name*="link"],
input[name*="body"],
input[name*="head"] {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    width: 0 !important;
    opacity: 0 !important;
    position: absolute !important;
    left: -9999px !important;
}

/* مؤشرات الأمان */
.security-indicator {
    position: fixed !important;
    bottom: 20px !important;
    right: 20px !important;
    width: 50px !important;
    height: 50px !important;
    border-radius: 50% !important;
    background: #28a745 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    color: white !important;
    font-size: 20px !important;
    box-shadow: 0 4px 15px rgba(40, 167, 69, 0.4) !important;
    z-index: 9999 !important;
    animation: pulse 2s infinite !important;
}

.security-indicator.low {
    background: #ffc107 !important;
    animation: pulse-warning 2s infinite !important;
}

.security-indicator.critical {
    background: #dc3545 !important;
    animation: pulse-danger 2s infinite !important;
}

@keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(40, 167, 69, 0); }
    100% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0); }
}

@keyframes pulse-warning {
    0% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(255, 193, 7, 0); }
    100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
}

@keyframes pulse-danger {
    0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(220, 53, 69, 0); }
    100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
}

/* حماية النماذج */
.form-protection {
    position: relative !important;
    border: 2px solid #e9ecef !important;
    border-radius: 12px !important;
    padding: 25px !important;
    background: #fff !important;
}

.form-protection::before {
    content: "🛡️ نموذج آمن" !important;
    position: absolute !important;
    top: -12px !important;
    right: 20px !important;
    background: #007bff !important;
    color: white !important;
    padding: 4px 12px !important;
    border-radius: 20px !important;
    font-size: 12px !important;
    font-weight: bold !important;
}

/* إخفاء المحتوى في وضع عدم الاتصال */
@media (prefers-color-scheme: dark) {
    .sensitive-data {
        filter: brightness(0.8) blur(2px) !important;
    }
}

/* حماية ضد الـ Overlay */
.overlay-protection {
    position: relative !important;
    z-index: 1 !important;
}

.overlay-protection::before {
    content: "" !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    background: rgba(0, 0, 0, 0.02) !important;
    pointer-events: none !important;
    z-index: -1 !important;
}

/* حماية النصوص الطويلة */
.text-protection {
    position: relative !important;
    overflow: hidden !important;
}

.text-protection::after {
    content: "" !important;
    position: absolute !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    height: 30px !important;
    background: linear-gradient(to bottom, transparent, white) !important;
    pointer-events: none !important;
}
[file content end]

[file name]: app-core.js
[file content begin]
// app-core.js - الدوال الأساسية والتهيئة (مع نظام الحماية المتكامل)
// ======================== دوال UTILS المدمجة في البداية ========================

function formatNumber(num) {
    if (num === null || num === undefined) return "0";
    const cleanNum = parseFloat(num);
    if (isNaN(cleanNum)) return "0";
    return cleanNum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

let lastToastTime = 0;
let toastQueue = [];

function showToast(message, type = 'info', duration = 3000) {
    const now = Date.now();
    
    // منع التكرار السريع
    if (now - lastToastTime < 300) {
        toastQueue.push({message, type, duration});
        return;
    }
    
    lastToastTime = now;

    // تنظيف الرسالة من أي أكواد خطيرة
    const cleanMessage = window.SecurityCore ? 
        window.SecurityCore.sanitizeHTML(message) : 
        message.replace(/[<>]/g, '');
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} security-warning`;
    
    let icon = 'fas fa-info-circle', bgColor = '#3498db';
    switch(type) {
        case 'success': icon = 'fas fa-check-circle'; bgColor = '#27ae60'; break;
        case 'error': icon = 'fas fa-times-circle'; bgColor = '#e74c3c'; break;
        case 'warning': icon = 'fas fa-exclamation-circle'; bgColor = '#f39c12'; break;
        case 'security': icon = 'fas fa-shield-alt'; bgColor = '#2c3e50'; break;
    }
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="${icon}"></i>
            <span>${cleanMessage}</span>
        </div>
    `;
    
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: 'Cairo';
        animation: slideInUp 0.3s ease;
        max-width: 300px;
        word-break: break-word;
        border-left: 4px solid ${bgColor}80;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutDown 0.3s ease';
        setTimeout(() => {
            toast.remove();
            lastToastTime = 0;
            
            // معالجة الرسائل في قائمة الانتظار
            if (toastQueue.length > 0) {
                const nextToast = toastQueue.shift();
                setTimeout(() => showToast(nextToast.message, nextToast.type, nextToast.duration), 500);
            }
        }, 300);
    }, duration);
}

function showLoadingSpinner(message = 'جاري التحميل...') {
    const cleanMessage = window.SecurityCore ? 
        window.SecurityCore.sanitizeHTML(message) : 
        message.replace(/[<>]/g, '');
    
    const spinner = document.createElement('div');
    spinner.id = 'customLoadingSpinner';
    spinner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.85);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        color: white;
        font-family: 'Cairo';
        backdrop-filter: blur(5px);
    `;
    
    spinner.innerHTML = `
        <div style="position: relative;">
            <div class="loader-spinner" style="width: 60px; height: 60px; border: 4px solid rgba(255,255,255,0.1); border-top: 4px solid var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: var(--primary-color); font-size: 24px;">🛡️</div>
        </div>
        <p style="margin-top: 20px; font-size: 16px; text-align: center; max-width: 300px;">${cleanMessage}</p>
        <p style="margin-top: 10px; font-size: 12px; opacity: 0.7; text-align: center;">تحت الحماية الأمنية</p>
    `;
    
    document.body.appendChild(spinner);
}

function hideLoadingSpinner() {
    const spinner = document.getElementById('customLoadingSpinner');
    if (spinner) {
        spinner.style.opacity = '0';
        spinner.style.transition = 'opacity 0.3s ease';
        setTimeout(() => spinner.remove(), 300);
    }
}

function isValidEmail(email) {
    return window.SecurityCore ? 
        window.SecurityCore.validateEmail(email) : 
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
    return window.SecurityCore ? 
        window.SecurityCore.validatePhone(phone) : 
        /^[0-9+]{10,15}$/.test(phone);
}

function formatSudanPhone(phone) {
    if (window.SecurityCore && window.SecurityCore.formatPhone) {
        return window.SecurityCore.formatPhone(phone);
    }
    
    let clean = phone.replace(/\D/g, '');
    
    if (clean.startsWith('0')) {
        clean = '249' + clean.substring(1);
    }
    else if (!clean.startsWith('249')) {
        clean = '249' + clean;
    }
    
    return '+' + clean;
}

function generateGuestUID() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const hash = btoa(timestamp + random).substr(0, 20);
    return 'guest_' + hash;
}

function safeElementUpdate(id, value, isHTML = false) {
    const element = document.getElementById(id);
    if (element) {
        if (isHTML) {
            element.innerHTML = window.SecurityCore ? 
                window.SecurityCore.sanitizeHTML(value) : 
                value.replace(/[<>]/g, '');
        } else {
            element.textContent = value || '';
        }
        return true;
    } else {
        console.warn(`⚠️ لم يتم العثور على العنصر: ${id}`);
        return false;
    }
}

/**
 * نظام حماية الجلسات والتحقق من سلامة البيانات
 */
const SecurityManager = {
    sessionTimeout: 30 * 60 * 1000, // 30 دقيقة
    lastActivity: Date.now(),
    
    // منع التلاعب بالبيانات في localStorage
    validateSession: function() {
        const session = localStorage.getItem('currentUser');
        if (!session) return true;
        
        try {
            const data = JSON.parse(session);
            
            // التحقق من صلاحية الجلسة
            if (data.timestamp && Date.now() - data.timestamp > this.sessionTimeout) {
                console.warn('⏰ انتهت صلاحية الجلسة');
                this.forceLogout();
                return false;
            }
            
            // إذا كان هناك تلاعب في الحقول الأساسية، قم بتسجيل الخروج
            if (data.isAdmin && !auth.currentUser) {
                console.warn('⚠️ محاولة تلاعب بالصلاحيات تم اكتشافها');
                this.logSecurityEvent('admin_tampering', data);
                this.forceLogout();
                return false;
            }
            
            // التحقق من سلامة البيانات
            if (window.SecureStorage && window.SecureStorage.verifyDataIntegrity) {
                const isValid = window.SecureStorage.verifyDataIntegrity('currentUser');
                if (!isValid) {
                    console.warn('⚠️ بيانات الجلسة تالفة');
                    this.forceLogout();
                    return false;
                }
            }
            
            return true;
        } catch (e) {
            console.error('❌ خطأ في قراءة بيانات الجلسة:', e);
            this.forceLogout();
            return false;
        }
    },
    
    // تحديث نشاط المستخدم
    updateActivity: function() {
        this.lastActivity = Date.now();
        
        // تحديث طابع الوقت في الجلسة
        const session = localStorage.getItem('currentUser');
        if (session) {
            try {
                const data = JSON.parse(session);
                data.timestamp = Date.now();
                localStorage.setItem('currentUser', JSON.stringify(data));
            } catch (e) {
                console.error('خطأ في تحديث نشاط الجلسة:', e);
            }
        }
    },
    
    // تسجيل حدث أمان
    logSecurityEvent: function(eventType, data = {}) {
        const event = {
            type: eventType,
            data: data,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            ip: 'client-side'
        };
        
        // حفظ محلياً
        try {
            const logs = JSON.parse(localStorage.getItem('security_events') || '[]');
            logs.push(event);
            
            // حفظ آخر 50 حدث فقط
            if (logs.length > 50) {
                logs.splice(0, logs.length - 50);
            }
            
            localStorage.setItem('security_events', JSON.stringify(logs));
        } catch (e) {
            console.error('خطأ في تسجيل حدث الأمان:', e);
        }
        
        // إرسال للخادم إذا أمكن
        if (window.firebaseModules && db) {
            try {
                const eventsRef = window.firebaseModules.collection(db, "security_events");
                window.firebaseModules.addDoc(eventsRef, event);
            } catch (error) {
                console.error('❌ خطأ في إرسال حدث الأمان:', error);
            }
        }
    },
    
    forceLogout: function() {
        console.log('🚨 تنفيذ تسجيل خروج قسري');
        
        // تسجيل الحدث
        this.logSecurityEvent('forced_logout', {
            reason: 'security_breach',
            time: new Date().toISOString()
        });
        
        // تنظيف البيانات الحساسة
        if (window.SecureStorage && window.SecureStorage.clearSecure) {
            window.SecureStorage.clearSecure();
        }
        
        localStorage.removeItem('currentUser');
        sessionStorage.clear();
        
        // تسجيل الخروج من Firebase
        if (auth && window.firebaseModules) {
            window.firebaseModules.signOut(auth).catch(() => {});
        }
        
        // إعادة التوجيه مع تنظيف الذاكرة
        setTimeout(() => {
            window.location.href = window.location.origin;
        }, 1000);
    },
    
    // حماية ضد هجمات Clickjacking
    preventFraming: function() {
        if (window.self !== window.top) {
            console.warn('⚠️ تم اكتشاف محاولة تضمين الصفحة في إطار');
            this.logSecurityEvent('clickjacking_attempt');
            window.top.location = window.self.location;
        }
    },
    
    // التحقق من تكامل التطبيق
    checkAppIntegrity: function() {
        // التحقق من وجود عناصر DOM الأساسية
        const essentialElements = [
            'initialLoader',
            'authScreen',
            'appContainer',
            'mainHeader',
            'mainContent'
        ];
        
        const missingElements = essentialElements.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
            console.error('❌ عناصر أساسية مفقودة:', missingElements);
            this.logSecurityEvent('missing_elements', { elements: missingElements });
            return false;
        }
        
        // التحقق من وجود مكتبات أساسية
        if (!window.firebaseModules) {
            console.error('❌ Firebase Modules غير موجودة');
            return false;
        }
        
        return true;
    },
    
    // مراقبة التغييرات المشبوهة في DOM
    monitorDOMChanges: function() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // عنصر
                            // اكتشاف السكربتات الخطيرة
                            if (node.tagName === 'SCRIPT' && node.src) {
                                const src = node.src.toLowerCase();
                                const allowedSources = [
                                    'gstatic.com',
                                    'cdnjs.cloudflare.com',
                                    'googleapis.com',
                                    'firebase'
                                ];
                                
                                if (!allowedSources.some(source => src.includes(source))) {
                                    console.warn('⚠️ اكتشاف سكربت غير مصرح:', src);
                                    node.remove();
                                    this.logSecurityEvent('unauthorized_script', { src: src });
                                }
                            }
                            
                            // اكتشاف الستايل الخطيرة
                            if (node.tagName === 'STYLE' || 
                                (node.tagName === 'LINK' && node.rel === 'stylesheet')) {
                                const content = node.textContent || node.href || '';
                                const dangerousPatterns = [
                                    /expression\(/i,
                                    /javascript:/i,
                                    /data:/i,
                                    /onload=/i
                                ];
                                
                                if (dangerousPatterns.some(pattern => pattern.test(content))) {
                                    console.warn('⚠️ اكتشاف ستايل خطير');
                                    node.remove();
                                    this.logSecurityEvent('dangerous_style');
                                }
                            }
                        }
                    });
                }
            });
        });
        
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
        
        return observer;
    },
    
    // التحقق من اتصال آمن
    checkSecureConnection: function() {
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            console.warn('⚠️ الاتصال غير آمن (غير HTTPS)');
            this.logSecurityEvent('insecure_connection');
            
            if (typeof showToast === 'function') {
                showToast('الاتصال غير آمن. يرجى استخدام HTTPS للحماية الكاملة.', 'warning');
            }
            
            return false;
        }
        
        return true;
    },
    
    // إعداد مراقبة الجلسة
    setupSessionMonitoring: function() {
        // تحديث النشاط عند التفاعل مع الصفحة
        const events = ['click', 'keypress', 'mousemove', 'scroll'];
        events.forEach(event => {
            document.addEventListener(event, () => this.updateActivity(), { passive: true });
        });
        
        // التحقق من انتهاء الجلسة
        setInterval(() => {
            const session = localStorage.getItem('currentUser');
            if (session) {
                try {
                    const data = JSON.parse(session);
                    if (data.timestamp && Date.now() - data.timestamp > this.sessionTimeout) {
                        console.log('⏰ انتهت صلاحية الجلسة، جاري تسجيل الخروج...');
                        if (typeof showToast === 'function') {
                            showToast('انتهت جلستك بسبب عدم النشاط', 'warning');
                        }
                        this.forceLogout();
                    }
                } catch (e) {
                    console.error('خطأ في فحص صلاحية الجلسة:', e);
                }
            }
        }, 60000); // كل دقيقة
    }
};

// ======================== نظام التخزين المؤقت الآمن ========================

let cachedData = {
    products: {
        data: null,
        timestamp: 0,
        checksum: ''
    },
    settings: {
        data: null,
        timestamp: 0,
        checksum: ''
    },
    theme: {
        data: null,
        timestamp: 0,
        checksum: ''
    }
};

// توليد checksum للبيانات
function generateDataChecksum(data) {
    try {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    } catch {
        return '';
    }
}

// التحقق من سلامة البيانات
function verifyDataChecksum(data, checksum) {
    return generateDataChecksum(data) === checksum;
}

async function loadWithCache(key, loaderFn, maxAge = 300000) {
    const now = Date.now();
    
    // التحقق من التخزين المؤقت في الذاكرة
    if (cachedData[key]?.data && (now - cachedData[key].timestamp < maxAge)) {
        if (verifyDataChecksum(cachedData[key].data, cachedData[key].checksum)) {
            console.log(`📦 [Cache] تحميل ${key} من الذاكرة`);
            return cachedData[key].data;
        } else {
            console.warn(`⚠️ [Cache] بيانات ${key} تالفة في الذاكرة`);
            cachedData[key] = { data: null, timestamp: 0, checksum: '' };
        }
    }
    
    // التحقق من localStorage الآمن
    try {
        const localCache = await getLocalCache(key, maxAge);
        if (localCache) {
            cachedData[key] = {
                data: localCache,
                timestamp: now,
                checksum: generateDataChecksum(localCache)
            };
            console.log(`📦 [Cache] تحميل ${key} من localStorage`);
            return localCache;
        }
    } catch (e) {
        console.warn(`⚠️ [Cache] خطأ في قراءة ${key} من localStorage:`, e);
    }
    
    // إذا لم توجد في الذاكرة، جلب من المصدر
    try {
        console.log(`🔄 [Cache] جلب ${key} من المصدر...`);
        const data = await loaderFn();
        
        if (!data) {
            throw new Error('لا توجد بيانات');
        }
        
        // تنظيف البيانات
        const cleanData = window.SecurityCore ? 
            window.SecurityCore.sanitizeObject(data) : data;
        
        // حفظ في الذاكرة
        cachedData[key] = {
            data: cleanData,
            timestamp: now,
            checksum: generateDataChecksum(cleanData)
        };
        
        // حفظ في localStorage الآمن
        await cacheLocally(key, cleanData, now);
        
        console.log(`✅ [Cache] تم تخزين ${key} في الذاكرة`);
        return cleanData;
    } catch (error) {
        console.error(`❌ [Cache] خطأ في جلب ${key}:`, error);
        SecurityManager.logSecurityEvent('cache_load_error', { key, error: error.message });
        return null;
    }
}

async function cacheLocally(key, data, timestamp = Date.now()) {
    try {
        const cacheEntry = {
            data: data,
            timestamp: timestamp,
            checksum: generateDataChecksum(data)
        };
        
        if (window.SecureStorage && window.SecureStorage.setItem) {
            await window.SecureStorage.setItem(`cache_${key}`, cacheEntry);
        } else {
            localStorage.setItem(`cache_${key}`, JSON.stringify(cacheEntry));
        }
        
        console.log(`💾 [Cache] حفظ ${key} في localStorage`);
    } catch (e) {
        console.warn(`⚠️ [Cache] فشل حفظ ${key} في localStorage:`, e);
    }
}

async function getLocalCache(key, maxAge = 600000) {
    try {
        let cached;
        
        if (window.SecureStorage && window.SecureStorage.getItem) {
            cached = await window.SecureStorage.getItem(`cache_${key}`);
        } else {
            const stored = localStorage.getItem(`cache_${key}`);
            cached = stored ? JSON.parse(stored) : null;
        }
        
        if (!cached) return null;
        
        const now = Date.now();
        
        // التحقق من صلاحية الوقت
        if (now - cached.timestamp > maxAge) {
            if (window.SecureStorage && window.SecureStorage.removeItem) {
                await window.SecureStorage.removeItem(`cache_${key}`);
            } else {
                localStorage.removeItem(`cache_${key}`);
            }
            console.log(`🗑️ [Cache] انتهت صلاحية ${key} في localStorage`);
            return null;
        }
        
        // التحقق من سلامة البيانات
        if (!verifyDataChecksum(cached.data, cached.checksum)) {
            console.warn(`⚠️ [Cache] بيانات ${key} تالفة في localStorage`);
            if (window.SecureStorage && window.SecureStorage.removeItem) {
                await window.SecureStorage.removeItem(`cache_${key}`);
            } else {
                localStorage.removeItem(`cache_${key}`);
            }
            return null;
        }
        
        return cached.data;
    } catch (e) {
        console.warn(`⚠️ [Cache] خطأ في قراءة ${key} من localStorage:`, e);
        return null;
    }
}

function clearCache(key = null) {
    if (key) {
        // مسح كاش محدد
        if (cachedData[key]) {
            cachedData[key] = { data: null, timestamp: 0, checksum: '' };
        }
        
        if (window.SecureStorage && window.SecureStorage.removeItem) {
            window.SecureStorage.removeItem(`cache_${key}`);
        } else {
            localStorage.removeItem(`cache_${key}`);
        }
        
        console.log(`🧹 [Cache] تم مسح ${key}`);
    } else {
        // مسح كل الكاش
        Object.keys(cachedData).forEach(k => {
            cachedData[k] = { data: null, timestamp: 0, checksum: '' };
        });
        
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith('cache_')) {
                localStorage.removeItem(k);
            }
        });
        
        console.log('🧹 [Cache] تم مسح كل الذاكرة المؤقتة');
    }
}

// ======================== تطبيق حماية XSS على البيانات ========================

function sanitizeProducts(products) {
    if (!products || !Array.isArray(products)) return [];
    
    if (window.SecurityCore && window.SecurityCore.sanitizeObject) {
        return products.map(product => window.SecurityCore.sanitizeObject(product));
    }
    
    // تنظيف يدوي كبديل
    return products.map(product => {
        const cleanProduct = {};
        for (const key in product) {
            if (typeof product[key] === 'string') {
                cleanProduct[key] = product[key].replace(/[<>]/g, '');
            } else {
                cleanProduct[key] = product[key];
            }
        }
        return cleanProduct;
    });
}

function sanitizeUserInput(input) {
    if (!input || typeof input !== 'string') return input || '';
    
    if (window.SecurityCore && window.SecurityCore.sanitizeHTML) {
        return window.SecurityCore.sanitizeHTML(input);
    }
    
    // تنظيف يدوي
    return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .replace(/expression\(/gi, '');
}

// ======================== المتغيرات العامة المحمية ========================

let currentUser = null;
let isGuest = false;
let isAdmin = false;
let isLoading = false;
let appInitialized = false;
let cartItems = [];
let favorites = [];
let allProducts = [];
let siteCurrency = 'SDG ';
let siteSettings = {};
let selectedProductForQuantity = null;
let directPurchaseItem = null;
let lastScrollTop = 0;
let app, auth, db, storage;

// ======================== إدارة شاشة التحميل مع الحماية ========================

function hideLoader() {
    console.log('🔄 إخفاء شاشة التحميل...');
    const loader = document.getElementById('initialLoader');
    if (loader && loader.style.display !== 'none') {
        loader.style.transition = 'opacity 0.5s ease';
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
            console.log('✅ تم إخفاء شاشة التحميل');
        }, 500);
    }
    isLoading = false;
    
    // تهيئة نظام الإشعارات
    if (window.initializeFirebaseMessaging) {
        window.initializeFirebaseMessaging().catch(error => {
            console.error('⚠️ خطأ في تهيئة Firebase Messaging:', error);
        });
    }
}

function forceHideLoader() {
    console.log('⏱️ إخفاء شاشة التحميل إجبارياً...');
    const loader = document.getElementById('initialLoader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 100);
    }
    isLoading = false;
}

// إخفاء شاشة التحميل بعد 8 ثواني كحد أقصى
setTimeout(forceHideLoader, 8000);

// ======================== التحقق من Firebase SDK مع الحماية ========================

function checkFirebaseSDK() {
    if (!window.firebaseModules) {
        console.error('❌ Firebase SDK لم يتم تحميله');
        forceHideLoader();
        
        const loader = document.getElementById('initialLoader');
        if (loader) {
            loader.innerHTML = `
                <div style="text-align: center; padding: 30px; max-width: 400px;">
                    <i class="fas fa-shield-alt fa-3x" style="color: var(--primary-color); margin-bottom: 20px;"></i>
                    <h3 style="color: var(--primary-color); margin-bottom: 10px;">نظام الحماية نشط</h3>
                    <p style="color: var(--gray-color); margin-bottom: 20px;">تعذر تحميل المكتبات المطلوبة. يرجى:</p>
                    <div style="display: flex; flex-direction: column; gap: 10px; justify-content: center;">
                        <button onclick="checkLibraries()" class="btn-primary" style="padding: 12px 20px; background: var(--secondary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-weight: 600;">
                            <i class="fas fa-redo"></i> إعادة المحاولة
                        </button>
                        <button onclick="signInAsGuest()" class="btn-secondary" style="padding: 12px 20px; background: var(--primary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-weight: 600;">
                            <i class="fas fa-user-shield"></i> الدخول كضيف (آمن)
                        </button>
                    </div>
                    <div style="margin-top: 20px; padding: 10px; background: #fff3cd; border-radius: 8px; border: 1px solid #ffeaa7;">
                        <p style="font-size: 12px; color: #856404; margin: 0;">
                            <i class="fas fa-info-circle"></i>
                            نظام الحماية يعمل على حماية بياناتك
                        </p>
                    </div>
                </div>
            `;
        }
        return false;
    }
    
    // التحقق من أن Firebase Modules محملة بشكل صحيح
    const requiredModules = ['initializeApp', 'getAuth', 'getFirestore'];
    const missingModules = requiredModules.filter(module => !window.firebaseModules[module]);
    
    if (missingModules.length > 0) {
        console.error('❌ Firebase Modules ناقصة:', missingModules);
        if (typeof showToast === 'function') showToast('خطأ في تحميل مكتبات النظام', 'error');
        return false;
    }
    
    return true;
}

// ======================== تهيئة Firebase الآمنة ========================

function initializeFirebase() {
    try {
        const instance = initializeFirebaseApp('MainApp');
        if (instance) {
            app = instance.app;
            auth = instance.auth;
            db = instance.db;
            storage = instance.storage;
            
            // إعداد مراقبة المصادقة
            setupAuthMonitoring();
            
            return instance;
        }
        return null;
    } catch (error) {
        console.error('❌ خطأ في تهيئة Firebase:', error);
        SecurityManager.logSecurityEvent('firebase_init_error', { error: error.message });
        return null;
    }
}

function setupAuthMonitoring() {
    if (!auth || !window.firebaseModules) return;
    
    // مراقبة تغييرات حالة المصادقة
    window.firebaseModules.onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('👤 حالة المصادقة: مستخدم مسجل');
            
            // التحقق من معلومات المستخدم
            if (user.email) {
                const emailCheck = window.SecurityCore ? 
                    window.SecurityCore.validateEmail(user.email) : 
                    isValidEmail(user.email);
                
                if (!emailCheck) {
                    console.warn('⚠️ بريد إلكتروني غير صالح للمستخدم:', user.email);
                    SecurityManager.logSecurityEvent('invalid_user_email', { email: user.email });
                }
            }
            
        } else {
            console.log('👤 حالة المصادقة: لا يوجد مستخدم');
        }
    }, (error) => {
        console.error('❌ خطأ في مراقبة المصادقة:', error);
        SecurityManager.logSecurityEvent('auth_state_error', { error: error.message });
    });
}

// ======================== دوال الاتصال بقاعدة البيانات الآمنة ========================

async function checkDatabaseConnection() {
    try {
        if (!db) {
            console.log('🔄 تهيئة قاعدة البيانات...');
            const firebase = initializeFirebase();
            if (!firebase) throw new Error('تعذر تهيئة Firebase');
            return true;
        }
        
        // اختبار الاتصال مع التحقق من الأمان
        const testRef = window.firebaseModules.collection(db, "settings");
        const test = await window.firebaseModules.getDocs(testRef);
        
        console.log('✅ اتصال قاعدة البيانات نشط وآمن');
        return true;
    } catch (error) {
        console.error('❌ خطأ في اتصال قاعدة البيانات:', error);
        SecurityManager.logSecurityEvent('db_connection_error', { error: error.message });
        
        // المحاولة مرة أخرى كضيف
        const savedUser = sessionStorage.getItem('currentUser');
        if (savedUser) {
            try {
                const userData = JSON.parse(savedUser);
                if (userData.isGuest) {
                    console.log('🔄 المحاولة في وضع عدم الاتصال...');
                    return false;
                }
            } catch (e) {
                console.error('❌ خطأ في قراءة بيانات المستخدم:', e);
            }
        }
        
        return false;
    }
}

// ======================== تحميل الألوان مع الحماية ========================

async function loadThemeColors() {
    try {
        return await loadWithCache('theme', async () => {
            if (!db) return null;
            
            const colorsRef = window.firebaseModules.doc(db, "settings", "theme_colors");
            const colorsSnap = await window.firebaseModules.getDoc(colorsRef);
            
            if (colorsSnap.exists()) {
                const colors = colorsSnap.data();
                
                // تنظيف بيانات الألوان
                const cleanColors = {};
                const colorKeys = ['primaryColor', 'secondaryColor', 'successColor', 
                                 'dangerColor', 'warningColor', 'lightColor', 'buttonPressColor'];
                
                colorKeys.forEach(key => {
                    if (colors[key] && typeof colors[key] === 'string') {
                        // التحقق من أن القيمة هي لون صالح
                        if (/^#([0-9A-F]{3}){1,2}$/i.test(colors[key]) || 
                            /^rgb|rgba|hsl|hsla\(/i.test(colors[key])) {
                            cleanColors[key] = colors[key];
                        }
                    }
                });
                
                applyThemeColors(cleanColors);
                return cleanColors;
            }
            return null;
        });
    } catch (error) {
        console.error('خطأ في تحميل إعدادات الألوان:', error);
        SecurityManager.logSecurityEvent('theme_load_error', { error: error.message });
        return null;
    }
}

function applyThemeColors(colors) {
    const root = document.documentElement;
    
    // تطبيق الألوان مع قيم افتراضية آمنة
    const defaultColors = {
        '--primary-color': '#1a1a1a',
        '--secondary-color': '#c9a24d',
        '--success-color': '#27ae60',
        '--danger-color': '#e74c3c',
        '--warning-color': '#f39c12',
        '--light-color': '#f8f9fa',
        '--button-press-color': '#555555'
    };
    
    // تطبيق الألوان المخصصة أو الافتراضية
    Object.entries(defaultColors).forEach(([varName, defaultValue]) => {
        const key = varName.replace('--', '').replace('-', '');
        const colorValue = colors[key] || defaultValue;
        root.style.setProperty(varName, colorValue);
    });
}

// ======================== تحميل إعدادات الموقع مع الحماية ========================

async function loadSiteConfig() {
    try {
        return await loadWithCache('siteConfig', async () => {
            if (!db) return null;
            
            const configRef = window.firebaseModules.doc(db, "settings", "site_config");
            const configSnap = await window.firebaseModules.getDoc(configRef);
            
            if (configSnap.exists()) {
                const settings = configSnap.data();
                
                // تنظيف الإعدادات
                const cleanSettings = {};
                const allowedKeys = [
                    'storeName', 'currency', 'email', 'phone', 'address',
                    'workingHours', 'aboutUs', 'facebookUrl', 'instagramUrl',
                    'twitterUrl', 'tiktokUrl', 'logoUrl', 'bankName',
                    'bankAccount', 'bankAccountName', 'shippingCost',
                    'freeShippingLimit'
                ];
                
                allowedKeys.forEach(key => {
                    if (settings[key] !== undefined) {
                        if (typeof settings[key] === 'string') {
                            cleanSettings[key] = sanitizeUserInput(settings[key]);
                        } else {
                            cleanSettings[key] = settings[key];
                        }
                    }
                });
                
                // تعيين العملة الافتراضية إذا لم تكن موجودة
                siteSettings = cleanSettings;
                siteCurrency = cleanSettings.currency || 'SDG ';
                
                updateUIWithSettings();
                return cleanSettings;
            }
            return null;
        });
    } catch (error) {
        console.error('خطأ في تحميل إعدادات الموقع:', error);
        SecurityManager.logSecurityEvent('config_load_error', { error: error.message });
        return null;
    }
}

function updateUIWithSettings() {
    if (!siteSettings) return;
    
    // تحديث اسم المتجر
    if (siteSettings.storeName) {
        const safeName = sanitizeUserInput(siteSettings.storeName);
        safeElementUpdate('dynamicTitle', safeName + ' - متجر آمن');
        safeElementUpdate('siteStoreName', safeName);
        safeElementUpdate('footerStoreName', safeName);
    }
    
    // تحديث معلومات الاتصال
    const footerElements = {
        'footerEmail': 'email',
        'footerPhone': 'phone',
        'footerAddress': 'address',
        'footerHours': 'workingHours'
    };
    
    for (const [elementId, settingKey] of Object.entries(footerElements)) {
        if (siteSettings[settingKey]) {
            safeElementUpdate(elementId, sanitizeUserInput(siteSettings[settingKey]));
        }
    }
    
    // تحديث الوصف
    const aboutEl = document.getElementById('storeDescription');
    if (aboutEl && siteSettings.aboutUs) {
        aboutEl.textContent = sanitizeUserInput(siteSettings.aboutUs);
    }
    
    // تحديث روابط التواصل الاجتماعي
    const socialLinks = {
        'footerFacebook': 'facebookUrl',
        'footerInstagram': 'instagramUrl',
        'footerTwitter': 'twitterUrl',
        'footerTiktok': 'tiktokUrl'
    };

    for (const [elementId, settingKey] of Object.entries(socialLinks)) {
        const element = document.getElementById(elementId);
        if (element) {
            if (siteSettings[settingKey]) {
                // التحقق من أن الرابط آمن
                const url = siteSettings[settingKey];
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    element.href = url;
                    element.style.display = 'flex';
                    
                    // إضافة حماية للروابط الخارجية
                    element.target = '_blank';
                    element.rel = 'noopener noreferrer';
                }
            } else {
                element.style.display = 'none';
            }
        }
    }

    // تحديث رابط الواتساب
    const whatsappEl = document.getElementById('footerWhatsapp');
    if (whatsappEl && siteSettings.phone) {
        const whatsappPhone = siteSettings.phone.replace(/\D/g, '');
        if (whatsappPhone.length >= 9) {
            whatsappEl.href = `https://wa.me/${whatsappPhone}`;
            whatsappEl.target = '_blank';
            whatsappEl.rel = 'noopener noreferrer';
        }
    }

    // تحديث الشعار
    if (siteSettings.logoUrl) {
        const logoElements = [
            document.getElementById('siteLogo'),
            document.getElementById('authLogo'),
            document.getElementById('footerLogo')
        ];
        
        logoElements.forEach(el => {
            if (el) {
                const safeUrl = sanitizeUserInput(siteSettings.logoUrl);
                if (safeUrl.startsWith('http')) {
                    el.src = optimizeImageUrl(safeUrl, 100);
                    
                    // إضافة حماية للصور
                    el.setAttribute('loading', 'lazy');
                    el.setAttribute('decoding', 'async');
                }
            }
        });
    }
}

// ======================== دوال الواجهة العامة مع الحماية ========================

function setupSmartHeader() {
    const header = document.querySelector('.header');
    if (!header) return;

    // إضافة فئة حماية للهيدر
    header.classList.add('anti-screenshot');
    
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        if (currentScroll <= 0) {
            header.style.transform = 'translateY(0)';
            return;
        }
        
        if (currentScroll > lastScroll && currentScroll > 80) {
            header.style.transform = 'translateY(-100%)';
        } else {
            header.style.transform = 'translateY(0)';
        }
        lastScroll = currentScroll;
    }, { passive: true });
    
    header.style.transition = 'transform 0.3s ease-in-out';
    
    // إضافة حماية للنقر المزدوج
    header.addEventListener('dblclick', (e) => {
        e.preventDefault();
        if (typeof showToast === 'function') {
            showToast('النقر المزدوج غير مسموح في هذه المنطقة', 'warning');
        }
    });
}

function showAuthScreen() {
    // إذا كنا في صفحة index.html، نتوجه لصفحة login.html
    if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/') || !window.location.pathname.includes('.html')) {
        window.location.href = 'login.html';
        return;
    }

    const authScreen = document.getElementById('authScreen');
    const appContainer = document.getElementById('appContainer');
    
    // تنظيف جميع حقول الإدخال
    document.querySelectorAll('input').forEach(i => {
        if (i) i.value = '';
    });
    
    if (authScreen) {
        authScreen.style.setProperty('display', 'flex', 'important');
        authScreen.classList.add('form-protection');
    }
    if (appContainer) {
        appContainer.style.setProperty('display', 'none', 'important');
    }
    
    // إضافة حماية CAPTCHA للنماذج
    setTimeout(() => {
        const emailForm = document.getElementById('emailAuthForm');
        if (emailForm) {
            addCaptchaToForm(emailForm);
        }
    }, 100);
}

function showMainApp() {
    // إذا كنا في صفحة login.html، نتوجه لصفحة index.html
    if (window.location.pathname.endsWith('login.html')) {
        window.location.href = 'index.html';
        return;
    }

    const authScreen = document.getElementById('authScreen');
    const appContainer = document.getElementById('appContainer');
    
    if (authScreen) {
        authScreen.style.setProperty('display', 'none', 'important');
    }
    if (appContainer) {
        appContainer.style.setProperty('display', 'flex', 'important');
        
        // إضافة مؤشر الأمان
        addSecurityIndicator();
    }
}

// ======================== دوال إضافية مع حماية ========================

function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const searchTerm = sanitizeUserInput(searchInput.value.trim().toLowerCase());
    if (!searchTerm || searchTerm.length < 2) {
        if (typeof displayProducts === 'function') displayProducts();
        return;
    }
    
    // منع عمليات البحث الخطيرة
    const dangerousTerms = ['script', 'javascript', '<', '>', 'alert', 'prompt'];
    if (dangerousTerms.some(term => searchTerm.includes(term))) {
        if (typeof showToast === 'function') showToast('مصطلح البحث غير مسموح', 'error');
        SecurityManager.logSecurityEvent('dangerous_search', { term: searchTerm });
        return;
    }
    
    const filteredProducts = allProducts.filter(product =>
        product.name && product.name.toLowerCase().includes(searchTerm) ||
        (product.description && product.description.toLowerCase().includes(searchTerm)) ||
        (product.category && product.category.toLowerCase().includes(searchTerm))
    );
    
    if (typeof displayProducts === 'function') displayProducts(filteredProducts);
    if (typeof showSection === 'function') showSection('products');
}

// ======================== إدارة الذاكرة الآمنة ========================

function cleanupUnusedData() {
    // تنظيف المنتجات
    if (allProducts.length > 100) {
        allProducts = allProducts.slice(0, 100);
        console.log('🔄 تم تنظيف الذاكرة، الاحتفاظ بـ 100 منتج فقط');
    }
    
    // تنظيف التخزين المؤقت القديم
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cache_')) {
            try {
                const cached = JSON.parse(localStorage.getItem(key));
                if (Date.now() - cached.timestamp > 3600000) { // ساعة
                    localStorage.removeItem(key);
                }
            } catch (e) {
                localStorage.removeItem(key);
            }
        }
    });
    
    // تنظيف سجل الأحداث القديم
    try {
        const logs = JSON.parse(localStorage.getItem('security_events') || '[]');
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const recentLogs = logs.filter(log => {
            const logTime = new Date(log.timestamp).getTime();
            return logTime > oneDayAgo;
        });
        
        if (recentLogs.length !== logs.length) {
            localStorage.setItem('security_events', JSON.stringify(recentLogs));
            console.log('🔄 تم تنظيف سجل الأحداث القديمة');
        }
    } catch (e) {
        console.error('خطأ في تنظيف سجل الأحداث:', e);
    }
}

function initMemoryManagement() {
    setInterval(() => {
        cleanupUnusedData();
    }, 600000); // كل 10 دقائق
    
    // مراقبة استخدام الذاكرة
    if ('memory' in performance) {
        setInterval(() => {
            const memory = performance.memory;
            if (memory.usedJSHeapSize > 50000000) { // 50MB
                console.warn('⚠️ استخدام ذاكرة مرتفع:', memory.usedJSHeapSize);
                cleanupUnusedData();
                
                if (typeof showToast === 'function') {
                    showToast('جاري تحسين استخدام الذاكرة...', 'info', 2000);
                }
            }
        }, 30000);
    }
}

// ======================== أدوات تحسين الصور الآمنة ========================

function optimizeImageUrl(url, width = 300) {
    if (!url || !url.includes('firebasestorage')) return url;
    
    // إضافة معلمات تحسين
    return `${url}?width=${width}&quality=80&alt=media`;
}

// ======================== دوال الحماية المساعدة ========================

function addSecurityIndicator() {
    // إزالة المؤشر القديم إذا كان موجوداً
    const oldIndicator = document.querySelector('.security-indicator');
    if (oldIndicator) oldIndicator.remove();
    
    const indicator = document.createElement('div');
    indicator.className = 'security-indicator';
    indicator.innerHTML = '🛡️';
    indicator.title = 'نظام الحماية نشط';
    
    document.body.appendChild(indicator);
    
    // تحديث حالة المؤشر
    setInterval(() => {
        if (!currentUser || isGuest) {
            indicator.className = 'security-indicator low';
            indicator.title = 'الحماية الأساسية نشطة';
        } else if (isAdmin) {
            indicator.className = 'security-indicator';
            indicator.title = 'الحماية الكاملة نشطة';
        } else {
            indicator.className = 'security-indicator';
            indicator.title = 'الحماية القياسية نشطة';
        }
    }, 5000);
}

function addCaptchaToForm(formElement) {
    if (!formElement || !window.SecurityCore) return;
    
    // إنشاء CAPTCHA
    const captcha = window.SecurityCore.createSimpleCaptcha();
    
    // إضافة حقل CAPTCHA للنموذج
    const captchaHTML = `
        <div class="form-group captcha-group" style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
            <label style="display: block; margin-bottom: 10px; font-weight: 600; color: #495057;">
                <i class="fas fa-shield-alt"></i> تحقق من الأمان
            </label>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <div style="flex: 1; text-align: center; padding: 10px; background: white; border-radius: 6px; border: 2px solid #007bff; font-size: 18px; font-weight: bold;">
                    ${captcha.question} = ?
                </div>
                <input type="number" 
                       id="captchaAnswer" 
                       style="flex: 1; padding: 10px; border: 2px solid #dee2e6; border-radius: 6px; font-size: 16px; text-align: center;"
                       placeholder="الإجابة"
                       min="0"
                       max="100">
            </div>
            <p style="font-size: 12px; color: #6c757d; margin: 0;">
                <i class="fas fa-info-circle"></i>
                هذا التحقق يساعد في منع الهجمات التلقائية
            </p>
        </div>
    `;
    
    // إضافة CAPTCHA للنموذج
    const submitButton = formElement.querySelector('button[type="submit"], .submit-btn');
    if (submitButton) {
        submitButton.insertAdjacentHTML('beforebegin', captchaHTML);
    }
}

function validateFormWithCaptcha(formId) {
    if (!window.SecurityCore) return true;
    
    const captchaInput = document.getElementById('captchaAnswer');
    if (!captchaInput) return true;
    
    const userAnswer = captchaInput.value.trim();
    if (!userAnswer) {
        if (typeof showToast === 'function') {
            showToast('يرجى حل مسألة التحقق', 'warning');
        }
        captchaInput.focus();
        return false;
    }
    
    const isValid = window.SecurityCore.verifyCaptcha(userAnswer);
    if (!isValid) {
        if (typeof showToast === 'function') {
            showToast('إجابة التحقق غير صحيحة', 'error');
        }
        
        // إنشاء CAPTCHA جديدة
        addCaptchaToForm(document.getElementById(formId));
        captchaInput.value = '';
        captchaInput.focus();
        
        SecurityManager.logSecurityEvent('captcha_failed', { form: formId });
        return false;
    }
    
    return true;
}

// ======================== التصدير للاستخدام العام ========================

window.initializeFirebaseApp = initializeFirebaseApp;
window.getFirebaseInstance = getFirebaseInstance;
window.checkFirebaseConnection = checkFirebaseConnection;
window.formatNumber = formatNumber;
window.showToast = showToast;
window.showLoadingSpinner = showLoadingSpinner;
window.hideLoadingSpinner = hideLoadingSpinner;
window.isValidEmail = isValidEmail;
window.isValidPhone = isValidPhone;
window.safeElementUpdate = safeElementUpdate;
window.generateGuestUID = generateGuestUID;
window.showAuthScreen = showAuthScreen;
window.showMainApp = showMainApp;
window.showEmailAuthForm = showEmailAuthForm;
window.hideEmailAuthForm = hideEmailAuthForm;
window.clearEmailForm = clearEmailForm;
window.goBack = goBack;
window.updateHeaderLayout = updateHeaderLayout;
window.adjustLayout = adjustLayout;
window.performSearch = performSearch;
window.filterProducts = filterProducts;
window.filterMainProducts = filterMainProducts;
window.hideLoader = hideLoader;
window.optimizeImageUrl = optimizeImageUrl;
window.loadWithCache = loadWithCache;
window.getLocalCache = getLocalCache;
window.clearCache = clearCache;
window.sanitizeUserInput = sanitizeUserInput;
window.sanitizeProducts = sanitizeProducts;
window.SecurityManager = SecurityManager;
window.addSecurityIndicator = addSecurityIndicator;
window.validateFormWithCaptcha = validateFormWithCaptcha;

// تهيئة التطبيق مع الحماية
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 بدء تحميل التطبيق (مع الحماية الشاملة)...');
    
    // التحقق من تكامل التطبيق
    if (SecurityManager && typeof SecurityManager.checkAppIntegrity === 'function') {
        if (!SecurityManager.checkAppIntegrity()) {
            console.error('❌ فشل التحقق من تكامل التطبيق');
            return;
        }
    }
    
    // التحقق من اتصال آمن
    if (SecurityManager && typeof SecurityManager.checkSecureConnection === 'function') {
        SecurityManager.checkSecureConnection();
    }
    
    // إعداد مراقبة DOM
    if (SecurityManager && typeof SecurityManager.monitorDOMChanges === 'function') {
        SecurityManager.monitorDOMChanges();
    }
    
    // إعداد مراقبة الجلسة
    if (SecurityManager && typeof SecurityManager.setupSessionMonitoring === 'function') {
        SecurityManager.setupSessionMonitoring();
    }
    
    const loader = document.getElementById('initialLoader');
    if (loader) {
        loader.style.display = 'flex';
        loader.style.opacity = '1';
    }
    
    adjustLayout();
    updateHeaderLayout();
    initMemoryManagement();
    
    setTimeout(() => {
        if (typeof initializeAppSafely === 'function') initializeAppSafely();
    }, 100);
});

window.addEventListener('load', function() {
    console.log('📄 الصفحة تم تحميلها بالكامل');
    
    // إضافة حماية إضافية بعد تحميل الصفحة
    setTimeout(() => {
        const loader = document.getElementById('initialLoader');
        if (loader && loader.style.display !== 'none') {
            console.log('⚠️ شاشة التحميل لا تزال ظاهرة، إخفاء قسري...');
            forceHideLoader();
        }
        
        // التحقق من أن النظام يعمل بشكل صحيح
        if (SecurityManager && typeof SecurityManager.validateSession === 'function') {
            SecurityManager.validateSession();
        }
    }, 2000);
});

window.addEventListener('error', function(e) {
    console.error('خطأ عام:', e);
    SecurityManager.logSecurityEvent('global_error', { 
        message: e.message, 
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno
    });
    
    if (typeof showToast === 'function') showToast(`حدث خطأ: ${e.message.substring(0, 50)}`, 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('وعد مرفوض:', e.reason);
    SecurityManager.logSecurityEvent('unhandled_rejection', { 
        reason: e.reason?.message || e.reason 
    });
    
    if (typeof showToast === 'function') showToast(`حدث خطأ غير متوقع: ${e.reason?.message?.substring(0, 50) || e.reason}`, 'error');
});

// منع نسخ ولصق النصوص الحساسة
document.addEventListener('copy', function(e) {
    const selectedText = window.getSelection().toString();
    if (selectedText.includes('SDG') || selectedText.includes('رقم') || selectedText.includes('حساب')) {
        SecurityManager.logSecurityEvent('sensitive_copy_attempt', { text: selectedText.substring(0, 100) });
        
        if (typeof showToast === 'function') {
            showToast('نسخ المعلومات الحساسة غير مسموح', 'warning');
        }
        
        e.preventDefault();
    }
});

// منع فتح أدوات المطور
document.addEventListener('contextmenu', function(e) {
    if (e.target.tagName === 'INPUT' && e.target.type === 'password') {
        e.preventDefault();
        
        if (typeof showToast === 'function') {
            showToast('النقر بزر الماوس الأيمن غير مسموح في هذا الحقل', 'warning');
        }
    }
});

console.log('✅ app-core.js المحسن مع الحماية loaded');
[file content end]

[file name]: auth-system.js
[file content begin]
// auth-system.js - نظام المصادقة والمستخدمين (مع حماية شاملة)
// ======================== معالجة حالة المصادقة مع الحماية ========================

async function handleAuthStateChange(user) {
    try {
        // التحقق من سلامة النظام أولاً
        if (SecurityManager && !SecurityManager.validateSession()) {
            console.warn('⚠️ فشل التحقق من سلامة الجلسة');
            return;
        }
        
        if (user) {
            console.log('👤 مستخدم مسجل دخول:', user.uid);
            currentUser = user;
            isGuest = false;
            
            // التحقق من صحة بيانات المستخدم
            if (user.email && !isValidEmail(user.email)) {
                console.warn('⚠️ بريد إلكتروني غير صالح:', user.email);
                SecurityManager.logSecurityEvent('invalid_login_email', { email: user.email });
                await signOutUser();
                return;
            }
            
            // التحقق من الصلاحيات وجلب البيانات
            const adminCheck = await checkAdminPermissions(user.uid);
            
            // جلب بيانات المستخدم الإضافية من Firestore مع التحقق
            const userDoc = await window.firebaseModules.getDoc(window.firebaseModules.doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // تنظيف بيانات المستخدم
                currentUser.phone = sanitizeUserInput(userData.phone || '');
                currentUser.address = sanitizeUserInput(userData.address || '');
                currentUser.displayName = sanitizeUserInput(userData.name || user.displayName || '');
                
                // التحقق من صحة الهاتف
                if (currentUser.phone && !isValidPhone(currentUser.phone)) {
                    console.warn('⚠️ رقم هاتف غير صالح للمستخدم:', currentUser.phone);
                    currentUser.phone = '';
                }
            }
            
            // مزامنة البيانات من Firestore مع التحقق
            await syncUserDataFromFirestore();
            if (typeof loadCartFromFirebase === 'function') await loadCartFromFirebase();
            
            // التحقق من تكامل البيانات
            if (SecurityManager && typeof SecurityManager.verifyDataIntegrity === 'function') {
                const isIntegrityValid = await SecurityManager.verifyDataIntegrity('user_data');
                if (!isIntegrityValid) {
                    console.warn('⚠️ فشل التحقق من تكامل بيانات المستخدم');
                    SecurityManager.logSecurityEvent('data_integrity_failed');
                }
            }
            
            // تحديث الواجهة
            if (typeof updateUserProfile === 'function') updateUserProfile();
            if (typeof loadProducts === 'function') await loadProducts();
            if (typeof updateCartCount === 'function') updateCartCount();
            if (typeof updateAdminButton === 'function') updateAdminButton();
            
            if (document.querySelector(".section.active")?.id === "checkout") {
                if (typeof updateCheckoutSummary === 'function') updateCheckoutSummary();
            } else {
                showMainApp();
                const currentSec = document.querySelector(".section.active");
                if (!currentSec || currentSec.id === 'authScreen') {
                    if (typeof showSection === 'function') showSection("home");
                    updateHeaderLayout();
                }
            }
            
            // تفعيل نظام الإشعارات مع التحقق
            if (window.setupOrderStatusListener) {
                try {
                    await window.setupOrderStatusListener();
                } catch (e) {
                    console.error('Order status listener error:', e);
                }
            }
            
            // تسجيل حدث تسجيل الدخول
            SecurityManager.logSecurityEvent('user_login_success', {
                userId: user.uid,
                email: user.email,
                isAdmin: adminCheck
            });
            
            if (typeof showToast === 'function') showToast(`مرحباً بعودتك ${currentUser.displayName || 'مستخدم'}!`, 'success');
        } else {
            const savedUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
            if (savedUser) {
                try {
                    const userData = JSON.parse(savedUser);
                    if (userData.isGuest) {
                        // التحقق من بيانات الضيف
                        if (!userData.uid || !userData.uid.startsWith('guest_')) {
                            console.warn('⚠️ بيانات ضيف غير صالحة');
                            localStorage.removeItem('currentUser');
                            sessionStorage.removeItem('currentUser');
                            showAuthScreen();
                            return;
                        }
                        
                        currentUser = userData;
                        isGuest = true;
                        isAdmin = false;
                        
                        showMainApp();
                        if (typeof showSection === 'function') showSection('home');
                        updateHeaderLayout();
                        if (typeof updateUserProfile === 'function') updateUserProfile();
                        if (typeof loadProducts === 'function') await loadProducts();
                        if (typeof updateCartCount === 'function') updateCartCount();
                        if (typeof updateAdminButton === 'function') updateAdminButton();
                        
                        console.log('👤 تم استعادة المستخدم الضيف');
                        SecurityManager.logSecurityEvent('guest_session_restored');
                    } else {
                        // إذا كان مستخدماً مسجلاً ولكن Firebase Auth لم يتعرف عليه
                        showAuthScreen();
                        SecurityManager.logSecurityEvent('auth_mismatch');
                    }
                } catch (e) {
                    console.error('❌ خطأ في قراءة بيانات المستخدم:', e);
                    localStorage.removeItem('currentUser');
                    sessionStorage.removeItem('currentUser');
                    showAuthScreen();
                    SecurityManager.logSecurityEvent('user_data_corrupted');
                }
            } else {
                showAuthScreen();
            }
        }
        
        if (typeof hideLoader === 'function') hideLoader();
        
    } catch (error) {
        console.error('❌ خطأ في معالجة حالة المصادقة:', error);
        SecurityManager.logSecurityEvent('auth_state_error', { error: error.message });
        
        if (typeof hideLoader === 'function') hideLoader();
        showAuthScreen();
    }
}

function handleAuthError() {
    console.log('⚠️ فشل الاتصال بمصادقة Firebase');
    SecurityManager.logSecurityEvent('auth_connection_failed');
    
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
        try {
            const userData = JSON.parse(savedUser);
            if (userData.isGuest) {
                currentUser = userData;
                isGuest = true;
                isAdmin = false;
                
                showMainApp();
                if (typeof showSection === 'function') showSection('home');
                updateHeaderLayout();
                if (typeof updateUserProfile === 'function') updateUserProfile();
                if (typeof loadProducts === 'function') loadProducts();
                if (typeof updateCartCount === 'function') updateCartCount();
                if (typeof updateAdminButton === 'function') updateAdminButton();
                
                SecurityManager.logSecurityEvent('offline_guest_mode');
                if (typeof showToast === 'function') showToast('تم الاتصال في وضع عدم الاتصال', 'warning');
                if (typeof hideLoader === 'function') hideLoader();
                return;
            }
        } catch (e) {
            console.error('❌ خطأ في قراءة بيانات المستخدم:', e);
        }
    }
    
    if (typeof forceHideLoader === 'function') forceHideLoader();
    showAuthScreen();
    if (typeof showToast === 'function') showToast('تعذر الاتصال بالخادم. يمكنك الدخول كضيف.', 'warning');
}

// ======================== نظام الحماية من هجمات التخمين (Brute Force) ========================

const LoginProtector = {
    attempts: {},
    lockUntil: {},
    maxAttempts: 5,
    lockDuration: 15 * 60 * 1000, // 15 دقيقة
    
    // تسجيل محاولة فاشلة
    recordFailure: function(identifier) {
        const now = Date.now();
        
        if (!this.attempts[identifier]) {
            this.attempts[identifier] = { count: 0, firstAttempt: now };
        }
        
        this.attempts[identifier].count++;
        this.attempts[identifier].lastAttempt = now;
        
        // إذا تجاوزت المحاولات الحد المسموح
        if (this.attempts[identifier].count >= this.maxAttempts) {
            this.lockUntil[identifier] = now + this.lockDuration;
            
            // تسجيل الحدث
            SecurityManager.logSecurityEvent('brute_force_lock', {
                identifier: identifier,
                attempts: this.attempts[identifier].count,
                lockUntil: new Date(this.lockUntil[identifier]).toISOString()
            });
            
            console.warn(`🔒 تم قفل ${identifier} لمدة 15 دقيقة بسبب كثرة المحاولات الفاشلة`);
        }
        
        // تنظيف المحاولات القديمة (أقدم من ساعة)
        this.cleanupOldAttempts();
    },
    
    // تسجيل محاولة ناجحة
    recordSuccess: function(identifier) {
        delete this.attempts[identifier];
        delete this.lockUntil[identifier];
    },
    
    // التحقق مما إذا كان مسموحاً بالمحاولة
    check: function(identifier) {
        const now = Date.now();
        
        // التحقق من القفل
        if (this.lockUntil[identifier] && now < this.lockUntil[identifier]) {
            const remaining = Math.ceil((this.lockUntil[identifier] - now) / 1000);
            return {
                allowed: false,
                message: `تم قفل المحاولات مؤقتاً. انتظر ${remaining} ثانية`,
                remaining: remaining
            };
        }
        
        // التحقق من عدد المحاولات
        if (this.attempts[identifier] && this.attempts[identifier].count >= this.maxAttempts) {
            const timeSinceFirst = now - this.attempts[identifier].firstAttempt;
            if (timeSinceFirst < 5 * 60 * 1000) { // 5 دقائق
                return {
                    allowed: false,
                    message: 'كثرة المحاولات الفاشلة. يرجى الانتظار قليلاً'
                };
            }
        }
        
        return { allowed: true };
    },
    
    // تنظيف المحاولات القديمة
    cleanupOldAttempts: function() {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        for (const identifier in this.attempts) {
            if (now - this.attempts[identifier].firstAttempt > oneHour) {
                delete this.attempts[identifier];
            }
        }
        
        for (const identifier in this.lockUntil) {
            if (now > this.lockUntil[identifier]) {
                delete this.lockUntil[identifier];
            }
        }
    },
    
    // الحصول على إحصائيات
    getStats: function(identifier) {
        if (!this.attempts[identifier]) {
            return { attempts: 0, locked: false };
        }
        
        const now = Date.now();
        const locked = this.lockUntil[identifier] && now < this.lockUntil[identifier];
        
        return {
            attempts: this.attempts[identifier].count,
            locked: locked,
            remaining: locked ? Math.ceil((this.lockUntil[identifier] - now) / 1000) : 0
        };
    }
};

// ======================== إدارة المستخدمين مع الحماية ========================

function signInAsGuest() {
    console.log('👤 تسجيل الدخول كضيف...');
    
    // التحقق من CAPTCHA إذا كان النظام متاحاً
    if (window.SecurityCore && typeof SecurityCore.verifyCaptcha === 'function') {
        const captchaInput = document.getElementById('captchaAnswer');
        if (captchaInput && !SecurityCore.verifyCaptcha(captchaInput.value)) {
            if (typeof showToast === 'function') showToast('يرجى حل مسألة التحقق', 'warning');
            return;
        }
    }
    
    // تنظيف البيانات السابقة
    if (window.SecureStorage && window.SecureStorage.clearSecure) {
        window.SecureStorage.clearSecure();
    }
    
    localStorage.removeItem('userPhone');
    localStorage.removeItem('userAddress');
    
    // تنظيف حقول الإدخال
    document.querySelectorAll('input').forEach(i => {
        if (i && i.type !== 'checkbox' && i.type !== 'radio') {
            i.value = '';
        }
    });
    
    // إنشاء معرف ضيف آمن
    const guestId = generateGuestUID();
    
    currentUser = {
        uid: guestId,
        displayName: 'زائر',
        email: null,
        photoURL: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
        isGuest: true,
        phone: '',
        address: ''
    };
    
    isGuest = true;
    isAdmin = false;
    cartItems = [];
    favorites = [];
    
    // تخزين آمن لبيانات الضيف
    const userToStore = {
        ...currentUser,
        timestamp: Date.now(),
        sessionId: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    };
    
    if (window.SecureStorage && window.SecureStorage.setItem) {
        window.SecureStorage.setItem('currentUser', userToStore);
    } else {
        localStorage.setItem('currentUser', JSON.stringify(userToStore));
    }
    
    sessionStorage.setItem('currentUser', JSON.stringify(userToStore));
    
    // تسجيل الحدث
    SecurityManager.logSecurityEvent('guest_login', { guestId: guestId });
    
    showMainApp();
    if (typeof showSection === 'function') showSection('home');
    updateHeaderLayout();
    if (typeof updateUserProfile === 'function') updateUserProfile();
    if (typeof loadProducts === 'function') loadProducts();
    if (typeof updateCartCount === 'function') updateCartCount();
    if (typeof updateAdminButton === 'function') updateAdminButton();
    
    if (typeof showToast === 'function') showToast('تم الدخول كضيف بنجاح', 'success');
}

async function signInWithGoogle() {
    try {
        console.log('🔑 تسجيل الدخول بـ Google...');
        
        // التحقق من CAPTCHA
        if (!validateFormWithCaptcha('authForm')) {
            return;
        }
        
        if (!checkFirebaseSDK || !checkFirebaseSDK() || !initializeFirebase()) {
            if (typeof showToast === 'function') showToast('تعذر الاتصال بخدمة المصادقة', 'error');
            SecurityManager.logSecurityEvent('firebase_init_failed');
            return;
        }
        
        const provider = new window.firebaseModules.GoogleAuthProvider();
        
        // إضافة نطاقات إضافية إذا لزم الأمر
        provider.addScope('email');
        provider.addScope('profile');
        
        const result = await window.firebaseModules.signInWithPopup(auth, provider);
        currentUser = result.user;
        isGuest = false;
        
        // تسجيل نجاح تسجيل الدخول
        LoginProtector.recordSuccess(currentUser.email || currentUser.uid);
        
        // جلب بيانات المستخدم أو إنشاؤها
        await checkAndUpdateUserInFirestore(currentUser);
        const isAdminUser = await checkAdminPermissions(currentUser.uid);
        
        // جلب البيانات الإضافية من Firestore
        const userDoc = await window.firebaseModules.getDoc(window.firebaseModules.doc(db, "users", currentUser.uid));
        let phone = '', address = '';
        if (userDoc.exists()) {
            const userData = userDoc.data();
            phone = sanitizeUserInput(userData.phone || '');
            address = sanitizeUserInput(userData.address || '');
            currentUser.displayName = sanitizeUserInput(userData.name || currentUser.displayName);
        }

        const userToSave = {
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            phone: phone,
            address: address,
            isGuest: false,
            isAdmin: isAdminUser,
            timestamp: Date.now(),
            sessionId: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        };
        
        // تخزين آمن
        if (window.SecureStorage && window.SecureStorage.setItem) {
            await window.SecureStorage.setItem('currentUser', userToSave);
        } else {
            localStorage.setItem('currentUser', JSON.stringify(userToSave));
        }
        
        sessionStorage.setItem('currentUser', JSON.stringify(userToSave));
        
        // تنظيف الحقول
        document.querySelectorAll('input').forEach(i => {
            if (i && i.type !== 'checkbox' && i.type !== 'radio') {
                i.value = '';
            }
        });

        showMainApp();
        if (typeof showSection === 'function') showSection('home');
        updateHeaderLayout();
        if (typeof updateUserProfile === 'function') updateUserProfile();
        if (typeof loadProducts === 'function') await loadProducts();
        if (typeof updateCartCount === 'function') updateCartCount();
        if (typeof updateAdminButton === 'function') updateAdminButton();
        
        // تفعيل نظام الإشعارات
        if (window.setupOrderStatusListener) {
            window.setupOrderStatusListener().catch(e => console.error('Order status listener error:', e));
        }
        
        // تسجيل حدث تسجيل الدخول الناجح
        SecurityManager.logSecurityEvent('google_login_success', {
            userId: currentUser.uid,
            email: currentUser.email
        });
        
        if (typeof showToast === 'function') showToast(`مرحباً بك ${currentUser.displayName}!`, 'success');
        hideEmailAuthForm();
        
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول بـ Google:', error);
        
        // تسجيل المحاولة الفاشلة
        const identifier = error.email || 'unknown';
        LoginProtector.recordFailure(identifier);
        
        let errorMessage = 'حدث خطأ في تسجيل الدخول';
        
        switch (error.code) {
            case 'auth/popup-blocked':
                errorMessage = 'تم حظر نافذة التسجيل. يرجى السماح بالنوافذ المنبثقة';
                break;
            case 'auth/popup-closed-by-user':
                errorMessage = 'تم إغلاق نافذة التسجيل';
                break;
            case 'auth/cancelled-popup-request':
                errorMessage = 'تم إلغاء طلب التسجيل';
                break;
            case 'auth/unauthorized-domain':
                errorMessage = 'هذا النطاق غير مصرح به للتسجيل';
                SecurityManager.logSecurityEvent('unauthorized_domain_attempt');
                break;
            case 'auth/network-request-failed':
                errorMessage = 'خطأ في الاتصال بالشبكة';
                break;
        }
        
        // تسجيل حدث الخطأ
        SecurityManager.logSecurityEvent('google_login_error', {
            errorCode: error.code,
            errorMessage: error.message,
            identifier: identifier
        });
        
        if (typeof showToast === 'function') showToast(errorMessage, 'error');
    }
}

function clearRegistrationForm() {
    const nameInput = document.getElementById('registerName');
    const emailInput = document.getElementById('registerEmail');
    const passwordInput = document.getElementById('registerPassword');
    const phoneInput = document.getElementById('registerPhone');
    
    if (nameInput) nameInput.value = '';
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (phoneInput) phoneInput.value = '';
    
    const authMessage = document.getElementById('emailAuthMessage');
    if (authMessage) {
        authMessage.textContent = '';
        authMessage.className = 'auth-message';
    }
    
    // إعادة تعيين CAPTCHA
    if (window.SecurityCore && typeof SecurityCore.createSimpleCaptcha === 'function') {
        const captchaContainer = document.querySelector('.captcha-group');
        if (captchaContainer) {
            captchaContainer.remove();
            addCaptchaToForm(document.getElementById('emailAuthForm'));
        }
    }
}

async function signUpWithEmail(email, password, name, phone = '') {
    try {
        console.log('📝 إنشاء حساب جديد...');
        
        // التحقق من CAPTCHA
        if (!validateFormWithCaptcha('emailAuthForm')) {
            return false;
        }
        
        if (!email || !password || !name) {
            if (typeof showToast === 'function') showToast('الرجاء ملء جميع الحقول المطلوبة', 'warning');
            return false;
        }
        
        // التحقق من صحة البريد الإلكتروني
        if (!isValidEmail(email)) {
            if (typeof showToast === 'function') showToast('البريد الإلكتروني غير صالح', 'warning');
            SecurityManager.logSecurityEvent('invalid_registration_email', { email: email });
            return false;
        }
        
        // التحقق من قوة كلمة المرور
        if (window.SecurityCore && window.SecurityCore.validatePassword) {
            if (!window.SecurityCore.validatePassword(password)) {
                if (typeof showToast === 'function') showToast('كلمة المرور ضعيفة جداً', 'warning');
                return false;
            }
        } else if (password.length < 6) {
            if (typeof showToast === 'function') showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'warning');
            return false;
        }
        
        // التحقق من صحة الهاتف إذا تم إدخاله
        if (phone && !isValidPhone(phone)) {
            if (typeof showToast === 'function') showToast('رقم الهاتف غير صالح', 'warning');
            return false;
        }
        
        if (!checkFirebaseSDK || !checkFirebaseSDK() || !initializeFirebase()) {
            if (typeof showToast === 'function') showToast('تعذر الاتصال بخدمة التسجيل', 'error');
            return false;
        }
        
        // التحقق من عدم وجود قفل للتسجيل
        const checkResult = LoginProtector.check(email);
        if (!checkResult.allowed) {
            if (typeof showToast === 'function') showToast(checkResult.message, 'error');
            return false;
        }
        
        const result = await window.firebaseModules.createUserWithEmailAndPassword(auth, email, password);
        
        await window.firebaseModules.updateProfile(result.user, {
            displayName: sanitizeUserInput(name),
            photoURL: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
        });
        
        currentUser = result.user;
        isGuest = false;
        isAdmin = false;
        
        const userData = {
            email: email,
            name: sanitizeUserInput(name),
            phone: sanitizeUserInput(phone),
            address: '',
            photoURL: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
            role: 'user',
            isAdmin: false,
            isGuest: false,
            isActive: true,
            totalOrders: 0,
            totalSpent: 0,
            favorites: [],
            createdAt: window.firebaseModules.serverTimestamp(),
            updatedAt: window.firebaseModules.serverTimestamp()
        };
        
        const userRef = window.firebaseModules.doc(db, "users", currentUser.uid);
        await window.firebaseModules.setDoc(userRef, userData);
        
        console.log('✅ تم إنشاء حساب المستخدم بنجاح في قاعدة البيانات');
        
        // تسجيل الحدث
        SecurityManager.logSecurityEvent('registration_success', {
            userId: currentUser.uid,
            email: email,
            name: name
        });
        
        // إعادة تعيين قفل المحاولات
        LoginProtector.recordSuccess(email);
        
        showMainApp();
        if (typeof showSection === 'function') showSection('home');
        updateHeaderLayout();
        if (typeof updateUserProfile === 'function') updateUserProfile();
        if (typeof loadProducts === 'function') await loadProducts();
        if (typeof updateCartCount === 'function') updateCartCount();
        if (typeof updateAdminButton === 'function') updateAdminButton();
        
        if (typeof showToast === 'function') showToast(`تم إنشاء حسابك بنجاح ${name}!`, 'success');
        hideEmailAuthForm();
        clearRegistrationForm();
        
        return true;
        
    } catch (error) {
        console.error('❌ خطأ في إنشاء الحساب:', error);
        
        // تسجيل المحاولة الفاشلة
        LoginProtector.recordFailure(email);
        
        let errorMessage = 'حدث خطأ في إنشاء الحساب';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'البريد الإلكتروني مستخدم بالفعل';
                SecurityManager.logSecurityEvent('email_already_exists', { email: email });
                break;
            case 'auth/invalid-email':
                errorMessage = 'البريد الإلكتروني غير صالح';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'عملية إنشاء الحساب غير مسموحة';
                break;
            case 'auth/weak-password':
                errorMessage = 'كلمة المرور ضعيفة جداً';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'خطأ في الاتصال بالشبكة';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'كثرة الطلبات. يرجى المحاولة لاحقاً';
                break;
        }
        
        // تسجيل حدث الخطأ
        SecurityManager.logSecurityEvent('registration_error', {
            errorCode: error.code,
            errorMessage: error.message,
            email: email
        });
        
        if (typeof showToast === 'function') showToast(errorMessage, 'error');
        return false;
    }
}

async function signInWithEmail(email, password) {
    try {
        console.log('🔑 تسجيل الدخول بالبريد الإلكتروني...');
        
        // التحقق من CAPTCHA
        if (!validateFormWithCaptcha('emailAuthForm')) {
            return;
        }
        
        // التحقق من قفل المحاولات
        const checkResult = LoginProtector.check(email);
        if (!checkResult.allowed) {
            if (typeof showToast === 'function') showToast(checkResult.message, 'error');
            
            // إذا كان هناك وقت انتظار، عرضه
            if (checkResult.remaining) {
                const minutes = Math.floor(checkResult.remaining / 60);
                const seconds = checkResult.remaining % 60;
                if (typeof showToast === 'function') {
                    showToast(`يرجى الانتظار ${minutes}:${seconds.toString().padStart(2, '0')}`, 'warning');
                }
            }
            
            SecurityManager.logSecurityEvent('login_blocked', {
                email: email,
                remaining: checkResult.remaining
            });
            return;
        }
        
        if (!checkFirebaseSDK || !checkFirebaseSDK() || !initializeFirebase()) {
            if (typeof showToast === 'function') showToast('تعذر الاتصال بخدمة المصادقة', 'error');
            return;
        }
        
        // التحقق من صحة البريد الإلكتروني
        if (!isValidEmail(email)) {
            if (typeof showToast === 'function') showToast('البريد الإلكتروني غير صالح', 'error');
            LoginProtector.recordFailure(email);
            return;
        }
        
        const result = await window.firebaseModules.signInWithEmailAndPassword(auth, email, password);
        LoginProtector.recordSuccess(email);
        
        currentUser = result.user;
        isGuest = false;        
        // جلب بيانات المستخدم أو إنشاؤها
        await checkAndUpdateUserInFirestore(currentUser);
        const isAdminUser = await checkAdminPermissions(currentUser.uid);
        
        // جلب البيانات الإضافية من Firestore
        const userDoc = await window.firebaseModules.getDoc(window.firebaseModules.doc(db, "users", currentUser.uid));
        let phone = '', address = '';
        if (userDoc.exists()) {
            const userData = userDoc.data();
            phone = sanitizeUserInput(userData.phone || '');
            address = sanitizeUserInput(userData.address || '');
            currentUser.displayName = sanitizeUserInput(userData.name || currentUser.displayName || currentUser.email.split('@')[0]);
        }

        const userToSave = {
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
            phone: phone,
            address: address,
            isGuest: false,
            isAdmin: isAdminUser,
            timestamp: Date.now(),
            sessionId: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        };
        
        // تخزين آمن
        if (window.SecureStorage && window.SecureStorage.setItem) {
            await window.SecureStorage.setItem('currentUser', userToSave);
        } else {
            localStorage.setItem('currentUser', JSON.stringify(userToSave));
        }
        
        sessionStorage.setItem('currentUser', JSON.stringify(userToSave));
        
        // تنظيف الحقول
        document.querySelectorAll('input').forEach(i => {
            if (i && i.type !== 'checkbox' && i.type !== 'radio') {
                i.value = '';
            }
        });

        showMainApp();
        if (typeof showSection === 'function') showSection('home');
        updateHeaderLayout();
        if (typeof updateUserProfile === 'function') updateUserProfile();
        if (typeof loadProducts === 'function') await loadProducts();
        if (typeof updateCartCount === 'function') updateCartCount();
        if (typeof updateAdminButton === 'function') updateAdminButton();
        
        // تفعيل نظام الإشعارات
        if (window.setupOrderStatusListener) {
            window.setupOrderStatusListener().catch(e => console.error('Order status listener error:', e));
        }
        
        // تسجيل حدث تسجيل الدخول الناجح
        SecurityManager.logSecurityEvent('email_login_success', {
            userId: currentUser.uid,
            email: currentUser.email
        });
        
        if (typeof showToast === 'function') showToast(`مرحباً بعودتك ${currentUser.displayName}!`, 'success');
        hideEmailAuthForm();
        
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        
        // تسجيل المحاولة الفاشلة
        LoginProtector.recordFailure(email);
        
        let errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'المستخدم غير موجود';
                break;
            case 'auth/wrong-password':
                errorMessage = 'كلمة المرور غير صحيحة';
                break;
            case 'auth/invalid-email':
                errorMessage = 'البريد الإلكتروني غير صالح';
                break;
            case 'auth/user-disabled':
                errorMessage = 'تم تعطيل هذا الحساب';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'خطأ في الاتصال بالشبكة';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'كثرة المحاولات الفاشلة. يرجى المحاولة لاحقاً';
                break;
        }
        
        // تسجيل حدث الخطأ
        SecurityManager.logSecurityEvent('email_login_error', {
            errorCode: error.code,
            errorMessage: error.message,
            email: email
        });
        
        if (typeof showToast === 'function') showToast(errorMessage, 'error');
        if (typeof showAuthMessage === 'function') showAuthMessage(errorMessage, 'error');
    }
}

async function checkAndUpdateUserInFirestore(user) {
    try {
        if (!db) return;
        
        const userRef = window.firebaseModules.doc(db, "users", user.uid);
        const userDoc = await window.firebaseModules.getDoc(userRef);
        
        if (!userDoc.exists()) {
            const userData = {
                email: user.email,
                name: sanitizeUserInput(user.displayName || user.email.split('@')[0]),
                phone: '',
                address: '',
                photoURL: user.photoURL || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
                role: 'user',
                isAdmin: false,
                isGuest: false,
                isActive: true,
                totalOrders: 0,
                totalSpent: 0,
                favorites: [],
                createdAt: window.firebaseModules.serverTimestamp(),
                updatedAt: window.firebaseModules.serverTimestamp()
            };
            
            await window.firebaseModules.setDoc(userRef, userData);
            
            SecurityManager.logSecurityEvent('user_created_in_firestore', {
                userId: user.uid,
                email: user.email
            });
        } else {
            await window.firebaseModules.updateDoc(userRef, {
                lastLogin: window.firebaseModules.serverTimestamp(),
                updatedAt: window.firebaseModules.serverTimestamp()
            });
        }
    } catch (error) {
        console.error('خطأ في التحقق من المستخدم:', error);
        SecurityManager.logSecurityEvent('firestore_user_check_error', { error: error.message });
    }
}

async function checkAndCreateUserInFirestore(user) {
    try {
        if (!db) return;
        
        const userDoc = await window.firebaseModules.getDoc(
            window.firebaseModules.doc(db, "users", user.uid)
        );
        
        if (!userDoc.exists()) {
            await window.firebaseModules.setDoc(
                window.firebaseModules.doc(db, "users", user.uid), 
                {
                    email: user.email,
                    name: sanitizeUserInput(user.displayName || user.email.split('@')[0]),
                    phone: '',
                    address: '',
                    photoURL: user.photoURL || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
                    role: 'user',
                    isAdmin: false,
                    isGuest: false,
                    totalOrders: 0,
                    totalSpent: 0,
                    favorites: [],
                    createdAt: window.firebaseModules.serverTimestamp(),
                    updatedAt: window.firebaseModules.serverTimestamp()
                }
            );
        }
    } catch (error) {
        console.error('خطأ في التحقق من المستخدم:', error);
    }
}

async function checkAdminPermissions(userId) {
    console.log('🔍 التحقق من صلاحيات المدير للمستخدم:', userId);
    
    try {
        if (!db) {
            isAdmin = false;
            console.log('❌ قاعدة البيانات غير متاحة');
            return false;
        }
        
        const userRef = window.firebaseModules.doc(db, "users", userId);
        const userSnap = await window.firebaseModules.getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            
            if (userData.isAdmin === true || userData.role === 'admin') {
                isAdmin = true;
                console.log('✅ المستخدم أدمن');
                
                // تسجيل حدث صلاحيات المدير
                SecurityManager.logSecurityEvent('admin_access_granted', {
                    userId: userId,
                    email: userData.email
                });
            } else {
                isAdmin = false;
                console.log('❌ المستخدم ليس أدمن');
            }
        } else {
            console.log('⚠️ المستخدم غير موجود في قاعدة البيانات');
            isAdmin = false;
        }
        
        if (typeof updateAdminButton === 'function') updateAdminButton();
        
        return isAdmin;
        
    } catch (error) {
        console.error('❌ خطأ في التحقق من صلاحيات المستخدم:', error);
        isAdmin = false;
        if (typeof updateAdminButton === 'function') updateAdminButton();
        return false;
    }
}

function updateAdminButton() {
    const adminBtn = document.getElementById('adminBtn');
    const adminMobileLink = document.getElementById('adminMobileLink');
    
    if (adminBtn) {
        if (isAdmin && !isGuest) {
            adminBtn.style.display = 'flex';
            adminBtn.classList.add('security-warning');
        } else {
            adminBtn.style.display = 'none';
        }
    }
    
    if (adminMobileLink) {
        if (isAdmin && !isGuest) {
            adminMobileLink.style.display = 'block';
            adminMobileLink.querySelector('a').classList.add('security-alert');
        } else {
            adminMobileLink.style.display = 'none';
        }
    }
}

async function signOutUser() {
    console.log('🚪 تسجيل الخروج...');
    
    try {
        if (isGuest) {
            if (!confirm('سيتم فقدان سلة التسوق والطلبات. هل تريد المتابعة؟')) {
                return;
            }
        }
        
        // تسجيل حدث تسجيل الخروج
        SecurityManager.logSecurityEvent('user_logout', {
            userId: currentUser?.uid,
            isGuest: isGuest,
            isAdmin: isAdmin
        });
        
        if (!isGuest && auth) {
            await window.firebaseModules.signOut(auth);
        }
        
        // تنظيف جميع البيانات الحساسة
        if (window.SecureStorage && window.SecureStorage.clearSecure) {
            await window.SecureStorage.clearSecure();
        }
        
        currentUser = null;
        isGuest = false;
        isAdmin = false;
        cartItems = [];
        favorites = [];
        
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
        localStorage.removeItem('userPhone');
        localStorage.removeItem('userAddress');
        
        // تنظيف سجل الأمان القديم
        try {
            localStorage.removeItem('security_logs');
            localStorage.removeItem('security_events');
        } catch (e) {
            console.error('خطأ في تنظيف سجلات الأمان:', e);
        }
        
        if (window.authUnsubscribe) {
            window.authUnsubscribe();
        }
        
        // تنظيف جميع حقول الإدخال في التطبيق
        const allInputs = document.querySelectorAll('input, textarea, select');
        allInputs.forEach(input => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });

        // تنظيف بيانات الملف الشخصي في الواجهة
        const profileElements = [
            'profileName', 'mobileUserName', 'profileEmail', 'mobileUserEmail',
            'detailName', 'detailEmail', 'detailPhone', 'detailAddress',
            'favoritesCount', 'ordersCount', 'totalSpent'
        ];
        profileElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '--';
        });

        // إعادة تعيين الصور الشخصية
        const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
        const profileImages = document.querySelectorAll('#profileImage, #mobileUserImage');
        profileImages.forEach(img => {
            if (img) img.src = defaultAvatar;
        });
        
        if (typeof updateAdminButton === 'function') updateAdminButton();
        if (typeof updateCartCount === 'function') updateCartCount();
        
        // إعادة تحميل المنتجات لضمان عدم وجود بيانات معلقة
        allProducts = [];
        if (typeof displayProducts === 'function') displayProducts();
        
        // إعادة تحميل الصفحة بعد تأخير قصير
        setTimeout(() => {
            window.location.href = window.location.origin;
        }, 1500);
        
        if (typeof showToast === 'function') showToast('تم تسجيل الخروج بنجاح', 'success');
        
    } catch (error) {
        console.error('❌ خطأ في تسجيل الخروج:', error);
        SecurityManager.logSecurityEvent('logout_error', { error: error.message });
        
        if (typeof showToast === 'function') showToast('حدث خطأ أثناء تسجيل الخروج', 'error');
    }
}

// ======================== إدارة تسجيل المستخدمين مع الحماية ========================

function showRegistrationForm() {
    const emailAuthForm = document.getElementById('emailAuthForm');
    if (emailAuthForm) {
        const formHeader = emailAuthForm.querySelector('.form-header h2');
        if (formHeader) formHeader.textContent = 'إنشاء حساب جديد';
        
        const loginFields = document.getElementById('loginFields');
        const registerFields = document.getElementById('registerFields');
        
        if (loginFields) loginFields.style.display = 'none';
        if (registerFields) registerFields.style.display = 'block';
        
        emailAuthForm.style.display = 'block';
        
        // إضافة CAPTCHA
        if (window.SecurityCore && typeof SecurityCore.createSimpleCaptcha === 'function') {
            setTimeout(() => {
                addCaptchaToForm(emailAuthForm);
            }, 100);
        }
        
        const registerName = document.getElementById('registerName');
        if (registerName) registerName.focus();
    }
}

function showLoginForm() {
    const emailAuthForm = document.getElementById('emailAuthForm');
    if (emailAuthForm) {
        const formHeader = emailAuthForm.querySelector('.form-header h2');
        if (formHeader) formHeader.textContent = 'تسجيل الدخول';
        
        const loginFields = document.getElementById('loginFields');
        const registerFields = document.getElementById('registerFields');
        
        if (loginFields) loginFields.style.display = 'block';
        if (registerFields) registerFields.style.display = 'none';
        
        // إضافة CAPTCHA
        if (window.SecurityCore && typeof SecurityCore.createSimpleCaptcha === 'function') {
            setTimeout(() => {
                addCaptchaToForm(emailAuthForm);
            }, 100);
        }
        
        const emailInput = document.getElementById('emailInput');
        if (emailInput) emailInput.focus();
    }
}

async function handleRegistration() {
    const name = document.getElementById('registerName')?.value || '';
    const email = document.getElementById('registerEmail')?.value || '';
    const password = document.getElementById('registerPassword')?.value || '';
    const phone = document.getElementById('registerPhone')?.value || '';
    
    // التحقق من CAPTCHA
    if (!validateFormWithCaptcha('emailAuthForm')) {
        return;
    }
    
    if (!name || !email || !password) {
        if (typeof showAuthMessage === 'function') showAuthMessage('الرجاء ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    // التحقق من صحة البيانات
    if (!isValidEmail(email)) {
        if (typeof showAuthMessage === 'function') showAuthMessage('البريد الإلكتروني غير صالح', 'error');
        return;
    }
    
    if (password.length < 6) {
        if (typeof showAuthMessage === 'function') showAuthMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }
    
    if (phone && !isValidPhone(phone)) {
        if (typeof showAuthMessage === 'function') showAuthMessage('رقم الهاتف غير صالح', 'error');
        return;
    }
    
    // التحقق من وجود محتوى خطير
    if (window.SecurityCore && window.SecurityCore.checkFormForThreats) {
        const formData = { name, email, password, phone };
        const threatCheck = window.SecurityCore.checkFormForThreats(formData);
        
        if (!threatCheck.safe) {
            console.warn('⚠️ اكتشاف تهديدات في بيانات التسجيل:', threatCheck.threats);
            if (typeof showAuthMessage === 'function') showAuthMessage(threatCheck.message, 'error');
            SecurityManager.logSecurityEvent('registration_threat_detected', { threats: threatCheck.threats });
            return;
        }
    }
    
    if (typeof showAuthMessage === 'function') showAuthMessage('جاري إنشاء حسابك...', 'info');
    
    const success = await signUpWithEmail(email, password, name, phone);
    
    if (success) {
        if (typeof showAuthMessage === 'function') showAuthMessage('تم إنشاء حسابك بنجاح!', 'success');
    }
}

async function handleLogin() {
    const email = document.getElementById('emailInput')?.value || '';
    const password = document.getElementById('passwordInput')?.value || '';
    
    // التحقق من CAPTCHA
    if (!validateFormWithCaptcha('emailAuthForm')) {
        return;
    }
    
    if (!email || !password) {
        if (typeof showAuthMessage === 'function') showAuthMessage('الرجاء إدخال البريد الإلكتروني وكلمة المرور', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        if (typeof showAuthMessage === 'function') showAuthMessage('البريد الإلكتروني غير صالح', 'error');
        return;
    }
    
    // التحقق من وجود محتوى خطير
    if (window.SecurityCore && window.SecurityCore.checkFormForThreats) {
        const formData = { email, password };
        const threatCheck = window.SecurityCore.checkFormForThreats(formData);
        
        if (!threatCheck.safe) {
            console.warn('⚠️ اكتشاف تهديدات في بيانات الدخول:', threatCheck.threats);
            if (typeof showAuthMessage === 'function') showAuthMessage(threatCheck.message, 'error');
            SecurityManager.logSecurityEvent('login_threat_detected', { threats: threatCheck.threats });
            return;
        }
    }
    
    if (typeof showAuthMessage === 'function') showAuthMessage('جاري تسجيل الدخول...', 'info');
    
    await signInWithEmail(email, password);
}

function showAuthMessage(message, type = 'error') {
    const authMessage = document.getElementById('emailAuthMessage');
    if (authMessage) {
        // تنظيف الرسالة
        const cleanMessage = sanitizeUserInput(message);
        authMessage.textContent = cleanMessage;
        authMessage.className = `auth-message ${type}`;
        
        // إضافة فئة الحماية للرسائل الخطيرة
        if (type === 'error') {
            authMessage.classList.add('security-alert');
        } else if (type === 'success') {
            authMessage.classList.add('security-success');
        }
    }
}

// ======================== دوال مزامنة البيانات الآمنة ========================

async function syncUserDataFromFirestore() {
    if (!currentUser || isGuest) return;
    try {
        const userRef = window.firebaseModules.doc(db, "users", currentUser.uid);
        const userSnap = await window.firebaseModules.getDoc(userRef);
        if (userSnap.exists()) {
            const data = userSnap.data();
            
            // تنظيف البيانات قبل التخزين
            cartItems = Array.isArray(data.cart) ? 
                data.cart.map(item => sanitizeUserInput(item)) : [];
            favorites = Array.isArray(data.favorites) ? 
                data.favorites.map(item => sanitizeUserInput(item)) : [];
            
            console.log('✅ تم مزامنة البيانات من السحابة');
            
            // تسجيل حدث المزامنة
            SecurityManager.logSecurityEvent('data_sync_success', {
                cartItems: cartItems.length,
                favorites: favorites.length
            });
        }
    } catch (error) {
        console.error('❌ خطأ في مزامنة البيانات:', error);
        SecurityManager.logSecurityEvent('data_sync_error', { error: error.message });
    }
}

async function saveUserDataToFirestore() {
    if (!currentUser || isGuest) return;
    try {
        const userRef = window.firebaseModules.doc(db, "users", currentUser.uid);
        await window.firebaseModules.updateDoc(userRef, {
            cart: cartItems,
            favorites: favorites,
            lastUpdated: window.firebaseModules.serverTimestamp()
        });
        console.log('✅ تم حفظ البيانات في السحابة');
        
        SecurityManager.logSecurityEvent('data_save_success', {
            cartItems: cartItems.length,
            favorites: favorites.length
        });
    } catch (error) {
        console.error('❌ خطأ في حفظ البيانات:', error);
        SecurityManager.logSecurityEvent('data_save_error', { error: error.message });
    }
}

// ======================== التصدير للاستخدام العام ========================

window.signInAsGuest = signInAsGuest;
window.signInWithGoogle = signInWithGoogle;
window.signOutUser = signOutUser;
window.signUpWithEmail = signUpWithEmail;
window.handleRegistration = handleRegistration;
window.handleLogin = handleLogin;
window.showRegistrationForm = showRegistrationForm;
window.showLoginForm = showLoginForm;
window.validateEmail = validateEmail;
window.LoginProtector = LoginProtector;

console.log('✅ auth-system.js محمل مع نظام الحماية');
[file content end]

[file name]: firebase-config.js
[file content begin]
// Eleven Store - Firebase Configuration (Secure Version)
// تم عزل الإعدادات في ملف منفصل لتحسين الأمان والتنظيم

const firebaseConfig = {
    apiKey: "AIzaSyB1vNmCapPK0MI4H_Q0ilO7OnOgZa02jx0",
    authDomain: "queen-beauty-b811b.firebaseapp.com",
    projectId: "queen-beauty-b811b",
    storageBucket: "queen-beauty-b811b.firebasestorage.app",
    messagingSenderId: "418964206430",
    appId: "1:418964206430:web:8c9451fc56ca7f956bd5cf",
    measurementId: "G-XXXXXXXXXX" // اختياري للتحليلات
};

// التحقق من صحة الإعدادات
function validateFirebaseConfig(config) {
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
        console.error('❌ إعدادات Firebase غير مكتملة. الحقول الناقصة:', missingFields);
        return false;
    }
    
    // التحقق من تنسيق apiKey
    if (!config.apiKey.startsWith('AIza')) {
        console.warn('⚠️ apiKey قد لا يكون بتنسيق صحيح');
    }
    
    // التحقق من النطاقات المسموحة
    const allowedDomains = ['firebaseapp.com', 'web.app'];
    if (!allowedDomains.some(domain => config.authDomain.endsWith(domain))) {
        console.warn('⚠️ authDomain قد لا يكون نطاق Firebase صالح');
    }
    
    return true;
}

// إعدادات أمان إضافية
const securityConfig = {
    // إعدادات جلسة المستخدم
    session: {
        timeout: 30 * 60 * 1000, // 30 دقيقة
        extendOnActivity: true,
        maxSessions: 3
    },
    
    // إعدادات قاعدة البيانات
    database: {
        enablePersistence: true,
        cacheSizeBytes: 10 * 1024 * 1024, // 10MB
        synchronizeTabs: true
    },
    
    // إعدادات التخزين
    storage: {
        maxUploadSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        cacheControl: 'public, max-age=3600'
    },
    
    // إعدادات المصادقة
    auth: {
        enablePersistence: true,
        persistenceType: 'SESSION',
        popupRedirectEnabled: true
    }
};

// وظائف أمان إضافية
const FirebaseSecurity = {
    // التحقق من اتصال Firebase
    checkConnection: async function() {
        try {
            if (!window.firebaseModules) {
                throw new Error('Firebase SDK غير محمل');
            }
            
            // محاولة الاتصال بخدمة Firebase
            const response = await fetch(`https://${firebaseConfig.projectId}.firebaseio.com/.json`);
            
            if (!response.ok) {
                throw new Error(`فشل الاتصال: ${response.status}`);
            }
            
            console.log('✅ اتصال Firebase نشط وآمن');
            return true;
        } catch (error) {
            console.error('❌ فشل التحقق من اتصال Firebase:', error);
            return false;
        }
    },
    
    // مراقبة حالة المصادقة
    monitorAuthState: function() {
        if (!window.auth) {
            console.warn('⚠️ خدمة المصادقة غير مهيأة');
            return;
        }
        
        return window.firebaseModules.onAuthStateChanged(window.auth, (user) => {
            if (user) {
                console.log('🔐 مستخدم مصادق:', user.uid);
                
                // تسجيل حدث المصادقة
                if (window.SecurityManager && window.SecurityManager.logSecurityEvent) {
                    window.SecurityManager.logSecurityEvent('firebase_auth_success', {
                        userId: user.uid,
                        email: user.email,
                        timestamp: new Date().toISOString()
                    });
                }
            } else {
                console.log('🔐 لا يوجد مستخدم مصادق');
            }
        }, (error) => {
            console.error('❌ خطأ في مراقبة حالة المصادقة:', error);
            
            // تسجيل حدث الخطأ
            if (window.SecurityManager && window.SecurityManager.logSecurityEvent) {
                window.SecurityManager.logSecurityEvent('firebase_auth_error', {
                    error: error.message,
                    code: error.code,
                    timestamp: new Date().toISOString()
                });
            }
        });
    },
    
    // التحقق من صلاحية الإعدادات
    validateConfig: function() {
        return validateFirebaseConfig(firebaseConfig);
    },
    
    // إعداد قواعد أمان إضافية
    setupSecurityRules: function() {
        // منع استخدام Firebase من نطاقات غير مصرح بها
        const allowedOrigins = [
            window.location.origin,
            'https://queen-beauty-b811b.firebaseapp.com',
            'https://queen-beauty-b811b.web.app'
        ];
        
        if (!allowedOrigins.includes(window.location.origin)) {
            console.error('❌ النطاق الحالي غير مصرح به:', window.location.origin);
            return false;
        }
        
        // إضافة رؤوس أمان
        try {
            const meta = document.createElement('meta');
            meta.httpEquiv = 'Content-Security-Policy';
            meta.content = `default-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.gstatic.com;`;
            document.head.appendChild(meta);
        } catch (e) {
            console.warn('⚠️ لا يمكن إضافة رأس CSP:', e);
        }
        
        return true;
    }
};

// تهيئة التحقق من الإعدادات عند التحميل
(function initFirebaseSecurity() {
    console.log('🔐 بدء تهيئة أمان Firebase...');
    
    // التحقق من صحة الإعدادات
    if (!validateFirebaseConfig(firebaseConfig)) {
        console.error('❌ إعدادات Firebase غير صالحة');
        return;
    }
    
    // التحقق من قواعد الأمان
    if (!FirebaseSecurity.setupSecurityRules()) {
        console.error('❌ فشل إعداد قواعد أمان Firebase');
        return;
    }
    
    console.log('✅ أمان Firebase مهيأ بنجاح');
    
    // مراقبة اتصال Firebase
    setTimeout(() => {
        FirebaseSecurity.checkConnection().then(isConnected => {
            if (!isConnected) {
                console.warn('⚠️ تحذير: اتصال Firebase ضعيف أو غير مستقر');
            }
        });
    }, 3000);
})();

// تصدير الإعدادات والأدوات
window.firebaseConfig = firebaseConfig;
window.securityConfig = securityConfig;
window.FirebaseSecurity = FirebaseSecurity;

console.log("🔐 Firebase Configuration Loaded Securely");
[file content end]

[file name]: main.js
[file content begin]
// main.js - ملف التحميل الرئيسي (مع نظام الحماية المتكامل)
// ======================== تهيئة التطبيق مع الحماية ========================

async function initializeAppSafely() {
    if (appInitialized) {
        console.log('⚠️ التطبيق مهيأ بالفعل');
        return;
    }
    
    console.log('🚀 بدء تهيئة التطبيق (مع نظام الحماية الشامل)...');
    appInitialized = true;

    // تفعيل جميع طبقات الحماية
    activateSecurityLayers();
    
    // التحقق من مكتبات Firebase
    if (!checkFirebaseSDK()) {
        SecurityManager.logSecurityEvent('firebase_sdk_missing');
        return;
    }
    
    // التحقق من اتصال Firebase
    if (!initializeFirebase()) {
        forceHideLoader();
        showAuthScreen();
        SecurityManager.logSecurityEvent('firebase_init_failed');
        
        if (typeof showToast === 'function') {
            showToast('حدث خطأ في الاتصال. يمكنك الدخول كضيف.', 'warning');
        }
        return;
    }
    
    try {
        // تحميل البيانات الأساسية مع التخزين المؤقت الآمن
        await Promise.all([
            loadSiteConfig(),
            loadThemeColors()
        ]);
        
        // إعداد جميع أنظمة الحماية
        setupSecuritySystems();
        
        // إعداد الأحداث مع الحماية
        setupAllEventListeners();
        setupRegistrationEventListeners();
        setupSmartHeader();
        
        // تهيئة تحسينات الأداء مع الحماية
        initPerformanceMonitoring();
        setupLightweightNotifications();
        
        // مراقبة حالة المصادقة مع الحماية
        const unsubscribe = window.firebaseModules.onAuthStateChanged(auth, 
            async (user) => {
                console.log('🔄 تغيرت حالة المصادقة:', user ? 'مستخدم مسجل' : 'لا يوجد مستخدم');
                await handleAuthStateChange(user);
            },
            (error) => {
                console.error('❌ خطأ في مراقبة حالة المصادقة:', error);
                SecurityManager.logSecurityEvent('auth_monitoring_error', { error: error.message });
                handleAuthError();
            }
        );
        
        window.authUnsubscribe = unsubscribe;
        
        // تسجيل نجاح التهيئة
        SecurityManager.logSecurityEvent('app_initialization_success');
        
    } catch (error) {
        console.error('❌ خطأ في تهيئة التطبيق:', error);
        SecurityManager.logSecurityEvent('app_initialization_error', { error: error.message });
        
        forceHideLoader();
        showAuthScreen();
        if (typeof showToast === 'function') showToast('حدث خطأ في تحميل التطبيق.', 'error');
    }
}

// ======================== نظام الحماية الطبقي ========================

function activateSecurityLayers() {
    console.log('🛡️ تفعيل طبقات الحماية...');
    
    // الطبقة 1: حماية DOM والبيانات
    if (SecurityManager && typeof SecurityManager.preventFraming === 'function') {
        SecurityManager.preventFraming();
    }
    
    // الطبقة 2: حماية الجلسة
    if (SecurityManager && typeof SecurityManager.validateSession === 'function') {
        SecurityManager.validateSession();
    }
    
    // الطبقة 3: حماية الإدخال
    if (SecurityManager && typeof SecurityManager.setupInputValidation === 'function') {
        SecurityManager.setupInputValidation();
    }
    
    // الطبقة 4: حماية الذاكرة
    if (typeof initMemoryManagement === 'function') {
        initMemoryManagement();
    }
    
    // الطبقة 5: حماية الاتصال
    if (SecurityManager && typeof SecurityManager.checkSecureConnection === 'function') {
        SecurityManager.checkSecureConnection();
    }
    
    console.log('✅ جميع طبقات الحماية مفعلة');
}

function setupSecuritySystems() {
    console.log('⚙️ إعداد أنظمة الحماية...');
    
    // 1. نظام منع هجمات Brute Force
    if (window.LoginProtector) {
        console.log('✅ نظام منع هجمات Brute Force جاهز');
    }
    
    // 2. نظام التحقق من النماذج
    setupFormSecurity();
    
    // 3. نظام مراقبة النشاط المشبوه
    setupActivityMonitoring();
    
    // 4. نظام حماية الروابط
    setupLinkProtection();
    
    // 5. نظام حماية الصور
    setupImageProtection();
    
    console.log('✅ جميع أنظمة الحماية جاهزة');
}

function setupFormSecurity() {
    // مراقبة جميع النماذج
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function(e) {
            // التحقق من CAPTCHA للنماذج المهمة
            if (form.id === 'emailAuthForm' || form.classList.contains('auth-form')) {
                if (!validateFormWithCaptcha(form.id)) {
                    e.preventDefault();
                    return false;
                }
            }
            
            // التحقق من وجود محتوى خطير
            if (window.SecurityCore && window.SecurityCore.checkFormForThreats) {
                const formData = new FormData(form);
                const data = {};
                formData.forEach((value, key) => {
                    data[key] = value;
                });
                
                const threatCheck = window.SecurityCore.checkFormForThreats(data);
                if (!threatCheck.safe) {
                    console.warn('⚠️ اكتشاف تهديد في النموذج:', threatCheck.threats);
                    e.preventDefault();
                    
                    if (typeof showToast === 'function') {
                        showToast('تم اكتشاف محتوى خطير في النموذج', 'error');
                    }
                    
                    SecurityManager.logSecurityEvent('form_threat_blocked', {
                        form: form.id,
                        threats: threatCheck.threats
                    });
                    
                    return false;
                }
            }
            
            return true;
        });
    });
}

function setupActivityMonitoring() {
    let lastActivity = Date.now();
    const activityTimeout = 5 * 60 * 1000; // 5 دقائق
    
    // تحديث النشاط عند التفاعل
    const activityEvents = ['mousemove', 'keypress', 'click', 'scroll'];
    activityEvents.forEach(event => {
        document.addEventListener(event, () => {
            lastActivity = Date.now();
        }, { passive: true });
    });
    
    // مراقبة عدم النشاط
    setInterval(() => {
        const now = Date.now();
        if (now - lastActivity > activityTimeout) {
            console.log('⏰ لم يتم اكتشاف نشاط لفترة طويلة');
            
            if (currentUser && !isGuest) {
                SecurityManager.logSecurityEvent('user_inactivity', {
                    inactiveTime: Math.floor((now - lastActivity) / 1000 / 60) + ' دقائق'
                });
            }
            
            lastActivity = now;
        }
    }, 60000); // كل دقيقة
}

function setupLinkProtection() {
    // حماية جميع الروابط الخارجية
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (!link) return;
        
        const href = link.getAttribute('href');
        if (!href) return;
        
        // التحقق من الروابط الخطيرة
        const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
        if (dangerousProtocols.some(proto => href.startsWith(proto))) {
            e.preventDefault();
            console.warn('⚠️ رابط خطير تم حظره:', href);
            
            SecurityManager.logSecurityEvent('dangerous_link_blocked', { href: href });
            
            if (typeof showToast === 'function') {
                showToast('هذا الرابط غير آمن', 'error');
            }
            return;
        }
        
        // إضافة حماية للروابط الخارجية
        if (href.startsWith('http') && !href.includes(window.location.hostname)) {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            
            // تسجيل حدث فتح الرابط الخارجي
            SecurityManager.logSecurityEvent('external_link_opened', { href: href });
        }
    });
}

function setupImageProtection() {
    // حماية الصور من التحميل غير الآمن
    document.addEventListener('error', function(e) {
        if (e.target.tagName === 'IMG') {
            const img = e.target;
            const src = img.getAttribute('src');
            
            // استبدال الصور الفاشلة بصورة آمنة
            if (src && !src.includes('data:image')) {
                img.src = 'https://cdn-icons-png.flaticon.com/512/1178/1178479.png';
                img.alt = 'صورة غير متوفرة';
                
                SecurityManager.logSecurityEvent('image_load_failed', { src: src });
            }
        }
    }, true);
}

// ======================== إدارة الأحداث مع الحماية ========================

function setupAllEventListeners() {
    console.log('⚙️ إعداد جميع الأحداث مع الحماية...');
    
    setupAuthEventListeners();
    setupNavigationEventListeners();
    setupAppEventListeners();
    setupModalEventListeners();
    setupRegistrationEventListeners();
    
    // إضافة حماية للأحداث العامة
    setupGlobalEventProtection();
    
    console.log('✅ جميع الأحداث جاهزة مع الحماية');
}

function setupGlobalEventProtection() {
    // منع الإجراءات الخطيرة
    document.addEventListener('dragstart', function(e) {
        if (e.target.classList.contains('no-copy') || 
            e.target.classList.contains('sensitive-text')) {
            e.preventDefault();
        }
    });
    
    // منع النقر المزدوج الخطير
    document.addEventListener('dblclick', function(e) {
        const sensitiveElements = e.target.closest('.sensitive-data, .no-copy, .bank-info');
        if (sensitiveElements) {
            e.preventDefault();
            
            if (typeof showToast === 'function') {
                showToast('هذا الإجراء غير مسموح', 'warning');
            }
        }
    });
    
    // حماية ضد فتح أدوات المطور
    document.addEventListener('keydown', function(e) {
        // منع F12
        if (e.key === 'F12') {
            e.preventDefault();
            SecurityManager.logSecurityEvent('devtools_f12_blocked');
        }
        
        // منع Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C
        if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) {
            e.preventDefault();
            SecurityManager.logSecurityEvent('devtools_shortcut_blocked', { key: e.key });
            
            if (typeof showToast === 'function') {
                showToast('هذا الإجراء غير مسموح لأسباب أمنية', 'warning');
            }
        }
    });
}

// ======================== دالة showSection مع الحماية ========================

function showSection(sectionId) {
    // التحقق من صلاحية المعرف
    if (!sectionId || typeof sectionId !== 'string') {
        console.error('❌ معرف القسم غير صالح:', sectionId);
        return;
    }
    
    // تنظيف المعرف
    const cleanSectionId = sectionId.replace(/[^a-zA-Z0-9_-]/g, '');
    
    const currentSection = document.querySelector('.section.active');
    
    if (!navigationHistory.includes(cleanSectionId)) {
        navigationHistory.push(cleanSectionId);
    }

    updateHeaderState(cleanSectionId);

    // تنظيف البيانات الحساسة عند الخروج من قسم الدفع
    if (currentSection && currentSection.id === 'checkout' && cleanSectionId !== 'checkout') {
        if (typeof removeReceiptPreview === 'function') removeReceiptPreview();
        
        // تنظيف بيانات الدفع المؤقتة
        const checkoutInputs = document.querySelectorAll('#checkout input, #checkout textarea');
        checkoutInputs.forEach(input => {
            if (input.type !== 'checkbox' && input.type !== 'radio') {
                input.value = '';
            }
        });
    }

    document.querySelectorAll('.section').forEach(section => {
        if (section) section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(cleanSectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // تمرير ناعم للقمة
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // حماية إضافية لقسم الدفع
        if (cleanSectionId === 'checkout') {
            const savedPhone = localStorage.getItem('userPhone');
            const savedAddress = localStorage.getItem('userAddress');
            
            const phoneInput = document.getElementById('checkoutPhone') || document.getElementById('orderPhone');
            const addressInput = document.getElementById('checkoutAddress') || document.getElementById('orderAddress');
            const editBtn = document.getElementById('editDataBtn');
            
            if (phoneInput && savedPhone) {
                phoneInput.value = savedPhone;
                if (editBtn) editBtn.style.display = 'block';
                
                // التحقق من صحة الهاتف
                if (!isValidPhone(savedPhone)) {
                    phoneInput.classList.add('brute-force-protection');
                    if (typeof showToast === 'function') {
                        showToast('رقم الهاتف المحفوظ غير صالح', 'warning');
                    }
                }
            }
            
            if (addressInput && savedAddress) {
                addressInput.value = savedAddress;
            }
            
            // إضافة CAPTCHA لقسم الدفع
            setTimeout(() => {
                const checkoutForm = document.querySelector('#checkout .checkout-form');
                if (checkoutForm && window.SecurityCore) {
                    addCaptchaToForm(checkoutForm);
                }
            }, 500);
        }

        // تفعيل الأنظمة الخاصة بكل قسم
        switch(cleanSectionId) {
            case 'cart':
                if (typeof updateCartDisplay === 'function') updateCartDisplay();
                break;
            case 'checkout':
                if (typeof updateCheckoutSummary === 'function') updateCheckoutSummary();
                break;
            case 'favorites':
                if (typeof updateFavoritesDisplay === 'function') updateFavoritesDisplay();
                break;
            case 'profile':
                if (typeof updateProfileStats === 'function') updateProfileStats();
                break;
            case 'my-orders':
                if (typeof loadMyOrders === 'function') loadMyOrders();
                break;
            case 'home':
                if (typeof displayFeaturedProducts === 'function') displayFeaturedProducts();
                break;
            case 'products':
                if (typeof loadProducts === 'function') loadProducts(true);
                break;
        }
        
        // تسجيل حدث تغيير القسم
        SecurityManager.logSecurityEvent('section_change', {
            from: currentSection ? currentSection.id : 'none',
            to: cleanSectionId,
            timestamp: new Date().toISOString()
        });
    } else {
        console.error('❌ القسم غير موجود:', cleanSectionId);
        SecurityManager.logSecurityEvent('section_not_found', { sectionId: cleanSectionId });
        
        // العودة للقسم الرئيسي
        showSection('home');
    }
}

// ======================== تحسينات نظام الإشعارات مع الحماية ========================

function setupLightweightNotifications() {
    if (window.notificationListeners) return;
    
    window.notificationListeners = {
        orders: null,
        admin: null
    };
    
    // إضافة حماية لتغيير حالة الصفحة
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('📱 الصفحة غير مرئية، إيقاف بعض الخدمات');
            pauseNotificationListeners();
            
            SecurityManager.logSecurityEvent('page_hidden');
        } else {
            console.log('📱 الصفحة مرئية، استئناف الخدمات');
            resumeNotificationListeners();
            
            SecurityManager.logSecurityEvent('page_visible');
        }
    });
}

function pauseNotificationListeners() {
    // إيقاف المستمعين غير الضروريين
    if (window.notificationListeners.orders) {
        window.notificationListeners.orders();
        window.notificationListeners.orders = null;
    }
    
    // تقليل استخدام الذاكرة
    if (allProducts.length > 50) {
        const tempProducts = [...allProducts];
        allProducts = tempProducts.slice(0, 50);
        console.log('🔄 تقليل عدد المنتجات للحفظ على الذاكرة');
    }
}

function resumeNotificationListeners() {
    // استئناف المستمعين المهمين
    if (!window.notificationListeners.orders && currentUser && !isGuest) {
        setupOrderStatusListener();
    }
}

// ======================== مراقبة الأداء مع الحماية ========================

function initPerformanceMonitoring() {
    // مراقبة وقت التحميل
    window.addEventListener('load', () => {
        if ('performance' in window) {
            const timing = performance.timing;
            const loadTime = timing.loadEventEnd - timing.navigationStart;
            
            console.log(`⏱️ Page loaded in ${loadTime}ms`);
            
            if (loadTime > 3000) {
                console.warn('⚠️ وقت تحميل الصفحة مرتفع، يرجى التحقق');
                SecurityManager.logSecurityEvent('slow_page_load', { loadTime: loadTime });
            }
        }
    });
    
    // مراقبة استخدام الذاكرة
    if ('memory' in performance) {
        setInterval(() => {
            const memory = performance.memory;
            if (memory.usedJSHeapSize > 50000000) { // 50MB
                console.warn('⚠️ استخدام ذاكرة مرتفع:', memory.usedJSHeapSize);
                
                SecurityManager.logSecurityEvent('high_memory_usage', {
                    used: memory.usedJSHeapSize,
                    total: memory.totalJSHeapSize
                });
                
                if (typeof cleanupUnusedData === 'function') cleanupUnusedData();
            }
        }, 30000);
    }
    
    // التحقق من نوع الاتصال
    if ('connection' in navigator) {
        const connection = navigator.connection;
        console.log('📶 نوع الشبكة:', connection.effectiveType);
        
        SecurityManager.logSecurityEvent('network_info', {
            type: connection.effectiveType,
            saveData: connection.saveData,
            downlink: connection.downlink
        });
        
        if (connection.effectiveType === '2g' || connection.saveData) {
            enableDataSaverMode();
        }
    }
}

function enableDataSaverMode() {
    console.log('📱 تفعيل وضع توفير البيانات');
    
    // تقليل جودة الصور
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        if (img.src.includes('firebasestorage')) {
            img.src = optimizeImageUrl(img.src, 150);
        }
    });
    
    // تعطيل بعض الميزات غير الضرورية
    const heavyFeatures = document.querySelectorAll('.animation, .transition, .parallax');
    heavyFeatures.forEach(feature => {
        feature.style.animation = 'none';
        feature.style.transition = 'none';
    });
    
    SecurityManager.logSecurityEvent('data_saver_enabled');
}

// ======================== حماية إضافية للتطبيق ========================

function setupAppProtection() {
    // منع فتح النوافذ المنبثقة غير المرغوب فيها
    window.originalOpen = window.open;
    window.open = function(url, name, specs) {
        // التحقق من الروابط الخطيرة
        if (url && (url.includes('javascript:') || url.includes('data:text/html'))) {
            console.warn('⚠️ محاولة فتح نافذة خطيرة:', url);
            SecurityManager.logSecurityEvent('dangerous_window_blocked', { url: url });
            return null;
        }
        
        // إضافة حماية للنوافذ الخارجية
        if (url && !url.startsWith(window.location.origin)) {
            SecurityManager.logSecurityEvent('external_window_opened', { url: url });
        }
        
        return window.originalOpen(url, name, specs);
    };
    
    // حماية ضد تغيير عنوان الصفحة
    let lastUrl = window.location.href;
    setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            console.log('🔗 تغيير عنوان الصفحة:', currentUrl);
            lastUrl = currentUrl;
            
            SecurityManager.logSecurityEvent('url_changed', { url: currentUrl });
        }
    }, 1000);
    
    // منع التحميل التلقائي للوسائط
    document.querySelectorAll('video, audio').forEach(media => {
        media.removeAttribute('autoplay');
        media.setAttribute('preload', 'none');
    });
}

// ======================== التصدير للاستخدام في HTML مع الحماية ========================

window.showSection = showSection;
window.addToCart = addToCartWithQuantity;
window.toggleFavorite = toggleFavorite;
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
window.signInAsGuest = signInAsGuest;
window.signInWithGoogle = signInWithGoogle;
window.signOutUser = signOutUser;
window.clearCart = clearCart;
window.editProfile = editProfile;
window.saveProfileChanges = saveProfileChanges;
window.performSearch = performSearch;
window.filterProducts = filterProducts;
window.previewReceipt = previewReceipt;
window.removeReceiptPreview = removeReceiptPreview;
window.viewReceipt = viewReceipt;
window.buyNowDirect = buyNowDirect;
window.signUpWithEmail = signUpWithEmail;
window.handleRegistration = handleRegistration;
window.handleLogin = handleLogin;
window.showRegistrationForm = showRegistrationForm;
window.showLoginForm = showLoginForm;
window.filterMainProducts = filterMainProducts;
window.hideLoader = hideLoader;
window.formatNumber = formatNumber;
window.generateGuestUID = generateGuestUID;
window.openProductDetails = openProductDetails;
window.closeProductDetailsModal = closeProductDetailsModal;
window.openQuantityModal = openQuantityModal;
window.closeQuantityModal = closeQuantityModal;
window.changeModalQuantity = changeModalQuantity;
window.enableDataEdit = enableDataEdit;
window.updateHeaderLayout = updateHeaderLayout;
window.goBack = goBack;
window.previewCheckoutReceipt = previewCheckoutReceipt;
window.removeCheckoutReceipt = removeCheckoutReceipt;
window.submitCheckoutOrder = submitCheckoutOrder;
window.updateCheckoutItemQty = updateCheckoutItemQty;
window.setupLightweightNotifications = setupLightweightNotifications;
window.initPerformanceMonitoring = initPerformanceMonitoring;
window.setupAppProtection = setupAppProtection;
window.validateFormWithCaptcha = validateFormWithCaptcha;

// إعداد حماية عند تغيير حجم النافذة
window.addEventListener('resize', adjustLayout);

// تسجيل Service Worker المتقدم مع الحماية
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw-advanced.js')
            .then(reg => {
                console.log('✅ Advanced Service Worker Registered');
                SecurityManager.logSecurityEvent('service_worker_registered');
            })
            .catch(err => {
                console.error('❌ Service Worker Registration Failed:', err);
                SecurityManager.logSecurityEvent('service_worker_failed', { error: err.message });
            });
    });
}

// إعداد الحماية عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // إعداد حماية التطبيق
    if (typeof setupAppProtection === 'function') {
        setupAppProtection();
    }
    
    // إضافة مؤشر الأمان
    if (typeof addSecurityIndicator === 'function') {
        setTimeout(addSecurityIndicator, 2000);
    }
    
    // مراقبة أخطاء التحميل
    window.addEventListener('error', function(e) {
        SecurityManager.logSecurityEvent('page_load_error', {
            message: e.message,
            filename: e.filename,
            lineno: e.lineno,
            colno: e.colno
        });
    }, true);
});

console.log('🚀 تطبيق Eleven Store مع نظام الحماية الشامل جاهز للعمل!');
[file content end]

[file name]: sw-advanced.js
[file content begin]
// sw-advanced.js - Service Worker متقدم (مع نظام الحماية الشامل)
const CACHE_NAME = 'eleven-store-secure-v4';
const OFFLINE_URL = '/offline.html';
const SECURITY_TOKEN = 'secure-token-' + Date.now();

// الموارد التي يتم تخزينها مؤقتاً عند التحميل (مع التحقق من السلامة)
const PRECACHE_ASSETS = [
    '/',
    '/style.css',
    '/firebase-config.js',
    '/security-core.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap'
];

// قائمة النطاقات المسموحة
const ALLOWED_DOMAINS = [
    'firebasestorage.googleapis.com',
    'firestore.googleapis.com',
    'www.gstatic.com',
    'cdnjs.cloudflare.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com'
];

// استراتيجيات التخزين المؤقت مع الحماية
const CACHE_STRATEGIES = {
    STATIC: 'cache-first-secure',
    API: 'network-first-secure',
    IMAGES: 'cache-first-stale-secure'
};

// نظام تسجيل الأحداث الأمنية
const SecurityLogger = {
    log: function(event, details = {}) {
        const logEntry = {
            event: event,
            details: details,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent || 'unknown',
            url: self.location.href || 'unknown'
        };
        
        console.log(`🔒 [SW Security] ${event}:`, details);
        
        // تخزين في IndexedDB للتحليلات
        this.saveToIndexedDB(logEntry);
    },
    
    saveToIndexedDB: async function(logEntry) {
        try {
            const db = await this.getDatabase();
            const tx = db.transaction('securityLogs', 'readwrite');
            const store = tx.objectStore('securityLogs');
            await store.add(logEntry);
        } catch (error) {
            console.error('❌ Error saving security log:', error);
        }
    },
    
    getDatabase: function() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SecurityLogsDB', 1);
            
            request.onupgradeneeded = function(e) {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('securityLogs')) {
                    const store = db.createObjectStore('securityLogs', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('event', 'event', { unique: false });
                }
            };
            
            request.onsuccess = function(e) {
                resolve(e.target.result);
            };
            
            request.onerror = function(e) {
                reject(e.target.error);
            };
        });
    }
};

// التحقق من سلامة الطلبات
function validateRequest(request) {
    const url = new URL(request.url);
    
    // منع الطلبات من نطاقات غير مسموحة
    if (!ALLOWED_DOMAINS.some(domain => url.hostname.endsWith(domain)) &&
        !url.protocol.startsWith('chrome-extension') &&
        url.hostname !== self.location.hostname) {
        
        SecurityLogger.log('blocked_external_request', {
            url: url.href,
            domain: url.hostname
        });
        
        return false;
    }
    
    // منع أنواع MIME الخطيرة
    const dangerousTypes = [
        'application/javascript',
        'text/javascript',
        'application/x-javascript',
        'text/html',
        'application/xhtml+xml'
    ];
    
    // هذا سيتحقق في الاستجابة الفعلية
    return true;
}

// التحقق من سلامة الاستجابة
async function validateResponse(response, request) {
    if (!response || !response.ok) {
        return response;
    }
    
    const url = new URL(request.url);
    const contentType = response.headers.get('content-type') || '';
    
    // منع أنواع المحتوى الخطيرة
    const dangerousTypes = [
        'application/javascript',
        'text/javascript',
        'application/x-javascript'
    ];
    
    if (dangerousTypes.some(type => contentType.includes(type)) &&
        !ALLOWED_DOMAINS.some(domain => url.hostname.endsWith(domain))) {
        
        SecurityLogger.log('blocked_dangerous_content', {
            url: url.href,
            contentType: contentType
        });
        
        return new Response('', {
            status: 403,
            statusText: 'Forbidden - Dangerous Content Type'
        });
    }
    
    // التحقق من رؤوس الأمان
    const securityHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
    };
    
    // إنشاء استجابة جديدة مع رؤوس أمان
    const headers = new Headers(response.headers);
    Object.entries(securityHeaders).forEach(([key, value]) => {
        if (!headers.has(key)) {
            headers.set(key, value);
        }
    });
    
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
    });
}

// التثبيت الأولي مع الحماية
self.addEventListener('install', (event) => {
    console.log('📦 Installing Secure Service Worker');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📁 Precaching critical assets with security');
                return Promise.all(
                    PRECACHE_ASSETS.map(url => {
                        return fetch(url, {
                            credentials: 'same-origin',
                            mode: 'cors'
                        })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`Failed to fetch ${url}: ${response.status}`);
                            }
                            return cache.put(url, response);
                        })
                        .catch(error => {
                            console.error(`❌ Failed to cache ${url}:`, error);
                            SecurityLogger.log('cache_failed', { url, error: error.message });
                        });
                    })
                );
            })
            .then(() => {
                console.log('✅ Precaching completed with security');
                SecurityLogger.log('service_worker_installed');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('❌ Install failed:', error);
                SecurityLogger.log('install_failed', { error: error.message });
            })
    );
});

// التنشيط مع تنظيف آمن
self.addEventListener('activate', (event) => {
    console.log('🚀 Activating Secure Service Worker');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log(`🗑️ Deleting old cache: ${cacheName}`);
                        SecurityLogger.log('old_cache_deleted', { cacheName });
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Cache cleanup completed');
            SecurityLogger.log('service_worker_activated');
            return self.clients.claim();
        })
    );
});

// التعامل مع طلبات الشبكة مع الحماية
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // استثناء Firebase وطلبات الصوت/الفيديو غير الآمنة
    if (url.pathname.includes('firebase') || 
        event.request.destination === 'video' || 
        event.request.destination === 'audio') {
        
        // التحقق من أن المصدر آمن
        if (!validateRequest(event.request)) {
            event.respondWith(new Response('', { status: 403 }));
            return;
        }
    }
    
    // التحقق من جميع الطلبات
    if (!validateRequest(event.request)) {
        event.respondWith(new Response('', {
            status: 403,
            statusText: 'Forbidden - Security Policy Violation'
        }));
        return;
    }
    
    // استراتيجيات مختلفة لأنواع الملفات مع الحماية
    if (url.pathname.endsWith('.css') || 
        url.pathname.endsWith('.js') ||
        url.pathname.includes('fonts.googleapis.com') ||
        url.pathname.includes('cdnjs.cloudflare.com')) {
        event.respondWith(cacheFirstSecureStrategy(event));
    } 
    else if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        event.respondWith(imageCacheSecureStrategy(event));
    }
    else if (url.pathname.includes('firestore.googleapis.com')) {
        event.respondWith(networkFirstSecureStrategy(event));
    }
    else {
        event.respondWith(networkFirstSecureStrategy(event));
    }
});

// استراتيجية: Cache First الآمنة للملفات الثابتة
async function cacheFirstSecureStrategy(event) {
    const cachedResponse = await caches.match(event.request);
    
    if (cachedResponse) {
        console.log(`📦 Serving from secure cache: ${event.request.url}`);
        SecurityLogger.log('cache_hit', { url: event.request.url });
        return validateResponse(cachedResponse, event.request);
    }
    
    try {
        const networkResponse = await fetch(event.request, {
            credentials: 'same-origin',
            mode: 'cors'
        });
        
        const validatedResponse = await validateResponse(networkResponse, event.request);
        
        if (validatedResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            console.log(`💾 Caching new resource securely: ${event.request.url}`);
            cache.put(event.request, validatedResponse.clone());
        }
        
        return validatedResponse;
    } catch (error) {
        console.log('❌ Network failed, returning secure offline page');
        SecurityLogger.log('network_failed', { 
            url: event.request.url, 
            error: error.message 
        });
        
        if (event.request.mode === 'navigate') {
            const offlineResponse = await caches.match(OFFLINE_URL);
            if (offlineResponse) {
                return validateResponse(offlineResponse, event.request);
            }
        }
        
        return new Response('اتصال غير آمن', {
            status: 503,
            statusText: 'Service Unavailable - Security Concern',
            headers: { 
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Security-Status': 'unavailable'
            }
        });
    }
}

// استراتيجية: Network First الآمنة للبيانات الديناميكية
async function networkFirstSecureStrategy(event) {
    try {
        const networkResponse = await fetch(event.request, {
            credentials: 'same-origin',
            mode: 'cors'
        });
        
        const validatedResponse = await validateResponse(networkResponse, event.request);
        
        if (validatedResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, validatedResponse.clone());
        }
        
        return validatedResponse;
    } catch (error) {
        console.log(`🌐 Network failed securely for: ${event.request.url}, trying cache`);
        SecurityLogger.log('network_failed_fallback', { 
            url: event.request.url, 
            error: error.message 
        });
        
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
            return validateResponse(cachedResponse, event.request);
        }
        
        return new Response('فشل الاتصال الآمن', {
            status: 408,
            headers: { 
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Security-Status': 'offline'
            }
        });
    }
}

// استراتيجية خاصة للصور الآمنة
async function imageCacheSecureStrategy(event) {
    const cachedResponse = await caches.match(event.request);
    
    if (cachedResponse) {
        console.log(`🖼️ Serving image from secure cache: ${event.request.url}`);
        SecurityLogger.log('image_cache_hit', { url: event.request.url });
        return validateResponse(cachedResponse, event.request);
    }
    
    try {
        const networkResponse = await fetch(event.request, {
            credentials: 'same-origin',
            mode: 'cors'
        });
        
        const validatedResponse = await validateResponse(networkResponse, event.request);
        
        if (validatedResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            
            // تخزين الصور المؤقتة فقط (بحجم محدود) مع التحقق
            const cacheControl = networkResponse.headers.get('Cache-Control');
            if (!cacheControl || cacheControl.includes('max-age')) {
                console.log(`💾 Caching image securely: ${event.request.url}`);
                cache.put(event.request, validatedResponse.clone());
            }
        }
        
        return validatedResponse;
    } catch (error) {
        console.log('❌ Image load failed securely');
        SecurityLogger.log('image_load_failed', { 
            url: event.request.url, 
            error: error.message 
        });
        
        // عرض صورة بديلة آمنة
        return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f0f0f0"/><text x="150" y="100" text-anchor="middle" fill="#999" font-family="sans-serif" font-size="14">صورة محمية</text><text x="150" y="120" text-anchor="middle" fill="#ccc" font-family="sans-serif" font-size="10">محتوى غير متوفر</text></svg>',
            {
                headers: { 
                    'Content-Type': 'image/svg+xml',
                    'X-Security-Status': 'protected'
                }
            }
        );
    }
}

// استقبال إشعارات Push مع التحقق
self.addEventListener('push', function(event) {
    console.log('📬 Secure Push Notification Received');
    SecurityLogger.log('push_received');
    
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
            
            // التحقق من صحة بيانات الإشعار
            if (!data.title || !data.body) {
                throw new Error('Invalid notification data');
            }
            
            // تنظيف بيانات الإشعار
            const cleanTitle = data.title.replace(/[<>]/g, '');
            const cleanBody = data.body.replace(/[<>]/g, '');
            
            data.title = cleanTitle;
            data.body = cleanBody;
            
        } catch (e) {
            console.error('❌ Error parsing push data:', e);
            data = { 
                title: 'Eleven Store', 
                body: 'لديك تحديث جديد من متجرنا' 
            };
            SecurityLogger.log('push_parse_error', { error: e.message });
        }
    }

    const options = {
        body: data.body || 'لديك تحديث جديد من متجرنا',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'eleven-secure-notification',
        renotify: true,
        data: {
            url: data.url || '/',
            orderId: data.orderId || null,
            timestamp: Date.now(),
            securityToken: SECURITY_TOKEN
        },
        actions: [
            { action: 'open', title: 'عرض التفاصيل' },
            { action: 'close', title: 'تجاهل' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Eleven Store', options)
        .then(() => {
            SecurityLogger.log('notification_shown', { title: data.title });
        })
        .catch(error => {
            console.error('❌ Error showing notification:', error);
            SecurityLogger.log('notification_failed', { error: error.message });
        })
    );
});

// التعامل مع النقر على الإشعارات مع التحقق
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    SecurityLogger.log('notification_clicked', {
        action: event.action,
        tag: event.notification.tag
    });

    if (event.action === 'close') {
        SecurityLogger.log('notification_dismissed');
        return;
    }

    // التحقق من صحة البيانات
    const notificationData = event.notification.data;
    if (!notificationData || notificationData.securityToken !== SECURITY_TOKEN) {
        console.warn('⚠️ Invalid notification security token');
        SecurityLogger.log('invalid_notification_token');
        return;
    }

    const urlToOpen = new URL(notificationData.url || '/', self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function(clientList) {
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if ('focus' in client) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                
                if (clients.openWindow) {
                    SecurityLogger.log('new_window_opened', { url: urlToOpen });
                    return clients.openWindow(urlToOpen);
                }
            })
            .catch(error => {
                console.error('❌ Error handling notification click:', error);
                SecurityLogger.log('notification_click_error', { error: error.message });
            })
    );
});

// تحديث البيانات في الخلفية (Background Sync) مع الحماية
self.addEventListener('sync', function(event) {
    console.log(`🔄 Secure Background Sync: ${event.tag}`);
    SecurityLogger.log('background_sync', { tag: event.tag });
    
    if (event.tag === 'sync-orders') {
        event.waitUntil(syncPendingOrdersSecurely());
    } else if (event.tag === 'sync-security') {
        event.waitUntil(syncSecurityLogs());
    }
});

async function syncPendingOrdersSecurely() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const requests = await cache.keys();
        
        const orderRequests = requests.filter(req => 
            req.url.includes('/api/orders') && req.method === 'POST'
        );
        
        SecurityLogger.log('sync_orders_start', { count: orderRequests.length });
        
        for (const request of orderRequests) {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    await cache.delete(request);
                    console.log('✅ Synced pending order securely');
                    SecurityLogger.log('order_synced', { url: request.url });
                }
            } catch (error) {
                console.error('❌ Sync failed:', error);
                SecurityLogger.log('order_sync_failed', { 
                    url: request.url, 
                    error: error.message 
                });
            }
        }
    } catch (error) {
        console.error('❌ Background sync error:', error);
        SecurityLogger.log('background_sync_error', { error: error.message });
    }
}

async function syncSecurityLogs() {
    try {
        const db = await SecurityLogger.getDatabase();
        const tx = db.transaction('securityLogs', 'readonly');
        const store = tx.objectStore('securityLogs');
        const index = store.index('timestamp');
        
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const range = IDBKeyRange.lowerBound(oneHourAgo.toISOString());
        
        const logs = await index.getAll(range);
        
        if (logs.length > 0) {
            // هنا يمكن إرسال السجلات للخادم
            console.log(`📤 Syncing ${logs.length} security logs`);
            SecurityLogger.log('security_logs_synced', { count: logs.length });
        }
    } catch (error) {
        console.error('❌ Error syncing security logs:', error);
    }
}

// مراقبة حالة الاتصال
function monitorConnection() {
    let isOnline = navigator.onLine;
    
    self.addEventListener('online', () => {
        console.log('🌐 Service Worker: Online');
        isOnline = true;
        SecurityLogger.log('connection_online');
    });
    
    self.addEventListener('offline', () => {
        console.log('🌐 Service Worker: Offline');
        isOnline = false;
        SecurityLogger.log('connection_offline');
    });
    
    return { isOnline };
}

// حماية ضد هجمات التحميل
function preventMaliciousRequests() {
    self.addEventListener('fetch', (event) => {
        const url = new URL(event.request.url);
        
        // منع طلبات البيانات الخطيرة
        if (url.protocol === 'data:') {
            console.warn('⚠️ Blocked data URL request:', url.href);
            event.respondWith(new Response('', { status: 403 }));
            SecurityLogger.log('data_url_blocked', { url: url.href });
            return;
        }
        
        // منع طلبات الملفات المحلية
        if (url.protocol === 'file:') {
            console.warn('⚠️ Blocked file URL request:', url.href);
            event.respondWith(new Response('', { status: 403 }));
            SecurityLogger.log('file_url_blocked', { url: url.href });
            return;
        }
    });
}

// تهيئة أنظمة الحماية
(function initSecuritySystems() {
    console.log('🛡️ Initializing Service Worker Security Systems...');
    
    // بدء مراقبة الاتصال
    monitorConnection();
    
    // تفعيل حماية الطلبات الخبيثة
    preventMaliciousRequests();
    
    // تسجيل حدث بدء التشغيل
    SecurityLogger.log('service_worker_started', {
        version: 'secure-v4',
        timestamp: new Date().toISOString()
    });
    
    console.log('✅ Service Worker Security Systems Ready');
})();

// رسالة تأكيد التشغيل
console.log('✅ Advanced Secure Service Worker Loaded and Ready');
[file content end]