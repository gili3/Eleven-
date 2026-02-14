// categories-system.js - نظام إدارة الأقسام المحسّن (Firebase Version)
// ======================== إدارة الأقسام ========================

const CATEGORIES = [
    { id: '', name: 'جميع المنتجات', icon: 'fas fa-th', color: '#c9a24d' },
    { id: 'perfume', name: 'عطور', icon: 'fas fa-spray-can', color: '#9b59b6' },
    { id: 'makeup', name: 'مكياج', icon: 'fas fa-palette', color: '#e84342' },
    { id: 'skincare', name: 'عناية بالبشرة', icon: 'fas fa-spa', color: '#00b894' },
    { id: 'haircare', name: 'عناية بالشعر', icon: 'fas fa-wind', color: '#0984e3' },
    { id: 'bodycare', name: 'عناية بالجسم', icon: 'fas fa-hand-holding-heart', color: '#6c5ce7' },
    { id: 'gifts', name: 'هدايا', icon: 'fas fa-gift', color: '#d63031' }
];

/**
 * تهيئة شريط الأقسام
 */
function initializeCategoriesBar() {
    const productsSection = document.getElementById('products');
    if (!productsSection) {
        console.log('⚠️ قسم المنتجات غير موجود بعد');
        return;
    }
    
    let categoriesContainer = document.querySelector('.categories-container');
    if (!categoriesContainer) {
        const header = productsSection.querySelector('.products-header');
        if (header) {
            const container = document.createElement('div');
            container.className = 'categories-container';
            container.id = 'categoriesBar';
            container.style.cssText = `
                display: flex;
                overflow-x: auto;
                gap: 10px;
                padding: 15px 0;
                margin-bottom: 20px;
                -webkit-overflow-scrolling: touch;
                scrollbar-width: thin;
                white-space: nowrap;
            `;
            header.insertBefore(container, header.querySelector('.filters-container'));
            categoriesContainer = container;
        }
    }
    
    if (!categoriesContainer) return;
    
    // إنشاء أزرار الأقسام
    categoriesContainer.innerHTML = CATEGORIES.map(category => `
        <button class="category-btn ${category.id === '' ? 'active' : ''}" 
                data-category="${category.id}" 
                onclick="filterByCategory('${category.id}')"
                style="
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 30px;
                    background: ${category.id === '' ? 'var(--secondary-color)' : '#f5f5f5'};
                    color: ${category.id === '' ? 'white' : '#333'};
                    font-family: 'Cairo';
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    white-space: nowrap;
                ">
            <i class="${category.icon}" style="color: ${category.id === '' ? 'white' : category.color};"></i>
            ${category.name}
        </button>
    `).join('');
    
    console.log('✅ تم تهيئة شريط الأقسام');
}

/**
 * تحديث حالة أزرار الأقسام
 */
function updateCategoryButtons(selectedCategory = '') {
    document.querySelectorAll('.category-btn').forEach(btn => {
        const isActive = btn.getAttribute('data-category') === selectedCategory;
        btn.classList.toggle('active', isActive);
        
        // تحديث الألوان
        if (isActive) {
            btn.style.background = 'var(--secondary-color)';
            btn.style.color = 'white';
            const icon = btn.querySelector('i');
            if (icon) icon.style.color = 'white';
        } else {
            btn.style.background = '#f5f5f5';
            btn.style.color = '#333';
            const categoryId = btn.getAttribute('data-category');
            const category = CATEGORIES.find(c => c.id === categoryId);
            if (category) {
                const icon = btn.querySelector('i');
                if (icon) icon.style.color = category.color || '#c9a24d';
            }
        }
    });
}

/**
 * التصفية حسب القسم
 */
function filterByCategory(categoryId) {
    console.log(`📁 تصفية حسب القسم: ${categoryId || 'الكل'}`);
    
    // تحديث فلتر الفئة في صفحة المنتجات
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.value = categoryId;
    }
    
    // تحديث حالة الأزرار
    updateCategoryButtons(categoryId);
    
    // إعادة تعيين مؤشرات التحميل في products-system
    if (typeof window.lastProductDoc !== 'undefined') {
        window.lastProductDoc = null;
        window.hasMoreProducts = true;
    }
    
    // تحميل المنتجات من Firebase مع الفلتر الجديد
    if (typeof loadProducts === 'function') {
        loadProducts(false);
    }
    
    // الانتقال إلى قسم المنتجات إذا لم نكن فيه
    const currentSection = document.querySelector('.section.active');
    if (!currentSection || currentSection.id !== 'products') {
        if (typeof showSection === 'function') {
            showSection('products');
        }
    }
}

/**
 * إعادة تعيين جميع الأقسام (اختيار الكل)
 */
function resetCategoryFilter() {
    filterByCategory('');
}

/**
 * الحصول على اسم القسم بالعربية
 */
function getCategoryName(categoryId) {
    const category = CATEGORIES.find(c => c.id === categoryId);
    return category ? category.name : 'عام';
}

/**
 * الحصول على أيقونة القسم
 */
function getCategoryIcon(categoryId) {
    const category = CATEGORIES.find(c => c.id === categoryId);
    return category ? category.icon : 'fas fa-tag';
}

// تصدير الدوال
window.CATEGORIES = CATEGORIES;
window.initializeCategoriesBar = initializeCategoriesBar;
window.filterByCategory = filterByCategory;
window.updateCategoryButtons = updateCategoryButtons;
window.resetCategoryFilter = resetCategoryFilter;
window.getCategoryName = getCategoryName;
window.getCategoryIcon = getCategoryIcon;

// تهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // تأخير بسيط للتأكد من وجود العناصر
    setTimeout(() => {
        initializeCategoriesBar();
    }, 300);
});

console.log('✅ categories-system.js المحسن loaded');