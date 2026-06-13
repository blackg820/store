'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronDown, Loader2, Plus, Search, Store as StoreIcon } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/lib/auth-context'
import { useData } from '@/lib/data-context'
import { useTranslations } from '@/hooks/use-translations'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MainStoreSelectorProps {
  className?: string
}

export function MainStoreSelector({ className }: MainStoreSelectorProps) {
  const { user, language } = useAuth()
  const { t } = useTranslations()
  const {
    accessibleStores,
    selectedStoreId,
    selectedStore,
    selectedStoreError,
    setSelectedStoreId,
    isDataLoading,
  } = useData()
  const [query, setQuery] = useState('')
  const isRtl = language === 'ar' || language === 'ku'
  const canCreateStore = user?.role === 'store_owner' || user?.role === 'admin'

  const filteredStores = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return accessibleStores

    return accessibleStores.filter((store) =>
      [store.name, store.slug].filter(Boolean).join(' ').toLowerCase().includes(normalized)
    )
  }, [accessibleStores, query])

  if (!user) {
    return null
  }

  const handleSelect = (storeId: string) => {
    const nextStore = accessibleStores.find((store) => store.id === storeId)
    if (!nextStore) {
      toast.error(t('storeDoesNotBelongToAccount'))
      setSelectedStoreId(null)
      return
    }

    setSelectedStoreId(nextStore.id)
    toast.success(t('storeSelected'))
  }

  const showAllStores = user.role === 'admin'
  const triggerLabel = selectedStore
    ? selectedStore.name || selectedStore.slug
    : showAllStores
      ? t('allStores')
      : isDataLoading
        ? t('loadingStores')
        : t('selectStore')

  return (
    <DropdownMenu onOpenChange={(open) => !open && setQuery('')}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-11 max-w-[18rem] justify-start gap-3 rounded-full border-border/80 bg-background px-3 shadow-sm hover:border-primary/30 hover:bg-primary/5',
            className
          )}
          disabled={isDataLoading && accessibleStores.length === 0}
        >
          <StoreAvatar name={triggerLabel} logoUrl={selectedStore?.logoUrl} isLoading={isDataLoading && accessibleStores.length === 0} />
          <span className="hidden min-w-0 flex-1 text-start sm:block">
            <span className="block truncate text-sm font-semibold leading-none">{triggerLabel}</span>
            <span className="mt-1 block truncate text-[11px] font-medium leading-none text-muted-foreground">
              {selectedStore ? t('currentStore') : t('switchStore')}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={isRtl ? 'start' : 'end'}
        className={cn('w-[22rem] rounded-2xl border-border p-2 shadow-2xl', isRtl ? 'text-right' : 'text-left')}
      >
        <DropdownMenuLabel className="px-3 py-2">
          <span className="block text-xs font-semibold text-foreground">{t('switchStore')}</span>
          <span className="mt-1 block text-[11px] font-medium text-muted-foreground">
            {selectedStoreError || t('currentStore')}
          </span>
        </DropdownMenuLabel>

        <div className="px-2 pb-2">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchStores')}
              className="h-10 rounded-full bg-muted/20 ps-9 text-sm"
            />
          </div>
        </div>

        <DropdownMenuSeparator />

        {isDataLoading && accessibleStores.length === 0 ? (
          <div className="flex items-center gap-3 px-3 py-5 text-sm font-medium text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            {t('loadingStores')}
          </div>
        ) : accessibleStores.length === 0 ? (
          <div className="space-y-3 px-3 py-5">
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
              <p className="text-sm font-semibold text-foreground">{t('youDoNotHaveStoresYet')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('createFirstStore')}</p>
            </div>
            {canCreateStore && (
              <Button asChild className="h-10 w-full rounded-full">
                <Link href="/dashboard/stores">
                  <Plus className="h-4 w-4" />
                  {t('createStore')}
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto py-1">
            {showAllStores && (
              <DropdownMenuItem
                onClick={() => setSelectedStoreId(null)}
                className={cn('cursor-pointer rounded-xl px-3 py-3', !selectedStoreId && 'bg-primary/5 text-primary')}
              >
                <StoreIcon className="h-4 w-4" />
                <span className="flex-1 font-semibold">{t('allStores')}</span>
                {!selectedStoreId && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            )}

            {filteredStores.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm font-medium text-muted-foreground">
                {t('noStoresFound')}
              </div>
            ) : (
              filteredStores.map((store) => (
                <DropdownMenuItem
                  key={store.id}
                  onClick={() => handleSelect(store.id)}
                  className={cn('cursor-pointer rounded-xl px-3 py-3', selectedStoreId === store.id && 'bg-primary/5 text-primary')}
                >
                  <StoreAvatar name={store.name || store.slug} logoUrl={store.logoUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{store.name || store.slug}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">/{store.slug}</span>
                  </span>
                  <Badge variant={store.isActive ? 'default' : 'secondary'} className="rounded-full px-2 py-0 text-[10px]">
                    {store.isActive ? t('active') : t('inactive')}
                  </Badge>
                  {selectedStoreId === store.id && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              ))
            )}
          </div>
        )}

        {canCreateStore && accessibleStores.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer rounded-xl px-3 py-3 font-semibold">
              <Link href="/dashboard/stores">
                <Plus className="h-4 w-4" />
                {t('createStore')}
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function StoreAvatar({ name, logoUrl, isLoading = false }: { name: string; logoUrl?: string | null; isLoading?: boolean }) {
  const fallback = name.trim().slice(0, 1).toUpperCase() || 'S'

  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-primary/10 text-xs font-bold text-primary">
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : logoUrl ? (
        <img src={logoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        fallback
      )}
    </span>
  )
}
