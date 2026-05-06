/**
 * users.js - قسم إدارة المستخدمين (نسخة مصلحة)
 */

let allUsers = [];
let lastUserDoc = null;
let hasMoreUsers = true;
let isLoadingUsers = false;
const USERS_PER_PAGE = 8;
let usersObserver = null;

// ==================== تحميل المستخدمين ====================

async function loadUsers(isNextPage = false) {
    if (!window.checkAdmin()) return;
    if (isLoadingUsers) return;
    
    const searchInput = document.getElementById('usersSearchInput');
    const statusFilter = document.getElementById('usersStatusFilter');
    
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const filterStatus = statusFilter ? statusFilter.value : '';

    if (!isNextPage) {
        allUsers = [];
        lastUserDoc = null;
        hasMoreUsers = true;
        const tbody = document.getElementById('usersBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">جاري التحميل...</td></tr>';
        }
    }

    if (!hasMoreUsers && isNextPage) return;

    isLoadingUsers = true;
    try {
        console.log('👥 جاري تحميل المستخدمين...');
        const { db, firebaseModules } = window;
        
        if (!db || !firebaseModules) {
            console.error('❌ Firebase not initialized');
            return;
        }

        let constraints = [firebaseModules.collection(db, 'users')];

        if (filterStatus) {
            constraints.push(firebaseModules.where('isActive', '==', filterStatus === 'active'));
        }

        constraints.push(firebaseModules.orderBy('createdAt', 'desc'));

        if (isNextPage && lastUserDoc) {
            constraints.push(firebaseModules.startAfter(lastUserDoc));
        }
        
        constraints.push(firebaseModules.limit(USERS_PER_PAGE));
        
        const q = firebaseModules.query(...constraints);
        const snapshot = await firebaseModules.getDocs(q);
        
        if (snapshot.empty) {
            hasMoreUsers = false;
            if (!isNextPage) displayUsers();
            return;
        }

        lastUserDoc = snapshot.docs[snapshot.docs.length - 1];
        hasMoreUsers = snapshot.docs.length === USERS_PER_PAGE;

        const newUsers = [];
        snapshot.forEach(doc => {
            newUsers.push({ id: doc.id, ...doc.data() });
        });

        allUsers = [...allUsers, ...newUsers];
        window.allUsers = allUsers;
        
        // ✅ إصلاح: تمرير isNextPage لدعم التحميل الإضافي
        displayUsers(isNextPage);
        
        if (!isNextPage) setupUsersInfiniteScroll();
        
        console.log(`✅ تم تحميل ${newUsers.length} مستخدم إضافي`);
    } catch (error) {
        console.error('❌ خطأ في تحميل المستخدمين:', error);
        ErrorHandler.handle(error, 'loadUsers');
        if (window.adminUtils) {
            window.adminUtils.showToast('فشل تحميل المستخدمين', 'error');
        }
    } finally {
        isLoadingUsers = false;
    }
}

function setupUsersInfiniteScroll() {
    const sentinel = document.getElementById('usersScrollSentinel');
    if (!sentinel) return;

    if (usersObserver) {
        usersObserver.disconnect();
        usersObserver = null;
    }

    usersObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreUsers && !isLoadingUsers) {
            loadUsers(true);
        }
    }, { threshold: 0.1 });

    usersObserver.observe(sentinel);
}

// ✅ إصلاح: دعم التحميل الإضافي
function displayUsers(append = false) {
    const tbody = document.getElementById('usersBody');
    if (!tbody) return;
    
    if (allUsers.length === 0 && !append) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">لا توجد نتائج تطابق البحث</td></tr>';
        return;
    }

    const html = allUsers.map(user => {
        const safeName = window.adminUtils.escapeHTML(user.displayName || user.name || 'بدون اسم');
        const safeEmail = window.adminUtils.escapeHTML(user.email || '---');
        const safePhone = window.adminUtils.escapeHTML(user.phone || '---');
        const totalOrders = user.totalOrders || 0;
        const totalSpent = user.totalSpent || 0;

        return `
        <tr class="compact-row">
            <td data-label="الاسم" style="font-weight: 600; font-size: 12px;">${safeName}</td>
            <td data-label="البريد" style="font-size: 11px; max-width: 150px; overflow: hidden; text-overflow: ellipsis;">${safeEmail}</td>
            <td data-label="الهاتف" style="font-size: 11px;">${safePhone}</td>
            <td data-label="الطلبات" style="font-size: 11px;">${totalOrders}</td>
            <td data-label="الإنفاق" style="font-weight: bold; color: var(--primary-color);">${window.adminUtils.formatNumber(totalSpent)}</td>
            <td data-label="الحالة">
                <span class="badge badge-${user.isActive !== false ? 'success' : 'danger'}" style="padding: 1px 6px; font-size: 9px; border-radius: 4px;">
                    ${user.isActive !== false ? 'نشط' : 'معطل'}
                </span>
            </td>
            <td data-label="التاريخ" style="font-size: 10px; color: #666;">${window.adminUtils.formatDate(user.createdAt)}</td>
            <td data-label="الإجراءات">
                <div class="action-buttons-compact">
                    <button class="btn btn-sm ${user.isActive !== false ? 'btn-danger' : 'btn-success'}" onclick="window.toggleUserStatus('${user.id}', ${user.isActive !== false})" title="${user.isActive !== false ? 'تعطيل' : 'تفعيل'}">
                        <i class="fas fa-${user.isActive !== false ? 'user-slash' : 'user-check'}"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="window.makeAdmin('${user.id}')" title="ترقية لأدمن">
                        <i class="fas fa-user-shield"></i>
                    </button>
                    <button class="btn btn-sm btn-info" onclick="window.viewUser('${user.id}')" title="عرض التفاصيل">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');

    // ✅ إصلاح: دعم الإضافة للتحميل اللانهائي
    if (append) {
        tbody.insertAdjacentHTML('beforeend', html);
    } else {
        tbody.innerHTML = html;
    }
}

function applyUsersFilter() {
    loadUsers(false);
}

function resetUsersFilter() {
    const searchInput = document.getElementById('usersSearchInput');
    const statusFilter = document.getElementById('usersStatusFilter');
    
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    
    loadUsers(false);
}

// ✅ تبديل حالة المستخدم
window.toggleUserStatus = async function(userId, currentStatus) {
    if (!window.checkAdmin()) return;
    
    ModalManager.confirm(`هل أنت متأكد من ${currentStatus ? 'تعطيل' : 'تفعيل'} هذا المستخدم؟`, 'تأكيد', async () => {
        try {
            const { db, firebaseModules } = window;
            await firebaseModules.updateDoc(firebaseModules.doc(db, 'users', userId), {
                isActive: !currentStatus
            });
            window.adminUtils.showToast('✅ تم تحديث حالة المستخدم', 'success');
            
            const user = allUsers.find(u => u.id === userId);
            if (user) user.isActive = !currentStatus;
            displayUsers(false);
        } catch (error) {
            console.error('❌ خطأ في تحديث حالة المستخدم:', error);
            window.adminUtils.showToast('حدث خطأ في تحديث الحالة', 'error');
            ErrorHandler.handle(error, 'toggleUserStatus');
        }
    });
};

// ✅ ترقية مستخدم لمسؤول
window.makeAdmin = async function(userId) {
    if (!window.checkAdmin()) {
        if (window.SecurityCore) window.SecurityCore.logSecurityEvent('unauthorized_admin_promotion_attempt', { targetUserId: userId });
        return;
    }
    
    ModalManager.confirm('هل أنت متأكد من ترقية هذا المستخدم ليكون مسؤولاً (Admin)؟', 'تأكيد أمني', async () => {
        try {
            const { db, firebaseModules } = window;
            
            const currentUser = window.auth?.currentUser;
            if (!currentUser) throw new Error('يجب تسجيل الدخول');

            await firebaseModules.updateDoc(firebaseModules.doc(db, 'users', userId), {
                role: 'admin',
                isAdmin: true,
                promotedBy: currentUser.uid,
                promotedAt: firebaseModules.serverTimestamp()
            });
            
            window.adminUtils.showToast('✅ تمت الترقية بنجاح', 'success');
            if (window.SecurityCore) window.SecurityCore.logSecurityEvent('admin_promotion_success', { targetUserId: userId, by: currentUser.uid });
            await loadUsers(false);
        } catch (error) {
            console.error('❌ خطأ في ترقية المستخدم:', error);
            const errorMsg = error.code === 'permission-denied' ? 'ليس لديك صلاحية لتنفيذ هذا الإجراء' : 'حدث خطأ في الترقية';
            window.adminUtils.showToast(errorMsg, 'error');
            ErrorHandler.handle(error, 'makeAdmin');
        }
    });
};

// ✅ عرض تفاصيل المستخدم
window.viewUser = function(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    const content = `
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="${user.photoURL || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'}" 
                 style="width: 100px; height: 100px; border-radius: 50%; border: 3px solid var(--primary-color);">
        </div>
        <table class="details-table" style="width: 100%;">
            <tr><th>الاسم:</th><td>${window.adminUtils.escapeHTML(user.displayName || user.name || '---')}</td></tr>
            <tr><th>البريد:</th><td>${window.adminUtils.escapeHTML(user.email || '---')}</td></tr>
            <tr><th>الهاتف:</th><td>${window.adminUtils.escapeHTML(user.phone || '---')}</td></tr>
            <tr><th>العنوان:</th><td>${window.adminUtils.escapeHTML(user.address || '---')}</td></tr>
            <tr><th>عدد الطلبات:</th><td>${user.totalOrders || 0}</td></tr>
            <tr><th>إجمالي المشتريات:</th><td>${window.adminUtils.formatNumber(user.totalSpent || 0)} SDG</td></tr>
            <tr><th>الحالة:</th><td><span class="badge badge-${user.isActive !== false ? 'success' : 'danger'}">${user.isActive !== false ? 'نشط' : 'معطل'}</span></td></tr>
            <tr><th>الدور:</th><td>${user.isAdmin ? 'مدير' : 'مستخدم'}</td></tr>
            <tr><th>تاريخ التسجيل:</th><td>${window.adminUtils.formatDate(user.createdAt)}</td></tr>
            <tr><th>آخر تحديث:</th><td>${window.adminUtils.formatDate(user.updatedAt)}</td></tr>
        </table>
    `;

    ModalManager.open({
        id: 'viewUserModal',
        title: `بيانات المستخدم: ${window.adminUtils.escapeHTML(user.displayName || user.name || '---')}`,
        content: content,
        size: 'medium',
        buttons: [
            { text: 'إغلاق', class: 'btn-secondary', onClick: () => ModalManager.close('viewUserModal') }
        ]
    });
};

// ✅ البحث المباشر
window.filterUsers = function() {
    const searchTerm = document.getElementById('userSearch')?.value.toLowerCase() || '';
    const filtered = allUsers.filter(user => 
        (user.displayName || user.name || '').toLowerCase().includes(searchTerm) || 
        (user.email || '').toLowerCase().includes(searchTerm) || 
        (user.phone || '').includes(searchTerm)
    );
    
    const tbody = document.getElementById('usersBody');
    if (!tbody) return;
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">لا توجد نتائج</td></tr>';
        return;
    }

    // استخدام filtered بدلاً من allUsers للعرض المؤقت
    const tempAllUsers = allUsers;
    allUsers = filtered;
    displayUsers(false);
    allUsers = tempAllUsers;
};

// ==================== التهيئة ====================

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('usersBody')) {
        loadUsers();
    }
});

// ✅ تعريض الدوال
window.loadUsers = loadUsers;
window.toggleUserStatus = window.toggleUserStatus;
window.makeAdmin = window.makeAdmin;
window.viewUser = window.viewUser;
window.filterUsers = window.filterUsers;
window.applyUsersFilter = applyUsersFilter;
window.resetUsersFilter = resetUsersFilter;