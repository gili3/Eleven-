// admin-pagination-system.js - نظام التحميل الذكي (Pagination) للمنتجات والمستخدمين
// ======================== متغيرات الحالة - المنتجات ========================

let adminProductsCache = [];
let adminProductsCurrentPage = 1;
let adminProductsItemsPerPage = 8; // عدد المنتجات في كل صفحة
let adminProductsTotalPages = 0;
let adminProductsIsLoading = false;

// ======================== متغيرات الحالة - المستخدمين ========================

let adminUsersCache = [];
let adminUsersCurrentPage = 1;
let adminUsersItemsPerPage = 8; // عدد المستخدمين في كل صفحة
let adminUsersTotalPages = 0;
let adminUsersIsLoading = false;

// ======================== تحميل المنتجات مع Pagination ========================

async function loadAdminProducts(page = 1) {
    if (adminProductsIsLoading) {
        console.log('⚠️ جاري تحميل المنتجات بالفعل...');
        return;
    }

    adminProductsIsLoading = true;
    const productsList = document.getElementById('adminProductsList');

    if (!productsList) {
        console.error('❌ عنصر adminProductsList غير موجود');
        adminProductsIsLoading = false;
        return;
    }

    try {
        // إذا لم نقم بتحميل البيانات من قبل، جلب من Firebase
        if (adminProductsCache.length === 0) {
            console.log('🔄 جاري جلب المنتجات من Firebase...');

            productsList.innerHTML = '<div class="spinner"></div>';

            const productsRef = window.firebaseModules.collection(adminDb, "products");
            const q = window.firebaseModules.query(
                productsRef,
                window.firebaseModules.orderBy("createdAt", "desc")
            );

            const querySnapshot = await window.firebaseModules.getDocs(q);

            adminProductsCache = [];
            querySnapshot.forEach(doc => {
                const product = doc.data();
                product.id = doc.id;
                adminProductsCache.push(product);
            });

            console.log(`✅ تم تحميل ${adminProductsCache.length} منتج من Firebase`);
        }

        // حساب عدد الصفحات
        adminProductsTotalPages = Math.ceil(adminProductsCache.length / adminProductsItemsPerPage);

        // التحقق من رقم الصفحة
        if (page < 1) page = 1;
        if (page > adminProductsTotalPages && adminProductsTotalPages > 0) page = adminProductsTotalPages;

        adminProductsCurrentPage = page;

        // حساب نطاق البيانات للصفحة الحالية
        const startIndex = (page - 1) * adminProductsItemsPerPage;
        const endIndex = startIndex + adminProductsItemsPerPage;
        const productsToDisplay = adminProductsCache.slice(startIndex, endIndex);

        if (productsToDisplay.length === 0) {
            productsList.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; grid-column: 1/-1;">
                    <i class="fas fa-box-open fa-3x" style="color: var(--gray-color); margin-bottom: 20px;"></i>
                    <h3 style="color: var(--primary-color); margin-bottom: 10px;">لا توجد منتجات</h3>
                    <p style="color: var(--gray-color);">لم يتم العثور على منتجات</p>
                </div>
            `;
            renderAdminProductsPagination();
            adminProductsIsLoading = false;
            return;
        }

        // عرض المنتجات
        let productsHTML = '';
        for (const product of productsToDisplay) {
            productsHTML += renderAdminProductCard(product);
        }

        productsList.innerHTML = productsHTML;

        // عرض أزرار الترقيم
        renderAdminProductsPagination();

        console.log(`📄 عرض الصفحة ${page} من ${adminProductsTotalPages}`);

    } catch (error) {
        console.error('❌ خطأ في تحميل المنتجات:', error);
        productsList.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--danger-color); grid-column: 1/-1;">
                <i class="fas fa-exclamation-triangle fa-3x" style="margin-bottom: 20px;"></i>
                <h3>حدث خطأ أثناء تحميل المنتجات</h3>
                <p>${error.message}</p>
                <button onclick="loadAdminProducts(1)" class="btn-primary" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> حاول مرة أخرى
                </button>
            </div>
        `;
    } finally {
        adminProductsIsLoading = false;
    }
}

// ======================== عرض بطاقة المنتج ========================

function renderAdminProductCard(product) {
    const isActive = product.isActive !== false;
    const statusBadge = isActive ? 
        '<span class="status-badge active">نشط</span>' :
        '<span class="status-badge inactive">معطل</span>';

    const badges = [];
    if (product.isNew) badges.push('<span class="status-badge new">جديد</span>');
    if (product.isSale) badges.push('<span class="status-badge sale">عرض</span>');
    if (product.isBest) badges.push('<span class="status-badge best">الأفضل</span>');

    return `
        <div class="admin-product-card" style="display: flex; flex-direction: column; background: white; border-radius: 15px; transition: all 0.3s ease; border: 1px solid var(--border-color); overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); position: relative;">
            
            <!-- صورة المنتج -->
            <div class="admin-product-image" style="width: 100%; height: 180px; overflow: hidden; position: relative;">
<img src="${product.image || 'https://via.placeholder.com/300x200?text=صورة'}" 
	                     alt="${product.name}" 
	                     loading="lazy"
	                     style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease;"
	                     onerror="this.src='https://via.placeholder.com/300x200?text=صورة'">
            </div>

            <!-- معلومات المنتج -->
            <div class="admin-product-info" style="padding: 15px; flex: 1; display: flex; flex-direction: column;">
                <h4 style="font-size: 16px; margin-bottom: 8px; color: var(--primary-color); font-weight: 700; line-height: 1.3;">
                    ${product.name || 'بدون اسم'}
                </h4>
                
                <p style="color: var(--gray-color); margin-bottom: 8px; font-size: 13px;">
                    <i class="fas fa-tag"></i> ${product.category || 'غير مصنف'}
                </p>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div>
                        <span style="font-size: 18px; font-weight: 700; color: var(--secondary-color);">
                            ${formatNumber(product.price || 0)} SDG
                        </span>
                        ${product.originalPrice ? `
                            <span style="font-size: 13px; color: var(--gray-color); text-decoration: line-through; margin-right: 8px;">
                                ${formatNumber(product.originalPrice)} SDG
                            </span>
                        ` : ''}
                    </div>
                </div>

                <p style="color: var(--gray-color); margin-bottom: 10px; font-size: 13px;">
                    <i class="fas fa-box"></i> المخزون: ${formatNumber(product.stock || 0)}
                </p>

                <!-- الحالات -->
                <div class="product-status" style="display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap;">
                    ${statusBadge}
                    ${badges.join('')}
                </div>

                <!-- الوصف المختصر -->
                ${product.description ? `
                    <p style="color: var(--gray-color); font-size: 12px; line-height: 1.4; margin-bottom: 10px; flex: 1;">
                        ${product.description.substring(0, 60)}${product.description.length > 60 ? '...' : ''}
                    </p>
                ` : ''}
            </div>

            <!-- الإجراءات -->
            <div class="admin-product-actions" style="padding: 12px 15px; background: var(--light-color); border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 10px;">
                <button onclick="editProduct('${product.id}')" class="action-icon-btn edit-btn" style="width: 38px; height: 38px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 15px; transition: all 0.2s ease; flex-shrink: 0; background: var(--warning-color); color: white; border: none;">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="confirmDeleteProduct('${product.id}')" class="action-icon-btn delete-btn" style="width: 38px; height: 38px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 15px; transition: all 0.2s ease; flex-shrink: 0; background: var(--danger-color); color: white; border: none;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

// ======================== عرض أزرار الترقيم للمنتجات ========================

function renderAdminProductsPagination() {
    const productsList = document.getElementById('adminProductsList');
    if (!productsList || adminProductsTotalPages <= 1) return;

    let paginationContainer = document.getElementById('adminProductsPagination');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'adminProductsPagination';
        productsList.parentNode.insertBefore(paginationContainer, productsList.nextSibling);
    }

    let paginationHTML = `
        <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 20px; flex-wrap: wrap;">
    `;

    // زر الصفحة السابقة
    if (adminProductsCurrentPage > 1) {
        paginationHTML += `
            <button onclick="loadAdminProducts(${adminProductsCurrentPage - 1})" 
                    class="btn-primary" 
                    style="padding: 8px 12px; background: var(--secondary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-size: 13px;">
                <i class="fas fa-chevron-right"></i> السابق
            </button>
        `;
    }

    // أزرار الصفحات
    const maxButtons = 5;
    let startPage = Math.max(1, adminProductsCurrentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(adminProductsTotalPages, startPage + maxButtons - 1);

    if (endPage - startPage + 1 < maxButtons) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
        paginationHTML += `
            <button onclick="loadAdminProducts(1)" 
                    class="btn-secondary" 
                    style="padding: 8px 12px; background: white; color: var(--dark-color); border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-size: 13px;">
                1
            </button>
        `;
        if (startPage > 2) {
            paginationHTML += `<span style="color: var(--gray-color);">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        if (i === adminProductsCurrentPage) {
            paginationHTML += `
                <button style="padding: 8px 12px; background: var(--secondary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-size: 13px; font-weight: 600;">
                    ${i}
                </button>
            `;
        } else {
            paginationHTML += `
                <button onclick="loadAdminProducts(${i})" 
                        class="btn-secondary" 
                        style="padding: 8px 12px; background: white; color: var(--dark-color); border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-size: 13px;">
                    ${i}
                </button>
            `;
        }
    }

    if (endPage < adminProductsTotalPages) {
        if (endPage < adminProductsTotalPages - 1) {
            paginationHTML += `<span style="color: var(--gray-color);">...</span>`;
        }
        paginationHTML += `
            <button onclick="loadAdminProducts(${adminProductsTotalPages})" 
                    class="btn-secondary" 
                    style="padding: 8px 12px; background: white; color: var(--dark-color); border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-size: 13px;">
                ${adminProductsTotalPages}
            </button>
        `;
    }

    // زر الصفحة التالية
    if (adminProductsCurrentPage < adminProductsTotalPages) {
        paginationHTML += `
            <button onclick="loadAdminProducts(${adminProductsCurrentPage + 1})" 
                    class="btn-primary" 
                    style="padding: 8px 12px; background: var(--secondary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-size: 13px;">
                التالي <i class="fas fa-chevron-left"></i>
            </button>
        `;
    }

    // معلومات الصفحة
    paginationHTML += `
        <div style="margin-right: 15px; color: var(--gray-color); font-size: 13px;">
            الصفحة ${adminProductsCurrentPage} من ${adminProductsTotalPages}
        </div>
    `;

    paginationHTML += `</div>`;

    paginationContainer.innerHTML = paginationHTML;
}

// ======================== تحميل المستخدمين مع Pagination ========================

async function loadAdminUsers(page = 1) {
    if (adminUsersIsLoading) {
        console.log('⚠️ جاري تحميل المستخدمين بالفعل...');
        return;
    }

    adminUsersIsLoading = true;
    const usersList = document.getElementById('adminUsersList');

    if (!usersList) {
        console.error('❌ عنصر adminUsersList غير موجود');
        adminUsersIsLoading = false;
        return;
    }

    try {
        // إذا لم نقم بتحميل البيانات من قبل، جلب من Firebase
        if (adminUsersCache.length === 0) {
            console.log('🔄 جاري جلب المستخدمين من Firebase...');

            usersList.innerHTML = '<div class="spinner"></div>';

            const usersRef = window.firebaseModules.collection(adminDb, "users");
            const q = window.firebaseModules.query(
                usersRef,
                window.firebaseModules.orderBy("createdAt", "desc")
            );

            const querySnapshot = await window.firebaseModules.getDocs(q);

            adminUsersCache = [];
            querySnapshot.forEach(doc => {
                const user = doc.data();
                user.id = doc.id;
                adminUsersCache.push(user);
            });

            console.log(`✅ تم تحميل ${adminUsersCache.length} مستخدم من Firebase`);
        }

        // حساب عدد الصفحات
        adminUsersTotalPages = Math.ceil(adminUsersCache.length / adminUsersItemsPerPage);

        // التحقق من رقم الصفحة
        if (page < 1) page = 1;
        if (page > adminUsersTotalPages && adminUsersTotalPages > 0) page = adminUsersTotalPages;

        adminUsersCurrentPage = page;

        // حساب نطاق البيانات للصفحة الحالية
        const startIndex = (page - 1) * adminUsersItemsPerPage;
        const endIndex = startIndex + adminUsersItemsPerPage;
        const usersToDisplay = adminUsersCache.slice(startIndex, endIndex);

        if (usersToDisplay.length === 0) {
            usersList.innerHTML = `
                <div style="text-align: center; padding: 40px 20px;">
                    <i class="fas fa-users fa-3x" style="color: var(--gray-color); margin-bottom: 20px;"></i>
                    <h3 style="color: var(--primary-color); margin-bottom: 10px;">لا توجد مستخدمين</h3>
                    <p style="color: var(--gray-color);">لم يتم العثور على مستخدمين</p>
                </div>
            `;
            renderAdminUsersPagination();
            adminUsersIsLoading = false;
            return;
        }

        // عرض المستخدمين
        let usersHTML = '';
        for (const user of usersToDisplay) {
            usersHTML += renderAdminUserCard(user);
        }

        usersList.innerHTML = usersHTML;

        // عرض أزرار الترقيم
        renderAdminUsersPagination();

        console.log(`📄 عرض الصفحة ${page} من ${adminUsersTotalPages}`);

    } catch (error) {
        console.error('❌ خطأ في تحميل المستخدمين:', error);
        usersList.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--danger-color);">
                <i class="fas fa-exclamation-triangle fa-3x" style="margin-bottom: 20px;"></i>
                <h3>حدث خطأ أثناء تحميل المستخدمين</h3>
                <p>${error.message}</p>
                <button onclick="loadAdminUsers(1)" class="btn-primary" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> حاول مرة أخرى
                </button>
            </div>
        `;
    } finally {
        adminUsersIsLoading = false;
    }
}

// ======================== عرض بطاقة المستخدم ========================

function renderAdminUserCard(user) {
    const isAdmin = user.isAdmin === true;
    const userType = isAdmin ? 'مسؤول' : 'مستخدم عادي';
    const userIcon = isAdmin ? '<i class="fas fa-crown" style="color: #f39c12;"></i>' : '<i class="fas fa-user-circle"></i>';

    let joinDate = 'غير محدد';
    try {
        if (user.createdAt) {
            if (user.createdAt.toDate) {
                joinDate = user.createdAt.toDate().toLocaleDateString('ar-EG');
            } else if (user.createdAt instanceof Date) {
                joinDate = user.createdAt.toLocaleDateString('ar-EG');
            }
        }
    } catch (e) {
        console.error('خطأ في معالجة التاريخ:', e);
    }

    return `
        <div class="user-card ${isAdmin ? 'admin-user' : 'regular-user'}" style="background: white; padding: 18px; border-radius: 12px; border: 1px solid var(--border-color); transition: all 0.3s ease; border-right: 4px solid ${isAdmin ? 'var(--secondary-color)' : 'var(--primary-color)'}; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
            
            <!-- معلومات المستخدم -->
            <div style="flex: 1; min-width: 250px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                    <div style="width: 45px; height: 45px; border-radius: 50%; background: var(--light-color); display: flex; align-items: center; justify-content: center; font-size: 20px; color: var(--secondary-color);">
                        ${user.photoURL ? `<img src="${user.photoURL}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : userIcon}
                    </div>
                    <div>
                        <h4 style="margin: 0; font-size: 16px; color: var(--primary-color); font-weight: 600;">
                            ${user.displayName || user.name || 'بدون اسم'}
                        </h4>
                        <p style="margin: 0; font-size: 13px; color: var(--gray-color);">
                            ${userType}
                        </p>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
                    <div>
                        <strong style="color: var(--primary-color);">البريد:</strong>
                        <div style="color: var(--dark-color); word-break: break-all;">${user.email || '--'}</div>
                    </div>
                    <div>
                        <strong style="color: var(--primary-color);">الهاتف:</strong>
                        <div style="color: var(--dark-color);">${user.phone || '--'}</div>
                    </div>
                    <div>
                        <strong style="color: var(--primary-color);">العنوان:</strong>
                        <div style="color: var(--dark-color);">${user.address || '--'}</div>
                    </div>
                    <div>
                        <strong style="color: var(--primary-color);">تاريخ الانضمام:</strong>
                        <div style="color: var(--dark-color);">${joinDate}</div>
                    </div>
                </div>
            </div>

            <!-- الإجراءات -->
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="alert('سيتم إضافة خاصية تعديل المستخدم قريباً')" class="btn-primary" style="padding: 8px 15px; background: var(--secondary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                    <i class="fas fa-edit"></i> تعديل
                </button>
                <button onclick="alert('سيتم إضافة خاصية حذف المستخدم قريباً')" class="delete-btn" style="padding: 8px 15px; background: var(--danger-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                    <i class="fas fa-trash"></i> حذف
                </button>
            </div>
        </div>
    `;
}

// ======================== عرض أزرار الترقيم للمستخدمين ========================

function renderAdminUsersPagination() {
    const usersList = document.getElementById('adminUsersList');
    if (!usersList || adminUsersTotalPages <= 1) return;

    let paginationContainer = document.getElementById('adminUsersPagination');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'adminUsersPagination';
        usersList.parentNode.insertBefore(paginationContainer, usersList.nextSibling);
    }

    let paginationHTML = `
        <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 20px; flex-wrap: wrap;">
    `;

    // زر الصفحة السابقة
    if (adminUsersCurrentPage > 1) {
        paginationHTML += `
            <button onclick="loadAdminUsers(${adminUsersCurrentPage - 1})" 
                    class="btn-primary" 
                    style="padding: 8px 12px; background: var(--secondary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-size: 13px;">
                <i class="fas fa-chevron-right"></i> السابق
            </button>
        `;
    }

    // أزرار الصفحات
    const maxButtons = 5;
    let startPage = Math.max(1, adminUsersCurrentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(adminUsersTotalPages, startPage + maxButtons - 1);

    if (endPage - startPage + 1 < maxButtons) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
        paginationHTML += `
            <button onclick="loadAdminUsers(1)" 
                    class="btn-secondary" 
                    style="padding: 8px 12px; background: white; color: var(--dark-color); border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-size: 13px;">
                1
            </button>
        `;
        if (startPage > 2) {
            paginationHTML += `<span style="color: var(--gray-color);">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        if (i === adminUsersCurrentPage) {
            paginationHTML += `
                <button style="padding: 8px 12px; background: var(--secondary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-size: 13px; font-weight: 600;">
                    ${i}
                </button>
            `;
        } else {
            paginationHTML += `
                <button onclick="loadAdminUsers(${i})" 
                        class="btn-secondary" 
                        style="padding: 8px 12px; background: white; color: var(--dark-color); border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-size: 13px;">
                    ${i}
                </button>
            `;
        }
    }

    if (endPage < adminUsersTotalPages) {
        if (endPage < adminUsersTotalPages - 1) {
            paginationHTML += `<span style="color: var(--gray-color);">...</span>`;
        }
        paginationHTML += `
            <button onclick="loadAdminUsers(${adminUsersTotalPages})" 
                    class="btn-secondary" 
                    style="padding: 8px 12px; background: white; color: var(--dark-color); border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-size: 13px;">
                ${adminUsersTotalPages}
            </button>
        `;
    }

    // زر الصفحة التالية
    if (adminUsersCurrentPage < adminUsersTotalPages) {
        paginationHTML += `
            <button onclick="loadAdminUsers(${adminUsersCurrentPage + 1})" 
                    class="btn-primary" 
                    style="padding: 8px 12px; background: var(--secondary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-size: 13px;">
                التالي <i class="fas fa-chevron-left"></i>
            </button>
        `;
    }

    // معلومات الصفحة
    paginationHTML += `
        <div style="margin-right: 15px; color: var(--gray-color); font-size: 13px;">
            الصفحة ${adminUsersCurrentPage} من ${adminUsersTotalPages}
        </div>
    `;

    paginationHTML += `</div>`;

    paginationContainer.innerHTML = paginationHTML;
}

// ======================== التصدير للاستخدام العام ========================

window.loadAdminProducts = loadAdminProducts;
window.loadAdminUsers = loadAdminUsers;

console.log('✅ admin-pagination-system.js loaded');
