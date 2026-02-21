/**
 * categories.js - إدارة الفئات في لوحة التحكم
 */

async function loadCategories() {
    try {
        const db = window.db;
        const firebaseModules = window.firebaseModules;
        if (!db || !firebaseModules) return;

        const snapshot = await firebaseModules.getDocs(firebaseModules.collection(db, 'categories'));
        const categories = [];
        snapshot.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() });
        });

        window.allCategories = categories;
        displayCategories();
        updateCategoryFilters();
    } catch (error) {
        console.error('❌ خطأ في تحميل الفئات:', error);
    }
}

function displayCategories() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;

    if (window.allCategories.length === 0) {
        grid.innerHTML = '<p style="padding: 20px;">لا توجد فئات حالياً</p>';
        return;
    }

    grid.innerHTML = window.allCategories.map(cat => `
        <div class="admin-card" style="padding: 15px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <img src="${cat.image || 'https://via.placeholder.com/50'}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;">
                <div>
                    <h4 style="margin: 0;">${cat.name}</h4>
                    <small style="color: #666;">${cat.slug || ''}</small>
                </div>
            </div>
            <div class="action-buttons-compact">
                <button class="btn btn-sm btn-danger" onclick="deleteCategory('${cat.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function updateCategoryFilters() {
    const filters = ['productsCategoryFilter'];
    filters.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">جميع الفئات</option>' + 
                window.allCategories.map(cat => `<option value="${cat.id}" ${cat.id === currentValue ? 'selected' : ''}>${cat.name}</option>`).join('');
        }
    });
}

async function deleteCategory(id) {
    if (!confirm('هل أنت متأكد من حذف هذه الفئة؟')) return;
    try {
        await window.firebaseModules.deleteDoc(window.firebaseModules.doc(window.db, 'categories', id));
        window.adminUtils.showToast('تم حذف الفئة بنجاح', 'success');
        loadCategories();
    } catch (error) {
        console.error('❌ خطأ في حذف الفئة:', error);
    }
}

window.loadCategories = loadCategories;
window.deleteCategory = deleteCategory;
window.openCategoryModal = () => alert('سيتم إضافة نموذج إضافة فئة قريباً');
