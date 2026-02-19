/**
 * stats.js - قسم الإحصائيات المحسن
 */

async function loadStats() {
    try {
        console.log('📊 جاري تحميل الإحصائيات المحسنة...');
        const { db, firebaseModules } = window;
        const { collection, query, where, getCountFromServer, getDocs, limit, orderBy } = firebaseModules;
        
        // 1. استخدام Aggregation Queries للحصول على الأعداد فقط (أداء أسرع واستهلاك أقل)
        const [usersCount, productsCount, ordersCount] = await Promise.all([
            getCountFromServer(collection(db, 'users')),
            getCountFromServer(collection(db, 'products')),
            getCountFromServer(collection(db, 'orders'))
        ]);

        // 2. جلب الطلبات المدفوعة فقط لحساب الإيرادات (بدلاً من جلب الكل)
        const paidOrdersQuery = query(collection(db, 'orders'), where('status', 'in', ['delivered', 'paid']));
        const paidOrdersSnap = await getDocs(paidOrdersQuery);
        
        let totalRevenue = 0;
        paidOrdersSnap.forEach(doc => {
            totalRevenue += doc.data().total || 0;
        });

        // 3. جلب أعداد الرسائل والتقييمات المعلقة (Aggregation)
        const unreadMessagesCount = await getCountFromServer(query(collection(db, 'messages'), where('status', '==', 'unread')));
        const pendingReviewsCount = await getCountFromServer(query(collection(db, 'reviews'), where('status', '!=', 'approved')));

        // تحديث الإحصائيات في الواجهة
        document.getElementById('totalUsers').textContent = window.adminUtils.formatNumber(usersCount.data().count);
        document.getElementById('totalProducts').textContent = window.adminUtils.formatNumber(productsCount.data().count);
        document.getElementById('totalOrders').textContent = window.adminUtils.formatNumber(ordersCount.data().count);
        document.getElementById('totalRevenue').textContent = window.adminUtils.formatNumber(totalRevenue) + ' SDG';

        // تحديث البطاقات الإضافية
        updateExtraStatsCards(unreadMessagesCount.data().count, pendingReviewsCount.data().count, totalRevenue);

        // 4. جلب آخر 5 طلبات فقط للعرض السريع
        const recentOrdersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(5));
        const recentOrdersSnap = await getDocs(recentOrdersQuery);
        
        const tbody = document.getElementById('recentOrdersBody');
        if (tbody) {
            if (recentOrdersSnap.empty) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">لا توجد طلبات حديثة</td></tr>';
            } else {
                tbody.innerHTML = recentOrdersSnap.docs.map(doc => {
                    const order = { id: doc.id, ...doc.data() };
                    return `
                        <tr>
                            <td data-label="رقم الطلب">${order.orderId || order.id.substring(0, 8)}</td>
                            <td data-label="العميل">${order.userName || 'عميل'}</td>
                            <td data-label="الإجمالي">${window.adminUtils.formatNumber(order.total)} SDG</td>
                            <td data-label="الحالة"><span class="badge badge-${window.adminUtils.getStatusColor(order.status)}">${window.adminUtils.getStatusText(order.status)}</span></td>
                            <td data-label="التاريخ">${window.adminUtils.formatDate(order.createdAt)}</td>
                        </tr>
                    `;
                }).join('');
            }
        }

        // تحميل إحصائيات المنتجات الأكثر مبيعاً (بشكل منفصل لتجنب البطء)
        setTimeout(loadTopProducts, 100);

    } catch (error) {
        console.error('❌ خطأ في تحميل الإحصائيات:', error);
        if (window.adminUtils) window.adminUtils.showToast('فشل تحميل الإحصائيات', 'error');
    }
}

function updateExtraStatsCards(unreadMessages, pendingReviews, totalRevenue) {
    const statsContainer = document.querySelector('.admin-stats');
    if (!statsContainer) return;

    // تنظيف البطاقات القديمة إذا وجدت (لتجنب التكرار)
    const extraCards = statsContainer.querySelectorAll('.extra-stat-card');
    extraCards.forEach(card => card.remove());

    const cardsHtml = `
        <div class="admin-stat-card extra-stat-card">
            <div class="stat-icon sales" style="background: #fff3e0; color: #f57c00;">
                <i class="fas fa-calendar-alt"></i>
            </div>
            <div class="stat-details">
                <h3>${window.adminUtils.formatNumber(totalRevenue)} SDG</h3>
                <p>إيرادات المبيعات</p>
            </div>
        </div>
        <div class="admin-stat-card extra-stat-card">
            <div class="stat-icon" style="background: #e8eaf6; color: #3f51b5;">
                <i class="fas fa-envelope"></i>
            </div>
            <div class="stat-details">
                <h3>${unreadMessages}</h3>
                <p>رسائل غير مقروءة</p>
            </div>
        </div>
        <div class="admin-stat-card extra-stat-card">
            <div class="stat-icon" style="background: #f3e5f5; color: #9c27b0;">
                <i class="fas fa-star"></i>
            </div>
            <div class="stat-details">
                <h3>${pendingReviews}</h3>
                <p>تقييمات معلقة</p>
            </div>
        </div>
    `;
    statsContainer.insertAdjacentHTML('beforeend', cardsHtml);
}

async function loadTopProducts() {
    try {
        const { db, firebaseModules } = window;
        // ملاحظة: حساب الأكثر مبيعاً يتطلب جلب الطلبات، سنقوم بجلب آخر 100 طلب فقط للحساب لضمان الأداء
        const q = firebaseModules.query(firebaseModules.collection(db, 'orders'), firebaseModules.limit(100));
        const snapshot = await firebaseModules.getDocs(q);
        
        const productSales = {};
        snapshot.forEach(doc => {
            const order = doc.data();
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    const productId = item.id || item.productId;
                    if (productId) {
                        if (!productSales[productId]) {
                            productSales[productId] = { name: item.name || 'منتج', quantity: 0, revenue: 0 };
                        }
                        productSales[productId].quantity += item.quantity || 1;
                        productSales[productId].revenue += (item.price * (item.quantity || 1));
                    }
                });
            }
        });

        const topProducts = Object.entries(productSales)
            .sort((a, b) => b[1].quantity - a[1].quantity)
            .slice(0, 5);

        const container = document.getElementById('topProducts');
        if (container) {
            if (topProducts.length === 0) {
                container.innerHTML = '<p class="no-data">لا توجد مبيعات كافية للحساب</p>';
            } else {
                container.innerHTML = '<div class="top-products-list">' + 
                    topProducts.map(([id, data]) => `
                        <div class="top-product-item">
                            <span class="product-name">${data.name}</span>
                            <span class="product-sales">${data.quantity} قطعة</span>
                            <span class="product-revenue">${window.adminUtils.formatNumber(data.revenue)} SDG</span>
                        </div>
                    `).join('') + '</div>';
            }
        }
    } catch (e) {
        console.error('Error loading top products:', e);
    }
}

window.loadStats = loadStats;
