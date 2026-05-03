// categories-system.js - نظام إدارة الفئات للموقع الرئيسي (نسخة مصححة ومحسنة)
// ======================== نظام الفئات المتقدم ========================

// المتغيرات العامة
window.CATEGORIES = [];
window.categoriesLoaded = false;
window.currentCategoryId = '';

/**
 * الحصول على مرجع Firebase
 */
function getFirebaseReference() {
    if (window.firebaseDb) return window.firebaseDb;
    if (window.db) return window.db;
    if (typeof window.getFirebaseReference === 'function') return window.getFirebaseReference();
    console.warn('⚠️ Firebase غير مهيأ بعد');
    return null;
}

/**
 * تحميل الفئات من Firebase فقط
 */
async function loadCategoriesFromFirebase(retries = 3) {
    console.log('📥 loadCategoriesFromFirebase بدأت');
    
    try {
        const db = getFirebaseReference();
        console.log('db:', db);
        
        if (!db) {
            if (retries > 0) {
                console.log(`⚠️ db غير متاح، إعادة المحاولة... (${retries})`);
                setTimeout(() => loadCategoriesFromFirebase(retries - 1), 1000);
                return;
            }
            throw new Error('تعذر الوصول إلى قاعدة البيانات');
        }

        if (!window.firebaseModules) {
            console.error('❌ firebaseModules غير متاح');
            return;
        }

        const categoriesRef = window.firebaseModules.collection(db, 'categories');
        
        // محاولة التحميل مع شرط isActive أولاً
        let snapshot;
        try {
            console.log('🔍 محاولة تحميل الفئات مع شرط isActive...');
            const q = window.firebaseModules.query(
                categoriesRef,
                window.firebaseModules.where('isActive', '==', true),
                window.firebaseModules.orderBy('order', 'asc'),
                window.firebaseModules.orderBy('createdAt', 'desc')
            );
            snapshot = await window.firebaseModules.getDocs(q);
            console.log(`📦 عدد الفئات المحملة (مع isActive): ${snapshot.size}`);
        } catch (e) {
            // إذا فشل بسبب عدم وجود حقل isActive، حاول بدون شرط
            console.warn('⚠️ شرط isActive فشل، تحميل جميع الفئات:', e.message);
            const q = window.firebaseModules.query(
                categoriesRef,
                window.firebaseModules.orderBy('createdAt', 'desc')
            );
            snapshot = await window.firebaseModules.getDocs(q);
            console.log(`📦 عدد الفئات المحملة (جميع الفئات): ${snapshot.size}`);
        }

        if (snapshot.empty) {
            console.log('📭 لا توجد فئات في Firebase');
            window.CATEGORIES = [];
            window.categoriesLoaded = true;
            displayEmptyCategoriesMessage();
            return;
        }

        // تحميل الفئات
        window.CATEGORIES = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            window.CATEGORIES.push({
                id: doc.id,
                name: data.name || 'فئة',
                name_lowercase: (data.name || 'فئة').toLowerCase(),
                slug: data.slug || doc.id,
                icon: data.icon || 'fas fa-tag',
                color: data.color || '#c9a24d',
                image: data.image || '',
                description: data.description || '',
                isActive: data.isActive !== false,
                order: data.order || 0
            });
        });
        
        console.log(`✅ تم تحميل ${window.CATEGORIES.length} فئة من Firebase`);
        window.categoriesLoaded = true;
        
        // تحديث واجهة المستخدم
        renderCategoriesUI();
        
        // إرسال حدث اكتمال التحميل
        window.dispatchEvent(new CustomEvent('categories-loaded', { detail: window.CATEGORIES }));
        
    } catch (error) {
        console.error('❌ خطأ في تحميل الفئات من Firebase:', error);
        window.CATEGORIES = [];
        displayEmptyCategoriesMessage();
    }
}

/**
 * عرض رسالة عدم وجود فئات
 */
function displayEmptyCategoriesMessage() {
    // إخفاء جميع عناصر الفئات
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.innerHTML = '<option value="">لا توجد فئات</option>';
        categoryFilter.disabled = true;
    }
    
    // إخفاء شريط الفئات إذا كان موجوداً
    const categoriesBar = document.getElementById('categoriesBar');
    if (categoriesBar) {
        categoriesBar.innerHTML = '<div class="no-categories-message" style="text-align: center; padding: 20px; color: #999;">لا توجد فئات متاحة حالياً</div>';
    }
    
    console.log('📭 لا توجد فئات لعرضها');
}

/**
 * تحديث واجهة المستخدم بالفئات المحملة
 */
function renderCategoriesUI() {
    // تحديث قائمة الفئات المنسدلة
    updateCategoryFilter();
    
    // تحديث شريط الفئات
    updateCategoriesBar();
    
    // تحديث أزرار الفئات في أي مكان آخر
    updateAllCategoryButtons();
}

/**
 * تحديث قائمة الفئات المنسدلة
 */
function updateCategoryFilter() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) {
        console.warn('⚠️ categoryFilter غير موجود في الصفحة');
        return;
    }
    
    if (window.CATEGORIES.length === 0) {
        categoryFilter.innerHTML = '<option value="">لا توجد فئات</option>';
        categoryFilter.disabled = true;
        return;
    }
    
    categoryFilter.disabled = false;
    categoryFilter.innerHTML = '<option value="">جميع الفئات</option>' + 
        window.CATEGORIES.map(cat => 
            `<option value="${cat.id}" ${cat.id === window.currentCategoryId ? 'selected' : ''}>${cat.name}</option>`
        ).join('');
}

/**
 * تحديث شريط الفئات
 */
function updateCategoriesBar() {
    const categoriesBar = document.getElementById('categoriesBar');
    if (!categoriesBar) {
        console.warn('⚠️ categoriesBar غير موجود في الصفحة');
        return;
    }
    
    if (window.CATEGORIES.length === 0) {
        categoriesBar.innerHTML = '<div class="no-categories-message" style="text-align: center; padding: 20px; color: #999;">لا توجد فئات متاحة حالياً</div>';
        return;
    }
    
    categoriesBar.innerHTML = window.CATEGORIES.map(category => `
        <button class="category-btn ${category.id === window.currentCategoryId ? 'active' : ''}" 
                data-category-id="${category.id}" 
                onclick="window.filterByCategory('${category.id}')"
                style="
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 30px;
                    background: ${category.id === window.currentCategoryId ? 'var(--secondary-color)' : '#f5f5f5'};
                    color: ${category.id === window.currentCategoryId ? 'white' : '#333'};
                    font-family: 'Cairo';
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    white-space: nowrap;
                    border: 1px solid ${category.id === window.currentCategoryId ? 'var(--secondary-color)' : '#ddd'};
                ">
            <i class="${category.icon}" style="color: ${category.id === window.currentCategoryId ? 'white' : (category.color || '#c9a24d')};"></i>
            <span>${category.name}</span>
        </button>
    `).join('');
}

/**
 * تحديث جميع أزرار الفئات في الموقع
 */
function updateAllCategoryButtons() {
    // تحديث حالة الأزرار النشطة
    document.querySelectorAll('.category-btn').forEach(btn => {
        const catId = btn.getAttribute('data-category-id');
        const isActive = catId === window.currentCategoryId;
        
        btn.classList.toggle('active', isActive);
        
        if (isActive) {
            btn.style.background = 'var(--secondary-color)';
            btn.style.color = 'white';
            const icon = btn.querySelector('i');
            if (icon) icon.style.color = 'white';
        } else {
            btn.style.background = '#f5f5f5';
            btn.style.color = '#333';
            const category = window.CATEGORIES.find(c => c.id === catId);
            if (category) {
                const icon = btn.querySelector('i');
                if (icon) icon.style.color = category.color || '#c9a24d';
            }
        }
    });
}

/**
 * التصفية حسب الفئة - النسخة المحسنة
 */
window.filterByCategory = function(categoryId) {
    console.log(`📁 تصفية حسب الفئة: ${categoryId || 'الكل'}`);
    
    // تحديث الفئة الحالية
    window.currentCategoryId = categoryId || '';
    
    // تحديث القائمة المنسدلة
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.value = window.currentCategoryId;
    }
    
    // تحديث أزرار الفئات
    updateAllCategoryButtons();
    updateCategoriesBar();
    
    // إعادة تعيين حالة المنتجات بالكامل
    if (typeof window.resetProductsState === 'function') {
        window.resetProductsState();
    }
    
    // تحميل المنتجات من جديد مع الفئة المحددة
    if (typeof window.loadProducts === 'function') {
        // تأخير بسيط لضمان تحديث الحالة
        setTimeout(() => {
            window.loadProducts(false);
        }, 50);
    }
    
    // التأكد من أننا في قسم المنتجات
    const currentSection = document.querySelector('.section.active');
    if (!currentSection || currentSection.id !== 'products') {
        if (typeof window.showSection === 'function') {
            window.showSection('products');
        }
    }
};

/**
 * الحصول على اسم الفئة بالعربية من معرفها
 */
window.getCategoryName = function(categoryId) {
    if (!categoryId) return 'جميع المنتجات';
    const category = window.CATEGORIES.find(c => c.id === categoryId);
    return category ? category.name : 'فئة';
};

/**
 * الحصول على معرف الفئة من اسمها (للتوافق مع المنتجات القديمة)
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
    return window.CATEGORIES.length > 0;
};

/**
 * الحصول على جميع الفئات
 */
window.getCategories = function() {
    return window.CATEGORIES;
};

/**
 * الحصول على الفئة النشطة حالياً
 */
window.getCurrentCategory = function() {
    if (!window.currentCategoryId) return null;
    return window.CATEGORIES.find(c => c.id === window.currentCategoryId);
};

/**
 * عرض صفحة فئة محددة
 */
window.showCategoryPage = function(categoryId) {
    const category = window.CATEGORIES.find(c => c.id === categoryId);
    if (!category) {
        console.warn('⚠️ الفئة غير موجودة:', categoryId);
        return;
    }
    
    // تطبيق فلتر الفئة
    window.filterByCategory(categoryId);
    
    // تحديث عنوان الصفحة
    document.title = `${category.name} - ${window.siteSettings?.storeName || 'المتجر'}`;
};

// ======================== إضافة CSS للفئات ========================

const categoryStyle = document.createElement('style');
categoryStyle.textContent = `
    /* تحسين شريط الفئات */
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
    
    .categories-container::-webkit-scrollbar-thumb {
        background: var(--secondary-color);
        border-radius: 4px;
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
        font-family: 'Cairo';
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s ease;
        white-space: nowrap;
        border: 1px solid transparent;
    }
    
    .category-btn:hover {
        background: #e8e8e8;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    
    .category-btn.active {
        background: var(--secondary-color);
        color: white;
        border-color: var(--secondary-color);
    }
    
    .category-btn.active i {
        color: white !important;
    }
    
    .category-btn i {
        transition: color 0.3s ease;
        font-size: 14px;
    }
    
    /* رسالة عدم وجود فئات */
    .no-categories-message {
        text-align: center;
        padding: 40px 20px;
        background: #f9f9f9;
        border-radius: 12px;
        border: 1px dashed #ddd;
        margin: 20px 0;
    }
    
    .no-categories-message i {
        font-size: 48px;
        color: #ccc;
        margin-bottom: 15px;
    }
    
    .no-categories-message h3 {
        color: #666;
        margin-bottom: 10px;
    }
    
    .no-categories-message p {
        color: #999;
        font-size: 14px;
    }
`;
document.head.appendChild(categoryStyle);

// ======================== التهيئة والمراقبة ========================

/**
 * تهيئة نظام الفئات
 */
function initializeCategoriesSystem() {
    console.log('🏷️ تهيئة نظام الفئات...');
    
    // إنشاء شريط الفئات إذا لم يكن موجوداً
    const productsSection = document.getElementById('products');
    if (productsSection) {
        let categoriesBar = document.getElementById('categoriesBar');
        if (!categoriesBar) {
            categoriesBar = document.createElement('div');
            categoriesBar.id = 'categoriesBar';
            categoriesBar.className = 'categories-container';
            
            const productsHeader = productsSection.querySelector('.products-header');
            if (productsHeader) {
                productsHeader.insertBefore(categoriesBar, productsHeader.firstChild);
            } else {
                productsSection.insertBefore(categoriesBar, productsSection.firstChild);
            }
            console.log('✅ تم إنشاء شريط الفئات');
        }
    }
    
    // تحميل الفئات من Firebase
    loadCategoriesFromFirebase();
}

// ======================== التصدير للاستخدام العام ========================

window.CATEGORIES = window.CATEGORIES || [];
window.loadCategoriesFromFirebase = loadCategoriesFromFirebase;
window.filterByCategory = window.filterByCategory;
window.getCategoryName = window.getCategoryName;
window.getCategoryIdByName = window.getCategoryIdByName;
window.getCategoryIcon = window.getCategoryIcon;
window.getCategoryColor = window.getCategoryColor;
window.hasCategories = window.hasCategories;
window.getCategories = window.getCategories;
window.getCurrentCategory = window.getCurrentCategory;
window.showCategoryPage = window.showCategoryPage;
window.updateCategoryFilter = updateCategoryFilter;
window.updateCategoriesBar = updateCategoriesBar;
window.updateAllCategoryButtons = updateAllCategoryButtons;
window.initializeCategoriesSystem = initializeCategoriesSystem;
window.loadCategoriesFromFirebase = loadCategoriesFromFirebase;
window.displayEmptyCategoriesMessage = displayEmptyCategoriesMessage;
window.renderCategoriesUI = renderCategoriesUI;

// ======================== التهيئة عند تحميل الصفحة ========================

document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 جاري تهيئة نظام الفئات...');
    setTimeout(() => {
        initializeCategoriesSystem();
    }, 500);
});

window.addEventListener('firebase-ready', () => {
    console.log('🔥 Firebase ready - جاري تحميل الفئات...');
    loadCategoriesFromFirebase();
});

console.log('✅ categories-system.js المحسن والمصحح (نسخة مصححة) جاهز');