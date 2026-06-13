'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertCircle, Bell, DollarSign, Loader2, Package, ShoppingBag, TrendingUp, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { useData } from '@/lib/data-context'
import { AccessRestricted } from '@/components/dashboard/access-restricted'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

const STATUS_COLORS: Record<string, string> = {
  waiting: 'oklch(0.75 0.15 70)',
  confirmed: 'oklch(0.55 0.18 250)',
  delivered: 'oklch(0.65 0.15 165)',
  rejected: 'oklch(0.55 0.22 25)',
  problem: 'oklch(0.5 0.22 15)',
}

interface AnalyticsPayload {
  metrics?: Record<string, number | null>
  revenue?: Record<string, number>
  orders?: Record<string, number>
  products?: Record<string, number>
  customers?: Record<string, number>
  traffic?: {
    visits?: number
    uniqueVisitors?: number
    conversionRate?: number | null
    checkoutStarts?: number
    deviceBreakdown?: Record<string, number>
  }
  notifications?: Record<string, number>
  revenueChart?: Array<{ date: string; total: number }>
  topProducts?: Array<{ id: number; title: string; sold_count: number }>
  platform?: any
}

export default function AnalyticsPage() {
  const { user, language } = useAuth()
  const { selectedStoreId, accessibleStores } = useData()
  const [range, setRange] = useState('30d')
  const [payload, setPayload] = useState<AnalyticsPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (!user || user.role === 'employee') return
    let cancelled = false
    setIsLoading(true)
    setError(null)
    apiClient.get<{ success: boolean; data?: AnalyticsPayload }>('/api/v1/analytics/dashboard', {
      params: {
        range,
        ...(selectedStoreId ? { store_id: selectedStoreId } : {}),
      },
    })
      .then((res) => {
        if (!cancelled) setPayload(res.data || {})
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Analytics failed to load')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user, selectedStoreId, range])

  const statusData = useMemo(() => {
    const orders = payload?.orders || {}
    return ['waiting', 'confirmed', 'delivered', 'rejected', 'problem']
      .map((key) => ({ name: key, value: Number(orders[key] || 0), fill: STATUS_COLORS[key] }))
      .filter((row) => row.value > 0)
  }, [payload?.orders])

  const revenueData = useMemo(
    () => (payload?.revenueChart || []).map((row) => ({ date: row.date, revenue: Number(row.total || 0) })),
    [payload?.revenueChart]
  )

  if (user?.role === 'employee') {
    return <AccessRestricted description="Analytics is restricted to store owners and platform admins. Employees can see assigned activity on the dashboard." />
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 pb-20">
      <div className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">{language === 'ar' ? 'التحليلات' : 'Analytics'}</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-muted-foreground">Backend-powered commerce, traffic, customer risk, notification, and platform health metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="year">This year</SelectItem>
            </SelectContent>
          </Select>
          {selectedStoreId && <Badge variant="outline">{accessibleStores.find((store) => store.id === selectedStoreId)?.name || 'Selected store'}</Badge>}
        </div>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="flex items-center gap-3 p-5 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm font-medium">{error}</p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-dashed">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {([
              ['Total orders', payload?.metrics?.totalOrders ?? 0, ShoppingBag],
              ['Orders today', payload?.metrics?.ordersToday ?? 0, TrendingUp],
              ['Revenue month', `${Number(payload?.revenue?.month || 0).toLocaleString()} IQD`, DollarSign],
              ['High-risk customers', payload?.customers?.highRisk ?? 0, Users],
              ['Low-stock products', payload?.products?.lowStock ?? 0, Package],
              ['Traffic visits', payload?.traffic?.visits ?? 0, TrendingUp],
              ['Notifications opened', payload?.notifications?.opened ?? 0, Bell],
              ['Conversion rate', payload?.traffic?.conversionRate == null ? 'n/a' : `${payload.traffic.conversionRate}%`, TrendingUp],
            ] as Array<[string, string | number, LucideIcon]>).map(([label, value, Icon]) => (
              <Card key={String(label)}>
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{String(label)}</p>
                    <p className="mt-2 text-2xl font-black tracking-tight">{String(value)}</p>
                  </div>
                  <Icon className="h-5 w-5 text-primary" />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue trend</CardTitle>
                <CardDescription>Delivered-order revenue from the analytics API.</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueData.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Line type="monotone" dataKey="revenue" stroke="oklch(0.55 0.18 250)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order status</CardTitle>
                <CardDescription>Waiting, delivered, rejected, and problem counts.</CardDescription>
              </CardHeader>
              <CardContent>
                {statusData.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={104}>
                        {statusData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top products</CardTitle>
                <CardDescription>Best sellers by quantity.</CardDescription>
              </CardHeader>
              <CardContent>
                {(payload?.topProducts || []).length === 0 ? (
                  <EmptyState />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={payload?.topProducts || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="title" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="sold_count" fill="oklch(0.65 0.15 165)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{isAdmin ? 'Platform health' : 'Traffic and notifications'}</CardTitle>
                <CardDescription>Operational summary without heavy frontend calculations.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {(isAdmin && payload?.platform) ? (
                  <>
                    <Metric label="Users" value={payload.platform.users?.total} />
                    <Metric label="Stores" value={payload.platform.stores?.total} />
                    <Metric label="Active stores" value={payload.platform.stores?.active} />
                    <Metric label="Failed jobs" value={payload.platform.infrastructure?.failedJobs} />
                  </>
                ) : (
                  <>
                    <Metric label="Unique visitors" value={payload?.traffic?.uniqueVisitors} />
                    <Metric label="Checkout starts" value={payload?.traffic?.checkoutStarts} />
                    <Metric label="Delivered notifications" value={payload?.notifications?.delivered} />
                    <Metric label="Clicked notifications" value={payload?.notifications?.clicked} />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-black">{String(value ?? 0)}</p>
    </div>
  )
}

function EmptyState() {
  return <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">No analytics data for this range.</div>
}
