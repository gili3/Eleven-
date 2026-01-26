/* css-security.css - تحسينات أمنية للواجهة */
/* ======================== حماية ضد CSS Injection ======================== */

/* إخفاء البيانات الحساسة في الطباعة */
@media print {
    .sensitive-data,
    [data-sensitive="true"],
    input[type="password"],
    input[type="tel"],
    .bank-info,
    .receipt-image {
        display: none !important;
    }
}

/* منع نسخ البيانات الحساسة */
.no-copy {
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
}

.sensitive-text {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    filter: blur(1px);
    transition: filter 0.3s ease;
}

.sensitive-text:hover {
    filter: blur(0);
}

/* حماية ضد keyloggers في حقول كلمات المرور */
input[type="password"] {
    font-family: "password", "Cairo", sans-serif;
    letter-spacing: 2px;
}

/* إخفاء المحتوى في وضع العرض المسبق */
@media (prefers-reduced-motion: reduce) {
    .sensitive-data {
        opacity: 0.7;
    }
}

/* تحذيرات الأمان */
.security-warning {
    position: relative;
    padding: 10px 15px;
    margin: 10px 0;
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 8px;
    color: #856404;
    font-size: 14px;
}

.security-warning::before {
    content: "⚠️ ";
    margin-left: 5px;
}

.security-alert {
    background: #f8d7da;
    border-color: #f5c6cb;
    color: #721c24;
}

.security-alert::before {
    content: "🚨 ";
}

.security-success {
    background: #d4edda;
    border-color: #c3e6cb;
    color: #155724;
}

.security-success::before {
    content: "✅ ";
}

/* حماية ضد screenshots (للمتصفحات الداعمة) */
.anti-screenshot {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
}

