/**
 * users.js - قسم إدارة المستخدمين (نسخة محسنة مع التحميل بالتمرير)
 */

let allUsers = [];
let lastUserDoc = null;
let hasMoreUsers = true;
let isLoadingUsers = false;
const USERS_PER_PAGE = 8;
let usersObserver = null;

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

        let constraints = [
            firebaseModules.collection(db, 'users')
        ];

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

function displayUsers(append = false) {
    const tbody = document.getElementById('usersBody');
    if (!tbody) return;
    
    if (allUsers.length === 0 && !append) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">لا توجد نتائج تطابق البحث</td></tr>';
        return;
    }

    tbody.innerHTML = allUsers.map(user => {
        const safeName = adminUtils.escapeHTML(user.displayName || user.name || 'بدون اسم');
        const safeEmail = adminUtils.escapeHTML(user.email || '---');
        const safePhone = adminUtils.escapeHTML(user.phone || '---');
        const totalOrders = user.totalOrders || 0;
        const totalSpent = user.totalSpent || 0;

        return `
        <tr class="compact-row">
            <td data-label="الاسم" style="font-weight: 600; font-size: 12px;">${safeName}</td>
            <td data-label="البريد" style="font-size: 11px; max-width: 150px; overflow: hidden; text-overflow: ellipsis;">${safeEmail}</td>
            <td data-label="الهاتف" style="font-size: 11px;">${safePhone}</td>
            <td data-label="الطلبات" style="font-size: 11px;">${totalOrders}</td>
            <td data-label="الإنفاق" style="font-weight: bold; color: var(--primary-color);">${adminUtils.formatNumber(totalSpent)}</td>
            <td data-label="الحالة">
                <span class="badge badge-${user.isActive !== false ? 'success' : 'danger'}" style="padding: 1px 6px; font-size: 9px; border-radius: 4px;">
                    ${user.isActive !== false ? 'نشط' : 'معطل'}
                </span>
            </td>
            <td data-label="التاريخ" style="font-size: 10px; color: #666;">${adminUtils.formatDate(user.createdAt)}</td>
            <td data-label="الإجراءات">
                <div class="action-buttons-compact">
                    <button class="btn btn-sm ${user.isActive !== false ? 'btn-danger' : 'btn-success'}" onclick="toggleUserStatus('${user.id}', ${user.isActive !== false})" title="${user.isActive !== false ? 'تعطيل' : 'تفعيل'}">
                        <i class="fas fa-${user.isActive !== false ? 'user-slash' : 'user-check'}"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="makeAdmin('${user.id}')" title="ترقية لأدمن">
                        <i class="fas fa-user-shield"></i>
                    </button>
                    <button class="btn btn-sm btn-info" onclick="viewUser('${user.id}')" title="عرض التفاصيل">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');
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

async function toggleUserStatus(userId, currentStatus) {
    if (!window.checkAdmin()) return;
    
    ModalManager.confirm(`هل أنت متأكد من ${currentStatus ? 'تعطيل' : 'تفعيل'} هذا المستخدم؟`, 'تأكيد', async () => {
        try {
            const { db, firebaseModules } = window;
            await firebaseModules.updateDoc(firebaseModules.doc(db, 'users', userId), {
                isActive: !currentStatus
            });
            adminUtils.showToast('✅ تم تحديث حالة المستخدم', 'success');
            
            const user = allUsers.find(u => u.id === userId);
            if (user) user.isActive = !currentStatus;
            displayUsers();
        } catch (error) {
            console.error('❌ خطأ في تحديث حالة المستخدم:', error);
            adminUtils.showToast('حدث خطأ في تحديث الحالة', 'error');
            ErrorHandler.handle(error, 'toggleUserStatus');
        }
    });
}

/**
 * ترقية مستخدم لمسؤول
 * تنبيه أمني: هذه العملية يجب أن تكون محمية بقواعد أمان Firestore (Server-side)
 * بحيث لا يمكن تنفيذها إلا من قبل مسؤول مسجل فعلياً.
 */
async function makeAdmin(userId) {
    if (!window.checkAdmin()) {
        if (window.SecurityCore) window.SecurityCore.logSecurityEvent('unauthorized_admin_promotion_attempt', { targetUserId: userId });
        return;
    }
    
    ModalManager.confirm('هل أنت متأكد من ترقية هذا المستخدم ليكون مسؤولاً (Admin)؟ ستحتاج لقواعد أمان Firestore لتنفيذ هذا الإجراء بأمان.', 'تأكيد أمني', async () => {
        try {
            const { db, firebaseModules } = window;
            
            // التحقق الإضافي من الصلاحية قبل الإرسال
            const currentUser = window.auth.currentUser;
            if (!currentUser) throw new Error('يجب تسجيل الدخول');

            await firebaseModules.updateDoc(firebaseModules.doc(db, 'users', userId), {
                role: 'admin',
                isAdmin: true,
                promotedBy: currentUser.uid,
                promotedAt: firebaseModules.serverTimestamp()
            });
            
            adminUtils.showToast('✅ تمت الترقية بنجاح', 'success');
            if (window.SecurityCore) window.SecurityCore.logSecurityEvent('admin_promotion_success', { targetUserId: userId, by: currentUser.uid });
            await loadUsers();
        } catch (error) {
            console.error('❌ خطأ في ترقية المستخدم:', error);
            const errorMsg = error.code === 'permission-denied' ? 'ليس لديك صلاحية لتنفيذ هذا الإجراء (Server-side Error)' : 'حدث خطأ في الترقية';
            adminUtils.showToast(errorMsg, 'error');
            ErrorHandler.handle(error, 'makeAdmin');
        }
    });
}

function viewUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    const safeName = adminUtils.escapeHTML(user.displayName || user.name || '---');
    const safeEmail = adminUtils.escapeHTML(user.email || '---');
    const safePhone = adminUtils.escapeHTML(user.phone || '---');
    const safeAddress = adminUtils.escapeHTML(user.address || '---');

    const content = `
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="${user.photoURL || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'}" 
                 style="width: 100px; height: 100px; border-radius: 50%; border: 3px solid var(--primary-color);">
        </div>
        <table class="details-table" style="width: 100%;">
            <tr><th>الاسم:</th><td>${safeName}</td></tr>
            <tr><th>البريد:</th><td>${safeEmail}</td></tr>
            <tr><th>الهاتف:</th><td>${safePhone}</td></tr>
            <tr><th>العنوان:</th><td>${safeAddress}</td></tr>
            <tr><th>عدد الطلبات:</th><td>${user.totalOrders || 0}</td></tr>
            <tr><th>إجمالي المشتريات:</th><td>${adminUtils.formatNumber(user.totalSpent || 0)} SDG</td></tr>
            <tr><th>الحالة:</th><td><span class="badge badge-${user.isActive !== false ? 'success' : 'danger'}">${user.isActive !== false ? 'نشط' : 'معطل'}</span></td></tr>
            <tr><th>الدور:</th><td>${user.isAdmin ? 'مدير' : 'مستخدم'}</td></tr>
            <tr><th>تاريخ التسجيل:</th><td>${adminUtils.formatDate(user.createdAt)}</td></tr>
            <tr><th>آخر تحديث:</th><td>${adminUtils.formatDate(user.updatedAt)}</td></tr>
        </table>
    `;

    ModalManager.open({
        id: 'viewUserModal',
        title: `بيانات المستخدم: ${safeName}`,
        content: content,
        size: 'medium',
        buttons: [
            { text: 'إغلاق', class: 'btn-secondary' }
        ]
    });
}

function filterUsers() {
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

    tbody.innerHTML = filtered.map(user => {
        const safeName = adminUtils.escapeHTML(user.displayName || user.name || 'بدون اسم');
        const safeEmail = adminUtils.escapeHTML(user.email || '---');
        const safePhone = adminUtils.escapeHTML(user.phone || '---');
        return `
        <tr class="compact-row">
            <td data-label="الاسم">${safeName}</td>
            <td data-label="البريد">${safeEmail}</td>
            <td data-label="الهاتف">${safePhone}</td>
            <td data-label="الطلبات">${user.totalOrders || 0}</td>
            <td data-label="الإنفاق">${adminUtils.formatNumber(user.totalSpent || 0)} SDG</td>
            <td data-label="الحالة"><span class="badge badge-${user.isActive !== false ? 'success' : 'danger'}">${user.isActive !== false ? 'نشط' : 'معطل'}</span></td>
            <td data-label="التاريخ">${adminUtils.formatDate(user.createdAt)}</td>
            <td data-label="الإجراءات">
                <div class="action-buttons-compact">
                    <button class="btn btn-sm ${user.isActive !== false ? 'btn-danger' : 'btn-success'}" onclick="toggleUserStatus('${user.id}', ${user.isActive !== false})">
                        <i class="fas fa-${user.isActive !== false ? 'user-slash' : 'user-check'}"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="makeAdmin('${user.id}')">
                        <i class="fas fa-user-shield"></i>
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');
}

window.loadUsers = loadUsers;
window.toggleUserStatus = toggleUserStatus;
window.makeAdmin = makeAdmin;
window.viewUser = viewUser;
window.filterUsers = filterUsers;
window.applyUsersFilter = applyUsersFilter;
window.resetUsersFilter = resetUsersFilter;