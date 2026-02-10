// orders-system.js - إدارة طلبات المستخدم مع التحميل اللانهائي
// ======================== طلباتي ========================

// allOrdersArray معرف مسبقاً في app-core.js
let lastOrderDoc = null;
let hasMoreOrders = true;
const ORDERS_PER_PAGE = 5;
let isOrdersLoading = false;

async function loadMyOrders(isNextPage = false) {
    // العناصر في index.html هي myOrdersList و emptyOrdersMessage
    const ordersList = document.getElementById('myOrdersList');
    const emptyMessage = document.getElementById('emptyOrdersMessage');
    
    if (!ordersList) {
        console.error('❌ لم يتم العثور على عنصر myOrdersList في الصفحة');
        return;
    }
    
    if (!currentUser) {
        ordersList.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <i class="fas fa-user-clock fa-3x" style="color: #ccc; margin-bottom: 20px;"></i>
                <h3 style="color: var(--primary-color); margin-bottom: 10px;">الدخول مطلوب</h3>
                <p style="color: #888; margin-bottom: 20px;">يجب تسجيل الدخول لعرض الطلبات السابقة</p>
                <button onclick="showAuthScreen()" class="btn-primary" style="padding: 12px 25px; border-radius: 10px; border: none; background: var(--primary-color); color: white; cursor: pointer;">
                    <i class="fas fa-sign-in-alt"></i> تسجيل الدخول
                </button>
            </div>
        `;
        if (emptyMessage) emptyMessage.style.display = 'none';
        return;
    }

    if (isOrdersLoading || (isNextPage && !hasMoreOrders)) return;

    isOrdersLoading = true;
    
    if (!isNextPage) {
        ordersList.innerHTML = '<div style="text-align:center; padding:20px;"><div class="loading-spinner-small"></div></div>';
        if (typeof allOrdersArray !== 'undefined') allOrdersArray = [];
        lastOrderDoc = null;
        hasMoreOrders = true;
    }

    const loader = document.getElementById('ordersLoader');
    if (loader && isNextPage) loader.style.display = 'block';

    try {
        const ordersRef = window.firebaseModules.collection(db, "orders");
        
        let q;
        if (isNextPage && lastOrderDoc) {
            q = window.firebaseModules.query(
                ordersRef,
                window.firebaseModules.where("userId", "==", currentUser.uid),
                window.firebaseModules.orderBy("createdAt", "desc"),
                window.firebaseModules.startAfter(lastOrderDoc),
                window.firebaseModules.limit(ORDERS_PER_PAGE)
            );
        } else {
            q = window.firebaseModules.query(
                ordersRef,
                window.firebaseModules.where("userId", "==", currentUser.uid),
                window.firebaseModules.orderBy("createdAt", "desc"),
                window.firebaseModules.limit(ORDERS_PER_PAGE)
            );
        }

        const querySnapshot = await window.firebaseModules.getDocs(q);

        if (querySnapshot.empty) {
            hasMoreOrders = false;
            if (!isNextPage) {
                ordersList.innerHTML = '';
                if (emptyMessage) emptyMessage.style.display = 'block';
            }
            if (loader) loader.style.display = 'none';
            return;
        }

        lastOrderDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        if (querySnapshot.docs.length < ORDERS_PER_PAGE) {
            hasMoreOrders = false;
        }

        const newOrders = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date())
            };
        });
        
        window.allOrdersArray = [...window.allOrdersArray, ...newOrders];
        
        renderOrdersList(newOrders, isNextPage);
        
        if (emptyMessage) emptyMessage.style.display = 'none';

    } catch (error) {
        console.error('Error loading orders:', error);
        if (error.message.includes('index')) {
            console.warn('⚠️ يتطلب هذا الاستعلام إنشاء فهرس في Firebase Console.');
        }
        if (!isNextPage) {
            ordersList.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle fa-3x" style="margin-bottom: 20px;"></i>
                    <h3>حدث خطأ أثناء تحميل الطلبات</h3>
                    <p>يرجى المحاولة مرة أخرى لاحقاً</p>
                </div>
            `;
        }
    } finally {
        isOrdersLoading = false;
        if (loader) loader.style.display = 'none';
    }
}

window.renderOrdersList = function(ordersToRender, append = false) {
    const ordersList = document.getElementById('myOrdersList');
    if (!ordersList) return;

    const ordersHTML = ordersToRender.map(order => {
        const dateStr = order.createdAt.toLocaleDateString('ar-EG', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        
        const statusMap = {
            'pending': { text: 'قيد الانتظار', class: 'status-pending', icon: 'fa-clock' },
            'paid': { text: 'تم الدفع', class: 'status-paid', icon: 'fa-check-double' },
            'processing': { text: 'جاري التجهيز', class: 'status-processing', icon: 'fa-box-open' },
            'shipped': { text: 'خرج للتوصيل', class: 'status-shipped', icon: 'fa-truck' },
            'delivered': { text: 'تم التسليم', class: 'status-delivered', icon: 'fa-home' },
            'cancelled': { text: 'ملغي', class: 'status-cancelled', icon: 'fa-times-circle' }
        };
        
        const status = statusMap[order.status] || statusMap['pending'];
        const isCancelled = order.status === 'cancelled';
        const hasReceipt = order.receiptImage || order.receiptUrl;

        return `
            <div class="order-card ${isCancelled ? 'cancelled-order' : ''}" style="background: white; border-radius: 15px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #eee;">
                <div class="order-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; border-bottom: 1px solid #f5f5f5; padding-bottom: 10px;">
                    <div>
                        <div style="font-weight: 700; color: var(--primary-color); font-size: 16px;">طلب #${order.orderId || order.id.substring(0, 8)}</div>
                        <div style="font-size: 12px; color: #888; margin-top: 4px;"><i class="far fa-calendar-alt"></i> ${dateStr}</div>
                    </div>
                    <span class="order-status-badge ${status.class}" style="padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                        <i class="fas ${status.icon}"></i> ${status.text}
                    </span>
                </div>

                <div class="order-body" style="margin-bottom: 15px;">
                    <div style="font-size: 14px; color: #555; margin-bottom: 10px;">
                        <div style="margin-bottom: 5px;"><strong>العنوان:</strong> ${order.address || 'غير محدد'}</div>
                        <div style="margin-bottom: 5px;"><strong>المنتجات:</strong> ${(order.items || []).length} منتجات</div>
                    </div>
                    <div class="order-items-mini" style="background: #f9f9f9; border-radius: 10px; padding: 10px;">
                        ${(order.items || []).slice(0, 2).map(item => `
                            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
                                <span>${item.name} × ${item.quantity}</span>
                                <span>${formatNumber(item.price * item.quantity)} ${siteCurrency}</span>
                            </div>
                        `).join('')}
                        ${(order.items || []).length > 2 ? `<div style="font-size: 12px; color: #888; text-align: center; margin-top: 5px;">+ ${(order.items || []).length - 2} منتجات أخرى</div>` : ''}
                    </div>
                </div>

                <div class="order-footer" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f5f5f5; padding-top: 15px;">
                    <div style="font-weight: 700; font-size: 18px; color: var(--secondary-color);">${formatNumber(order.total || 0)} ${siteCurrency}</div>
                    <div style="display: flex; gap: 10px;">
                        ${hasReceipt ? `
                            <button onclick="viewReceipt('${hasReceipt}')" class="btn-secondary" style="padding: 8px 15px; font-size: 13px; border-radius: 8px; border: 1px solid #ddd; background: white; cursor: pointer;">
                                <i class="fas fa-image"></i> الإيصال
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (append) {
        // إزالة اللودر القديم قبل الإضافة
        const oldLoader = document.getElementById('ordersLoader');
        if (oldLoader) oldLoader.remove();
        ordersList.insertAdjacentHTML('beforeend', ordersHTML);
    } else {
        ordersList.innerHTML = ordersHTML;
    }

    // إضافة اللودر في النهاية إذا كان هناك المزيد
    if (hasMoreOrders) {
        const loaderHTML = `
            <div id="ordersLoader" style="text-align: center; padding: 20px; color: #888; display: none;">
                <div class="loading-spinner-small" style="display: inline-block; margin-right: 10px;"></div>
                جاري تحميل المزيد من الطلبات...
            </div>
        `;
        ordersList.insertAdjacentHTML('beforeend', loaderHTML);
    }
};

function viewReceipt(imageSrc) {
    if (!imageSrc) return;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.9); display: flex; justify-content: center;
        align-items: center; z-index: 10000; cursor: pointer;
    `;
    
    modal.innerHTML = `
        <div style="position: relative; max-width: 90%; max-height: 90%;">
            <img src="${imageSrc}" style="max-width: 100%; max-height: 80vh; border-radius: 10px; border: 2px solid white;">
            <div style="text-align: center; margin-top: 20px;">
                <button class="btn-primary" style="padding: 10px 25px; border-radius: 10px; border: none; background: white; color: black; font-weight: 700;">إغلاق</button>
            </div>
        </div>
    `;
    
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
}

window.loadMyOrders = loadMyOrders;
window.viewReceipt = viewReceipt;
window.renderOrdersList = renderOrdersList;
