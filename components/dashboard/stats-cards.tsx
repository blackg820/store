'use client'

import { Card, CardContent } from '@/components/ui/card'
import { useData } from '@/lib/data-context'
import { useTranslations } from '@/hooks/use-translations'
import { ShoppingCart, Store, DollarSign, Package, AlertTriangle, Briefcase, CheckCircle2, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

import { Skeleton } from '@/components/ui/skeleton'

interface StatCardProps {
  title: string
  value: string | number | React.ReactNode
  icon: React.ElementType
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

function StatCard({ title, value, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  const variantStyles: Record<NonNullable<StatCardProps['variant']>, string> = {
    default: 'text-primary bg-primary/10 border-primary/20',
    success: 'text-success bg-success/10 border-success/20',
    warning: 'text-warning bg-warning/10 border-warning/20',
    danger: 'text-destructive bg-destructive/10 border-destructive/20',
    info: 'text-accent bg-accent/10 border-accent/20',
  }

  return (
    <Card className={cn(
      "group overflow-hidden border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md",
    )}>
      <CardContent className="p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg border transition-colors duration-200',
            variantStyles[variant]
          )}>
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <div className={cn(
              'flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide',
              trend.isPositive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
            )}>
              {trend.isPositive ? '+' : '-'}{trend.value}%
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">
            {title}
          </p>
          <div className="text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
            {value}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminStatsCards() {
  const { t } = useTranslations()
  const { orders: allOrders, stores, buyers: allBuyers, products, isDataLoading, selectedStoreId } = useData()

  const orders = selectedStoreId
    ? allOrders.filter(o => o.storeId === selectedStoreId)
    : allOrders

  const buyers = selectedStoreId
    ? allBuyers.filter(b => allOrders.some(o => o.buyerId === b.id && o.storeId === selectedStoreId))
    : allBuyers

  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0)

  const productCostById = new Map(products.map(product => [product.id, product.costPrice || 0]))
  const totalProfit = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => {
      const orderCost = (o.items || []).reduce((itemSum, item) => {
        return itemSum + ((productCostById.get(item.productId) || 0) * item.quantity)
      }, 0)
      return sum + ((o.totalAmount || 0) - orderCost)
    }, 0)

  const highRiskBuyers = (buyers || []).filter(b => b.risk === 'high').length

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title={t('totalOrders')}
        value={isDataLoading ? <Skeleton className="h-9 w-16" /> : orders.length}
        icon={ShoppingCart}
        variant="default"
      />
      <StatCard
        title={t('totalRevenue')}
        value={isDataLoading ? <Skeleton className="h-9 w-32" /> : `${totalRevenue.toLocaleString('en-US')} ${t('currency')}`}
        icon={DollarSign}
        variant="success"
      />
      <StatCard
        title={t('totalProfit')}
        value={isDataLoading ? <Skeleton className="h-9 w-32" /> : `${totalProfit.toLocaleString('en-US')} ${t('currency')}`}
        icon={Briefcase}
        variant="info"
      />
      <StatCard
        title={t('highRiskBuyers')}
        value={isDataLoading ? <Skeleton className="h-9 w-16" /> : highRiskBuyers}
        icon={AlertTriangle}
        variant={highRiskBuyers > 0 ? 'warning' : 'default'}
      />
    </div>
  )
}

export function StoreOwnerStatsCards({ userId }: { userId: string }) {
  const { t } = useTranslations()
  const { getStoresByUserId, orders: allOrders, products: allProducts, isDataLoading, selectedStoreId } = useData()

  const userStores = getStoresByUserId(userId)
  const storeIds = userStores.map(s => s.id)

  let orders = allOrders.filter(o => storeIds.includes(o.storeId))
  let products = allProducts.filter(p => storeIds.includes(p.storeId))

  if (selectedStoreId) {
    orders = orders.filter(o => o.storeId === selectedStoreId)
    products = products.filter(p => p.storeId === selectedStoreId)
  }

  const userOrders = orders
  const userProducts = products

  const totalRevenue = userOrders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0)

  const productCostById = new Map(products.map(product => [product.id, product.costPrice || 0]))
  const totalProfit = userOrders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => {
      const orderCost = (o.items || []).reduce((itemSum, item) => {
        return itemSum + ((productCostById.get(item.productId) || 0) * item.quantity)
      }, 0)
      return sum + ((o.totalAmount || 0) - orderCost)
    }, 0)

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title={t('totalOrders')}
        value={isDataLoading ? <Skeleton className="h-9 w-16" /> : userOrders.length}
        icon={ShoppingCart}
        variant="default"
      />
      <StatCard
        title={t('totalRevenue')}
        value={isDataLoading ? <Skeleton className="h-9 w-32" /> : `${totalRevenue.toLocaleString('en-US')} ${t('currency')}`}
        icon={DollarSign}
        variant="success"
      />
      <StatCard
        title={t('totalProfit')}
        value={isDataLoading ? <Skeleton className="h-9 w-32" /> : `${totalProfit.toLocaleString('en-US')} ${t('currency')}`}
        icon={Briefcase}
        variant="info"
      />
      <StatCard
        title={t('products')}
        value={isDataLoading ? <Skeleton className="h-9 w-16" /> : userProducts.length}
        icon={Package}
      />
    </div>
  )
}

export function EmployeeStatsCards({ userId }: { userId: string }) {
  const { t } = useTranslations()
  const { getStoresByUserId, products: allProducts, productTypes, categories, isDataLoading, selectedStoreId } = useData()

  const userStores = getStoresByUserId(userId)
  const storeIds = userStores.map(s => s.id)

  let products = allProducts.filter(p => storeIds.includes(p.storeId))
  let scopedProductTypes = productTypes.filter(type => !type.storeId || storeIds.includes(type.storeId))
  let scopedCategories = categories.filter(category => !category.storeId || storeIds.includes(category.storeId))

  if (selectedStoreId) {
    products = products.filter(p => p.storeId === selectedStoreId)
    scopedProductTypes = scopedProductTypes.filter(type => !type.storeId || type.storeId === selectedStoreId)
    scopedCategories = scopedCategories.filter(category => !category.storeId || category.storeId === selectedStoreId)
  }

  const activeProducts = products.filter(product => product.isActive).length

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title={t('stores')}
        value={isDataLoading ? <Skeleton className="h-9 w-16" /> : userStores.length}
        icon={Store}
        variant="default"
      />
      <StatCard
        title={t('products')}
        value={isDataLoading ? <Skeleton className="h-9 w-16" /> : products.length}
        icon={Package}
        variant="info"
      />
      <StatCard
        title={t('productSections')}
        value={isDataLoading ? <Skeleton className="h-9 w-16" /> : scopedProductTypes.length + scopedCategories.length}
        icon={Layers}
        variant="default"
      />
      <StatCard
        title={t('active')}
        value={isDataLoading ? <Skeleton className="h-9 w-16" /> : activeProducts}
        icon={CheckCircle2}
        variant="success"
      />
    </div>
  )
}
