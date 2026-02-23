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
window.openCategoryModal = function() {
    const modalHtml = `
        <div id="categoryModal" class="modal-overlay active">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>إضافة فئة جديدة</h3>
                    <button onclick="closeModal('categoryModal')" class="btn-close"><i class="fas fa-times"></i></button>
                </div>
                <form id="categoryForm" onsubmit="saveCategory(event)">
                    <div class="form-group">
                        <label>اسم الفئة</label>
                        <input type="text" id="catName" required>
                    </div>
                    <div class="form-group">
                        <label>الاسم اللطيف (Slug)</label>
                        <input type="text" id="catSlug" required>
                    </div>
                    <div class="form-group">
                        <label>صورة الفئة</label>
                        <input type="file" id="catImageFile" accept="image/*" onchange="previewImageWithValidation(event, 'catImagePreview')">
                        <img id="catImagePreview" style="max-width: 100px; margin-top: 10px; display: none;">
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">حفظ</button>
                        <button type="button" class="btn btn-secondary" onclick="closeModal('categoryModal')" style="flex: 1;">إلغاء</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.saveCategory = async function(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerText = 'جاري الحفظ...';

    try {
        const name = document.getElementById('catName').value;
        const slug = document.getElementById('catSlug').value;
        const imageFile = document.getElementById('catImageFile').files[0];

        let imageUrl = '';
        if (imageFile) {
            imageUrl = await window.uploadImageWithValidation(imageFile, 'categories');
        }

        await window.firebaseModules.addDoc(window.firebaseModules.collection(window.db, 'categories'), {
            name,
            slug,
            image: imageUrl,
            createdAt: window.firebaseModules.serverTimestamp()
        });

        window.adminUtils.showToast('تم إضافة الفئة بنجاح', 'success');
        closeModal('categoryModal');
        loadCategories();
    } catch (error) {
        console.error('❌ خطأ في حفظ الفئة:', error);
        window.adminUtils.showToast('حدث خطأ أثناء الحفظ', 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = 'حفظ';
    }
};
