/**
 * error-handler.js
 * نظام معالجة الأخطاء الآمن - إخفاء التفاصيل الحساسة من المستخدمين
 */

class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 100;
        this.isDevelopment = false; // غيّر إلى true للتطوير
        this.init();
    }

    /**
     * تهيئة معالج الأخطاء
     */
    init() {
        // التقط جميع الأخطاء غير المعالجة
        window.addEventListener('error', (event) => {
            this.handleError(event.error, 'uncaught');
        });

        // التقط رفض الوعود غير المعالجة
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, 'unhandled-promise');
        });

        console.log('🔐 تم تهيئة نظام معالجة الأخطاء الآمن');
    }

    /**
     * معالجة الخطأ
     */
    handleError(error, type = 'general') {
        try {
            // تسجيل الخطأ الكامل في السجل الداخلي
            const errorInfo = {
                timestamp: new Date().toISOString(),
                type: type,
                message: error?.message || 'Unknown error',
                stack: error?.stack || '',
                userAgent: navigator.userAgent,
                url: window.location.href
            };

            this.logError(errorInfo);

            // عرض رسالة آمنة للمستخدم
            const userMessage = this.getSafeErrorMessage(error);
            this.showErrorToUser(userMessage);

            // إرسال الخطأ إلى خادم السجلات (اختياري)
            if (this.shouldReportError(error)) {
                this.reportErrorToServer(errorInfo);
            }
        } catch (handlerError) {
            console.error('❌ خطأ في معالج الأخطاء:', handlerError);
        }
    }

    /**
     * تسجيل الخطأ محلياً
     */
    logError(errorInfo) {
        this.errorLog.push(errorInfo);

        // الحفاظ على حجم السجل
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }

        // طباعة في console للمطورين فقط
        if (this.isDevelopment) {
            console.error('🔴 خطأ مسجل:', errorInfo);
        }
    }

    /**
     * الحصول على رسالة خطأ آمنة للمستخدم
     */
    getSafeErrorMessage(error) {
        const errorType = error?.name || 'Error';
        const errorMessage = error?.message || 'حدث خطأ غير متوقع';

        // خريطة الأخطاء الآمنة
        const safeMessages = {
            'NetworkError': 'فشل الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.',
            'TimeoutError': 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.',
            'SyntaxError': 'حدث خطأ في معالجة البيانات. يرجى تحديث الصفحة.',
            'TypeError': 'حدث خطأ في العملية. يرجى المحاولة مرة أخرى.',
            'ReferenceError': 'حدث خطأ في النظام. يرجى تحديث الصفحة.',
            'RangeError': 'قيمة غير صحيحة. يرجى التحقق من البيانات المدخلة.',
            'Firebase': 'فشل الاتصال بخدمة البيانات. يرجى المحاولة لاحقاً.',
            'PERMISSION_DENIED': 'ليس لديك صلاحيات للقيام بهذه العملية.',
            'NOT_FOUND': 'البيانات المطلوبة غير موجودة.',
            'ALREADY_EXISTS': 'هذا العنصر موجود بالفعل.',
            'INVALID_ARGUMENT': 'بيانات غير صحيحة. يرجى التحقق من المدخلات.',
            'UNAUTHENTICATED': 'يرجى تسجيل الدخول أولاً.',
            'RESOURCE_EXHAUSTED': 'تم تجاوز حد الطلبات. يرجى المحاولة لاحقاً.'
        };

        // البحث عن رسالة آمنة
        for (const [key, message] of Object.entries(safeMessages)) {
            if (errorType.includes(key) || errorMessage.includes(key)) {
                return message;
            }
        }

        // رسالة افتراضية آمنة
        return 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني.';
    }

    /**
     * عرض رسالة الخطأ للمستخدم
     */
    showErrorToUser(message) {
        // استخدم نظام الإشعارات الموجود إن أمكن
        if (typeof showToast === 'function') {
            showToast(message, 'error');
        } else {
            // fallback: عرض alert
            alert(message);
        }
    }

    /**
     * تحديد ما إذا كان يجب إرسال الخطأ إلى الخادم
     */
    shouldReportError(error) {
        // لا ترسل أخطاء معينة
        const ignoredErrors = ['Network request failed', 'timeout'];
        
        const errorMessage = error?.message || '';
        return !ignoredErrors.some(msg => errorMessage.includes(msg));
    }

    /**
     * إرسال الخطأ إلى خادم السجلات
     */
    async reportErrorToServer(errorInfo) {
        try {
            // تنظيف البيانات الحساسة قبل الإرسال
            const sanitizedError = {
                type: errorInfo.type,
                message: errorInfo.message,
                url: errorInfo.url,
                timestamp: errorInfo.timestamp
            };

            // أرسل إلى نقطة نهاية آمنة على الخادم
            // await fetch('/api/log-error', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(sanitizedError)
            // });
        } catch (error) {
            console.warn('⚠️ لم يتمكن من إرسال الخطأ إلى الخادم:', error);
        }
    }

    /**
     * الحصول على سجل الأخطاء (للمطورين فقط)
     */
    getErrorLog() {
        if (!this.isDevelopment) {
            console.warn('⚠️ سجل الأخطاء متاح فقط في وضع التطوير');
            return [];
        }
        return this.errorLog;
    }

    /**
     * تنظيف سجل الأخطاء
     */
    clearErrorLog() {
        this.errorLog = [];
        console.log('✅ تم تنظيف سجل الأخطاء');
    }

    /**
     * تفعيل وضع التطوير
     */
    enableDevelopmentMode() {
        this.isDevelopment = true;
        console.log('🔧 تم تفعيل وضع التطوير');
    }

    /**
     * تعطيل وضع التطوير
     */
    disableDevelopmentMode() {
        this.isDevelopment = false;
        console.log('🔒 تم تعطيل وضع التطوير');
    }

    /**
     * معالجة أخطاء Firebase محددة
     */
    handleFirebaseError(error) {
        const errorCode = error?.code || '';
        const errorMessage = error?.message || '';

        const firebaseErrors = {
            'auth/user-not-found': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
            'auth/wrong-password': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
            'auth/email-already-in-use': 'هذا البريد الإلكتروني مسجل بالفعل.',
            'auth/weak-password': 'كلمة المرور ضعيفة جداً. استخدم 8 أحرف على الأقل.',
            'auth/invalid-email': 'البريد الإلكتروني غير صحيح.',
            'auth/user-disabled': 'تم تعطيل هذا الحساب.',
            'permission-denied': 'ليس لديك صلاحيات للقيام بهذه العملية.',
            'not-found': 'البيانات المطلوبة غير موجودة.',
            'already-exists': 'هذا العنصر موجود بالفعل.'
        };

        const safeMessage = firebaseErrors[errorCode] || this.getSafeErrorMessage(error);
        this.showErrorToUser(safeMessage);
    }
}

// إنشاء instance عام
window.errorHandler = new ErrorHandler();

// تصدير الفئة
window.ErrorHandler = ErrorHandler;
