// Service Worker - Eleven Store
// يعمل في خلفية المتصفح لاستقبال الإشعارات حتى لو كان التطبيق مغلقاً

console.log('🔔 Service Worker Loaded');

// استقبال الإشعارات من Firebase Cloud Messaging
self.addEventListener('push', function(event) {
    console.log('📬 Push Notification Received:', event);
    
    if (!event.data) {
        console.log('⚠️ لا توجد بيانات في الإشعار');
        return;
    }

    try {
        const data = event.data.json();
        console.log('📨 Notification Data:', data);

        const options = {
            body: data.body || 'لديك إشعار جديد',
            icon: data.icon || 'https://i.ibb.co/N6Bfb1KW/file-00000000e020720cbb1ddc5fc4577270.png',
            badge: 'https://i.ibb.co/N6Bfb1KW/file-00000000e020720cbb1ddc5fc4577270.png',
            tag: data.tag || 'notification',
            requireInteraction: data.requireInteraction || false,
            data: {
                url: data.url || '/',
                orderId: data.orderId || null,
                type: data.type || 'general'
            },
            actions: [
                {
                    action: 'open',
                    title: 'فتح',
                    icon: 'https://via.placeholder.com/192?text=Open'
                },
                {
                    action: 'close',
                    title: 'إغلاق',
                    icon: 'https://via.placeholder.com/192?text=Close'
                }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'Eleven Store', options)
        );
    } catch (error) {
        console.error('❌ خطأ في معالجة الإشعار:', error);
        
        // إذا فشل تحليل JSON، عرض الإشعار كنص عادي
        event.waitUntil(
            self.registration.showNotification('Eleven Store', {
                body: event.data.text(),
                icon: 'https://i.ibb.co/N6Bfb1KW/file-00000000e020720cbb1ddc5fc4577270.png'
            })
        );
    }
});

// التعامل مع النقر على الإشعار
self.addEventListener('notificationclick', function(event) {
    console.log('✅ Notification Clicked:', event);
    
    event.notification.close();

    const urlToOpen = event.notification.data.url || '/';
    const orderId = event.notification.data.orderId;

    // إذا كان هناك رقم طلب، فتح صفحة الطلب مباشرة
    let finalUrl = urlToOpen;
    if (orderId) {
        finalUrl = `${urlToOpen}?orderId=${orderId}`;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function(clientList) {
                // البحث عن نافذة مفتوحة بالفعل
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url === finalUrl && 'focus' in client) {
                        return client.focus();
                    }
                }
                // إذا لم توجد نافذة، فتح نافذة جديدة
                if (clients.openWindow) {
                    return clients.openWindow(finalUrl);
                }
            })
    );
});

// التعامل مع إغلاق الإشعار
self.addEventListener('notificationclose', function(event) {
    console.log('🚫 Notification Closed');
});

// تحديث Service Worker
self.addEventListener('activate', function(event) {
    console.log('🔄 Service Worker Activated');
    event.waitUntil(clients.claim());
});

// تسجيل Service Worker عند التثبيت
self.addEventListener('install', function(event) {
    console.log('📦 Service Worker Installed');
    self.skipWaiting();
});
