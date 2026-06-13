'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/lib/data-context'
import { useTranslations } from '@/hooks/use-translations'
import { useAuth } from '@/lib/auth-context'
import { PLAN_LIMITS, type Store } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  MoreHorizontal, Search, Plus, Eye, Edit, Trash2, ExternalLink,
  Copy, Store as StoreIcon, Truck, Palette, CheckCircle2,
  Upload, Link as LinkIcon, Loader2, X, Layout, MessageSquare,
  Settings2, Globe2, AlertCircle, Save, Lock, Send, User,
  ArrowUpDown, Package, ShoppingCart, ShieldCheck, Sparkles, CreditCard
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { THEME_SUGGESTIONS } from '@/lib/themes'
import { getStoreUrl } from '@/lib/store-utils'
import { Skeleton } from '@/components/ui/skeleton'

interface StoresTableProps {
  userId?: string
  showOwner?: boolean
}

/**
 * Premium Store Management Component
 * Features: 3-step wizard, glassmorphism UI, responsive design
 */
export function StoresTable({ userId, showOwner = false }: StoresTableProps) {
  const router = useRouter()
  const { language, user } = useAuth()
  const { t } = useTranslations()
  const {
    stores,
    users,
    addStore,
    updateStore,
    deleteStore,
    getProductsByStoreId,
    getOrdersByStoreId,
    getSubscriptionByUserId,
    setSelectedStoreId,
    isDataLoading
  } = useData()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'products' | 'orders'>('newest')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [storePendingDelete, setStorePendingDelete] = useState<Store | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [step, setStep] = useState(1)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    whatsappNumber: '',
    description: '',
    logoUrl: '',
    coverUrl: '',
    isActive: true,
    globalDiscount: 0,
    deliveryDays: 3,
    telegramChatId: '',
    telegramUserId: '',
    telegramGroupId: '',
    telegramChannelId: '',
    telegramAutoPost: false,
    facebookUrl: '',
    instagramUrl: '',
    tiktokUrl: '',
    youtubeUrl: '',
    twitterUrl: '',
    snapchatUrl: '',
    websiteUrl: '',
    notificationMethod: 'telegram' as 'telegram' | 'whatsapp' | 'both',
    themeSettings: {
      primaryColor: '#2563eb',
      accentColor: '#3b82f6',
      backgroundColor: '#ffffff',
      fontFamily: 'Inter',
      themeName: 'Default'
    }
  })

  const [isUploading, setIsUploading] = useState<{ logo?: boolean, cover?: boolean }>({})
  const [logoMode, setLogoMode] = useState<'url' | 'upload'>('url')
  const [coverMode, setCoverMode] = useState<'url' | 'upload'>('url')

  const targetUserId = userId || user?.id || ''
  const activeSubscription = targetUserId ? getSubscriptionByUserId(targetUserId) : undefined
  const planCode = String(activeSubscription?.planCode || user?.subscription_plan || 'starter').toLowerCase()
  const planLimits = PLAN_LIMITS[planCode] || PLAN_LIMITS.starter
  const storeLimit = user?.role === 'admin' ? Infinity : planLimits.stores
  const planDisplayName = user?.role === 'admin' ? 'Platform admin' : `${planCode} plan`

  const baseStores = useMemo(
    () => stores.filter((store) => !userId || store.userId === userId),
    [stores, userId]
  )

  const storeStats = useMemo(() => {
    return baseStores.reduce(
      (acc, store) => {
        const productsCount = getProductsByStoreId(store.id).length || store.productCount || 0
        const ordersCount = getOrdersByStoreId(store.id).length

        acc.products += productsCount
        acc.orders += ordersCount
        acc.active += store.isActive ? 1 : 0
        acc.inactive += store.isActive ? 0 : 1

        return acc
      },
      { products: 0, orders: 0, active: 0, inactive: 0 }
    )
  }, [baseStores, getOrdersByStoreId, getProductsByStoreId])

  const filteredStores = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return [...baseStores]
      .filter((store) => {
        const matchesSearch =
          !query ||
          store.name.toLowerCase().includes(query) ||
          store.slug.toLowerCase().includes(query) ||
          Boolean(users.find((owner) => owner.id === store.userId)?.name.toLowerCase().includes(query))

        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active' && store.isActive) ||
          (statusFilter === 'inactive' && !store.isActive)

        return matchesSearch && matchesStatus
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name)
        if (sortBy === 'products') return getProductsByStoreId(b.id).length - getProductsByStoreId(a.id).length
        if (sortBy === 'orders') return getOrdersByStoreId(b.id).length - getOrdersByStoreId(a.id).length
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      })
  }, [baseStores, getOrdersByStoreId, getProductsByStoreId, searchQuery, sortBy, statusFilter, users])

  const isStoreLimitReached = Number.isFinite(storeLimit) && baseStores.length >= storeLimit
  const storeLimitLabel = Number.isFinite(storeLimit) ? `${baseStores.length}/${storeLimit}` : `${baseStores.length}/Unlimited`

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      whatsappNumber: '',
      description: '',
      logoUrl: '',
      coverUrl: '',
      isActive: true,
      globalDiscount: 0,
      deliveryDays: 3,
      telegramChatId: '',
      telegramUserId: '',
      telegramGroupId: '',
      telegramChannelId: '',
      telegramAutoPost: false,
      facebookUrl: '',
      instagramUrl: '',
      tiktokUrl: '',
      youtubeUrl: '',
      twitterUrl: '',
      snapchatUrl: '',
      websiteUrl: '',
      notificationMethod: 'telegram',
      themeSettings: {
        primaryColor: '#2563eb',
        accentColor: '#3b82f6',
        backgroundColor: '#ffffff',
        fontFamily: 'Inter',
        themeName: 'Default'
      }
    })
    setStep(1)
    setLogoMode('url')
    setCoverMode('url')
  }

  const handleNameChange = (val: string) => {
    setFormData(prev => ({
      ...prev,
      name: val,
      slug: !selectedStore ? val.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') : prev.slug
    }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover', sId?: string | number) => {
    const file = e.target.files?.[0]
    if (!file) return

    const uploadStoreId = sId ? String(sId) : "0"
    setIsUploading(prev => ({ ...prev, [type]: true }))

    try {
      const token = localStorage.getItem('storify_access_token')
      const fd = new FormData()
      fd.append('file', file)
      fd.append('storeId', uploadStoreId)

      const response = await fetch('/api/v1/media', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd
      })

      const data = await response.json()
      if (data.success && data.data) {
        setFormData(prev => ({
          ...prev,
          [type === 'logo' ? 'logoUrl' : 'coverUrl']: data.data.url
        }))
        toast.success(t('success'))
      } else {
        toast.error(data.error || t('error'))
      }
    } catch (error) {
      toast.error(t('error'))
    } finally {
      setIsUploading(prev => ({ ...prev, [type]: false }))
    }
  }

  const handleAdd = async () => {
    const targetUserId = userId || user?.id
    if (!targetUserId) return
    if (isStoreLimitReached) {
      toast.error('Store limit reached. Upgrade your plan to add another storefront.')
      return
    }
    if (!formData.name || !formData.slug) {
      toast.error(t('allFieldsRequired' as any))
      return
    }
    try {
      const newStore = await addStore({
        ...formData,
        userId: targetUserId,
        notificationSettings: {
          notificationMethod: formData.notificationMethod,
          newOrders: true,
          orderConfirmations: true,
          statusChanges: true,
          riskAlerts: true
        }
      })

      setIsAddDialogOpen(false)
      resetForm()
      return newStore
    } catch (e) {
      throw e
    }
  }

  const handleUpdate = async () => {
    if (!selectedStore) return
    try {
      await updateStore(selectedStore.id, {
        ...formData,
        notificationSettings: {
          notificationMethod: formData.notificationMethod,
          newOrders: selectedStore.notificationSettings?.newOrders ?? true,
          orderConfirmations: selectedStore.notificationSettings?.orderConfirmations ?? true,
          statusChanges: selectedStore.notificationSettings?.statusChanges ?? true,
          riskAlerts: selectedStore.notificationSettings?.riskAlerts ?? true
        }
      })
      setIsEditDialogOpen(false)
      setSelectedStore(null)
      resetForm()
    } catch (e) {}
  }

  const handleDeleteConfirmed = async () => {
    if (!storePendingDelete) return

    setIsDeleting(true)
    try {
      await deleteStore(storePendingDelete.id)
      setStorePendingDelete(null)
    } catch (e) {
      // The data context already rolls back and shows the API error.
    } finally {
      setIsDeleting(false)
    }
  }

  const enterStore = (store: Store, href: string = '/dashboard') => {
    setSelectedStoreId(store.id)
    router.push(href)
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stores</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{baseStores.length}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <StoreIcon className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{storeStats.active} active, {storeStats.inactive} inactive</p>
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Products</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{storeStats.products}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Across visible storefronts</p>
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Orders</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{storeStats.orders}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Selected dashboard data</p>
        </div>

        <div className={cn("rounded-lg border bg-card p-5 shadow-sm", isStoreLimitReached && "border-amber-500/40 bg-amber-500/5")}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan capacity</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{storeLimitLabel}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <p className={cn("mt-3 text-sm text-muted-foreground", isStoreLimitReached && "text-amber-700 dark:text-amber-300")}>
            {isStoreLimitReached ? 'Store limit reached' : planDisplayName}
          </p>
        </div>
      </section>

      {isStoreLimitReached && (
        <div className="flex flex-col gap-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Your current plan has reached its store limit.</p>
              <p className="text-sm opacity-80">Upgrade the owner subscription before creating another storefront.</p>
            </div>
          </div>
          <Button asChild variant="outline" className="shrink-0 border-amber-500/40 bg-background/60">
            <Link href="/dashboard/billing">
              <Sparkles className="me-2 h-4 w-4" />
              Upgrade
            </Link>
          </Button>
        </div>
      )}

      <section className="rounded-lg border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search stores, slugs, or owners"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 rounded-lg pl-10"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex rounded-lg border bg-background p-1">
              {(['all', 'active', 'inactive'] as const).map((status) => (
                <Button
                  key={status}
                  type="button"
                  variant={statusFilter === status ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 rounded-md px-3 text-xs capitalize"
                  onClick={() => setStatusFilter(status)}
                >
                  {status}
                </Button>
              ))}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-11 justify-start gap-2 rounded-lg">
                  <ArrowUpDown className="h-4 w-4" />
                  Sort: {sortBy}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {([
                  ['newest', 'Newest'],
                  ['name', 'Name'],
                  ['products', 'Products'],
                  ['orders', 'Orders'],
                ] as const).map(([value, label]) => (
                  <DropdownMenuItem key={value} onClick={() => setSortBy(value)} className="cursor-pointer">
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog
              open={isAddDialogOpen}
              onOpenChange={(open) => {
                if (open && isStoreLimitReached) {
                  toast.error('Store limit reached. Upgrade your plan to add another storefront.')
                  return
                }
                setIsAddDialogOpen(open)
              }}
            >
              <DialogTrigger asChild>
                <Button disabled={isStoreLimitReached} className="h-11 rounded-lg px-5" onClick={resetForm}>
                  <Plus className="h-4 w-4 me-2" />
                  Add store
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] overflow-hidden rounded-xl p-0 sm:max-w-4xl">
                <div className="flex max-h-[90vh] flex-col sm:max-h-[85vh]">
                  <div className="border-b bg-muted/30 p-6">
                    <DialogHeader>
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Plus className="h-5 w-5" />
                        </div>
                        <div>
                          <DialogTitle className="text-xl font-semibold tracking-tight">Add store</DialogTitle>
                          <DialogDescription>Create the storefront identity, branding, and notification setup.</DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <StoreFormFields
                      formData={formData} setFormData={setFormData}
                      step={step} setStep={setStep}
                      handleFileUpload={handleFileUpload} isUploading={isUploading}
                      logoMode={logoMode} setLogoMode={setLogoMode}
                      coverMode={coverMode} setCoverMode={setCoverMode}
                      handleNameChange={handleNameChange}
                      handleAdd={handleAdd} handleUpdate={handleUpdate}
                      t={t} language={language}
                      telegramUserId={formData.telegramUserId}
                      telegramGroupId={formData.telegramGroupId}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="p-4">
          {isDataLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="rounded-lg border p-4">
                  <Skeleton className="aspect-[16/7] w-full rounded-md" />
                  <div className="mt-4 flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <Skeleton className="h-14 rounded-md" />
                    <Skeleton className="h-14 rounded-md" />
                    <Skeleton className="h-14 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <StoreIcon className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{baseStores.length === 0 ? 'No stores yet' : 'No stores match your filters'}</h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {baseStores.length === 0
                  ? 'Create your first storefront to start managing products, orders, branding, and integrations.'
                  : 'Adjust search, status, or sorting to find the storefront you need.'}
              </p>
              {baseStores.length === 0 && (
                <Button
                  className="mt-6 rounded-lg"
                  disabled={isStoreLimitReached}
                  onClick={() => {
                    resetForm()
                    setIsAddDialogOpen(true)
                  }}
                >
                  <Plus className="me-2 h-4 w-4" />
                  Add store
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredStores.map((store) => {
                const productsCount = getProductsByStoreId(store.id).length || store.productCount || 0
                const ordersCount = getOrdersByStoreId(store.id).length
                const ownerName = users.find((owner) => owner.id === store.userId)?.name || 'Owner'

                return (
                  <article key={store.id} className="group overflow-hidden rounded-lg border bg-background shadow-sm transition hover:border-primary/30 hover:shadow-md">
                    <div className="relative aspect-[16/7] overflow-hidden bg-muted">
                      {store.coverUrl ? (
                        <img src={store.coverUrl} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,hsl(var(--muted)),hsl(var(--background)))]">
                          <StoreIcon className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute left-3 top-3 flex gap-2">
                        <Badge variant="outline" className={cn("rounded-md border bg-background/90 text-xs shadow-sm", store.isActive ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")}>
                          {store.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {showOwner && (
                          <Badge variant="outline" className="rounded-md border bg-background/90 text-xs shadow-sm">
                            {ownerName}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute right-3 top-3 h-8 rounded-md bg-background/90"
                        asChild
                      >
                        <Link href={getStoreUrl(store.slug)} target="_blank">
                          <ExternalLink className="me-2 h-3.5 w-3.5" />
                          View
                        </Link>
                      </Button>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                          {store.logoUrl ? (
                            <img src={store.logoUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <StoreIcon className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-base font-semibold tracking-tight">{store.name}</h3>
                          <p className="truncate font-mono text-xs text-muted-foreground">/{store.slug}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Store actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedStore(store);
                                setFormData({
                                  name: store.name,
                                  slug: store.slug,
                                  whatsappNumber: store.whatsappNumber || '',
                                  description: store.description,
                                  logoUrl: store.logoUrl || '',
                                  coverUrl: store.coverUrl || '',
                                  isActive: store.isActive,
                                  globalDiscount: store.globalDiscount || 0,
                                  deliveryDays: store.deliveryDays || 3,
                                  telegramChatId: store.telegramChatId || '',
                                  telegramUserId: store.telegramUserId || '',
                                  telegramGroupId: store.telegramGroupId || '',
                                  telegramChannelId: store.telegramChannelId || '',
                                  telegramAutoPost: store.telegramAutoPost || false,
                                  facebookUrl: store.facebookUrl || '',
                                  instagramUrl: store.instagramUrl || '',
                                  tiktokUrl: store.tiktokUrl || '',
                                  youtubeUrl: store.youtubeUrl || '',
                                  twitterUrl: store.twitterUrl || '',
                                  snapchatUrl: store.snapchatUrl || '',
                                  websiteUrl: store.websiteUrl || '',
                                  notificationMethod: store.notificationSettings?.notificationMethod || 'telegram',
                                  themeSettings: store.themeSettings || {
                                    primaryColor: '#2563eb',
                                    accentColor: '#3b82f6',
                                    backgroundColor: '#ffffff',
                                    fontFamily: 'Inter',
                                    themeName: 'Default'
                                  }
                                });
                                setStep(1);
                                setIsEditDialogOpen(true);
                              }}
                              className="cursor-pointer"
                            >
                              <Edit className="h-4 w-4" /> Edit store
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => enterStore(store, '/dashboard/products')} className="cursor-pointer">
                              <Package className="h-4 w-4" /> Products
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => enterStore(store, '/dashboard/orders')} className="cursor-pointer">
                              <ShoppingCart className="h-4 w-4" /> Orders
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setStorePendingDelete(store)} className="cursor-pointer text-destructive focus:text-destructive">
                              <Trash2 className="h-4 w-4" /> Delete store
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => enterStore(store, '/dashboard/products')}
                          className="rounded-md border bg-muted/30 p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
                        >
                          <p className="text-lg font-semibold">{productsCount}</p>
                          <p className="text-xs text-muted-foreground">Products</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => enterStore(store, '/dashboard/orders')}
                          className="rounded-md border bg-muted/30 p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
                        >
                          <p className="text-lg font-semibold">{ordersCount}</p>
                          <p className="text-xs text-muted-foreground">Orders</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => enterStore(store, '/dashboard/settings')}
                          className="rounded-md border bg-muted/30 p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
                        >
                          <p className="text-lg font-semibold">{store.deliveryDays || 3}d</p>
                          <p className="text-xs text-muted-foreground">Delivery</p>
                        </button>
                      </div>

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <Button className="flex-1 rounded-lg" onClick={() => enterStore(store)}>
                          <ShieldCheck className="me-2 h-4 w-4" />
                          Enter store
                        </Button>
                        <Button variant="outline" className="rounded-lg" onClick={() => enterStore(store, '/dashboard/settings')}>
                          <Settings2 className="me-2 h-4 w-4" />
                          Settings
                        </Button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <AlertDialog open={Boolean(storePendingDelete)} onOpenChange={(open) => !open && setStorePendingDelete(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {storePendingDelete?.name || 'store'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the storefront from the dashboard. Products, orders, media, and integrations attached to it may become unavailable for normal store operations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault()
                void handleDeleteConfirmed()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Delete store
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl p-0 overflow-hidden bg-background/95 backdrop-blur-3xl border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[2.5rem] sm:rounded-[3.5rem] ring-1 ring-white/10">
          <div className="flex flex-col max-h-[90vh] sm:max-h-[85vh]">
            <div className="p-8 sm:p-10 pb-6 border-b border-white/5 bg-white/5">
              <DialogHeader>
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-3xl bg-accent/20 flex items-center justify-center shadow-inner ring-1 ring-white/10">
                    <Palette className="h-8 w-8 text-accent" />
                  </div>
                  <div>
                    <DialogTitle className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">{t('edit')} {t('stores')}</DialogTitle>
                    <DialogDescription className="text-[10px] font-black opacity-40 uppercase tracking-[0.3em]">{t('modifyStorefront')}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <StoreFormFields
                formData={formData} setFormData={setFormData}
                step={step} setStep={setStep}
                handleFileUpload={handleFileUpload} isUploading={isUploading}
                logoMode={logoMode} setLogoMode={setLogoMode}
                coverMode={coverMode} setCoverMode={setCoverMode}
                handleNameChange={handleNameChange}
                handleAdd={handleAdd} handleUpdate={handleUpdate}
                t={t} language={language}
                isEdit={true}
                storeId={selectedStore?.id}
                telegramUserId={formData.telegramUserId}
                telegramGroupId={formData.telegramGroupId}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Extracted Form Fields for Focus Stability
 */
interface StoreFormFieldsProps {
  formData: any
  setFormData: (data: any) => void
  step: number
  setStep: (step: number) => void
  handleFileUpload: any
  isUploading: any
  logoMode: string
  setLogoMode: (mode: 'url' | 'upload') => void
  coverMode: string
  setCoverMode: (mode: 'url' | 'upload') => void
  handleNameChange: (val: string) => void
  handleAdd: () => void
  handleUpdate: () => void
  t: any
  language: string
  isEdit?: boolean
  storeId?: string | number
  telegramUserId?: string
  telegramGroupId?: string
}

function StoreFormFields({
  formData, setFormData, step, setStep, handleFileUpload, isUploading,
  logoMode, setLogoMode, coverMode, setCoverMode, handleNameChange,
  handleAdd, handleUpdate, t, language, isEdit = false, storeId,
  telegramUserId, telegramGroupId
}: StoreFormFieldsProps) {
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async (type: 'user' | 'group') => {
    let activeStoreId = storeId

     // If it's a new store, we need to save it first
    if (!isEdit && !activeStoreId) {
      toast.info(t('savingStoreFirst'))
      try {
        const newStore = await handleAdd() as any
        if (newStore && newStore.id) {
          activeStoreId = newStore.id
          // Note: In a real app, we might need to wait for state to sync,
          // but handleAdd in parent should have updated the store list.
        } else {
          return // Error already handled by handleAdd
        }
      } catch (err) {
        return
      }
    }

    if (!activeStoreId) {
      toast.error(t('saveStoreFirst'))
      return
    }

    setIsConnecting(true)
    try {
      const res = await fetch('/api/telegram/link-bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('storify_access_token')}`
        },
        body: JSON.stringify({ storeId: activeStoreId, type })
      })
      const data = await res.json()
      if (data.success && data.deeplink) {
        window.location.href = data.deeplink
        toast.info(t('followInstructionsInTelegram'))
      } else {
        toast.error(data.error || 'Failed to generate link')
      }
    } catch (error) {
      toast.error('Network error')
    } finally {
      setIsConnecting(false)
    }
  }

  const steps = [
    { id: 1, name: t('basics'), icon: Layout },
    { id: 2, name: t('appearance'), icon: Palette },
    { id: 3, name: t('connections'), icon: Settings2 },
  ]

  return (
    <div className="w-full">
      {/* 3-Step Wizard Progress */}
      <div className="flex items-center justify-between px-8 sm:px-16 py-8 border-b border-white/5 bg-white/5">
        {steps.map((s) => (
          <div key={s.id} className="flex-1 relative group">
            <div className="flex flex-col items-center gap-3 relative z-10">
              <button
                onClick={() => s.id < step && setStep(s.id)}
                className={cn(
                  "h-10 w-10 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center transition-all duration-700 shadow-2xl ring-2",
                  step >= s.id
                    ? "bg-primary text-primary-foreground ring-primary/40 scale-110"
                    : "bg-white/5 text-muted-foreground ring-transparent hover:bg-white/10"
                )}
              >
                <s.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-[0.2em] transition-all hidden sm:block",
                step >= s.id ? "text-primary opacity-100" : "text-muted-foreground opacity-40"
              )}>
                {s.name}
              </span>
            </div>
            {s.id < steps.length && (
              <div className="absolute top-5 sm:top-6 left-1/2 w-full h-[2px] bg-white/5 -z-0">
                <div
                  className="absolute inset-0 bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-in-out"
                  style={{ transform: `translateX(${step > s.id ? '0%' : '-100%'})` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-8 sm:p-12">
        <div className="min-h-[400px] sm:min-h-[450px]">
          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
               <div className="p-10 rounded-[3rem] border border-white/5 bg-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] rotate-12 transition-transform group-hover:rotate-0 duration-1000">
                  <StoreIcon className="h-40 w-40" />
                </div>
               <div className="flex flex-col sm:flex-row items-center gap-10 relative z-10">
                  <div className="relative group/logo-upload">
                    <div className="h-32 w-32 rounded-[2.5rem] bg-background border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden shadow-2xl ring-1 ring-white/5 transition-all group-hover/logo-upload:border-primary/50 group-hover/logo-upload:ring-primary/20">
                      {formData.logoUrl ? (
                        <img src={formData.logoUrl} alt="" className="h-full w-full object-cover transition-transform group-hover/logo-upload:scale-110" />
                      ) : (
                        <div className="text-center p-4 opacity-20">
                          <Upload className="h-8 w-8 mx-auto mb-2 text-primary group-hover/logo-upload:scale-110 transition-transform" />
                          <span className="text-[8px] font-black uppercase tracking-tighter">{t('clickToUploadLogo')}</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      id="step1-logo-upload"
                      onChange={(e) => handleFileUpload(e, 'logo', storeId)}
                      className="absolute inset-0 opacity-0 cursor-pointer z-20"
                    />
                    {isUploading.logo && (
                      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center rounded-[2.5rem] z-30">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-4 text-center sm:text-left flex-1 min-w-0">
                    <div>
                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-2 opacity-60">{t('brandArchitect')}</p>
                      <h3 className="text-4xl font-black tracking-tighter leading-none truncate">{formData.name || t('yourVision')}</h3>
                    </div>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                      <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground bg-white/5 px-5 py-2.5 rounded-2xl border border-white/5">
                        <Globe2 className="h-4 w-4 text-primary" />
                        <span className="opacity-60 truncate max-w-[150px]">storify.shop/{formData.slug || 'slug'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground bg-white/5 px-5 py-2.5 rounded-2xl border border-white/5">
                        <Truck className="h-4 w-4 text-accent" />
                        <span className="opacity-60">{formData.deliveryDays} {t('days')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ps-2 opacity-60">{t('storeName')}</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="..."
                    className="h-14 rounded-2xl bg-white/5 border-white/5 focus:bg-white/10 transition-all text-lg font-black tracking-tight"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ps-2 opacity-60">{t('storeSlug')}</Label>
                  <div className="relative">
                    <Input
                      value={formData.slug}
                      disabled={isEdit}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                      placeholder="store-name"
                      className="h-14 rounded-2xl bg-white/5 border-white/5 pl-5 font-mono text-sm tracking-widest disabled:opacity-40"
                    />
                    {!isEdit && (
                       <div className="absolute right-5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_15px_rgba(34,197,94,0.5)] animate-pulse" />
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ps-2 opacity-60">{t('deliveryWindow')}</Label>
                  <div className="grid grid-cols-4 gap-3">
                    {[1, 2, 3, 5].map((d) => (
                      <Button
                        key={d}
                        variant={formData.deliveryDays === d ? 'default' : 'outline'}
                        onClick={() => setFormData({ ...formData, deliveryDays: d })}
                        className={cn(
                          "h-14 rounded-2xl font-black transition-all text-sm",
                          formData.deliveryDays === d
                            ? "bg-primary shadow-xl shadow-primary/20 scale-105"
                            : "bg-white/5 border-white/5"
                        )}
                      >
                        {d}d
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2 space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ps-2 opacity-60">{t('storeDescription')}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('shortBioDesc')}
                    className="min-h-[120px] rounded-2xl bg-white/5 border-white/5 focus:bg-white/10 transition-all text-sm font-medium resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: VISUALS */}
          {step === 2 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
               <div className="aspect-[21/9] rounded-[3rem] bg-white/5 border border-white/5 relative overflow-hidden group shadow-2xl">
                {formData.coverUrl ? (
                  <img src={formData.coverUrl} className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110" />
                ) : (
                  <div className="inset-0 absolute flex items-center justify-center flex-col gap-3 opacity-10">
                    <Palette className="h-16 w-16" />
                    <p className="text-xs font-black uppercase tracking-[0.5em]">{t('sceneBlueprint')}</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-90" />
                <div className="absolute bottom-10 left-10 flex items-center gap-8">
                  <div className="h-24 w-24 rounded-3xl bg-background border-4 border-white/5 overflow-hidden shadow-2xl ring-1 ring-white/10">
                    {formData.logoUrl && <img src={formData.logoUrl} className="h-full w-full object-cover" />}
                  </div>
                  <div className="text-foreground">
                    <p className="text-3xl font-black tracking-tighter mb-1">{formData.name || t('product')}</p>
                    <p className="text-[10px] opacity-40 font-black uppercase tracking-[0.3em]">{t('cinematicPreview')}</p>
                  </div>
                </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Profile Photo (logo_url) */}
                  <div className="space-y-5 p-8 rounded-[3rem] bg-white/5 border border-white/5 relative group transition-all hover:bg-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/20">
                          <StoreIcon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest opacity-60">{t('profilePhoto')}</span>
                      </div>
                    </div>
                    <Input value={formData.logoUrl} onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })} placeholder="Photo URL..." className="h-14 bg-background/50 rounded-2xl border-white/5" />
                    <label className="relative h-14 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center hover:border-primary/50 transition-all cursor-pointer bg-background/30 shadow-inner">
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo', storeId)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      <div className="flex items-center gap-2 opacity-40">
                        {isUploading.logo ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Upload className="h-4 w-4 text-primary" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('upload')} {t('profilePhoto')}</span>
                      </div>
                    </label>
                  </div>

                  {/* Cover Photo (cover_url) */}
                  <div className="space-y-5 p-8 rounded-[3rem] bg-white/5 border border-white/5 relative group transition-all hover:bg-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-accent/20">
                          <Palette className="h-4 w-4 text-accent" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest opacity-60">{t('coverPhoto')}</span>
                      </div>
                    </div>
                    <Input value={formData.coverUrl} onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })} placeholder="Cover URL..." className="h-14 bg-background/50 rounded-2xl border-white/5" />
                    <label className="relative h-14 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center hover:border-accent/50 transition-all cursor-pointer bg-background/30 shadow-inner">
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'cover', storeId)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      <div className="flex items-center gap-2 opacity-40">
                        {isUploading.cover ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : <Upload className="h-4 w-4 text-accent" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('upload')} {t('coverPhoto')}</span>
                      </div>
                    </label>
                  </div>
               </div>

               {/* Design Tokens */}
               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {THEME_SUGGESTIONS.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        themeSettings: {
                          ...formData.themeSettings,
                          primaryColor: theme.colors.primary,
                          accentColor: theme.colors.accent,
                          backgroundColor: theme.colors.background,
                          themeName: theme.id
                        }
                      })}
                      className={cn(
                        "group p-6 rounded-[2.5rem] border-2 transition-all duration-500 relative",
                        formData.themeSettings.themeName === theme.id
                          ? "border-primary bg-primary/10 scale-105 shadow-2xl"
                          : "border-white/5 bg-white/5 hover:border-white/20"
                      )}
                    >
                      <div className="h-12 w-12 rounded-[1.25rem] mx-auto mb-4 shadow-2xl transform group-hover:rotate-12 transition-transform" style={{ background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent})` }}>
                        {formData.themeSettings.themeName === theme.id && <CheckCircle2 className="h-full w-full p-3 text-white" />}
                      </div>
                      <p className="text-[9px] font-black uppercase text-center opacity-80 tracking-widest leading-tight">{theme.name}</p>
                    </button>
                  ))}
               </div>
            </div>
          )}

          {/* STEP 3: INTEGRATIONS */}
          {step === 3 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
               <div className="p-10 rounded-[3.5rem] bg-white/5 border border-white/5 space-y-10 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center shadow-inner ring-1 ring-white/10">
                      <MessageSquare className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1">{t('pulseEngine')}</h4>
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-40">{t('chooseNotificationGateway')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 relative z-10">
                    {[
                      { id: 'telegram', label: t('telegramBot'), icon: Globe2, color: 'text-primary' },
                      { id: 'whatsapp', label: t('whatsapp'), icon: MessageSquare, color: 'text-success' },
                      { id: 'both', label: t('omniChannel'), icon: Layout, color: 'text-accent' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setFormData({ ...formData, notificationMethod: m.id as any })}
                        className={cn(
                          "p-8 rounded-[3rem] border-2 text-left transition-all duration-500 group relative",
                          formData.notificationMethod === m.id
                            ? "border-primary bg-primary/20 shadow-2xl scale-[1.02]"
                            : "border-white/5 bg-background/50 hover:border-white/20"
                        )}
                      >
                        <m.icon className={cn("h-8 w-8 mb-6 group-hover:scale-125 transition-transform duration-700", m.color)} />
                        <p className="font-black uppercase tracking-tight text-lg leading-none mb-1">{m.label}</p>
                        <p className="text-[9px] font-black opacity-40 uppercase tracking-widest">{t('active')}</p>
                      </button>
                    ))}
                  </div>
               </div>

               <div className="p-10 rounded-[3.5rem] bg-white/5 border border-white/5 space-y-8 relative overflow-hidden">
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center shadow-inner ring-1 ring-white/10">
                      <LinkIcon className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black uppercase tracking-tighter leading-none mb-1">{t('socialMedia')}</h4>
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-40">{t('addSocialAccounts')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-2">{t('facebook')}</Label>
                      <Input
                        value={formData.facebookUrl}
                        onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                        placeholder="https://facebook.com/..."
                        className="h-12 rounded-xl bg-white/5 border-white/5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-2">{t('instagram')}</Label>
                      <Input
                        value={formData.instagramUrl}
                        onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                        placeholder="https://instagram.com/..."
                        className="h-12 rounded-xl bg-white/5 border-white/5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-2">{t('tiktok')}</Label>
                      <Input
                        value={formData.tiktokUrl}
                        onChange={(e) => setFormData({ ...formData, tiktokUrl: e.target.value })}
                        placeholder="https://tiktok.com/@..."
                        className="h-12 rounded-xl bg-white/5 border-white/5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-2">{t('youtube')}</Label>
                      <Input
                        value={formData.youtubeUrl}
                        onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                        placeholder="https://youtube.com/@..."
                        className="h-12 rounded-xl bg-white/5 border-white/5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-2">{t('xTwitter')}</Label>
                      <Input
                        value={formData.twitterUrl}
                        onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
                        placeholder="https://x.com/..."
                        className="h-12 rounded-xl bg-white/5 border-white/5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-2">{t('snapchat')}</Label>
                      <Input
                        value={formData.snapchatUrl}
                        onChange={(e) => setFormData({ ...formData, snapchatUrl: e.target.value })}
                        placeholder="https://snapchat.com/add/..."
                        className="h-12 rounded-xl bg-white/5 border-white/5"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-2">{t('website')}</Label>
                      <Input
                        value={formData.websiteUrl}
                        onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                        placeholder="https://yourwebsite.com"
                        className="h-12 rounded-xl bg-white/5 border-white/5"
                      />
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-8">
                {(formData.notificationMethod === 'whatsapp' || formData.notificationMethod === 'both') && (
                  <div className="p-8 rounded-[3.5rem] bg-success/5 border border-success/10 space-y-4 animate-in zoom-in-95 duration-500">
                    <Label className="text-[10px] font-black uppercase text-success tracking-[0.3em] ps-2 opacity-60">{t('directWhatsappLink')}</Label>
                    <Input value={formData.whatsappNumber} onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })} placeholder="+964 7XX XXX XXXX" dir="ltr" className="h-14 rounded-2xl bg-background/50 border-success/20 font-mono text-success text-xl" />
                  </div>
                )}
                {(formData.notificationMethod === 'telegram' || formData.notificationMethod === 'both') && (
                  <div className="space-y-6">
                    <div className="p-10 rounded-[3.5rem] bg-primary/5 border border-primary/10 space-y-8 animate-in zoom-in-95 duration-500">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                          <Send className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-black uppercase tracking-tight">{t('telegramSetup')}</p>
                          <p className="text-[10px] opacity-40 font-black uppercase tracking-widest">{t('connectGroupOrChannel')}</p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-background/50 border border-white/5 space-y-4">
                          <h5 className="text-[11px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                            <AlertCircle className="h-3 w-3 text-primary" />
                            {t('howToSetup')}
                          </h5>
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">1</div>
                              <p className="text-xs leading-relaxed opacity-70">{t('setupStep1')}</p>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">2</div>
                              <p className="text-xs leading-relaxed opacity-70">{t('setupStep2')}</p>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">3</div>
                              <p className="text-xs leading-relaxed opacity-70">{t('setupStep3')}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-black uppercase text-primary tracking-[0.3em] ps-2 opacity-60">{t('channelId')}</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[9px] uppercase font-black"
                              onClick={async () => {
                                if (!formData.telegramChannelId) return toast.error(t('enterChannelIdFirst'))
                                const res = await fetch('/api/v1/stores/telegram/validate-channel', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('storify_access_token')}`
                                  },
                                  body: JSON.stringify({ channelId: formData.telegramChannelId })
                                })
                                const data = await res.json()
                                if (data.success) toast.success(t('channelValidated'))
                                else toast.error(data.message || t('invalidChannelId'))
                              }}
                            >
                              {t('testChannel')}
                            </Button>
                          </div>
                          <Input
                            value={formData.telegramChannelId}
                            onChange={(e) => setFormData({ ...formData, telegramChannelId: e.target.value })}
                            placeholder="@YourChannel or -100123456789"
                            className="h-14 rounded-2xl bg-background/50 border-primary/20 font-mono"
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/10 border border-primary/20">
                          <div className="space-y-1">
                            <Label className="text-xs font-black uppercase tracking-tight">{t('autoPostProducts')}</Label>
                            <p className="text-[9px] opacity-60 uppercase font-black">{t('autoPostDesc')}</p>
                          </div>
                          <Switch
                            checked={formData.telegramAutoPost}
                            onCheckedChange={(val) => setFormData({ ...formData, telegramAutoPost: val })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-10 rounded-[3.5rem] bg-muted/5 border border-white/5 space-y-8 opacity-60">
                      <div className="flex items-center gap-4">
                         <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                            <User className="h-6 w-6" />
                         </div>
                         <div>
                            <p className="font-black uppercase tracking-tight">{t('legacyConnection' as any) || 'Legacy Connection (Simple Link)'}</p>
                         </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            className={cn("h-16 rounded-2xl border-2 flex flex-col items-center justify-center gap-1", telegramUserId ? "border-success/20 bg-success/5" : "border-white/5")}
                            onClick={() => handleConnect('user')}
                            disabled={isConnecting}
                        >
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span className="font-black uppercase text-[10px] tracking-widest">{t('privateBot')}</span>
                            </div>
                        </Button>
                        <Button
                            variant="outline"
                            className={cn("h-16 rounded-2xl border-2 flex flex-col items-center justify-center gap-1", telegramGroupId ? "border-success/20 bg-success/5" : "border-white/5")}
                            onClick={() => handleConnect('group')}
                            disabled={isConnecting}
                        >
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              <span className="font-black uppercase text-[10px] tracking-widest">{t('groupBot')}</span>
                            </div>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="p-10 sm:p-14 pt-6 flex flex-col-reverse sm:flex-row justify-between gap-6 border-t border-white/5 bg-white/5">
        <Button
          variant="ghost"
          disabled={step === 1}
          onClick={() => setStep(step === 1 ? 1 : step - 1)}
          className="w-full sm:w-auto rounded-2xl h-14 px-10 font-black uppercase text-xs tracking-[0.3em] bg-white/5 hover:bg-white/10 transition-all border border-white/5"
        >
          {t('back')}
        </Button>

        {step < 3 ? (
          <Button
            onClick={() => setStep(step >= 3 ? 3 : step + 1)}
            className="w-full sm:w-auto rounded-2xl h-14 px-14 font-black uppercase text-xs tracking-[0.3em] bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 transform hover:scale-105 active:scale-95 transition-all"
          >
            {t('continue')}
          </Button>
        ) : (
          <Button
            onClick={isEdit ? handleUpdate : handleAdd}
            className={cn(
              "w-full sm:w-auto rounded-2xl h-14 px-14 font-black uppercase text-xs tracking-[0.3em] shadow-2xl transition-all transform hover:scale-105 active:scale-95 gap-3",
              isEdit ? "bg-accent hover:bg-accent/90 shadow-accent/40" : "bg-success hover:bg-success/90 shadow-success/40"
            )}
          >
            <Save className="h-5 w-5" />
            {isEdit ? t('save') : t('add')}
          </Button>
        )}
      </div>
    </div>
  )
}
