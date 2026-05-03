// error-handler.js - معالجة الأخطاء الموحدة

(function() {
    'use strict';

    if (window.ErrorHandler) return;

    const ErrorHandler = {
        handle: function(error, context = '') {
            console.error(`❌ [${context}]`, error);

            // عرض رسالة للمستخدم
            let userMessage = 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
            
            if (error.code) {
                switch (error.code) {
                    case 'permission-denied':
                        userMessage = 'ليس لديك صلاحية للقيام بهذه العملية.';
                        break;
                    case 'unavailable':
                    case 'network-request-failed':
                        userMessage = 'مشكلة في الاتصال بالإنترنت. يرجى التحقق من اتصالك.';
                        break;
                    case 'not-found':
                        userMessage = 'العنصر المطلوب غير موجود.';
                        break;
                    case 'already-exists':
                        userMessage = 'العنصر موجود بالفعل.';
                        break;
                    case 'invalid-argument':
                        userMessage = 'بيانات غير صالحة.';
                        break;
                    case 'deadline-exceeded':
                        userMessage = 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.';
                        break;
                }
            } else if (error.message) {
                if (error.message.includes('network') || error.message.includes('Network')) {
                    userMessage = 'مشكلة في الاتصال بالإنترنت.';
                } else if (error.message.includes('timeout')) {
                    userMessage = 'انتهت مهلة الطلب.';
                }
            }

            if (window.CoreUtils?.showToast) {
                window.CoreUtils.showToast(userMessage, 'error');
            } else if (window.showToast) {
                window.showToast(userMessage, 'error');
            } else {
                alert(userMessage);
            }

            // يمكن إرسال الخطأ إلى خدمة خارجية (مثل Sentry) هنا
            this.logToService(error, context);
        },

        logToService: function(error, context) {
            // تسجيل في localStorage للتتبع - بدون stack trace لتجنب كشف بنية الكود
            try {
                const logs = JSON.parse(localStorage.getItem('error_logs') || '[]');
                logs.push({
                    timestamp: new Date().toISOString(),
                    context: context,
                    message: error.message,
                    code: error.code
                    // تم حذف stack trace لأسباب أمنية (Information Disclosure)
                });
                if (logs.length > 50) logs.shift();
                localStorage.setItem('error_logs', JSON.stringify(logs));
            } catch (e) {}
        },

        async tryCatch(fn, context = '', fallback = null) {
            try {
                return await fn();
            } catch (error) {
                this.handle(error, context);
                return fallback;
            }
        },

        wrap: function(fn, context = '') {
            return async (...args) => {
                try {
                    return await fn(...args);
                } catch (error) {
                    this.handle(error, context);
                }
            };
        }
    };

    window.ErrorHandler = ErrorHandler;
    console.log('✅ error-handler.js loaded');
})();

