// Notifications System - Eleven Store
// نظام متقدم لإدارة إشعارات تحديثات حالات الطلب للعملاء والإدارة

console.log('🔔 Notifications System Loaded');

/**
 * الاستماع لتحديثات حالات الطلب للعميل الحالي
 */
async function setupOrderStatusListener() {
    try {
        if (!(window.getFirebaseInstance ? window.getFirebaseInstance().db : null) || !window.currentUser || window.currentUser.isGuest) {
            console.warn('⚠️ قاعدة البيانات أو المستخدم غير متاح');
            return;
        }

        console.log('👂 Setting up Order Status Listener for user:', window.currentUser.uid);

        // الاستماع للتغييرات في طلبات المستخدم
        window.firebaseModules.onSnapshot(
            window.firebaseModules.query(
                window.firebaseModules.collection((window.getFirebaseInstance ? window.getFirebaseInstance().db : null), 'orders'),
                window.firebaseModules.where('userId', '==', window.currentUser.uid)
            ),
            (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    const order = change.doc.data();
                    
                    // إذا تم تعديل الطلب (تغيير الحالة)
                    if (change.type === 'modified') {
                        console.log('📦 Order Status Changed:', order);
                        handleOrderStatusChange(order, change.doc.id);
                    }
                });
            },
            (error) => {
                console.error('❌ خطأ في الاستماع لتحديثات الطلبات:', error);
            }
        );
    } catch (error) {
        console.error('❌ خطأ في إعداد Order Status Listener:', error);
    }
}

/**
 * التعامل مع تغيير حالة الطلب
 */
function handleOrderStatusChange(order, orderId) {
    const statusMessages = {
        'pending': {
            title: '⏳ الطلب قيد الانتظار',
            body: `تم استقبال طلبك #${order.orderId}. جاري المراجعة...`,
            icon: '⏳'
        },
        'paid': {
            title: '✅ تم تأكيد الدفع',
            body: `تم تأكيد دفع طلبك #${order.orderId}. شكراً لك!`,
            icon: '✅'
        },
        'processing': {
            title: '🔄 جاري التجهيز',
            body: `جاري تجهيز طلبك #${order.orderId} للشحن...`,
            icon: '🔄'
        },
        'shipped': {
            title: '🚚 خرج للتوصيل',
            body: `طلبك #${order.orderId} خرج للتوصيل. سيصل قريباً!`,
            icon: '🚚'
        },
        'delivered': {
            title: '🎉 تم التسليم',
            body: `تم تسليم طلبك #${order.orderId} بنجاح. شكراً لتسوقك معنا!`,
            icon: '🎉'
        },
        'cancelled': {
            title: '❌ تم إلغاء الطلب',
            body: `تم إلغاء طلبك #${order.orderId}. يرجى التواصل معنا للمزيد من المعلومات.`,
            icon: '❌'
        }
    };

    const status = order.status || 'pending';
    const message = statusMessages[status] || statusMessages['pending'];

    // عرض إشعار في التطبيق (Toast)
    if (window.showToast) {
        window.showToast(`${message.icon} ${message.body}`, 'info');
    }

    // إذا كان هناك Firebase Messaging، إرسال إشعار خارجي
    if (window.sendNotificationToUser) {
        window.sendNotificationToUser(
            window.currentUser.uid,
            message.title,
            message.body,
            {
                orderId: order.orderId,
                type: 'order_status_update',
                status: status
            }
        );
    }

    // تحديث صفحة الطلبات إن كانت مفتوحة
    if (window.loadMyOrders) {
        window.loadMyOrders();
    }

    // حفظ الإشعار في سجل الإشعارات
    saveNotificationToHistory({
        userId: window.currentUser.uid,
        orderId: order.orderId,
        type: 'order_status_update',
        status: status,
        title: message.title,
        body: message.body,
        timestamp: new Date(),
        read: false
    });
}

/**
 * حفظ الإشعار في سجل الإشعارات
 */
async function saveNotificationToHistory(notification) {
    try {
        if (!(window.getFirebaseInstance ? window.getFirebaseInstance().db : null)) {
            console.warn('⚠️ قاعدة البيانات غير متاحة');
            return;
        }

        const notificationsRef = window.firebaseModules.collection(
            (window.getFirebaseInstance ? window.getFirebaseInstance().db : null),
            'user_notifications'
        );

        await window.firebaseModules.addDoc(notificationsRef, {
            ...notification,
            createdAt: window.firebaseModules.serverTimestamp()
        });

        console.log('✅ تم حفظ الإشعار في السجل');
    } catch (error) {
        console.error('❌ خطأ في حفظ الإشعار:', error);
    }
}

/**
 * الاستماع لإشعارات الإدارة (للمسؤولين فقط)
 */
async function setupAdminNotificationsListener() {
    try {
        if (!(window.getFirebaseInstance ? window.getFirebaseInstance().db : null) || !window.isAdmin) {
            console.warn('⚠️ المستخدم ليس مسؤولاً');
            return;
        }

        console.log('👂 Setting up Admin Notifications Listener');

        // الاستماع للإشعارات الجديدة غير المقروءة
        window.firebaseModules.onSnapshot(
            window.firebaseModules.query(
                window.firebaseModules.collection((window.getFirebaseInstance ? window.getFirebaseInstance().db : null), 'admin_notifications'),
                window.firebaseModules.where('status', '==', 'unread'),
                window.firebaseModules.orderBy('createdAt', 'desc')
            ),
            (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const notification = change.doc.data();
                        console.log('📬 New Admin Notification:', notification);
                        handleAdminNotification(notification, change.doc.id);
                    }
                });
            },
            (error) => {
                console.error('❌ خطأ في الاستماع لإشعارات الإدارة:', error);
            }
        );
    } catch (error) {
        console.error('❌ خطأ في إعداد Admin Notifications Listener:', error);
    }
}

/**
 * التعامل مع إشعارات الإدارة
 */
function handleAdminNotification(notification, notificationId) {
    const adminNotificationMessages = {
        'new_order': {
            title: '🛍️ طلب جديد!',
            body: `طلب جديد من ${notification.customerName}. المجموع: ${notification.total} SDG`,
            icon: '🛍️',
            priority: 'high'
        },
        'payment_received': {
            title: '💰 تم استقبال الدفع',
            body: `تم استقبال دفع للطلب #${notification.orderId}`,
            icon: '💰',
            priority: 'high'
        },
        'customer_message': {
            title: '💬 رسالة من عميل',
            body: notification.message || 'لديك رسالة جديدة',
            icon: '💬',
            priority: 'normal'
        }
    };

    const type = notification.type || 'new_order';
    const message = adminNotificationMessages[type] || adminNotificationMessages['new_order'];

    // عرض إشعار في لوحة التحكم (Toast)
    if (window.showToast) {
        window.showToast(`${message.icon} ${message.body}`, 'warning');
    }

    // تشغيل صوت تنبيه للإدارة (اختياري)
    playNotificationSound();

    // تحديث عدد الإشعارات غير المقروءة
    updateUnreadNotificationCount();
}

/**
 * تشغيل صوت التنبيه
 */
function playNotificationSound() {
    try {
        // استخدام Web Audio API أو ملف صوتي
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800; // تردد الصوت (Hz)
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        console.warn('⚠️ لم يتمكن من تشغيل صوت التنبيه:', error);
    }
}

/**
 * تحديث عدد الإشعارات غير المقروءة
 */
async function updateUnreadNotificationCount() {
    try {
        if (!(window.getFirebaseInstance ? window.getFirebaseInstance().db : null)) return;

        const snapshot = await window.firebaseModules.getDocs(
            window.firebaseModules.query(
                window.firebaseModules.collection((window.getFirebaseInstance ? window.getFirebaseInstance().db : null), 'admin_notifications'),
                window.firebaseModules.where('status', '==', 'unread')
            )
        );

        const unreadCount = snapshot.size;
        const badge = document.getElementById('notifBadge');

        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }

        console.log('📊 Unread Notifications Count:', unreadCount);
    } catch (error) {
        console.error('❌ خطأ في تحديث عدد الإشعارات:', error);
    }
}

/**
 * تعليم الإشعار كمقروء
 */
async function markNotificationAsRead(notificationId) {
    try {
        if (!(window.getFirebaseInstance ? window.getFirebaseInstance().db : null)) return;

        const notifRef = window.firebaseModules.doc(
            (window.getFirebaseInstance ? window.getFirebaseInstance().db : null),
            'admin_notifications',
            notificationId
        );

        await window.firebaseModules.updateDoc(notifRef, {
            status: 'read',
            readAt: window.firebaseModules.serverTimestamp()
        });

        console.log('✅ تم تعليم الإشعار كمقروء');
        updateUnreadNotificationCount();
    } catch (error) {
        console.error('❌ خطأ في تعليم الإشعار:', error);
    }
}

/**
 * الحصول على سجل الإشعارات للمستخدم
 */
async function getNotificationHistory(userId, limit = 20) {
    try {
        if (!(window.getFirebaseInstance ? window.getFirebaseInstance().db : null)) return [];

        const snapshot = await window.firebaseModules.getDocs(
            window.firebaseModules.query(
                window.firebaseModules.collection((window.getFirebaseInstance ? window.getFirebaseInstance().db : null), 'user_notifications'),
                window.firebaseModules.where('userId', '==', userId),
                window.firebaseModules.orderBy('createdAt', 'desc'),
                window.firebaseModules.limit(limit)
            )
        );

        const notifications = [];
        snapshot.forEach((doc) => {
            notifications.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return notifications;
    } catch (error) {
        console.error('❌ خطأ في جلب سجل الإشعارات:', error);
        return [];
    }
}

// تصدير الدوال للاستخدام العام
window.setupOrderStatusListener = setupOrderStatusListener;
window.setupAdminNotificationsListener = setupAdminNotificationsListener;
window.markNotificationAsRead = markNotificationAsRead;
window.getNotificationHistory = getNotificationHistory;
window.playNotificationSound = playNotificationSound;

console.log('✅ Notifications System Ready');
