// Notifications System - Eleven Store (Optimized Performance Edition)
// نظام إشعارات محسن لتقليل استهلاك Firebase Reads

console.log('🔔 Optimized Notifications System Loaded');

/**
 * تهيئة نظام الإشعارات
 */
async function initProfessionalNotifications() {
    // التحقق من دعم المتصفح للإشعارات
    if ('Notification' in window && Notification.permission === 'default') {
        try {
            await Notification.requestPermission();
        } catch (err) {
            console.warn('⚠️ Error requesting notification permission:', err);
        }
    }
    
    // إعداد المستمعين (فقط للعميل المسجل)
    setupOrderStatusListener();
    
    // ملاحظة: تم إلغاء setupGlobalNotificationsListener لتقليل الـ Reads الدائم
    // يمكن استدعاؤه يدوياً عند الحاجة أو استخدام Polling طويل المدى
}

/**
 * الاستماع لتحديثات حالات الطلب للعميل الحالي
 * يستخدم onSnapshot لأنه ضروري لتجربة المستخدم، ولكن يتم تقييده بالمستخدم الحالي فقط
 */
async function setupOrderStatusListener() {
    try {
        const { db, auth, firebaseModules } = window;
        if (!db || !auth || !auth.currentUser || !firebaseModules.onSnapshot) return;

        const userId = auth.currentUser.uid;
        console.log('👂 Monitoring Order Status for:', userId);

        // قصر الاستماع على الطلبات النشطة فقط لتقليل الـ Reads
        const q = firebaseModules.query(
            firebaseModules.collection(db, 'orders'),
            firebaseModules.where('userId', '==', userId),
            firebaseModules.orderBy('updatedAt', 'desc'),
            firebaseModules.limit(5)
        );

        window.orderStatusUnsubscribe = firebaseModules.onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'modified') {
                    const order = change.doc.data();
                    handleOrderStatusChange(order, change.doc.id);
                }
            });
        }, (error) => {
            console.error('❌ Error in Order Status Listener:', error);
        });
    } catch (error) {
        console.error('❌ Error in Order Status Listener:', error);
    }
}

/**
 * تحديث الإشعارات يدوياً (بدلاً من الاستماع الدائم)
 */
async function refreshNotifications() {
    try {
        const { db, firebaseModules } = window;
        if (!db) return;

        console.log('🔄 Manual Refresh: Checking for global notifications...');
        const q = firebaseModules.query(
            firebaseModules.collection(db, 'global_notifications'),
            firebaseModules.orderBy('createdAt', 'desc'),
            firebaseModules.limit(1)
        );
        
        const snapshot = await firebaseModules.getDocs(q);
        if (!snapshot.empty) {
            const notification = snapshot.docs[0].data();
            // معالجة الإشعار إذا كان جديداً...
        }
    } catch (e) {
        console.error('Error refreshing notifications:', e);
    }
}

/**
 * الاستماع للطلبات الجديدة (للمدير) - يتم تفعيله فقط في لوحة التحكم
 */
async function setupAdminNotificationsListener() {
    try {
        const { db, firebaseModules } = window;
        if (!db || !window.isAdmin) return;

        console.log('👂 Admin: Monitoring New Orders (Optimized)...');

        const q = firebaseModules.query(
            firebaseModules.collection(db, 'orders'),
            firebaseModules.orderBy('createdAt', 'desc'),
            firebaseModules.limit(1)
        );

        window.adminOrdersUnsubscribe = firebaseModules.onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const order = change.doc.data();
                    const now = new Date();
                    const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : now;
                    
                    if (now - createdAt < 30000) { // آخر 30 ثانية
                        showBrowserNotification(
                            '🛍️ طلب جديد مستلم!',
                            `وصل طلب جديد برقم #${order.orderId} بقيمة ${order.total} SDG`,
                            null,
                            { url: window.location.origin + '/admin.html', tag: 'new-order' }
                        );
                    }
                }
            });
        });
    } catch (error) {
        console.error('❌ Error in Admin Notifications Listener:', error);
    }
}

function handleOrderStatusChange(order, orderId) {
    const statusMessages = {
        'processing': { title: '⚙️ جاري تجهيز طلبك', body: `طلبك #${order.orderId} قيد التجهيز الآن.`, type: 'success' },
        'shipped': { title: '🚚 تم شحن طلبك', body: `طلبك #${order.orderId} في الطريق إليك.`, type: 'info' },
        'delivered': { title: '🎉 تم التوصيل', body: `تم تسليم طلبك #${order.orderId} بنجاح.`, type: 'success' },
        'cancelled': { title: '❌ تم إلغاء الطلب', body: `نعتذر، تم إلغاء طلبك #${order.orderId}.`, type: 'error' }
    };

    const msg = statusMessages[order.status];
    if (msg) {
        if (window.showToast) window.showToast(msg.body, msg.type);
        showBrowserNotification(msg.title, msg.body, null, { url: window.location.origin + '/#my-orders' });
        playNotificationSound();
    }
}

function showBrowserNotification(title, body, icon, data) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    new Notification(title, { body, icon: icon || '/favicon.ico', data });
}

function playNotificationSound() {
    try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play();
    } catch (e) {}
}

// البدء عند جاهزية المصادقة
window.addEventListener('auth-state-changed', (e) => {
    if (e.detail.user) {
        initProfessionalNotifications();
        if (e.detail.isAdmin) setupAdminNotificationsListener();
    } else {
        // إلغاء المستمعين عند تسجيل الخروج
        if (window.orderStatusUnsubscribe) window.orderStatusUnsubscribe();
        if (window.adminOrdersUnsubscribe) window.adminOrdersUnsubscribe();
    }
});
