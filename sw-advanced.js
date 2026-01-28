// sw-advanced.js - Service Worker متقدم (الإصدار المحسن)
const CACHE_NAME = 'eleven-store-v3';
const OFFLINE_URL = '/offline.html';

// الموارد التي يتم تخزينها مؤقتاً عند التثبيت
const PRECACHE_ASSETS = [
    '/',
    '/style.css',
    '/firebase-config.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap'
];

// استراتيجيات التخزين المؤقت
const CACHE_STRATEGIES = {
    STATIC: 'cache-first',
    API: 'network-first',
    IMAGES: 'cache-first-stale'
};

// التثبيت الأولي
self.addEventListener('install', (event) => {
    console.log('📦 Installing Advanced Service Worker');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📁 Precaching critical assets');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                console.log('✅ Precaching completed');
                return self.skipWaiting();
            })
    );
});

// التنشيط
self.addEventListener('activate', (event) => {
    console.log('🚀 Activating Advanced Service Worker');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log(`🗑️ Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Cache cleanup completed');
            return self.clients.claim();
        })
    );
});

// التعامل مع طلبات الشبكة
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // استثناء Firebase وطلبات الصوت/الفيديو
    if (url.pathname.includes('firebase') || 
        event.request.destination === 'video' || 
        event.request.destination === 'audio') {
        return;
    }
    
    // استراتيجيات مختلفة لأنواع الملفات
    if (url.pathname.endsWith('.css') || 
        url.pathname.endsWith('.js') ||
        url.pathname.includes('fonts.googleapis.com') ||
        url.pathname.includes('cdnjs.cloudflare.com')) {
        event.respondWith(cacheFirstStrategy(event));
    } 
    else if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        event.respondWith(imageCacheStrategy(event));
    }
    else if (url.pathname.includes('firestore.googleapis.com')) {
        event.respondWith(networkFirstStrategy(event));
    }
    else {
        event.respondWith(networkFirstStrategy(event));
    }
});

// استراتيجية: Cache First للملفات الثابتة
async function cacheFirstStrategy(event) {
    const cachedResponse = await caches.match(event.request);
    
    if (cachedResponse) {
        console.log(`📦 Serving from cache: ${event.request.url}`);
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(event.request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            console.log(`💾 Caching new resource: ${event.request.url}`);
            cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('❌ Network failed, returning offline page');
        
        if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL) || new Response('Offline', {
                status: 503,
                statusText: 'Service Unavailable'
            });
        }
        
        return new Response('Network error', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

// استراتيجية: Network First للبيانات الديناميكية
async function networkFirstStrategy(event) {
    try {
        const networkResponse = await fetch(event.request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log(`🌐 Network failed for: ${event.request.url}, trying cache`);
        
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        return new Response('Connection failed', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

// استراتيجية خاصة للصور
async function imageCacheStrategy(event) {
    const cachedResponse = await caches.match(event.request);
    
    if (cachedResponse) {
        console.log(`🖼️ Serving image from cache: ${event.request.url}`);
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(event.request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            
            // تخزين الصور المؤقتة فقط (بحجم محدود)
            const cacheControl = networkResponse.headers.get('Cache-Control');
            if (!cacheControl || cacheControl.includes('max-age')) {
                console.log(`💾 Caching image: ${event.request.url}`);
                cache.put(event.request, networkResponse.clone());
            }
        }
        
        return networkResponse;
    } catch (error) {
        console.log('❌ Image load failed');
        
        // عرض صورة بديلة
        return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f0f0f0"/><text x="150" y="100" text-anchor="middle" fill="#999" font-family="sans-serif">صورة</text></svg>',
            {
                headers: { 'Content-Type': 'image/svg+xml' }
            }
        );
    }
}

// استقبال إشعارات Push
self.addEventListener('push', function(event) {
    console.log('📬 Push Notification Received');
    
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'Eleven Store', body: event.data.text() };
        }
    }

    const options = {
        body: data.body || 'لديك تحديث جديد من متجرنا',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'eleven-notification',
        renotify: true,
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
        self.registration.showNotification(data.title || 'Eleven Store', options)
    );
});

// التعامل مع النقر على الإشعارات
self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    if (event.action === 'close') return;

    const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function(clientList) {
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if ('focus' in client) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// تحديث البيانات في الخلفية (Background Sync)
self.addEventListener('sync', function(event) {
    console.log(`🔄 Background Sync: ${event.tag}`);
    
    if (event.tag === 'sync-orders') {
        event.waitUntil(syncPendingOrders());
    }
});

async function syncPendingOrders() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const requests = await cache.keys();
        
        const orderRequests = requests.filter(req => 
            req.url.includes('/api/orders') && req.method === 'POST'
        );
        
        for (const request of orderRequests) {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    await cache.delete(request);
                    console.log('✅ Synced pending order');
                }
            } catch (error) {
                console.error('❌ Sync failed:', error);
            }
        }
    } catch (error) {
        console.error('❌ Background sync error:', error);
    }
}

// تقليل حجم الصور في الخلفية
async function optimizeImageInBackground(imageUrl) {
    if (!self.createImageBitmap) return imageUrl;
    
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        // تحويل الصورة إلى Canvas وتقليل حجمها
        const imageBitmap = await createImageBitmap(blob);
        const canvas = new OffscreenCanvas(imageBitmap.width / 2, imageBitmap.height / 2);
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
        
        const optimizedBlob = await canvas.convertToBlob({
            type: 'image/webp',
            quality: 0.7
        });
        
        return URL.createObjectURL(optimizedBlob);
    } catch (error) {
        console.error('Image optimization failed:', error);
        return imageUrl;
    }
}

console.log('✅ Advanced Service Worker Loaded and Ready');

