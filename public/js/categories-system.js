// categories-system.js - نظام إدارة الأقسام المحسّن
// ======================== إدارة الأقسام ========================

// قائمة الأقسام المتاحة
const CATEGORIES = [
    { id: '', name: 'جميع المنتجات', icon: 'fas fa-th' },
    { id: 'perfume', name: 'عطور', icon: 'fas fa-spray-can' },
    { id: 'makeup', name: 'مكياج', icon: 'fas fa-palette' },
    { id: 'skincare', name: 'عناية بالبشرة', icon: 'fas fa-spa' },
    { id: 'haircare', name: 'عناية بالشعر', icon: 'fas fa-wind' }
];

// إنشاء شريط الأقسام الأفقي
function initializeCategoriesBar() {
    console.log('⚙️ تهيئة شريط الأقسام...');
    
    const productsSection = document.getElementById('products');
    if (!productsSection) return;
    
    // البحث عن الحاوية أو إنشاء واحدة جديدة
    let categoriesContainer = document.querySelector('.categories-container');
    if (!categoriesContainer) {
        // إنشاء الحاوية إذا لم تكن موجودة
        const header = productsSection.querySelector('.products-header');
        if (header) {
            const container = document.createElement('div');
            container.className = 'categories-container';
            container.id = 'categoriesBar';
            header.insertBefore(container, header.querySelector('.filters-container'));
            categoriesContainer = container;
        }
    }
    
    if (!categoriesContainer) return;
    
    // إنشاء أزرار الأقسام
    const categoriesHTML = CATEGORIES.map(category => `
        <button class="category-btn ${category.id === '' ? 'active' : ''}" 
                data-category="${category.id}" 
                onclick="filterByCategory('${category.id}')">
            <i class="${category.icon}"></i> ${category.name}
        </button>
    `).join('');
    
    categoriesContainer.innerHTML = categoriesHTML;
    console.log('✅ تم تهيئة شريط الأقسام');
}

// تحديث حالة الأقسام عند الفلترة
function updateCategoryButtons(selectedCategory = '') {
    const buttons = document.querySelectorAll('.category-btn');
    buttons.forEach(btn => {
        const category = btn.getAttribute('data-category');
        if (category === selectedCategory) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// دالة الفلترة حسب الفئة المحسّنة
function filterByCategory(categoryId) {
    console.log(`🔍 فلترة حسب الفئة: ${categoryId || 'جميع المنتجات'}`);
    
    // تحديث الفئة المختارة في select
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.value = categoryId;
    }
    
    // تحديث أزرار الأقسام
    updateCategoryButtons(categoryId);
    
    // تطبيق الفلترة
    if (typeof filterProducts === 'function') {
        filterProducts();
    }
}

// دالة الفلترة المتقدمة للمنتجات (تم تعديلها لتعمل مع قاعدة البيانات)
function filterProducts() {
    console.log('🔎 جاري إعادة تحميل المنتجات مع الفلاتر من قاعدة البيانات...');
    
    // مسح حقل البحث عند استخدام الفلاتر
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }

    // استدعاء تحميل المنتجات من Firebase (سيقوم loadProducts بقراءة قيم الفلاتر من DOM وتطبيقها في الاستعلام)
    if (typeof loadProducts === 'function') {
        loadProducts(false); // false تعني البدء من الصفحة الأولى
    }
}

// تصدير الدوال للنافذة العالمية
window.initializeCategoriesBar = initializeCategoriesBar;
window.filterByCategory = filterByCategory;
window.filterProducts = filterProducts;
window.updateCategoryButtons = updateCategoryButtons;

// تهيئة شريط الأقسام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    initializeCategoriesBar();
});
