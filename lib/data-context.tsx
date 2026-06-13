'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
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
import { translations } from './types'
import { apiClient } from './api-client'
import { toast } from 'sonner'
import { useAuth } from './auth-context'
import { usePathname } from 'next/navigation'

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
  dataError: string | null
  employees: User[]
  selectedStoreId: string | null
  selectedStore: Store | null
  accessibleStores: Store[]
  selectedStoreError: string | null
  setSelectedStoreId: (id: string | null) => void

  // Employee operations
  addEmployee: (employee: any) => Promise<boolean>
  updateEmployee: (id: string, data: any) => Promise<void>
  deleteEmployee: (id: string) => Promise<void>

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
  sendOrderToAlWaseet: (id: string) => Promise<boolean>
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
  const { user: currentUser, isLoading: isAuthLoading } = useAuth()
  const pathname = usePathname()
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
  const [employees, setEmployees] = useState<User[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({ site_name: 'Storify' })
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  const lang = (typeof window !== 'undefined' ? localStorage.getItem('storify_lang') || 'ar' : 'ar') as keyof typeof translations
  const t = useCallback((key: string) => (translations[lang] as any)[key] || key, [lang])
  const [selectedStoreId, setSelectedStoreIdState] = useState<string | null>(null)
  const [selectedStoreError, setSelectedStoreError] = useState<string | null>(null)
  const debug = process.env.NEXT_PUBLIC_DEBUG === 'true'

  const tenantOwnerId = currentUser?.parentId || currentUser?.id || null
  const accessibleStores = useMemo(() => {
    if (!currentUser) return []
    if (currentUser.role === 'admin') return stores
    return stores.filter((store) => String(store.userId) === String(tenantOwnerId))
  }, [currentUser, stores, tenantOwnerId])
  const selectedStore = useMemo(
    () => accessibleStores.find((store) => store.id === selectedStoreId) || null,
    [accessibleStores, selectedStoreId]
  )

  const persistSelectedStoreId = useCallback((id: string | null) => {
    setSelectedStoreIdState(id)
    if (typeof window === 'undefined') return
    if (id) localStorage.setItem('storify_selected_store_id', id)
    else localStorage.removeItem('storify_selected_store_id')
  }, [])

  const clearDashboardData = useCallback(() => {
    setUsers([])
    setStores([])
    setProducts([])
    setOrders([])
    setBuyers([])
    setSubscriptions([])
    setUpsells([])
    setProductTypes([])
    setCategories([])
    setMedia([])
    setEmployees([])
    setAuditLogs([])
    persistSelectedStoreId(null)
    setSelectedStoreError(null)
    setDataError(null)
  }, [persistSelectedStoreId])

  useEffect(() => {
    if (isAuthLoading) return

    if (!currentUser) {
      persistSelectedStoreId(null)
      setSelectedStoreError(null)
      return
    }

    if (isDataLoading) return

    if (accessibleStores.length === 0) {
      persistSelectedStoreId(null)
      setSelectedStoreError(null)
      return
    }

    const saved = typeof window !== 'undefined' ? localStorage.getItem('storify_selected_store_id') : null
    const currentIsValid = Boolean(selectedStoreId && accessibleStores.some((store) => store.id === selectedStoreId))

    if (currentIsValid) {
      if (saved !== selectedStoreId) {
        persistSelectedStoreId(selectedStoreId)
      }
      setSelectedStoreError(null)
      return
    }

    const savedStore = saved ? accessibleStores.find((store) => store.id === saved) : null
    if (savedStore) {
      persistSelectedStoreId(savedStore.id)
      setSelectedStoreError(null)
      return
    }

    if (saved || selectedStoreId) {
      setSelectedStoreError(t('selectedStoreUnavailable'))
      if (typeof window !== 'undefined') {
        localStorage.removeItem('storify_selected_store_id')
      }
    }

    const fallbackStore = accessibleStores.find((store) => store.isActive) || accessibleStores[0]
    if (currentUser.role === 'admin') {
      persistSelectedStoreId(null)
      return
    }

    persistSelectedStoreId(fallbackStore.id)
  }, [accessibleStores, currentUser, isAuthLoading, isDataLoading, persistSelectedStoreId, selectedStoreId, t])

  const setSelectedStoreId = useCallback((id: string | null) => {
    if (!currentUser) {
      persistSelectedStoreId(null)
      setSelectedStoreError(t('pleaseLogInToSelectStore'))
      return
    }

    if (!id) {
      persistSelectedStoreId(null)
      setSelectedStoreError(null)
      return
    }

    const store = accessibleStores.find((item) => item.id === id)
    if (!store) {
      persistSelectedStoreId(null)
      setSelectedStoreError(t('storeDoesNotBelongToAccount'))
      return
    }

    persistSelectedStoreId(store.id)
    setSelectedStoreError(null)
  }, [accessibleStores, currentUser, persistSelectedStoreId, t])

  // Update document title dynamically
  useEffect(() => {
    if (typeof window !== 'undefined' && settings.site_name) {
      const isDashboard = window.location.pathname.startsWith('/dashboard')
      if (isDashboard) {
        document.title = `${settings.site_name} | Dashboard`
      }
    }
  }, [settings.site_name])

  const fetchData = useCallback(async () => {
    if (isAuthLoading) {
      return
    }

    if (debug) {
      console.log('[DataContext] fetchData starting...')
    }

    setDataError(null)
    setIsDataLoading(true)

    if (pathname.startsWith('/store/') || pathname.startsWith('/api/stores/')) {
      if (debug) {
        console.log('[DataContext] Storefront page detected, skipping dashboard data fetch')
      }
      setIsDataLoading(false)
      return
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('storify_access_token') : null

    if (!currentUser || !token) {
      clearDashboardData()
      setIsDataLoading(false)
      return
    }

    try {
      if (debug) {
        console.log('[DataContext] Fetching unified dashboard data...')
      }

      const res = await apiClient.get<ApiResponse<any>>('/api/v1/dashboard/init', { storeId: null })

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
        if (currentUser.role === 'employee') {
          setEmployees([])
        } else if (d.employees) {
          setEmployees(d.employees)
        } else if (currentUser.role === 'store_owner') {
          try {
            const employeesRes = await apiClient.get<ApiResponse<User[]>>('/api/v1/employees', { storeId: null })
            if (employeesRes.success && employeesRes.data) {
              setEmployees(employeesRes.data)
            }
          } catch (error) {
            if (debug) {
              console.error('[DataContext] Error loading employees:', error)
            }
          }
        }
        if (debug) {
          console.log('[DataContext] Dashboard data loaded successfully')
        }
      } else {
        setDataError(res.error || 'Failed to load dashboard data')
      }
    } catch (error) {
      if (debug) {
        console.error('[DataContext] Error in fetchData:', error)
      }
      setDataError(error instanceof Error ? error.message : 'Failed to load dashboard data')
    } finally {
      setIsDataLoading(false)
    }
  }, [clearDashboardData, currentUser, debug, isAuthLoading, pathname])

  useEffect(() => {
    if (isAuthLoading) {
      return
    }

    if (debug) {
      console.log('[DataContext] Initial fetch trigger')
    }
    fetchData()
  }, [debug, fetchData, isAuthLoading])

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
      const res = await apiClient.post<ApiResponse<Store>>('/api/v1/stores', storeData, { storeId: null })
      if (!res.success || !res.data) {
        throw new Error(res.error || t('failedToCreateStore'))
      }
      const createdStore = res.data
      setStores((prev) => prev.map((store) => store.id === newStore.id ? createdStore : store))
      persistSelectedStoreId(createdStore.id)
      setTimeout(refetchAll, 300)
      toast.success(t('storeCreatedSuccessfully'))
      return createdStore
    } catch (err: any) {
      setStores((prev) => prev.filter(s => s.id !== newStore.id)) // Rollback
      toast.error(err.message || t('failedToCreateStore'))
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
    apiClient.post('/api/v1/product-types', ptData)
      .then(() => {
        toast.success('Category group added!')
        setTimeout(refetchAll, 300)
      })
      .catch(err => {
        setProductTypes((prev) => prev.filter(pt => pt.id !== newPT.id))
        toast.error(err.message || 'Failed to add category group')
      })
    return newPT
  }
  const updateProductType = (id: string, data: Partial<ProductType>) => {
    setProductTypes((prev) => prev.map((pt) => (pt.id === id ? { ...pt, ...data } : pt)))
    apiClient.patch(`/api/v1/product-types/${id}`, data)
      .then(() => {
        toast.success('Category group updated!')
        setTimeout(refetchAll, 300)
      })
      .catch(err => toast.error(err.message || 'Failed to update category group'))
  }
  const deleteProductType = (id: string) => {
    setProductTypes((prev) => prev.filter((pt) => pt.id !== id))
    apiClient.del(`/api/v1/product-types/${id}`)
      .then(() => {
        toast.success('Category group deleted!')
        setTimeout(refetchAll, 300)
      })
      .catch(err => toast.error(err.message || 'Failed to delete category group'))
  }
  // Category operations
  const addCategory = (catData: Omit<Category, 'id'>): Category => {
    const newCat: Category = { ...catData, id: generateId('cat') }
    setCategories((prev) => [...prev, newCat])
    apiClient.post('/api/v1/categories', catData)
      .then(() => {
        toast.success('Sub-category added!')
        setTimeout(refetchAll, 300)
      })
      .catch(err => {
        setCategories((prev) => prev.filter(c => c.id !== newCat.id))
        toast.error(err.message || 'Failed to add sub-category')
      })
    return newCat
  }
  const updateCategory = (id: string, data: Partial<Category>) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)))
    apiClient.patch(`/api/v1/categories/${id}`, data)
      .then(() => {
        toast.success('Sub-category updated!')
        setTimeout(refetchAll, 300)
      })
      .catch(err => toast.error(err.message || 'Failed to update sub-category'))
  }
  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id))
    apiClient.del(`/api/v1/categories/${id}`)
      .then(() => {
        toast.success('Sub-category deleted!')
        setTimeout(refetchAll, 300)
      })
      .catch(err => toast.error(err.message || 'Failed to delete sub-category'))
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

    // Sync buyer state if buyer info was included in the update
    const buyerInfo = data as any
    if (buyerInfo.buyerName || buyerInfo.buyerPhone || buyerInfo.governorate || buyerInfo.district) {
      const order = orders.find(o => o.id === id)
      if (order && order.buyerId) {
        setBuyers(prev => prev.map(b => b.id === order.buyerId ? {
          ...b,
          name: buyerInfo.buyerName || b.name,
          phone: buyerInfo.buyerPhone || b.phone,
          governorate: buyerInfo.governorate || b.governorate,
          district: buyerInfo.district || b.district,
          landmark: buyerInfo.landmark || b.landmark,
        } : b))
      }
    }

    // Prepare data for API
    apiClient.patch(`/api/v1/orders/${id}`, {
      status: data.status,
      internalNotes: data.notes,
      totalAmount: data.totalAmount,
      deliveryFee: data.deliveryFee,
      buyerName: buyerInfo.buyerName,
      buyerPhone: buyerInfo.buyerPhone,
      governorate: buyerInfo.governorate,
      district: buyerInfo.district,
      landmark: buyerInfo.landmark,
    }).then(() => setTimeout(refetchAll, 300)).catch(console.error)
  }
  const updateOrderStatus = (id: string, status: OrderStatus, performedBy?: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o)))
    apiClient.patch(`/api/v1/orders/${id}/status`, { status }).then(() => setTimeout(refetchAll, 300)).catch(console.error)
  }
  const sendOrderToAlWaseet = async (id: string): Promise<boolean> => {
    try {
      const response = await apiClient.post<ApiResponse<Order>>(`/api/v1/orders/${id}/alwaseet`, {})
      if (response.success && response.data) {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, ...response.data } : o))
        toast.success('Order push to Al-Waseet initiated')
        return true
      } else {
        toast.error(response.error || 'Failed to send to Al-Waseet')
        return false
      }
    } catch (error) {
      console.error('Error sending to Al-Waseet:', error)
      toast.error('Connection error')
      return false
    }
  }
  const deleteOrder = (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id))
    apiClient.del(`/api/v1/orders/${id}`).then(() => setTimeout(refetchAll, 300)).catch(console.error)
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
    // Map camelCase to snake_case if necessary, or just ensure they are passed correctly
    const mapped: Record<string, string> = {}
    for (const [key, value] of Object.entries(newSettings)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
      mapped[snakeKey] = value
    }

    setSettings((prev) => ({ ...prev, ...mapped }))
    await apiClient.post('/api/v1/admin/settings', { settings: mapped })
  }

  // Helpers
  const getStoresByUserId = (userId: string) => {
    if (currentUser?.role === 'employee' && currentUser.id === userId) {
      return stores
    }

    return stores.filter((s) => s.userId === userId)
  }
  const getSubscriptionByUserId = (userId: string) => subscriptions.find((s) => s.userId === userId)
  const getProductsByStoreId = (storeId: string) => products.filter((p) => p.storeId === storeId)
  const getOrdersByStoreId = (storeId: string) => orders.filter((o) => o.storeId === storeId)
  const getUpsellsByUserId = (userId: string) => upsells.filter((u) => u.userId === userId)
  const getProductTypesByStoreId = (storeId: string) => productTypes.filter((pt) => pt.storeId === storeId || !pt.storeId || pt.storeId === 'null')
  const getCategoriesByProductType = (productTypeId: string) => categories.filter((c) => c.productTypeId === productTypeId)
  const getMediaByProduct = (productId: string) => media.filter((m) => m.productId === productId)

  const addEmployee = async (employeeData: any) => {
    try {
      const res = await apiClient.post<ApiResponse<User>>('/api/v1/employees', employeeData)
      if (res.success && res.data) {
        setEmployees(prev => [res.data!, ...prev])
        toast.success(t('employeeCreated'))
        return true
      }
      return false
    } catch (e) {
      toast.error(t('error'))
      return false
    }
  }

  const updateEmployee = async (id: string, data: any) => {
    try {
      const res = await apiClient.patch<ApiResponse<User>>(`/api/v1/employees/${id}`, data)
      if (res.success && res.data) {
        setEmployees(prev => prev.map(e => e.id === id ? res.data! : e))
        toast.success(t('employeeUpdated'))
      }
    } catch (e) {
      toast.error(t('error'))
    }
  }

  const deleteEmployee = async (id: string) => {
    try {
      const res = await apiClient.del<ApiResponse<void>>(`/api/v1/employees/${id}`)
      if (res.success) {
        setEmployees(prev => prev.filter(e => e.id !== id))
        toast.success(t('employeeDeleted'))
      }
    } catch (error) {
      const debug = process.env.NEXT_PUBLIC_DEBUG === 'true'
      if (debug) {
        console.error('[DataContext] Error in fetchData:', error)
      }
      setIsDataLoading(false)
    } finally {
      setIsDataLoading(false)
    }
  }

  return (
    <DataContext.Provider
      value={{
        users, stores, products, orders, buyers, subscriptions, upsells,
        productTypes, categories, media, employees, auditLogs, settings, isDataLoading, dataError,
        addUser, updateUser, deleteUser,
        addStore, updateStore, deleteStore,
        addProduct, updateProduct, deleteProduct,
        addOrder, updateOrder, updateOrderStatus, sendOrderToAlWaseet, deleteOrder,
        addBuyer, updateBuyer, blacklistBuyer, findBuyerByPhone,
        addEmployee, updateEmployee, deleteEmployee,
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
        selectedStoreId, selectedStore, accessibleStores, selectedStoreError, setSelectedStoreId
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
