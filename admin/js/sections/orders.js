/**
 * orders.js - قسم إدارة الطلبات (نسخة محسنة مع التحميل بالتمرير والبطاقات المصغرة)
 */

let allOrders = [];
let lastOrderDoc = null;
let hasMoreOrders = true;
let isLoadingOrders = false;
const ORDERS_PER_PAGE = 8;
let ordersObserver = null;

async function loadOrders(isNextPage = false) {
    if (isLoadingOrders) return;
    
    const searchInput = document.getElementById('ordersSearchInput');
    const statusFilter = document.getElementById('ordersStatusFilter');
    
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const filterStatus = statusFilter ? statusFilter.value : '';

    if (!isNextPage) {
        allOrders = [];
        lastOrderDoc = null;
        hasMoreOrders = true;
        const tbody = document.getElementById('ordersBody');
        if (tbody) {
            tbody.innerHTML = Array(5).fill(0).map(() => `
                <tr class="skeleton-row">
                    <td><div class="skeleton skeleton-text" style="width: 50px;"></div></td>
                    <td><div class="skeleton skeleton-text"></div></td>
                    <td><div class="skeleton skeleton-text" style="width: 80px;"></div></td>
                    <td><div class="skeleton skeleton-text" style="width: 60px;"></div></td>
                    <td><div class="skeleton skeleton-text" style="width: 40px;"></div></td>
                    <td><div class="skeleton skeleton-text" style="width: 100px;"></div></td>
                    <td><div class="skeleton skeleton-text" style="width: 80px;"></div></td>
                </tr>
            `).join('');
        }
    }

    if (!hasMoreOrders && isNextPage) return;

    isLoadingOrders = true;
    try {
        console.log('📦 جاري تحميل الطلبات...');
        const { db, firebaseModules } = window;
        
        let constraints = [
            firebaseModules.collection(db, 'orders')
        ];

        // تطبيق الفلترة من Firebase
        if (filterStatus) {
            constraints.push(firebaseModules.where('status', '==', filterStatus));
        }

        // الترتيب
        constraints.push(firebaseModules.orderBy('createdAt', 'desc'));

        if (isNextPage && lastOrderDoc) {
            constraints.push(firebaseModules.startAfter(lastOrderDoc));
        }
        
        constraints.push(firebaseModules.limit(ORDERS_PER_PAGE));
        
        const q = firebaseModules.query(...constraints);
        const snapshot = await firebaseModules.getDocs(q);
        
        if (snapshot.empty) {
            hasMoreOrders = false;
            if (!isNextPage) displayOrders();
            return;
        }

        lastOrderDoc = snapshot.docs[snapshot.docs.length - 1];
        hasMoreOrders = snapshot.docs.length === ORDERS_PER_PAGE;

        const newOrders = [];
        snapshot.forEach(doc => {
            newOrders.push({ id: doc.id, ...doc.data() });
        });

        allOrders = [...allOrders, ...newOrders];
        window.allOrders = allOrders;
        
        displayOrders(isNextPage);
        if (window.updateStats) window.updateStats();
        
        if (!isNextPage) setupOrdersInfiniteScroll();
        
        console.log(`✅ تم تحميل ${newOrders.length} طلب إضافي`);
    } catch (error) {
        console.error('❌ خطأ في تحميل الطلبات:', error);
        if (window.adminUtils) window.adminUtils.showToast('فشل تحميل الطلبات', 'error');
    } finally {
        isLoadingOrders = false;
    }
}

function setupOrdersInfiniteScroll() {
    const sentinel = document.getElementById('ordersScrollSentinel');
    if (!sentinel) return;

    if (ordersObserver) ordersObserver.disconnect();

    ordersObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreOrders && !isLoadingOrders) {
            sentinel.innerHTML = '<div class="loading-indicator"><div class="spinner"></div><span style="margin-right: 10px; font-size: 13px;">جاري تحميل المزيد...</span></div>';
            loadOrders(true).then(() => {
                sentinel.innerHTML = '';
            });
        }
    }, { threshold: 0.1 });

    ordersObserver.observe(sentinel);
}

function displayOrders(append = false) {
    const tbody = document.getElementById('ordersBody');
    if (!tbody) return;
    
    if (allOrders.length === 0 && !append) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">لا توجد طلبات تطابق البحث</td></tr>';
        return;
    }

    tbody.innerHTML = allOrders.map(order => `
        <tr class="compact-row" onclick="viewOrder('${order.id}')" style="cursor: pointer;">
            <td data-label="رقم الطلب" style="font-weight: 600; font-size: 12px;">#${order.orderId || order.id.substring(0, 6)}</td>
            <td data-label="العميل" style="font-size: 12px;">${order.userName || 'عميل'}</td>
            <td data-label="الهاتف" style="font-size: 11px;">${order.phone || '---'}</td>
            <td data-label="الإجمالي" style="font-weight: bold; color: var(--primary-color);">${window.adminUtils.formatNumber(order.total)}</td>
            <td data-label="الحالة">
                <span class="badge badge-${window.adminUtils.getStatusColor(order.status)}" style="padding: 1px 6px; font-size: 9px; border-radius: 4px;">
                    ${window.adminUtils.getStatusText(order.status)}
                </span>
            </td>
            <td data-label="التاريخ" style="font-size: 10px; color: #666;">${window.adminUtils.formatDate(order.createdAt)}</td>
            <td data-label="الإجراءات" onclick="event.stopPropagation()">
                <div class="action-buttons-compact">
                    <button class="btn btn-sm btn-primary" onclick="editOrderStatus('${order.id}')" title="تحديث الحالة">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="printInvoice('${order.id}')" title="طباعة">
                        <i class="fas fa-print"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function applyOrdersFilter() {
    loadOrders(false);
}

function resetOrdersFilter() {
    const searchInput = document.getElementById('ordersSearchInput');
    const statusFilter = document.getElementById('ordersStatusFilter');
    
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    
    loadOrders(false);
}

function viewOrder(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'orderModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>تفاصيل الطلب: #${order.orderId || order.id.substring(0, 8)}</h2>
                <button class="modal-close" onclick="window.adminUtils.closeModal('orderModal')">&times;</button>
            </div>
            
            <div style="padding: 15px;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                    <p><strong>الاسم:</strong> ${order.userName || '---'}</p>
                    <p><strong>الهاتف:</strong> ${order.phone || '---'}</p>
                    <p><strong>العنوان:</strong> ${order.address || '---'}</p>
                    <p><strong>السعر الإجمالي:</strong> ${window.adminUtils.formatNumber(order.total)} SDG</p>
                    <p><strong>الحالة:</strong> <span class="badge badge-${window.adminUtils.getStatusColor(order.status)}">${window.adminUtils.getStatusText(order.status)}</span></p>
                    <p><strong>التاريخ:</strong> ${window.adminUtils.formatDate(order.createdAt)}</p>
                </div>

                <h4 style="margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">المنتجات</h4>
                <div style="max-height: 200px; overflow-y: auto; margin-bottom: 15px;">
                    ${(order.items || []).map(item => `
                        <div style="display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid #f1f1f1;">
                            <img src="${item.image || 'https://via.placeholder.com/30'}" style="width: 35px; height: 35px; border-radius: 4px; object-fit: cover;">
                            <div style="flex: 1;">
                                <p style="font-size: 13px; margin: 0;">${item.name}</p>
                                <p style="font-size: 11px; color: #666; margin: 0;">${item.quantity} × ${window.adminUtils.formatNumber(item.price)} SDG</p>
                            </div>
                        </div>
                    `).join('')}
                </div>

                ${order.receiptUrl ? `
                    <div style="text-align: center; margin-top: 10px;">
                        <p style="font-size: 13px; margin-bottom: 5px;"><strong>إيصال الدفع:</strong></p>
                        <a href="${order.receiptUrl}" target="_blank">
                            <img src="${order.receiptUrl}" style="max-width: 100%; max-height: 150px; border-radius: 8px; border: 1px solid #ddd;">
                        </a>
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer" style="display: flex; justify-content: center; gap: 10px; padding: 15px;">
                <button class="btn btn-primary" onclick="editOrderStatus('${order.id}')">تحديث الحالة</button>
                <button class="btn btn-success" onclick="printInvoice('${order.id}')">طباعة</button>
                <button class="btn btn-secondary" onclick="window.adminUtils.closeModal('orderModal')">إغلاق</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function editOrderStatus(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    const statuses = {
        'pending': 'قيد الانتظار',
        'processing': 'جاري التجهيز',
        'shipped': 'تم الشحن',
        'delivered': 'تم التوصيل',
        'cancelled': 'ملغي'
    };

    // إنشاء Modal لاختيار الحالة
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'statusUpdateModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h2>تحديث حالة الطلب</h2>
                <button class="modal-close" onclick="window.adminUtils.closeModal('statusUpdateModal')">&times;</button>
            </div>
            <div style="padding: 20px;">
                <div class="form-group">
                    <label>اختر الحالة الجديدة:</label>
                    <select id="newStatusSelect" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ddd; font-family: 'Cairo';">
                        ${Object.entries(statuses).map(([key, val]) => `
                            <option value="${key}" ${order.status === key ? 'selected' : ''}>${val}</option>
                        `).join('')}
                    </select>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="saveStatusBtn" class="btn btn-primary" style="flex: 1;">حفظ التغيير</button>
                    <button class="btn btn-secondary" onclick="window.adminUtils.closeModal('statusUpdateModal')" style="flex: 1;">إلغاء</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('saveStatusBtn').onclick = async () => {
        const newStatus = document.getElementById('newStatusSelect').value;
        if (newStatus === order.status) {
            window.adminUtils.closeModal('statusUpdateModal');
            return;
        }

        try {
            const saveBtn = document.getElementById('saveStatusBtn');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

            const { db, firebaseModules } = window;
            await firebaseModules.updateDoc(firebaseModules.doc(db, 'orders', orderId), {
                status: newStatus,
                updatedAt: firebaseModules.serverTimestamp()
            });

            window.adminUtils.showToast('✅ تم تحديث حالة الطلب بنجاح', 'success');
            order.status = newStatus;
            displayOrders();
            
            window.adminUtils.closeModal('statusUpdateModal');
            
            // تحديث نافذة التفاصيل إذا كانت مفتوحة
            if (document.getElementById('orderModal')) {
                window.adminUtils.closeModal('orderModal');
                viewOrder(orderId);
            }
        } catch (error) {
            console.error('❌ خطأ في تحديث الحالة:', error);
            window.adminUtils.showToast('حدث خطأ أثناء تحديث الحالة', 'error');
        }
    };
}

function printInvoice(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html dir="rtl">
        <head>
            <title>فاتورة طلب #${order.orderId || order.id.substring(0, 8)}</title>
            <style>
                body { font-family: 'Cairo', sans-serif; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: right; }
                th { background: #f4f4f4; }
                .total { text-align: left; font-size: 1.2em; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>فاتورة شراء</h1>
                <p>رقم الطلب: #${order.orderId || order.id.substring(0, 8)}</p>
            </div>
            <div class="info">
                <div>
                    <p><strong>العميل:</strong> ${order.userName || '---'}</p>
                    <p><strong>الهاتف:</strong> ${order.phone || '---'}</p>
                    <p><strong>العنوان:</strong> ${order.address || '---'}</p>
                </div>
                <div>
                    <p><strong>التاريخ:</strong> ${window.adminUtils.formatDate(order.createdAt)}</p>
                    <p><strong>الحالة:</strong> ${window.adminUtils.getStatusText(order.status)}</p>
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>المنتج</th>
                        <th>السعر</th>
                        <th>الكمية</th>
                        <th>الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${(order.items || []).map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${window.adminUtils.formatNumber(item.price)} SDG</td>
                            <td>${item.quantity}</td>
                            <td>${window.adminUtils.formatNumber(item.price * item.quantity)} SDG</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="total">
                <p>الإجمالي الكلي: ${window.adminUtils.formatNumber(order.total)} SDG</p>
            </div>
            <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

window.loadOrders = loadOrders;
window.viewOrder = viewOrder;
window.editOrderStatus = editOrderStatus;
window.printInvoice = printInvoice;
