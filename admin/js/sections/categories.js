/**
 * categories.js - إدارة الفئات في لوحة التحكم (نسخة محسنة)
 */

let allCategories = [];
let lastCategoryDoc = null;
let hasMoreCategories = true;
let isLoadingCategories = false;
const CATEGORIES_PER_PAGE = 12;
let categoriesObserver = null;

// ==================== دوال التحميل والعرض ====================

async function loadCategories(isNextPage = false) {
    if (!window.checkAdmin()) return;
    if (isLoadingCategories) return;
    
    const searchInput = document.getElementById('categoriesSearchInput');
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';

    if (!isNextPage) {
        allCategories = [];
        lastCategoryDoc = null;
        hasMoreCategories = true;
        showCategoriesSkeleton();
    }

    if (!hasMoreCategories && isNextPage) return;

    isLoadingCategories = true;
    try {
        console.log('🏷️ جاري تحميل الفئات...');
        const { db, firebaseModules } = window;
        
        if (!db || !firebaseModules) {
            console.error('❌ Firebase not initialized');
            return;
        }

        let constraints = [
            firebaseModules.orderBy('createdAt', 'desc'),
            firebaseModules.limit(CATEGORIES_PER_PAGE)
        ];

        if (isNextPage && lastCategoryDoc) {
            constraints.unshift(firebaseModules.startAfter(lastCategoryDoc));
        }
        
        const q = firebaseModules.query(
            firebaseModules.collection(db, 'categories'),
            ...constraints
        );
        const snapshot = await firebaseModules.getDocs(q);
        
        if (snapshot.empty) {
            hasMoreCategories = false;
            if (!isNextPage) displayCategories();
            return;
        }

        lastCategoryDoc = snapshot.docs[snapshot.docs.length - 1];
        hasMoreCategories = snapshot.docs.length === CATEGORIES_PER_PAGE;

        const newCategories = [];
        snapshot.forEach(doc => {
            newCategories.push({ id: doc.id, ...doc.data() });
        });

        allCategories = isNextPage ? [...allCategories, ...newCategories] : newCategories;
        window.allCategories = allCategories;
        
        displayCategories(isNextPage);
        updateCategoryFilters();
        
        if (!isNextPage) setupCategoriesInfiniteScroll();
        
        console.log(`✅ تم تحميل ${newCategories.length} فئة إضافية`);
    } catch (error) {
        console.error('❌ خطأ في تحميل الفئات:', error);
        ErrorHandler.handle(error, 'loadCategories');
        if (window.adminUtils) {
            window.adminUtils.showToast('فشل تحميل الفئات', 'error');
        }
    } finally {
        isLoadingCategories = false;
    }
}

function showCategoriesSkeleton() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;
    
    grid.innerHTML = Array(6).fill(0).map(() => `
        <div class="admin-card skeleton-card" style="padding: 15px;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <div class="skeleton" style="width: 50px; height: 50px; border-radius: 8px;"></div>
                <div style="flex: 1;">
                    <div class="skeleton skeleton-text" style="width: 100px;"></div>
                    <div class="skeleton skeleton-text" style="width: 60px; margin-top: 5px;"></div>
                </div>
            </div>
        </div>
    `).join('');
}

function setupCategoriesInfiniteScroll() {
    const sentinel = document.getElementById('categoriesScrollSentinel');
    if (!sentinel) return;

    if (categoriesObserver) {
        categoriesObserver.disconnect();
        categoriesObserver = null;
    }

    categoriesObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreCategories && !isLoadingCategories) {
            sentinel.innerHTML = '<div class="loading-indicator"><div class="spinner"></div><span style="margin-right: 10px;">جاري تحميل المزيد...</span></div>';
            loadCategories(true).then(() => {
                sentinel.innerHTML = '';
            });
        }
    }, { threshold: 0.1 });

    categoriesObserver.observe(sentinel);
}

function displayCategories(append = false) {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;

    if (allCategories.length === 0 && !append) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;">لا توجد فئات حالياً</div>';
        return;
    }

    const categoriesHtml = allCategories.map(cat => {
        const safeName = adminUtils.escapeHTML(cat.name || '');
        const safeSlug = adminUtils.escapeHTML(cat.slug || '');
        const safeImage = cat.image || 'https://via.placeholder.com/50';
        return `
        <div class="admin-card category-card" data-id="${cat.id}" style="padding: 15px;">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                <img src="${safeImage}" 
                     style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; border: 1px solid #eee;"
                     onerror="this.src='https://via.placeholder.com/50'">
                <div style="flex: 1;">
                    <h4 style="margin: 0; font-size: 14px;">${safeName}</h4>
                    <small style="color: #666; font-size: 11px;">${safeSlug}</small>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f0f0f0; padding-top: 10px;">
                <span style="font-size: 11px; color: #999;">منتجات: ${cat.productsCount || 0}</span>
                <div class="action-buttons-compact">
                    <button class="btn btn-sm btn-primary" onclick="editCategory('${cat.id}')" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCategory('${cat.id}')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `}).join('');

    if (append) {
        grid.insertAdjacentHTML('beforeend', categoriesHtml);
    } else {
        grid.innerHTML = categoriesHtml;
    }
}

function updateCategoryFilters() {
    const filters = ['productsCategoryFilter', 'categoryFilter', 'prodCategory'];
    filters.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">جميع الفئات</option>' + 
                allCategories.map(cat => 
                    `<option value="${cat.id}" ${cat.id === currentValue ? 'selected' : ''}>${adminUtils.escapeHTML(cat.name)}</option>`
                ).join('');
        }
    });
}

// ==================== دوال البحث والفلترة ====================

function filterCategories() {
    const searchInput = document.getElementById('categoriesSearchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
        displayCategories(false);
        return;
    }
    
    const filtered = allCategories.filter(cat => 
        (cat.name && cat.name.toLowerCase().includes(searchTerm)) || 
        (cat.slug && cat.slug.toLowerCase().includes(searchTerm))
    );
    
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;
    
    if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;">لا توجد نتائج للبحث</div>';
        return;
    }
    
    grid.innerHTML = filtered.map(cat => {
        const safeName = adminUtils.escapeHTML(cat.name || '');
        const safeSlug = adminUtils.escapeHTML(cat.slug || '');
        const safeImage = cat.image || 'https://via.placeholder.com/50';
        return `
        <div class="admin-card category-card" data-id="${cat.id}" style="padding: 15px;">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                <img src="${safeImage}" 
                     style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; border: 1px solid #eee;"
                     onerror="this.src='https://via.placeholder.com/50'">
                <div style="flex: 1;">
                    <h4 style="margin: 0; font-size: 14px;">${safeName}</h4>
                    <small style="color: #666; font-size: 11px;">${safeSlug}</small>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f0f0f0; padding-top: 10px;">
                <span style="font-size: 11px; color: #999;">منتجات: ${cat.productsCount || 0}</span>
                <div class="action-buttons-compact">
                    <button class="btn btn-sm btn-primary" onclick="editCategory('${cat.id}')" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCategory('${cat.id}')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `}).join('');
}

function resetCategoriesFilter() {
    const searchInput = document.getElementById('categoriesSearchInput');
    if (searchInput) searchInput.value = '';
    loadCategories(false);
}

// ==================== دوال إدارة الفئات (CRUD) ====================

window.openCategoryModal = function(categoryId = null) {
    if (!window.checkAdmin()) return;
    
    const category = categoryId ? allCategories.find(c => c.id === categoryId) : null;
    
    const content = `
        <form id="categoryForm" onsubmit="saveCategory(event)">
            <input type="hidden" id="catId" value="${categoryId || ''}">
            
            <div class="form-group">
                <label>اسم الفئة <span style="color: red;">*</span></label>
                <input type="text" id="catName" value="${category ? adminUtils.escapeHTML(category.name) : ''}" required 
                       placeholder="مثال: عطور رجالية" class="form-control">
            </div>
            
            <div class="form-group">
                <label>الاسم اللطيف (Slug) <span style="color: red;">*</span></label>
                <input type="text" id="catSlug" value="${category ? adminUtils.escapeHTML(category.slug) : ''}" required 
                       placeholder="مثال: men-perfumes" class="form-control"
                       oninput="this.value = this.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')">
                <small style="color: #666; font-size: 11px;">يستخدم في الروابط: /category/men-perfumes</small>
            </div>
            
            <div class="form-group">
                <label>أيقونة الفئة (Font Awesome)</label>
                <input type="text" id="catIcon" value="${category ? (category.icon || 'fas fa-tag') : 'fas fa-tag'}" 
                       placeholder="مثال: fas fa-male" class="form-control">
                <small style="color: #666; font-size: 11px;">من مكتبة Font Awesome</small>
            </div>
            
            <div class="form-group">
                <label>لون الفئة</label>
                <input type="color" id="catColor" value="${category ? (category.color || '#c9a24d') : '#c9a24d'}" class="form-control" style="height: 40px;">
            </div>
            
            <div class="form-group">
                <label>صورة الفئة</label>
                <input type="file" id="catImageFile" accept="image/*" onchange="previewImage(event, 'catImagePreview')" class="form-control">
                <div style="margin-top: 10px; text-align: center;">
                    <img id="catImagePreview" src="${category ? (category.image || '') : ''}" 
                         style="max-width: 150px; max-height: 150px; border-radius: 8px; border: 1px solid #ddd; display: ${category && category.image ? 'block' : 'none'}; margin: 0 auto;">
                </div>
            </div>
            
            <div class="form-group">
                <label>الوصف</label>
                <textarea id="catDescription" rows="3" class="form-control">${category ? adminUtils.escapeHTML(category.description || '') : ''}</textarea>
            </div>
            
            <div class="row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="catIsActive" ${!category || category.isActive !== false ? 'checked' : ''}> 
                        فئة نشطة
                    </label>
                </div>
                <div class="form-group">
                    <label>الترتيب</label>
                    <input type="number" id="catOrder" value="${category ? (category.order || 0) : 0}" min="0" class="form-control">
                </div>
            </div>
        </form>
    `;

    ModalManager.open({
        id: 'categoryModal',
        title: categoryId ? 'تعديل فئة' : 'إضافة فئة جديدة',
        content: content,
        size: 'medium',
        buttons: [
            { text: 'حفظ', class: 'btn-primary', onClick: () => document.getElementById('categoryForm').dispatchEvent(new Event('submit')) },
            { text: 'إلغاء', class: 'btn-secondary' }
        ]
    });
};

window.editCategory = function(id) {
    if (!window.checkAdmin()) return;
    window.openCategoryModal(id);
};

// دالة رفع صورة إلى Firebase Storage
async function uploadCategoryImage(file) {
    if (!file) return '';
    
    // التحقق من نوع الملف (MIME type)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
        throw new Error('نوع الملف غير مدعوم. الأنواع المسموحة: JPEG, PNG, GIF, WEBP, SVG');
    }
    
    // التحقق من الحجم (2MB)
    if (file.size > 2 * 1024 * 1024) {
        throw new Error('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
    }
    
    const { storage, firebaseModules } = window;
    // إنشاء اسم ملف آمن وفريد
    const ext = file.type.split('/')[1] || 'jpg';
    const fileName = `categories/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const storageRef = firebaseModules.ref(storage, fileName);
    
    try {
        const snapshot = await firebaseModules.uploadBytes(storageRef, file);
        const downloadUrl = await firebaseModules.getDownloadURL(storageRef);
        return downloadUrl;
    } catch (error) {
        console.error('❌ فشل رفع الصورة:', error);
        throw error;
    }
}

window.saveCategory = async function(event) {
    if (!window.checkAdmin()) return;
    event.preventDefault();
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
    }

    try {
        const categoryId = document.getElementById('catId')?.value;
        const name = document.getElementById('catName').value.trim();
        const slug = document.getElementById('catSlug').value.trim().toLowerCase();
        const icon = document.getElementById('catIcon').value.trim();
        const color = document.getElementById('catColor').value;
        const isActive = document.getElementById('catIsActive')?.checked ?? true;
        const order = parseInt(document.getElementById('catOrder')?.value) || 0;
        const description = document.getElementById('catDescription')?.value.trim() || '';
        const imageFile = document.getElementById('catImageFile').files[0];

        if (!name || !slug) {
            adminUtils.showToast('الرجاء إدخال اسم الفئة والـ Slug', 'warning');
            return;
        }

        if (!/^[a-z0-9-]+$/.test(slug)) {
            adminUtils.showToast('الـ Slug يجب أن يحتوي على أحرف إنجليزية وأرقام وشرطات فقط', 'warning');
            return;
        }

        let imageUrl = '';
        
        if (imageFile) {
            imageUrl = await uploadCategoryImage(imageFile);
        } else if (categoryId) {
            const oldCategory = allCategories.find(c => c.id === categoryId);
            imageUrl = oldCategory?.image || '';
        }

        const categoryData = {
            name: SecurityCore.sanitizeHTML(name),
            slug,
            icon,
            color,
            isActive,
            order,
            description: SecurityCore.sanitizeHTML(description),
            image: imageUrl,
            updatedAt: window.firebaseModules.serverTimestamp()
        };

        const { db, firebaseModules } = window;

        if (categoryId) {
            await firebaseModules.updateDoc(
                firebaseModules.doc(db, 'categories', categoryId), 
                categoryData
            );
            adminUtils.showToast('✅ تم تحديث الفئة بنجاح', 'success');
        } else {
            categoryData.createdAt = firebaseModules.serverTimestamp();
            await firebaseModules.addDoc(
                firebaseModules.collection(db, 'categories'), 
                categoryData
            );
            adminUtils.showToast('✅ تم إضافة الفئة بنجاح', 'success');
        }

        ModalManager.close('categoryModal');
        // تحميل الفئات من جديد وتحديث الفلاتر في كل لوحة التحكم
        await loadCategories(false);
        if (typeof window.updateCategoryFilters === 'function') {
            window.updateCategoryFilters();
        }
        
    } catch (error) {
        console.error('❌ خطأ في حفظ الفئة:', error);
        adminUtils.showToast('حدث خطأ أثناء الحفظ: ' + error.message, 'error');
        ErrorHandler.handle(error, 'saveCategory');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'حفظ';
        }
    }
};

async function deleteCategory(id) {
    if (!window.checkAdmin()) return;
    
    ModalManager.confirm('⚠️ هل أنت متأكد من حذف هذه الفئة؟\nتنبيه: سيؤثر حذف الفئة على المنتجات المرتبطة بها.', 'تأكيد', async () => {
        try {
            const { db, firebaseModules } = window;
            
            // التحقق من وجود منتجات مرتبطة
            const productsQuery = firebaseModules.query(
                firebaseModules.collection(db, 'products'),
                firebaseModules.where('category', '==', id),
                firebaseModules.limit(1)
            );
            
            const productsSnapshot = await firebaseModules.getDocs(productsQuery);
            
            if (!productsSnapshot.empty) {
                const confirmDelete = await ModalManager.confirm(
                    'تحتوي هذه الفئة على منتجات. هل تريد المتابعة مع الحذف؟ (سيتم فقدان الربط)', 
                    'تأكيد',
                    async () => true,
                    () => false
                );
                if (!confirmDelete) return;
            }
            
            await firebaseModules.deleteDoc(firebaseModules.doc(db, 'categories', id));
            adminUtils.showToast('✅ تم حذف الفئة بنجاح', 'success');
            loadCategories(false);
        } catch (error) {
            console.error('❌ خطأ في حذف الفئة:', error);
            adminUtils.showToast('حدث خطأ أثناء الحذف: ' + error.message, 'error');
            ErrorHandler.handle(error, 'deleteCategory');
        }
    });
}

// ==================== دوال مساعدة ====================

window.previewImage = function(event, previewId) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById(previewId);
        if (preview) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
    };
    reader.readAsDataURL(file);
};

async function updateCategoriesProductsCount() {
    try {
        const { db, firebaseModules } = window;
        
        for (const category of allCategories) {
            const productsQuery = firebaseModules.query(
                firebaseModules.collection(db, 'products'),
                firebaseModules.where('category', '==', category.id)
            );
            
            const snapshot = await firebaseModules.getDocs(productsQuery);
            const count = snapshot.size;
            
            await firebaseModules.updateDoc(
                firebaseModules.doc(db, 'categories', category.id),
                { productsCount: count }
            );
            
            category.productsCount = count;
        }
        
        displayCategories(true);
    } catch (error) {
        console.error('خطأ في تحديث أعداد المنتجات:', error);
        ErrorHandler.handle(error, 'updateCategoriesProductsCount');
    }
}

// ==================== التهيئة ====================

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('categoriesGrid')) {
        loadCategories();
    }
});

window.loadCategories = loadCategories;
window.deleteCategory = deleteCategory;
window.editCategory = editCategory;
window.filterCategories = filterCategories;
window.resetCategoriesFilter = resetCategoriesFilter;
window.updateCategoriesProductsCount = updateCategoriesProductsCount;