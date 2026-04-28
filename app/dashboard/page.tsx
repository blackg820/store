'use client'

import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/hooks/use-translations'
import { DashboardHeader } from '@/components/dashboard/header'
import { AdminStatsCards, StoreOwnerStatsCards } from '@/components/dashboard/stats-cards'
import { RecentActivity, TopStores } from '@/components/dashboard/recent-activity'
import { OrdersTable } from '@/components/dashboard/orders-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
  const { user } = useAuth()
  const { t } = useTranslations()
  
  const isAdmin = user?.role === 'admin'

  return (
    <div className="min-h-screen">
      <DashboardHeader title={t('dashboard')} />
      
      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        {isAdmin ? (
          <AdminStatsCards />
        ) : (
          <StoreOwnerStatsCards userId={user?.id || ''} />
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Orders - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Card className="glass-card border-white/10 shadow-xl overflow-hidden">
              <CardHeader className="border-b border-white/5 bg-white/5">
                <CardTitle className="text-lg font-bold tracking-tight">{t('recentOrders')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <OrdersTable limit={5} showActions={false} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Content */}
          <div className="space-y-6">
            <RecentActivity />
            {isAdmin && <TopStores />}
          </div>
        </div>
      </div>
    </div>
  )
}
