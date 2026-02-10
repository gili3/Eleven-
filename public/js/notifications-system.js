// Notifications System - Eleven Store (Amazon Style Professional Edition)
// نظام متقدم لإدارة إشعارات تحديثات حالات الطلب للعملاء والإدارة

console.log('🔔 Professional Notifications System Loaded');

/**
 * تهيئة نظام الإشعارات الاحترافي
 */
async function initProfessionalNotifications() {
    // طلب الإذن لإشعارات المتصفح بشكل استباقي
    if ('Notification' in window) {
        if (Notification.permission === 'default') {
            try {
                const permission = await Notification.requestPermission();
                console.log('🔔 Notification permission result:', permission);
            } catch (err) {
                console.warn('⚠️ Error requesting notification permission:', err);
            }
        }
    }
    
    setupOrderStatusListener();
    setupGlobalNotificationsListener();
    if (window.isAdmin || localStorage.getItem('isAdmin') === 'true') setupAdminNotificationsListener();
}

/**
 * الاستماع للطلبات الجديدة (للمدير)
 */
async function setupAdminNotificationsListener() {
    try {
        const db = window.getFirebaseInstance ? window.getFirebaseInstance().db : null;
        if (!db) return;

        console.log('👂 Admin: Monitoring New Orders...');

        window.firebaseModules.onSnapshot(
            window.firebaseModules.query(
                window.firebaseModules.collection(db, 'orders'),
                window.firebaseModules.orderBy('createdAt', 'desc'),
                window.firebaseModules.limit(1)
            ),
            (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const order = change.doc.data();
                        const now = new Date();
                        const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : now;
                        
                        // إذا كان الطلب جديداً جداً (آخر 30 ثانية)
                        if (now - createdAt < 30000) {
                            showBrowserNotification(
                                '🛍️ طلب جديد مستلم!',
                                `وصل طلب جديد برقم #${order.orderId} بقيمة ${order.total} SDG`,
                                null,
                                { url: window.location.origin + '/admin/index.html', tag: 'new-order' }
                            );
                            if (window.showToast) {
                                window.showToast(`🛍️ طلب جديد من ${order.userName || 'عميل'}`, 'success', 10000);
                            }
                            playNotificationSound();
                        }
                    }
                });
            }
        );
    } catch (error) {
        console.error('❌ Error in Admin Notifications Listener:', error);
    }
}

/**
 * عرض إشعار احترافي (Browser Push Notification)
 */
function showBrowserNotification(title, body, icon = '/favicon.ico', data = {}) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const options = {
        body: body,
        icon: icon || 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png',
        badge: 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png',
        vibrate: [200, 100, 200],
        data: data,
        tag: data.tag || 'eleven-store-notification',
        renotify: true
    };

    const notification = new Notification(title, options);
    
    notification.onclick = function(event) {
        event.preventDefault();
        window.focus();
        if (data.url) window.location.href = data.url;
        notification.close();
    };
}

/**
 * الاستماع لتحديثات حالات الطلب للعميل الحالي
 */
async function setupOrderStatusListener() {
    try {
        const db = window.getFirebaseInstance ? window.getFirebaseInstance().db : null;
        if (!db || !window.currentUser || window.currentUser.isGuest) return;

        console.log('👂 Monitoring Order Status for:', window.currentUser.uid);

        window.firebaseModules.onSnapshot(
            window.firebaseModules.query(
                window.firebaseModules.collection(db, 'orders'),
                window.firebaseModules.where('userId', '==', window.currentUser.uid)
            ),
            (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    const order = change.doc.data();
                    if (change.type === 'modified') {
                        handleOrderStatusChange(order, change.doc.id);
                    }
                });
            }
        );
    } catch (error) {
        console.error('❌ Error in Order Status Listener:', error);
    }
}

/**
 * التعامل مع تغيير حالة الطلب (Amazon Style Messages)
 */
function handleOrderStatusChange(order, orderId) {
    const statusMessages = {
        'pending': {
            title: '📦 تم استلام طلبك',
            body: `شكراً لتسوقك! طلبك #${order.orderId} قيد المراجعة الآن.`,
            type: 'info',
            browser: true
        },
        'processing': {
            title: '⚙️ جاري تجهيز طلبك',
            body: `خبر سعيد! نحن نقوم بتجهيز طلبك #${order.orderId} الآن.`,
            type: 'success',
            browser: true
        },
        'shipped': {
            title: '🚚 طلبك في الطريق إليك',
            body: `تم شحن طلبك #${order.orderId}. توقع وصوله قريباً!`,
            type: 'warning',
            browser: true
        },
        'delivered': {
            title: '🎉 تم توصيل الطلب بنجاح',
            body: `تم تسليم طلبك #${order.orderId}. نأمل أن تنال منتجاتنا إعجابك!`,
            type: 'success',
            browser: true
        },
        'cancelled': {
            title: '❌ تحديث بخصوص طلبك',
            body: `تم إلغاء الطلب #${order.orderId}. يرجى التواصل معنا للتفاصيل.`,
            type: 'error',
            browser: true
        }
    };

    const status = order.status || 'pending';
    const msg = statusMessages[status] || statusMessages['pending'];

    // 1. عرض Toast داخلي
    if (window.showToast) {
        window.showToast(msg.body, msg.type, 5000);
    }

    // 2. عرض إشعار متصفح (Push)
    if (msg.browser) {
        showBrowserNotification(msg.title, msg.body, order.items?.[0]?.image, {
            url: window.location.origin + '/#my-orders',
            tag: 'order-' + orderId
        });
    }

    // 3. تشغيل صوت خفيف
    playNotificationSound();

    // 4. تحديث الواجهة
    if (window.loadMyOrders) window.loadMyOrders();
}

/**
 * إرسال إشعار عرض جديد (للمدير)
 */
async function sendPromotionNotification(title, body, imageUrl = null) {
    try {
        const db = window.getFirebaseInstance ? window.getFirebaseInstance().db : null;
        if (!db) return;
        
        const notificationsRef = window.firebaseModules.collection(db, 'global_notifications');
        await window.firebaseModules.addDoc(notificationsRef, {
            title, body, imageUrl,
            type: 'promotion',
            createdAt: window.firebaseModules.serverTimestamp()
        });

        if (window.showToast) window.showToast('📢 تم إرسال العرض بنجاح لجميع العملاء', 'success');
    } catch (error) {
        console.error('❌ Error sending promotion:', error);
    }
}

/**
 * الاستماع للإشعارات العامة (العروض)
 */
function setupGlobalNotificationsListener() {
    try {
        const db = window.getFirebaseInstance ? window.getFirebaseInstance().db : null;
        if (!db) return;

        window.firebaseModules.onSnapshot(
            window.firebaseModules.query(
                window.firebaseModules.collection(db, 'global_notifications'),
                window.firebaseModules.orderBy('createdAt', 'desc'),
                window.firebaseModules.limit(1)
            ),
            (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const notification = change.doc.data();
                        const now = new Date();
                        const createdAt = notification.createdAt?.toDate ? notification.createdAt.toDate() : now;
                        
                        // إذا كان الإشعار جديداً (آخر دقيقة)
                        if (now - createdAt < 60000) {
                            showBrowserNotification(
                                '🔥 عرض جديد: ' + notification.title,
                                notification.body,
                                notification.imageUrl,
                                { url: window.location.origin, tag: 'promo' }
                            );
                            if (window.showToast) {
                                window.showToast(`📢 ${notification.title}: ${notification.body}`, 'warning', 8000);
                            }
                        }
                    }
                });
            }
        );
    } catch (error) {
        console.error('❌ Error in Global Listener:', error);
    }
}

/**
 * تشغيل صوت تنبيه احترافي
 */
function playNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.exponentialRampToValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) { /* Ignore audio errors */ }
}

// تشغيل النظام عند جاهزية Firebase
window.addEventListener('firebase-ready', initProfessionalNotifications);
window.addEventListener('load', () => {
    if (window.firebaseApp) initProfessionalNotifications();
});
