// orders-system.js - إدارة طلبات المستخدم مع التحميل اللانهائي (إصدار احترافي كامل)
// ======================== طلباتي ========================

let lastOrderDoc = null;
let hasMoreOrders = true;
const ORDERS_PER_PAGE = 5;
let isOrdersLoading = false;
let ordersObserver = null;

/**
 * دالة لإعادة ضبط حالة الطلبات
 */
function resetOrdersState() {
    console.log('📦 Resetting orders state from orders-system');
    lastOrderDoc = null;
    hasMoreOrders = true;
    isOrdersLoading = false;
}

/**
 * إنشاء شريط تتبع المراحل الأفقي (مع تنظيف البيانات)
 */
window.renderOrderStages = function(status) {
    const stages = [
        { key: 'pending', label: 'قيد الانتظار', icon: 'fa-clock' },
        { key: 'paid', label: 'تم الدفع', icon: 'fa-check-double' },
        { key: 'processing', label: 'جاري التجهيز', icon: 'fa-box-open' },
        { key: 'shipped', label: 'خرج للتوصيل', icon: 'fa-truck' },
        { key: 'delivered', label: 'تم التسليم', icon: 'fa-home' }
    ];

    const statusColors = {
        'pending': '#000000',
        'paid': '#27ae60',
        'processing': '#e67e22',
        'shipped': '#f1c40f',
        'delivered': '#3498db',
        'cancelled': '#e74c3c'
    };

    if (status === 'cancelled') {
        return `
            <div style="margin: 20px 0; padding: 15px; background: #fff5f5; border-radius: 10px; text-align: center; border-right: 4px solid #e74c3c;">
                <i class="fas fa-times-circle" style="color: #e74c3c; font-size: 20px; margin-left: 8px;"></i>
                <span style="color: #e74c3c; font-weight: 600;">تم إلغاء هذا الطلب</span>
            </div>
        `;
    }

    const activeIndex = stages.findIndex(s => s.key === status);
    if (activeIndex === -1) return '';

    return `
        <div style="margin: 20px 0; padding: 15px 5px; background: #f8f9fa; border-radius: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; position: relative;">
                <div style="position: absolute; top: 18px; left: 15%; right: 15%; height: 2px; background: #e0e0e0; z-index: 1;">
                    <div style="
                        height: 100%; 
                        width: ${(activeIndex / (stages.length - 1)) * 100}%; 
                        background: #27ae60;
                        transition: width 0.5s ease;
                    "></div>
                </div>
                
                ${stages.map((stage, index) => {
                    const isActive = index <= activeIndex;
                    const isCurrent = index === activeIndex;
                    
                    return `
                        <div style="flex: 1; text-align: center; position: relative; z-index: 2;">
                            <div style="
                                width: 36px; 
                                height: 36px; 
                                background: ${isCurrent ? statusColors[status] : (isActive ? '#9e9e9e' : '#e0e0e0')}; 
                                border-radius: 50%; 
                                margin: 0 auto 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: white;
                                font-size: 16px;
                                box-shadow: ${isCurrent ? `0 0 0 3px ${statusColors[status]}33` : 'none'};
                                transition: all 0.3s ease;
                            ">
                                <i class="fas ${stage.icon}"></i>
                            </div>
                            <div style="
                                font-size: 12px; 
                                font-weight: ${isActive ? '600' : '400'}; 
                                color: ${isCurrent ? statusColors[status] : (isActive ? '#666' : '#999')};
                                white-space: nowrap;
                            ">${stage.label}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
};

/**
 * تهيئة مراقب التمرير لصفحة الطلبات
 */
function setupOrdersInfiniteScroll() {
    const ordersList = document.getElementById('myOrdersList');
    if (!ordersList) return;

    // إزالة الحارس القديم إذا وجد
    const oldSentinel = document.getElementById('ordersScrollSentinel');
    if (oldSentinel) {
        oldSentinel.remove();
    }

    // إنشاء حارس جديد
    const sentinel = document.createElement('div');
    sentinel.id = 'ordersScrollSentinel';
    sentinel.style.height = '20px';
    sentinel.style.width = '100%';
    sentinel.style.marginTop = '10px';
    sentinel.style.marginBottom = '10px';
    sentinel.style.background = 'transparent';
    sentinel.style.pointerEvents = 'none';
    
    ordersList.parentNode?.appendChild(sentinel);

    // إيقاف المراقب القديم
    if (ordersObserver) {
        ordersObserver.disconnect();
    }

    // إنشاء مراقب جديد
    ordersObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && hasMoreOrders && !isOrdersLoading) {
                console.log('📦 [Observer] تحميل المزيد من الطلبات');
                loadMyOrders(true);
            }
        });
    }, {
        root: null,
        rootMargin: '300px',
        threshold: 0.01
    });

    ordersObserver.observe(sentinel);
    console.log('✅ Infinite scroll initialized for orders');
}

/**
 * تحميل طلبات المستخدم من Firestore
 */
async function loadMyOrders(isNextPage = false) {
    console.log('📦 Loading orders, next page:', isNextPage);
    
    const ordersList = document.getElementById('myOrdersList');
    const emptyMessage = document.getElementById('emptyOrdersMessage');
    
    if (!ordersList) {
        console.error('❌ ordersList element not found');
        return;
    }
    
    // التحقق من تسجيل الدخول - دعم مصادر متعددة للمستخدم
    const user = window.currentUser || 
                 (typeof auth !== 'undefined' ? auth.currentUser : null) || 
                 (window.AppState?.user) ||
                 (window.firebaseModules?.getAuth ? window.firebaseModules.getAuth().currentUser : null);
                 
    if (!user) {
        console.log('👤 No user logged in');
        ordersList.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; background: white; border-radius: 15px;">
                <i class="fas fa-user-lock fa-3x" style="color: #ccc; margin-bottom: 20px;"></i>
                <h3 style="color: var(--primary-color); margin-bottom: 10px;">الدخول مطلوب</h3>
                <p style="color: #888; margin-bottom: 20px;">يجب تسجيل الدخول لعرض الطلبات السابقة</p>
                <button onclick="showAuthScreen ? showAuthScreen() : (window.location.href='login.html')" class="btn-primary" style="padding: 12px 25px; border-radius: 10px; border: none; background: var(--primary-color); color: white; cursor: pointer;">
                    <i class="fas fa-sign-in-alt"></i> تسجيل الدخول
                </button>
            </div>
        `;
        if (emptyMessage) emptyMessage.style.display = 'none';
        return;
    }

    // منع التحميل المتكرر
    if (isOrdersLoading) {
        console.log('⏳ Already loading orders');
        return;
    }
    
    if (isNextPage && !hasMoreOrders) {
        console.log('📭 No more orders to load');
        return;
    }

    isOrdersLoading = true;
    
    // عرض محمل التحميل للصفحة الأولى فقط
    if (!isNextPage) {
        ordersList.innerHTML = `
            <div style="text-align:center; padding:40px; background: white; border-radius: 15px;">
                <div class="modern-loader" style="margin: 0 auto; width: 40px; height: 40px;"></div>
                <p style="margin-top:15px; color:#888;">جاري تحميل طلباتك...</p>
            </div>
        `;
        lastOrderDoc = null;
        hasMoreOrders = true;
        if (window.allOrdersArray) window.allOrdersArray = [];
        
        // إزالة الحارس القديم
        const oldSentinel = document.getElementById('ordersScrollSentinel');
        if (oldSentinel) oldSentinel.remove();
    }

    // عرض محمل التحميل للصفحات التالية
    if (isNextPage) {
        const loader = document.getElementById('ordersLoader');
        if (loader) loader.style.display = 'block';
    }

    try {
        // الحصول على مرجع Firebase
        const db = window.firebaseDb || window.db;
        if (!db || !window.firebaseModules) {
            throw new Error('Firebase not initialized');
        }

        const ordersRef = window.firebaseModules.collection(db, "orders");
        let constraints = [];
        
        // إضافة شرط المستخدم أولاً
        constraints.push(window.firebaseModules.where("userId", "==", user.uid));
        
        // إضافة الترتيب
        constraints.push(window.firebaseModules.orderBy("createdAt", "desc"));

        // إضافة نقطة البداية للصفحات التالية
        if (isNextPage && lastOrderDoc) {
            constraints.push(window.firebaseModules.startAfter(lastOrderDoc));
        }
        
        // إضافة الحد الأقصى
        constraints.push(window.firebaseModules.limit(ORDERS_PER_PAGE));

        // تنفيذ الاستعلام
        const q = window.firebaseModules.query(ordersRef, ...constraints);
        const querySnapshot = await window.firebaseModules.getDocs(q);

        console.log(`📦 Found ${querySnapshot.size} orders`);

        // التحقق من النتائج
        if (querySnapshot.empty) {
            hasMoreOrders = false;
            if (!isNextPage) {
                ordersList.innerHTML = '';
                if (emptyMessage) emptyMessage.style.display = 'block';
            }
            
            // إخفاء المحمل
            const loader = document.getElementById('ordersLoader');
            if (loader) loader.style.display = 'none';
            
            isOrdersLoading = false;
            return;
        }

        // إخفاء رسالة عدم وجود طلبات
        if (emptyMessage) emptyMessage.style.display = 'none';

        // تحديث آخر مستند للصفحة التالية
        lastOrderDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        hasMoreOrders = querySnapshot.docs.length === ORDERS_PER_PAGE;

        // معالجة البيانات
        const newOrders = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date())
            };
        });
        
        // تخزين في المصفوفة العامة
        if (!window.allOrdersArray) window.allOrdersArray = [];
        window.allOrdersArray = [...window.allOrdersArray, ...newOrders];
        
        // عرض الطلبات
        renderOrdersList(newOrders, isNextPage);
        
        // تهيئة التمرير اللانهائي للصفحة الأولى
        if (!isNextPage) {
            setTimeout(() => {
                setupOrdersInfiniteScroll();
            }, 100);
        }

    } catch (error) {
        console.error('❌ Error loading orders:', error);
        if (!isNextPage) {
            ordersList.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; background: white; border-radius: 15px; color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle fa-3x" style="margin-bottom: 20px;"></i>
                    <h3>حدث خطأ أثناء تحميل الطلبات</h3>
                    <p style="color: #666; margin: 10px 0;">يرجى التأكد من اتصالك بالإنترنت والمحاولة مرة أخرى</p>
                    <button onclick="loadMyOrders(false)" class="btn-primary" style="margin-top:15px; background:#e74c3c; border:none; padding:10px 30px; border-radius:8px; color:white; cursor:pointer;">
                        <i class="fas fa-redo"></i> إعادة المحاولة
                    </button>
                </div>
            `;
        }
    } finally {
        isOrdersLoading = false;
        
        // إخفاء محمل التحميل
        const loader = document.getElementById('ordersLoader');
        if (loader) loader.style.display = 'none';
    }
}

/**
 * عرض قائمة الطلبات في الواجهة (مع تنظيف البيانات وجميع الميزات)
 */
function renderOrdersList(ordersToRender, append = false) {
    const ordersList = document.getElementById('myOrdersList');
    if (!ordersList) return;

    console.log(`📦 Rendering ${ordersToRender.length} orders, append: ${append}`);

    const statusColors = {
        'pending': '#000000',
        'paid': '#27ae60',
        'processing': '#e67e22',
        'shipped': '#f1c40f',
        'delivered': '#3498db',
        'cancelled': '#e74c3c'
    };

    const currency = window.siteCurrency || 'SDG';
    
    const formatNumber = window.formatNumber || function(num) {
        return num.toLocaleString('ar-EG');
    };
    
    // إنشاء HTML لكل طلب
    const ordersHTML = ordersToRender.map(order => {
        // تنظيف البيانات قبل العرض (إذا كانت دوال الأمان متوفرة)
        const safeOrderId = (window.SecurityCore?.sanitizeHTML ? 
            window.SecurityCore.sanitizeHTML(order.orderId || order.id.substring(0, 8)) : 
            (order.orderId || order.id.substring(0, 8)));
            
        const safeAddress = (window.SecurityCore?.sanitizeHTML ? 
            window.SecurityCore.sanitizeHTML(order.address || 'غير محدد') : 
            (order.address || 'غير محدد'));
            
        const safePhone = (window.SecurityCore?.sanitizeHTML ? 
            window.SecurityCore.sanitizeHTML(order.phone || '') : 
            (order.phone || ''));
            
        const safeUserName = (window.SecurityCore?.sanitizeHTML ? 
            window.SecurityCore.sanitizeHTML(order.userName || '') : 
            (order.userName || ''));

        // تنسيق التاريخ
        let dateStr = 'تاريخ غير محدد';
        try {
            if (order.createdAt) {
                dateStr = order.createdAt.toLocaleDateString('ar-EG', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });
            }
        } catch (e) {
            console.warn('Date formatting error:', e);
        }
        
        // حالة الطلب
        const statusMap = {
            'pending': { text: 'قيد الانتظار', icon: 'fa-clock' },
            'paid': { text: 'تم الدفع', icon: 'fa-check-double' },
            'processing': { text: 'جاري التجهيز', icon: 'fa-box-open' },
            'shipped': { text: 'خرج للتوصيل', icon: 'fa-truck' },
            'delivered': { text: 'تم التسليم', icon: 'fa-home' },
            'cancelled': { text: 'ملغي', icon: 'fa-times-circle' }
        };
        
        const status = statusMap[order.status] || statusMap['pending'];
        const isCancelled = order.status === 'cancelled';

        return `
            <div class="order-card ${isCancelled ? 'cancelled-order' : ''}" style="background: white; border-radius: 15px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #eee; transition: transform 0.2s ease;">
                <!-- رأس الطلب -->
                <div class="order-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; border-bottom: 1px solid #f5f5f5; padding-bottom: 10px;">
                    <div>
                        <div style="font-weight: 700; color: var(--primary-color); font-size: 16px;">
                            <i class="fas fa-receipt" style="margin-left: 5px;"></i>
                            طلب #${safeOrderId}
                        </div>
                        <div style="font-size: 12px; color: #888; margin-top: 4px;">
                            <i class="far fa-calendar-alt"></i> ${dateStr}
                        </div>
                    </div>
                    <span class="order-status-badge" style="padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: ${isCancelled ? '#fee' : '#fff3e0'}; color: ${statusColors[order.status] || '#f39c12'}; border: 1px solid ${statusColors[order.status]}40;">
                        <i class="fas ${status.icon}"></i> ${status.text}
                    </span>
                </div>

                <!-- مراحل الطلب -->
                ${window.renderOrderStages(order.status)}

                <!-- محتوى الطلب -->
                <div class="order-body" style="margin-bottom: 15px;">
                    <div style="font-size: 14px; color: #555; margin-bottom: 10px;">
                        ${safeAddress ? `
                        <div style="margin-bottom: 5px;">
                            <strong><i class="fas fa-map-marker-alt" style="color: #e74c3c;"></i> العنوان:</strong> 
                            ${safeAddress}
                        </div>
                        ` : ''}
                        ${safePhone ? `
                        <div style="margin-bottom: 5px;">
                            <strong><i class="fas fa-phone" style="color: #27ae60;"></i> الهاتف:</strong> 
                            ${safePhone}
                        </div>
                        ` : ''}
                        <div style="margin-bottom: 5px;">
                            <strong><i class="fas fa-box" style="color: #3498db;"></i> المنتجات:</strong> 
                            ${(order.items || []).length} منتجات
                        </div>
                    </div>
                    
                    <!-- المنتجات المصغرة -->
                    <div class="order-items-mini" style="background: #f9f9f9; border-radius: 10px; padding: 10px;">
                        ${(order.items || []).slice(0, 3).map(item => {
                            const safeItemName = (window.SecurityCore?.sanitizeHTML ? 
                                window.SecurityCore.sanitizeHTML(item.name) : 
                                item.name);
                            return `
                            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #eee;">
                                <span>${safeItemName} × ${item.quantity}</span>
                                <span style="font-weight:600;">${formatNumber(item.price * item.quantity)} ${currency}</span>
                            </div>
                        `}).join('')}
                        ${(order.items || []).length > 3 ? `
                            <div style="font-size: 12px; color: #888; text-align: center; margin-top: 5px;">
                                + ${(order.items || []).length - 3} منتجات أخرى
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- تذييل الطلب مع الأزرار -->
                <div class="order-footer" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f5f5f5; padding-top: 15px; gap: 10px;">
                    <div style="font-weight: 800; font-size: 18px; color: var(--secondary-color);">
                        ${formatNumber(order.total || 0)} ${currency}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="viewOrderReceipt('${order.id}')" class="btn-receipt" style="padding: 8px 16px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #555; transition: all 0.2s; display: flex; align-items: center; gap: 5px;">
                            <i class="fas fa-file-invoice"></i> عرض الإيصال
                        </button>
                        <button onclick="downloadOrderReceipt('${order.id}')" class="btn-receipt" style="padding: 8px 16px; background: var(--secondary-color); border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: white; transition: all 0.2s; display: flex; align-items: center; gap: 5px;">
                            <i class="fas fa-download"></i> تحميل PDF
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // إضافة الطلبات إلى الصفحة
    if (append) {
        // إزالة المحمل القديم إذا كان موجوداً
        const oldLoader = document.getElementById('ordersLoader');
        if (oldLoader) oldLoader.remove();
        
        ordersList.insertAdjacentHTML('beforeend', ordersHTML);
    } else {
        ordersList.innerHTML = ordersHTML;
    }

    // إضافة محمل التحميل إذا كان هناك المزيد
    if (hasMoreOrders) {
        // إزالة المحمل القديم
        const oldLoader = document.getElementById('ordersLoader');
        if (oldLoader) oldLoader.remove();
        
        // إضافة محمل جديد
        const loaderHTML = `
            <div id="ordersLoader" style="text-align: center; padding: 20px; color: #888;">
                <div class="modern-loader" style="width: 24px; height: 24px; border-width: 2px; display: inline-block; vertical-align: middle; margin-left: 10px;"></div>
                جاري تحميل المزيد...
            </div>
        `;
        ordersList.insertAdjacentHTML('beforeend', loaderHTML);
    }
}

/**
 * عرض إيصال الطلب في نافذة منبثقة (مع جميع الميزات)
 */
async function viewOrderReceipt(orderId) {
    try {
        const db = window.firebaseDb || window.db;
        if (!db) {
            alert('خطأ في الاتصال بقاعدة البيانات');
            return;
        }

        const orderDoc = await window.firebaseModules.getDoc(
            window.firebaseModules.doc(db, 'orders', orderId)
        );

        if (!orderDoc.exists()) {
            alert('الطلب غير موجود');
            return;
        }

        const order = { id: orderDoc.id, ...orderDoc.data() };
        const currency = window.siteCurrency || 'SDG';
        const formatNumber = window.formatNumber || function(num) {
            return num.toLocaleString('ar-EG');
        };

        // تنسيق التاريخ
        let dateStr = 'غير محدد';
        try {
            if (order.createdAt) {
                const date = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
                dateStr = date.toLocaleDateString('ar-EG', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });
            }
        } catch (e) {
            console.warn('Date formatting error:', e);
        }

        // حالة الطلب
        const statusMap = {
            'pending': 'قيد الانتظار',
            'paid': 'تم الدفع',
            'processing': 'جاري التجهيز',
            'shipped': 'خرج للتوصيل',
            'delivered': 'تم التسليم',
            'cancelled': 'ملغي'
        };

        // تنظيف البيانات للعرض
        const safeOrderId = (window.SecurityCore?.sanitizeHTML ? 
            window.SecurityCore.sanitizeHTML(order.orderId || order.id.substring(0, 8)) : 
            (order.orderId || order.id.substring(0, 8)));
            
        const safeUserName = (window.SecurityCore?.sanitizeHTML ? 
            window.SecurityCore.sanitizeHTML(order.userName || 'غير محدد') : 
            (order.userName || 'غير محدد'));
            
        const safeUserEmail = (window.SecurityCore?.sanitizeHTML ? 
            window.SecurityCore.sanitizeHTML(order.userEmail || '') : 
            (order.userEmail || ''));
            
        const safePhone = (window.SecurityCore?.sanitizeHTML ? 
            window.SecurityCore.sanitizeHTML(order.phone || '') : 
            (order.phone || ''));
            
        const safeAddress = (window.SecurityCore?.sanitizeHTML ? 
            window.SecurityCore.sanitizeHTML(order.address || '') : 
            (order.address || ''));
            
        const safeNotes = (window.SecurityCore?.sanitizeHTML ? 
            window.SecurityCore.sanitizeHTML(order.notes || '') : 
            (order.notes || ''));

        // إنشاء نافذة منبثقة
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'receiptModal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;';
        
        modal.innerHTML = `
            <div class="modal-content" style="background: white; border-radius: 20px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto; position: relative;">
                <button onclick="this.closest('.modal-overlay').remove()" style="position: absolute; top: 15px; left: 15px; background: #e74c3c; color: white; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; font-size: 18px; z-index: 1;">&times;</button>
                
                <div id="receiptContent" style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid var(--secondary-color); padding-bottom: 20px;">
                        <h1 style="font-size: 28px; color: var(--primary-color); margin-bottom: 10px;">
                            <i class="fas fa-receipt"></i> إيصال الطلب
                        </h1>
                        <div style="font-size: 16px; color: #666;">
                            Eleven Store
                        </div>
                        <div style="font-size: 14px; color: #888; margin-top: 5px;">
                            ${dateStr}
                        </div>
                    </div>

                    <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <div style="font-size: 12px; color: #888; margin-bottom: 5px;">رقم الطلب</div>
                                <div style="font-weight: 700; color: var(--primary-color);">#${safeOrderId}</div>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: #888; margin-bottom: 5px;">الحالة</div>
                                <div style="font-weight: 700; color: var(--secondary-color);">${statusMap[order.status] || 'غير محدد'}</div>
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h3 style="font-size: 16px; color: var(--primary-color); margin-bottom: 15px; border-bottom: 2px solid #eee; padding-bottom: 8px;">
                            <i class="fas fa-user"></i> معلومات العميل
                        </h3>
                        <div style="font-size: 14px; line-height: 1.8;">
                            <div><strong>الاسم:</strong> ${safeUserName}</div>
                            ${safeUserEmail ? `<div><strong>البريد:</strong> ${safeUserEmail}</div>` : ''}
                            ${safePhone ? `<div><strong>الهاتف:</strong> ${safePhone}</div>` : ''}
                            ${safeAddress ? `<div><strong>العنوان:</strong> ${safeAddress}</div>` : ''}
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h3 style="font-size: 16px; color: var(--primary-color); margin-bottom: 15px; border-bottom: 2px solid #eee; padding-bottom: 8px;">
                            <i class="fas fa-box"></i> المنتجات
                        </h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f8f9fa;">
                                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">المنتج</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">الكمية</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">السعر</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">المجموع</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(order.items || []).map(item => {
                                    const safeItemName = (window.SecurityCore?.sanitizeHTML ? 
                                        window.SecurityCore.sanitizeHTML(item.name) : 
                                        item.name);
                                    return `
                                    <tr style="border-bottom: 1px solid #eee;">
                                        <td style="padding: 12px;">${safeItemName}</td>
                                        <td style="padding: 12px; text-align: center;">${item.quantity}</td>
                                        <td style="padding: 12px; text-align: left;">${formatNumber(item.price)} ${currency}</td>
                                        <td style="padding: 12px; text-align: left; font-weight: 600;">${formatNumber(item.price * item.quantity)} ${currency}</td>
                                    </tr>
                                `}).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
                            <span>المجموع الجزئي:</span>
                            <span>${formatNumber(order.subtotal || (order.total - (order.shippingCost || 0)))} ${currency}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 2px solid #ddd; font-size: 14px;">
                            <span>الشحن:</span>
                            <span>${formatNumber(order.shippingCost || 0)} ${currency}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: 800; color: var(--secondary-color);">
                            <span>الإجمالي النهائي:</span>
                            <span>${formatNumber(order.total || 0)} ${currency}</span>
                        </div>
                    </div>

                    <div style="text-align: center; padding: 15px; background: #fff3e0; border-radius: 8px; margin-bottom: 20px;">
                        <div style="font-size: 14px; color: #666;">
                            <i class="fas fa-credit-card"></i> طريقة الدفع: 
                            <strong>${order.paymentMethod === 'bank' ? 'تحويل بنكي' : 'الدفع عند الاستلام'}</strong>
                        </div>
                    </div>

                    ${safeNotes ? `
                    <div style="padding: 15px; background: #f8f9fa; border-radius: 8px; margin-bottom: 20px;">
                        <div style="font-size: 12px; color: #888; margin-bottom: 5px;">ملاحظات:</div>
                        <div style="font-size: 14px;">${safeNotes}</div>
                    </div>
                    ` : ''}

                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee; color: #888; font-size: 12px;">
                        <p>شكراً لتسوقك معنا في Eleven Store</p>
                        <p style="margin-top: 5px;">للاستفسارات: ${window.storeEmail || 'info@elevenstore.com'}</p>
                    </div>
                </div>

                <div style="padding: 20px 30px; border-top: 1px solid #eee; display: flex; gap: 10px; justify-content: center;">
                    <button onclick="downloadOrderReceipt('${orderId}')" style="padding: 12px 24px; background: var(--secondary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-download"></i> تحميل PDF
                    </button>
                    <button onclick="window.print()" style="padding: 12px 24px; background: #f8f9fa; color: #555; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-print"></i> طباعة
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

    } catch (error) {
        console.error('Error viewing receipt:', error);
        alert('حدث خطأ أثناء عرض الإيصال');
    }
}

/**
 * تحميل إيصال الطلب كملف PDF
 */
async function downloadOrderReceipt(orderId) {
    try {
        const db = window.firebaseDb || window.db;
        if (!db) {
            alert('خطأ في الاتصال بقاعدة البيانات');
            return;
        }

        const orderDoc = await window.firebaseModules.getDoc(
            window.firebaseModules.doc(db, 'orders', orderId)
        );

        if (!orderDoc.exists()) {
            alert('الطلب غير موجود');
            return;
        }

        const order = { id: orderDoc.id, ...orderDoc.data() };
        
        alert('سيتم فتح نافذة الطباعة. يمكنك حفظ الإيصال كملف PDF من خيارات الطباعة.');
        viewOrderReceipt(orderId);
        setTimeout(() => window.print(), 500);

    } catch (error) {
        console.error('Error downloading receipt:', error);
        alert('حدث خطأ أثناء تحميل الإيصال');
    }
}

/**
 * عرض قسم الطلبات (يتم استدعاؤها عند فتح القسم)
 */
function showOrdersSection() {
    console.log('📦 Showing orders section');
    
    // إعادة تعيين المتغيرات
    resetOrdersState();
    
    // تحميل الطلبات
    loadMyOrders(false);
}

/**
 * دالة للتحقق وتحميل الطلبات عند عرض القسم
 */
function checkAndLoadOrders() {
    console.log('📦 Checking if orders section is active...');
    const ordersSection = document.getElementById('my-orders');
    if (ordersSection && ordersSection.classList.contains('active')) {
        console.log('📦 Orders section is active, loading orders...');
        showOrdersSection();
    }
}

// تصدير الدوال
window.resetOrdersState = resetOrdersState;
window.loadMyOrders = loadMyOrders;
window.setupOrdersInfiniteScroll = setupOrdersInfiniteScroll;
window.renderOrdersList = renderOrdersList;
window.viewOrderReceipt = viewOrderReceipt;
window.downloadOrderReceipt = downloadOrderReceipt;
window.showOrdersSection = showOrdersSection;
window.checkAndLoadOrders = checkAndLoadOrders;
window.renderOrderStages = window.renderOrderStages;

// الاستماع لحدث عرض القسم
document.addEventListener('sectionChanged', function(e) {
    if (e.detail && e.detail.section === 'my-orders') {
        console.log('📦 Section changed to my-orders via event');
        showOrdersSection();
    }
});

// تهيئة عند تحميل الملف
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ orders-system.js loaded');
    
    // تأخير بسيط للتأكد من تحميل كل شيء
    setTimeout(checkAndLoadOrders, 1000);
});

// إضافة مستمع لتغيير حالة المصادقة
if (window.firebaseModules && window.firebaseModules.onAuthStateChanged) {
    // محاولة الحصول على كائن المصادقة بعدة طرق
    const auth = window.auth || 
                 (window.firebaseModules.getAuth ? window.firebaseModules.getAuth() : null) ||
                 (window.firebaseModules.auth ? window.firebaseModules.auth() : null);
                 
    if (auth) {
        window.firebaseModules.onAuthStateChanged(auth, function(user) {
            console.log('📦 Auth state changed in orders-system, user:', user ? 'logged in' : 'logged out');
            setTimeout(checkAndLoadOrders, 500);
        });
    } else {
        console.log('⚠️ Auth object not available yet, will retry later');
        // محاولة مرة أخرى بعد فترة
        setTimeout(() => {
            const authRetry = window.auth || 
                             (window.firebaseModules.getAuth ? window.firebaseModules.getAuth() : null);
            if (authRetry) {
                window.firebaseModules.onAuthStateChanged(authRetry, function(user) {
                    console.log('📦 Auth state changed (retry) in orders-system');
                    setTimeout(checkAndLoadOrders, 500);
                });
            }
        }, 2000);
    }
}

console.log('✅ orders-system.js loaded successfully with all features');