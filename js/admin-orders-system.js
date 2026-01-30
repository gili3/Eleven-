// admin-orders-system.js - نظام إدارة الطلبات المحسّن للوحة التحكم
// ======================== متغيرات الحالة ========================

let adminOrdersCache = [];
let adminOrdersCurrentPage = 1;
let adminOrdersItemsPerPage = 8; // عدد الطلبات في كل صفحة
let adminOrdersTotalPages = 0;
let adminOrdersCurrentFilter = 'all';
let adminOrdersIsLoading = false;

// ======================== تحميل الطلبات مع Pagination ========================

async function loadAdminOrders(page = 1, filter = 'all') {
    if (adminOrdersIsLoading) {
        console.log('⚠️ جاري تحميل الطلبات بالفعل...');
        return;
    }

    adminOrdersIsLoading = true;
    const ordersList = document.getElementById('adminOrdersList');
    
    if (!ordersList) {
        console.error('❌ عنصر adminOrdersList غير موجود');
        adminOrdersIsLoading = false;
        return;
    }

    try {
        // عرض مؤشر التحميل
        ordersList.innerHTML = '<div class="spinner"></div>';

        // 💡 Lazy Loading الحقيقي: تحميل فقط الصفحة المطلوبة من Firebase
        console.log(`🔄 جاري جلب الصفحة ${page} من الطلبات...`);
        
        const ordersRef = window.firebaseModules.collection(adminDb, "orders");
        let q;

        if (filter === 'all') {
            q = window.firebaseModules.query(
                ordersRef,
                window.firebaseModules.orderBy("createdAt", "desc"),
                window.firebaseModules.limit(adminOrdersItemsPerPage)
            );
        } else {
            q = window.firebaseModules.query(
                ordersRef,
                window.firebaseModules.where("status", "==", filter),
                window.firebaseModules.orderBy("createdAt", "desc"),
                window.firebaseModules.limit(adminOrdersItemsPerPage)
            );
        }

        const querySnapshot = await window.firebaseModules.getDocs(q);
        
        adminOrdersCache = [];
        querySnapshot.forEach(doc => {
            const order = doc.data();
            order.id = doc.id;
            adminOrdersCache.push(order);
        });

        adminOrdersCurrentFilter = filter;
        adminOrdersCurrentPage = 1;
        page = 1;
        
        // حساب عدد الصفحات بناءً على العداد الكلي (إن أمكن)
        adminOrdersTotalPages = Math.ceil(querySnapshot.size / adminOrdersItemsPerPage) || 1;

        console.log(`✅ تم تحميل ${adminOrdersCache.length} طلب من Firebase`);

        // حساب عدد الصفحات (بناءً على البيانات المحملة)
        if (adminOrdersCache.length < adminOrdersItemsPerPage) {
            adminOrdersTotalPages = 1;
        } else {
            adminOrdersTotalPages = Math.ceil(adminOrdersCache.length / adminOrdersItemsPerPage);
        }

        // التحقق من رقم الصفحة
        if (page < 1) page = 1;
        if (page > adminOrdersTotalPages && adminOrdersTotalPages > 0) page = adminOrdersTotalPages;

        adminOrdersCurrentPage = page;

        // حساب نطاق البيانات للصفحة الحالية
        const startIndex = (page - 1) * adminOrdersItemsPerPage;
        const endIndex = startIndex + adminOrdersItemsPerPage;
        const ordersToDisplay = adminOrdersCache.slice(startIndex, endIndex);

        if (ordersToDisplay.length === 0) {
            ordersList.innerHTML = `
                <div style="text-align: center; padding: 40px 20px;">
                    <i class="fas fa-inbox fa-3x" style="color: var(--gray-color); margin-bottom: 20px;"></i>
                    <h3 style="color: var(--primary-color); margin-bottom: 10px;">لا توجد طلبات</h3>
                    <p style="color: var(--gray-color);">لم يتم العثور على طلبات مطابقة للفلتر المحدد</p>
                </div>
            `;
            renderAdminOrdersPagination();
            adminOrdersIsLoading = false;
            return;
        }

        // عرض الطلبات
        let ordersHTML = '';
        for (const order of ordersToDisplay) {
            ordersHTML += renderAdminOrderCard(order);
        }

        ordersList.innerHTML = ordersHTML;

        // عرض أزرار الترقيم
        renderAdminOrdersPagination();

        console.log(`📄 عرض الصفحة ${page} من ${adminOrdersTotalPages}`);

    } catch (error) {
        console.error('❌ خطأ في تحميل الطلبات:', error);
        ordersList.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--danger-color);">
                <i class="fas fa-exclamation-triangle fa-3x" style="margin-bottom: 20px;"></i>
                <h3>حدث خطأ أثناء تحميل الطلبات</h3>
                <p>${error.message}</p>
                <button onclick="loadAdminOrders(1, '${adminOrdersCurrentFilter}')" class="btn-primary" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> حاول مرة أخرى
                </button>
            </div>
        `;
    } finally {
        adminOrdersIsLoading = false;
    }
}

// ======================== عرض بطاقة الطلب المختصرة (محسّن) ========================

function renderAdminOrderCard(order) {
    // تحديد نص وألوان الحالة
    const statusText = {
        'pending': 'قيد الانتظار',
        'paid': 'تم الدفع',
        'processing': 'جاري التجهيز',
        'shipped': 'خرج للتوصيل',
        'delivered': 'تم التسليم',
        'cancelled': 'ملغي'
    }[order.status] || order.status;

    const statusClass = {
        'pending': 'status-pending',
        'paid': 'status-paid',
        'processing': 'status-processing',
        'shipped': 'status-shipped',
        'delivered': 'status-delivered',
        'cancelled': 'status-cancelled'
    }[order.status] || 'status-pending';

    // معالجة تاريخ الطلب
    let orderDate = 'غير محدد';
    try {
        if (order.createdAt) {
            if (order.createdAt.toDate) {
                orderDate = order.createdAt.toDate().toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } else if (order.createdAt instanceof Date) {
                orderDate = order.createdAt.toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } else if (typeof order.createdAt === 'string') {
                const dateObj = new Date(order.createdAt);
                orderDate = dateObj.toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        }
    } catch (e) {
        console.error('خطأ في معالجة التاريخ:', e);
    }

    // معالجة بيانات العميل
    const customerName = order.customerName || order.userName || 'عميل غير محدد';
    const customerEmail = order.customerEmail || order.userEmail || '--';
    const customerPhone = order.customerPhone || order.userPhone || '--';
    const customerAddress = order.address || '--';

    // معالجة الإيصال
    const hasReceipt = order.receiptImage || order.receiptUrl;
    const receiptStatus = hasReceipt ? 
        '<span style="color: var(--success-color);"><i class="fas fa-check-circle"></i> مرفق</span>' :
        '<span style="color: var(--gray-color);"><i class="fas fa-times-circle"></i> غير مرفق</span>';

    // حساب عدد المنتجات
    const itemsCount = (order.items || []).length;
    const itemsTotal = (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);

    // بناء قائمة المنتجات
    const itemsHTML = (order.items || [])
        .slice(0, 3) // عرض أول 3 منتجات فقط
        .map(item => `
            <div class="order-item-row" style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px; padding: 5px 0; border-bottom: 1px solid #f0f0f0;">
                <span>${item.name || 'منتج'} × ${item.quantity || 1}</span>
                <span style="font-weight: 600;">${formatNumber(item.total || item.price || 0)} SDG</span>
            </div>
        `)
        .join('');

    const moreItemsHTML = itemsCount > 3 ? `
        <div style="font-size: 12px; color: var(--gray-color); padding: 5px 0; margin-top: 5px;">
            <i class="fas fa-ellipsis-h"></i> و${itemsCount - 3} منتج آخر
        </div>
    ` : '';

    // 💡 عرض مختصر واحترافي: فقط المعلومات الأساسية
    return `
        <div class="order-card-compact" style="background: white; border-radius: 10px; border: 1px solid var(--border-color); padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: all 0.2s ease; cursor: pointer;" onclick="viewAdminOrderDetails('${order.id}')">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 15px; flex-wrap: wrap;">
                
                <!-- رقم الطلب والتاريخ -->
                <div style="flex: 1; min-width: 150px;">
                    <div style="font-weight: 700; color: var(--primary-color); font-size: 15px; margin-bottom: 4px;">
                        <i class="fas fa-hashtag"></i> #${order.orderId || order.id.substring(0, 8)}
                    </div>
                    <div style="font-size: 12px; color: var(--gray-color);">
                        <i class="fas fa-calendar-alt"></i> ${orderDate}
                    </div>
                </div>
                
                <!-- اسم العميل -->
                <div style="flex: 1; min-width: 120px;">
                    <div style="font-size: 12px; color: var(--gray-color); margin-bottom: 2px;">العميل</div>
                    <div style="font-weight: 600; color: var(--dark-color); font-size: 14px;">
                        <i class="fas fa-user"></i> ${customerName}
                    </div>
                </div>
                
                <!-- عدد المنتجات -->
                <div style="text-align: center; min-width: 80px;">
                    <div style="font-size: 12px; color: var(--gray-color); margin-bottom: 2px;">المنتجات</div>
                    <div style="font-weight: 600; color: var(--primary-color); font-size: 14px;">
                        <i class="fas fa-box"></i> ${itemsCount}
                    </div>
                </div>
                
                <!-- الإجمالي -->
                <div style="text-align: center; min-width: 100px;">
                    <div style="font-size: 12px; color: var(--gray-color); margin-bottom: 2px;">الإجمالي</div>
                    <div style="font-weight: 700; color: var(--secondary-color); font-size: 16px;">
                        ${formatNumber(order.total || 0)} SDG
                    </div>
                </div>
                
                <!-- الحالة -->
                <div style="min-width: 100px; text-align: center;">
                    <span class="order-status-badge ${statusClass}" style="padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; display: inline-block; white-space: nowrap;">
                        ${statusText}
                    </span>
                </div>
                
                <!-- زر عرض التفاصيل -->
                <div>
                    <button onclick="event.stopPropagation(); viewAdminOrderDetails('${order.id}');" style="padding: 8px 16px; background: var(--secondary-color); color: white; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s ease; white-space: nowrap;">
                        <i class="fas fa-eye"></i> عرض
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ======================== عرض تفاصيل الطلب الكاملة ========================

async function viewAdminOrderDetails(orderId) {
    try {
        const orderRef = window.firebaseModules.doc(adminDb, "orders", orderId);
        const orderSnap = await window.firebaseModules.getDoc(orderRef);

        if (!orderSnap.exists()) {
            showToast('الطلب غير موجود', 'error');
            return;
        }

        const order = orderSnap.data();
        order.id = orderId;

        // بناء نافذة التفاصيل
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 3000;
            padding: 15px;
            backdrop-filter: blur(5px);
            overflow-y: auto;
        `;

        // معالجة التاريخ
        let orderDate = 'غير محدد';
        try {
            if (order.createdAt) {
                if (order.createdAt.toDate) {
                    orderDate = order.createdAt.toDate().toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
            }
        } catch (e) {
            console.error('خطأ في معالجة التاريخ:', e);
        }

        const statusText = {
            'pending': 'قيد الانتظار',
            'paid': 'تم الدفع',
            'processing': 'جاري التجهيز',
            'shipped': 'خرج للتوصيل',
            'delivered': 'تم التسليم',
            'cancelled': 'ملغي'
        }[order.status] || order.status;

        const statusClass = {
            'pending': 'status-pending',
            'paid': 'status-paid',
            'processing': 'status-processing',
            'shipped': 'status-shipped',
            'delivered': 'status-delivered',
            'cancelled': 'status-cancelled'
        }[order.status] || 'status-pending';

        // بناء قائمة المنتجات الكاملة
        const itemsHTML = (order.items || [])
            .map(item => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px; text-align: right;">${item.name || 'منتج'}</td>
                    <td style="padding: 10px; text-align: center;">${item.quantity || 1}</td>
                    <td style="padding: 10px; text-align: center;">${formatNumber(item.price || 0)} SDG</td>
                    <td style="padding: 10px; text-align: left; font-weight: 600;">${formatNumber(item.total || 0)} SDG</td>
                </tr>
            `)
            .join('');

        modal.innerHTML = `
            <div class="modal-content" style="background: white; border-radius: 15px; width: 100%; max-width: 800px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); animation: modalSlideIn 0.3s ease; margin: auto;">
                
                <!-- رأس النافذة -->
                <div class="modal-header" style="padding: 18px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--light-color); border-radius: 15px 15px 0 0; position: sticky; top: 0; z-index: 1;">
                    <h3 style="margin: 0; color: var(--primary-color); font-size: 18px;">
                        <i class="fas fa-receipt"></i> تفاصيل الطلب #${order.orderId || orderId.substring(0, 8)}
                    </h3>
                    <button onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--gray-color);">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- محتوى النافذة -->
                <div class="modal-body" style="padding: 18px;">
                    
                    <!-- معلومات الطلب الأساسية -->
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <h4 style="margin: 0 0 12px 0; color: var(--primary-color); font-size: 16px;">
                            <i class="fas fa-info-circle"></i> معلومات الطلب
                        </h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
                            <div>
                                <strong style="color: var(--primary-color);">رقم الطلب:</strong>
                                <div style="color: var(--dark-color); margin-top: 5px;">${order.orderId || orderId.substring(0, 8)}</div>
                            </div>
                            <div>
                                <strong style="color: var(--primary-color);">التاريخ:</strong>
                                <div style="color: var(--dark-color); margin-top: 5px;">${orderDate}</div>
                            </div>
                            <div>
                                <strong style="color: var(--primary-color);">الحالة:</strong>
                                <div style="margin-top: 5px;">
                                    <span class="order-status-badge ${statusClass}" style="padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block;">
                                        ${statusText}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <strong style="color: var(--primary-color);">الإجمالي:</strong>
                                <div style="color: var(--secondary-color); margin-top: 5px; font-weight: 700; font-size: 16px;">${formatNumber(order.total || 0)} SDG</div>
                            </div>
                        </div>
                    </div>

                    <!-- بيانات العميل -->
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <h4 style="margin: 0 0 12px 0; color: var(--primary-color); font-size: 16px;">
                            <i class="fas fa-user"></i> بيانات العميل
                        </h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
                            <div>
                                <strong style="color: var(--primary-color);">الاسم:</strong>
                                <div style="color: var(--dark-color); margin-top: 5px;">${order.customerName || order.userName || 'غير محدد'}</div>
                            </div>
                            <div>
                                <strong style="color: var(--primary-color);">البريد الإلكتروني:</strong>
                                <div style="color: var(--dark-color); margin-top: 5px; word-break: break-all;">${order.customerEmail || order.userEmail || '--'}</div>
                            </div>
                            <div>
                                <strong style="color: var(--primary-color);">رقم الهاتف:</strong>
                                <div style="color: var(--dark-color); margin-top: 5px;">${order.customerPhone || order.userPhone || '--'}</div>
                            </div>
                            <div>
                                <strong style="color: var(--primary-color);">العنوان:</strong>
                                <div style="color: var(--dark-color); margin-top: 5px;">${order.address || '--'}</div>
                            </div>
                        </div>
                    </div>

                    <!-- المنتجات -->
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <h4 style="margin: 0 0 12px 0; color: var(--primary-color); font-size: 16px;">
                            <i class="fas fa-box"></i> المنتجات (${(order.items || []).length})
                        </h4>
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <thead>
                                <tr style="background: white; border-bottom: 2px solid var(--border-color);">
                                    <th style="padding: 10px; text-align: right; color: var(--primary-color); font-weight: 600;">اسم المنتج</th>
                                    <th style="padding: 10px; text-align: center; color: var(--primary-color); font-weight: 600;">الكمية</th>
                                    <th style="padding: 10px; text-align: center; color: var(--primary-color); font-weight: 600;">السعر</th>
                                    <th style="padding: 10px; text-align: left; color: var(--primary-color); font-weight: 600;">الإجمالي</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHTML}
                            </tbody>
                        </table>
                    </div>

                    <!-- الملاحظات والإيصال -->
                    ${order.notes || order.receiptImage ? `
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                            <h4 style="margin: 0 0 12px 0; color: var(--primary-color); font-size: 16px;">
                                <i class="fas fa-note-sticky"></i> ملاحظات إضافية
                            </h4>
                            ${order.notes ? `
                                <div style="margin-bottom: 12px;">
                                    <strong style="color: var(--primary-color);">ملاحظات الطلب:</strong>
                                    <div style="color: var(--dark-color); margin-top: 5px; line-height: 1.6;">${order.notes}</div>
                                </div>
                            ` : ''}
                            ${order.receiptImage ? `
                                <div>
                                    <strong style="color: var(--primary-color);">الإيصال:</strong>
                                    <div style="margin-top: 8px;">
                                        <img src="${order.receiptImage}" style="max-width: 100%; max-height: 300px; border-radius: 8px; cursor: pointer;" onclick="window.open('${order.receiptImage}')" title="انقر لفتح الإيصال بحجم كامل">
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}

                </div>

                <!-- تذييل النافذة -->
                <div class="modal-footer" style="padding: 18px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 10px; background: var(--light-color); border-radius: 0 0 15px 15px; position: sticky; bottom: 0;">
                    <button onclick="this.closest('.modal').remove()" class="btn-secondary" style="padding: 10px 20px; background: white; color: var(--dark-color); border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-size: 14px; font-weight: 600;">
                        <i class="fas fa-times"></i> إغلاق
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // إغلاق النافذة عند النقر على الخلفية
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

    } catch (error) {
        console.error('❌ خطأ في تحميل تفاصيل الطلب:', error);
        showToast('حدث خطأ في تحميل التفاصيل', 'error');
    }
}

// ======================== عرض الإيصال ========================

function viewAdminReceipt(imageSrc) {
    if (!imageSrc) {
        showToast('لا يوجد إيصال مرفق', 'warning');
        return;
    }

    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.95);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        cursor: pointer;
        padding: 20px;
    `;

    modal.innerHTML = `
        <div style="position: relative; max-width: 90%; max-height: 90%; display: flex; flex-direction: column; align-items: center;">
            <img src="${imageSrc}" 
                 style="max-width: 100%; max-height: 80vh; border-radius: 10px; border: 2px solid white; object-fit: contain;"
                 onerror="this.src='https://cdn-icons-png.flaticon.com/512/1178/1178479.png';">
            <div style="position: absolute; bottom: -60px; left: 0; right: 0; text-align: center; display: flex; gap: 10px; justify-content: center;">
                <button onclick="downloadImage('${imageSrc}', 'إيصال_طلب.jpg')" 
                        class="btn-primary" 
                        style="padding: 10px 20px; background: var(--secondary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-size: 14px;">
                    <i class="fas fa-download"></i> تحميل
                </button>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                        class="btn-secondary" 
                        style="padding: 10px 20px; background: white; color: var(--dark-color); border: none; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-size: 14px;">
                    <i class="fas fa-times"></i> إغلاق
                </button>
            </div>
        </div>
    `;

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
}

// ======================== تحديث حالة الطلب ========================

async function updateAdminOrderStatus(orderId, newStatus) {
    if (!newStatus) return;

    try {
        showLoadingSpinner('جاري تحديث الحالة...');

        const orderRef = window.firebaseModules.doc(adminDb, "orders", orderId);
        await window.firebaseModules.updateDoc(orderRef, {
            status: newStatus,
            updatedAt: window.firebaseModules.serverTimestamp()
        });

        hideLoadingSpinner();
        showToast('تم تحديث حالة الطلب بنجاح', 'success');

        // إعادة تحميل الطلبات
        await loadAdminOrders(adminOrdersCurrentPage, adminOrdersCurrentFilter);

    } catch (error) {
        hideLoadingSpinner();
        console.error('❌ خطأ في تحديث الحالة:', error);
        showToast('حدث خطأ في تحديث الحالة', 'error');
    }
}

// ======================== حذف الطلب ========================

async function deleteAdminOrder(orderId) {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;

    try {
        showLoadingSpinner('جاري حذف الطلب...');

        const orderRef = window.firebaseModules.doc(adminDb, "orders", orderId);
        await window.firebaseModules.deleteDoc(orderRef);

        hideLoadingSpinner();
        showToast('تم حذف الطلب بنجاح', 'success');

        // إعادة تحميل الطلبات
        adminOrdersCache = [];
        await loadAdminOrders(1, adminOrdersCurrentFilter);

    } catch (error) {
        hideLoadingSpinner();
        console.error('❌ خطأ في حذف الطلب:', error);
        showToast('حدث خطأ في حذف الطلب', 'error');
    }
}

// ======================== عرض أزرار الترقيم (Pagination) ========================

function renderAdminOrdersPagination() {
    const ordersList = document.getElementById('adminOrdersList');
    if (!ordersList || adminOrdersTotalPages <= 1) return;

    // البحث عن عنصر الترقيم الموجود أو إنشاء واحد جديد
    let paginationContainer = document.getElementById('adminOrdersPagination');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'adminOrdersPagination';
        ordersList.parentNode.insertBefore(paginationContainer, ordersList.nextSibling);
    }

    let paginationHTML = `
        <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 20px; flex-wrap: wrap;">
    `;

    // زر الصفحة السابقة
    if (adminOrdersCurrentPage > 1) {
        paginationHTML += `
            <button onclick="loadAdminOrders(${adminOrdersCurrentPage - 1}, '${adminOrdersCurrentFilter}')" 
                    class="btn-primary" 
                    style="padding: 8px 12px; background: var(--secondary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-size: 13px;">
                <i class="fas fa-chevron-right"></i> السابق
            </button>
        `;
    }

    // أزرار الصفحات
    const maxButtons = 5;
    let startPage = Math.max(1, adminOrdersCurrentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(adminOrdersTotalPages, startPage + maxButtons - 1);

    if (endPage - startPage + 1 < maxButtons) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
        paginationHTML += `
            <button onclick="loadAdminOrders(1, '${adminOrdersCurrentFilter}')" 
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
        if (i === adminOrdersCurrentPage) {
            paginationHTML += `
                <button style="padding: 8px 12px; background: var(--secondary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-size: 13px; font-weight: 600;">
                    ${i}
                </button>
            `;
        } else {
            paginationHTML += `
                <button onclick="loadAdminOrders(${i}, '${adminOrdersCurrentFilter}')" 
                        class="btn-secondary" 
                        style="padding: 8px 12px; background: white; color: var(--dark-color); border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-size: 13px;">
                    ${i}
                </button>
            `;
        }
    }

    if (endPage < adminOrdersTotalPages) {
        if (endPage < adminOrdersTotalPages - 1) {
            paginationHTML += `<span style="color: var(--gray-color);">...</span>`;
        }
        paginationHTML += `
            <button onclick="loadAdminOrders(${adminOrdersTotalPages}, '${adminOrdersCurrentFilter}')" 
                    class="btn-secondary" 
                    style="padding: 8px 12px; background: white; color: var(--dark-color); border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-size: 13px;">
                ${adminOrdersTotalPages}
            </button>
        `;
    }

    // زر الصفحة التالية
    if (adminOrdersCurrentPage < adminOrdersTotalPages) {
        paginationHTML += `
            <button onclick="loadAdminOrders(${adminOrdersCurrentPage + 1}, '${adminOrdersCurrentFilter}')" 
                    class="btn-primary" 
                    style="padding: 8px 12px; background: var(--secondary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-size: 13px;">
                التالي <i class="fas fa-chevron-left"></i>
            </button>
        `;
    }

    // معلومات الصفحة
    paginationHTML += `
        <div style="margin-right: 15px; color: var(--gray-color); font-size: 13px;">
            الصفحة ${adminOrdersCurrentPage} من ${adminOrdersTotalPages}
        </div>
    `;

    paginationHTML += `</div>`;

    paginationContainer.innerHTML = paginationHTML;
}

// ======================== معالج تغيير الفلتر ========================

async function handleAdminOrderFilterChange(filter) {
    adminOrdersCache = [];
    await loadAdminOrders(1, filter);
}

// ======================== التصدير للاستخدام العام ========================

window.loadAdminOrders = loadAdminOrders;
window.viewAdminOrderDetails = viewAdminOrderDetails;
window.viewAdminReceipt = viewAdminReceipt;
window.updateAdminOrderStatus = updateAdminOrderStatus;
window.deleteAdminOrder = deleteAdminOrder;
window.handleAdminOrderFilterChange = handleAdminOrderFilterChange;

console.log('✅ admin-orders-system.js loaded');
