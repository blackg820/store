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
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black tracking-tight text-foreground">
            {t('products')}
          </h2>
          <p className="text-muted-foreground text-sm font-medium">
            Manage your catalog, inventory, and product categories across all stores.
          </p>
        </div>
      </div>
      
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <ProductsTable 
          userId={isAdmin ? undefined : user?.id}
        />
      </div>
    </div>
  )
}
