/**
 * settings.js - قسم إعدادات المتجر (نسخة مصلحة)
 */

let siteSettings = {};

/**
 * دالة تحميل الإعدادات من Firestore
 */
async function loadSettings() {
    try {
        console.log('⚙️ جاري تحميل الإعدادات...');
        
        // إظهار حالة التحميل في الحاوية
        const settingsContainer = document.getElementById('settingsContainer');
        if (settingsContainer) {
            settingsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: var(--primary-color);"></i>
                    <p style="margin-top: 15px;">جاري تحميل الإعدادات...</p>
                </div>
            `;
        }

        const { db, firebaseModules } = window;
        if (!db || !firebaseModules) {
            throw new Error('Firebase database or modules not found');
        }

        const docRef = firebaseModules.doc(db, 'settings', 'store');
        const docSnap = await firebaseModules.getDoc(docRef);
        
        // إنشاء نموذج الإعدادات إذا لم يكن موجوداً
        renderSettingsForm();

        if (docSnap.exists()) {
            siteSettings = docSnap.data();
            fillSettingsForm();
            console.log('✅ تم تحميل الإعدادات بنجاح');
        } else {
            console.warn('⚠️ وثيقة الإعدادات غير موجودة في Firestore');
            // لا نفعل شيئاً، النموذج سيبقى فارغاً للبدء
        }
        
    } catch (error) {
        console.error('❌ خطأ في تحميل الإعدادات:', error);
        if (window.adminUtils && window.adminUtils.showToast) {
            window.adminUtils.showToast('فشل تحميل الإعدادات من الخادم', 'error');
        }
        
        // إظهار رسالة خطأ في الحاوية
        const settingsContainer = document.getElementById('settingsContainer');
        if (settingsContainer) {
            settingsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #d32f2f;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px;"></i>
                    <p style="margin-top: 15px;">فشل تحميل الإعدادات. يرجى التأكد من اتصالك بالإنترنت.</p>
                    <button onclick="loadSettings()" style="margin-top: 10px; padding: 8px 20px; background: var(--primary-color); color: white; border: none; border-radius: 5px; cursor: pointer;">إعادة المحاولة</button>
                </div>
            `;
        }
    }
}

/**
 * دالة إنشاء نموذج الإعدادات في HTML
 */
function renderSettingsForm() {
    const settingsContainer = document.getElementById('settingsContainer');
    if (!settingsContainer) return;

    settingsContainer.innerHTML = `
        <form id="settingsForm" onsubmit="saveSettings(event)" class="admin-card" style="padding: 25px;">
            <div class="settings-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 25px;">
                <!-- معلومات المتجر الأساسية -->
                <div class="settings-section">
                    <h3 style="margin-bottom: 15px; border-bottom: 2px solid #eee; padding-bottom: 10px;"><i class="fas fa-info-circle"></i> معلومات المتجر</h3>
                    <div class="form-group">
                        <label for="storeName">اسم المتجر</label>
                        <input type="text" id="storeName" placeholder="Eleven Store" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="storeEmail">البريد الإلكتروني للمتجر</label>
                        <input type="email" id="storeEmail" placeholder="info@eleven.com" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="storePhone">رقم هاتف المتجر</label>
                        <input type="text" id="storePhone" placeholder="0912345678" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="storeCurrency">العملة</label>
                        <input type="text" id="storeCurrency" placeholder="SDG" class="form-control">
                    </div>
                </div>

                <!-- إعدادات الشحن والدفع -->
                <div class="settings-section">
                    <h3 style="margin-bottom: 15px; border-bottom: 2px solid #eee; padding-bottom: 10px;"><i class="fas fa-truck"></i> الشحن والدفع</h3>
                    <div class="form-group">
                        <label for="shippingCost">تكلفة الشحن الثابتة</label>
                        <input type="number" id="shippingCost" placeholder="0" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="freeShippingLimit">حد الشحن المجاني</label>
                        <input type="number" id="freeShippingLimit" placeholder="0" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="shippingEstimatedDays">مدة التوصيل المتوقعة</label>
                        <input type="text" id="shippingEstimatedDays" placeholder="2-4 أيام" class="form-control">
                    </div>
                    <div class="form-group" style="margin-top: 15px;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" id="enableCashOnDelivery"> تفعيل الدفع عند الاستلام
                        </label>
                    </div>
                </div>

                <!-- إعدادات الحساب البنكي -->
                <div class="settings-section">
                    <h3 style="margin-bottom: 15px; border-bottom: 2px solid #eee; padding-bottom: 10px;"><i class="fas fa-university"></i> التحويل البنكي</h3>
                    <div class="form-group">
                        <label for="bankName">اسم البنك</label>
                        <input type="text" id="bankName" placeholder="بنك الخرطوم" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="bankAccount">رقم الحساب</label>
                        <input type="text" id="bankAccount" placeholder="1234567" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="bankAccountName">اسم صاحب الحساب</label>
                        <input type="text" id="bankAccountName" placeholder="Eleven Store" class="form-control">
                    </div>
                </div>

                <!-- التواصل الاجتماعي -->
                <div class="settings-section">
                    <h3 style="margin-bottom: 15px; border-bottom: 2px solid #eee; padding-bottom: 10px;"><i class="fas fa-share-alt"></i> التواصل الاجتماعي</h3>
                    <div class="form-group">
                        <label for="facebook">فيسبوك (رابط)</label>
                        <input type="text" id="facebook" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="instagram">انستجرام (رابط)</label>
                        <input type="text" id="instagram" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="whatsapp">واتساب (رقم)</label>
                        <input type="text" id="whatsapp" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="tiktok">تيك توك (رابط)</label>
                        <input type="text" id="tiktok" class="form-control">
                    </div>
                </div>

                <!-- الميديا والشعار -->
                <div class="settings-section">
                    <h3 style="margin-bottom: 15px; border-bottom: 2px solid #eee; padding-bottom: 10px;"><i class="fas fa-image"></i> الهوية البصرية</h3>
                    <div class="form-group">
                        <label>شعار المتجر</label>
                        <div style="margin-bottom: 10px; text-align: center;">
                            <img id="logoPreview" src="" alt="Logo" style="max-width: 150px; display: none; margin: 0 auto 10px; border: 1px solid #ddd; padding: 5px; border-radius: 5px;">
                            <div class="image-placeholder" style="width: 100px; height: 100px; background: #f5f5f5; border: 2px dashed #ddd; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
                                <i class="fas fa-image" style="color: #ccc; font-size: 30px;"></i>
                            </div>
                        </div>
                        <input type="file" id="logoFile" accept="image/*" onchange="previewLogo(event)" class="form-control">
                    </div>
                </div>

                <!-- وضع الصيانة -->
                <div class="settings-section">
                    <h3 style="margin-bottom: 15px; border-bottom: 2px solid #eee; padding-bottom: 10px;"><i class="fas fa-tools"></i> الصيانة والنظام</h3>
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" id="maintenanceMode"> تفعيل وضع الصيانة
                        </label>
                    </div>
                    <div class="form-group">
                        <label for="maintenanceMessage">رسالة الصيانة</label>
                        <textarea id="maintenanceMessage" rows="3" class="form-control"></textarea>
                    </div>
                </div>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; gap: 15px;">
                <button type="button" onclick="exportSettings()" class="btn-secondary" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer;"><i class="fas fa-download"></i> نسخة احتياطية</button>
                <button type="submit" class="btn-primary" style="padding: 10px 40px; background: var(--primary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;"><i class="fas fa-save"></i> حفظ جميع الإعدادات</button>
            </div>
        </form>
    `;
}

/**
 * دالة تعبئة النموذج بالبيانات
 */
function fillSettingsForm() {
    const fields = [
        'storeName', 'storeEmail', 'storePhone', 'storeCurrency', 
        'shippingCost', 'freeShippingLimit', 'shippingEstimatedDays',
        'bankName', 'bankAccount', 'bankAccountName',
        'facebook', 'instagram', 'whatsapp', 'tiktok',
        'maintenanceMessage'
    ];
    
    fields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            element.value = siteSettings[field] || '';
        }
    });

    // تعبئة خانات الاختيار
    const cod = document.getElementById('enableCashOnDelivery');
    if (cod) cod.checked = siteSettings.enableCashOnDelivery || false;

    const maintenance = document.getElementById('maintenanceMode');
    if (maintenance) maintenance.checked = siteSettings.maintenanceMode || false;

    // معاينة الشعار
    const logoPreview = document.getElementById('logoPreview');
    if (logoPreview && siteSettings.logo) {
        logoPreview.src = siteSettings.logo;
        logoPreview.style.display = 'block';
        const placeholder = document.querySelector('.image-placeholder');
        if (placeholder) placeholder.style.display = 'none';
    }
}

/**
 * دالة حفظ الإعدادات
 */
async function saveSettings(event) {
    event.preventDefault();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

    try {
        const { db, storage, firebaseModules } = window;
        
        // رفع الشعار إذا تم اختيار ملف
        const logoFile = document.getElementById('logoFile')?.files[0];
        let logoUrl = siteSettings.logo;

        if (logoFile) {
            const fileName = `settings/logo_${Date.now()}_${logoFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const storageRef = firebaseModules.ref(storage, fileName);
            await firebaseModules.uploadBytes(storageRef, logoFile);
            logoUrl = await firebaseModules.getDownloadURL(storageRef);
        }

        const getValue = (id) => document.getElementById(id)?.value?.trim() || '';
        const getFloat = (id) => parseFloat(document.getElementById(id)?.value) || 0;
        const getCheck = (id) => document.getElementById(id)?.checked || false;

        const settingsData = {
            storeName: getValue('storeName'),
            storeEmail: getValue('storeEmail'),
            storePhone: getValue('storePhone'),
            storeCurrency: getValue('storeCurrency'),
            shippingCost: getFloat('shippingCost'),
            freeShippingLimit: getFloat('freeShippingLimit'),
            shippingEstimatedDays: getValue('shippingEstimatedDays'),
            enableCashOnDelivery: getCheck('enableCashOnDelivery'),
            bankName: getValue('bankName'),
            bankAccount: getValue('bankAccount'),
            bankAccountName: getValue('bankAccountName'),
            facebook: getValue('facebook'),
            instagram: getValue('instagram'),
            whatsapp: getValue('whatsapp'),
            tiktok: getValue('tiktok'),
            maintenanceMode: getCheck('maintenanceMode'),
            maintenanceMessage: getValue('maintenanceMessage'),
            logo: logoUrl,
            updatedAt: firebaseModules.serverTimestamp(),
            updatedBy: window.currentUser?.uid || 'admin'
        };

        await firebaseModules.setDoc(
            firebaseModules.doc(db, 'settings', 'store'), 
            settingsData, 
            { merge: true }
        );
        
        if (window.adminUtils && window.adminUtils.showToast) {
            window.adminUtils.showToast('✅ تم حفظ الإعدادات بنجاح', 'success');
        } else {
            alert('تم حفظ الإعدادات بنجاح');
        }
        
        siteSettings = settingsData;
    } catch (error) {
        console.error('❌ خطأ في حفظ الإعدادات:', error);
        if (window.adminUtils && window.adminUtils.showToast) {
            window.adminUtils.showToast('حدث خطأ في حفظ الإعدادات', 'error');
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

/**
 * معاينة الشعار قبل الرفع
 */
function previewLogo(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('logoPreview');
            const placeholder = document.querySelector('.image-placeholder');
            
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
            if (placeholder) {
                placeholder.style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
    }
}

/**
 * تصدير الإعدادات كملف JSON
 */
function exportSettings() {
    const settingsJSON = JSON.stringify(siteSettings, null, 2);
    const blob = new Blob([settingsJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'settings_backup.json';
    a.click();
    URL.revokeObjectURL(url);
}

// تصدير الدوال للنافذة العامة
window.loadSettings = loadSettings;
window.saveSettings = saveSettings;
window.previewLogo = previewLogo;
window.exportSettings = exportSettings;
