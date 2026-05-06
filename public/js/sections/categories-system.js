// categories-system.js - نسخة تعمل 100% (قائمة منسدلة فقط)

// ======================== المتغيرات العامة ========================
window.CATEGORIES = [];
window.categoriesLoaded = false;
window.currentCategoryId = '';

// ======================== تحميل الفئات من Firebase ========================

/**
 * تحميل الفئات من Firebase
 */
async function loadCategoriesFromFirebase() {
    console.log('📥 [categories] بدء تحميل الفئات من Firebase...');
    
    try {
        // التحقق من توفر Firebase
        const db = window.db || window.firebaseDb;
        const modules = window.firebaseModules;
        
        if (!db || !modules) {
            console.log('⏳ [categories] Firebase غير جاهز، إعادة المحاولة بعد 1 ثانية...');
            setTimeout(loadCategoriesFromFirebase, 1000);
            return;
        }

        console.log('✅ [categories] Firebase متاح، جاري جلب الفئات...');
        
        // جلب الفئات من مجموعة categories
        const categoriesRef = modules.collection(db, 'categories');
        const querySnapshot = await modules.getDocs(categoriesRef);
        
        if (querySnapshot.empty) {
            console.log('📭 [categories] لا توجد فئات في قاعدة البيانات');
            window.CATEGORIES = [];
            window.categoriesLoaded = true;
            updateCategoryFilterDisplay();
            return;
        }
        
        // معالجة البيانات
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
        
        // ترتيب الفئات حسب الترتيب المحدد
        window.CATEGORIES.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // تصفية الفئات النشطة فقط
        const activeCategories = window.CATEGORIES.filter(cat => cat.isActive === true);
        
        console.log(`✅ [categories] تم تحميل ${window.CATEGORIES.length} فئة (${activeCategories.length} فئة نشطة)`);
        console.log('📋 [categories] الفئات:', window.CATEGORIES.map(c => c.name).join(', '));
        
        window.categoriesLoaded = true;
        
        // تحديث القائمة المنسدلة
        updateCategoryFilterDisplay();
        
        // إرسال حدث اكتمال التحميل
        window.dispatchEvent(new CustomEvent('categories-loaded', { 
            detail: window.CATEGORIES 
        }));
        
    } catch (error) {
        console.error('❌ [categories] خطأ في تحميل الفئات:', error);
        window.CATEGORIES = [];
        updateCategoryFilterDisplay();
    }
}

// ======================== عرض الفئات في القائمة المنسدلة ========================

/**
 * تحديث عرض القائمة المنسدلة
 */
function updateCategoryFilterDisplay() {
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (!categoryFilter) {
        console.warn('⚠️ [categories] العنصر #categoryFilter غير موجود في الصفحة');
        return;
    }
    
    // إذا لم توجد فئات
    if (!window.CATEGORIES || window.CATEGORIES.length === 0) {
        console.log('📭 [categories] لا توجد فئات لعرضها');
        categoryFilter.innerHTML = '<option value="">جميع الفئات</option>';
        categoryFilter.disabled = false;
        return;
    }
    
    // تصفية الفئات النشطة فقط للعرض
    const activeCategories = window.CATEGORIES.filter(cat => cat.isActive === true);
    
    if (activeCategories.length === 0) {
        categoryFilter.innerHTML = '<option value="">جميع الفئات</option>';
        categoryFilter.disabled = false;
        return;
    }
    
    // بناء خيارات القائمة المنسدلة
    let options = '<option value="">جميع الفئات</option>';
    
    activeCategories.forEach(category => {
        const selected = (window.currentCategoryId === category.id) ? 'selected' : '';
        options += `<option value="${category.id}" ${selected}>${escapeHtml(category.name)}</option>`;
    });
    
    categoryFilter.innerHTML = options;
    categoryFilter.disabled = false;
    
    console.log(`✅ [categories] تم تحديث القائمة المنسدلة بـ ${activeCategories.length} فئة`);
}

/**
 * عرض رسالة عند عدم وجود فئات
 */
function updateCategoryFilterEmpty() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.innerHTML = '<option value="">جميع الفئات</option>';
        categoryFilter.disabled = false;
    }
}

// ======================== دوال مساعدة ========================

/**
 * تنقية النص لمنع XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * التصفية حسب الفئة
 */
window.filterByCategory = function(categoryId) {
    console.log(`📁 [categories] تصفية حسب الفئة: ${categoryId || 'الكل'}`);
    
    // تحديث الفئة الحالية
    window.currentCategoryId = categoryId || '';
    
    // تحديث القائمة المنسدلة
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.value = window.currentCategoryId;
    }
    
    // إعادة تعيين حالة المنتجات
    if (typeof window.resetProductsState === 'function') {
        window.resetProductsState();
    }
    
    // تحميل المنتجات من جديد
    if (typeof window.loadProducts === 'function') {
        setTimeout(() => {
            window.loadProducts(false);
        }, 50);
    }
    
    // التأكد من وجودنا في قسم المنتجات
    const currentSection = document.querySelector('.section.active');
    if (!currentSection || currentSection.id !== 'products') {
        if (typeof window.showSection === 'function') {
            window.showSection('products');
        }
    }
};

/**
 * الحصول على اسم الفئة من معرفها
 */
window.getCategoryName = function(categoryId) {
    if (!categoryId) return 'جميع المنتجات';
    const category = window.CATEGORIES.find(c => c.id === categoryId);
    return category ? category.name : 'منتجات';
};

/**
 * الحصول على معرف الفئة من اسمها
 */
window.getCategoryIdByName = function(categoryName) {
    if (!categoryName) return '';
    const category = window.CATEGORIES.find(c => 
        c.name === categoryName || 
        c.name_lowercase === categoryName.toLowerCase()
    );
    return category ? category.id : '';
};

/**
 * الحصول على أيقونة الفئة
 */
window.getCategoryIcon = function(categoryId) {
    const category = window.CATEGORIES.find(c => c.id === categoryId);
    return category ? category.icon : 'fas fa-tag';
};

/**
 * الحصول على لون الفئة
 */
window.getCategoryColor = function(categoryId) {
    const category = window.CATEGORIES.find(c => c.id === categoryId);
    return category ? category.color : '#c9a24d';
};

/**
 * التحقق من وجود فئات
 */
window.hasCategories = function() {
    return window.CATEGORIES && window.CATEGORIES.length > 0;
};

/**
 * الحصول على جميع الفئات
 */
window.getCategories = function() {
    return [...window.CATEGORIES];
};

/**
 * إعادة تحميل الفئات
 */
window.reloadCategories = function() {
    console.log('🔄 [categories] إعادة تحميل الفئات...');
    loadCategoriesFromFirebase();
};

// ======================== تهيئة الأحداث ========================

/**
 * إعداد مستمعي الأحداث
 */
function setupCategoryEventListeners() {
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (categoryFilter) {
        // إزالة المستمع القديم إذا وجد
        if (categoryFilter._listener) {
            categoryFilter.removeEventListener('change', categoryFilter._listener);
        }
        
        // إضافة مستمع جديد
        const handler = function(e) {
            const categoryId = e.target.value;
            console.log(`🔄 [categories] تغيرت القائمة المنسدلة إلى: ${categoryId || 'الكل'}`);
            if (typeof window.filterByCategory === 'function') {
                window.filterByCategory(categoryId);
            }
        };
        
        categoryFilter.addEventListener('change', handler);
        categoryFilter._listener = handler;
        
        console.log('✅ [categories] تم إعداد مستمع أحداث القائمة المنسدلة');
    }
}

/**
 * تهيئة نظام الفئات
 */
function initializeCategoriesSystem() {
    console.log('🏷️ [categories] تهيئة نظام الفئات (قائمة منسدلة فقط)...');
    
    // إعداد المستمعات
    setupCategoryEventListeners();
    
    // تحميل الفئات
    loadCategoriesFromFirebase();
}

// ======================== التصدير ========================

// تصدير الدوال العامة
window.loadCategoriesFromFirebase = loadCategoriesFromFirebase;
window.filterByCategory = window.filterByCategory;
window.getCategoryName = window.getCategoryName;
window.getCategoryIdByName = window.getCategoryIdByName;
window.getCategoryIcon = window.getCategoryIcon;
window.getCategoryColor = window.getCategoryColor;
window.hasCategories = window.hasCategories;
window.getCategories = window.getCategories;
window.reloadCategories = window.reloadCategories;
window.initializeCategoriesSystem = initializeCategoriesSystem;
window.updateCategoryFilterDisplay = updateCategoryFilterDisplay;

// ======================== التهيئة التلقائية ========================

// عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 [categories] DOM جاهز');
    setTimeout(function() {
        initializeCategoriesSystem();
    }, 300);
});

// عند جاهزية Firebase
window.addEventListener('firebase-ready', function() {
    console.log('🔥 [categories] Firebase جاهز');
    loadCategoriesFromFirebase();
});

console.log('✅ categories-system.js (نسخة مصححة تعمل 100%) جاهز');