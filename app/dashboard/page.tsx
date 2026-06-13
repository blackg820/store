'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CreditCard,
  Layers,
  Package,
  Plus,
  RefreshCcw,
  Settings,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useData } from '@/lib/data-context'
import { useTranslations } from '@/hooks/use-translations'
import { AdminStatsCards, EmployeeStatsCards, StoreOwnerStatsCards } from '@/components/dashboard/stats-cards'
import { RecentActivity, TopStores } from '@/components/dashboard/recent-activity'
import { OrdersTable } from '@/components/dashboard/orders-table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PremiumButton } from '@/components/ui/premium-button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type QuickAction = {
  label: string
  description: string
  href: string
  icon: React.ElementType
  tone: 'primary' | 'success' | 'warning' | 'info'
}

const toneClassNames: Record<QuickAction['tone'], string> = {
  primary: 'border-primary/15 bg-primary/5 text-primary hover:border-primary/30 hover:bg-primary/10',
  success: 'border-success/20 bg-success/5 text-success hover:border-success/30 hover:bg-success/10',
  warning: 'border-warning/25 bg-warning/5 text-warning hover:border-warning/35 hover:bg-warning/10',
  info: 'border-accent/20 bg-accent/5 text-accent hover:border-accent/30 hover:bg-accent/10',
}

const roleLabels: Record<string, string> = {
  admin: 'Platform admin',
  store_owner: 'Store owner',
  employee: 'Employee',
}

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { t } = useTranslations()
  const {
    stores,
    products,
    orders,
    productTypes,
    categories,
    selectedStoreId,
    isDataLoading,
    dataError,
    refetchAll,
    getStoresByUserId,
  } = useData()

  const isAdmin = user?.role === 'admin'
  const isEmployee = user?.role === 'employee'
  const visibleStores = user
    ? isAdmin
      ? stores
      : getStoresByUserId(user.id)
    : []
  const visibleStoreIds = new Set(visibleStores.map(store => store.id))
  const visibleProducts = products.filter(product => visibleStoreIds.has(product.storeId))
  const visibleOrders = isAdmin ? orders : orders.filter(order => visibleStoreIds.has(order.storeId))
  const scopedProducts = selectedStoreId
    ? visibleProducts.filter(product => product.storeId === selectedStoreId)
    : visibleProducts
  const scopedOrders = selectedStoreId
    ? visibleOrders.filter(order => order.storeId === selectedStoreId)
    : visibleOrders
  const scopedCategories = selectedStoreId
    ? categories.filter(category => !category.storeId || category.storeId === selectedStoreId)
    : categories
  const scopedProductTypes = selectedStoreId
    ? productTypes.filter(type => !type.storeId || type.storeId === selectedStoreId)
    : productTypes
  const pendingOrders = scopedOrders.filter(order => order.status === 'pending').length
  const activeProducts = scopedProducts.filter(product => product.isActive).length

  const quickActions = useMemo<QuickAction[]>(() => {
    if (isAdmin) {
      return [
        { label: t('users'), description: 'Manage tenants', href: '/dashboard/users', icon: Users, tone: 'primary' },
        { label: t('stores'), description: 'Review storefronts', href: '/dashboard/stores', icon: Store, tone: 'success' },
        { label: t('subscriptions'), description: 'Plan lifecycle', href: '/dashboard/subscriptions', icon: CreditCard, tone: 'warning' },
        { label: t('analytics'), description: 'Platform metrics', href: '/dashboard/analytics', icon: TrendingUp, tone: 'info' },
      ]
    }

    if (isEmployee) {
      return [
        { label: t('products'), description: 'Update catalog items', href: '/dashboard/products', icon: Package, tone: 'primary' },
        { label: t('productSections'), description: 'Maintain categories', href: '/dashboard/product-types', icon: Layers, tone: 'success' },
      ]
    }

    return [
      { label: t('products'), description: 'Create and edit', href: '/dashboard/products', icon: Package, tone: 'primary' },
      { label: t('orders'), description: 'Fulfillment queue', href: '/dashboard/orders', icon: ShoppingBag, tone: 'success' },
      { label: t('buyers'), description: 'Risk and history', href: '/dashboard/buyers', icon: Users, tone: 'warning' },
      { label: t('billing'), description: 'Usage and plan', href: '/dashboard/billing', icon: CreditCard, tone: 'info' },
    ]
  }, [isAdmin, isEmployee, t])

  const primaryCta = isAdmin
    ? { label: t('users'), href: '/dashboard/users' }
    : isEmployee
      ? { label: t('products'), href: '/dashboard/products' }
      : { label: t('newProduct') === 'newProduct' ? 'New product' : t('newProduct'), href: '/dashboard/products' }

  const focusItems = isEmployee
    ? [
        { label: 'Assigned stores', value: visibleStores.length, icon: Store, tone: 'primary' as const },
        { label: 'Active products', value: activeProducts, icon: CheckCircle2, tone: 'success' as const },
        { label: 'Catalog sections', value: scopedProductTypes.length + scopedCategories.length, icon: Layers, tone: 'info' as const },
      ]
    : [
        { label: 'Pending orders', value: pendingOrders, icon: Clock3, tone: pendingOrders > 0 ? 'warning' as const : 'primary' as const },
        { label: 'Active products', value: activeProducts, icon: CheckCircle2, tone: 'success' as const },
        { label: 'Managed stores', value: visibleStores.length, icon: Store, tone: 'info' as const },
      ]

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 pb-20">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_360px] md:p-8">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                {roleLabels[user?.role || ''] || 'Dashboard'}
              </span>
              {visibleStores.length > 0 && (
                <span className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  {visibleStores.length} {visibleStores.length === 1 ? 'store' : 'stores'}
                </span>
              )}
            </div>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {t('dashboard')}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                {user?.name ? `Welcome back, ${user.name}. ` : ''}
                {isAdmin
                  ? 'Monitor tenants, subscriptions, and platform health from one operational view.'
                  : isEmployee
                    ? 'Keep assigned catalog work accurate without access to owner-only operations.'
                    : 'Track storefront performance, fulfillment, buyers, and subscription usage.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {!isEmployee && (
                <PremiumButton variant="outline" size="sm" onClick={() => router.push('/dashboard/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  {t('settings')}
                </PremiumButton>
              )}
              <PremiumButton variant="default" size="sm" onClick={() => router.push(primaryCta.href)}>
                <Plus className="mr-2 h-4 w-4" />
                {primaryCta.label}
              </PremiumButton>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
            {focusItems.map((item) => (
              <div key={item.label} className={cn('rounded-xl border p-4', toneClassNames[item.tone])}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold opacity-80">{item.label}</span>
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="mt-3 text-2xl font-semibold tabular-nums">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {dataError && (
        <Alert variant="destructive" className="rounded-xl border-destructive/30 bg-destructive/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Dashboard data did not load</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{dataError}</span>
              <PremiumButton variant="outline" size="sm" onClick={refetchAll}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Retry
              </PremiumButton>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isDataLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl" />
            ))
          : quickActions.map((action) => (
              <button
                key={action.href}
                type="button"
                onClick={() => router.push(action.href)}
                className={cn(
                  'flex h-20 items-center gap-4 rounded-xl border px-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  toneClassNames[action.tone],
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/60">
                  <action.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{action.label}</span>
                  <span className="block truncate text-xs font-medium opacity-70">{action.description}</span>
                </span>
              </button>
            ))}
      </section>

      <section>
        {isAdmin ? (
          <AdminStatsCards />
        ) : isEmployee ? (
          <EmployeeStatsCards userId={user?.id || ''} />
        ) : (
          <StoreOwnerStatsCards userId={user?.id || ''} />
        )}
      </section>

      {!isAdmin && visibleStores.length === 0 && !isDataLoading && (
        <Alert className="rounded-xl border-warning/30 bg-warning/5">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertTitle>No stores available</AlertTitle>
          <AlertDescription>
            {isEmployee
              ? 'Your account does not have any owner stores available yet. Ask the store owner to verify your access.'
              : 'Create your first store before adding products or receiving orders.'}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                {isEmployee ? 'Catalog work' : t('recentOrders')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isEmployee ? 'Recent products and category coverage for assigned stores.' : 'Latest order activity across the selected scope.'}
              </p>
            </div>
            {!isEmployee && (
              <PremiumButton variant="ghost" size="sm" onClick={() => router.push('/dashboard/orders')}>
                {t('viewAllOrders')}
              </PremiumButton>
            )}
          </div>
          {isEmployee ? (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="divide-y divide-border">
                {scopedProducts.slice(0, 6).length === 0 ? (
                  <div className="p-8 text-center">
                    <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-semibold text-foreground">{t('noData')}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Products you create or update will appear here.</p>
                  </div>
                ) : (
                  scopedProducts.slice(0, 6).map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => router.push('/dashboard/products')}
                      className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-muted/30"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">{product.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{product.sku || 'No SKU'} · {product.isActive ? 'Active' : 'Inactive'}</span>
                      </span>
                      <span className="text-sm font-semibold tabular-nums">{product.price.toLocaleString('en-US')} {t('currency')}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <OrdersTable limit={5} showActions={false} />
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {isAdmin ? t('topPerformance') : isEmployee ? 'Catalog coverage' : t('liveActivity')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? 'Best performing stores by delivered revenue.'
                : isEmployee
                  ? 'Assigned scope and product organization.'
                  : 'Recent activity in the selected store scope.'}
            </p>
          </div>
          {isAdmin ? (
            <TopStores />
          ) : isEmployee ? (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="space-y-4">
                {visibleStores.slice(0, 4).map((store) => {
                  const storeProducts = products.filter(product => product.storeId === store.id)
                  const storeSections = productTypes.filter(type => type.storeId === store.id).length +
                    categories.filter(category => category.storeId === store.id).length

                  return (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => router.push('/dashboard/products')}
                      className="flex w-full items-center justify-between gap-4 rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-primary/20 hover:bg-muted/30"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{store.name || store.slug}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {storeProducts.length} products · {storeSections} sections
                        </span>
                      </span>
                      <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  )
                })}
                {visibleStores.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
                    <p className="text-sm font-semibold">{t('noData')}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Assigned stores will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <RecentActivity compact />
          )}
        </aside>
      </div>
    </div>
  )
}
