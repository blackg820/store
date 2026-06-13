'use client'

import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/hooks/use-translations'
import { ProductsTable } from '@/components/dashboard/products-table'
import { DashboardPageHeader } from '@/components/dashboard/page-header'

export default function ProductsPage() {
  const { user } = useAuth()
  const { t } = useTranslations()

  const isAdmin = user?.role === 'admin'

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 pb-20">
      <DashboardPageHeader
        eyebrow={isAdmin ? 'Platform catalog' : user?.role === 'employee' ? 'Assigned catalog' : 'Commerce catalog'}
        title={t('products')}
        description="Manage catalog items, variants, options, pricing, media, and store assignment from one operational product table."
      />

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <ProductsTable
          userId={isAdmin ? undefined : user?.id}
        />
      </div>
    </div>
  )
}
