'use client'

import { useAuth } from '@/lib/auth-context'
import { useData } from '@/lib/data-context'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, Menu, ShoppingCart, Globe, CreditCard, Settings, LogOut } from 'lucide-react'
import { useTranslations } from '@/hooks/use-translations'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { useDashboard } from '@/lib/dashboard-context'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MainStoreSelector } from './main-store-selector'

interface DashboardHeaderProps {
  title: string
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  const { user, logout, language, setLanguage } = useAuth()
  const { getSubscriptionByUserId, orders, products, stores, selectedStoreId } = useData()
  const { t } = useTranslations()
  const { setIsMobileMenuOpen } = useDashboard()
  const router = useRouter()

  const filteredOrders = selectedStoreId
    ? orders.filter(o => o.storeId === selectedStoreId)
    : orders

  const pendingOrders = filteredOrders.filter(o => o.status === 'pending')
  const subscription = user ? getSubscriptionByUserId(user.id) : undefined
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'

  const { settings } = useData()

  const isRTL = language === 'ar' || language === 'ku'

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-20 items-center justify-between px-8 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-xl h-11 w-11"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>

          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight text-foreground font-heading">{title}</h1>
            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/60 sm:block hidden">{settings.site_name || 'Storify'}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-6 w-[1px] bg-border mx-2 hidden sm:block" />
            <MainStoreSelector />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-10 w-10">
                <Globe className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className={cn('w-40 p-2 overflow-hidden rounded-2xl glass-card', isRTL ? 'text-right' : 'text-left')}
              align={isRTL ? 'start' : 'end'}
            >
              <DropdownMenuItem
                onClick={() => setLanguage('ar')}
                className={cn("rounded-xl cursor-pointer px-4 py-3 font-bold", language === 'ar' && "bg-primary/10 text-primary")}
              >
                العربية
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLanguage('ku')}
                className={cn("rounded-xl cursor-pointer px-4 py-3 font-bold", language === 'ku' && "bg-primary/10 text-primary")}
              >
                کوردی
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLanguage('en')}
                className={cn("rounded-xl cursor-pointer px-4 py-3 font-bold", language === 'en' && "bg-primary/10 text-primary")}
              >
                English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-10 w-10">
                <Bell className="h-5 w-5" />
                {pendingOrders.length > 0 && (
                  <span className="absolute -top-1 -end-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center animate-pulse">
                    {pendingOrders.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className={cn('w-80 p-0 overflow-hidden', isRTL ? 'text-right' : 'text-left')}
              align={isRTL ? 'start' : 'end'}
            >
              <DropdownMenuLabel className="p-4 bg-muted/50 font-bold border-b">
                {t('notifications')}
              </DropdownMenuLabel>
              <div className="max-h-[400px] overflow-y-auto">
                {pendingOrders.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">{t('noNewNotifications')}</p>
                  </div>
                ) : (
                  pendingOrders.slice(0, 5).map((order) => {
                    const firstItem = order.items?.[0]
                    return (
                      <DropdownMenuItem
                        key={order.id}
                        className="p-4 border-b last:border-0 cursor-pointer focus:bg-muted"
                        onClick={() => router.push('/dashboard/orders')}
                      >
                        <div className="flex gap-3 w-full">
                          <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                            <ShoppingCart className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 space-y-1 overflow-hidden">
                            <p className="text-sm font-semibold leading-none truncate">
                              {(() => {
                                const product = products.find(p => p.id === firstItem?.productId)
                                const productTitle = product?.title
                                const store = stores.find(s => s.id === order.storeId)
                                const storeName = store?.name
                                return (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{storeName}</span>
                                    <span>{`${t('newOrder')}: ${productTitle || t('product')}`}</span>
                                  </div>
                                )
                              })()}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {t('from')}: {order.buyerId?.slice(0, 8)}...
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(order.createdAt), {
                                addSuffix: true,
                                locale: language === 'ar' ? ar : enUS
                              })}
                            </p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    )
                  })
                )}
              </div>
              {pendingOrders.length > 0 && (
                <Link href="/dashboard/orders" className="block p-3 text-center text-xs font-semibold text-primary bg-muted/30 hover:bg-muted transition-colors">
                  {t('viewAllOrders')}
                </Link>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className={cn('w-56', isRTL ? 'text-right' : 'text-left')} align={isRTL ? 'start' : 'end'}>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {subscription && (
                <>
                  <div className="px-2 py-1.5">
                    <Badge variant="outline" className="w-full justify-center bg-primary/5 text-primary border-primary/20 font-black uppercase tracking-widest text-[10px]">
                      {subscription.plan?.name || subscription.planCode} Plan
                    </Badge>
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={() => router.push('/dashboard/billing')}
                className="cursor-pointer font-bold"
              >
                <CreditCard className="h-4 w-4 me-2 opacity-50" />
                {t('billing' as any) || 'Billing & Plans'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push('/dashboard/settings')}
                className="cursor-pointer font-bold"
              >
                <Settings className="h-4 w-4 me-2 opacity-50" />
                {t('settings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive font-bold cursor-pointer">
                <LogOut className="h-4 w-4 me-2 opacity-50" />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
