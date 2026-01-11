# دليل إعداد Firebase Storage لمشروع Queen Beauty

يهدف هذا الدليل إلى توضيح الخطوات اللازمة لإعداد وتكوين Firebase Storage لمشروعك، مما يضمن رفع الصور بشكل آمن وفعال للمنتجات وإيصالات الطلبات.

## 1. تفعيل Firebase Storage

تأكد أولاً من تفعيل خدمة Firebase Storage في مشروعك على Firebase Console:

1.  انتقل إلى [Firebase Console](https://console.firebase.google.com/).
2.  اختر مشروعك.
3.  من القائمة الجانبية، اختر **Storage**.
4.  إذا لم تكن الخدمة مفعلة، انقر على **البدء** (Get started) واتبع التعليمات لإنشاء دلو التخزين الافتراضي (default storage bucket).

## 2. إعداد قواعد أمان Firebase Storage (Security Rules)

تعتبر قواعد الأمان ضرورية للتحكم في من يمكنه قراءة وكتابة الملفات في Storage. سنقوم بإعداد قواعد تسمح بما يلي:

*   **للمسؤولين (Admins)**: رفع صور المنتجات وتعديلها.
*   **للمستخدمين المسجلين**: رفع إيصالات الدفع الخاصة بهم وقراءتها.

افتح قسم **Storage** في Firebase Console، ثم انتقل إلى تبويب **القواعد** (Rules) وقم بتحديثها بالكود التالي:

```firebase
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // قواعد خاصة لصور المنتجات (يمكن للمسؤولين فقط الرفع)
    match /products/{productId}/{fileName} {
      allow read: if true; // يمكن لأي شخص قراءة صور المنتجات
      allow write: if request.auth != null && get(/databases/(default)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    // قواعد خاصة لإيصالات الدفع (يمكن للمستخدمين المصادق عليهم فقط الرفع والقراءة)
    match /receipts/{fileName} {
      allow read, write: if request.auth != null;
    }

    // قواعد خاصة لشعار الموقع (يمكن للمسؤولين فقط الرفع)
    match /site/{fileName} {
      allow read: if true; // يمكن لأي شخص قراءة شعار الموقع
      allow write: if request.auth != null && get(/databases/(default)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

**شرح القواعد:**

*   `match /b/{bucket}/o`: يحدد أن هذه القواعد تنطبق على جميع الملفات في دلو التخزين الخاص بك.
*   `match /{allPaths=**}`: قاعدة عامة تسمح للمستخدمين المصادق عليهم (authenticated users) بالقراءة والكتابة. هذه القاعدة ستُستبدل بالقواعد الأكثر تحديداً أدناه.
*   `match /products/{productId}/{fileName}`:
    *   `allow read: if true;`: تسمح لأي شخص (حتى غير المصادق عليهم) بقراءة صور المنتجات.
    *   `allow write: if request.auth != null && get(/databases/(default)/documents/users/$(request.auth.uid)).data.isAdmin == true;`: تسمح فقط للمستخدمين المصادق عليهم الذين لديهم حقل `isAdmin: true` في وثيقة المستخدم الخاصة بهم في Firestore برفع أو تعديل صور المنتجات.
*   `match /receipts/{fileName}`:
    *   `allow read, write: if request.auth != null;`: تسمح فقط للمستخدمين المصادق عليهم برفع وقراءة إيصالات الدفع.
*   `match /site/{fileName}`:
    *   `allow read: if true;`: تسمح لأي شخص بقراءة شعار الموقع.
    *   `allow write: if request.auth != null && get(/databases/(default)/documents/users/$(request.auth.uid)).data.isAdmin == true;`: تسمح فقط للمسؤولين برفع أو تعديل شعار الموقع.

**ملاحظة هامة:** لكي تعمل قواعد `isAdmin`، يجب أن يكون لديك مجموعة `users` في Firestore، وكل وثيقة مستخدم (UID) يجب أن تحتوي على حقل `isAdmin: true` للمستخدمين المسؤولين.

## 3. تحديث الكود البرمجي

لقد قمت بتعديل ملفات `admin.js` و `main.js` لدمج Firebase Storage. إليك ملخص للتغييرات:

*   **`index.html`**: تم استيراد وحدات `ref`, `uploadBytes`, `getDownloadURL`, `uploadBytesResumable` من Firebase Storage SDK.
*   **`admin.js`**: 
    *   تم تهيئة `adminStorage` عند بدء تشغيل لوحة التحكم.
    *   تم إضافة دالة `handleProductImageUpload` لرفع صور المنتجات إلى `products/` في Storage مع عرض شريط تقدم.
    *   تم إضافة دالة `handleLogoUpload` لرفع شعار الموقع إلى `site/` في Storage.
    *   تم تعديل نموذج إضافة/تعديل المنتج في `admin.html` ليشمل حقل `input type="file"` ومعاينة للصورة.
    *   تم تعديل نموذج الإعدادات في `admin.html` ليشمل حقل `input type="file"` لرفع الشعار.
*   **`main.js`**: 
    *   تم تعديل دالة `confirmOrder` لرفع صورة الإيصال إلى `receipts/` في Storage بدلاً من تحويلها إلى Base64.
    *   يتم الآن تخزين رابط الصورة (URL) في Firestore بدلاً من بيانات الصورة المشفرة.

## 4. اختبار الوظائف الجديدة

بعد تطبيق التغييرات وتحديث قواعد Storage، قم باختبار الوظائف التالية:

1.  **رفع صور المنتجات**: حاول إضافة منتج جديد أو تعديل منتج موجود في لوحة التحكم ورفع صورة. تأكد من أن الصورة تظهر بشكل صحيح وأن رابطها يتم حفظه في Firestore.
2.  **رفع شعار الموقع**: في إعدادات لوحة التحكم، حاول رفع شعار جديد وتأكد من تحديثه بشكل صحيح.
3.  **إرسال طلب مع إيصال**: في واجهة المستخدم، قم بإنشاء طلب جديد ورفع صورة إيصال. تأكد من أن الطلب يتم إرساله بنجاح وأن رابط الإيصال يتم حفظه في Firestore.

إذا واجهت أي مشاكل، تحقق من Firebase Console (تبويب Storage -> الملفات) للتأكد من أن الملفات يتم رفعها إلى المسارات الصحيحة، ومن تبويب (Storage -> القواعد) للتأكد من أن القواعد مطبقة بشكل صحيح.
