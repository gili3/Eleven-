// categories-system.js - نسخة تعمل مع Session Storage

// ======================== المتغيرات العامة ========================
window.CATEGORIES = [];
window.categoriesLoaded = false;

// متغيرات لإعادة المحاولة
let categoryRetryCount = 0;
const MAX_CATEGORY_RETRIES = 5;

// ======================== تحميل الفئات من Firebase ========================

async function loadCategoriesFromFirebase() {
    console.log('📥 [categories] بدء تحميل الفئات من Firebase...');
    
    try {
        const db = window.db || window.firebaseDb;
        const modules = window.firebaseModules;
        
        if (!db || !modules) {
            categoryRetryCount++;
            if (categoryRetryCount <= MAX_CATEGORY_RETRIES) {
                console.log(`⏳ [categories] Firebase غير جاهز، إعادة المحاولة ${categoryRetryCount}/${MAX_CATEGORY_RETRIES}...`);
                setTimeout(loadCategoriesFromFirebase, 1000 * categoryRetryCount);
            } else {
                console.error('❌ [categories] فشل تحميل Firebase بعد عدة محاولات');
                window.CATEGORIES = [];
                window.categoriesLoaded = true;
                updateCategoryFilterDisplay();
            }
            return;
        }

        // إعادة تعيين العداد عند النجاح
        categoryRetryCount = 0;

        console.log('✅ [categories] Firebase متاح، جاري جلب الفئات...');
        
        const categoriesRef = modules.collection(db, 'categories');
        const querySnapshot = await modules.getDocs(categoriesRef);
        
        if (querySnapshot.empty) {
            console.log('📭 [categories] لا توجد فئات في قاعدة البيانات');
            window.CATEGORIES = [];
            window.categoriesLoaded = true;
            updateCategoryFilterDisplay();
            return;
        }
        
        window.CATEGORIES = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            window.CATEGORIES.push({
                id: doc.id,
                name: data.name || 'بدون اسم',
                name_lowercase: (data.name || 'بدون اسم').toLowerCase(),
                icon: data.icon || 'fas fa-tag',
                order: data.order || 0,
                isActive: data.isActive !== false,
                color: data.color || '#c9a24d'
            });
        });
        
        window.CATEGORIES.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        const activeCategories = window.CATEGORIES.filter(cat => cat.isActive === true);
        
        console.log(`✅ [categories] تم تحميل ${window.CATEGORIES.length} فئة (${activeCategories.length} فئة نشطة)`);
        
        window.categoriesLoaded = true;
        
        updateCategoryFilterDisplay();
        
        window.dispatchEvent(new CustomEvent('categories-loaded', { 
            detail: window.CATEGORIES 
        }));
        
    } catch (error) {
        console.error('❌ [categories] خطأ في تحميل الفئات:', error);
        categoryRetryCount++;
        if (categoryRetryCount <= MAX_CATEGORY_RETRIES) {
            console.log(`🔄 [categories] إعادة المحاولة ${categoryRetryCount}/${MAX_CATEGORY_RETRIES} بعد الخطأ...`);
            setTimeout(loadCategoriesFromFirebase, 1000 * categoryRetryCount);
        } else {
            window.CATEGORIES = [];
            window.categoriesLoaded = true;
            updateCategoryFilterDisplay();
        }
    }
}

// ======================== عرض الفئات في القائمة المنسدلة ========================

function updateCategoryFilterDisplay() {
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (!categoryFilter) {
        console.warn('⚠️ [categories] العنصر #categoryFilter غير موجود في الصفحة');
        return;
    }
    
    // قراءة الفئة الحالية من Session Storage
    const f = window.getFilters ? window.getFilters() : { cat: '' };
    
    if (!window.CATEGORIES || window.CATEGORIES.length === 0) {
        categoryFilter.innerHTML = '<option value="">جميع الفئات</option>';
        categoryFilter.disabled = false;
        return;
    }
    
    const activeCategories = window.CATEGORIES.filter(cat => cat.isActive === true);
    
    if (activeCategories.length === 0) {
        categoryFilter.innerHTML = '<option value="">جميع الفئات</option>';
        categoryFilter.disabled = false;
        return;
    }
    
    let options = '<option value="">جميع الفئات</option>';
    
    activeCategories.forEach(category => {
        const selected = (f.cat === category.id) ? 'selected' : '';
        options += `<option value="${category.id}" ${selected}>${escapeHtml(category.name)}</option>`;
    });
    
    categoryFilter.innerHTML = options;
    categoryFilter.disabled = false;
    
    console.log(`✅ [categories] تم تحديث القائمة المنسدلة بـ ${activeCategories.length} فئة`);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ======================== دوال مساعدة ========================

window.getCategoryName = function(categoryId) {
    if (!categoryId) return 'جميع المنتجات';
    const category = window.CATEGORIES.find(c => c.id === categoryId);
    return category ? category.name : 'منتجات';
};

window.getCategoryIdByName = function(categoryName) {
    if (!categoryName) return '';
    const category = window.CATEGORIES.find(c => 
        c.name === categoryName || 
        c.name_lowercase === categoryName.toLowerCase()
    );
    return category ? category.id : '';
};

window.getCategoryIcon = function(categoryId) {
    const category = window.CATEGORIES.find(c => c.id === categoryId);
    return category ? category.icon : 'fas fa-tag';
};

window.getCategoryColor = function(categoryId) {
    const category = window.CATEGORIES.find(c => c.id === categoryId);
    return category ? category.color : '#c9a24d';
};

window.hasCategories = function() {
    return window.CATEGORIES && window.CATEGORIES.length > 0;
};

window.getCategories = function() {
    return [...window.CATEGORIES];
};

window.reloadCategories = function() {
    console.log('🔄 [categories] إعادة تحميل الفئات...');
    categoryRetryCount = 0; // إعادة تعيين العداد
    loadCategoriesFromFirebase();
};

// ======================== التصدير ========================

window.loadCategoriesFromFirebase = loadCategoriesFromFirebase;
window.updateCategoryFilterDisplay = updateCategoryFilterDisplay;

// ======================== التهيئة التلقائية ========================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 [categories] DOM جاهز');
    setTimeout(function() {
        loadCategoriesFromFirebase();
    }, 300);
});

window.addEventListener('firebase-ready', function() {
    console.log('🔥 [categories] Firebase جاهز');
    categoryRetryCount = 0; // إعادة تعيين العداد
    loadCategoriesFromFirebase();
});

console.log('✅ categories-system.js جاهز');