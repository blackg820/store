'use client'

import { EmployeesTable } from '@/components/dashboard/employees-table'
import { useTranslations } from '@/hooks/use-translations'
import { useAuth } from '@/lib/auth-context'
import { AccessRestricted } from '@/components/dashboard/access-restricted'
import { DashboardPageHeader } from '@/components/dashboard/page-header'

export default function EmployeesPage() {
  const { t } = useTranslations()
  const { user } = useAuth()

  if (!user) return null

  if (user.role === 'admin') {
    return (
      <AccessRestricted description="Employee accounts belong to individual store owners. Platform admins should manage tenant owner accounts from Users and subscriptions from the admin billing tools." />
    )
  }

  if (user.role === 'employee') {
    return (
      <AccessRestricted description="Employee management is restricted to store owners." />
    )
  }

  const planLevels: Record<string, number> = {
    starter: 1,
    pro: 2,
    business: 3,
    enterprise: 4,
  }
  const userLevel = planLevels[user.subscription_plan || 'starter'] || 1

  if (userLevel < 3) {
    return (
      <AccessRestricted description="Employee management requires the Business plan or higher." />
    )
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 pb-20">
      <DashboardPageHeader
        eyebrow="Team access"
        title={t('employees')}
        description="Invite and manage store staff accounts. Employees are scoped to catalog work and cannot manage owner-only operations."
      />
      <EmployeesTable />
    </div>
  )
}
