// orders-system.js - إدارة طلبات المستخدم
// ======================== طلباتي ========================

async function loadMyOrders() {
    const ordersList = document.getElementById('myOrdersList');
    const emptyMessage = document.getElementById('emptyOrdersMessage');
    
    if (!ordersList) return;
    
    if (isGuest && !currentUser) {
        ordersList.innerHTML = '';
        if (emptyMessage) emptyMessage.style.display = 'block';
        return;
    }
    
    if (!currentUser) {
        ordersList.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <i class="fas fa-user-clock fa-3x" style="color: var(--gray-color); margin-bottom: 20px;"></i>
                <h3 style="color: var(--primary-color); margin-bottom: 10px;">الدخول مطلوب</h3>
                <p style="color: var(--gray-color); margin-bottom: 20px;">يجب تسجيل الدخول لعرض الطلبات السابقة</p>
                <button onclick="showAuthScreen()" class="btn-primary" style="padding: 12px 25px;">
                    <i class="fas fa-sign-in-alt"></i> تسجيل الدخول
                </button>
            </div>
        `;
        if (emptyMessage) emptyMessage.style.display = 'none';
        return;
    }
    
    ordersList.innerHTML = '<div class="spinner"></div>';
    if (emptyMessage) emptyMessage.style.display = 'none';

    try {
        const ordersRef = window.firebaseModules.collection(db, "orders");
        
        const q = window.firebaseModules.query(
            ordersRef,
            window.firebaseModules.where("userId", "==", currentUser.uid)
        );

        const querySnapshot = await window.firebaseModules.getDocs(q);

        if (querySnapshot.empty) {
            ordersList.innerHTML = '';
            if (emptyMessage) emptyMessage.style.display = 'block';
            return;
        }

        let ordersHTML = '';
        
        const ordersArray = [];
        querySnapshot.forEach(doc => {
            const order = doc.data();
            order.id = doc.id;
            ordersArray.push(order);
        });
        
        // الترتيب يدوياً حسب التاريخ (من الأحدث للأقدم)
        ordersArray.sort((a, b) => {
            let dateA, dateB;
            
            try {
                dateA = a.createdAt?.toDate ? a.createdAt.toDate() : 
                       a.createdAt ? new Date(a.createdAt) : new Date(0);
                dateB = b.createdAt?.toDate ? b.createdAt.toDate() : 
                       b.createdAt ? new Date(b.createdAt) : new Date(0);
            } catch (e) {
                dateA = new Date(0);
                dateB = new Date(0);
            }
            
            return dateB - dateA;
        });
        
        ordersArray.forEach(order => {
            let date = 'غير محدد';
            try {
                if (order.createdAt) {
                    if (order.createdAt.toDate) {
                        date = order.createdAt.toDate().toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    } else if (order.createdAt instanceof Date) {
                        date = order.createdAt.toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    } else if (typeof order.createdAt === 'string') {
                        const dateObj = new Date(order.createdAt);
                        date = dateObj.toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    }
                }
            } catch (e) {
                console.error('Error parsing date:', e);
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
            
            const hasReceipt = order.receiptImage || order.receiptUrl;
            
            const statuses = ['pending', 'paid', 'processing', 'shipped', 'delivered'];
            const currentStatusIndex = statuses.indexOf(order.status || 'pending');
            const isCancelled = order.status === 'cancelled';
            const progressWidth = isCancelled ? 0 : (currentStatusIndex / (statuses.length - 1)) * 100;

            ordersHTML += `
                <div class="order-card ${isCancelled ? 'cancelled-order' : ''}">
                    <div class="order-header">
                        <div>
                            <span class="order-id">طلب #${order.orderId || order.id}</span>
                            <span class="order-date">${date}</span>
                        </div>
                        <span class="order-status-badge ${statusClass}">${statusText}</span>
                    </div>

                    ${!isCancelled ? `
                    <!-- نظام تتبع الطلب -->
                    <div class="order-tracking">
                        <div class="tracking-steps">
                            <div class="tracking-line-fill" style="width: ${progressWidth}%"></div>
                            <div class="step ${currentStatusIndex >= 0 ? (currentStatusIndex > 0 ? 'completed' : 'active') : ''}">
                                <div class="step-icon"><i class="fas fa-clock"></i></div>
                                <div class="step-label">قيد الانتظار</div>
                            </div>
                            <div class="step ${currentStatusIndex >= 1 ? (currentStatusIndex > 1 ? 'completed' : 'active') : ''}">
                                <div class="step-icon"><i class="fas fa-check-double"></i></div>
                                <div class="step-label">تم الدفع</div>
                            </div>
                            <div class="step ${currentStatusIndex >= 2 ? (currentStatusIndex > 2 ? 'completed' : 'active') : ''}">
                                <div class="step-icon"><i class="fas fa-box-open"></i></div>
                                <div class="step-label">جاري التجهيز</div>
                            </div>
                            <div class="step ${currentStatusIndex >= 3 ? (currentStatusIndex > 3 ? 'completed' : 'active') : ''}">
                                <div class="step-icon"><i class="fas fa-truck"></i></div>
                                <div class="step-label">خرج للتوصيل</div>
                            </div>
                            <div class="step ${currentStatusIndex >= 4 ? (currentStatusIndex > 4 ? 'completed' : 'active') : ''}">
                                <div class="step-icon"><i class="fas fa-home"></i></div>
                                <div class="step-label">تم التسليم</div>
                            </div>
                        </div>
                    </div>
                    ` : `
                    <div class="cancelled-message">
                        <i class="fas fa-times-circle"></i> تم إلغاء هذا الطلب
                    </div>
                    `}

                    <div class="order-body">
                        <div class="order-info">
                            <h5>تفاصيل الطلب</h5>
                            <p><strong>العنوان:</strong> ${order.address || 'غير محدد'}</p>
                            ${order.notes ? `<p><strong>ملاحظات:</strong> ${order.notes}</p>` : ''}
                            <p><strong>طريقة الدفع:</strong> تحويل بنكي</p>
                            ${hasReceipt ? `
                                <p><strong>حالة الإيصال:</strong> <span style="color: var(--success-color);">✓ مرفق</span></p>
                            ` : ''}
                        </div>
                        <div class="order-items">
                            <h5>المنتجات (${order.items?.length || 0})</h5>
                            ${(order.items || []).map(item => `
                                <div class="order-item-row">
                                    <span>${item.name || 'منتج'} × ${item.quantity || 1}</span>
                                    <span>${formatNumber(item.total || item.price || 0)} ${siteCurrency}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="order-footer">
                        <div class="order-total">الإجمالي: ${formatNumber(order.total || 0)} ${siteCurrency}</div>
                        ${hasReceipt ? `
                            <button onclick="viewReceipt('${hasReceipt}')" class="btn-secondary" style="padding: 8px 15px; font-size: 14px;">
                                <i class="fas fa-image"></i> عرض الإيصال
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        ordersList.innerHTML = ordersHTML;
        if (emptyMessage) emptyMessage.style.display = 'none';

    } catch (error) {
        console.error('Error loading orders:', error);
        ordersList.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--danger-color);">
                <i class="fas fa-exclamation-triangle fa-3x" style="margin-bottom: 20px;"></i>
                <h3>حدث خطأ أثناء تحميل الطلبات</h3>
                <p>${error.message}</p>
                <button onclick="loadMyOrders()" class="btn-primary" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> حاول مرة أخرى
                </button>
            </div>
        `;
    }
}

function viewReceipt(imageSrc) {
    if (!imageSrc) {
        if (typeof showToast === 'function') showToast('لا يوجد إيصال مرفق', 'warning');
        return;
    }
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        cursor: pointer;
    `;
    
    modal.innerHTML = `
        <div style="position: relative; max-width: 90%; max-height: 90%;">
            <img src="${imageSrc}" 
                 style="max-width: 100%; max-height: 80vh; border-radius: 10px; border: 2px solid white;"
                 onerror="this.onerror=null; this.src='https://cdn-icons-png.flaticon.com/512/1178/1178479.png';">
            <div style="position: absolute; bottom: -50px; left: 0; right: 0; text-align: center;">
                <button onclick="downloadImage('${imageSrc}', 'إيصال_طلب.jpg')" 
                        class="btn-primary" 
                        style="padding: 10px 20px; margin-right: 10px;">
                    <i class="fas fa-download"></i> تحميل
                </button>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                        class="btn-secondary" 
                        style="padding: 10px 20px;">
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

function downloadImage(src, filename) {
    const link = document.createElement('a');
    link.href = src;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ======================== التصدير للاستخدام العام ========================

window.loadMyOrders = loadMyOrders;
window.viewReceipt = viewReceipt;
window.downloadImage = downloadImage;

console.log('✅ orders-system.js loaded');