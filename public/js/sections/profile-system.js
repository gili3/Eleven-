// profile-system.js - إدارة الملف الشخصي والمستخدم
// ======================== الملف الشخصي ========================

function updateUserProfile() {
    if (!window.currentUser) return;
    
    const savedUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};
    const userName = window.currentUser.displayName || savedUser.displayName || savedUser.name || 'زائر';
    const userEmail = window.currentUser.email || savedUser.email || 'ليس لديك حساب';
    const userPhone = window.currentUser.phone || savedUser.phone || '--';
    const userAddress = window.currentUser.address || savedUser.address || '--';
    
    const elements = [
        { id: 'profileName', text: userName },
        { id: 'mobileUserName', text: userName },
        { id: 'profileEmail', text: userEmail },
        { id: 'mobileUserEmail', text: userEmail },
        { id: 'detailName', text: userName },
        { id: 'detailEmail', text: userEmail },
        { id: 'detailPhone', text: userPhone },
        { id: 'detailAddress', text: userAddress }
    ];
    
    // تحديث العناصر مع التحقق من وجودها أولاً
    elements.forEach(el => {
        const element = document.getElementById(el.id);
        if (element) {
            element.textContent = el.text;
        } else {
            console.warn(`⚠️ العنصر غير موجود: ${el.id}`);
        }
    });
    
    // تحديث الصور الشخصية مع التحقق
    if (window.currentUser.photoURL) {
        const images = document.querySelectorAll('#profileImage, #mobileUserImage');
        images.forEach(img => {
            if (img) {
                img.src = window.currentUser.photoURL;
            }
        });
    }
    
    if (typeof updateProfileStats === 'function') updateProfileStats();
}

async function updateProfileStats() {
    const favoritesCount = window.favorites ? window.favorites.length : 0;
    
    const favoritesCountElement = document.getElementById('favoritesCount');
    if (favoritesCountElement) {
        favoritesCountElement.textContent = favoritesCount;
    }
    
    let ordersCount = 0;
    let totalSpent = 0;
    
    const userId = window.currentUser?.uid;
    const db = window.db;
    
    if (db && userId) {
        try {
            const ordersRef = window.firebaseModules.collection(db, "orders");
            const q = window.firebaseModules.query(ordersRef, window.firebaseModules.where("userId", "==", userId));
            const querySnapshot = await window.firebaseModules.getDocs(q);
            
            querySnapshot.forEach((doc) => {
                const order = doc.data();
                ordersCount++;
                if (order.status === 'delivered') {
                    totalSpent += parseFloat(order.total || 0);
                }
            });
        } catch (error) {
            console.error('خطأ في تحميل إحصائيات المستخدم من Firebase:', error);
        }
    }
    
    const ordersCountElement = document.getElementById('ordersCount');
    const totalSpentElement = document.getElementById('totalSpent');
    
    if (ordersCountElement) ordersCountElement.textContent = ordersCount;
    if (totalSpentElement) totalSpentElement.textContent = (typeof window.formatNumber === 'function' ? window.formatNumber(totalSpent) : totalSpent) + ' SDG';
}

function editProfile() {
    // التحقق من وجود مستخدم مسجل
    if (!window.currentUser || window.currentUser.isGuest) {
        if (typeof showToast === 'function') {
            showToast('يجب تسجيل الدخول أولاً لتعديل الملف الشخصي', 'warning');
        }
        // توجيه المستخدم إلى صفحة تسجيل الدخول
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }
    
    const modal = document.getElementById('editProfileModal');
    if (!modal) return;
    
    const savedUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};
    
    const nameInput = document.getElementById('editName');
    const phoneInput = document.getElementById('editPhone');
    const addressInput = document.getElementById('editAddress');
    
    if (nameInput) nameInput.value = window.currentUser?.displayName || savedUser.displayName || '';
    if (phoneInput) phoneInput.value = window.currentUser?.phone || savedUser.phone || '';
    if (addressInput) addressInput.value = window.currentUser?.address || savedUser.address || '';
    
    modal.classList.add('active');
}

async function saveProfileChanges() {
    // التحقق من وجود مستخدم مسجل
    if (!window.currentUser || window.currentUser.isGuest) {
        if (typeof showToast === 'function') {
            showToast('يجب تسجيل الدخول أولاً لحفظ التغييرات', 'warning');
        }
        return;
    }
    
    const nameInput = document.getElementById('editName');
    const phoneInput = document.getElementById('editPhone');
    const addressInput = document.getElementById('editAddress');
    
    if (!nameInput || !phoneInput || !addressInput) {
        if (typeof showToast === 'function') showToast('حدث خطأ في الوصول للحقول', 'error');
        return;
    }
    
    // تنظيف المدخلات من XSS باستخدام safeHTML
    const name = window.safeHTML ? window.safeHTML(nameInput.value.trim()) : nameInput.value.trim();
    const phone = phoneInput.value.trim().replace(/[^0-9+\-\s]/g, '');
    const address = window.safeHTML ? window.safeHTML(addressInput.value.trim()) : addressInput.value.trim();
    
    if (!name) {
        if (typeof showToast === 'function') showToast('يرجى إدخال الاسم', 'warning');
        return;
    }
    
    if (typeof showLoadingSpinner === 'function') showLoadingSpinner('جاري حفظ التغييرات...');
    
    try {
        const auth = window.auth;
        const db = window.db;
        
        if (auth && auth.currentUser) {
            await window.firebaseModules.updateProfile(auth.currentUser, {
                displayName: name
            });
        }
        
        const userRef = window.firebaseModules.doc(db, "users", window.currentUser.uid);
        await window.firebaseModules.updateDoc(userRef, {
            displayName: name,
            phone: phone,
            address: address,
            updatedAt: window.firebaseModules.serverTimestamp()
        });
        
        // تحديث المتغيرات المحلية
        window.currentUser.displayName = name;
        window.currentUser.phone = phone;
        window.currentUser.address = address;
        
        // تخزين بيانات ضرورية فقط في sessionStorage
        const userSnapshot = {
            uid: window.currentUser.uid,
            displayName: name,
            email: window.currentUser.email,
            phone: phone,
            address: address,
            isGuest: window.currentUser.isGuest || false
        };
        sessionStorage.setItem('currentUser', JSON.stringify(userSnapshot));
        
        // تحديث AppState إن وجد
        if (window.AppState && window.AppState.setUser) {
            window.AppState.setUser({
                ...window.AppState.user,
                displayName: name,
                phone: phone,
                address: address
            }, window.currentUser.isGuest);
        }
        
        if (typeof updateUserProfile === 'function') updateUserProfile();
        
        const modal = document.getElementById('editProfileModal');
        if (modal) modal.classList.remove('active');
        
        if (typeof showToast === 'function') showToast('تم تحديث الملف الشخصي بنجاح', 'success');
    } catch (error) {
        console.error('خطأ في تحديث الملف الشخصي:', error);
        if (typeof showToast === 'function') showToast('حدث خطأ أثناء التحديث', 'error');
    } finally {
        if (typeof hideLoadingSpinner === 'function') hideLoadingSpinner();
    }
}

// ======================== التصدير للاستخدام العام ========================

window.updateUserProfile = updateUserProfile;
window.updateProfileStats = updateProfileStats;
window.editProfile = editProfile;
window.saveProfileChanges = saveProfileChanges;

// تهيئة عند تحميل الملف
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ profile-system.js loaded');
    // تحديث الملف الشخصي عند فتح القسم
    const profileSection = document.getElementById('profile');
    if (profileSection && profileSection.classList.contains('active')) {
        setTimeout(() => updateUserProfile(), 100);
    }
});

console.log('✅ profile-system.js loaded successfully');