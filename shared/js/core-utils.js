// core-utils.js - دوال مساعدة موحدة وآمنة
// ======================== دوال عامة ========================

(function() {
    'use strict';

    // تأمين الدوال ضد إعادة التعريف
    if (window.CoreUtils) return;

    const CoreUtils = {
        /**
         * تنسيق الأرقام بفواصل الآلاف
         */
        formatNumber: function(num) {
            if (num === null || num === undefined || isNaN(num)) return "0";
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },

        /**
         * التحقق من صحة البريد الإلكتروني
         */
        isValidEmail: function(email) {
            if (!email || typeof email !== 'string') return false;
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email.trim());
        },

        /**
         * التحقق من صحة رقم الهاتف (سوداني)
         */
        isValidPhone: function(phone) {
            if (!phone || typeof phone !== 'string') return false;
            const clean = phone.replace(/\D/g, '');
            return clean.length >= 9 && clean.length <= 13;
        },

        /**
         * تنسيق رقم الهاتف السوداني
         */
        formatSudanPhone: function(phone) {
            if (!phone) return '';
            let clean = phone.replace(/\D/g, '');
            if (clean.startsWith('0')) {
                clean = '249' + clean.substring(1);
            } else if (!clean.startsWith('249')) {
                clean = '249' + clean;
            }
            return '+' + clean;
        },

        /**
         * إنشاء معرف ضيف فريد
         */
        generateGuestUID: function() {
            return 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },

        /**
         * تحديث عنصر بشكل آمن
         */
        safeElementUpdate: function(id, value, isHTML = false) {
            const element = document.getElementById(id);
            if (element) {
                if (isHTML) {
                    element.innerHTML = window.SecurityCore?.sanitizeHTML(value) || value;
                } else {
                    element.textContent = value;
                }
                return true;
            }
            return false;
        },

        /**
         * تحسين رابط الصورة
         */
        optimizeImageUrl: function(url, width = 300) {
            if (!url) return 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png';
            if (!url.includes('firebasestorage')) return url;
            const separator = url.includes('?') ? '&' : '?';
            return `${url}${separator}alt=media&width=${width}&quality=75`;
        },

        /**
         * تحويل التاريخ إلى صيغة عربية
         */
        formatArabicDate: function(date) {
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
        },

        /**
         * تقصير النصوص الطويلة
         */
        truncateText: function(text, maxLength = 100) {
            if (!text) return '';
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        },

        /**
         * إنشاء معرف فريد
         */
        generateUniqueId: function() {
            return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },

        /**
         * تحميل الصور مع التعامل مع الأخطاء
         */
        loadImageWithFallback: function(imgElement, src, fallbackSrc = 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png') {
            if (!imgElement) return;
            imgElement.src = src;
            imgElement.onerror = function() {
                this.src = fallbackSrc;
                this.onerror = null;
            };
        },

        /**
         * التحقق من اتصال الإنترنت
         */
        checkInternetConnection: function() {
            return navigator.onLine;
        },

        /**
         * إعادة المحاولة بعد فشل
         */
        retryWithBackoff: async function(fn, maxRetries = 3, delay = 1000) {
            for (let i = 0; i < maxRetries; i++) {
                try {
                    return await fn();
                } catch (error) {
                    if (i === maxRetries - 1) throw error;
                    await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
                }
            }
        },

        /**
         * إظهار مؤشر التحميل
         */
        showLoadingSpinner: function(message = 'جاري التحميل...') {
            CoreUtils.hideLoadingSpinner();
            const spinner = document.createElement('div');
            spinner.id = 'customLoadingSpinner';
            spinner.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(255,255,255,0.85); backdrop-filter: blur(5px);
                display: flex; flex-direction: column;
                justify-content: center; align-items: center; z-index: 9999;
                color: #333; font-family: 'Cairo';
            `;
            spinner.innerHTML = `
                <div class="loader-spinner" style="width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid var(--secondary-color, #555); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                <p style="margin-top: 15px; font-weight: 600; font-size: 16px;">${message}</p>
            `;
            document.body.appendChild(spinner);
        },

        /**
         * إخفاء مؤشر التحميل
         */
        hideLoadingSpinner: function() {
            const spinner = document.getElementById('customLoadingSpinner');
            if (spinner) spinner.remove();
        },

        /**
         * إظهار إشعار
         */
        showToast: function(message, type = 'info', duration = 3000) {
            const now = Date.now();
            if (window.__lastToastTime && (now - window.__lastToastTime) < 300) return;
            window.__lastToastTime = now;

            let container = document.getElementById('toastContainer');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toastContainer';
                container.style.cssText = `
                    position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
                    z-index: 10002; display: flex; flex-direction: column; gap: 12px;
                    width: 90%; max-width: 380px; pointer-events: none;
                `;
                document.body.appendChild(container);
            }

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            
            let icon = 'fas fa-info-circle';
            let bgColor = 'rgba(85, 85, 85, 0.95)';
            
            switch(type) {
                case 'success':
                    icon = 'fas fa-check-circle';
                    bgColor = 'rgba(39, 174, 96, 0.95)';
                    break;
                case 'error':
                    icon = 'fas fa-times-circle';
                    bgColor = 'rgba(231, 76, 60, 0.95)';
                    break;
                case 'warning':
                    icon = 'fas fa-exclamation-circle';
                    bgColor = 'rgba(243, 156, 18, 0.95)';
                    break;
            }
            
            toast.style.cssText = `
                padding: 16px 24px; border-radius: 12px; color: white;
                font-size: 15px; font-weight: 600; box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                display: flex; align-items: center; gap: 12px;
                animation: slideInUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                background: ${bgColor}; backdrop-filter: blur(8px);
                border-right: 5px solid rgba(0,0,0,0.2); pointer-events: auto;
                transition: all 0.3s ease;
            `;
            
            const safeMessage = window.SecurityCore ? window.SecurityCore.sanitizeHTML(String(message)) : String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;');
            toast.innerHTML = `
                <i class="${icon}" style="font-size: 18px;"></i>
                <span>${safeMessage}</span>
            `;
            
            container.appendChild(toast);
            
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(-20px) scale(0.9)';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }
    };

    // إضافة أنماط CSS للحركات
    if (!document.getElementById('core-utils-styles')) {
        const style = document.createElement('style');
        style.id = 'core-utils-styles';
        style.textContent = `
            @keyframes slideInUp {
                from { transform: translateY(100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            @keyframes slideOutDown {
                from { transform: translateY(0); opacity: 1; }
                to { transform: translateY(100%); opacity: 0; }
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    window.CoreUtils = CoreUtils;
    // نسخ مختصرة للتوافق
    window.formatNumber = CoreUtils.formatNumber;
    window.showToast = CoreUtils.showToast;
    window.showLoadingSpinner = CoreUtils.showLoadingSpinner;
    window.hideLoadingSpinner = CoreUtils.hideLoadingSpinner;
    window.isValidEmail = CoreUtils.isValidEmail;
    window.isValidPhone = CoreUtils.isValidPhone;
    window.safeElementUpdate = CoreUtils.safeElementUpdate;
    window.generateGuestUID = CoreUtils.generateGuestUID;
    window.optimizeImageUrl = CoreUtils.optimizeImageUrl;
    window.formatArabicDate = CoreUtils.formatArabicDate;
    window.truncateText = CoreUtils.truncateText;
    window.generateUniqueId = CoreUtils.generateUniqueId;
    window.loadImageWithFallback = CoreUtils.loadImageWithFallback;
    window.checkInternetConnection = CoreUtils.checkInternetConnection;
    window.retryWithBackoff = CoreUtils.retryWithBackoff;
    window.formatSudanPhone = CoreUtils.formatSudanPhone;

    console.log('✅ core-utils.js loaded');
})();