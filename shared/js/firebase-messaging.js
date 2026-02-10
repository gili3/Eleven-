// Firebase Cloud Messaging (FCM) - Eleven Store
// يدير الإشعارات الخارجية (Push Notifications) للعملاء والإدارة

let messaging = null;
let fcmToken = null;

console.log('🔔 Firebase Messaging Module Loaded');

/**
 * تهيئة Firebase Cloud Messaging
 * يجب استدعاء هذه الدالة بعد تهيئة Firebase
 */
async function initializeFirebaseMessaging() {
    try {
        if (!window.firebaseModules) {
            console.error('❌ Firebase Modules غير محملة');
            return false;
        }

        // استيراد Firebase Messaging
        const { getMessaging, getToken, onMessage } = await import(
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js'
        );

        const app = window.firebaseApp || (window.getFirebaseInstance ? window.getFirebaseInstance().app : window.firebaseModules.getApp());
        messaging = getMessaging(app);

        console.log('✅ Firebase Messaging مهيأ');

        // طلب إذن المستخدم واستقبال الإشعارات
        await requestNotificationPermission();

        // الاستماع للإشعارات عندما يكون التطبيق مفتوحاً
        onMessage(messaging, (payload) => {
            console.log('📬 Foreground Notification Received:', payload);
            handleForegroundNotification(payload);
        });

        return true;
    } catch (error) {
        console.error('❌ خطأ في تهيئة Firebase Messaging:', error);
        return false;
    }
}

/**
 * طلب إذن المستخدم لاستقبال الإشعارات
 */
async function requestNotificationPermission() {
    try {
        if (!messaging) {
            console.warn('⚠️ Firebase Messaging غير مهيأ');
            return false;
        }

        // التحقق من دعم الإشعارات في المتصفح
        if (!('Notification' in window)) {
            console.warn('⚠️ المتصفح لا يدعم الإشعارات');
            return false;
        }

        // التحقق من إذن المستخدم السابق
        if (Notification.permission === 'granted') {
            console.log('✅ لديك إذن الإشعارات بالفعل');
            await getFCMToken();
            return true;
        }

        // إذا كان الإذن مرفوضاً، لا نطلبه مجدداً
        if (Notification.permission === 'denied') {
            console.log('❌ المستخدم رفض الإشعارات');
            return false;
        }

        // طلب الإذن من المستخدم
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            console.log('✅ تم منح إذن الإشعارات');
            await getFCMToken();
            return true;
        } else {
            console.log('❌ تم رفض إذن الإشعارات');
            return false;
        }
    } catch (error) {
        console.error('❌ خطأ في طلب إذن الإشعارات:', error);
        return false;
    }
}

/**
 * الحصول على رمز FCM الفريد للجهاز
 */
async function getFCMToken() {
    try {
        if (!messaging) {
            console.warn('⚠️ Firebase Messaging غير مهيأ');
            return null;
        }

        const { getToken } = await import(
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js'
        );

        // الحصول على رمز FCM باستخدام مفتاح VAPID الموفر
        fcmToken = await getToken(messaging, {
            vapidKey: 'BOx1ydjk5Cv9pIzuACGmP4on1cBPaa9stLtOzJNNoq2akYpCvSYrqAdXt-SwoCoTOrrCHrbp2t9AcFhFj1wSdRI'
        });

        if (fcmToken) {
            console.log('✅ FCM Token:', fcmToken);
            
            // حفظ الرمز في قاعدة البيانات لهذا المستخدم
            if (window.currentUser && !window.currentUser.isGuest) {
                await saveFCMTokenToDatabase(fcmToken);
            }

            return fcmToken;
        } else {
            console.warn('⚠️ لم يتم الحصول على FCM Token');
            return null;
        }
    } catch (error) {
        console.error('❌ خطأ في الحصول على FCM Token:', error);
        return null;
    }
}

/**
 * حفظ رمز FCM في قاعدة البيانات
 */
async function saveFCMTokenToDatabase(token) {
    try {
        if (!(window.getFirebaseInstance ? window.getFirebaseInstance().db : null) || !window.currentUser) {
            console.warn('⚠️ قاعدة البيانات أو المستخدم غير متاح');
            return;
        }

        const userRef = window.firebaseModules.doc((window.getFirebaseInstance ? window.getFirebaseInstance().db : null), 'users', window.currentUser.uid);
        
        await window.firebaseModules.updateDoc(userRef, {
            fcmToken: token,
            fcmTokenUpdatedAt: window.firebaseModules.serverTimestamp()
        });

        console.log('✅ تم حفظ FCM Token في قاعدة البيانات');
    } catch (error) {
        console.error('❌ خطأ في حفظ FCM Token:', error);
    }
}

/**
 * التعامل مع الإشعارات عندما يكون التطبيق مفتوحاً
 */
function handleForegroundNotification(payload) {
    console.log('📨 Foreground Notification:', payload);

    const { title, body, icon, data } = payload.notification;

    // عرض إشعار في التطبيق (Toast)
    if (window.showToast) {
        window.showToast(body || title, 'info');
    }

    // إذا كان هناك بيانات إضافية (مثل رقم الطلب)
    if (data && data.orderId) {
        console.log('📦 Order ID:', data.orderId);
        
        // تحديث حالة الطلب في الواجهة إن أمكن
        if (window.loadMyOrders) {
            window.loadMyOrders();
        }
    }
}

/**
 * إرسال إشعار من الخادم (يتم استدعاؤها من admin.js)
 * ملاحظة: هذه الدالة تحتاج إلى backend API
 */
async function sendNotificationToUser(userId, title, body, data = {}) {
    try {
        // هذا يتطلب Firebase Cloud Functions أو Backend API
        // سيتم تنفيذه من خلال دالة Cloud Function
        console.log('📤 Sending notification to user:', userId);
        
        // مثال على الاستدعاء:
        // const response = await fetch('/api/send-notification', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ userId, title, body, data })
        // });
        
        return true;
    } catch (error) {
        console.error('❌ خطأ في إرسال الإشعار:', error);
        return false;
    }
}

/**
 * إرسال إشعار لمجموعة من المستخدمين (للإدارة)
 */
async function sendNotificationToAdmins(title, body, data = {}) {
    try {
        console.log('📤 Sending notification to admins:', title);
        
        // سيتم تنفيذه من خلال Cloud Function
        // const response = await fetch('/api/send-admin-notification', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ title, body, data })
        // });
        
        return true;
    } catch (error) {
        console.error('❌ خطأ في إرسال الإشعار للإدارة:', error);
        return false;
    }
}

/**
 * تسجيل Service Worker
 */
async function registerServiceWorker() {
    try {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('✅ Service Worker Registered:', registration);
            return registration;
        } else {
            console.warn('⚠️ المتصفح لا يدعم Service Workers');
            return null;
        }
    } catch (error) {
        console.error('❌ خطأ في تسجيل Service Worker:', error);
        return null;
    }
}

// تصدير الدوال للاستخدام العام
window.initializeFirebaseMessaging = initializeFirebaseMessaging;
window.requestNotificationPermission = requestNotificationPermission;
window.getFCMToken = getFCMToken;
window.sendNotificationToUser = sendNotificationToUser;
window.sendNotificationToAdmins = sendNotificationToAdmins;
window.registerServiceWorker = registerServiceWorker;

console.log('✅ Firebase Messaging Module Ready');
