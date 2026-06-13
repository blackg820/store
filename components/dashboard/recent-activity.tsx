'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useData } from '@/lib/data-context'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/hooks/use-translations'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ShoppingCart, Package, AlertTriangle, Store as StoreIcon } from 'lucide-react'
import type { OrderStatus } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  confirmed: 'bg-primary/10 text-primary border-primary/20',
  delivered: 'bg-success/10 text-success border-success/20',
  returned: 'bg-muted text-muted-foreground border-muted',
  problematic: 'bg-destructive/10 text-destructive border-destructive/20',
}

interface RecentActivityProps {
  compact?: boolean
}

export function RecentActivity({ compact = false }: RecentActivityProps) {
  const { user } = useAuth()
  const { t } = useTranslations()
  const { orders, products, stores, buyers, getStoresByUserId, selectedStoreId, isDataLoading } = useData()

  // Get relevant orders based on user role
  const userStores = user?.role === 'admin'
    ? stores
    : getStoresByUserId(user?.id || '')

  const storeIds = userStores.map(s => s.id)

  const recentOrders = orders
    .filter(o => {
      const isRelevant = user?.role === 'admin' || storeIds.includes(o.storeId)
      const matchesStore = selectedStoreId ? o.storeId === selectedStoreId : true
      return isRelevant && matchesStore
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const content = (
    <div className="space-y-3">
      {isDataLoading ? (
        Array.from({ length: compact ? 3 : 5 }).map((_, index) => (
          <div key={index} className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))
      ) : recentOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-background text-muted-foreground">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-foreground">{t('noData')}</p>
          <p className="mt-1 text-xs text-muted-foreground">New activity will appear here when orders start moving.</p>
        </div>
      ) : (
        recentOrders.map((order) => {
          const productId = order.items[0]?.productId
          const product = (products || []).find(p => p.id === productId)
          const store = (stores || []).find(s => s.id === order.storeId)
          const buyer = (buyers || []).find(b => b.id === order.buyerId)
          const isHighRisk = buyer?.risk === 'high'

          return (
            <div
              key={order.id}
              className={cn(
                'flex items-start gap-3 rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/20 hover:bg-muted/30',
                isHighRisk && 'border-destructive/30 bg-destructive/5'
              )}
            >
              <div className={cn(
                'p-2 rounded-lg shrink-0',
                statusColors[order.status]?.split(' ')[0] || 'bg-muted'
              )}>
                <ShoppingCart className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {product?.title || t('product')}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {store?.name || t('store')}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn('shrink-0 text-xs capitalize', statusColors[order.status])}>
                    {t(order.status)}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                    {isHighRisk && <AlertTriangle className="h-3 w-3 shrink-0 text-destructive" />}
                    <span className="truncate">{buyer?.name || order.buyerId}</span>
                    <span className="font-medium text-foreground tabular-nums">
                      {order.totalAmount?.toLocaleString('en-US')} {t('currency')}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )

  if (compact) {
    return <div className="p-4">{content}</div>
  }

  return (
    <Card className="overflow-hidden border-border bg-card shadow-sm">
      <CardHeader className="border-b border-border bg-muted/20">
        <CardTitle className="text-lg font-bold tracking-tight">{t('recentOrders')}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {content}
      </CardContent>
    </Card>
  )
}

export function TopStores() {
  const { t } = useTranslations()
  const { stores, orders, products, selectedStoreId } = useData()

  // Calculate store stats
  const filteredStores = selectedStoreId
    ? stores.filter(s => s.id === selectedStoreId)
    : stores

  const storeStats = filteredStores.map(store => {
    const storeOrders = orders.filter(o => o.storeId === store.id)
    const deliveredOrders = storeOrders.filter(o => o.status === 'delivered')
    const revenue = deliveredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    const productCount = products.filter(p => p.storeId === store.id).length

    return {
      ...store,
      orderCount: storeOrders.length,
      revenue,
      productCount,
    }
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  return (
    <Card className="overflow-hidden border-border bg-card shadow-sm">
      <CardHeader className="border-b border-border bg-muted/20">
        <CardTitle className="text-lg font-bold tracking-tight">{t('topStores')}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {storeStats.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-background text-muted-foreground">
                <StoreIcon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">{t('noData')}</p>
              <p className="mt-1 text-xs text-muted-foreground">Stores will rank here after delivered orders generate revenue.</p>
            </div>
          ) : (
            storeStats.map((store, index) => (
              <div
                key={store.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/20 hover:bg-muted/30"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-semibold text-primary">
                  #{index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {store.name}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {store.productCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <ShoppingCart className="h-3 w-3" />
                      {store.orderCount}
                    </span>
                  </div>
                </div>
                <div className="text-end">
                  <p className="font-bold text-success">{store.revenue.toLocaleString('en-US')} {t('currency')}</p>
                  <p className="text-xs text-muted-foreground">{t('totalRevenue')}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
