// sw.js - Service Worker for Eleven Store (نسخة آمنة ومكتملة)
// تم إزالة مفاتيح API المباشرة - يتم استلامها من الصفحة الرئيسية عبر postMessage

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

let firebaseInitialized = false;
let messaging = null;

// استقبال إعدادات Firebase من الصفحة الرئيسية
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'FIREBASE_CONFIG') {
        try {
            if (!firebaseInitialized) {
                firebase.initializeApp(event.data.config);
                firebaseInitialized = true;
                messaging = firebase.messaging();
                console.log('✅ Firebase initialized in Service Worker');

                // معالجة الإشعارات الخلفية
                messaging.onBackgroundMessage((payload) => {
                    console.log('📬 [SW] Received background message:', payload);

                    const notificationTitle = payload.notification?.title || 
                                             payload.data?.title || 
                                             'إشعار جديد من Eleven Store';

                    const notificationOptions = {
                        body: payload.notification?.body || payload.data?.body || '',
                        icon: payload.notification?.icon || 
                              payload.data?.icon || 
                              'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png',
                        badge: 'https://i.ibb.co/fVn1SghC/file-00000000cf8071f498fc71b66e09f615.png',
                        data: payload.data || {},
                        vibrate: [200, 100, 200],
                        tag: payload.data?.tag || 'eleven-notification',
                        requireInteraction: payload.data?.requireInteraction === 'true',
                        actions: payload.data?.actions ? JSON.parse(payload.data.actions) : [],
                        dir: 'rtl',
                        lang: 'ar'
                    };

                    self.registration.showNotification(notificationTitle, notificationOptions);
                });
            }
        } catch (error) {
            console.error('❌ [SW] Firebase init error:', error);
        }
    }
});

// معالجة النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
    console.log('👆 [SW] Notification clicked:', event.notification);

    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((windowClients) => {
            // البحث عن نافذة مفتوحة
            for (let client of windowClients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.postMessage({
                        type: 'NOTIFICATION_CLICKED',
                        data: event.notification.data
                    });
                    return client.focus();
                }
            }
            // فتح نافذة جديدة
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// استراتيجية الكاش: Network First مع fallback
const CACHE_NAME = 'eleven-store-v3';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/login.html',
    '/admin.html',
    '/manifest.json',
    '/shared/js/security-core.js',
    '/shared/js/core-utils.js',
    '/shared/js/config.js',
    '/shared/js/firebase-unified.js',
    '/shared/js/state-manager.js',
    '/shared/css/css-security.css',
    '/public/css/style.css',
    '/admin/css/admin-styles.css'
];

self.addEventListener('install', (event) => {
    console.log('📦 [SW] Installing...');
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 [SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS).catch((error) => {
                console.warn('⚠️ [SW] Some assets failed to cache:', error);
            });
        })
    );
});

self.addEventListener('activate', (event) => {
    console.log('🔄 [SW] Activating...');

    event.waitUntil(
        Promise.all([
            // تنظيف الكاش القديم
            caches.keys().then((keys) => {
                return Promise.all(
                    keys.filter(key => key !== CACHE_NAME)
                        .map(key => {
                            console.log('🗑️ [SW] Deleting old cache:', key);
                            return caches.delete(key);
                        })
                );
            }),
            // السيطرة على جميع العملاء
            self.clients.claim()
        ])
    );
});

// استراتيجية التخزين المؤقت
self.addEventListener('fetch', (event) => {
    // تجاهل طلبات API و Firebase
    const url = event.request.url;

    if (url.includes('firebaseio.com') ||
        url.includes('googleapis.com') ||
        url.includes('gstatic.com') ||
        url.includes('firebasestorage.googleapis.com') ||
        event.request.method !== 'GET') {
        return;
    }

    // للملفات الثابتة: Cache First
    if (STATIC_ASSETS.some(asset => url.includes(asset))) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    // تحديث الكاش في الخلفية
                    fetch(event.request).then((response) => {
                        if (response && response.status === 200) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, response);
                            });
                        }
                    }).catch(() => {});
                    return cachedResponse;
                }
                return fetch(event.request);
            })
        );
        return;
    }

    // للموارد الأخرى: Network First
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then((cachedResponse) => {
                    return cachedResponse || new Response('غير متصل بالإنترنت', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
            })
    );
});

console.log('✅ [SW] Eleven Store Service Worker Ready');