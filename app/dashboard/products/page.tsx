'use client'

import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/hooks/use-translations'
import { DashboardHeader } from '@/components/dashboard/header'
import { ProductsTable } from '@/components/dashboard/products-table'

export default function ProductsPage() {
  const { user } = useAuth()
  const { t } = useTranslations()
  
  const isAdmin = user?.role === 'admin'

  return (
    <div className="min-h-screen">
      <DashboardHeader title={t('products')} />
      
      <div className="p-4 md:p-6">
        <ProductsTable 
          userId={isAdmin ? undefined : user?.id}
        />
      </div>
    </div>
  )
}
