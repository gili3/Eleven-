/**
 * orders.js - قسم إدارة الطلبات
 * تم تحديثه لتحسين البحث واستخدام المعاملات عند إلغاء الطلب.
 */

let allOrders = [];
let lastOrderDoc = null;
let hasMoreOrders = true;
let isLoadingOrders = false;
const ORDERS_PER_PAGE = 10;
let ordersObserver = null;

async function loadOrders(isNextPage = false) {
    if (!window.checkAdmin()) return;
    if (isLoadingOrders) return;
    
    const searchInput = document.getElementById('ordersSearchInput');
    const statusFilter = document.getElementById('ordersStatusFilter');
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    const filterStatus = statusFilter ? statusFilter.value : '';

    if (!isNextPage) {
        allOrders = [];
        lastOrderDoc = null;
        hasMoreOrders = true;
        const tbody = document.getElementById('ordersBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">جاري التحميل...</td></tr>';
    }

    isLoadingOrders = true;
    try {
        const { db } = window.firebaseInstance;
        const { collection, query, where, orderBy, startAfter, limit, getDocs } = window.firebaseModules;
        
        let constraints = [];
        if (filterStatus) constraints.push(where('status', '==', filterStatus));
        
        // تحسين البحث: إذا كان رقم الطلب، نبحث عنه مباشرة
        if (searchTerm) {
            if (searchTerm.startsWith('NO:')) {
                constraints.push(where('orderId', '==', searchTerm));
            } else if (!isNaN(searchTerm)) {
                constraints.push(where('orderNumber', '==', Number(searchTerm)));
            } else {
                // بحث بالاسم (يتطلب فهرس مركب)
                constraints.push(where('userName', '>=', searchTerm));
                constraints.push(where('userName', '<=', searchTerm + '\uf8ff'));
            }
        }

        constraints.push(orderBy('createdAt', 'desc'));
        if (isNextPage && lastOrderDoc) constraints.push(startAfter(lastOrderDoc));
        constraints.push(limit(ORDERS_PER_PAGE));
        
        const q = query(collection(db, 'orders'), ...constraints);
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            hasMoreOrders = false;
            if (!isNextPage) displayOrders();
            return;
        }

        lastOrderDoc = snapshot.docs[snapshot.docs.length - 1];
        hasMoreOrders = snapshot.docs.length === ORDERS_PER_PAGE;

        const newOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allOrders = isNextPage ? [...allOrders, ...newOrders] : newOrders;
        window.allOrders = allOrders;
        
        displayOrders();
        if (!isNextPage) setupOrdersInfiniteScroll();
    } catch (error) {
        console.error('❌ Load Orders Error:', error);
        window.adminUtils.showToast('فشل تحميل الطلبات', 'error');
    } finally {
        isLoadingOrders = false;
    }
}

function displayOrders() {
    const tbody = document.getElementById('ordersBody');
    if (!tbody) return;
    
    if (allOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">لا توجد طلبات</td></tr>';
        return;
    }

    tbody.innerHTML = allOrders.map(order => `
        <tr class="compact-row" onclick="viewOrder('${order.id}')" style="cursor: pointer;">
            <td data-label="رقم الطلب">#${order.orderId || order.orderNumber}</td>
            <td data-label="العميل">${order.userName}</td>
            <td data-label="الهاتف">${order.phone}</td>
            <td data-label="الإجمالي">${order.total} SDG</td>
            <td data-label="الحالة">
                <span class="badge badge-${window.adminUtils.getStatusColor(order.status)}">
                    ${window.adminUtils.getStatusText(order.status)}
                </span>
            </td>
            <td data-label="التاريخ">${window.adminUtils.formatDate(order.createdAt)}</td>
            <td data-label="الإجراءات" onclick="event.stopPropagation()">
                <button class="btn btn-sm btn-primary" onclick="editOrderStatus('${order.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-success" onclick="printInvoice('${order.id}')"><i class="fas fa-print"></i></button>
            </td>
        </tr>
    `).join('');
}

async function editOrderStatus(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    const statuses = { 'pending': 'قيد الانتظار', 'processing': 'جاري التجهيز', 'shipped': 'تم الشحن', 'delivered': 'تم التوصيل', 'cancelled': 'ملغي' };
    const options = Object.entries(statuses).map(([k, v]) => `<option value="${k}" ${order.status === k ? 'selected' : ''}>${v}</option>`).join('');

    ModalManager.open({
        id: 'statusModal',
        title: 'تحديث حالة الطلب',
        content: `<div class="form-group"><label>الحالة الجديدة:</label><select id="newOrderStatus" class="form-control">${options}</select></div>`,
        buttons: [{
            text: 'حفظ', class: 'btn-primary', onClick: async () => {
                const newStatus = document.getElementById('newOrderStatus').value;
                if (newStatus === order.status) { ModalManager.close('statusModal'); return; }

                try {
                    const { db } = window.firebaseInstance;
                    const { runTransaction, doc, serverTimestamp } = window.firebaseModules;

                    await runTransaction(db, async (transaction) => {
                        const orderRef = doc(db, 'orders', orderId);
                        
                        // إذا تم الإلغاء، نعيد المخزون باستخدام Transaction لضمان الدقة
                        if (newStatus === 'cancelled' && order.status !== 'cancelled') {
                            for (const item of (order.items || [])) {
                                const pRef = doc(db, 'products', item.id);
                                const pSnap = await transaction.get(pRef);
                                if (pSnap.exists()) {
                                    transaction.update(pRef, { stock: pSnap.data().stock + item.quantity });
                                }
                            }
                        }
                        
                        transaction.update(orderRef, { status: newStatus, updatedAt: serverTimestamp() });
                    });

                    window.adminUtils.showToast('تم التحديث بنجاح', 'success');
                    order.status = newStatus;
                    displayOrders();
                    ModalManager.close('statusModal');
                    
                    // إرسال إشعار (إذا كان النظام مفعلاً)
                    if (window.NotificationSystem && window.NotificationSystem.sendToUser) {
                        window.NotificationSystem.sendToUser(order.userId, `تحديث الطلب #${order.orderId}`, `حالة طلبك الآن: ${statuses[newStatus]}`);
                    }
                } catch (e) {
                    window.adminUtils.showToast('فشل التحديث', 'error');
                }
            }
        }, { text: 'إلغاء', class: 'btn-secondary' }]
    });
}

function setupOrdersInfiniteScroll() {
    const sentinel = document.getElementById('ordersScrollSentinel');
    if (!sentinel) return;
    if (ordersObserver) ordersObserver.disconnect();
    ordersObserver = new IntersectionObserver(e => { if (e[0].isIntersecting && hasMoreOrders && !isLoadingOrders) loadOrders(true); });
    ordersObserver.observe(sentinel);
}

// تصدير الدوال
window.loadOrders = loadOrders;
window.editOrderStatus = editOrderStatus;
window.applyOrdersFilter = () => loadOrders(false);
window.resetOrdersFilter = () => {
    document.getElementById('ordersSearchInput').value = '';
    document.getElementById('ordersStatusFilter').value = '';
    loadOrders(false);
};
