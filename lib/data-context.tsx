'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type {
  User,
  Store,
  Product,
  Order,
  Buyer,
  Subscription,
  Upsell,
  OrderStatus,
  ProductType,
  Category,
  Media,
  AuditLog,
} from './types'
import { apiClient } from './api-client'
import { toast } from 'sonner'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  pagination?: { page: number; limit: number; total: number; totalPages: number }
}

interface DataContextType {
  // Data
  users: User[]
  stores: Store[]
  products: Product[]
  orders: Order[]
  buyers: Buyer[]
  subscriptions: Subscription[]
  upsells: Upsell[]
  productTypes: ProductType[]
  categories: Category[]
  media: Media[]
  auditLogs: AuditLog[]
  settings: Record<string, string>
  isDataLoading: boolean
  selectedStoreId: string | null
  setSelectedStoreId: (id: string | null) => void

  // User operations
  addUser: (user: any) => Promise<boolean>
  updateUser: (id: string, data: Partial<User>) => void
  deleteUser: (id: string) => void

  // Store operations
  addStore: (store: Omit<Store, 'id' | 'createdAt' | 'isActive'>) => Promise<Store>
  updateStore: (id: string, data: Partial<Store>) => Promise<void>
  deleteStore: (id: string) => Promise<void>

  // Product operations
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'averageRating' | 'totalRatings'>) => Promise<Product>
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>

  // Order operations
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'items'> & { items: Array<{ productId: string, quantity: number, options?: any }> }) => Promise<Order | { error: string } | undefined>
  updateOrder: (id: string, data: Partial<Order>) => void
  updateOrderStatus: (id: string, status: OrderStatus, performedBy?: string) => void
  deleteOrder: (id: string) => void

  // Buyer operations
  addBuyer: (buyer: Omit<Buyer, 'id' | 'createdAt' | 'totalOrders' | 'rejectedOrders' | 'riskScore'>) => Buyer
  updateBuyer: (id: string, data: Partial<Buyer>) => void
  blacklistBuyer: (id: string, blacklisted: boolean) => void
  findBuyerByPhone: (phone: string) => Buyer | undefined

  // Subscription operations
  addSubscription: (subscription: any) => void
  updateSubscription: (id: string, data: Partial<Subscription>) => void

  // Upsell operations
  addUpsell: (upsell: Omit<Upsell, 'id'>) => Upsell
  removeUpsell: (id: string) => void

  // Product Type operations
  addProductType: (pt: Omit<ProductType, 'id' | 'createdAt'>) => ProductType
  updateProductType: (id: string, data: Partial<ProductType>) => void
  deleteProductType: (id: string) => void

  // Category operations
  addCategory: (cat: Omit<Category, 'id'>) => Category
  updateCategory: (id: string, data: Partial<Category>) => void
  deleteCategory: (id: string) => void

  // Media operations
  addMedia: (m: Omit<Media, 'id' | 'createdAt'>) => Media
  updateMedia: (id: string, data: Partial<Media>) => void
  deleteMedia: (id: string) => void

  // Audit log
  logAction: (log: Omit<AuditLog, 'id' | 'createdAt'>) => void
  updateSettings: (settings: Record<string, string>) => Promise<void>

  // Helpers
  getStoresByUserId: (userId: string) => Store[]
  getSubscriptionByUserId: (userId: string) => Subscription | undefined
  getProductsByStoreId: (storeId: string) => Product[]
  getOrdersByStoreId: (storeId: string) => Order[]
  getUpsellsByUserId: (userId: string) => Upsell[]
  getProductTypesByStoreId: (storeId: string) => ProductType[]
  getCategoriesByProductType: (productTypeId: string) => Category[]
  getMediaByProduct: (productId: string) => Media[]

  // Refetch
  refetchAll: () => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [upsells, setUpsells] = useState<Upsell[]>([])
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [media, setMedia] = useState<Media[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({ site_name: 'Storify' })
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    console.log('[DataContext] fetchData starting...')
    if (typeof window !== 'undefined' && (window.location.pathname.startsWith('/store/') || window.location.pathname.startsWith('/api/stores/'))) {
      console.log('[DataContext] Storefront page detected, skipping dashboard data fetch')
      setIsDataLoading(false)
      return
    }
    const token = typeof window !== 'undefined' ? localStorage.getItem('storify_access_token') : null
    
    // Always fetch settings first as they might be needed for public pages
    try {
      if (!token) {
        const settingsRes = await apiClient.get<ApiResponse<Record<string, string>>>('/api/v1/admin/settings')
        if (settingsRes.success && settingsRes.data) {
          setSettings(settingsRes.data)
        }
        setIsDataLoading(false)
        return
      }

      console.log('[DataContext] Fetching unified dashboard data...')
      const res = await apiClient.get<ApiResponse<any>>('/api/v1/dashboard/init')
      
      if (res.success && res.data) {
        const d = res.data
        if (d.stores) setStores(d.stores)
        if (d.products) setProducts(d.products)
        if (d.orders) setOrders(d.orders)
        if (d.buyers) setBuyers(d.buyers)
        if (d.subscriptions) setSubscriptions(d.subscriptions)
        if (d.productTypes) setProductTypes(d.productTypes)
        if (d.categories) setCategories(d.categories)
        if (d.settings) setSettings(d.settings)
        if (d.users) setUsers(d.users)
        if (d.auditLogs) setAuditLogs(d.auditLogs)
        console.log('[DataContext] Dashboard data loaded successfully')
      }
    } catch (error) {
      console.error('[DataContext] Fetch error:', error)
    } finally {
      setIsDataLoading(false)
    }
  }, [])

  useEffect(() => {
    console.log('[DataContext] Initial fetch trigger')
    fetchData()
  }, [fetchData])

  const refetchAll = () => {
    fetchData()
  }

  const logAction = (log: Omit<AuditLog, 'id' | 'createdAt'>) => {
    const entry: AuditLog = { ...log, id: generateId('audit'), createdAt: new Date().toISOString() }
    setAuditLogs((prev) => [entry, ...prev])
  }

  // User operations
  const addUser = async (userData: any): Promise<boolean> => {
    try {
      const res = await apiClient.post<ApiResponse<any>>('/api/v1/admin/users', userData)
      if (res.success) {
        toast.success('User created successfully')
        fetchData() // Refresh list
        return true
      } else {
        toast.error(res.error || 'Failed to create user')
        return false
      }
    } catch (error) {
      toast.error('Network error while creating user')
      return false
    }
  }
  const updateUser = (id: string, data: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data } : u)))
    apiClient.patch(`/api/v1/admin/users/${id}`, data).then(() => setTimeout(refetchAll, 300)).catch(console.error)
  }
  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id))
    apiClient.del(`/api/v1/admin/users/${id}`).then(() => setTimeout(refetchAll, 300)).catch(console.error)
  }

  // Store operations
  const addStore = async (storeData: Omit<Store, 'id' | 'createdAt' | 'isActive'>): Promise<Store> => {
    const newStore: Store = { 
      ...storeData, 
      id: generateId('store'), 
      createdAt: new Date().toISOString(),
      isActive: true
    }
    setStores((prev) => [...prev, newStore])
    try {
      const res = await apiClient.post<{ data: Store }>('/api/v1/stores', storeData)
      setTimeout(refetchAll, 300)
      toast.success('Store created!')
      return res.data
    } catch (err: any) {
      setStores((prev) => prev.filter(s => s.id !== newStore.id)) // Rollback
      toast.error(err.message || 'Failed to create store')
      throw err
    }
  }

  const updateStore = async (id: string, data: Partial<Store>): Promise<void> => {
    const original = stores.find(s => s.id === id)
    setStores((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)))
    try {
      await apiClient.patch(`/api/v1/stores/${id}`, data)
      setTimeout(refetchAll, 300)
      toast.success('Store updated!')
    } catch (err: any) {
      if (original) setStores((prev) => prev.map(s => s.id === id ? original : s)) // Rollback
      toast.error(err.message || 'Failed to update store')
      throw err
    }
  }

  const deleteStore = async (id: string): Promise<void> => {
    const original = stores.find(s => s.id === id)
    setStores((prev) => prev.filter((s) => s.id !== id))
    try {
      await apiClient.del(`/api/v1/stores/${id}`)
      setTimeout(refetchAll, 300)
      toast.success('Store deleted!')
    } catch (err: any) {
      if (original) setStores(prev => [...prev, original]) // Rollback
      toast.error(err.message || 'Failed to delete store')
      throw err
    }
  }

  // Product operations
  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'averageRating' | 'totalRatings'>): Promise<Product> => {
    const now = new Date().toISOString()
    const newProduct: Product = { ...productData, id: generateId('prod'), createdAt: now, updatedAt: now, averageRating: 0, totalRatings: 0 }
    setProducts((prev) => [...prev, newProduct])
    try {
      const res = await apiClient.post<{ data: Product }>('/api/v1/products', productData)
      setTimeout(refetchAll, 300)
      toast.success('Product added!')
      return res.data
    } catch (err: any) {
      setProducts((prev) => prev.filter(p => p.id !== newProduct.id)) // Rollback
      toast.error(err.message || 'Failed to add product')
      throw err
    }
  }

  const updateProduct = async (id: string, data: Partial<Product>): Promise<void> => {
    const original = products.find(p => p.id === id)
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p)))
    try {
      await apiClient.patch(`/api/v1/products/${id}`, data)
      setTimeout(refetchAll, 300)
      toast.success('Product updated!')
    } catch (err: any) {
      if (original) setProducts(prev => prev.map(p => p.id === id ? original : p)) // Rollback
      toast.error(err.message || 'Failed to update product')
      throw err
    }
  }

  const deleteProduct = async (id: string): Promise<void> => {
    const original = products.find(p => p.id === id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
    try {
      await apiClient.del(`/api/v1/products/${id}`)
      setTimeout(refetchAll, 300)
      toast.success('Product deleted!')
    } catch (err: any) {
      if (original) setProducts(prev => [...prev, original]) // Rollback
      toast.error(err.message || 'Failed to delete product')
      throw err
    }
  }

  // Product Type operations
  const addProductType = (ptData: Omit<ProductType, 'id' | 'createdAt'>): ProductType => {
    const newPT: ProductType = { ...ptData, id: generateId('pt'), createdAt: new Date().toISOString() }
    setProductTypes((prev) => [...prev, newPT])
    apiClient.post('/api/v1/product-types', ptData).then(() => setTimeout(refetchAll, 300)).catch(console.error)
    return newPT
  }
  const updateProductType = (id: string, data: Partial<ProductType>) => {
    setProductTypes((prev) => prev.map((pt) => (pt.id === id ? { ...pt, ...data } : pt)))
    apiClient.patch(`/api/v1/product-types/${id}`, data).then(() => setTimeout(refetchAll, 300)).catch(console.error)
  }
  const deleteProductType = (id: string) => {
    setProductTypes((prev) => prev.filter((pt) => pt.id !== id))
    apiClient.del(`/api/v1/product-types/${id}`).then(() => setTimeout(refetchAll, 300)).catch(console.error)
  }

  // Category operations
  const addCategory = (catData: Omit<Category, 'id'>): Category => {
    const newCat: Category = { ...catData, id: generateId('cat') }
    setCategories((prev) => [...prev, newCat])
    apiClient.post('/api/v1/categories', catData).then(() => setTimeout(refetchAll, 300)).catch(console.error)
    return newCat
  }
  const updateCategory = (id: string, data: Partial<Category>) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)))
    apiClient.patch(`/api/v1/categories/${id}`, data).then(() => setTimeout(refetchAll, 300)).catch(console.error)
  }
  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id))
    apiClient.del(`/api/v1/categories/${id}`).then(() => setTimeout(refetchAll, 300)).catch(console.error)
  }

  // Order operations
  const addOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'items'> & { items: Array<{ productId: string, quantity: number, options?: any }> }) => {
    try {
      const response = await apiClient.post<ApiResponse<Order>>('/api/v1/orders', {
        ...orderData,
        productId: orderData.items[0]?.productId,
        quantity: orderData.items[0]?.quantity || 1
      })
      if (response.success && response.data) {
        setOrders(prev => [response.data!, ...prev])
        return response.data
      } else {
        return { error: response.error || 'Failed to add order' }
      }
    } catch (error) {
      console.error('Error adding order:', error)
      return { error: 'Connection error' }
    }
  }
  const updateOrder = (id: string, data: Partial<Order>) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...data, updatedAt: new Date().toISOString() } : o)))
    
    // Prepare data for API (mapping frontend camelCase to backend snake_case or whatever the API expects)
    // The new API I created expects: status, internalNotes, totalAmount, deliveryFee, buyerName, buyerPhone, governorate, district, landmark
    apiClient.patch(`/api/v1/orders/${id}`, {
      status: data.status,
      internalNotes: data.notes,
      totalAmount: data.totalAmount,
      deliveryFee: data.deliveryFee,
      // Pass buyer details if they were included in the Partial<Order> (though they usually aren't, 
      // but I'll make sure the component passes them)
      ...(data as any).buyerName && { buyerName: (data as any).buyerName },
      ...(data as any).buyerPhone && { buyerPhone: (data as any).buyerPhone },
      ...(data as any).governorate && { governorate: (data as any).governorate },
      ...(data as any).district && { district: (data as any).district },
      ...(data as any).landmark && { landmark: (data as any).landmark },
    }).then(() => setTimeout(refetchAll, 300)).catch(console.error)
  }
  const updateOrderStatus = (id: string, status: OrderStatus, performedBy?: string) => {
    updateOrder(id, { status })
    apiClient.patch(`/api/v1/orders/${id}/status`, { status }).catch(console.error)
  }
  const deleteOrder = (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id))
    apiClient.del(`/api/v1/orders/${id}`).catch(console.error)
  }

  // Buyer operations
  const addBuyer = (buyerData: Omit<Buyer, 'id' | 'createdAt' | 'totalOrders' | 'rejectedOrders' | 'riskScore'>): Buyer => {
    const newBuyer: Buyer = { ...buyerData, id: generateId('buyer'), createdAt: new Date().toISOString(), totalOrders: 0, rejectedOrders: 0, risk: 'low' }
    setBuyers((prev) => [...prev, newBuyer])
    apiClient.post('/api/v1/buyers', buyerData).then(() => setTimeout(refetchAll, 300)).catch(console.error)
    return newBuyer
  }
  const updateBuyer = (id: string, data: Partial<Buyer>) => {
    setBuyers((prev) => prev.map((b) => (b.id === id ? { ...b, ...data } : b)))
  }
  const blacklistBuyer = (id: string, blacklisted: boolean) => {
    updateBuyer(id, { isBlacklisted: blacklisted })
  }
  const findBuyerByPhone = (phone: string) => buyers.find((b) => b.phone === phone)

  // Subscription operations
  const addSubscription = (subData: any) => {
    apiClient.post('/api/v1/admin/subscriptions', subData)
      .then(() => {
        toast.success('Subscription assigned successfully')
        setTimeout(refetchAll, 300)
      })
      .catch(err => toast.error(err.message || 'Failed to assign subscription'))
  }
  const updateSubscription = (id: string, data: Partial<Subscription>) => {
    setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)))
    
    // Call Admin API if updating plan, status or endDate
    apiClient.patch(`/api/v1/admin/subscriptions/${id}`, {
      planId: data.planId,
      status: data.status,
      endDate: data.endDate
    }).then(() => setTimeout(refetchAll, 300)).catch(console.error)
  }

  // Upsell operations
  const addUpsell = (upsellData: Omit<Upsell, 'id'>): Upsell => {
    const newUpsell: Upsell = { ...upsellData, id: generateId('upsell') }
    setUpsells((prev) => [...prev, newUpsell])
    return newUpsell
  }
  const removeUpsell = (id: string) => { setUpsells((prev) => prev.filter((u) => u.id !== id)) }

  // Media operations
  const addMedia = (m: Omit<Media, 'id' | 'createdAt'>): Media => {
    const newMedia: Media = { ...m, id: generateId('media'), createdAt: new Date().toISOString() }
    setMedia((prev) => [...prev, newMedia])
    return newMedia
  }
  const updateMedia = (id: string, data: Partial<Media>) => {
    setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, ...data } : m)))
  }
  const deleteMedia = (id: string) => { setMedia((prev) => prev.filter((m) => m.id !== id)) }

  // Settings operations
  const updateSettings = async (newSettings: Record<string, string>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
    await apiClient.post('/api/v1/admin/settings', { settings: newSettings })
  }

  // Helpers
  const getStoresByUserId = (userId: string) => stores.filter((s) => s.userId === userId)
  const getSubscriptionByUserId = (userId: string) => subscriptions.find((s) => s.userId === userId)
  const getProductsByStoreId = (storeId: string) => products.filter((p) => p.storeId === storeId)
  const getOrdersByStoreId = (storeId: string) => orders.filter((o) => o.storeId === storeId)
  const getUpsellsByUserId = (userId: string) => upsells.filter((u) => u.userId === userId)
  const getProductTypesByStoreId = (storeId: string) => productTypes.filter((pt) => pt.storeId === storeId || !pt.storeId || pt.storeId === 'null')
  const getCategoriesByProductType = (productTypeId: string) => categories.filter((c) => c.productTypeId === productTypeId)
  const getMediaByProduct = (productId: string) => media.filter((m) => m.productId === productId)

  return (
    <DataContext.Provider
      value={{
        users, stores, products, orders, buyers, subscriptions, upsells,
        productTypes, categories, media, auditLogs, settings, isDataLoading,
        addUser, updateUser, deleteUser,
        addStore, updateStore, deleteStore,
        addProduct, updateProduct, deleteProduct,
        addOrder, updateOrder, updateOrderStatus, deleteOrder,
        addBuyer, updateBuyer, blacklistBuyer, findBuyerByPhone,
        addSubscription, updateSubscription,
        addUpsell, removeUpsell,
        addProductType, updateProductType, deleteProductType,
        addCategory, updateCategory, deleteCategory,
        addMedia, updateMedia, deleteMedia,
        logAction, updateSettings,
        getStoresByUserId, getProductsByStoreId, getOrdersByStoreId,
        getSubscriptionByUserId, getUpsellsByUserId,
        getProductTypesByStoreId, getCategoriesByProductType, getMediaByProduct,
        refetchAll,
        selectedStoreId, setSelectedStoreId
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used within DataProvider')
  return context
}
