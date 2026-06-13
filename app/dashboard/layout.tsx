'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { DashboardProvider, useDashboard } from '@/lib/dashboard-context'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { ShellTopbar } from '@/components/dashboard/shell-topbar'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/hooks/use-translations'

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading } = useAuth()
  const { isSidebarCollapsed } = useDashboard()
  const { t } = useTranslations()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (isLoading || !user || user.role !== 'employee') {
      return
    }

    const employeeAllowedPaths = ['/dashboard/products', '/dashboard/product-types']
    if (!employeeAllowedPaths.some((allowedPath) => pathname === allowedPath || pathname.startsWith(`${allowedPath}/`))) {
      router.replace('/dashboard/products')
    }
  }, [isLoading, pathname, router, user])

  if (!mounted || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm font-semibold text-muted-foreground">{t('dashboardLoading')}</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (
    user.role === 'employee' &&
    !['/dashboard/products', '/dashboard/product-types'].some((allowedPath) => pathname === allowedPath || pathname.startsWith(`${allowedPath}/`))
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm font-semibold text-muted-foreground">{t('dashboardOpeningWorkspace')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background transition-colors duration-300 dashboard-bg">
      <DashboardSidebar />

      <div
        className={cn(
          "flex min-h-screen flex-1 flex-col transition-all duration-300",
          isSidebarCollapsed ? "md:ps-20" : "md:ps-72"
        )}
      >
        <ShellTopbar />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8 xl:px-10">
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 ease-premium">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </DashboardProvider>
  )
}
