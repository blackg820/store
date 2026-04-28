'use client'

import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/hooks/use-translations'
import { DashboardHeader } from '@/components/dashboard/header'
import { StoresTable } from '@/components/dashboard/stores-table'

export default function StoresPage() {
  const { user } = useAuth()
  const { t } = useTranslations()
  
  const isAdmin = user?.role === 'admin'

  return (
    <div className="min-h-screen">
      <DashboardHeader title={t('stores')} />
      
      <div className="p-4 md:p-6">
        <StoresTable 
          userId={isAdmin ? undefined : user?.id}
          showOwner={isAdmin}
        />
      </div>
    </div>
  )
}
