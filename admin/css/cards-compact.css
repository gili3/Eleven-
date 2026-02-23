/**
 * cards-compact.css - تصميم البطاقات المختصرة القابلة للتوسع
 */

/* حاوية البطاقات */
.cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
}

/* البطاقة المختصرة */
.compact-card {
    background: white;
    border-radius: 12px;
    padding: 15px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    cursor: pointer;
    border: 1px solid #f0f0f0;
    position: relative;
    overflow: hidden;
}

.compact-card:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
    border-color: var(--primary-color);
}

/* رأس البطاقة */
.card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
}

.card-image {
    width: 50px;
    height: 50px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
    border: 2px solid #f5f5f5;
}

.card-title-section {
    flex: 1;
    min-width: 0;
}

.card-title {
    font-size: 14px;
    font-weight: 600;
    color: #333;
    margin: 0 0 4px 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.card-subtitle {
    font-size: 12px;
    color: #888;
    margin: 0;
}

/* محتوى البطاقة */
.card-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-top: 1px solid #f5f5f5;
}

.card-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.card-info-item {
    font-size: 12px;
    color: #666;
    display: flex;
    align-items: center;
    gap: 5px;
}

.card-info-item i {
    width: 14px;
    font-size: 11px;
    color: #999;
}

.card-info-value {
    font-weight: 600;
    color: #333;
}

/* شارات الحالة */
.card-badge {
    position: absolute;
    top: 10px;
    left: 10px;
    padding: 3px 8px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
}

.badge-success {
    background: #d4edda;
    color: #155724;
}

.badge-danger {
    background: #f8d7da;
    color: #721c24;
}

.badge-warning {
    background: #fff3cd;
    color: #856404;
}

.badge-info {
    background: #d1ecf1;
    color: #0c5460;
}

/* أزرار الإجراءات السريعة */
.card-quick-actions {
    display: flex;
    gap: 5px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #f5f5f5;
}

.card-action-btn {
    flex: 1;
    padding: 6px 10px;
    border: none;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    background: #f8f9fa;
    color: #555;
}

.card-action-btn:hover {
    background: var(--primary-color);
    color: white;
    transform: scale(1.05);
}

.card-action-btn i {
    font-size: 12px;
}

/* Modal التفاصيل الكاملة */
.card-details-modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    z-index: 3000;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
    animation: fadeIn 0.2s ease;
}

.card-details-modal.active {
    display: flex;
}

.card-details-content {
    background: white;
    border-radius: 16px;
    padding: 0;
    max-width: 600px;
    width: 90%;
    max-height: 85vh;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from { 
        opacity: 0;
        transform: translateY(30px);
    }
    to { 
        opacity: 1;
        transform: translateY(0);
    }
}

.card-details-header {
    padding: 20px 25px;
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.card-details-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
}

.card-details-close {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    font-size: 24px;
    width: 35px;
    height: 35px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    line-height: 1;
}

.card-details-close:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: rotate(90deg);
}

.card-details-body {
    padding: 25px;
    max-height: calc(85vh - 180px);
    overflow-y: auto;
}

.card-details-section {
    margin-bottom: 20px;
}

.card-details-section:last-child {
    margin-bottom: 0;
}

.card-details-section-title {
    font-size: 14px;
    font-weight: 600;
    color: #555;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 2px solid #f0f0f0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.card-details-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
}

.card-details-item {
    background: #f8f9fa;
    padding: 12px;
    border-radius: 8px;
}

.card-details-item-label {
    font-size: 11px;
    color: #888;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

.card-details-item-value {
    font-size: 14px;
    font-weight: 600;
    color: #333;
}

.card-details-full {
    grid-column: 1 / -1;
}

.card-details-image {
    width: 100%;
    max-width: 200px;
    height: auto;
    border-radius: 12px;
    margin: 10px auto;
    display: block;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-details-footer {
    padding: 20px 25px;
    background: #f8f9fa;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    border-top: 1px solid #e9ecef;
}

.card-details-footer button {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: 'Cairo', sans-serif;
}

.btn-primary-detail {
    background: var(--primary-color);
    color: white;
}

.btn-primary-detail:hover {
    background: var(--secondary-color);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-secondary-detail {
    background: white;
    color: #555;
    border: 1px solid #ddd;
}

.btn-secondary-detail:hover {
    background: #f8f9fa;
}

.btn-danger-detail {
    background: #dc3545;
    color: white;
}

.btn-danger-detail:hover {
    background: #c82333;
}

/* Skeleton Loader للتحميل */
.skeleton-card {
    background: white;
    border-radius: 12px;
    padding: 15px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border: 1px solid #f0f0f0;
}

.skeleton {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
    border-radius: 4px;
}

@keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

.skeleton-header {
    display: flex;
    gap: 12px;
    margin-bottom: 10px;
}

.skeleton-image {
    width: 50px;
    height: 50px;
    border-radius: 8px;
}

.skeleton-text {
    flex: 1;
}

.skeleton-title {
    height: 16px;
    margin-bottom: 8px;
    width: 70%;
}

.skeleton-subtitle {
    height: 12px;
    width: 40%;
}

.skeleton-content {
    padding-top: 10px;
    border-top: 1px solid #f5f5f5;
}

.skeleton-line {
    height: 12px;
    margin-bottom: 8px;
}

.skeleton-line:last-child {
    margin-bottom: 0;
    width: 60%;
}

/* استجابة للشاشات الصغيرة */
@media (max-width: 768px) {
    .cards-grid {
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 12px;
    }

    .compact-card {
        padding: 12px;
    }

    .card-image {
        width: 45px;
        height: 45px;
    }

    .card-title {
        font-size: 13px;
    }

    .card-details-content {
        width: 95%;
        max-height: 90vh;
    }

    .card-details-grid {
        grid-template-columns: 1fr;
    }

    .card-details-footer {
        flex-direction: column;
    }

    .card-details-footer button {
        width: 100%;
    }
}

@media (max-width: 480px) {
    .cards-grid {
        grid-template-columns: 1fr;
    }
}

/* Loading Spinner للتمرير اللانهائي */
.infinite-scroll-loader {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 30px;
    margin-top: 20px;
}

.loader-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.loader-text {
    margin-right: 15px;
    color: #666;
    font-size: 14px;
}

/* Empty State */
.empty-state {
    text-align: center;
    padding: 60px 20px;
}

.empty-state-icon {
    font-size: 64px;
    color: #ddd;
    margin-bottom: 20px;
}

.empty-state-title {
    font-size: 18px;
    font-weight: 600;
    color: #555;
    margin-bottom: 10px;
}

.empty-state-text {
    font-size: 14px;
    color: #888;
}
