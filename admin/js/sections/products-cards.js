/**
 * products-cards.js - قسم إدارة المنتجات بنظام البطاقات المختصرة
 */

let allProducts = [];
let currentEditingProductId = null;
let lastProductDoc = null;
let hasMoreProducts = true;
let isLoadingProducts = false;
const PRODUCTS_PER_PAGE = 12;
let productsObserver = null;

// متغيرات البحث والفلترة
let searchQuery = '';
let filterCategory = '';
let filterStatus = '';

/**
 * تحميل المنتجات من Firebase مع دعم البحث والفلترة
 */
async function loadProducts(isNextPage = false) {
    if (isLoadingProducts) return;
    
    if (!isNextPage) {
        allProducts = [];
        lastProductDoc = null;
        hasMoreProducts = true;
        showSkeletonCards();
    }

    if (!hasMoreProducts && isNextPage) return;

    isLoadingProducts = true;
    
    // إظهار مؤشر التحميل للصفحات التالية
    if (isNextPage) {
        showInfiniteScrollLoader(true);
    }

    try {
        console.log('📦 جاري تحميل المنتجات...');
        const { db, firebaseModules } = window;
        
        let constraints = [firebaseModules.collection(db, 'products')];

        // تطبيق الفلترة حسب الفئة
        if (filterCategory && filterCategory !== 'all') {
            constraints.push(firebaseModules.where('category', '==', filterCategory));
        }

        // تطبيق الفلترة حسب الحالة
        if (filterStatus === 'active') {
            constraints.push(firebaseModules.where('isActive', '==', true));
        } else if (filterStatus === 'inactive') {
            constraints.push(firebaseModules.where('isActive', '==', false));
        }

        // البحث بالاسم - ملاحظة: Firebase لا يدعم البحث النصي الكامل
        // لذلك سنقوم بالفلترة المحلية للبحث فقط
        
        constraints.push(firebaseModules.orderBy('createdAt', 'desc'));
        constraints.push(firebaseModules.limit(PRODUCTS_PER_PAGE));

        if (isNextPage && lastProductDoc) {
            constraints.splice(constraints.length - 1, 0, firebaseModules.startAfter(lastProductDoc));
        }
        
        const q = firebaseModules.query(...constraints);
        const snapshot = await firebaseModules.getDocs(q);
        
        if (snapshot.empty) {
            hasMoreProducts = false;
            if (!isNextPage) displayProductCards();
            return;
        }

        lastProductDoc = snapshot.docs[snapshot.docs.length - 1];
        hasMoreProducts = snapshot.docs.length === PRODUCTS_PER_PAGE;

        const newProducts = [];
        snapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            
            // تطبيق البحث النصي محلياً
            if (searchQuery) {
                const searchLower = searchQuery.toLowerCase();
                if (product.name && product.name.toLowerCase().includes(searchLower)) {
                    newProducts.push(product);
                }
            } else {
                newProducts.push(product);
            }
        });

        allProducts = [...allProducts, ...newProducts];
        window.allProducts = allProducts;
        
        displayProductCards(isNextPage);
        if (window.updateStats) window.updateStats();
        
        if (!isNextPage) setupProductsInfiniteScroll();
        
        console.log(`✅ تم تحميل ${newProducts.length} منتج`);
    } catch (error) {
        console.error('❌ خطأ في تحميل المنتجات:', error);
        if (window.adminUtils) window.adminUtils.showToast('فشل تحميل المنتجات', 'error');
    } finally {
        isLoadingProducts = false;
        showInfiniteScrollLoader(false);
    }
}

/**
 * إعداد التمرير اللانهائي
 */
function setupProductsInfiniteScroll() {
    const sentinel = document.getElementById('productsScrollSentinel');
    if (!sentinel) return;

    if (productsObserver) productsObserver.disconnect();

    productsObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreProducts && !isLoadingProducts) {
            loadProducts(true);
        }
    }, { threshold: 0.1 });

    productsObserver.observe(sentinel);
}

/**
 * عرض البطاقات المختصرة للمنتجات
 */
function displayProductCards(append = false) {
    const container = document.getElementById('productsCardsContainer');
    if (!container) return;
    
    if (allProducts.length === 0 && !append) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fas fa-box-open"></i></div>
                <h3 class="empty-state-title">لا توجد منتجات</h3>
                <p class="empty-state-text">ابدأ بإضافة منتجات جديدة لمتجرك</p>
            </div>
        `;
        return;
    }

    const cardsHtml = allProducts.map(product => createProductCard(product)).join('');
    
    if (append) {
        const existingCards = container.querySelector('.cards-grid');
        if (existingCards) {
            existingCards.insertAdjacentHTML('beforeend', cardsHtml);
        }
    } else {
        container.innerHTML = `<div class="cards-grid">${cardsHtml}</div>`;
    }
}

/**
 * إنشاء بطاقة منتج مختصرة
 */
function createProductCard(product) {
    return `
        <div class="compact-card" onclick="openProductDetails('${product.id}')">
            <span class="card-badge ${product.isActive ? 'badge-success' : 'badge-danger'}">
                ${product.isActive ? 'نشط' : 'معطل'}
            </span>
            
            <div class="card-header">
                <img src="${product.image || 'https://via.placeholder.com/50'}" 
                     class="card-image"
                     onerror="this.src='https://via.placeholder.com/50'">
                <div class="card-title-section">
                    <h4 class="card-title">${product.name}</h4>
                    <p class="card-subtitle">${window.getCategoryName(product.category)}</p>
                </div>
            </div>
            
            <div class="card-content">
                <div class="card-info">
                    <div class="card-info-item">
                        <i class="fas fa-tag"></i>
                        <span class="card-info-value">${window.adminUtils.formatNumber(product.price)} SDG</span>
                    </div>
                    <div class="card-info-item">
                        <i class="fas fa-boxes"></i>
                        <span>المخزون: <span class="card-info-value">${product.stock || 0}</span></span>
                    </div>
                </div>
            </div>
            
            <div class="card-quick-actions" onclick="event.stopPropagation()">
                <button class="card-action-btn" onclick="editProduct('${product.id}')" title="تعديل">
                    <i class="fas fa-edit"></i> تعديل
                </button>
                <button class="card-action-btn" onclick="toggleProductStatus('${product.id}', ${!product.isActive})" title="${product.isActive ? 'تعطيل' : 'تفعيل'}">
                    <i class="fas ${product.isActive ? 'fa-pause' : 'fa-play'}"></i>
                </button>
                <button class="card-action-btn" onclick="deleteProduct('${product.id}')" title="حذف">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `;
}

/**
 * فتح نافذة تفاصيل المنتج الكاملة
 */
function openProductDetails(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const modal = document.createElement('div');
    modal.className = 'card-details-modal active';
    modal.id = 'productDetailsModal';
    modal.innerHTML = `
        <div class="card-details-content">
            <div class="card-details-header">
                <h3>تفاصيل المنتج</h3>
                <button class="card-details-close" onclick="closeProductDetails()">&times;</button>
            </div>
            
            <div class="card-details-body">
                <div class="card-details-section">
                    <img src="${product.image || 'https://via.placeholder.com/200'}" 
                         class="card-details-image"
                         onerror="this.src='https://via.placeholder.com/200'">
                </div>
                
                <div class="card-details-section">
                    <h4 class="card-details-section-title">معلومات أساسية</h4>
                    <div class="card-details-grid">
                        <div class="card-details-item card-details-full">
                            <div class="card-details-item-label">اسم المنتج</div>
                            <div class="card-details-item-value">${product.name}</div>
                        </div>
                        <div class="card-details-item">
                            <div class="card-details-item-label">الفئة</div>
                            <div class="card-details-item-value">${window.getCategoryName(product.category)}</div>
                        </div>
                        <div class="card-details-item">
                            <div class="card-details-item-label">السعر</div>
                            <div class="card-details-item-value">${window.adminUtils.formatNumber(product.price)} SDG</div>
                        </div>
                        <div class="card-details-item">
                            <div class="card-details-item-label">المخزون</div>
                            <div class="card-details-item-value">${product.stock || 0}</div>
                        </div>
                        <div class="card-details-item">
                            <div class="card-details-item-label">الحالة</div>
                            <div class="card-details-item-value">
                                <span class="card-badge ${product.isActive ? 'badge-success' : 'badge-danger'}">
                                    ${product.isActive ? 'نشط' : 'معطل'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${product.description ? `
                <div class="card-details-section">
                    <h4 class="card-details-section-title">الوصف</h4>
                    <div class="card-details-item card-details-full">
                        <div class="card-details-item-value">${product.description}</div>
                    </div>
                </div>
                ` : ''}
                
                ${product.options && product.options.length > 0 ? `
                <div class="card-details-section">
                    <h4 class="card-details-section-title">الخيارات المتاحة</h4>
                    <div class="card-details-grid">
                        ${product.options.map(opt => `
                            <div class="card-details-item">
                                <div class="card-details-item-label">${opt.name}</div>
                                <div class="card-details-item-value">${opt.values.join(', ')}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                <div class="card-details-section">
                    <h4 class="card-details-section-title">معلومات إضافية</h4>
                    <div class="card-details-grid">
                        <div class="card-details-item">
                            <div class="card-details-item-label">تخفيض</div>
                            <div class="card-details-item-value">${product.isSale ? 'نعم' : 'لا'}</div>
                        </div>
                        <div class="card-details-item">
                            <div class="card-details-item-label">جديد</div>
                            <div class="card-details-item-value">${product.isNew ? 'نعم' : 'لا'}</div>
                        </div>
                        <div class="card-details-item">
                            <div class="card-details-item-label">تاريخ الإضافة</div>
                            <div class="card-details-item-value">${product.createdAt ? new Date(product.createdAt.seconds * 1000).toLocaleDateString('ar-EG') : 'غير متوفر'}</div>
                        </div>
                        <div class="card-details-item">
                            <div class="card-details-item-label">آخر تحديث</div>
                            <div class="card-details-item-value">${product.updatedAt ? new Date(product.updatedAt.seconds * 1000).toLocaleDateString('ar-EG') : 'غير متوفر'}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card-details-footer">
                <button class="btn-primary-detail" onclick="closeProductDetails(); editProduct('${product.id}')">
                    <i class="fas fa-edit"></i> تعديل المنتج
                </button>
                <button class="btn-danger-detail" onclick="closeProductDetails(); deleteProduct('${product.id}')">
                    <i class="fas fa-trash-alt"></i> حذف
                </button>
                <button class="btn-secondary-detail" onclick="closeProductDetails()">إغلاق</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // إغلاق عند النقر خارج المحتوى
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeProductDetails();
        }
    });
}

/**
 * إغلاق نافذة التفاصيل
 */
function closeProductDetails() {
    const modal = document.getElementById('productDetailsModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 200);
    }
}

/**
 * عرض Skeleton Cards أثناء التحميل الأولي
 */
function showSkeletonCards() {
    const container = document.getElementById('productsCardsContainer');
    if (!container) return;
    
    const skeletonHtml = Array(8).fill(0).map(() => `
        <div class="skeleton-card">
            <div class="skeleton-header">
                <div class="skeleton skeleton-image"></div>
                <div class="skeleton-text">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-subtitle"></div>
                </div>
            </div>
            <div class="skeleton-content">
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-line"></div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = `<div class="cards-grid">${skeletonHtml}</div>`;
}

/**
 * إظهار/إخفاء مؤشر التحميل للتمرير اللانهائي
 */
function showInfiniteScrollLoader(show) {
    let loader = document.getElementById('infiniteScrollLoader');
    
    if (show && !loader) {
        loader = document.createElement('div');
        loader.id = 'infiniteScrollLoader';
        loader.className = 'infinite-scroll-loader';
        loader.innerHTML = `
            <div class="loader-spinner"></div>
            <span class="loader-text">جاري تحميل المزيد...</span>
        `;
        document.getElementById('productsCardsContainer').appendChild(loader);
    } else if (!show && loader) {
        loader.remove();
    }
}

/**
 * تطبيق البحث والفلترة
 */
function applyProductsFilter() {
    searchQuery = document.getElementById('productsSearchInput')?.value.trim() || '';
    filterCategory = document.getElementById('productsCategoryFilter')?.value || '';
    filterStatus = document.getElementById('productsStatusFilter')?.value || '';
    
    // إعادة تحميل المنتجات مع الفلاتر الجديدة
    loadProducts(false);
}

/**
 * إعادة تعيين الفلاتر
 */
function resetProductsFilter() {
    searchQuery = '';
    filterCategory = '';
    filterStatus = '';
    
    const searchInput = document.getElementById('productsSearchInput');
    const categoryFilter = document.getElementById('productsCategoryFilter');
    const statusFilter = document.getElementById('productsStatusFilter');
    
    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    
    loadProducts(false);
}

/**
 * تبديل حالة المنتج (تفعيل/تعطيل)
 */
async function toggleProductStatus(id, newStatus) {
    try {
        const { db, firebaseModules } = window;
        await firebaseModules.updateDoc(firebaseModules.doc(db, 'products', id), {
            isActive: newStatus,
            updatedAt: firebaseModules.serverTimestamp()
        });
        window.adminUtils.showToast(newStatus ? '✅ تم تفعيل المنتج' : '✅ تم تعطيل المنتج', 'success');
        
        const product = allProducts.find(p => p.id === id);
        if (product) {
            product.isActive = newStatus;
            displayProductCards();
        }
    } catch (error) {
        console.error('❌ خطأ في تغيير حالة المنتج:', error);
        window.adminUtils.showToast('حدث خطأ في تغيير حالة المنتج', 'error');
    }
}

/**
 * حذف منتج
 */
async function deleteProduct(id) {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا المنتج نهائياً؟')) return;
    
    try {
        const { db, firebaseModules } = window;
        await firebaseModules.deleteDoc(firebaseModules.doc(db, 'products', id));
        window.adminUtils.showToast('✅ تم حذف المنتج', 'success');
        allProducts = allProducts.filter(p => p.id !== id);
        displayProductCards();
    } catch (error) {
        console.error('❌ خطأ في حذف المنتج:', error);
        window.adminUtils.showToast('حدث خطأ في حذف المنتج', 'error');
    }
}

/**
 * تعديل منتج (يفتح نموذج التعديل)
 */
function editProduct(productId) {
    // هذه الدالة موجودة في ملف products.js الأصلي
    if (window.openProductModal) {
        window.openProductModal(productId);
    }
}

// تصدير الدوال للاستخدام العام
window.loadProducts = loadProducts;
window.applyProductsFilter = applyProductsFilter;
window.resetProductsFilter = resetProductsFilter;
window.openProductDetails = openProductDetails;
window.closeProductDetails = closeProductDetails;
window.toggleProductStatus = toggleProductStatus;
window.deleteProduct = deleteProduct;
window.editProduct = editProduct;
