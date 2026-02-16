/**
 * settings-enhanced.js - صفحة الإعدادات الشاملة المحسّنة
 */

let siteSettings = {};
let isLoadingSettings = false;

/**
 * تحميل جميع الإعدادات من Firebase
 */
async function loadSettings() {
    if (isLoadingSettings) return;
    isLoadingSettings = true;
    
    try {
        console.log('⚙️ جاري تحميل الإعدادات...');
        const { db, firebaseModules } = window;
        const docRef = firebaseModules.doc(db, 'settings', 'store');
        const docSnap = await firebaseModules.getDoc(docRef);
        
        if (docSnap.exists()) {
            siteSettings = docSnap.data();
            fillSettingsForm();
        } else {
            // إنشاء إعدادات افتراضية
            siteSettings = getDefaultSettings();
            await saveDefaultSettings();
            fillSettingsForm();
        }
        
        console.log('✅ تم تحميل الإعدادات');
    } catch (error) {
        console.error('❌ خطأ في تحميل الإعدادات:', error);
        window.adminUtils.showToast('فشل تحميل الإعدادات', 'error');
    } finally {
        isLoadingSettings = false;
    }
}

/**
 * الحصول على الإعدادات الافتراضية
 */
function getDefaultSettings() {
    return {
        // معلومات المتجر الأساسية
        storeName: 'Eleven Store',
        storeEmail: 'info@elevenstore.com',
        storePhone: '+249123456789',
        storeCurrency: 'SDG',
        storeDescription: '',
        storeKeywords: '',
        
        // إعدادات الشحن
        shippingCost: 0,
        freeShippingLimit: 0,
        shippingEstimatedDays: '3-5',
        
        // إعدادات الدفع
        bankName: '',
        bankAccount: '',
        bankAccountName: '',
        enableCashOnDelivery: true,
        enableBankTransfer: true,
        
        // معلومات الاتصال
        address: '',
        workingHours: '',
        aboutUs: '',
        
        // روابط التواصل الاجتماعي
        facebook: '',
        instagram: '',
        twitter: '',
        whatsapp: '',
        youtube: '',
        tiktok: '',
        telegram: '',
        
        // الألوان والتصميم
        primaryColor: '#1a1a1a',
        secondaryColor: '#555555',
        accentColor: '#007bff',
        backgroundColor: '#ffffff',
        textColor: '#333333',
        
        // الشعار والصور
        logo: '',
        favicon: '',
        bannerImage: '',
        
        // إعدادات الضرائب والرسوم
        taxRate: 0,
        taxEnabled: false,
        
        // إعدادات الطلبات
        minOrderAmount: 0,
        maxOrderAmount: 0,
        allowGuestCheckout: true,
        
        // إعدادات الإشعارات
        enableNotifications: true,
        enableEmailNotifications: false,
        enableSMSNotifications: false,
        adminEmail: '',
        notificationEmail: '',
        
        // إعدادات الكوبونات
        enableCoupons: true,
        
        // إعدادات SEO
        seoTitle: '',
        seoDescription: '',
        seoKeywords: '',
        
        // الصفحات الثابتة
        privacyPolicy: '',
        termsAndConditions: '',
        returnPolicy: '',
        
        // إعدادات الصيانة
        maintenanceMode: false,
        maintenanceMessage: 'الموقع تحت الصيانة، سنعود قريباً',
        
        // إعدادات متقدمة
        enableReviews: true,
        enableWishlist: true,
        enableCompare: false,
        itemsPerPage: 12,
        
        // التواريخ
        createdAt: null,
        updatedAt: null,
        updatedBy: null
    };
}

/**
 * حفظ الإعدادات الافتراضية
 */
async function saveDefaultSettings() {
    try {
        const { db, firebaseModules } = window;
        siteSettings.createdAt = firebaseModules.serverTimestamp();
        siteSettings.updatedAt = firebaseModules.serverTimestamp();
        
        await firebaseModules.setDoc(
            firebaseModules.doc(db, 'settings', 'store'),
            siteSettings
        );
    } catch (error) {
        console.error('❌ خطأ في حفظ الإعدادات الافتراضية:', error);
    }
}

/**
 * تعبئة نموذج الإعدادات
 */
function fillSettingsForm() {
    // معلومات المتجر
    setValue('storeName', siteSettings.storeName);
    setValue('storeEmail', siteSettings.storeEmail);
    setValue('storePhone', siteSettings.storePhone);
    setValue('storeCurrency', siteSettings.storeCurrency);
    setValue('storeDescription', siteSettings.storeDescription);
    setValue('storeKeywords', siteSettings.storeKeywords);
    
    // إعدادات الشحن
    setValue('shippingCost', siteSettings.shippingCost);
    setValue('freeShippingLimit', siteSettings.freeShippingLimit);
    setValue('shippingEstimatedDays', siteSettings.shippingEstimatedDays);
    
    // إعدادات الدفع
    setValue('bankName', siteSettings.bankName);
    setValue('bankAccount', siteSettings.bankAccount);
    setValue('bankAccountName', siteSettings.bankAccountName);
    setChecked('enableCashOnDelivery', siteSettings.enableCashOnDelivery);
    setChecked('enableBankTransfer', siteSettings.enableBankTransfer);
    
    // معلومات الاتصال
    setValue('address', siteSettings.address);
    setValue('workingHours', siteSettings.workingHours);
    setValue('aboutUs', siteSettings.aboutUs);
    
    // روابط التواصل الاجتماعي
    setValue('facebook', siteSettings.facebook);
    setValue('instagram', siteSettings.instagram);
    setValue('twitter', siteSettings.twitter);
    setValue('whatsapp', siteSettings.whatsapp);
    setValue('youtube', siteSettings.youtube);
    setValue('tiktok', siteSettings.tiktok);
    setValue('telegram', siteSettings.telegram);
    
    // الألوان
    setValue('primaryColor', siteSettings.primaryColor);
    setValue('secondaryColor', siteSettings.secondaryColor);
    setValue('accentColor', siteSettings.accentColor);
    setValue('backgroundColor', siteSettings.backgroundColor);
    setValue('textColor', siteSettings.textColor);
    
    // الشعار والصور
    if (siteSettings.logo) {
        const logoPreview = document.getElementById('logoPreview');
        if (logoPreview) {
            logoPreview.src = siteSettings.logo;
            logoPreview.style.display = 'block';
        }
    }
    if (siteSettings.favicon) {
        const faviconPreview = document.getElementById('faviconPreview');
        if (faviconPreview) {
            faviconPreview.src = siteSettings.favicon;
            faviconPreview.style.display = 'block';
        }
    }
    
    // إعدادات الضرائب
    setValue('taxRate', siteSettings.taxRate);
    setChecked('taxEnabled', siteSettings.taxEnabled);
    
    // إعدادات الطلبات
    setValue('minOrderAmount', siteSettings.minOrderAmount);
    setValue('maxOrderAmount', siteSettings.maxOrderAmount);
    setChecked('allowGuestCheckout', siteSettings.allowGuestCheckout);
    
    // إعدادات الإشعارات
    setChecked('enableNotifications', siteSettings.enableNotifications);
    setChecked('enableEmailNotifications', siteSettings.enableEmailNotifications);
    setChecked('enableSMSNotifications', siteSettings.enableSMSNotifications);
    setValue('adminEmail', siteSettings.adminEmail);
    setValue('notificationEmail', siteSettings.notificationEmail);
    
    // إعدادات الكوبونات
    setChecked('enableCoupons', siteSettings.enableCoupons);
    
    // إعدادات SEO
    setValue('seoTitle', siteSettings.seoTitle);
    setValue('seoDescription', siteSettings.seoDescription);
    setValue('seoKeywords', siteSettings.seoKeywords);
    
    // الصفحات الثابتة
    setValue('privacyPolicy', siteSettings.privacyPolicy);
    setValue('termsAndConditions', siteSettings.termsAndConditions);
    setValue('returnPolicy', siteSettings.returnPolicy);
    
    // إعدادات الصيانة
    setChecked('maintenanceMode', siteSettings.maintenanceMode);
    setValue('maintenanceMessage', siteSettings.maintenanceMessage);
    
    // إعدادات متقدمة
    setChecked('enableReviews', siteSettings.enableReviews);
    setChecked('enableWishlist', siteSettings.enableWishlist);
    setChecked('enableCompare', siteSettings.enableCompare);
    setValue('itemsPerPage', siteSettings.itemsPerPage);
}

/**
 * دالة مساعدة لتعيين قيمة حقل
 */
function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.value = value || '';
    }
}

/**
 * دالة مساعدة لتعيين حالة checkbox
 */
function setChecked(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.checked = value || false;
    }
}

/**
 * حفظ جميع الإعدادات
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
            logoUrl = await uploadFile(logoFile, 'settings/logo');
        }
        
        // رفع الفافيكون إذا تم اختيار ملف
        const faviconFile = document.getElementById('faviconFile')?.files[0];
        let faviconUrl = siteSettings.favicon;
        if (faviconFile) {
            faviconUrl = await uploadFile(faviconFile, 'settings/favicon');
        }

        const settingsData = {
            // معلومات المتجر
            storeName: getValue('storeName'),
            storeEmail: getValue('storeEmail'),
            storePhone: getValue('storePhone'),
            storeCurrency: getValue('storeCurrency') || 'SDG',
            storeDescription: getValue('storeDescription'),
            storeKeywords: getValue('storeKeywords'),
            
            // إعدادات الشحن
            shippingCost: getNumberValue('shippingCost'),
            freeShippingLimit: getNumberValue('freeShippingLimit'),
            shippingEstimatedDays: getValue('shippingEstimatedDays'),
            
            // إعدادات الدفع
            bankName: getValue('bankName'),
            bankAccount: getValue('bankAccount'),
            bankAccountName: getValue('bankAccountName'),
            enableCashOnDelivery: getChecked('enableCashOnDelivery'),
            enableBankTransfer: getChecked('enableBankTransfer'),
            
            // معلومات الاتصال
            address: getValue('address'),
            workingHours: getValue('workingHours'),
            aboutUs: getValue('aboutUs'),
            
            // روابط التواصل الاجتماعي
            facebook: getValue('facebook'),
            instagram: getValue('instagram'),
            twitter: getValue('twitter'),
            whatsapp: getValue('whatsapp'),
            youtube: getValue('youtube'),
            tiktok: getValue('tiktok'),
            telegram: getValue('telegram'),
            
            // الألوان
            primaryColor: getValue('primaryColor'),
            secondaryColor: getValue('secondaryColor'),
            accentColor: getValue('accentColor'),
            backgroundColor: getValue('backgroundColor'),
            textColor: getValue('textColor'),
            
            // الشعار والصور
            logo: logoUrl,
            favicon: faviconUrl,
            
            // إعدادات الضرائب
            taxRate: getNumberValue('taxRate'),
            taxEnabled: getChecked('taxEnabled'),
            
            // إعدادات الطلبات
            minOrderAmount: getNumberValue('minOrderAmount'),
            maxOrderAmount: getNumberValue('maxOrderAmount'),
            allowGuestCheckout: getChecked('allowGuestCheckout'),
            
            // إعدادات الإشعارات
            enableNotifications: getChecked('enableNotifications'),
            enableEmailNotifications: getChecked('enableEmailNotifications'),
            enableSMSNotifications: getChecked('enableSMSNotifications'),
            adminEmail: getValue('adminEmail'),
            notificationEmail: getValue('notificationEmail'),
            
            // إعدادات الكوبونات
            enableCoupons: getChecked('enableCoupons'),
            
            // إعدادات SEO
            seoTitle: getValue('seoTitle'),
            seoDescription: getValue('seoDescription'),
            seoKeywords: getValue('seoKeywords'),
            
            // الصفحات الثابتة
            privacyPolicy: getValue('privacyPolicy'),
            termsAndConditions: getValue('termsAndConditions'),
            returnPolicy: getValue('returnPolicy'),
            
            // إعدادات الصيانة
            maintenanceMode: getChecked('maintenanceMode'),
            maintenanceMessage: getValue('maintenanceMessage'),
            
            // إعدادات متقدمة
            enableReviews: getChecked('enableReviews'),
            enableWishlist: getChecked('enableWishlist'),
            enableCompare: getChecked('enableCompare'),
            itemsPerPage: getNumberValue('itemsPerPage') || 12,
            
            // التواريخ
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
        
        // تحديث معاينة الصور
        if (logoUrl) {
            const logoPreview = document.getElementById('logoPreview');
            if (logoPreview) {
                logoPreview.src = logoUrl;
                logoPreview.style.display = 'block';
            }
        }
        if (faviconUrl) {
            const faviconPreview = document.getElementById('faviconPreview');
            if (faviconPreview) {
                faviconPreview.src = faviconUrl;
                faviconPreview.style.display = 'block';
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

/**
 * رفع ملف إلى Firebase Storage
 */
async function uploadFile(file, path) {
    const { storage, firebaseModules } = window;
    const fileName = `${path}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storageRef = firebaseModules.ref(storage, fileName);
    await firebaseModules.uploadBytes(storageRef, file);
    return await firebaseModules.getDownloadURL(storageRef);
}

/**
 * دوال مساعدة للحصول على القيم
 */
function getValue(id) {
    const element = document.getElementById(id);
    return element ? element.value.trim() : '';
}

function getNumberValue(id) {
    const element = document.getElementById(id);
    return element ? parseFloat(element.value) || 0 : 0;
}

function getChecked(id) {
    const element = document.getElementById(id);
    return element ? element.checked : false;
}

/**
 * معاينة الصورة قبل الرفع
 */
function previewImage(event, previewId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById(previewId);
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }
}

/**
 * تصدير الإعدادات
 */
function exportSettings() {
    const settingsJSON = JSON.stringify(siteSettings, null, 2);
    const blob = new Blob([settingsJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `settings_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    window.adminUtils.showToast('✅ تم تصدير الإعدادات', 'success');
}

/**
 * استيراد الإعدادات
 */
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

/**
 * إعادة تعيين الإعدادات للقيم الافتراضية
 */
async function resetToDefaults() {
    if (!confirm('⚠️ هل أنت متأكد من إعادة تعيين جميع الإعدادات للقيم الافتراضية؟')) return;
    
    try {
        const { db, firebaseModules } = window;
        const defaultSettings = getDefaultSettings();
        defaultSettings.updatedAt = firebaseModules.serverTimestamp();
        
        await firebaseModules.setDoc(
            firebaseModules.doc(db, 'settings', 'store'),
            defaultSettings,
            { merge: true }
        );
        
        window.adminUtils.showToast('✅ تم إعادة تعيين الإعدادات', 'success');
        await loadSettings();
    } catch (error) {
        console.error('❌ خطأ في إعادة تعيين الإعدادات:', error);
        window.adminUtils.showToast('حدث خطأ في إعادة تعيين الإعدادات', 'error');
    }
}

// تصدير الدوال للاستخدام العام
window.loadSettings = loadSettings;
window.saveSettings = saveSettings;
window.previewImage = previewImage;
window.exportSettings = exportSettings;
window.importSettings = importSettings;
window.resetToDefaults = resetToDefaults;
