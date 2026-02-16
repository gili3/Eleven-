/**
 * settings.js - قسم إعدادات المتجر
 */

let siteSettings = {};

async function loadSettings() {
    try {
        console.log('⚙️ جاري تحميل الإعدادات...');
        const { db, firebaseModules } = window;
        const docRef = firebaseModules.doc(db, 'settings', 'store');
        const docSnap = await firebaseModules.getDoc(docRef);
        
        if (docSnap.exists()) {
            siteSettings = docSnap.data();
            fillSettingsForm();
        }
        
        console.log('✅ تم تحميل الإعدادات');
    } catch (error) {
        console.error('❌ خطأ في تحميل الإعدادات:', error);
        window.adminUtils.showToast('فشل تحميل الإعدادات', 'error');
    }
}

function fillSettingsForm() {
    const fields = [
        'storeName', 'storeEmail', 'storePhone', 'storeCurrency', 'storeDescription', 'storeKeywords',
        'shippingCost', 'freeShippingLimit', 'shippingEstimatedDays',
        'bankName', 'bankAccount', 'bankAccountName',
        'aboutUs', 'address', 'workingHours',
        'facebook', 'instagram', 'twitter', 'whatsapp', 'youtube', 'tiktok', 'telegram',
        'primaryColor', 'secondaryColor', 'accentColor', 'backgroundColor', 'textColor',
        'taxRate', 'minOrderAmount', 'maxOrderAmount', 'itemsPerPage',
        'adminEmail', 'notificationEmail',
        'maintenanceMessage', 'privacyPolicy', 'termsAndConditions', 'returnPolicy',
        'seoTitle', 'seoDescription', 'seoKeywords'
    ];
    
    fields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            element.value = siteSettings[field] || '';
        }
    });

    // تعبئة إعدادات الشعار إذا وجدت
    const logoPreview = document.getElementById('logoPreview');
    if (logoPreview && siteSettings.logo) {
        logoPreview.src = siteSettings.logo;
        logoPreview.style.display = 'block';
        const placeholder = document.querySelector('.image-placeholder');
        if (placeholder) placeholder.style.display = 'none';
    }

    // تعبئة خانات الاختيار
    const enableNotifications = document.getElementById('enableNotifications');
    if (enableNotifications) {
        enableNotifications.checked = siteSettings.enableNotifications || false;
    }
    const maintenanceMode = document.getElementById('maintenanceMode');
    if (maintenanceMode) {
        maintenanceMode.checked = siteSettings.maintenanceMode || false;
    }
}

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

        // رفع الأيقونة إذا تم اختيار ملف
        const faviconFile = document.getElementById('faviconFile')?.files[0];
        let faviconUrl = siteSettings.favicon;

        if (faviconFile) {
            const fileName = `settings/favicon_${Date.now()}_${faviconFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const storageRef = firebaseModules.ref(storage, fileName);
            await firebaseModules.uploadBytes(storageRef, faviconFile);
            faviconUrl = await firebaseModules.getDownloadURL(storageRef);
        }

        const getValue = (id) => document.getElementById(id)?.value?.trim() || '';
        const getFloat = (id) => parseFloat(document.getElementById(id)?.value) || 0;
        const getCheck = (id) => document.getElementById(id)?.checked || false;

        const settingsData = {
            // معلومات المتجر
            storeName: getValue('storeName'),
            storeEmail: getValue('storeEmail'),
            storePhone: getValue('storePhone'),
            storeCurrency: getValue('storeCurrency') || 'SDG',
            storeDescription: getValue('storeDescription'),
            storeKeywords: getValue('storeKeywords'),

            // الشحن
            shippingCost: getFloat('shippingCost'),
            freeShippingLimit: getFloat('freeShippingLimit'),
            shippingEstimatedDays: getValue('shippingEstimatedDays'),

            // الدفع
            bankName: getValue('bankName'),
            bankAccount: getValue('bankAccount'),
            bankAccountName: getValue('bankAccountName'),
            enableCashOnDelivery: getCheck('enableCashOnDelivery'),
            enableBankTransfer: getCheck('enableBankTransfer'),

            // الاتصال
            aboutUs: getValue('aboutUs'),
            address: getValue('address'),
            workingHours: getValue('workingHours'),

            // التواصل الاجتماعي
            facebook: getValue('facebook'),
            instagram: getValue('instagram'),
            twitter: getValue('twitter'),
            whatsapp: getValue('whatsapp'),
            youtube: getValue('youtube'),
            tiktok: getValue('tiktok'),
            telegram: getValue('telegram'),

            // التصميم
            primaryColor: getValue('primaryColor'),
            secondaryColor: getValue('secondaryColor'),
            accentColor: getValue('accentColor'),
            backgroundColor: getValue('backgroundColor'),
            textColor: getValue('textColor'),

            // الضرائب والطلبات
            taxRate: getFloat('taxRate'),
            taxEnabled: getCheck('taxEnabled'),
            minOrderAmount: getFloat('minOrderAmount'),
            maxOrderAmount: getFloat('maxOrderAmount'),
            allowGuestCheckout: getCheck('allowGuestCheckout'),
            itemsPerPage: parseInt(document.getElementById('itemsPerPage')?.value) || 12,

            // الإشعارات
            enableNotifications: getCheck('enableNotifications'),
            enableEmailNotifications: getCheck('enableEmailNotifications'),
            enableSMSNotifications: getCheck('enableSMSNotifications'),
            adminEmail: getValue('adminEmail'),
            notificationEmail: getValue('notificationEmail'),

            // ميزات أخرى
            enableCoupons: getCheck('enableCoupons'),
            enableReviews: getCheck('enableReviews'),
            enableWishlist: getCheck('enableWishlist'),
            enableCompare: getCheck('enableCompare'),

            // SEO
            seoTitle: getValue('seoTitle'),
            seoDescription: getValue('seoDescription'),
            seoKeywords: getValue('seoKeywords'),

            // صفحات
            privacyPolicy: getValue('privacyPolicy'),
            termsAndConditions: getValue('termsAndConditions'),
            returnPolicy: getValue('returnPolicy'),

            // الصيانة
            maintenanceMode: getCheck('maintenanceMode'),
            maintenanceMessage: getValue('maintenanceMessage'),

            // الميديا
            logo: logoUrl,
            favicon: faviconUrl,

            updatedAt: firebaseModules.serverTimestamp(),
            updatedBy: window.currentUser?.uid || null
        };

        await firebaseModules.setDoc(
            firebaseModules.doc(db, 'settings', 'store'), 
            settingsData, 
            { merge: true }
        );
        
        window.adminUtils.showToast('✅ تم حفظ الإعدادات بنجاح', 'success');
        siteSettings = settingsData;
        
        // تحديث معاينة الشعار
        if (logoUrl) {
            const logoPreview = document.getElementById('logoPreview');
            if (logoPreview) {
                logoPreview.src = logoUrl;
                logoPreview.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('❌ خطأ في حفظ الإعدادات:', error);
        window.adminUtils.showToast('حدث خطأ في حفظ الإعدادات', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// معاينة الشعار قبل الرفع
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

// تصدير الإعدادات
function exportSettings() {
    const settingsJSON = JSON.stringify(siteSettings, null, 2);
    window.adminUtils.downloadFile(settingsJSON, 'settings_backup.json', 'application/json');
}

// استيراد الإعدادات
function importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const settings = JSON.parse(e.target.result);
                const { db, firebaseModules } = window;
                
                await firebaseModules.setDoc(
                    firebaseModules.doc(db, 'settings', 'store'),
                    settings,
                    { merge: true }
                );
                
                window.adminUtils.showToast('✅ تم استيراد الإعدادات', 'success');
                await loadSettings();
            } catch (error) {
                console.error('❌ خطأ في استيراد الإعدادات:', error);
                window.adminUtils.showToast('ملف غير صالح', 'error');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

window.loadSettings = loadSettings;
window.saveSettings = saveSettings;
window.previewLogo = previewLogo;
window.exportSettings = exportSettings;
window.importSettings = importSettings;