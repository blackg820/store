'use client'

import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/hooks/use-translations'
import { useData } from '@/lib/data-context'
import { DashboardHeader } from '@/components/dashboard/header'
import { OrdersTable } from '@/components/dashboard/orders-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function OrdersPage() {
  const { user } = useAuth()
  const { t } = useTranslations()
  const { orders, getStoresByUserId } = useData()
  
  const isAdmin = user?.role === 'admin'
  
  // Get relevant orders
  const userStores = isAdmin ? [] : getStoresByUserId(user?.id || '')
  const storeIds = userStores.map(s => s.id)
  const relevantOrders = isAdmin 
    ? orders 
    : orders.filter(o => storeIds.includes(o.storeId))

  // Calculate stats
  const stats = {
    pending: relevantOrders.filter(o => o.status === 'pending').length,
    confirmed: relevantOrders.filter(o => o.status === 'confirmed').length,
    delivered: relevantOrders.filter(o => o.status === 'delivered').length,
    returned: relevantOrders.filter(o => o.status === 'returned').length,
    problematic: relevantOrders.filter(o => o.status === 'problematic').length,
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black tracking-tight text-foreground">
          {t('orders')}
        </h2>
        <p className="text-muted-foreground text-sm font-medium">
          Track fulfillment, handle returns, and monitor high-risk deliveries.
        </p>
      </div>

      {/* Status Summary Section */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 animate-in fade-in slide-in-from-top-4 duration-500">
        {[
          { key: 'pending', count: stats.pending, color: 'warning' },
          { key: 'confirmed', count: stats.confirmed, color: 'primary' },
          { key: 'delivered', count: stats.delivered, color: 'success' },
          { key: 'returned', count: stats.returned, color: 'muted' },
          { key: 'problematic', count: stats.problematic, color: 'danger' },
        ].map((stat) => (
          <div key={stat.key} className="glass-card border-white/5 p-4 rounded-2xl flex flex-col gap-2 group hover:scale-105 transition-all duration-300">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">{t(stat.key as any)}</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black tracking-tighter">{stat.count}</span>
              <div className={cn(
                "h-2 w-2 rounded-full",
                stat.color === 'warning' && "bg-warning",
                stat.color === 'primary' && "bg-primary",
                stat.color === 'success' && "bg-success",
                stat.color === 'muted' && "bg-muted-foreground",
                stat.color === 'danger' && "bg-destructive",
              )} />
            </div>
          </div>
        ))}
      </div>

      {/* Orders Table */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <OrdersTable />
      </div>
    </div>
  )
}
