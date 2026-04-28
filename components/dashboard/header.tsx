'use client'

import { useAuth } from '@/lib/auth-context'
import { useData } from '@/lib/data-context'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, Menu, ShoppingCart, Globe, Store as StoreIcon, ChevronDown, Check } from 'lucide-react'
import { useTranslations } from '@/hooks/use-translations'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { useDashboard } from '@/lib/dashboard-context'
import Link from 'next/link'

interface DashboardHeaderProps {
  title: string
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  const { user, logout, language, setLanguage } = useAuth()
  const { getSubscriptionByUserId, orders, products, stores, selectedStoreId, setSelectedStoreId } = useData()
  const { t } = useTranslations()
  const { setIsMobileMenuOpen } = useDashboard()
  
  const filteredOrders = selectedStoreId 
    ? orders.filter(o => o.storeId === selectedStoreId)
    : orders

  const pendingOrders = filteredOrders.filter(o => o.status === 'pending')
  const subscription = user ? getSubscriptionByUserId(user.id) : undefined
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  
  const currentStore = stores.find(s => s.id === selectedStoreId)

  const isRTL = language === 'ar' || language === 'ku'

  return (
    <header className="sticky top-4 z-40 mx-4 mb-4">
      <div className="glass-card flex h-16 items-center justify-between px-6 rounded-2xl transition-all duration-500 border-white/20">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground hidden sm:block">{title}</h1>

          {stores.length > 1 && (
            <div className="flex items-center gap-2">
              <div className="h-4 w-[1px] bg-white/20 mx-2 hidden sm:block" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 px-3 gap-2 rounded-xl glass-card border-white/10 hover:bg-white/5">
                    <StoreIcon className="h-4 w-4 text-primary" />
                    <span className="max-w-[120px] truncate font-medium">
                      {currentStore ? (language === 'ar' ? currentStore.nameAr : currentStore.name) : t('allStores' as any)}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className={cn('w-56 p-2 rounded-2xl glass-card', isRTL ? 'text-right' : 'text-left')} 
                  align="start"
                >
                  <DropdownMenuItem 
                    onClick={() => setSelectedStoreId(null)}
                    className={cn("rounded-xl cursor-pointer px-3 py-2 flex items-center justify-between", !selectedStoreId && "bg-primary/10 text-primary")}
                  >
                    <span>{t('allStores' as any)}</span>
                    {!selectedStoreId && <Check className="h-4 w-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  {stores.map((s) => (
                    <DropdownMenuItem 
                      key={s.id}
                      onClick={() => setSelectedStoreId(s.id)}
                      className={cn("rounded-xl cursor-pointer px-3 py-2 flex items-center justify-between", selectedStoreId === s.id && "bg-primary/10 text-primary")}
                    >
                      <span className="truncate">{language === 'ar' ? s.nameAr : s.name}</span>
                      {selectedStoreId === s.id && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
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
                    <p className="text-sm">{t('noNewNotifications' as any)}</p>
                  </div>
                ) : (
                  pendingOrders.slice(0, 5).map((order) => {
                    const firstItem = order.items?.[0]
                    return (
                      <DropdownMenuItem 
                        key={order.id} 
                        className="p-4 border-b last:border-0 cursor-pointer focus:bg-muted"
                        onClick={() => window.location.href = '/dashboard/orders'}
                      >
                        <div className="flex gap-3 w-full">
                          <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                            <ShoppingCart className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 space-y-1 overflow-hidden">
                            <p className="text-sm font-semibold leading-none truncate">
                              {(() => {
                                const product = products.find(p => p.id === firstItem?.productId)
                                const productTitle = language === 'ar' ? product?.titleAr : language === 'ku' ? product?.titleKu : product?.title
                                const store = stores.find(s => s.id === order.storeId)
                                const storeName = language === 'ar' ? store?.nameAr : store?.name
                                return (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{storeName}</span>
                                    <span>{`${t('newOrder' as any)}: ${productTitle || 'Product'}`}</span>
                                  </div>
                                )
                              })()}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {t('from' as any)}: {order.buyerId?.slice(0, 8)}...
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
                  {t('viewAllOrders' as any)}
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
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {t(subscription.planId as 'starter' | 'pro' | 'business' | 'enterprise')} Plan
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => window.location.href = '/dashboard/settings'}>
                {t('settings')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="text-destructive">
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
