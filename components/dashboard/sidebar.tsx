'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { useData } from '@/lib/data-context'
import { useTranslations } from '@/hooks/use-translations'
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingCart,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Globe,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  Layers,
  FileText,
  BarChart3,
  Percent,
  Key,
  Megaphone,
  Bell,
  X,
  MessageCircle,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const LANGUAGES = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'ku', label: 'کوردی', dir: 'rtl' },
] as const

interface NavItem {
  href: string
  label: string // Translation key
  icon: React.ElementType
  adminOnly?: boolean
  plan?: number
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'general',
    items: [
      { href: '/dashboard', label: 'dashboard', icon: LayoutDashboard },
      { href: '/dashboard/analytics', label: 'analytics', icon: BarChart3 },
    ]
  },
  {
    label: 'management',
    items: [
      { href: '/dashboard/stores', label: 'stores', icon: Store },
      { href: '/dashboard/products', label: 'products', icon: Package },
      { href: '/dashboard/product-types', label: 'productSections' as any, icon: Layers },
      { href: '/dashboard/orders', label: 'orders', icon: ShoppingCart },
      { href: '/dashboard/buyers', label: 'buyers', icon: Users },
      { href: '/dashboard/discounts', label: 'discounts', icon: Percent },
      { href: '/dashboard/customer-notifications', label: 'notifications', icon: Bell },
    ]
  },
  {
    label: 'platform',
    items: [
      { href: '/dashboard/broadcast', label: 'broadcast', icon: Megaphone, adminOnly: true },
      { href: '/dashboard/ops', label: 'ops' as any, icon: Activity, adminOnly: true },
      { href: '/dashboard/users', label: 'users', icon: UserCircle, adminOnly: true },
      { href: '/dashboard/subscriptions', label: 'subscriptions', icon: CreditCard, adminOnly: true },
      { href: '/dashboard/audit-logs', label: 'auditLogs', icon: FileText, adminOnly: true },
      { href: '/dashboard/api-keys', label: 'apiKeys' as any, icon: Key, adminOnly: true },
      { href: '/dashboard/employees', label: 'employees', icon: Users, plan: 3 },
      { href: '/dashboard/billing', label: 'billing' as any, icon: CreditCard },
      { href: '/dashboard/settings', label: 'settings', icon: Settings },
    ]
  }
]

import { useDashboard } from '@/lib/dashboard-context'

export function DashboardSidebar() {
  const pathname = usePathname()
  const { user, logout, language, setLanguage, direction } = useAuth()
  const { settings } = useData()
  const { t } = useTranslations()
  const {
    isMobileMenuOpen: mobileOpen,
    setIsMobileMenuOpen: setMobileOpen,
    isSidebarCollapsed: collapsed,
    setIsSidebarCollapsed: setCollapsed
  } = useDashboard()
  const planLevels: Record<string, number> = {
    starter: 1,
    pro: 2,
    business: 3,
    enterprise: 4,
    custom: 4,
    unlimited: 4,
  }
  const userPlan = String(user?.subscription_plan ?? 'starter')
  const userLevel = planLevels[userPlan] || 1
  const workspaceLabel = user?.role === 'admin'
    ? 'Platform'
    : user?.role === 'employee'
      ? 'Catalog access'
      : 'Store owner'

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname, setMobileOpen])

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const filteredGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (item.adminOnly && user?.role !== 'admin') return false

      if (item.plan) {
        if (item.href === '/dashboard/employees' && user?.role !== 'store_owner') return false

        if (userLevel < item.plan) return false
        if (user?.role === 'employee') return false // Employees can't manage other employees
      }

      if (user?.role === 'employee') {
        const allowedPaths = ['/dashboard/products', '/dashboard/product-types']
        if (!allowedPaths.includes(item.href)) return false
      }

      return true
    })
  })).filter(group => group.items.length > 0)



  const isRtl = direction === 'rtl'

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between border-b border-sidebar-border p-4">
        <Link href="/dashboard" className={cn('flex min-w-0 items-center gap-3 group/logo', collapsed && 'justify-center')}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sidebar-accent text-sidebar-foreground ring-1 ring-sidebar-border transition-colors group-hover/logo:bg-sidebar-primary group-hover/logo:text-sidebar-primary-foreground">
            {settings.site_logo ? (
              <img src={settings.site_logo} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <Store className="h-5 w-5" />
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="block truncate text-lg font-semibold tracking-tight text-sidebar-foreground">{settings.site_name || 'Storify'}</span>
              <span className="block truncate text-[11px] font-medium text-sidebar-foreground/50">{workspaceLabel}</span>
            </div>
          )}
        </Link>
        {/* Desktop collapse button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground hover:bg-sidebar-accent shrink-0 hidden md:flex"
        >
          {collapsed ? (
            isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(false)}
          className="text-sidebar-foreground hover:bg-sidebar-accent shrink-0 md:hidden"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto py-5 custom-scrollbar">
        {filteredGroups.map((group, groupIdx) => (
          <div key={group.label} className={cn("mb-5 px-3", groupIdx > 0 && "mt-6")}>
            {!collapsed && (
              <h3 className="mb-2 px-3 text-[11px] font-semibold text-sidebar-foreground/45">
                {t(group.label as any)}
              </h3>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? t(item.label as any) : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors duration-200 group/item',
                        collapsed && 'justify-center px-0',
                        isActive
                          ? 'border-sidebar-primary/30 bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'text-sidebar-foreground/70 hover:border-sidebar-border hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span className="truncate text-sm font-semibold">{t(item.label as any)}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        <div className="px-4">
          {settings.saas_contact_whatsapp && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <a
                href={`https://wa.me/${settings.saas_contact_whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-success/80 transition-colors duration-200 hover:bg-success/10 hover:text-success',
                  collapsed && 'justify-center px-0'
                )}
              >
                <MessageCircle className="h-5 w-5 shrink-0 group-hover:scale-110 transition-transform" />
                {!collapsed && <span className="font-bold tracking-wide text-xs uppercase">{t('contactSaaS')}</span>}
              </a>
            </div>
          )}
        </div>
      </nav>

      <div className="space-y-2 border-t border-sidebar-border p-4">
        {!collapsed && user && (
          <div className="mb-3 rounded-xl border border-sidebar-border bg-sidebar-accent/45 p-3">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">{user.name}</p>
            <p className="truncate text-xs text-sidebar-foreground/50">{user.email}</p>
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size={collapsed ? 'icon' : 'default'}
              className={cn(
                'text-sidebar-foreground hover:bg-sidebar-accent',
                collapsed ? 'w-full justify-center' : 'w-full justify-start'
              )}
            >
              <Globe className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <span className="ms-3">
                  {LANGUAGES.find(l => l.code === language)?.label || 'Language'}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => setLanguage(lang.code as any)}
                className={cn(
                  "flex items-center justify-between cursor-pointer",
                  language === lang.code && "bg-sidebar-primary text-sidebar-primary-foreground"
                )}
              >
                <span>{lang.label}</span>
                {language === lang.code && (
                  <div className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          onClick={logout}
          className={cn(
            'text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive',
            collapsed ? 'w-full justify-center' : 'w-full justify-start'
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="ms-3">{t('logout')}</span>}
        </Button>
      </div>
    </>
  )

  return (
    <>


      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed top-0 h-screen glass-sidebar text-sidebar-foreground border-e border-white/10 flex flex-col z-50 w-64 transition-all duration-300 md:hidden shadow-2xl',
          mobileOpen
            ? 'translate-x-0 opacity-100'
            : cn(
                isRtl ? 'translate-x-full' : '-translate-x-full',
                'opacity-0 pointer-events-none'
              ),
          'start-0'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed top-0 start-0 h-screen glass-sidebar text-sidebar-foreground border-e border-white/10 flex flex-col transition-all duration-300 z-50 hidden md:flex',
          collapsed ? 'w-20' : 'w-72'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
