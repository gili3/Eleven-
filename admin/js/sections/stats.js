/**
 * stats.js - قسم الإحصائيات
 */

async function loadStats() {
    try {
        console.log('📊 جاري تحميل الإحصائيات...');
        const { db, firebaseModules } = window;
        
        // تحميل الإحصائيات الأساسية (الطلبات الأخيرة + الإحصائيات المجمعة)
        const [usersSnap, productsSnap, ordersSnap, messagesSnap, reviewsSnap] = await Promise.all([
            firebaseModules.getDocs(firebaseModules.query(firebaseModules.collection(db, 'users'), firebaseModules.limit(1000))),
            firebaseModules.getDocs(firebaseModules.query(firebaseModules.collection(db, 'products'), firebaseModules.limit(1000))),
            firebaseModules.getDocs(firebaseModules.query(firebaseModules.collection(db, 'orders'), firebaseModules.orderBy('createdAt', 'desc'), firebaseModules.limit(500))),
            firebaseModules.getDocs(firebaseModules.query(firebaseModules.collection(db, 'messages'), firebaseModules.where('status', '==', 'unread'))),
            firebaseModules.getDocs(firebaseModules.query(firebaseModules.collection(db, 'reviews'), firebaseModules.where('status', '!=', 'approved')))
        ]);

        // حساب الإيرادات
        let totalRevenue = 0;
        let paidOrders = 0;
        const orders = [];
        
        ordersSnap.forEach(doc => {
            const order = { id: doc.id, ...doc.data() };
            orders.push(order);
            if (order.status === 'delivered' || order.status === 'paid') {
                totalRevenue += order.total || 0;
                paidOrders++;
            }
        });

        // حساب عدد الرسائل غير المقروءة
        const unreadMessages = messagesSnap.docs.filter(doc => {
            const data = doc.data();
            return data.status === 'unread';
        }).length;

        // حساب عدد التقييمات المعلقة
        const pendingReviews = reviewsSnap.docs.filter(doc => {
            const data = doc.data();
            return data.status !== 'approved';
        }).length;

        // تحديث الإحصائيات في الواجهة
        document.getElementById('totalUsers').textContent = window.adminUtils.formatNumber(usersSnap.size);
        document.getElementById('totalProducts').textContent = window.adminUtils.formatNumber(productsSnap.size);
        document.getElementById('totalOrders').textContent = window.adminUtils.formatNumber(ordersSnap.size);
        document.getElementById('totalRevenue').textContent = window.adminUtils.formatNumber(totalRevenue) + ' SDG';

        // إضافة إحصائيات إضافية إذا وجدت العناصر
        const statsContainer = document.querySelector('.admin-stats');
        if (statsContainer) {
            // إضافة بطاقة الإيرادات الشهرية إذا لم تكن موجودة
            if (!document.getElementById('monthlyRevenue')) {
                const monthlyRevenueCard = document.createElement('div');
                monthlyRevenueCard.className = 'admin-stat-card';
                monthlyRevenueCard.innerHTML = `
                    <div class="stat-icon sales" style="background: #fff3e0; color: #f57c00;">
                        <i class="fas fa-calendar-alt"></i>
                    </div>
                    <div class="stat-details">
                        <h3 id="monthlyRevenue">${window.adminUtils.formatNumber(totalRevenue)} SDG</h3>
                        <p>إيرادات هذا الشهر</p>
                    </div>
                `;
                statsContainer.appendChild(monthlyRevenueCard);
            }

            // إضافة بطاقة الرسائل غير المقروءة
            const messagesCard = document.createElement('div');
            messagesCard.className = 'admin-stat-card';
            messagesCard.innerHTML = `
                <div class="stat-icon" style="background: #e8eaf6; color: #3f51b5;">
                    <i class="fas fa-envelope"></i>
                </div>
                <div class="stat-details">
                    <h3>${unreadMessages}</h3>
                    <p>رسائل غير مقروءة</p>
                </div>
            `;
            statsContainer.appendChild(messagesCard);

            // إضافة بطاقة التقييمات المعلقة
            const reviewsCard = document.createElement('div');
            reviewsCard.className = 'admin-stat-card';
            reviewsCard.innerHTML = `
                <div class="stat-icon" style="background: #f3e5f5; color: #9c27b0;">
                    <i class="fas fa-star"></i>
                </div>
                <div class="stat-details">
                    <h3>${pendingReviews}</h3>
                    <p>تقييمات معلقة</p>
                </div>
            `;
            statsContainer.appendChild(reviewsCard);
        }

        // تحميل الطلبات الأخيرة
        const recentOrders = orders
            .sort((a, b) => {
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeB - timeA;
            })
            .slice(0, 5);
            
        const tbody = document.getElementById('recentOrdersBody');
        if (tbody) {
            if (recentOrders.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">لا توجد طلبات</td></tr>';
            } else {
                tbody.innerHTML = recentOrders.map(order => `
                    <tr>
                        <td data-label="رقم الطلب">${order.orderId || order.id.substring(0, 8)}</td>
                        <td data-label="العميل">${order.userName || 'عميل'}</td>
                        <td data-label="الإجمالي">${window.adminUtils.formatNumber(order.total)} SDG</td>
                        <td data-label="الحالة"><span class="badge badge-${window.adminUtils.getStatusColor(order.status)}">${window.adminUtils.getStatusText(order.status)}</span></td>
                        <td data-label="التاريخ">${window.adminUtils.formatDate(order.createdAt)}</td>
                    </tr>
                `).join('');
            }
        }

        // تحميل إحصائيات المنتجات
        await loadProductStats();

    } catch (error) {
        console.error('❌ خطأ في تحميل الإحصائيات:', error);
        window.adminUtils.showToast('فشل تحميل الإحصائيات', 'error');
    }
}

// تحميل إحصائيات المنتجات
async function loadProductStats() {
    try {
        const { db, firebaseModules } = window;
        
        // المنتجات الأكثر مبيعاً
        const ordersSnap = await firebaseModules.getDocs(firebaseModules.collection(db, 'orders'));
        const productSales = {};
        
        ordersSnap.forEach(doc => {
            const order = doc.data();
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    const productId = item.id || item.productId;
                    if (productId) {
                        if (!productSales[productId]) {
                            productSales[productId] = {
                                quantity: 0,
                                revenue: 0
                            };
                        }
                        productSales[productId].quantity += item.quantity || 1;
                        productSales[productId].revenue += (item.price * (item.quantity || 1));
                    }
                });
            }
        });

        // ترتيب المنتجات حسب المبيعات
        const topProducts = Object.entries(productSales)
            .sort((a, b) => b[1].quantity - a[1].quantity)
            .slice(0, 5);

        // عرض المنتجات الأكثر مبيعاً
        const topProductsContainer = document.getElementById('topProducts');
        if (topProductsContainer) {
            if (topProducts.length === 0) {
                topProductsContainer.innerHTML = '<p class="no-data">لا توجد مبيعات حتى الآن</p>';
            } else {
                let html = '<div class="top-products-list">';
                for (const [productId, sales] of topProducts) {
                    const productName = await getProductNameById(productId);
                    html += `
                        <div class="top-product-item">
                            <span class="product-name">${productName}</span>
                            <span class="product-sales">${sales.quantity} قطعة</span>
                            <span class="product-revenue">${window.adminUtils.formatNumber(sales.revenue)} SDG</span>
                        </div>
                    `;
                }
                html += '</div>';
                topProductsContainer.innerHTML = html;
            }
        }

    } catch (error) {
        console.error('❌ خطأ في تحميل إحصائيات المنتجات:', error);
    }
}

// الحصول على اسم المنتج من ID
async function getProductNameById(productId) {
    try {
        const { db, firebaseModules } = window;
        const docSnap = await firebaseModules.getDoc(firebaseModules.doc(db, 'products', productId));
        if (docSnap.exists()) {
            return docSnap.data().name || 'منتج';
        }
    } catch (error) {
        console.error('خطأ في جلب اسم المنتج:', error);
    }
    return 'منتج';
}

window.loadStats = loadStats;