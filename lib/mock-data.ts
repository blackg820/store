// Mock Data for Multi-Store Order Management System
import type { User, Subscription, Store, Product, Buyer, Order, OrderAuditLog, Upsell, ProductType, Category, Media, AuditLog } from './types'

export const mockUsers: User[] = [
  {
    id: 'admin-1',
    email: 'admin@storify.com',
    name: 'System Admin',
    role: 'admin',
    mode: 'unlimited',
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true,
  },
  {
    id: 'user-1',
    email: 'ahmed@example.com',
    name: 'Ahmed Mohamed',
    role: 'store_owner',
    mode: 'controlled',
    createdAt: '2024-02-15T00:00:00Z',
    isActive: true,
  },
  {
    id: 'user-2',
    email: 'sara@example.com',
    name: 'Sara Ali',
    role: 'store_owner',
    mode: 'unlimited',
    createdAt: '2024-03-10T00:00:00Z',
    isActive: true,
  },
  {
    id: 'user-3',
    email: 'omar@example.com',
    name: 'Omar Hassan',
    role: 'store_owner',
    mode: 'controlled',
    createdAt: '2024-04-05T00:00:00Z',
    isActive: false,
  },
]

export const mockSubscriptions: Subscription[] = [
  {
    id: 'sub-1',
    userId: 'user-1',
    planId: 'pro',
    status: 'active',
    isActive: true,
    startDate: '2024-02-15T00:00:00Z',
    endDate: '2025-02-15T00:00:00Z',
    monthlyPrice: 25,
    yearlyPrice: 250,
  },
  {
    id: 'sub-2',
    userId: 'user-2',
    planId: 'business',
    status: 'active',
    isActive: true,
    startDate: '2024-03-10T00:00:00Z',
    endDate: '2025-03-10T00:00:00Z',
    monthlyPrice: 50,
    yearlyPrice: 500,
  },
  {
    id: 'sub-3',
    userId: 'user-3',
    planId: 'starter',
    status: 'canceled',
    isActive: false,
    startDate: '2024-04-05T00:00:00Z',
    endDate: '2024-05-05T00:00:00Z',
    monthlyPrice: 10,
    yearlyPrice: 100,
  },
]

export const mockUpsells: Upsell[] = [
  {
    id: 'upsell-1',
    userId: 'user-1',
    type: 'extra_store',
    expiresAt: '2025-02-15T00:00:00Z',
  },
  {
    id: 'upsell-2',
    userId: 'user-2',
    type: 'extra_storage',
    value: 20,
    expiresAt: '2025-03-10T00:00:00Z',
  },
]

export const mockStores: Store[] = [
  {
    id: 'store-1',
    userId: 'user-1',
    name: 'Tech Galaxy',
    nameAr: 'تك جالاكسي',
    slug: 'tech-galaxy',
    description: 'Your one-stop shop for electronics and gadgets',
    descriptionAr: 'متجرك الشامل للإلكترونيات والأجهزة',
    isActive: true,
    createdAt: '2024-02-16T00:00:00Z',
    telegramUserId: '123456789',
    globalDiscount: 10,
    globalDiscountEndDate: '2025-12-31T00:00:00Z',
  },
  {
    id: 'store-2',
    userId: 'user-1',
    name: 'Fashion Hub',
    nameAr: 'فاشن هب',
    slug: 'fashion-hub',
    description: 'Trendy fashion for everyone',
    descriptionAr: 'أزياء عصرية للجميع',
    isActive: true,
    createdAt: '2024-03-01T00:00:00Z',
  },
  {
    id: 'store-3',
    userId: 'user-2',
    name: 'Home Essentials',
    nameAr: 'أساسيات المنزل',
    slug: 'home-essentials',
    description: 'Everything you need for your home',
    descriptionAr: 'كل ما تحتاجه لمنزلك',
    isActive: true,
    createdAt: '2024-03-11T00:00:00Z',
    telegramGroupId: '987654321',
  },
  {
    id: 'store-4',
    userId: 'user-3',
    name: 'Sports Zone',
    nameAr: 'منطقة الرياضة',
    slug: 'sports-zone',
    description: 'Sports equipment and apparel',
    descriptionAr: 'معدات وملابس رياضية',
    isActive: false,
    createdAt: '2024-04-06T00:00:00Z',
  },
]

export const mockProducts: Product[] = [
  {
    id: 'prod-1',
    storeId: 'store-1',
    title: 'Wireless Earbuds Pro',
    titleAr: 'سماعات لاسلكية برو',
    description: 'High-quality wireless earbuds with noise cancellation',
    descriptionAr: 'سماعات لاسلكية عالية الجودة مع إلغاء الضوضاء',
    price: 79.99,
    media: [{ id: 'm1', url: '/placeholder.svg?height=400&width=400', type: 'image' }],
    isActive: true,
    createdAt: '2024-02-17T00:00:00Z',
    updatedAt: '2024-02-17T00:00:00Z',
    discount: 15,
    averageRating: 4.5,
    totalRatings: 127,
    options: [],
    variants: [],
    productTypeId: 'ptype-1'
  },
  {
    id: 'prod-2',
    storeId: 'store-1',
    title: 'Smart Watch X200',
    titleAr: 'ساعة ذكية X200',
    description: 'Feature-packed smartwatch with health monitoring',
    descriptionAr: 'ساعة ذكية غنية بالميزات مع مراقبة الصحة',
    price: 199.99,
    media: [{ id: 'm2', url: '/placeholder.svg?height=400&width=400', type: 'image' }],
    isActive: true,
    createdAt: '2024-02-18T00:00:00Z',
    updatedAt: '2024-02-18T00:00:00Z',
    averageRating: 4.8,
    totalRatings: 89,
    options: [],
    variants: [],
    productTypeId: 'ptype-1'
  },
  {
    id: 'prod-3',
    storeId: 'store-2',
    title: 'Classic Leather Jacket',
    titleAr: 'جاكيت جلد كلاسيكي',
    description: 'Premium leather jacket for all seasons',
    descriptionAr: 'جاكيت جلد فاخر لجميع الفصول',
    price: 249.99,
    media: [{ id: 'm3', url: '/placeholder.svg?height=400&width=400', type: 'image' }],
    isActive: true,
    createdAt: '2024-03-02T00:00:00Z',
    updatedAt: '2024-03-02T00:00:00Z',
    discount: 20,
    averageRating: 4.2,
    totalRatings: 45,
    options: [],
    variants: [],
    productTypeId: 'ptype-2'
  },
  {
    id: 'prod-4',
    storeId: 'store-3',
    title: 'Ergonomic Office Chair',
    titleAr: 'كرسي مكتب مريح',
    description: 'Comfortable chair with lumbar support',
    descriptionAr: 'كرسي مريح مع دعم للظهر',
    price: 349.99,
    media: [{ id: 'm4', url: '/placeholder.svg?height=400&width=400', type: 'image' }],
    isActive: true,
    createdAt: '2024-03-12T00:00:00Z',
    updatedAt: '2024-03-12T00:00:00Z',
    averageRating: 4.6,
    totalRatings: 203,
    options: [],
    variants: [],
    productTypeId: 'ptype-3'
  },
  {
    id: 'prod-5',
    storeId: 'store-3',
    title: 'LED Desk Lamp',
    titleAr: 'مصباح مكتب LED',
    description: 'Adjustable LED lamp with multiple brightness levels',
    descriptionAr: 'مصباح LED قابل للتعديل مع مستويات سطوع متعددة',
    price: 49.99,
    media: [{ id: 'm5', url: '/placeholder.svg?height=400&width=400', type: 'image' }],
    isActive: true,
    createdAt: '2024-03-13T00:00:00Z',
    updatedAt: '2024-03-13T00:00:00Z',
    averageRating: 4.3,
    totalRatings: 78,
    options: [],
    variants: [],
    productTypeId: 'ptype-3'
  },
]

export const mockBuyers: Buyer[] = [
  {
    id: 'buyer-1',
    phone: '+201234567890',
    name: 'Mohamed Ibrahim',
    governorate: 'Cairo',
    district: 'Nasr City',
    landmark: 'Near City Stars Mall',
    totalOrders: 15,
    rejectedOrders: 1,
    riskScore: 'low',
    isBlacklisted: false,
    createdAt: '2024-02-20T00:00:00Z',
  },
  {
    id: 'buyer-2',
    phone: '+201098765432',
    name: 'Fatima Hassan',
    governorate: 'Alexandria',
    district: 'Smouha',
    landmark: 'Behind Green Plaza',
    totalOrders: 8,
    rejectedOrders: 0,
    riskScore: 'low',
    isBlacklisted: false,
    createdAt: '2024-03-05T00:00:00Z',
  },
  {
    id: 'buyer-3',
    phone: '+201555555555',
    name: 'Khaled Mahmoud',
    governorate: 'Giza',
    district: 'Dokki',
    landmark: 'Tahrir Street',
    totalOrders: 5,
    rejectedOrders: 3,
    riskScore: 'high',
    isBlacklisted: false,
    createdAt: '2024-03-15T00:00:00Z',
  },
  {
    id: 'buyer-4',
    phone: '+201111111111',
    name: 'Suspicious User',
    governorate: 'Cairo',
    district: 'Downtown',
    landmark: 'Unknown',
    totalOrders: 10,
    rejectedOrders: 8,
    riskScore: 'high',
    isBlacklisted: true,
    createdAt: '2024-04-01T00:00:00Z',
  },
]

export const mockOrders: Order[] = [
  {
    id: 'order-1',
    storeId: 'store-1',
    buyerId: 'buyer-1',
    items: [
      { id: 'item-1', orderId: 'order-1', productId: 'prod-1', quantity: 2, price: 67.99, unitPrice: 67.99, totalPrice: 135.98, subtotal: 135.98 }
    ],
    totalPrice: 135.98,
    status: 'delivered',
    notes: 'Please deliver before 5 PM',
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-03T14:00:00Z',
  },
  {
    id: 'order-2',
    storeId: 'store-1',
    buyerId: 'buyer-2',
    items: [
      { id: 'item-2', orderId: 'order-2', productId: 'prod-2', quantity: 1, price: 199.99, unitPrice: 199.99, totalPrice: 199.99, subtotal: 199.99 }
    ],
    totalPrice: 199.99,
    status: 'confirmed',
    notes: '',
    createdAt: '2024-06-10T11:30:00Z',
    updatedAt: '2024-06-10T12:00:00Z',
  },
  {
    id: 'order-3',
    storeId: 'store-2',
    buyerId: 'buyer-1',
    items: [
      { id: 'item-3', orderId: 'order-3', productId: 'prod-3', quantity: 1, price: 199.99, unitPrice: 199.99, totalPrice: 199.99, subtotal: 199.99 }
    ],
    totalPrice: 199.99,
    status: 'pending',
    notes: 'Gift wrap please',
    createdAt: '2024-06-15T09:00:00Z',
    updatedAt: '2024-06-15T09:00:00Z',
  },
  {
    id: 'order-4',
    storeId: 'store-3',
    buyerId: 'buyer-3',
    items: [
      { id: 'item-4', orderId: 'order-4', productId: 'prod-4', quantity: 1, price: 349.99, unitPrice: 349.99, totalPrice: 349.99, subtotal: 349.99 }
    ],
    totalPrice: 349.99,
    status: 'returned',
    notes: 'Customer changed mind',
    createdAt: '2024-06-05T15:00:00Z',
    updatedAt: '2024-06-08T10:00:00Z',
  },
  {
    id: 'order-5',
    storeId: 'store-3',
    buyerId: 'buyer-2',
    items: [
      { id: 'item-5', orderId: 'order-5', productId: 'prod-5', quantity: 3, price: 49.99, unitPrice: 49.99, totalPrice: 149.97, subtotal: 149.97 }
    ],
    totalPrice: 149.97,
    status: 'delivered',
    notes: '',
    createdAt: '2024-06-12T08:00:00Z',
    updatedAt: '2024-06-14T16:00:00Z',
  },
  {
    id: 'order-6',
    storeId: 'store-1',
    buyerId: 'buyer-3',
    items: [
      { id: 'item-6', orderId: 'order-6', productId: 'prod-1', quantity: 1, price: 67.99, unitPrice: 67.99, totalPrice: 67.99, subtotal: 67.99 }
    ],
    totalPrice: 67.99,
    status: 'problematic',
    notes: 'Address not found',
    createdAt: '2024-06-18T13:00:00Z',
    updatedAt: '2024-06-19T09:00:00Z',
  },
]

export const mockAuditLogs: OrderAuditLog[] = [
  {
    id: 'log-1',
    orderId: 'order-1',
    action: 'status_change',
    previousValue: 'pending',
    newValue: 'confirmed',
    performedBy: 'user-1',
    performedAt: '2024-06-01T12:00:00Z',
  },
  {
    id: 'log-2',
    orderId: 'order-1',
    action: 'status_change',
    previousValue: 'confirmed',
    newValue: 'delivered',
    performedBy: 'user-1',
    performedAt: '2024-06-03T14:00:00Z',
  },
  {
    id: 'log-3',
    orderId: 'order-4',
    action: 'status_change',
    previousValue: 'delivered',
    newValue: 'returned',
    performedBy: 'user-2',
    performedAt: '2024-06-08T10:00:00Z',
  },
]

// Product Types - Dynamic Catalog System
export const mockProductTypes: ProductType[] = [
  {
    id: 'ptype-1',
    storeId: 'store-1',
    name: 'Electronics',
    nameAr: 'إلكترونيات',
    description: 'Electronic devices and gadgets',
    customFields: [
      { id: 'cf-1', name: 'Brand', nameAr: 'العلامة التجارية', type: 'text', required: true },
      { id: 'cf-2', name: 'Warranty (months)', nameAr: 'الضمان (أشهر)', type: 'number', required: false, defaultValue: 12 },
      { id: 'cf-3', name: 'Condition', nameAr: 'الحالة', type: 'select', required: true, options: ['New', 'Refurbished', 'Used'] },
    ],
    createdAt: '2024-02-16T00:00:00Z',
    isActive: true,
  },
  {
    id: 'ptype-2',
    storeId: 'store-2',
    name: 'Clothing',
    nameAr: 'ملابس',
    description: 'Fashion and apparel',
    customFields: [
      { id: 'cf-4', name: 'Size', nameAr: 'المقاس', type: 'select', required: true, options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
      { id: 'cf-5', name: 'Color', nameAr: 'اللون', type: 'text', required: true },
      { id: 'cf-6', name: 'Material', nameAr: 'المادة', type: 'text', required: false },
    ],
    createdAt: '2024-03-01T00:00:00Z',
    isActive: true,
  },
  {
    id: 'ptype-3',
    storeId: 'store-3',
    name: 'Furniture',
    nameAr: 'أثاث',
    description: 'Home and office furniture',
    customFields: [
      { id: 'cf-7', name: 'Dimensions', nameAr: 'الأبعاد', type: 'text', required: true },
      { id: 'cf-8', name: 'Weight (kg)', nameAr: 'الوزن (كجم)', type: 'number', required: false },
      { id: 'cf-9', name: 'Assembly Required', nameAr: 'يتطلب تجميع', type: 'boolean', required: true, defaultValue: false },
    ],
    createdAt: '2024-03-11T00:00:00Z',
    isActive: true,
  },
]

// Categories - Nested Tree Structure
export const mockCategories: Category[] = [
  // Electronics categories
  { id: 'cat-1', productTypeId: 'ptype-1', parentId: null, name: 'Audio', nameAr: 'صوتيات', slug: 'audio', sortOrder: 1, isActive: true },
  { id: 'cat-2', productTypeId: 'ptype-1', parentId: 'cat-1', name: 'Headphones', nameAr: 'سماعات', slug: 'headphones', sortOrder: 1, isActive: true },
  { id: 'cat-3', productTypeId: 'ptype-1', parentId: 'cat-1', name: 'Speakers', nameAr: 'مكبرات صوت', slug: 'speakers', sortOrder: 2, isActive: true },
  { id: 'cat-4', productTypeId: 'ptype-1', parentId: null, name: 'Wearables', nameAr: 'الأجهزة القابلة للارتداء', slug: 'wearables', sortOrder: 2, isActive: true },
  { id: 'cat-5', productTypeId: 'ptype-1', parentId: 'cat-4', name: 'Smartwatches', nameAr: 'ساعات ذكية', slug: 'smartwatches', sortOrder: 1, isActive: true },
  // Clothing categories
  { id: 'cat-6', productTypeId: 'ptype-2', parentId: null, name: 'Outerwear', nameAr: 'ملابس خارجية', slug: 'outerwear', sortOrder: 1, isActive: true },
  { id: 'cat-7', productTypeId: 'ptype-2', parentId: 'cat-6', name: 'Jackets', nameAr: 'جاكيتات', slug: 'jackets', sortOrder: 1, isActive: true },
  // Furniture categories
  { id: 'cat-8', productTypeId: 'ptype-3', parentId: null, name: 'Office', nameAr: 'مكتب', slug: 'office', sortOrder: 1, isActive: true },
  { id: 'cat-9', productTypeId: 'ptype-3', parentId: 'cat-8', name: 'Chairs', nameAr: 'كراسي', slug: 'chairs', sortOrder: 1, isActive: true },
  { id: 'cat-10', productTypeId: 'ptype-3', parentId: 'cat-8', name: 'Lighting', nameAr: 'إضاءة', slug: 'lighting', sortOrder: 2, isActive: true },
]

// Media with Privacy Settings
export const mockMedia: Media[] = [
  { id: 'media-1', productId: 'prod-1', url: '/placeholder.svg?height=400&width=400', type: 'image', visibility: 'public', size: 125000, createdAt: '2024-02-17T00:00:00Z' },
  { id: 'media-2', productId: 'prod-1', url: '/placeholder.svg?height=400&width=400', type: 'image', visibility: 'public', size: 130000, createdAt: '2024-02-17T00:00:00Z' },
  { id: 'media-3', productId: 'prod-2', url: '/placeholder.svg?height=400&width=400', type: 'image', visibility: 'public', size: 140000, createdAt: '2024-02-18T00:00:00Z' },
  { id: 'media-4', productId: 'prod-3', url: '/placeholder.svg?height=400&width=400', type: 'image', visibility: 'restricted', blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH', size: 200000, createdAt: '2024-03-02T00:00:00Z' },
  { id: 'media-5', productId: 'prod-4', url: '/placeholder.svg?height=400&width=400', type: 'image', visibility: 'public', size: 180000, createdAt: '2024-03-12T00:00:00Z' },
  { id: 'media-6', productId: 'prod-5', url: '/placeholder.svg?height=400&width=400', type: 'image', visibility: 'private', size: 90000, createdAt: '2024-03-13T00:00:00Z' },
]

// Full Audit Log System
export const mockSystemAuditLogs: AuditLog[] = [
  {
    id: 'audit-1',
    userId: 'admin-1',
    entityType: 'user',
    entityId: 'user-1',
    action: 'create',
    newValue: { email: 'ahmed@example.com', name: 'Ahmed Mohamed', role: 'store_owner' },
    createdAt: '2024-02-15T00:00:00Z',
  },
  {
    id: 'audit-2',
    userId: 'user-1',
    entityType: 'store',
    entityId: 'store-1',
    action: 'create',
    newValue: { name: 'Tech Galaxy', slug: 'tech-galaxy' },
    createdAt: '2024-02-16T00:00:00Z',
  },
  {
    id: 'audit-3',
    userId: 'user-1',
    entityType: 'product',
    entityId: 'prod-1',
    action: 'create',
    newValue: { name: 'Wireless Earbuds Pro', price: 79.99 },
    createdAt: '2024-02-17T00:00:00Z',
  },
  {
    id: 'audit-4',
    userId: 'user-1',
    entityType: 'order',
    entityId: 'order-1',
    action: 'status_change',
    previousValue: { status: 'pending' },
    newValue: { status: 'confirmed' },
    createdAt: '2024-06-01T12:00:00Z',
  },
  {
    id: 'audit-5',
    userId: 'admin-1',
    entityType: 'subscription',
    entityId: 'sub-1',
    action: 'update',
    previousValue: { plan: 'starter' },
    newValue: { plan: 'pro' },
    createdAt: '2024-03-01T00:00:00Z',
  },
]

// Helper functions to simulate database operations
export function getStoresByUserId(userId: string): Store[] {
  return mockStores.filter(store => store.userId === userId)
}

export function getProductsByStoreId(storeId: string): Product[] {
  return mockProducts.filter(product => product.storeId === storeId)
}

export function getOrdersByStoreId(storeId: string): Order[] {
  return mockOrders.filter(order => order.storeId === storeId)
}

export function getOrdersByUserId(userId: string): Order[] {
  const userStores = getStoresByUserId(userId)
  const storeIds = userStores.map(s => s.id)
  return mockOrders.filter(order => storeIds.includes(order.storeId))
}

export function getSubscriptionByUserId(userId: string): Subscription | undefined {
  return mockSubscriptions.find(sub => sub.userId === userId)
}

export function getBuyerById(buyerId: string): Buyer | undefined {
  return mockBuyers.find(buyer => buyer.id === buyerId)
}

export function getProductById(productId: string): Product | undefined {
  return mockProducts.find(product => product.id === productId)
}

export function getStoreById(storeId: string): Store | undefined {
  return mockStores.find(store => store.id === storeId)
}

export function getUserById(userId: string): User | undefined {
  return mockUsers.find(user => user.id === userId)
}

// Statistics helpers
export function getOrderStats() {
  const total = mockOrders.length
  const pending = mockOrders.filter(o => o.status === 'pending').length
  const confirmed = mockOrders.filter(o => o.status === 'confirmed').length
  const delivered = mockOrders.filter(o => o.status === 'delivered').length
  const returned = mockOrders.filter(o => o.status === 'returned').length
  const problematic = mockOrders.filter(o => o.status === 'problematic').length
  const totalRevenue = mockOrders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + o.totalPrice, 0)
  
  return { total, pending, confirmed, delivered, returned, problematic, totalRevenue }
}

export function getStoreStats(storeId: string) {
  const orders = getOrdersByStoreId(storeId)
  const products = getProductsByStoreId(storeId)
  const total = orders.length
  const delivered = orders.filter(o => o.status === 'delivered').length
  const revenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + o.totalPrice, 0)
  
  return { total, delivered, revenue, productCount: products.length }
}
