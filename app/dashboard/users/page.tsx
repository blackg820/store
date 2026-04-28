'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/hooks/use-translations'
import { useData } from '@/lib/data-context'
import { DashboardHeader } from '@/components/dashboard/header'
import { UsersTable } from '@/components/dashboard/users-table'
import { Card, CardContent } from '@/components/ui/card'
import { Users, UserCheck, UserX, Store } from 'lucide-react'

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
    <div className="min-h-screen">
      <DashboardHeader title={t('users')} />
      
      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Summary */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-success/10">
                <UserCheck className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('active')}</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <UserX className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('inactive')}</p>
                <p className="text-2xl font-bold">{stats.inactive}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent/10">
                <Store className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Stores</p>
                <p className="text-2xl font-bold">{stats.totalStores}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <UsersTable />
      </div>
    </div>
  )
}
