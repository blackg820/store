'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/hooks/use-translations'
import { useData } from '@/lib/data-context'
import { UsersTable } from '@/components/dashboard/users-table'
import { Users, UserCheck, UserX, Store } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DashboardPageHeader } from '@/components/dashboard/page-header'

export default function UsersPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { t } = useTranslations()
  const { users, stores } = useData()

  // Admin only page
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [user, router])

  if (user?.role !== 'admin') {
    return null
  }

  // Calculate stats
  const platformUsers = users.filter(u => u.role === 'store_owner' || u.role === 'user')
  const stats = {
    total: platformUsers.length,
    active: platformUsers.filter(u => u.isActive).length,
    inactive: platformUsers.filter(u => !u.isActive).length,
    totalStores: stores.length,
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 pb-20">
      <DashboardPageHeader
        eyebrow="Platform administration"
        title={t('users')}
        description="Manage tenant owners, platform admins, subscription assignment, and account access from a controlled admin surface."
      />

      {/* Stats Summary Section */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-top-4 duration-700">
        {[
          { key: 'total_users', count: stats.total, color: 'primary', icon: Users, sub: 'Managed accounts' },
          { key: 'active', count: stats.active, color: 'success', icon: UserCheck, sub: 'Currently active' },
          { key: 'inactive', count: stats.inactive, color: 'muted', icon: UserX, sub: 'Pending/Disabled' },
          { key: 'total_stores', count: stats.totalStores, color: 'accent', icon: Store, sub: 'Linked storefronts' },
        ].map((stat) => (
          <div key={stat.key} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/20">
            <span className="text-xs font-semibold text-muted-foreground">{t(stat.key as any) || stat.key.replace('_', ' ')}</span>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-semibold tracking-tight tabular-nums">{stat.count}</span>
                <span className="mt-1 text-xs text-muted-foreground">{stat.sub}</span>
              </div>
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                stat.color === 'primary' && "bg-primary/10 text-primary",
                stat.color === 'success' && "bg-success/10 text-success",
                stat.color === 'muted' && "bg-muted text-muted-foreground opacity-50",
                stat.color === 'accent' && "bg-accent/10 text-accent",
              )}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
        <UsersTable />
      </div>
    </div>
  )
}
