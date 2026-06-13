'use client'

import { useTranslations } from '@/hooks/use-translations'
import { useData } from '@/lib/data-context'
import { useAuth } from '@/lib/auth-context'
import { BuyersTable } from '@/components/dashboard/buyers-table'
import { Card, CardContent } from '@/components/ui/card'
import { Users, AlertTriangle, Ban, ShieldCheck } from 'lucide-react'
import { AccessRestricted } from '@/components/dashboard/access-restricted'
import { DashboardPageHeader } from '@/components/dashboard/page-header'

export default function BuyersPage() {
  const { t } = useTranslations()
  const { user } = useAuth()
  const { buyers, orders, selectedStoreId } = useData()

  if (user?.role === 'employee') {
    return (
      <AccessRestricted description="Buyer risk and blacklist management is restricted to store owners and platform admins." />
    )
  }

  const relevantBuyers = selectedStoreId
    ? buyers.filter(b => orders.some(o => o.buyerId === b.id && o.storeId === selectedStoreId))
    : buyers

  // Calculate stats
  const stats = {
    total: relevantBuyers.length,
    lowRisk: relevantBuyers.filter(b => b.risk === 'low' && !b.isBlacklisted).length,
    highRisk: relevantBuyers.filter(b => b.risk === 'high' && !b.isBlacklisted).length,
    blacklisted: relevantBuyers.filter(b => b.isBlacklisted).length,
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 pb-20">
      <DashboardPageHeader
        eyebrow="Customer risk"
        title={t('buyers')}
        description="Review buyer history, delivery reliability, risk status, and blacklist decisions across the selected store scope."
      />

      <div className="space-y-6">
        {/* Stats Summary */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Buyers</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-success/10">
                <ShieldCheck className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('lowRisk')}</p>
                <p className="text-2xl font-bold">{stats.lowRisk}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('highRisk')}</p>
                <p className="text-2xl font-bold">{stats.highRisk}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-destructive/10">
                <Ban className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('blacklisted')}</p>
                <p className="text-2xl font-bold">{stats.blacklisted}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Buyers Table */}
        <BuyersTable />
      </div>
    </div>
  )
}
