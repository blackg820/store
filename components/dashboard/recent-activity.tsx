'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useData } from '@/lib/data-context'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/hooks/use-translations'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ShoppingCart, Package, Store, AlertTriangle } from 'lucide-react'
import type { OrderStatus } from '@/lib/types'

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  confirmed: 'bg-primary/10 text-primary border-primary/20',
  delivered: 'bg-success/10 text-success border-success/20',
  returned: 'bg-muted text-muted-foreground border-muted',
  problematic: 'bg-destructive/10 text-destructive border-destructive/20',
}

export function RecentActivity() {
  const { language, user } = useAuth()
  const { t } = useTranslations()
  const { orders, products, stores, buyers, getStoresByUserId } = useData()

  // Get relevant orders based on user role
  const userStores = user?.role === 'admin' 
    ? stores 
    : getStoresByUserId(user?.id || '')
  
  const storeIds = userStores.map(s => s.id)
  
  const recentOrders = orders
    .filter(o => user?.role === 'admin' || storeIds.includes(o.storeId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  return (
    <Card className="glass-card border-white/10 shadow-xl overflow-hidden">
      <CardHeader className="border-b border-white/5 bg-white/5">
        <CardTitle className="text-lg font-bold tracking-tight">{t('recentOrders')}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('noData')}</p>
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
                    'flex items-start gap-3 p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all duration-300 group',
                    isHighRisk && 'border-destructive/30 bg-destructive/10'
                  )}
                >
                  <div className={cn(
                    'p-2 rounded-lg shrink-0',
                    statusColors[order.status].split(' ')[0]
                  )}>
                    <ShoppingCart className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm truncate">
                          {language === 'ar' ? product?.titleAr : product?.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {language === 'ar' ? store?.nameAr : store?.name}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn('capitalize shrink-0 text-xs', statusColors[order.status])}>
                        {t(order.status as 'pending' | 'confirmed' | 'delivered' | 'returned' | 'problematic')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {isHighRisk && <AlertTriangle className="h-3 w-3 text-destructive" />}
                        <span>{buyer?.name}</span>
                        <span>-</span>
                        <span className="font-medium text-foreground">${(order.totalAmount || 0).toFixed(2)}</span>
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
      </CardContent>
    </Card>
  )
}

export function TopStores() {
  const { language } = useAuth()
  const { t } = useTranslations()
  const { stores, orders, products } = useData()

  // Calculate store stats
  const storeStats = stores.map(store => {
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
    <Card className="glass-card border-white/10 shadow-xl overflow-hidden">
      <CardHeader className="border-b border-white/5 bg-white/5">
        <CardTitle className="text-lg font-bold tracking-tight">{t('topStores')}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {storeStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('noData')}</p>
          ) : (
            storeStats.map((store, index) => (
              <div
                key={store.id}
                className="flex items-center gap-3 p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all duration-300"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                  #{index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {language === 'ar' ? store.nameAr : store.name}
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
                  <p className="font-bold text-success">${store.revenue.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
