// Service Worker - Eleven Store (Professional Edition)
// يعمل في خلفية المتصفح لاستقبال الإشعارات حتى لو كان التطبيق مغلقاً

const APP_NAME = 'Eleven Store';
const DEFAULT_ICON = 'https://i.ibb.co/N6Bfb1KW/file-00000000e020720cbb1ddc5fc4577270.png';

console.log('🔔 Professional Service Worker Loaded');

// استقبال الإشعارات من Firebase Cloud Messaging أو Push API
self.addEventListener('push', function(event) {
    console.log('📬 Push Notification Received');
    
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: APP_NAME, body: event.data.text() };
        }
    }

    const options = {
        body: data.body || 'لديك تحديث جديد من متجرنا',
        icon: data.icon || DEFAULT_ICON,
        badge: DEFAULT_ICON,
        image: data.image || null, // دعم صور العروض الكبيرة
        vibrate: [200, 100, 200],
        tag: data.tag || 'eleven-notification',
        renotify: true,
        requireInteraction: data.priority === 'high',
        data: {
            url: data.url || '/',
            orderId: data.orderId || null
        },
        actions: [
            { action: 'open', title: 'عرض التفاصيل' },
            { action: 'close', title: 'تجاهل' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || APP_NAME, options)
    );
});

// التعامل مع النقر على الإشعار
self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    if (event.action === 'close') return;

    const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function(clientList) {
                // إذا كان التطبيق مفتوحاً، قم بالتركيز عليه وتغيير الرابط
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if ('focus' in client) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                // إذا لم يكن مفتوحاً، افتح نافذة جديدة
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// تحديث وتفعيل فوري
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});
