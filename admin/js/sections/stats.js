/**
 * stats.js - قسم الإحصائيات المحسّن (باستخدام Firestore Aggregation Queries)
 */

async function loadStats() {
    if (!window.checkAdmin()) return;
    
    try {
        console.log('📊 جاري تحميل الإحصائيات (نسخة محسنة)...');
        const db = window.db;
        const firebaseModules = window.firebaseModules;
        
        if (!db || !firebaseModules) {
            console.error('❌ Firebase غير مهيأ');
            return;
        }

        // التحقق من توفر دوال Aggregation
        if (!firebaseModules.getAggregateFromServer || !firebaseModules.count) {
            console.warn('⚠️ Firestore Aggregation Queries غير متوفرة، استخدام الطريقة القديمة...');
            return await loadStatsLegacy();
        }

        // استخدام Promise.all لتحميل جميع الإحصائيات بالتوازي
        const [usersCount, productsCount, ordersCount, revenueData] = await Promise.all([
            // عدد المستخدمين
            firebaseModules.getAggregateFromServer(
                firebaseModules.query(firebaseModules.collection(db, 'users')),
                { count: firebaseModules.count() }
            ),
            // عدد المنتجات
            firebaseModules.getAggregateFromServer(
                firebaseModules.query(firebaseModules.collection(db, 'products')),
                { count: firebaseModules.count() }
            ),
            // عدد الطلبات
            firebaseModules.getAggregateFromServer(
                firebaseModules.query(firebaseModules.collection(db, 'orders')),
                { count: firebaseModules.count() }
            ),
            // جلب الطلبات المكتملة فقط لحساب الإيرادات
            firebaseModules.getDocs(
                firebaseModules.query(
                    firebaseModules.collection(db, 'orders'),
                    firebaseModules.where('status', 'in', ['delivered', 'paid', 'completed'])
                )
            )
        ]);

        // استخراج الأرقام من النتائج
        const totalUsers = usersCount.data().count;
        const totalProducts = productsCount.data().count;
        const totalOrders = ordersCount.data().count;

        // حساب الإيرادات الإجمالية
        let totalRevenue = 0;
        revenueData.forEach(doc => {
            const order = doc.data();
            totalRevenue += parseFloat(order.total || 0);
        });

        // تحديث الواجهة
        updateStatsUI(totalUsers, totalProducts, totalOrders, totalRevenue);

        console.log('✅ تم تحديث الإحصائيات بنجاح');
        console.log(`📈 المستخدمون: ${totalUsers} | المنتجات: ${totalProducts} | الطلبات: ${totalOrders} | الإيرادات: ${totalRevenue}`);

    } catch (error) {
        console.error('❌ خطأ في تحميل الإحصائيات:', error);
        ErrorHandler.handle(error, 'loadStats');
        
        // محاولة استخدام الطريقة القديمة كبديل
        if (error.code === 'unimplemented' || error.message.includes('Aggregation')) {
            console.warn('⚠️ محاولة استخدام الطريقة القديمة...');
            return await loadStatsLegacy();
        }
    }
}

/**
 * طريقة بديلة (قديمة) لحساب الإحصائيات
 */
async function loadStatsLegacy() {
    try {
        console.log('📊 جاري تحميل الإحصائيات (الطريقة البديلة)...');
        const db = window.db;
        const firebaseModules = window.firebaseModules;
        
        if (!db || !firebaseModules) return;

        // تحميل البيانات مع تحديد حد أقصى معقول
        const [usersSnap, productsSnap, ordersSnap] = await Promise.all([
            firebaseModules.getDocs(
                firebaseModules.query(
                    firebaseModules.collection(db, 'users'),
                    firebaseModules.limit(1000)
                )
            ),
            firebaseModules.getDocs(
                firebaseModules.query(
                    firebaseModules.collection(db, 'products'),
                    firebaseModules.limit(1000)
                )
            ),
            firebaseModules.getDocs(
                firebaseModules.query(
                    firebaseModules.collection(db, 'orders'),
                    firebaseModules.where('status', 'in', ['delivered', 'paid', 'completed']),
                    firebaseModules.limit(1000)
                )
            )
        ]);

        // حساب الإيرادات
        let totalRevenue = 0;
        ordersSnap.forEach(doc => {
            const order = doc.data();
            totalRevenue += parseFloat(order.total || 0);
        });

        // تحديث الواجهة
        updateStatsUI(usersSnap.size, productsSnap.size, ordersSnap.size, totalRevenue);

        console.log('✅ تم تحديث الإحصائيات (الطريقة البديلة)');
    } catch (error) {
        console.error('❌ خطأ في تحميل الإحصائيات (الطريقة البديلة):', error);
        ErrorHandler.handle(error, 'loadStatsLegacy');
    }
}

/**
 * دالة مساعدة لتحديث واجهة الإحصائيات
 */
function updateStatsUI(totalUsers, totalProducts, totalOrders, totalRevenue) {
    const updateElement = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = typeof value === 'number' 
                ? (id === 'totalRevenue' 
                    ? adminUtils.formatNumber(value) + ' SDG' 
                    : adminUtils.formatNumber(value))
                : value;
        }
    };

    updateElement('totalUsers', totalUsers);
    updateElement('totalProducts', totalProducts);
    updateElement('totalOrders', totalOrders);
    updateElement('totalRevenue', totalRevenue);
}

// تصدير الدوال
window.loadStats = loadStats;
window.updateStats = loadStats;
window.loadStatsLegacy = loadStatsLegacy;