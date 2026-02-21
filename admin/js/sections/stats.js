/**
 * stats.js - قسم الإحصائيات (نسخة مبسطة وموثوقة)
 */

async function loadStats() {
    try {
        console.log('📊 جاري تحميل الإحصائيات...');
        const db = window.db;
        const firebaseModules = window.firebaseModules;
        
        if (!db || !firebaseModules) return;

        // تحميل البيانات الأساسية
        const [usersSnap, productsSnap, ordersSnap] = await Promise.all([
            firebaseModules.getDocs(firebaseModules.collection(db, 'users')),
            firebaseModules.getDocs(firebaseModules.collection(db, 'products')),
            firebaseModules.getDocs(firebaseModules.collection(db, 'orders'))
        ]);

        // حساب الإيرادات
        let totalRevenue = 0;
        ordersSnap.forEach(doc => {
            const order = doc.data();
            if (order.status === 'delivered' || order.status === 'paid' || order.status === 'completed') {
                totalRevenue += parseFloat(order.total || 0);
            }
        });

        // تحديث الواجهة
        const updateElement = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        updateElement('totalUsers', usersSnap.size);
        updateElement('totalProducts', productsSnap.size);
        updateElement('totalOrders', ordersSnap.size);
        updateElement('totalRevenue', totalRevenue.toLocaleString() + ' SDG');

        console.log('✅ تم تحديث الإحصائيات');
    } catch (error) {
        console.error('❌ خطأ في تحميل الإحصائيات:', error);
    }
}

window.loadStats = loadStats;
window.updateStats = loadStats;
