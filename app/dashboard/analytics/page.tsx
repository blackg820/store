'use client'

import { useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useData } from '@/lib/data-context'
import { DashboardHeader } from '@/components/dashboard/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { calculateStoreRanking } from '@/lib/order-utils'
import { DollarSign, TrendingUp, ShoppingBag, Trophy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const STATUS_COLORS: Record<string, string> = {
  pending: 'oklch(0.75 0.15 70)',
  confirmed: 'oklch(0.55 0.18 250)',
  delivered: 'oklch(0.65 0.15 165)',
  returned: 'oklch(0.55 0.22 25)',
  problematic: 'oklch(0.5 0.22 15)',
}

export default function AnalyticsPage() {
  const { user, language } = useAuth()
  const { orders, stores, products, buyers } = useData()

  const isAdmin = user?.role === 'admin'
  const visibleStores = useMemo(
    () => (isAdmin ? stores : stores.filter((s) => s.userId === user?.id)),
    [isAdmin, stores, user?.id]
  )
  const storeIds = visibleStores.map((s) => s.id)
  const visibleOrders = useMemo(
    () => orders.filter((o) => storeIds.includes(o.storeId)),
    [orders, storeIds]
  )

  // KPIs
  const kpis = useMemo(() => {
    const delivered = visibleOrders.filter((o) => o.status === 'delivered')
    const revenue = delivered.reduce((sum, o) => sum + o.totalPrice, 0)
    const rejected = visibleOrders.filter(
      (o) => o.status === 'returned' || o.status === 'problematic'
    ).length
    const rejectionRate =
      visibleOrders.length > 0
        ? ((rejected / visibleOrders.length) * 100).toFixed(1)
        : '0'
    const avgOrderValue =
      delivered.length > 0 ? (revenue / delivered.length).toFixed(2) : '0'

    return {
      revenue: revenue.toFixed(2),
      orders: visibleOrders.length,
      rejectionRate,
      avgOrderValue,
    }
  }, [visibleOrders])

  // Status distribution
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {}
    visibleOrders.forEach((o) => {
      counts[o.status] = (counts[o.status] ?? 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      fill: STATUS_COLORS[name] ?? 'oklch(0.5 0.02 250)',
    }))
  }, [visibleOrders])

  // Monthly revenue trend
  const revenueData = useMemo(() => {
    const months: Record<string, number> = {}
    visibleOrders
      .filter((o) => o.status === 'delivered')
      .forEach((o) => {
        const date = new Date(o.createdAt)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        months[key] = (months[key] ?? 0) + o.totalPrice
      })
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({
        month,
        revenue: Math.round(revenue * 100) / 100,
      }))
  }, [visibleOrders])

  // Store rankings
  const rankings = useMemo(() => {
    return visibleStores
      .map((store) => ({
        ...store,
        metrics: calculateStoreRanking(store.id, orders, products),
      }))
      .sort((a, b) => b.metrics.score - a.metrics.score)
      .slice(0, 10)
  }, [visibleStores, orders, products])

  // Top products
  const topProducts = useMemo(() => {
    const productCounts: Record<string, number> = {}
    visibleOrders.forEach((o) => {
      o.items.forEach((item) => {
        productCounts[item.productId] = (productCounts[item.productId] ?? 0) + item.quantity
      })
    })
    return Object.entries(productCounts)
      .map(([productId, count]) => {
        const product = products.find((p) => p.id === productId)
        return {
          name: language === 'ar' ? product?.titleAr ?? 'Unknown' : product?.title ?? 'Unknown',
          count,
        }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [visibleOrders, products, language])

  return (
    <div className="min-h-screen">
      <DashboardHeader title={language === 'ar' ? 'التحليلات' : 'Analytics'} />

      <div className="p-4 md:p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {language === 'ar' ? 'الإيرادات' : 'Revenue'}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${kpis.revenue}</div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'من الطلبات المسلمة' : 'From delivered orders'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {language === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}
              </CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.orders}</div>
              <p className="text-xs text-muted-foreground">
                {buyers.length} {language === 'ar' ? 'مشتري' : 'buyers'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {language === 'ar' ? 'متوسط قيمة الطلب' : 'Avg Order Value'}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${kpis.avgOrderValue}</div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'لكل طلب مسلم' : 'Per delivered order'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {language === 'ar' ? 'معدل الرفض' : 'Rejection Rate'}
              </CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.rejectionRate}%</div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'من جميع الطلبات' : 'Of all orders'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'الإيرادات الشهرية' : 'Monthly Revenue'}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'اتجاه الإيرادات عبر الوقت' : 'Revenue trend over time'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="oklch(0.55 0.18 250)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'توزيع الحالات' : 'Status Distribution'}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'حالات الطلبات الحالية' : 'Current order status breakdown'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'أفضل المنتجات' : 'Top Products'}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'الأكثر مبيعاً' : 'Best sellers by quantity'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Bar dataKey="count" fill="oklch(0.65 0.15 165)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {language === 'ar' ? 'تصنيف المتاجر' : 'Store Rankings'}
              </CardTitle>
              <CardDescription>
                {language === 'ar'
                  ? 'المتاجر حسب الأداء'
                  : 'Top stores by performance score'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rankings.map((store, idx) => (
                  <div
                    key={store.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {language === 'ar' ? store.nameAr : store.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {store.metrics.deliveredOrders}{' '}
                        {language === 'ar' ? 'مسلم' : 'delivered'} · $
                        {store.metrics.revenue.toFixed(0)}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {store.metrics.score}
                    </Badge>
                  </div>
                ))}
                {rankings.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
