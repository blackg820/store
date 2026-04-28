'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { useData } from '@/lib/data-context'
import { useTranslations } from '@/hooks/use-translations'
import { ShoppingCart, Store, DollarSign, Users, TrendingUp, TrendingDown, Package, AlertTriangle, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ElementType
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

function StatCard({ title, value, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'from-primary/20 to-primary/5 text-primary border-primary/20',
    success: 'from-success/20 to-success/5 text-success border-success/20',
    warning: 'from-warning/20 to-warning/5 text-warning border-warning/20',
    danger: 'from-destructive/20 to-destructive/5 text-destructive border-destructive/20',
    info: 'from-primary/20 to-accent/5 text-accent border-accent/20',
  }

  return (
    <Card className={cn(
      "relative overflow-hidden group transition-all duration-500 glass-card border-white/10 hover:border-white/30 hover:scale-[1.03] hover:shadow-2xl",
    )}>
      <div className={cn(
        "absolute -right-4 -top-4 h-24 w-24 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40 bg-gradient-to-br",
        variantStyles[variant]
      )} />
      
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
        <div className={cn('p-2.5 rounded-2xl transition-all duration-500 group-hover:rotate-12 group-hover:shadow-lg', variantStyles[variant], "bg-white/5")}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black tracking-tight mb-1">{value}</div>
        {trend && (
          <div className={cn(
            'text-xs font-bold flex items-center gap-1.5 px-2 py-1 rounded-full w-fit',
            trend.isPositive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
          )}>
            {trend.isPositive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            <span>{trend.value}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function AdminStatsCards() {
  const { t, language } = useTranslations()
  const { orders, stores, buyers, products, isDataLoading } = useData()
  
  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0)

  const totalProfit = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => {
      const orderCost = (o.items || []).reduce((itemSum, item) => {
        const product = products.find(p => p.id === item.productId)
        return itemSum + ((product?.costPrice || 0) * item.quantity)
      }, 0)
      return sum + ((o.totalAmount || 0) - orderCost)
    }, 0)
  
  const activeStores = (stores || []).filter(s => s.isActive).length
  const highRiskBuyers = (buyers || []).filter(b => b.risk === 'high').length
  const currency = language === 'en' ? 'IQD' : 'د.ع'

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title={t('totalOrders')}
        value={isDataLoading ? '...' : orders.length}
        icon={ShoppingCart}
        variant="default"
      />
      <StatCard
        title={t('totalRevenue')}
        value={isDataLoading ? '...' : `${totalRevenue.toLocaleString()} ${currency}`}
        icon={DollarSign}
        variant="success"
      />
      <StatCard
        title={t('totalProfit' as any) || 'Total Profit'}
        value={isDataLoading ? '...' : `${totalProfit.toLocaleString()} ${currency}`}
        icon={Briefcase}
        variant="info"
      />
      <StatCard
        title="High Risk Buyers"
        value={isDataLoading ? '...' : highRiskBuyers}
        icon={AlertTriangle}
        variant={highRiskBuyers > 0 ? 'warning' : 'default'}
      />
    </div>
  )
}

export function StoreOwnerStatsCards({ userId }: { userId: string }) {
  const { t, language } = useTranslations()
  const { getStoresByUserId, orders, products, isDataLoading } = useData()
  
  const userStores = getStoresByUserId(userId)
  const storeIds = userStores.map(s => s.id)
  
  const userOrders = orders.filter(o => storeIds.includes(o.storeId))
  const userProducts = products.filter(p => storeIds.includes(p.storeId))
  
  const totalRevenue = userOrders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0)

  const totalProfit = userOrders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => {
      const orderCost = (o.items || []).reduce((itemSum, item) => {
        const product = products.find(p => p.id === item.productId)
        return itemSum + ((product?.costPrice || 0) * item.quantity)
      }, 0)
      return sum + ((o.totalAmount || 0) - orderCost)
    }, 0)
  
  const currency = language === 'en' ? 'IQD' : 'د.ع'

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title={t('totalOrders')}
        value={isDataLoading ? '...' : userOrders.length}
        icon={ShoppingCart}
        variant="default"
      />
      <StatCard
        title={t('totalRevenue')}
        value={isDataLoading ? '...' : `${totalRevenue.toLocaleString()} ${currency}`}
        icon={DollarSign}
        variant="success"
      />
      <StatCard
        title={t('totalProfit' as any) || 'Total Profit'}
        value={isDataLoading ? '...' : `${totalProfit.toLocaleString()} ${currency}`}
        icon={Briefcase}
        variant="info"
      />
      <StatCard
        title={t('products')}
        value={isDataLoading ? '...' : userProducts.length}
        icon={Package}
      />
    </div>
  )
}
