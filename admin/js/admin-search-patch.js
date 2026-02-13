// admin-search-patch.js - إصلاح البحث في لوحة التحكم ودعم حقل name_lowercase
// يتم تحميل هذا الملف بعد ملفات الأدمن الأساسية لتجاوز الدوال المعماة (obfuscated)

(function() {
    console.log("🛠️ جاري تطبيق رقعة البحث في لوحة التحكم...");

    // انتظار تحميل الدوال الأساسية
    const interval = setInterval(() => {
        if (typeof window.saveProduct === 'function') {
            clearInterval(interval);
            patchSaveProduct();
        }
    }, 500);

    function patchSaveProduct() {
        const originalSaveProduct = window.saveProduct;
        
        // تجاوز دالة حفظ المنتج لإضافة name_lowercase
        window.saveProduct = async function() {
            console.log("📝 تم استدعاء دالة حفظ المنتج (المعدلة)...");
            
            // استخراج القيم من الحقول
            const name = document.getElementById('productName')?.value?.trim() || '';
            
            if (name) {
                // إنشاء حقل name_lowercase تلقائياً
                // بما أننا لا نستطيع تعديل الكود المعمى بسهولة، سنقوم بإضافة الحقل
                // بعد تنفيذ الدالة الأصلية أو محاولة حقنه
                
                // الاستراتيجية: تعديل دالة Firestore updateDoc و addDoc مؤقتاً لحقن الحقل
                const originalUpdateDoc = window.firebaseModules.updateDoc;
                const originalAddDoc = window.firebaseModules.addDoc;
                
                window.firebaseModules.updateDoc = function(ref, data) {
                    if (data && data.name) {
                        data.name_lowercase = data.name.toLowerCase();
                    }
                    return originalUpdateDoc(ref, data);
                };
                
                window.firebaseModules.addDoc = function(ref, data) {
                    if (data && data.name) {
                        data.name_lowercase = data.name.toLowerCase();
                    }
                    return originalAddDoc(ref, data);
                };
                
                try {
                    await originalSaveProduct();
                } finally {
                    // استعادة الدوال الأصلية
                    window.firebaseModules.updateDoc = originalUpdateDoc;
                    window.firebaseModules.addDoc = originalAddDoc;
                }
            } else {
                originalSaveProduct();
            }
        };
        
        console.log("✅ تم تطبيق رقعة حفظ المنتجات بنجاح");
    }
})();
