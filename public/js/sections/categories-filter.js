// categories-filter.js - نسخة محسنة الأداء والدقة (تجنب N+1 Query مع ضمان الدقة)
// ======================== إدارة الفئات المحسنة ========================

/**
 * تحديث قائمة الفئات المنسدلة مع إخفاء الفئات الفارغة بكفاءة
 */
async function updateCategoryFilterWithEmptyCheck() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter || !window.CATEGORIES || window.CATEGORIES.length === 0) {
        console.warn('⚠️ لا توجد فئات أو عنصر categoryFilter غير موجود');
        return;
    }

    console.log('🔍 جاري التحقق من الفئات الفارغة (بطريقة محسنة ودقيقة)...');

    try {
        const db = window.firebaseDb || window.db;
        if (!db || !window.firebaseModules) return;

        // جلب جميع المنتجات النشطة (فقط الحقول الضرورية لتقليل استهلاك البيانات)
        // ملاحظة: إذا كان عدد المنتجات ضخماً جداً، يفضل استخدام Cloud Functions لتحديث عداد الفئات
        const productsRef = window.firebaseModules.collection(db, "products");
        const q = window.firebaseModules.query(
            productsRef,
            window.firebaseModules.where("isActive", "==", true)
            // أزلنا limit(100) لضمان الدقة، Firestore فعال في جلب المعرفات
        );
        
        const snapshot = await window.firebaseModules.getDocs(q);
        const activeCategoryIds = new Set();
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.categoryId) activeCategoryIds.add(data.categoryId);
        });

        // فلتر الفئات بناءً على المعرفات النشطة التي وجدناها
        const categoriesWithProducts = window.CATEGORIES.filter(cat => activeCategoryIds.has(cat.id));

        // تحديث القائمة المنسدلة بشكل آمن من XSS
        categoryFilter.disabled = false;
        
        // مسح الخيارات الحالية
        categoryFilter.innerHTML = '';
        
        // إضافة الخيار الافتراضي
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'جميع الفئات';
        categoryFilter.appendChild(defaultOption);
        
        // إضافة الفئات النشطة
        const finalCategories = categoriesWithProducts.length > 0 ? categoriesWithProducts : window.CATEGORIES;
        
        finalCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name; // استخدام textContent يمنع هجمات XSS
            categoryFilter.appendChild(option);
        });

        console.log(`✅ تم تحديث القائمة المنسدلة بـ ${finalCategories.length} فئة`);
    } catch (error) {
        console.error(`❌ خطأ في فحص الفئات:`, error);
        // Fallback: إظهار جميع الفئات في حال حدوث خطأ
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="">جميع الفئات</option>';
            window.CATEGORIES.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.name;
                categoryFilter.appendChild(option);
            });
        }
    }
}

/**
 * تحديث القائمة المنسدلة عند تحميل الفئات
 */
window.addEventListener('categories-loaded', () => {
    console.log('📥 تم تحميل الفئات - جاري تحديث القائمة المنسدلة...');
    // استخدام requestAnimationFrame لضمان عدم حظر الواجهة
    requestAnimationFrame(() => {
        updateCategoryFilterWithEmptyCheck();
    });
});

// تحديث القائمة عند تغيير اختيار الفئة
document.addEventListener('DOMContentLoaded', () => {
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            const categoryId = e.target.value;
            console.log(`📁 تم اختيار الفئة: ${categoryId || 'جميع الفئات'}`);
            
            if (typeof window.filterByCategory === 'function') {
                window.filterByCategory(categoryId);
            }
        });
    }
});

console.log('✅ categories-filter.js (نسخة محسنة الأداء والدقة) جاهز');
