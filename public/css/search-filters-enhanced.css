/* search-filters-enhanced.css - أنماط البحث والفلاتر المحسّنة */

/* ======================== حقل البحث ======================== */

.search-container {
    position: relative;
    display: flex;
    align-items: center;
    background: white;
    border: 2px solid var(--border-color, #ddd);
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.search-container:focus-within {
    border-color: var(--secondary-color, #c9a24d);
    box-shadow: 0 4px 12px rgba(201, 162, 77, 0.15);
}

.search-container input {
    flex: 1;
    padding: 12px 15px;
    border: none;
    font-family: 'Cairo', sans-serif;
    font-size: 14px;
    outline: none;
    background: transparent;
}

.search-container input::placeholder {
    color: #bbb;
}

.search-container button {
    padding: 12px 15px;
    background: var(--secondary-color, #c9a24d);
    color: white;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 16px;
}

.search-container button:hover {
    background: var(--primary-color, #b8941f);
    transform: scale(1.05);
}

/* ======================== اقتراحات البحث ======================== */

#searchSuggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid var(--border-color, #ddd);
    border-top: none;
    border-radius: 0 0 8px 8px;
    max-height: 300px;
    overflow-y: auto;
    z-index: 1000;
    display: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.search-suggestion-item {
    padding: 12px 15px;
    cursor: pointer;
    border-bottom: 1px solid #f0f0f0;
    transition: all 0.2s ease;
    font-family: 'Cairo', sans-serif;
    font-size: 14px;
    color: #333;
}

.search-suggestion-item:hover {
    background: #f9f9f9;
    padding-right: 20px;
}

.search-suggestion-item i {
    color: #999;
    margin-left: 10px;
    margin-right: 5px;
}

/* ======================== الفلاتر والترتيب ======================== */

.filters-container {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 20px;
    align-items: center;
}

.filter-select {
    padding: 10px 15px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 6px;
    font-family: 'Cairo', sans-serif;
    font-size: 14px;
    background: white;
    cursor: pointer;
    transition: all 0.3s ease;
    color: #333;
    min-width: 150px;
}

.filter-select:hover {
    border-color: var(--secondary-color, #c9a24d);
    box-shadow: 0 2px 8px rgba(201, 162, 77, 0.1);
}

.filter-select:focus {
    outline: none;
    border-color: var(--secondary-color, #c9a24d);
    box-shadow: 0 4px 12px rgba(201, 162, 77, 0.2);
}

/* ======================== أزرار الفلاتر ======================== */

.filter-buttons {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
    position: relative;
}

.filter-btn {
    padding: 10px 16px;
    border: 2px solid var(--border-color, #ddd);
    background: white;
    border-radius: 20px;
    cursor: pointer;
    font-family: 'Cairo', sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: #333;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
}

.filter-btn:hover {
    border-color: var(--secondary-color, #c9a24d);
    color: var(--secondary-color, #c9a24d);
    background: rgba(201, 162, 77, 0.05);
    transform: translateY(-2px);
}

.filter-btn.active {
    background: var(--secondary-color, #c9a24d);
    color: white;
    border-color: var(--secondary-color, #c9a24d);
    box-shadow: 0 4px 12px rgba(201, 162, 77, 0.3);
}

.filter-btn i {
    font-size: 14px;
}

/* شارة عدد الفلاتر النشطة */

.filter-badge {
    display: inline-block;
    background: #e74c3c;
    color: white;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    margin-left: 10px;
    animation: pulse 0.5s ease-out;
}

@keyframes pulse {
    0% {
        transform: scale(0.8);
        opacity: 0;
    }
    50% {
        transform: scale(1.1);
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
}

/* ======================== شريط الفئات ======================== */

.categories-container {
    display: flex;
    overflow-x: auto;
    gap: 10px;
    padding: 15px 0;
    margin-bottom: 20px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    white-space: nowrap;
}

.categories-container::-webkit-scrollbar {
    height: 4px;
}

.categories-container::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
}

.categories-container::-webkit-scrollbar-thumb {
    background: var(--secondary-color, #c9a24d);
    border-radius: 10px;
}

.categories-container::-webkit-scrollbar-thumb:hover {
    background: var(--primary-color, #b8941f);
}

.category-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border: none;
    border-radius: 30px;
    background: #f5f5f5;
    color: #333;
    font-family: 'Cairo', sans-serif;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.category-btn:hover {
    background: #efefef;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.category-btn.active {
    background: var(--secondary-color, #c9a24d);
    color: white;
    box-shadow: 0 4px 12px rgba(201, 162, 77, 0.3);
}

.category-btn i {
    font-size: 16px;
}

/* ======================== شريط الفلاتر الرئيسي ======================== */

.products-header {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin-bottom: 20px;
}

.products-header h2 {
    margin: 0;
    font-size: 24px;
    color: #333;
    font-weight: 700;
}

/* ======================== حالات التحميل والرسائل ======================== */

.loading-more {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    gap: 15px;
}

.loading-spinner-small {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top-color: var(--secondary-color, #c9a24d);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.loading-more p {
    color: #666;
    font-family: 'Cairo', sans-serif;
    font-size: 14px;
    margin: 0;
}

/* ======================== شبكة المنتجات ======================== */

.products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 15px;
    margin-bottom: 30px;
}

@media (max-width: 768px) {
    .products-grid {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 10px;
    }
}

@media (max-width: 480px) {
    .products-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
    }
}

/* ======================== بطاقة المنتج ======================== */

.product-card {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    height: 100%;
}

.product-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.product-image {
    position: relative;
    width: 100%;
    padding-bottom: 100%;
    overflow: hidden;
    background: #f5f5f5;
}

.product-image img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
}

.product-card:hover .product-image img {
    transform: scale(1.05);
}

.badge-new,
.badge-sale,
.badge-best {
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    color: white;
    z-index: 10;
}

.badge-new {
    background: #27ae60;
}

.badge-sale {
    background: #e74c3c;
}

.badge-best {
    background: #f39c12;
}

.product-info {
    padding: 12px;
    flex: 1;
    display: flex;
    flex-direction: column;
}

.product-info h3 {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
    line-height: 1.3;
    min-height: 28px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.product-info .category {
    font-size: 12px;
    color: #999;
    margin-bottom: 8px;
}

.product-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
    padding-top: 8px;
    border-top: 1px solid #f0f0f0;
}

.product-footer .price {
    font-size: 14px;
    font-weight: 700;
    color: var(--secondary-color, #c9a24d);
}

.add-to-cart-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--secondary-color, #c9a24d);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    font-size: 14px;
}

.add-to-cart-btn:hover {
    background: var(--primary-color, #b8941f);
    transform: scale(1.1);
}

.add-to-cart-btn:active {
    transform: scale(0.95);
}

/* ======================== رسالة عدم وجود نتائج ======================== */

.empty-results {
    grid-column: 1/-1;
    text-align: center;
    padding: 60px 20px;
}

.empty-results i {
    font-size: 48px;
    color: #ddd;
    margin-bottom: 15px;
    display: block;
}

.empty-results h3 {
    font-size: 18px;
    color: #333;
    margin: 0 0 10px 0;
    font-weight: 600;
}

.empty-results p {
    color: #999;
    margin: 0;
    font-size: 14px;
}

/* ======================== الاستجابة ======================== */

@media (max-width: 768px) {
    .filters-container {
        flex-direction: column;
    }

    .filter-select {
        width: 100%;
    }

    .filter-buttons {
        width: 100%;
        justify-content: flex-start;
    }

    .search-container {
        width: 100%;
    }

    .products-header {
        gap: 12px;
    }

    .products-header h2 {
        font-size: 20px;
    }
}

@media (max-width: 480px) {
    .filter-btn {
        padding: 8px 12px;
        font-size: 12px;
    }

    .category-btn {
        padding: 8px 16px;
        font-size: 12px;
    }

    .filter-select {
        font-size: 12px;
        padding: 8px 10px;
    }

    .search-container input {
        font-size: 13px;
        padding: 10px 12px;
    }

    .search-container button {
        padding: 10px 12px;
    }
}
