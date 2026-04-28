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
    <div className="min-h-screen">
      <DashboardHeader title={t('orders')} />
      
      <div className="p-4 md:p-6 space-y-6">
        {/* Status Summary */}
        <div className="grid gap-4 sm:grid-cols-5">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('pending')}</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                {t('pending')}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('confirmed')}</p>
                <p className="text-2xl font-bold">{stats.confirmed}</p>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                {t('confirmed')}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('delivered')}</p>
                <p className="text-2xl font-bold">{stats.delivered}</p>
              </div>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                {t('delivered')}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('returned')}</p>
                <p className="text-2xl font-bold">{stats.returned}</p>
              </div>
              <Badge variant="secondary">
                {t('returned')}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('problematic')}</p>
                <p className="text-2xl font-bold">{stats.problematic}</p>
              </div>
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                {t('problematic')}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <OrdersTable />
      </div>
    </div>
  )
}
