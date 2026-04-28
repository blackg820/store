'use client'

import { useAuth } from '@/lib/auth-context'
import { useData } from '@/lib/data-context'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Bell, 
  Menu, 
  Search, 
  Globe, 
  Command,
  ChevronRight,
  Store as StoreIcon
} from 'lucide-react'
import { useTranslations } from '@/hooks/use-translations'
import { useDashboard } from '@/lib/dashboard-context'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { useEffect, useRef } from 'react'

export function ShellTopbar() {
  const { user, language, setLanguage, logout } = useAuth()
  const { t } = useTranslations()
  const { setIsMobileMenuOpen, isSidebarCollapsed } = useDashboard()
  const { stores, selectedStoreId, setSelectedStoreId } = useData()
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  const currentStore = stores.find(s => s.id === selectedStoreId)
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  const isRTL = language === 'ar' || language === 'ku'

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/40 bg-background/80 backdrop-blur-md transition-all duration-300">
      <div className="flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="hidden md:flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 px-2 gap-2 hover:bg-muted rounded-lg font-bold text-base">
                  <StoreIcon className="h-4 w-4 text-primary" />
                  <span className="truncate max-w-[150px]">
                    {currentStore ? (language === 'ar' ? currentStore.nameAr : currentStore.name) : 'All Stores'}
                  </span>
                  <ChevronRight className="h-3 w-3 opacity-30 rotate-90" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 rounded-xl p-2">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 py-1">
                  Switch Store
                </DropdownMenuLabel>
                <DropdownMenuItem 
                  onClick={() => setSelectedStoreId(null)}
                  className={cn("rounded-lg", !selectedStoreId && "bg-primary/10 text-primary")}
                >
                  All Managed Stores
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {stores.map(s => (
                  <DropdownMenuItem 
                    key={s.id}
                    onClick={() => setSelectedStoreId(s.id)}
                    className={cn("rounded-lg", selectedStoreId === s.id && "bg-primary/10 text-primary")}
                  >
                    {language === 'ar' ? s.nameAr : s.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
          <div className="relative w-full group">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <div className="absolute end-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted/50 text-[10px] font-medium text-muted-foreground">
              <Command className="h-2.5 w-2.5" />
              <span>K</span>
            </div>
            <input 
              ref={searchInputRef}
              type="text"
              placeholder="Search anything..."
              className="w-full h-10 ps-10 pe-12 bg-muted/30 border-transparent hover:bg-muted/50 focus:bg-background focus:border-primary/30 rounded-full text-sm transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 gap-2 px-3 rounded-full hover:bg-muted">
                <Globe className="h-4 w-4 opacity-70" />
                <span className="text-xs font-semibold uppercase">{language}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl">
              <DropdownMenuItem onClick={() => setLanguage('ar')} className="gap-2">العربية</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('ku')} className="gap-2">کوردی</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('en')} className="gap-2">English</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full relative">
            <Bell className="h-5 w-5 opacity-70" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 overflow-hidden border border-border/50">
                <Avatar className="h-full w-full">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
              <DropdownMenuLabel className="font-normal px-2 py-1.5">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = '/dashboard/settings'}>
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="text-destructive">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
