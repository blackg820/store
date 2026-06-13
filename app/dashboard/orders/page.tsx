'use client'

import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/hooks/use-translations'
import { useData } from '@/lib/data-context'
import { OrdersTable } from '@/components/dashboard/orders-table'
import { cn } from '@/lib/utils'
import { AccessRestricted } from '@/components/dashboard/access-restricted'
import { DashboardPageHeader } from '@/components/dashboard/page-header'

export default function OrdersPage() {
  const { user } = useAuth()
  const { t } = useTranslations()
  const { orders, getStoresByUserId, selectedStoreId } = useData()

  const isAdmin = user?.role === 'admin'

  if (user?.role === 'employee') {
    return (
      <AccessRestricted description="Employees can review assigned activity on the dashboard, but order management is restricted to store owners and platform admins." />
    )
  }

  // Get relevant orders
  const userStores = isAdmin ? [] : getStoresByUserId(user?.id || '')
  const storeIds = userStores.map(s => s.id)
  let relevantOrders = isAdmin
    ? orders
    : orders.filter(o => storeIds.includes(o.storeId))

  if (selectedStoreId) {
    relevantOrders = relevantOrders.filter(o => o.storeId === selectedStoreId)
  }

  // Calculate stats
  const stats = {
    pending: relevantOrders.filter(o => o.status === 'pending').length,
    confirmed: relevantOrders.filter(o => o.status === 'confirmed').length,
    delivered: relevantOrders.filter(o => o.status === 'delivered').length,
    returned: relevantOrders.filter(o => o.status === 'returned').length,
    problematic: relevantOrders.filter(o => o.status === 'problematic').length,
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 pb-20">
      <DashboardPageHeader
        eyebrow={isAdmin ? 'Platform fulfillment' : 'Store fulfillment'}
        title={t('orders')}
        description="Track fulfillment, handle returns, monitor delivery issues, and keep Al-Waseet handoffs visible across selected stores."
      />

      {/* Status Summary Section */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 animate-in fade-in slide-in-from-top-4 duration-700">
        {[
          { key: 'pending', count: stats.pending, color: 'warning' },
          { key: 'confirmed', count: stats.confirmed, color: 'primary' },
          { key: 'delivered', count: stats.delivered, color: 'success' },
          { key: 'returned', count: stats.returned, color: 'muted' },
          { key: 'problematic', count: stats.problematic, color: 'danger' },
        ].map((stat) => (
          <div key={stat.key} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/20">
            <span className="text-xs font-semibold text-muted-foreground">{t(stat.key as any)}</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold tracking-tight tabular-nums">{stat.count}</span>
              <div className={cn(
                "h-2.5 w-2.5 rounded-full",
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
