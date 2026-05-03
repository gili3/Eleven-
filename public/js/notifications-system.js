/**
 * notifications-system.js - نظام الإشعارات الاحترافي
 * تم تحديثه لاستخدام Firebase الموحد وإصلاح مسارات الأيقونات.
 */

(function() {
    'use strict';

    const DEFAULT_ICON = 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png';

    async function initNotifications() {
        if (!window.firebaseModules || !window.firebaseInstance) return;
        
        // طلب الإذن
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
        
        setupOrderStatusListener();
        setupGlobalNotificationsListener();
        
        if (window.AppState && window.AppState.isAdmin) {
            setupAdminNotificationsListener();
        }
    }

    function showBrowserNotification(title, body, icon = null, data = {}) {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        const options = {
            body: body,
            icon: icon || DEFAULT_ICON,
            badge: DEFAULT_ICON,
            vibrate: [200, 100, 200],
            data: data,
            tag: data.tag || 'eleven-store-notification',
            renotify: true
        };

        const notification = new Notification(title, options);
        notification.onclick = function(e) {
            e.preventDefault();
            window.focus();
            if (data.url) window.location.href = data.url;
            notification.close();
        };
    }

    function setupAdminNotificationsListener() {
        const { db } = window.firebaseInstance;
        const { collection, query, orderBy, limit, onSnapshot } = window.firebaseModules;

        console.log('🔔 Admin: Monitoring New Orders...');
        onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(1)), (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const order = change.doc.data();
                    const now = Date.now();
                    const createdAt = order.createdAt?.toMillis ? order.createdAt.toMillis() : now;
                    
                    if (now - createdAt < 30000) {
                        showBrowserNotification('🛍️ طلب جديد مستلم!', `طلب جديد #${order.orderId} من ${order.userName}`, null, { url: '/admin.html', tag: 'new-order' });
                        playNotificationSound();
                    }
                }
            });
        });
    }

    function setupOrderStatusListener() {
        const { db } = window.firebaseInstance;
        const { collection, query, where, onSnapshot } = window.firebaseModules;
        const user = window.AppState?.user;

        if (!user || user.isGuest) return;

        console.log('🔔 User: Monitoring Order Status...');
        onSnapshot(query(collection(db, 'orders'), where('userId', '==', user.uid)), (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'modified') {
                    const order = change.doc.data();
                    handleStatusChange(order);
                }
            });
        });
    }

    function handleStatusChange(order) {
        const statuses = {
            'processing': { title: '⚙️ جاري التجهيز', body: `طلبك #${order.orderId} قيد التجهيز الآن.` },
            'shipped': { title: '🚚 تم الشحن', body: `طلبك #${order.orderId} في الطريق إليك.` },
            'delivered': { title: '🎉 تم التوصيل', body: `تم توصيل طلبك #${order.orderId} بنجاح.` },
            'cancelled': { title: '❌ تم الإلغاء', body: `تم إلغاء طلبك #${order.orderId}.` }
        };

        const msg = statuses[order.status];
        if (msg) {
            showBrowserNotification(msg.title, msg.body, order.items?.[0]?.image);
            playNotificationSound();
            if (window.adminUtils) window.adminUtils.showToast(msg.body, 'info');
        }
    }

    function setupGlobalNotificationsListener() {
        const { db } = window.firebaseInstance;
        const { collection, query, orderBy, limit, onSnapshot } = window.firebaseModules;

        onSnapshot(query(collection(db, 'global_notifications'), orderBy('createdAt', 'desc'), limit(1)), (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const note = change.doc.data();
                    const now = Date.now();
                    const createdAt = note.createdAt?.toMillis ? note.createdAt.toMillis() : now;
                    if (now - createdAt < 60000) {
                        showBrowserNotification('🔥 عرض جديد: ' + note.title, note.body, note.imageUrl);
                        playNotificationSound();
                    }
                }
            });
        });
    }

    function playNotificationSound() {
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
            audio.play();
        } catch (e) {}
    }

    window.addEventListener('firebase-ready', initNotifications);
    window.NotificationSystem = { sendToUser: (uid, title, body) => { /* Logic for server-side or admin-triggered push */ } };

})();
