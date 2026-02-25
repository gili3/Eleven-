/**
 * users.js - قسم إدارة المستخدمين (نسخة محسنة مع التحميل بالتمرير وتحقق الصلاحيات)
 */

let allUsers = [];
let lastUserDoc = null;
let hasMoreUsers = true;
let isLoadingUsers = false;
const USERS_PER_PAGE = 8;
let usersObserver = null;

async function loadUsers(isNextPage = false) {
    if (!window.checkAdmin()) return; // التحقق من الصلاحية
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
            tbody.innerHTML = Array(5).fill(0).map(() => `
                <tr class="skeleton-row">
                    <td><div class="skeleton skeleton-text"></div></td>
                    <td><div class="skeleton skeleton-text" style="width: 120px;"></div></td>
                    <td><div class="skeleton skeleton-text" style="width: 80px;"></div></td>
                    <td><div class="skeleton skeleton-text" style="width: 40px;"></div></td>
                    <td><div class="skeleton skeleton-text" style="width: 60px;"></div></td>
                    <td><div class="skeleton skeleton-text" style="width: 50px;"></div></td>
                    <td><div class="skeleton skeleton-text" style="width: 100px;"></div></td>
                    <td><div class="skeleton skeleton-text" style="width: 80px;"></div></td>
                </tr>
            `).join('');
        }
    }

    if (!hasMoreUsers && isNextPage) return;

    isLoadingUsers = true;
    try {
        console.log('👥 جاري تحميل المستخدمين...');
        const { db, firebaseModules } = window;
        
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
        if (window.adminUtils) window.adminUtils.showToast('فشل تحميل المستخدمين', 'error');
    } finally {
        isLoadingUsers = false;
    }
}

function setupUsersInfiniteScroll() {
    const sentinel = document.getElementById('usersScrollSentinel');
    if (!sentinel) return;

    if (usersObserver) usersObserver.disconnect();

    usersObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreUsers && !isLoadingUsers) {
            sentinel.innerHTML = '<div class="loading-indicator"><div class="spinner"></div><span style="margin-right: 10px; font-size: 13px;">جاري تحميل المزيد...</span></div>';
            loadUsers(true).then(() => {
                sentinel.innerHTML = '';
            });
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
        // تنظيف البيانات قبل العرض
        const safeName = window.SecurityCore?.sanitizeHTML(user.displayName || user.name || 'بدون اسم') || 'بدون اسم';
        const safeEmail = window.SecurityCore?.sanitizeHTML(user.email || '---') || '---';
        const safePhone = window.SecurityCore?.sanitizeHTML(user.phone || '---') || '---';
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
                    <button class="btn btn-sm ${user.isActive !== false ? 'btn-danger' : 'btn-success'}" onclick="toggleUserStatus('${user.id}', ${user.isActive !== false})" title="${user.isActive !== false ? 'تعطيل' : 'تفعيل'}">
                        <i class="fas fa-${user.isActive !== false ? 'user-slash' : 'user-check'}"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="makeAdmin('${user.id}')" title="ترقية لأدمن">
                        <i class="fas fa-user-shield"></i>
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
    if (!confirm(`هل أنت متأكد من ${currentStatus ? 'تعطيل' : 'تفعيل'} هذا المستخدم؟`)) return;
    try {
        const { db, firebaseModules } = window;
        await firebaseModules.updateDoc(firebaseModules.doc(db, 'users', userId), {
            isActive: !currentStatus
        });
        window.adminUtils.showToast('✅ تم تحديث حالة المستخدم', 'success');
        
        const user = allUsers.find(u => u.id === userId);
        if (user) user.isActive = !currentStatus;
        displayUsers();
    } catch (error) {
        console.error('❌ خطأ في تحديث حالة المستخدم:', error);
        window.adminUtils.showToast('حدث خطأ في تحديث الحالة', 'error');
    }
}

async function makeAdmin(userId) {
    if (!window.checkAdmin()) return;
    if (!confirm('هل أنت متأكد من ترقية هذا المستخدم ليكون مسؤولاً (Admin)؟')) return;
    try {
        const { db, firebaseModules } = window;
        await firebaseModules.updateDoc(firebaseModules.doc(db, 'users', userId), {
            role: 'admin',
            isAdmin: true
        });
        window.adminUtils.showToast('✅ تمت الترقية بنجاح', 'success');
        await loadUsers();
    } catch (error) {
        console.error('❌ خطأ في ترقية المستخدم:', error);
        window.adminUtils.showToast('حدث خطأ في الترقية', 'error');
    }
}

function filterUsers() {
    // هذه الدالة للبحث المحلي بعد التحميل، لكن الأفضل استخدام loadUsers مع search
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
        const safeName = window.SecurityCore?.sanitizeHTML(user.displayName || user.name || 'بدون اسم') || 'بدون اسم';
        const safeEmail = window.SecurityCore?.sanitizeHTML(user.email || '---') || '---';
        const safePhone = window.SecurityCore?.sanitizeHTML(user.phone || '---') || '---';
        return `
        <tr class="compact-row">
            <td data-label="الاسم">${safeName}</td>
            <td data-label="البريد">${safeEmail}</td>
            <td data-label="الهاتف">${safePhone}</td>
            <td data-label="الطلبات">${user.totalOrders || 0}</td>
            <td data-label="الإنفاق">${window.adminUtils.formatNumber(user.totalSpent || 0)} SDG</td>
            <td data-label="الحالة"><span class="badge ${user.isActive !== false ? 'badge-success' : 'badge-danger'}">${user.isActive !== false ? 'نشط' : 'معطل'}</span></td>
            <td data-label="التاريخ">${window.adminUtils.formatDate(user.createdAt)}</td>
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
window.filterUsers = filterUsers;
window.applyUsersFilter = applyUsersFilter;
window.resetUsersFilter = resetUsersFilter;