/**
 * image-validator.js - نظام التحقق من الصور المتقدم
 * 
 * المميزات:
 * 1. التحقق من صيغة الصورة (jpg, jpeg, png فقط)
 * 2. التحقق من حجم الصورة (5MB كحد أقصى)
 * 3. التحقق من أبعاد الصورة
 * 4. معاينة الصورة قبل الرفع
 * 5. رسائل خطأ واضحة ومفيدة
 */

// إعدادات التحقق من الصور
const IMAGE_CONFIG = {
    MAX_SIZE_MB: 5,
    MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
    ALLOWED_FORMATS: ['image/jpeg', 'image/png', 'image/jpg'],
    ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png'],
    MIN_WIDTH: 100,
    MIN_HEIGHT: 100,
    MAX_WIDTH: 4000,
    MAX_HEIGHT: 4000
};

/**
 * التحقق الشامل من الصورة قبل الرفع
 * @param {File} file - ملف الصورة
 * @param {Object} options - خيارات إضافية
 * @returns {Object} - نتيجة التحقق {valid: boolean, error: string|null}
 */
async function validateImage(file, options = {}) {
    const config = { ...IMAGE_CONFIG, ...options };
    
    // التحقق 1: التحقق من وجود الملف
    if (!file) {
        return {
            valid: false,
            error: '❌ لم يتم اختيار ملف'
        };
    }

    // التحقق 2: التحقق من نوع الملف
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!config.ALLOWED_EXTENSIONS.includes(fileExtension)) {
        return {
            valid: false,
            error: `❌ صيغة الملف غير مدعومة. الصيغ المسموح بها: ${config.ALLOWED_EXTENSIONS.join(', ')}`
        };
    }

    // التحقق 3: التحقق من MIME Type
    if (!config.ALLOWED_FORMATS.includes(file.type)) {
        return {
            valid: false,
            error: `❌ نوع الملف غير صحيح. يجب أن يكون صورة (JPG أو PNG)`
        };
    }

    // التحقق 4: التحقق من حجم الملف
    if (file.size > config.MAX_SIZE_BYTES) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        return {
            valid: false,
            error: `❌ حجم الملف كبير جداً (${fileSizeMB}MB). الحد الأقصى: ${config.MAX_SIZE_MB}MB`
        };
    }

    // التحقق 5: التحقق من أبعاد الصورة
    try {
        const dimensions = await getImageDimensions(file);
        
        if (dimensions.width < config.MIN_WIDTH || dimensions.height < config.MIN_HEIGHT) {
            return {
                valid: false,
                error: `❌ أبعاد الصورة صغيرة جداً (${dimensions.width}x${dimensions.height}px). الحد الأدنى: ${config.MIN_WIDTH}x${config.MIN_HEIGHT}px`
            };
        }

        if (dimensions.width > config.MAX_WIDTH || dimensions.height > config.MAX_HEIGHT) {
            return {
                valid: false,
                error: `❌ أبعاد الصورة كبيرة جداً (${dimensions.width}x${dimensions.height}px). الحد الأقصى: ${config.MAX_WIDTH}x${config.MAX_HEIGHT}px`
            };
        }
    } catch (error) {
        console.warn('⚠️ تحذير: لم يتمكن من التحقق من أبعاد الصورة:', error);
        // لا نرفع الخطأ هنا لأن التحقق من الأبعاد اختياري
    }

    // جميع الفحوصات نجحت
    return {
        valid: true,
        error: null,
        fileSize: (file.size / (1024 * 1024)).toFixed(2),
        dimensions: await getImageDimensions(file).catch(() => null)
    };
}

/**
 * الحصول على أبعاد الصورة
 * @param {File} file - ملف الصورة
 * @returns {Promise<Object>} - {width, height}
 */
function getImageDimensions(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.width,
                    height: img.height
                });
            };
            img.onerror = () => {
                reject(new Error('فشل تحميل الصورة'));
            };
            img.src = e.target.result;
        };
        
        reader.onerror = () => {
            reject(new Error('فشل قراءة الملف'));
        };
        
        reader.readAsDataURL(file);
    });
}

/**
 * معاينة الصورة قبل الرفع مع التحقق
 * @param {Event} event - حدث تغيير الملف
 * @param {String} previewElementId - معرف عنصر المعاينة
 * @param {String} placeholderId - معرف عنصر العنصر النائب
 * @param {Function} callback - دالة callback عند نجاح التحقق
 */
async function previewImageWithValidation(event, previewElementId, placeholderId = null, callback = null) {
    const file = event.target.files[0];
    
    if (!file) return;

    // التحقق من الصورة
    const validation = await validateImage(file);

    if (!validation.valid) {
        console.error(validation.error);
        if (window.adminUtils && window.adminUtils.showToast) {
            window.adminUtils.showToast(validation.error, 'error');
        } else {
            alert(validation.error);
        }
        // إعادة تعيين الملف
        event.target.value = '';
        return;
    }

    // عرض معاينة الصورة
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById(previewElementId);
        const placeholder = placeholderId ? document.getElementById(placeholderId) : null;
        
        if (preview) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        
        if (placeholder) {
            placeholder.style.display = 'none';
        }

        // عرض رسالة النجاح
        const message = `✅ تم التحقق من الصورة بنجاح (${validation.fileSize}MB)`;
        if (window.adminUtils && window.adminUtils.showToast) {
            window.adminUtils.showToast(message, 'success');
        }

        // استدعاء الدالة المخصصة إن وجدت
        if (callback && typeof callback === 'function') {
            callback(file, validation);
        }
    };
    
    reader.onerror = () => {
        const error = '❌ فشل قراءة الملف';
        if (window.adminUtils && window.adminUtils.showToast) {
            window.adminUtils.showToast(error, 'error');
        }
        event.target.value = '';
    };
    
    reader.readAsDataURL(file);
}

/**
 * رفع الصورة مع التحقق المسبق
 * @param {File} file - ملف الصورة
 * @param {String} storagePath - مسار التخزين في Firebase
 * @returns {Promise<String>} - رابط الصورة المرفوعة
 */
async function uploadImageWithValidation(file, storagePath) {
    try {
        // التحقق من الصورة أولاً
        const validation = await validateImage(file);
        
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        // التحقق من توفر Firebase
        if (!window.firebaseModules || !window.storage) {
            throw new Error('❌ Firebase Storage غير مهيأ');
        }

        // إنشاء اسم ملف فريد
        const fileName = `${storagePath}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const storageRef = window.firebaseModules.ref(window.storage, fileName);

        // رفع الملف
        console.log(`📤 جاري رفع الصورة: ${file.name}`);
        await window.firebaseModules.uploadBytes(storageRef, file);

        // الحصول على رابط التحميل
        const downloadURL = await window.firebaseModules.getDownloadURL(storageRef);
        
        console.log(`✅ تم رفع الصورة بنجاح: ${downloadURL}`);
        return downloadURL;

    } catch (error) {
        console.error('❌ خطأ في رفع الصورة:', error);
        throw error;
    }
}

/**
 * حذف الصورة من Firebase Storage
 * @param {String} imageUrl - رابط الصورة
 */
async function deleteImageFromStorage(imageUrl) {
    try {
        if (!window.firebaseModules || !window.storage) {
            console.warn('⚠️ Firebase Storage غير مهيأ');
            return;
        }

        // استخراج اسم الملف من الرابط
        const fileName = decodeURIComponent(imageUrl.split('/o/')[1].split('?')[0]);
        const storageRef = window.firebaseModules.ref(window.storage, fileName);

        // حذف الملف
        await window.firebaseModules.deleteObject(storageRef);
        console.log('✅ تم حذف الصورة بنجاح');

    } catch (error) {
        console.warn('⚠️ خطأ في حذف الصورة (قد تكون محذوفة بالفعل):', error);
    }
}

/**
 * ضغط الصورة قبل الرفع (اختياري)
 * @param {File} file - ملف الصورة
 * @param {Number} quality - جودة الضغط (0-1)
 * @returns {Promise<Blob>} - الصورة المضغوطة
 */
async function compressImage(file, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob(
                    (blob) => resolve(blob),
                    file.type,
                    quality
                );
            };
            img.onerror = () => reject(new Error('فشل تحميل الصورة'));
            img.src = e.target.result;
        };
        
        reader.onerror = () => reject(new Error('فشل قراءة الملف'));
        reader.readAsDataURL(file);
    });
}

// تصدير الدوال
window.validateImage = validateImage;
window.previewImageWithValidation = previewImageWithValidation;
window.uploadImageWithValidation = uploadImageWithValidation;
window.deleteImageFromStorage = deleteImageFromStorage;
window.compressImage = compressImage;
window.getImageDimensions = getImageDimensions;
window.IMAGE_CONFIG = IMAGE_CONFIG;

console.log('✅ Image Validator System Loaded');
