// state-manager.js - إدارة الحالة المركزية للتطبيق (نسخة محسنة تعتمد على Firebase)
// ======================== المتغيرات العامة الموحدة ========================

(function() {
    'use strict';

    if (window.AppState) return;

    const AppState = {
        // الحالة
        user: null,
        isGuest: false,
        isAdmin: false,
        cart: [],
        favorites: [],
        products: [],
        categories: [],
        orders: [],
        settings: {},
        currency: 'SDG ',
        navigationHistory: ['home'],

        // دوال التحديث
        setUser: function(user, isGuest = false) {
            this.user = user;
            this.isGuest = isGuest;
            this.isAdmin = user?.isAdmin || false;
            
            // عند تغيير المستخدم، نقوم بتحميل بياناته من Firebase أو sessionStorage
            if (user && !isGuest) {
                this.loadFromFirebase();
            } else if (isGuest) {
                this.loadFromStorage(); // للضيوف فقط نستخدم sessionStorage
            } else {
                this.reset();
            }
            
            this._notify('user');
        },

        setCart: function(cart) {
            this.cart = cart || [];
            this._notify('cart');
            this.persistData();
        },

        addToCart: function(item) {
            const existing = this.cart.find(i => i.id === item.id);
            const stock = parseInt(item.stock) || 0;
            
            if (existing) {
                const newQty = existing.quantity + (item.quantity || 1);
                if (newQty > stock) {
                    if (window.adminUtils && window.adminUtils.showToast) {
                        window.adminUtils.showToast(`عذراً، لا يمكن تجاوز الكمية المتاحة (${stock})`, 'warning');
                    }
                    existing.quantity = stock;
                } else {
                    existing.quantity = newQty;
                }
            } else {
                if ((item.quantity || 1) > stock) {
                    item.quantity = stock;
                    if (window.adminUtils && window.adminUtils.showToast) {
                        window.adminUtils.showToast(`تم إضافة الحد الأقصى المتاح (${stock})`, 'warning');
                    }
                }
                this.cart.push(item);
            }
            this._notify('cart');
            this.persistData();
        },

        updateCartItemQuantity: function(productId, change) {
            const item = this.cart.find(i => i.id === productId);
            if (!item) return;
            
            const stock = parseInt(item.stock) || 999;
            const newQty = (item.quantity || 1) + change;
            
            if (newQty < 1) {
                this.cart = this.cart.filter(i => i.id !== productId);
            } else if (newQty > stock) {
                if (window.adminUtils && window.adminUtils.showToast) {
                    window.adminUtils.showToast(`عذراً، لا يمكن تجاوز الكمية المتاحة (${stock})`, 'warning');
                }
                item.quantity = stock;
            } else {
                item.quantity = newQty;
            }
            this._notify('cart');
            this.persistData();
        },

        removeFromCart: function(productId) {
            this.cart = this.cart.filter(i => i.id !== productId);
            this._notify('cart');
            this.persistData();
        },

        clearCart: function() {
            this.cart = [];
            this._notify('cart');
            this.persistData();
        },

        setFavorites: function(favorites) {
            this.favorites = favorites || [];
            this._notify('favorites');
            this.persistData();
        },

        toggleFavorite: function(product) {
            const index = this.favorites.findIndex(f => f.id === product.id);
            if (index === -1) {
                this.favorites.push(product);
            } else {
                this.favorites.splice(index, 1);
            }
            this._notify('favorites');
            this.persistData();
        },

        setProducts: function(products) {
            this.products = products || [];
        },

        setCategories: function(categories) {
            this.categories = categories || [];
        },

        setSettings: function(settings) {
            this.settings = settings || {};
            this.currency = settings.currency || 'SDG ';
        },

        // مستمعي التغيير
        _listeners: {
            user: [],
            cart: [],
            favorites: []
        },

        subscribe: function(event, callback) {
            if (!this._listeners[event]) this._listeners[event] = [];
            this._listeners[event].push(callback);
        },

        unsubscribe: function(event, callback) {
            if (!this._listeners[event]) return;
            this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
        },

        _notify: function(event) {
            if (!this._listeners[event]) return;
            this._listeners[event].forEach(cb => cb(this[event]));
        },

        // حفظ البيانات بناءً على نوع المستخدم
        persistData: function() {
            if (this.user && !this.isGuest) {
                this.syncWithFirebase();
            } else if (this.isGuest) {
                this.saveToSessionStorage();
            }
        },

        // استخدام sessionStorage للضيوف (يتم مسحه عند إغلاق المتصفح)
        saveToSessionStorage: function() {
            try {
                sessionStorage.setItem('guest_cart', JSON.stringify(this.cart));
                sessionStorage.setItem('guest_favorites', JSON.stringify(this.favorites));
            } catch (e) {
                console.warn('⚠️ فشل الحفظ في sessionStorage', e);
            }
        },

        loadFromStorage: function() {
            try {
                const cart = sessionStorage.getItem('guest_cart');
                if (cart) this.cart = JSON.parse(cart);
                const favorites = sessionStorage.getItem('guest_favorites');
                if (favorites) this.favorites = JSON.parse(favorites);
                
                this._notify('cart');
                this._notify('favorites');
            } catch (e) {
                console.warn('⚠️ فشل تحميل من sessionStorage', e);
            }
        },

        // مزامنة مع Firebase للمستخدمين المسجلين
        syncWithFirebase: async function() {
            if (!this.user || this.isGuest) return;
            try {
                const db = window.db;
                if (!db) return;
                const userRef = window.firebaseModules.doc(db, 'users', this.user.uid);
                await window.firebaseModules.updateDoc(userRef, {
                    cart: this.cart,
                    favorites: this.favorites,
                    lastUpdated: window.firebaseModules.serverTimestamp()
                });
                console.log('✅ تمت مزامنة الحالة مع Firebase');
            } catch (error) {
                console.error('❌ فشل المزامنة مع Firebase:', error);
            }
        },

        loadFromFirebase: async function() {
            if (!this.user || this.isGuest) return;
            try {
                const db = window.db;
                if (!db) return;
                const userRef = window.firebaseModules.doc(db, 'users', this.user.uid);
                const userDoc = await window.firebaseModules.getDoc(userRef);
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    this.cart = data.cart || [];
                    this.favorites = data.favorites || [];
                    this._notify('cart');
                    this._notify('favorites');
                    console.log('✅ تم تحميل البيانات من Firebase');
                }
            } catch (error) {
                console.error('❌ فشل تحميل البيانات من Firebase:', error);
            }
        },

        // إعادة تعيين الحالة (تسجيل الخروج)
        reset: function() {
            this.user = null;
            this.isGuest = false;
            this.isAdmin = false;
            this.cart = [];
            this.favorites = [];
            
            // مسح البيانات المحلية تماماً
            sessionStorage.removeItem('guest_cart');
            sessionStorage.removeItem('guest_favorites');
            localStorage.removeItem('app_cart'); // تنظيف المخلفات القديمة
            localStorage.removeItem('app_favorites');
            
            this._notify('user');
            this._notify('cart');
            this._notify('favorites');
        }
    };

    window.AppState = AppState;

    // ربط الدوال القديمة للتوافق
    Object.defineProperty(window, 'currentUser', { get: () => AppState.user });
    Object.defineProperty(window, 'cartItems', { get: () => AppState.cart });
    Object.defineProperty(window, 'favorites', { get: () => AppState.favorites });

    console.log('✅ state-manager.js updated (Firebase-first)');
})();
