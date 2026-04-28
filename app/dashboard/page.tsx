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
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Dynamic Page Header Section */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black tracking-tight text-foreground">
          {t('dashboard')}
        </h2>
        <p className="text-muted-foreground text-sm font-medium">
          Welcome back, <span className="text-primary font-bold">{user?.name}</span>. Here's what's happening with your stores today.
        </p>
      </div>
      
      {/* Stats Cards Section */}
      <section className="animate-in fade-in slide-in-from-top-4 duration-500 delay-150">
        {isAdmin ? (
          <AdminStatsCards />
        ) : (
          <StoreOwnerStatsCards userId={user?.id || ''} />
        )}
      </section>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
        {/* Recent Orders - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-bold tracking-tight">{t('recentOrders')}</h3>
            <button className="text-xs font-bold text-primary hover:underline transition-all">
              View All Orders
            </button>
          </div>
          {/* Note: OrdersTable already has its own card styling and actions, 
              so we don't need to wrap it in a redundant UI Card if it's top-level. */}
          <OrdersTable limit={5} showActions={false} />
        </div>

        {/* Sidebar Activity Section */}
        <div className="space-y-8">
          <div className="space-y-4">
             <div className="flex items-center gap-2 px-2">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <h3 className="text-lg font-bold tracking-tight">Live Activity</h3>
             </div>
             <RecentActivity />
          </div>
          {isAdmin && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold tracking-tight px-2">Top Performance</h3>
              <TopStores />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
