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
  Menu,
  Megaphone,
  X,
  MessageCircle,
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
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'dashboard', icon: LayoutDashboard },
  { href: '/dashboard/stores', label: 'stores', icon: Store },
  { href: '/dashboard/products', label: 'products', icon: Package },
  { href: '/dashboard/product-types', label: 'productTypes', icon: Layers },
  { href: '/dashboard/orders', label: 'orders', icon: ShoppingCart },
  { href: '/dashboard/buyers', label: 'buyers', icon: Users },
  { href: '/dashboard/discounts', label: 'discounts', icon: Percent },
  { href: '/dashboard/analytics', label: 'analytics', icon: BarChart3 },
  { href: '/dashboard/broadcast', label: 'broadcast', icon: Megaphone, adminOnly: true },
  { href: '/dashboard/users', label: 'users', icon: UserCircle, adminOnly: true },
  { href: '/dashboard/subscriptions', label: 'subscriptions', icon: CreditCard, adminOnly: true },
  { href: '/dashboard/audit-logs', label: 'auditLogs', icon: FileText, adminOnly: true },
  { href: '/dashboard/settings', label: 'settings', icon: Settings },
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

  const filteredNavItems = navItems.filter(item => {
    if (item.adminOnly && user?.role !== 'admin') return false
    return true
  })



  const isRtl = direction === 'rtl'

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-3 group/logo">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden shadow-lg shadow-primary/20 transition-transform group-hover/logo:scale-110">
              {settings.site_logo ? (
                <img src={settings.site_logo} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <Store className="h-6 w-6 text-white" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-black text-xl tracking-tighter bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">{settings.site_name || 'Storify'}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary/80">SaaS Platform</span>
            </div>
          </Link>
        )}
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

      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 nav-item-glow',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]'
                      : 'text-sidebar-foreground/90 hover:bg-white/5 hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0 transition-transform duration-300", isActive && "scale-110")} />
                  {!collapsed && <span className="font-medium tracking-wide">{t(item.label as any)}</span>}
                </Link>
              </li>
            )
          })}
          
          {settings.saas_contact_whatsapp && (
            <li className="mt-4 pt-4 border-t border-white/5">
              <a 
                href={`https://wa.me/${settings.saas_contact_whatsapp.replace(/\D/g, '')}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group hover:bg-success/10 text-success/80 hover:text-success',
                  collapsed && 'justify-center px-0'
                )}
              >
                <MessageCircle className="h-5 w-5 shrink-0 group-hover:scale-110 transition-transform" />
                {!collapsed && <span className="font-bold tracking-wide text-xs uppercase">{t('contactSaaS' as any) || 'SaaS Support'}</span>}
              </a>
            </li>
          )}
        </ul>
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-2">
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
