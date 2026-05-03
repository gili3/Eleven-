// modal-manager.js - إدارة النوافذ المنبثقة بشكل موحد

(function() {
    'use strict';

    if (window.ModalManager) return;

    const ModalManager = {
        open: function(options) {
            const {
                id = 'modal-' + Date.now(),
                title = '',
                content = '',
                size = 'medium',
                onClose = null,
                buttons = []
            } = options;

            // إغلاق أي نافذة مفتوحة بنفس id
            this.close(id);

            const modal = document.createElement('div');
            modal.id = id;
            modal.className = 'modal-overlay active';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');

            const sizeClass = size === 'small' ? 'modal-small' : (size === 'large' ? 'modal-large' : 'modal-medium');

            // تنظيف العنوان من XSS
            const safeTitle = window.SecurityCore ? window.SecurityCore.sanitizeHTML(title) : title;
            // تنظيف نصوص الأزرار
            const safeButtons = buttons.map(btn => ({
                ...btn,
                text: window.SecurityCore ? window.SecurityCore.sanitizeHTML(btn.text || '') : (btn.text || '')
            }));

            modal.innerHTML = `
                <div class="modal-content ${sizeClass}">
                    <div class="modal-header">
                        <h3>${safeTitle}</h3>
                        <button class="modal-close" aria-label="إغلاق">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    ${safeButtons.length ? `
                    <div class="modal-footer">
                        ${safeButtons.map(btn => `<button class="btn ${btn.class || 'btn-secondary'}" data-action="${btn.id || ''}">${btn.text}</button>`).join('')}
                    </div>
                    ` : ''}
                </div>
            `;

            document.body.appendChild(modal);

            // إضافة مستمعي الأحداث
            const closeBtn = modal.querySelector('.modal-close');
            closeBtn.addEventListener('click', () => this.close(id));

            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.close(id);
            });

            buttons.forEach((btn, index) => {
                const btnEl = modal.querySelectorAll('.modal-footer button')[index];
                if (btnEl && btn.onClick) {
                    btnEl.addEventListener('click', () => {
                        btn.onClick();
                        if (btn.closeOnClick !== false) this.close(id);
                    });
                }
            });

            if (onClose) {
                modal.addEventListener('modal-closed', onClose);
            }

            // منع التمرير خلف النافذة
            document.body.style.overflow = 'hidden';

            return modal;
        },

        close: function(id) {
            const modal = document.getElementById(id);
            if (modal) {
                const event = new CustomEvent('modal-closed');
                modal.dispatchEvent(event);
                modal.remove();
                document.body.style.overflow = '';
            }
        },

        closeAll: function() {
            document.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());
            document.body.style.overflow = '';
        },

        alert: function(message, title = 'تنبيه', callback = null) {
            const safeMsg = window.SecurityCore ? window.SecurityCore.sanitizeHTML(message) : message;
            return this.open({
                title: title,
                content: `<p>${safeMsg}</p>`,
                size: 'small',
                buttons: [
                    { text: 'موافق', class: 'btn-primary', onClick: callback }
                ]
            });
        },

        confirm: function(message, title = 'تأكيد', onConfirm, onCancel = null) {
            const safeMsg = window.SecurityCore ? window.SecurityCore.sanitizeHTML(message) : message;
            return this.open({
                title: title,
                content: `<p>${safeMsg}</p>`,
                size: 'small',
                buttons: [
                    { text: 'نعم', class: 'btn-danger', onClick: onConfirm },
                    { text: 'إلغاء', class: 'btn-secondary', onClick: onCancel }
                ]
            });
        }
    };

    window.ModalManager = ModalManager;
    console.log('✅ modal-manager.js loaded');
})();

