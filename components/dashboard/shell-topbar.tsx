'use client'

import { useAuth } from '@/lib/auth-context'
import { useData } from '@/lib/data-context'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Bell,
  Menu,
  Search,
  Globe,
  Command,
  ShoppingCart,
  AlertTriangle,
  Loader2,
  RefreshCcw,
} from 'lucide-react'
import { useTranslations } from '@/hooks/use-translations'
import { useDashboard } from '@/lib/dashboard-context'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { MainStoreSelector } from './main-store-selector'

type DashboardSearchResult = {
  id: string
  label: string
  detail: string
  href: string
  type: 'product' | 'category' | 'order' | 'store'
}

export function ShellTopbar() {
  const { user, language, setLanguage, logout } = useAuth()
  const { t } = useTranslations()
  const { setIsMobileMenuOpen } = useDashboard()
  const { stores, selectedStoreId, selectedStore, products, orders, categories, isDataLoading, dataError, refetchAll } = useData()
  const router = useRouter()
  const pathname = usePathname()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchBoxRef = useRef<HTMLDivElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!searchBoxRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const storeById = useMemo(() => new Map(stores.map(store => [store.id, store])), [stores])
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  const isRTL = language === 'ar' || language === 'ku'
  const isEmployee = user?.role === 'employee'
  const sectionLabel = pathname
    .replace('/dashboard', '')
    .split('/')
    .filter(Boolean)[0]
    ?.replace(/-/g, ' ') || t('dashboard')

  const filteredOrders = selectedStoreId
    ? orders.filter(o => o.storeId === selectedStoreId)
    : orders
  const pendingOrders = isEmployee ? [] : filteredOrders.filter(o => o.status === 'pending')

  const searchResults = useMemo<DashboardSearchResult[]>(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return []

    const inSelectedStore = (storeId?: string | null) => !selectedStoreId || storeId === selectedStoreId

    const productResults = products
      .filter((product) => inSelectedStore(product.storeId))
      .filter((product) => {
        const searchable = [
          product.title,
          product.sku,
          storeById.get(product.storeId)?.name,
        ].filter(Boolean).join(' ').toLowerCase()

        return searchable.includes(query)
      })
      .slice(0, 5)
      .map((product): DashboardSearchResult => ({
        id: `product-${product.id}`,
        label: product.title || product.sku || 'Product',
        detail: storeById.get(product.storeId)?.name || 'Product',
        href: '/dashboard/products',
        type: 'product',
      }))

    const categoryResults = categories
      .filter((category) => inSelectedStore(category.storeId))
      .filter((category) => category.name.toLowerCase().includes(query))
      .slice(0, 4)
      .map((category): DashboardSearchResult => ({
        id: `category-${category.id}`,
        label: category.name,
        detail: 'Category',
        href: '/dashboard/product-types',
        type: 'category',
      }))

    const orderResults = isEmployee ? [] : filteredOrders
      .filter((order) => {
        const searchable = [order.id, order.buyerId, order.status].filter(Boolean).join(' ').toLowerCase()
        return searchable.includes(query)
      })
      .slice(0, 4)
      .map((order): DashboardSearchResult => ({
        id: `order-${order.id}`,
        label: `Order ${order.id.slice(0, 8)}`,
        detail: order.status,
        href: '/dashboard/orders',
        type: 'order',
      }))

    const storeResults = isEmployee ? [] : stores
      .filter((store) => [store.name, store.slug].filter(Boolean).join(' ').toLowerCase().includes(query))
      .slice(0, 3)
      .map((store): DashboardSearchResult => ({
        id: `store-${store.id}`,
        label: store.name || store.slug,
        detail: 'Store',
        href: '/dashboard/stores',
        type: 'store',
      }))

    return [...productResults, ...categoryResults, ...orderResults, ...storeResults].slice(0, 8)
  }, [categories, filteredOrders, isEmployee, products, searchQuery, selectedStoreId, storeById, stores])

  const openSearchResult = (result: DashboardSearchResult) => {
    setSearchQuery('')
    setIsSearchOpen(false)
    router.push(result.href)
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 md:h-[4.5rem] md:px-8 xl:px-10">
        <div className="flex min-w-0 items-center gap-4 md:gap-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-xl h-11 w-11"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>

          <div className="hidden min-w-0 md:block">
            <p className="truncate text-sm font-semibold capitalize text-foreground">{sectionLabel}</p>
            <p className="truncate text-xs text-muted-foreground">
              {selectedStore ? selectedStore.name || selectedStore.slug : t('allStores')}
            </p>
          </div>

          <div className="hidden lg:flex items-center flex-1 w-[28rem]">
            <div ref={searchBoxRef} className="relative w-full group">
              <Search className="absolute start-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <div className="absolute end-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted/50 text-[10px] font-black text-muted-foreground">
                <Command className="h-2.5 w-2.5" />
                <span>K</span>
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder={t('searchAnything')}
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                  setIsSearchOpen(true)
                }}
                onFocus={() => setIsSearchOpen(true)}
                className="w-full h-11 ps-12 pe-14 bg-muted/20 border-transparent hover:bg-muted/40 focus:bg-background focus:border-primary/20 rounded-xl text-sm font-medium transition-all outline-none ring-primary/10 focus:ring-4"
              />
              {isSearchOpen && searchQuery.trim() && (
                <div className="absolute top-full mt-2 w-full overflow-hidden rounded-2xl border border-border bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-5 text-sm font-semibold text-muted-foreground">
                      No dashboard results found
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto p-2">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => openSearchResult(result)}
                          className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-start transition-colors hover:bg-primary/5 focus:bg-primary/5 focus:outline-none"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-foreground">{result.label}</span>
                            <span className="block truncate text-xs font-medium text-muted-foreground">{result.detail}</span>
                          </span>
                          <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {result.type}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-6 w-[1px] bg-border mx-2 hidden sm:block" />
            <MainStoreSelector />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground xl:flex">
            {dataError ? (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                <button type="button" onClick={refetchAll} className="text-destructive hover:underline">
                  Retry data
                </button>
              </>
            ) : isDataLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                Syncing
              </>
            ) : (
              <>
                <RefreshCcw className="h-3.5 w-3.5 text-success" />
                Live
              </>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl hover:bg-primary/5 transition-all">
                <Globe className="h-5 w-5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className={cn('w-44 p-2 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200', isRTL ? 'text-right' : 'text-left')}
              align={isRTL ? 'start' : 'end'}
            >
              <DropdownMenuItem
                onClick={() => setLanguage('ar')}
                className={cn("rounded-xl cursor-pointer px-4 py-3 font-bold", language === 'ar' && "bg-primary/5 text-primary")}
              >
                العربية
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLanguage('ku')}
                className={cn("rounded-xl cursor-pointer px-4 py-3 font-bold", language === 'ku' && "bg-primary/5 text-primary")}
              >
                کوردی
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLanguage('en')}
                className={cn("rounded-xl cursor-pointer px-4 py-3 font-bold", language === 'en' && "bg-primary/5 text-primary")}
              >
                English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-11 w-11 rounded-xl hover:bg-primary/5 transition-all">
                <Bell className="h-5 w-5 opacity-60" />
                {pendingOrders.length > 0 && (
                  <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)] animate-pulse" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className={cn('w-96 p-0 overflow-hidden rounded-[2rem] shadow-2xl border-border animate-in fade-in zoom-in-95 duration-200', isRTL ? 'text-right' : 'text-left')}
              align={isRTL ? 'start' : 'end'}
            >
              <DropdownMenuLabel className="p-6 bg-muted/20 font-black uppercase tracking-widest text-[10px] border-b border-border/50 text-muted-foreground/60">
                {t('notifications')}
              </DropdownMenuLabel>
              <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
                {pendingOrders.length === 0 ? (
                  <div className="p-12 text-center space-y-4">
                    <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto">
                      <Bell className="h-8 w-8 opacity-20" />
                    </div>
                    <p className="text-sm font-bold text-muted-foreground/50">{t('noNewNotifications')}</p>
                  </div>
                ) : (
                  pendingOrders.slice(0, 5).map((order) => {
                    const firstItem = order.items?.[0]
                    const product = products.find(p => p.id === firstItem?.productId)
                    const productTitle = product?.title
                    const store = stores.find(s => s.id === order.storeId)
                    const storeName = store?.name

                    return (
                      <DropdownMenuItem
                        key={order.id}
                        className="p-5 border-b border-border/30 last:border-0 cursor-pointer focus:bg-primary/5 transition-all"
                        onClick={() => router.push('/dashboard/orders')}
                      >
                        <div className="flex gap-4 w-full">
                          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                            <ShoppingCart className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1 space-y-1.5 overflow-hidden">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{storeName}</span>
                              <span className="font-bold text-sm leading-tight text-foreground">{t('newOrder')}: {productTitle || t('product')}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-muted-foreground">
                                {t('from')}: {order.buyerId?.slice(0, 8)}...
                              </p>
                              <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground/40">
                                {formatDistanceToNow(new Date(order.createdAt), {
                                  addSuffix: true,
                                  locale: language === 'ar' ? ar : enUS
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    )
                  })
                )}
              </div>
              {pendingOrders.length > 0 && (
                <Link href="/dashboard/orders" className="block p-4 text-center text-xs font-black uppercase tracking-widest text-primary bg-primary/5 hover:bg-primary/10 transition-all border-t border-border/50">
                  {t('viewAllOrders')}
                </Link>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-11 px-1 rounded-xl flex items-center gap-3 hover:bg-primary/5 transition-all group">
                <div className="h-9 w-9 rounded-lg overflow-hidden border-2 border-border/50 group-hover:border-primary/50 transition-all">
                  <Avatar className="h-full w-full">
                    <AvatarFallback className="bg-primary/10 text-primary font-black text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="hidden sm:flex flex-col items-start leading-none gap-1">
                  <span className="text-sm font-bold tracking-tight">{user?.name}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{user?.role}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200">
              <DropdownMenuLabel className="font-normal p-4">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold tracking-tight">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/50 my-1" />
              {!isEmployee && (
                <>
                  <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} className="rounded-xl px-4 py-3 font-bold text-sm">
                    {t('accountSettings')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/50 my-1" />
                </>
              )}
              <DropdownMenuItem onClick={logout} className="rounded-xl px-4 py-3 font-bold text-sm text-destructive hover:bg-destructive/10">
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
