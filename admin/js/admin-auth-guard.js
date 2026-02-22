/**
 * admin-auth-guard.js
 * نظام حماية الوصول إلى لوحة التحكم - التحقق من صلاحيات المسؤول (نسخة محسنة)
 */

class AdminAuthGuard {
    constructor() {
        this.isAuthorized = false;
        this.currentUser = null;
        this.authCheckTimeout = 5000; // 5 ثواني
        
        this.lastVerificationTime = 0;
        this.verificationInterval = 60000; // إعادة التحقق كل دقيقة
    }

    /**
     * تهيئة نظام الحماية
     */
    async init() {
        console.log('🔐 بدء نظام حماية الوصول إلى لوحة التحكم...');
        
        try {
            // منع الوصول عبر iframe
            if (window.top !== window.self) {
                throw new Error('لا يمكن فتح لوحة التحكم داخل iframe');
            }

            // انتظر تحميل Firebase
            await this.waitForFirebase();
            
            // تحقق من حالة المصادقة
            await this.checkAdminAccess();
            
            // إذا لم يكن مسؤولاً، أعد التوجيه
            if (!this.isAuthorized) {
                this.redirectToUnauthorized();
            } else {
                // بدء التحقق الدوري من الصلاحيات
                this.startPeriodicVerification();
                // منع تعديل الكود في وقت التشغيل
                this.protectFromTampering();
            }
        } catch (error) {
            console.error('❌ خطأ في نظام الحماية:', error);
            this.redirectToUnauthorized();
        }
    }

    /**
     * انتظر تحميل Firebase
     */
    async waitForFirebase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 10;
            
            const checkFirebase = () => {
                if (window.firebaseModules && window.firebaseConfig) {
                    resolve();
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkFirebase, 500);
                } else {
                    reject(new Error('Firebase modules not loaded'));
                }
            };
            
            checkFirebase();
        });
    }

    /**
     * التحقق من صلاحيات المسؤول
     */
    async checkAdminAccess() {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.warn('⚠️ انتهت مهلة التحقق من الصلاحيات');
                resolve();
            }, this.authCheckTimeout);

            try {
                const { auth, db } = this.getFirebaseInstance();
                
                window.firebaseModules.onAuthStateChanged(auth, async (user) => {
                    clearTimeout(timeout);
                    
                    if (!user) {
                        console.warn('⚠️ لا يوجد مستخدم مسجل دخول');
                        this.isAuthorized = false;
                        resolve();
                        return;
                    }

                    try {
                        // جلب بيانات المستخدم من Firestore
                        const userDoc = await window.firebaseModules.getDoc(
                            window.firebaseModules.doc(db, 'users', user.uid)
                        );

                        if (!userDoc.exists()) {
                            console.warn('⚠️ بيانات المستخدم غير موجودة');
                            this.isAuthorized = false;
                            resolve();
                            return;
                        }

                        const userData = userDoc.data();
                        
                        // التحقق من أن المستخدم مسؤول
                        const isAdmin = userData.isAdmin === true || userData.role === 'admin';
                        
                        if (!isAdmin) {
                            console.warn('⚠️ المستخدم ليس لديه صلاحيات المسؤول');
                            this.isAuthorized = false;
                            resolve();
                            return;
                        }

                        // التحقق من أن الحساب نشط
                        if (userData.status === 'inactive' || userData.suspended === true) {
                            console.warn('⚠️ حساب المسؤول معطل أو موقوف');
                            this.isAuthorized = false;
                            resolve();
                            return;
                        }

                        // توليد رمز جلسة فريد
                        // لا يتم استخدام رمز جلسة من جانب العميل بعد الآن. يتم الاعتماد على Firebase Auth token.
                        
                        // تسجيل محاولة الوصول
                        this.logAdminAccess(user.uid, 'success');
                        
                        this.currentUser = {
                            uid: user.uid,
                            email: user.email,
                            displayName: userData.name || user.displayName,
                            isAdmin: true,
                            role: userData.role || 'admin'
                        };
                        
                        this.isAuthorized = true;
                        this.lastVerificationTime = Date.now();
                        console.log('✅ تم التحقق من صلاحيات المسؤول بنجاح');
                        resolve();
                        
                    } catch (error) {
                        console.error('❌ خطأ في جلب بيانات المستخدم:', error);
                        this.isAuthorized = false;
                        resolve();
                    }
                });
            } catch (error) {
                console.error('❌ خطأ في التحقق من الصلاحيات:', error);
                clearTimeout(timeout);
                this.isAuthorized = false;
                resolve();
            }
        });
    }

    /**
     * بدء التحقق الدوري من الصلاحيات
     */
    startPeriodicVerification() {
        setInterval(async () => {
            const now = Date.now();
            if (now - this.lastVerificationTime > this.verificationInterval) {
                console.log('🔄 إعادة التحقق من صلاحيات المسؤول...');
                await this.checkAdminAccess();
                
                if (!this.isAuthorized) {
                    console.warn('⚠️ تم إلغاء صلاحيات المسؤول');
                    this.redirectToUnauthorized();
                }
            }
        }, this.verificationInterval);
    }

    /**
     * حماية من تعديل الكود في وقت التشغيل
     */
    protectFromTampering() {
        // منع تعديل window.isAuthorized
        Object.defineProperty(window, 'isAuthorized', {
            value: this.isAuthorized,
            writable: false,
            configurable: false
        });

        // منع تعديل adminAuthGuard
        Object.defineProperty(window, 'adminAuthGuard', {
            value: this,
            writable: false,
            configurable: false
        });

        // مراقبة محاولات تعديل الـ DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // التحقق من إضافة وسوم script خطيرة
                    mutation.addedNodes.forEach((node) => {
                        if (node.tagName === 'SCRIPT' && node.src === '') {
                            console.warn('⚠️ محاولة حقن script في الصفحة');
                            node.remove();
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // منع الوصول إلى console في الإنتاج (اختياري)
        if (window.location.hostname !== 'localhost') {
            // يمكن تفعيل هذا في الإنتاج فقط
            // Object.defineProperty(window, 'console', { value: {} });
        }
    }

    

    /**
     * الحصول على instance Firebase
     */
    getFirebaseInstance() {
        if (!window.firebaseModules || !window.firebaseConfig) {
            throw new Error('Firebase not initialized');
        }

        let app;
        try {
            app = window.firebaseModules.getApp();
        } catch (e) {
            app = window.firebaseModules.initializeApp(window.firebaseConfig);
        }
        
        const auth = window.firebaseModules.getAuth(app);
        const db = window.firebaseModules.getFirestore(app);

        return { auth, db };
    }

    /**
     * إعادة التوجيه إلى صفحة عدم التصريح
     */
    redirectToUnauthorized() {
        console.log('🚫 إعادة التوجيه إلى صفحة عدم التصريح...');
        
        // مسح بيانات الجلسة
        sessionStorage.removeItem('admin_session_token');
        
        // عرض رسالة خطأ
        document.body.innerHTML = `
            <div style="
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                background: linear-gradient(135deg, #f7f5f2 0%, #ffffff 100%);
                font-family: 'Cairo', sans-serif;
                direction: rtl;
            ">
                <div style="
                    text-align: center;
                    padding: 40px;
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    max-width: 500px;
                ">
                    <h1 style="color: #d32f2f; margin-bottom: 20px;">🚫 الوصول مرفوض</h1>
                    <p style="color: #666; margin-bottom: 20px; font-size: 16px;">
                        ليس لديك صلاحيات للوصول إلى لوحة التحكم.
                    </p>
                    <p style="color: #999; font-size: 14px; margin-bottom: 30px;">
                        إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع المسؤول.
                    </p>
                    <button onclick="window.location.href='index.html'" style="
                        background: #c9a24d;
                        color: white;
                        border: none;
                        padding: 12px 30px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 16px;
                        font-family: 'Cairo', sans-serif;
                    ">
                        العودة إلى المتجر
                    </button>
                </div>
            </div>
        `;

        // إعادة التوجيه بعد 5 ثواني
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 5000);
    }

    /**
     * تسجيل محاولات الوصول إلى لوحة التحكم
     */
    async logAdminAccess(userId, status) {
        try {
            const { db } = this.getFirebaseInstance();
            
            await window.firebaseModules.addDoc(
                window.firebaseModules.collection(db, 'admin_access_logs'),
                {
                    userId: userId,
                    status: status,
                    timestamp: window.firebaseModules.serverTimestamp(),
                    userAgent: navigator.userAgent,
                    
                    ipInfo: 'server-side-only' // يجب الحصول على IP من الخادم
                }
            );
        } catch (error) {
            console.warn('⚠️ لم يتمكن من تسجيل محاولة الوصول:', error);
        }
    }

    /**
     * التحقق من صلاحية محددة
     */
    hasPermission(permission) {
        if (!this.isAuthorized) return false;
        
        const allowedPermissions = ['view_dashboard', 'manage_products', 'manage_orders', 'manage_users'];
        return allowedPermissions.includes(permission);
    }

    /**
     * تسجيل الخروج الآمن
     */
    async logout() {
        try {
            const { auth } = this.getFirebaseInstance();
            
            await window.firebaseModules.signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error('❌ خطأ في تسجيل الخروج:', error);
        }
    }
}

// إنشاء instance من الحارس
window.adminAuthGuard = new AdminAuthGuard();

// تهيئة الحارس عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.adminAuthGuard.init().catch(error => {
        console.error('❌ خطأ حرج في نظام الحماية:', error);
    });
});
