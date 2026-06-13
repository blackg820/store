'use client'

import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/hooks/use-translations'
import { StoresTable } from '@/components/dashboard/stores-table'
import { AccessRestricted } from '@/components/dashboard/access-restricted'
import { DashboardPageHeader } from '@/components/dashboard/page-header'

export default function StoresPage() {
  const { user } = useAuth()
  const { t } = useTranslations()

  const isAdmin = user?.role === 'admin'

  if (user?.role === 'employee') {
    return (
      <AccessRestricted description="Employees can manage assigned catalog areas, but store setup is restricted to store owners and platform admins." />
    )
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 pb-20">
      <DashboardPageHeader
        eyebrow={isAdmin ? 'Tenant storefronts' : 'Storefront setup'}
        title={t('stores')}
        description="Manage storefront identity, URLs, media, notification channels, delivery settings, and operational status."
      />

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <StoresTable
          userId={isAdmin ? undefined : user?.id}
          showOwner={isAdmin}
        />
      </div>
    </div>
  )
}
