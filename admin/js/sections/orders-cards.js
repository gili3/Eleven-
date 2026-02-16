/**
 * orders-cards.js - قسم إدارة الطلبات بنظام البطاقات المختصرة
 */

let allOrders = [];
let lastOrderDoc = null;
let hasMoreOrders = true;
let isLoadingOrders = false;
const ORDERS_PER_PAGE = 12;
let ordersObserver = null;

// متغيرات البحث والفلترة
let orderSearchQuery = '';
let orderFilterStatus = '';

/**
 * تحميل الطلبات من Firebase مع دعم البحث والفلترة
 */
async function loadOrders(isNextPage = false) {
    if (isLoadingOrders) return;
    
    if (!isNextPage) {
        allOrders = [];
        lastOrderDoc = null;
        hasMoreOrders = true;
        showOrdersSkeletonCards();
    }

    if (!hasMoreOrders && isNextPage) return;

    isLoadingOrders = true;
    
    if (isNextPage) {
        showOrdersInfiniteScrollLoader(true);
    }

    try {
        console.log('📋 جاري تحميل الطلبات...');
        const { db, firebaseModules } = window;
        
        let constraints = [firebaseModules.collection(db, 'orders')];

        // تطبيق الفلترة حسب الحالة
        if (orderFilterStatus && orderFilterStatus !== 'all') {
            constraints.push(firebaseModules.where('status', '==', orderFilterStatus));
        }

        constraints.push(firebaseModules.orderBy('createdAt', 'desc'));
        constraints.push(firebaseModules.limit(ORDERS_PER_PAGE));

        if (isNextPage && lastOrderDoc) {
            constraints.splice(constraints.length - 1, 0, firebaseModules.startAfter(lastOrderDoc));
        }
        
        const q = firebaseModules.query(...constraints);
        const snapshot = await firebaseModules.getDocs(q);
        
        if (snapshot.empty) {
            hasMoreOrders = false;
            if (!isNextPage) displayOrderCards();
            return;
        }

        lastOrderDoc = snapshot.docs[snapshot.docs.length - 1];
        hasMoreOrders = snapshot.docs.length === ORDERS_PER_PAGE;

        const newOrders = [];
        snapshot.forEach(doc => {
            const order = { id: doc.id, ...doc.data() };
            
            // تطبيق البحث النصي محلياً
            if (orderSearchQuery) {
                const searchLower = orderSearchQuery.toLowerCase();
                if ((order.id && order.id.toLowerCase().includes(searchLower)) ||
                    (order.customerName && order.customerName.toLowerCase().includes(searchLower)) ||
                    (order.customerPhone && order.customerPhone.includes(searchLower))) {
                    newOrders.push(order);
                }
            } else {
                newOrders.push(order);
            }
        });

        allOrders = [...allOrders, ...newOrders];
        window.allOrders = allOrders;
        
        displayOrderCards(isNextPage);
        if (window.updateStats) window.updateStats();
        
        if (!isNextPage) setupOrdersInfiniteScroll();
        
        console.log(`✅ تم تحميل ${newOrders.length} طلب`);
    } catch (error) {
        console.error('❌ خطأ في تحميل الطلبات:', error);
        if (window.adminUtils) window.adminUtils.showToast('فشل تحميل الطلبات', 'error');
    } finally {
        isLoadingOrders = false;
        showOrdersInfiniteScrollLoader(false);
    }
}

/**
 * إعداد التمرير اللانهائي للطلبات
 */
function setupOrdersInfiniteScroll() {
    const sentinel = document.getElementById('ordersScrollSentinel');
    if (!sentinel) return;

    if (ordersObserver) ordersObserver.disconnect();

    ordersObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreOrders && !isLoadingOrders) {
            loadOrders(true);
        }
    }, { threshold: 0.1 });

    ordersObserver.observe(sentinel);
}

/**
 * عرض البطاقات المختصرة للطلبات
 */
function displayOrderCards(append = false) {
    const container = document.getElementById('ordersCardsContainer');
    if (!container) return;
    
    if (allOrders.length === 0 && !append) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fas fa-shopping-cart"></i></div>
                <h3 class="empty-state-title">لا توجد طلبات</h3>
                <p class="empty-state-text">لم يتم استلام أي طلبات بعد</p>
            </div>
        `;
        return;
    }

    const cardsHtml = allOrders.map(order => createOrderCard(order)).join('');
    
    if (append) {
        const existingCards = container.querySelector('.cards-grid');
        if (existingCards) {
            existingCards.insertAdjacentHTML('beforeend', cardsHtml);
        }
    } else {
        container.innerHTML = `<div class="cards-grid">${cardsHtml}</div>`;
    }
}

/**
 * إنشاء بطاقة طلب مختصرة
 */
function createOrderCard(order) {
    const statusInfo = getOrderStatusInfo(order.status);
    const totalItems = order.items ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
    
    return `
        <div class="compact-card" onclick="openOrderDetails('${order.id}')">
            <span class="card-badge ${statusInfo.class}">
                ${statusInfo.text}
            </span>
            
            <div class="card-header">
                <div style="width: 50px; height: 50px; background: linear-gradient(135deg, ${statusInfo.color}, ${statusInfo.colorDark}); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px;">
                    <i class="fas fa-receipt"></i>
                </div>
                <div class="card-title-section">
                    <h4 class="card-title">طلب #${order.id.substring(0, 8)}</h4>
                    <p class="card-subtitle">${order.customerName || 'عميل'}</p>
                </div>
            </div>
            
            <div class="card-content">
                <div class="card-info">
                    <div class="card-info-item">
                        <i class="fas fa-money-bill-wave"></i>
                        <span class="card-info-value">${window.adminUtils.formatNumber(order.total)} SDG</span>
                    </div>
                    <div class="card-info-item">
                        <i class="fas fa-box"></i>
                        <span>العناصر: <span class="card-info-value">${totalItems}</span></span>
                    </div>
                    <div class="card-info-item">
                        <i class="fas fa-phone"></i>
                        <span class="card-info-value">${order.customerPhone || 'غير متوفر'}</span>
                    </div>
                </div>
            </div>
            
            <div class="card-quick-actions" onclick="event.stopPropagation()">
                <button class="card-action-btn" onclick="updateOrderStatus('${order.id}', 'processing')" title="قيد المعالجة">
                    <i class="fas fa-cog"></i>
                </button>
                <button class="card-action-btn" onclick="updateOrderStatus('${order.id}', 'completed')" title="مكتمل">
                    <i class="fas fa-check"></i>
                </button>
                <button class="card-action-btn" onclick="deleteOrder('${order.id}')" title="حذف">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `;
}

/**
 * الحصول على معلومات حالة الطلب
 */
function getOrderStatusInfo(status) {
    const statusMap = {
        'pending': { 
            text: 'قيد الانتظار', 
            class: 'badge-warning',
            color: '#ffc107',
            colorDark: '#ff9800'
        },
        'processing': { 
            text: 'قيد المعالجة', 
            class: 'badge-info',
            color: '#17a2b8',
            colorDark: '#138496'
        },
        'completed': { 
            text: 'مكتمل', 
            class: 'badge-success',
            color: '#28a745',
            colorDark: '#218838'
        },
        'cancelled': { 
            text: 'ملغي', 
            class: 'badge-danger',
            color: '#dc3545',
            colorDark: '#c82333'
        }
    };
    return statusMap[status] || statusMap['pending'];
}

/**
 * فتح نافذة تفاصيل الطلب الكاملة
 */
function openOrderDetails(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    const statusInfo = getOrderStatusInfo(order.status);
    const itemsHtml = order.items ? order.items.map(item => `
        <div class="card-details-item card-details-full" style="display: flex; gap: 10px; align-items: center;">
            <img src="${item.image || 'https://via.placeholder.com/50'}" 
                 style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;">
            <div style="flex: 1;">
                <div class="card-details-item-value">${item.name}</div>
                <div class="card-details-item-label">الكمية: ${item.quantity} × ${window.adminUtils.formatNumber(item.price)} SDG</div>
            </div>
            <div class="card-details-item-value">${window.adminUtils.formatNumber(item.quantity * item.price)} SDG</div>
        </div>
    `).join('') : '<p>لا توجد عناصر</p>';

    const modal = document.createElement('div');
    modal.className = 'card-details-modal active';
    modal.id = 'orderDetailsModal';
    modal.innerHTML = `
        <div class="card-details-content">
            <div class="card-details-header">
                <h3>تفاصيل الطلب #${order.id.substring(0, 8)}</h3>
                <button class="card-details-close" onclick="closeOrderDetails()">&times;</button>
            </div>
            
            <div class="card-details-body">
                <div class="card-details-section">
                    <h4 class="card-details-section-title">معلومات العميل</h4>
                    <div class="card-details-grid">
                        <div class="card-details-item">
                            <div class="card-details-item-label">الاسم</div>
                            <div class="card-details-item-value">${order.customerName || 'غير متوفر'}</div>
                        </div>
                        <div class="card-details-item">
                            <div class="card-details-item-label">الهاتف</div>
                            <div class="card-details-item-value">${order.customerPhone || 'غير متوفر'}</div>
                        </div>
                        <div class="card-details-item card-details-full">
                            <div class="card-details-item-label">العنوان</div>
                            <div class="card-details-item-value">${order.customerAddress || 'غير متوفر'}</div>
                        </div>
                    </div>
                </div>
                
                <div class="card-details-section">
                    <h4 class="card-details-section-title">عناصر الطلب</h4>
                    ${itemsHtml}
                </div>
                
                <div class="card-details-section">
                    <h4 class="card-details-section-title">ملخص الطلب</h4>
                    <div class="card-details-grid">
                        <div class="card-details-item">
                            <div class="card-details-item-label">المجموع الفرعي</div>
                            <div class="card-details-item-value">${window.adminUtils.formatNumber(order.subtotal || 0)} SDG</div>
                        </div>
                        <div class="card-details-item">
                            <div class="card-details-item-label">الشحن</div>
                            <div class="card-details-item-value">${window.adminUtils.formatNumber(order.shipping || 0)} SDG</div>
                        </div>
                        <div class="card-details-item">
                            <div class="card-details-item-label">الخصم</div>
                            <div class="card-details-item-value">${window.adminUtils.formatNumber(order.discount || 0)} SDG</div>
                        </div>
                        <div class="card-details-item">
                            <div class="card-details-item-label">الإجمالي</div>
                            <div class="card-details-item-value" style="font-size: 18px; color: var(--primary-color);">${window.adminUtils.formatNumber(order.total)} SDG</div>
                        </div>
                        <div class="card-details-item">
                            <div class="card-details-item-label">الحالة</div>
                            <div class="card-details-item-value">
                                <span class="card-badge ${statusInfo.class}">${statusInfo.text}</span>
                            </div>
                        </div>
                        <div class="card-details-item">
                            <div class="card-details-item-label">التاريخ</div>
                            <div class="card-details-item-value">${order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString('ar-EG') : 'غير متوفر'}</div>
                        </div>
                    </div>
                </div>
                
                ${order.receiptImage ? `
                <div class="card-details-section">
                    <h4 class="card-details-section-title">إيصال الدفع</h4>
                    <img src="${order.receiptImage}" 
                         class="card-details-image"
                         style="cursor: pointer;"
                         onclick="window.open('${order.receiptImage}', '_blank')">
                </div>
                ` : ''}
                
                ${order.notes ? `
                <div class="card-details-section">
                    <h4 class="card-details-section-title">ملاحظات</h4>
                    <div class="card-details-item card-details-full">
                        <div class="card-details-item-value">${order.notes}</div>
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="card-details-footer">
                <button class="btn-primary-detail" onclick="updateOrderStatus('${order.id}', 'processing')">
                    <i class="fas fa-cog"></i> قيد المعالجة
                </button>
                <button class="btn-primary-detail" onclick="updateOrderStatus('${order.id}', 'completed')" style="background: #28a745;">
                    <i class="fas fa-check"></i> إكمال
                </button>
                <button class="btn-danger-detail" onclick="updateOrderStatus('${order.id}', 'cancelled')">
                    <i class="fas fa-times"></i> إلغاء
                </button>
                <button class="btn-secondary-detail" onclick="closeOrderDetails()">إغلاق</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeOrderDetails();
        }
    });
}

/**
 * إغلاق نافذة تفاصيل الطلب
 */
function closeOrderDetails() {
    const modal = document.getElementById('orderDetailsModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 200);
    }
}

/**
 * عرض Skeleton Cards أثناء التحميل الأولي
 */
function showOrdersSkeletonCards() {
    const container = document.getElementById('ordersCardsContainer');
    if (!container) return;
    
    const skeletonHtml = Array(8).fill(0).map(() => `
        <div class="skeleton-card">
            <div class="skeleton-header">
                <div class="skeleton skeleton-image"></div>
                <div class="skeleton-text">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-subtitle"></div>
                </div>
            </div>
            <div class="skeleton-content">
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-line"></div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = `<div class="cards-grid">${skeletonHtml}</div>`;
}

/**
 * إظهار/إخفاء مؤشر التحميل للتمرير اللانهائي
 */
function showOrdersInfiniteScrollLoader(show) {
    let loader = document.getElementById('ordersInfiniteScrollLoader');
    
    if (show && !loader) {
        loader = document.createElement('div');
        loader.id = 'ordersInfiniteScrollLoader';
        loader.className = 'infinite-scroll-loader';
        loader.innerHTML = `
            <div class="loader-spinner"></div>
            <span class="loader-text">جاري تحميل المزيد...</span>
        `;
        document.getElementById('ordersCardsContainer').appendChild(loader);
    } else if (!show && loader) {
        loader.remove();
    }
}

/**
 * تطبيق البحث والفلترة للطلبات
 */
function applyOrdersFilter() {
    orderSearchQuery = document.getElementById('ordersSearchInput')?.value.trim() || '';
    orderFilterStatus = document.getElementById('ordersStatusFilter')?.value || '';
    
    loadOrders(false);
}

/**
 * إعادة تعيين فلاتر الطلبات
 */
function resetOrdersFilter() {
    orderSearchQuery = '';
    orderFilterStatus = '';
    
    const searchInput = document.getElementById('ordersSearchInput');
    const statusFilter = document.getElementById('ordersStatusFilter');
    
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    
    loadOrders(false);
}

/**
 * تحديث حالة الطلب
 */
async function updateOrderStatus(orderId, newStatus) {
    try {
        const { db, firebaseModules } = window;
        await firebaseModules.updateDoc(firebaseModules.doc(db, 'orders', orderId), {
            status: newStatus,
            updatedAt: firebaseModules.serverTimestamp()
        });
        
        const statusInfo = getOrderStatusInfo(newStatus);
        window.adminUtils.showToast(`✅ تم تحديث حالة الطلب إلى: ${statusInfo.text}`, 'success');
        
        const order = allOrders.find(o => o.id === orderId);
        if (order) {
            order.status = newStatus;
            displayOrderCards();
        }
        
        closeOrderDetails();
    } catch (error) {
        console.error('❌ خطأ في تحديث حالة الطلب:', error);
        window.adminUtils.showToast('حدث خطأ في تحديث حالة الطلب', 'error');
    }
}

/**
 * حذف طلب
 */
async function deleteOrder(orderId) {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا الطلب نهائياً؟')) return;
    
    try {
        const { db, firebaseModules } = window;
        await firebaseModules.deleteDoc(firebaseModules.doc(db, 'orders', orderId));
        window.adminUtils.showToast('✅ تم حذف الطلب', 'success');
        allOrders = allOrders.filter(o => o.id !== orderId);
        displayOrderCards();
    } catch (error) {
        console.error('❌ خطأ في حذف الطلب:', error);
        window.adminUtils.showToast('حدث خطأ في حذف الطلب', 'error');
    }
}

// تصدير الدوال للاستخدام العام
window.loadOrders = loadOrders;
window.applyOrdersFilter = applyOrdersFilter;
window.resetOrdersFilter = resetOrdersFilter;
window.openOrderDetails = openOrderDetails;
window.closeOrderDetails = closeOrderDetails;
window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder;
