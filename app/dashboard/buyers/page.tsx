'use client'

import { useTranslations } from '@/hooks/use-translations'
import { useData } from '@/lib/data-context'
import { DashboardHeader } from '@/components/dashboard/header'
import { BuyersTable } from '@/components/dashboard/buyers-table'
import { Card, CardContent } from '@/components/ui/card'
import { Users, AlertTriangle, Ban, ShieldCheck } from 'lucide-react'

export default function BuyersPage() {
  const { t } = useTranslations()
  const { buyers } = useData()
  
  // Calculate stats
  const stats = {
    total: buyers.length,
    lowRisk: buyers.filter(b => b.riskScore === 'low' && !b.isBlacklisted).length,
    highRisk: buyers.filter(b => b.riskScore === 'high' && !b.isBlacklisted).length,
    blacklisted: buyers.filter(b => b.isBlacklisted).length,
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader title={t('buyers')} />
      
      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Summary */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
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
          <Card>
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
          <Card>
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
          <Card>
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
