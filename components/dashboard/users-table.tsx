'use client'

import { useEffect, useMemo, useState } from 'react'
import { useData } from '@/lib/data-context'
import { useTranslations } from '@/hooks/use-translations'
import type { User, SubscriptionPlan, UserLimit } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { MoreHorizontal, Search, Plus, Edit, Trash2, UserCheck, UserX, Store, CreditCard, Calculator } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'

const planColors: Record<SubscriptionPlan, string> = {
  starter: 'bg-muted text-muted-foreground',
  pro: 'bg-primary/10 text-primary border-primary/20',
  business: 'bg-accent/10 text-accent border-accent/20',
  enterprise: 'bg-warning/10 text-warning border-warning/20',
  test: 'bg-muted text-muted-foreground border-dashed',
  custom: 'bg-info/10 text-info border-info/20',
  unlimited: 'bg-success/10 text-success border-success/20',
}

interface PriceEstimate {
  currency: string
  interval: string
  totalCents: number
  basePriceCents: number
  lines: Array<{
    type: string
    feature?: string
    label: string
    quantity: number
    unitPriceCents: number
    amountCents: number
  }>
}

const defaultQuantities = {
  max_stores: 1,
  max_products: 50,
  max_employees: 0,
  storage_gb: 5,
  telegram_bots: 0,
  integrations_count: 0,
  custom_domains: 0,
}

const defaultPricing = {
  price_per_store: 0,
  price_per_product: 0,
  price_per_employee: 0,
  price_per_storage_gb: 0,
  price_per_telegram_bot: 0,
  price_per_integration: 0,
  price_per_custom_domain: 0,
}

type LimitKey = keyof typeof defaultQuantities
type PricingKey = keyof typeof defaultPricing

const limitFields: Array<{ limit: LimitKey; price: PricingKey; labelKey: string }> = [
  { limit: 'max_stores', price: 'price_per_store', labelKey: 'maxStores' },
  { limit: 'max_products', price: 'price_per_product', labelKey: 'maxProducts' },
  { limit: 'max_employees', price: 'price_per_employee', labelKey: 'maxEmployees' },
  { limit: 'storage_gb', price: 'price_per_storage_gb', labelKey: 'storageGb' },
  { limit: 'telegram_bots', price: 'price_per_telegram_bot', labelKey: 'telegramBots' },
  { limit: 'integrations_count', price: 'price_per_integration', labelKey: 'integrationsCount' },
  { limit: 'custom_domains', price: 'price_per_custom_domain', labelKey: 'customDomains' },
]

const formatMoney = (cents = 0, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100)

export function UsersTable() {
  const { t } = useTranslations()
  const {
    users,
    stores,
    addUser,
    updateUser,
    deleteUser,
    getStoresByUserId,
    isDataLoading,
  } = useData()

  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    isActive: true,
    basePriceCents: 0,
    currency: 'USD',
    limits: defaultQuantities,
    pricing: defaultPricing,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(null)
  const [isPriceLoading, setIsPriceLoading] = useState(false)

  // Mapping for limit labels
  const limitLabelMap: Record<string, string> = {
    max_stores: t('maxStores'),
    max_products: t('maxProducts'),
    max_employees: t('maxEmployees'),
    storage_gb: t('storageGb'),
    telegram_bots: t('telegramBots'),
    integrations_count: t('integrationsCount'),
    custom_domains: t('customDomains'),
  }

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setIsPriceLoading(true)
      try {
        const res = await apiClient.post<{ success: boolean; data?: PriceEstimate; error?: string }>('/api/v1/billing/calculate', {
          limits: formData.limits,
          pricing: formData.pricing,
          basePriceCents: formData.basePriceCents,
          currency: formData.currency,
        }, { storeId: null })

        if (res.success && res.data) {
          setPriceEstimate(res.data)
        } else {
          setPriceEstimate(null)
        }
      } catch (error) {
        setPriceEstimate(null)
      } finally {
        setIsPriceLoading(false)
      }
    }, 250)

    return () => window.clearTimeout(timer)
  }, [formData.basePriceCents, formData.currency, formData.limits, formData.pricing])

  // Filter only store owners and map with subscription data
  const storeOwners = users
    .filter(u => u.role === 'store_owner' || u.role === 'user')
    .map(user => {
      return {
        ...user,
        subscriptionPlan: 'custom',
        subscriptionStatus: user.userLimit ? t('customLimits') : t('noData'),
        subscriptionEndDate: ''
      }
    })

  let filteredUsers = storeOwners

  if (searchQuery) {
    filteredUsers = filteredUsers.filter(u =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      isActive: true,
      basePriceCents: 0,
      currency: 'USD',
      limits: defaultQuantities,
      pricing: defaultPricing,
    })
  }

  const handleAdd = async () => {
    if (!formData.name || !formData.email || !formData.password) return

    setIsSaving(true)
    const success = await addUser({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: 'store_owner',
      isActive: formData.isActive,
      mode: 'controlled',
      limits: formData.limits,
      pricing: formData.pricing,
      basePriceCents: formData.basePriceCents,
      currency: formData.currency,
    })

    if (success) {
      setIsAddDialogOpen(false)
      resetForm()
    }
    setIsSaving(false)
  }

  const handleEdit = (user: User) => {
    const userLimit = user.userLimit
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Keep empty when editing
      isActive: user.isActive,
      basePriceCents: userLimit?.basePriceCents ?? 0,
      currency: userLimit?.currency ?? 'USD',
      limits: { ...defaultQuantities, ...(userLimit?.limits ?? {}) },
      pricing: { ...defaultPricing, ...(userLimit?.pricing ?? {}) },
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (selectedUser) {
      updateUser(selectedUser.id, formData)
      try {
        await apiClient.put(`/api/v1/admin/users/${selectedUser.id}/limits`, {
          limits: formData.limits,
          pricing: formData.pricing,
          basePriceCents: formData.basePriceCents,
          currency: formData.currency,
        })
        toast.success(t('settingsSaved'))
      } catch (error) {
        toast.error(t('settingsSaveFailed'))
      }
      setIsEditDialogOpen(false)
      resetForm()
    }
  }

  const handleDelete = (userId: string) => {
    if (confirm(t('areYouSure'))) {
      deleteUser(userId)
    }
  }

  const handleToggleActive = (user: User) => {
    updateUser(user.id, { isActive: !user.isActive })
  }

  const handleManageSubscription = (user: User) => {
    handleEdit(user)
  }

  const priceLineLabel = (line: PriceEstimate['lines'][number]) => {
    const field = limitFields.find((item) => item.limit === line.feature)
    if (field) return t(field.labelKey)
    if (line.type === 'base') return t('basePrice')
    return line.label
  }

  const renderLimitCalculator = () => (
    <div className="grid gap-6 rounded-[2rem] border border-white/5 bg-white/5 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary shadow-lg shadow-primary/10">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-widest">{t('customLimitCalculator')}</p>
            <p className="text-[10px] font-bold text-muted-foreground opacity-60 uppercase tracking-tighter">SaaS Pricing Engine</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="basePriceCents" className="text-[10px] font-black uppercase tracking-widest opacity-60 ps-1">{t('basePrice')}</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold opacity-30">$</span>
            <Input
              id="basePriceCents"
              type="number"
              min={0}
              value={Math.round(formData.basePriceCents / 100)}
              onChange={(event) => setFormData({
                ...formData,
                basePriceCents: Number(event.target.value || 0) * 100,
              })}
              className="h-12 ps-8 rounded-xl bg-white/5 border-white/5 focus:bg-white/10 transition-all font-bold"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency" className="text-[10px] font-black uppercase tracking-widest opacity-60 ps-1">{t('currency')}</Label>
          <Input
            id="currency"
            maxLength={3}
            value={formData.currency}
            onChange={(event) => setFormData({ ...formData, currency: event.target.value.toUpperCase() })}
            className="h-12 rounded-xl bg-white/5 border-white/5 focus:bg-white/10 transition-all font-mono font-black"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {limitFields.map((field) => (
          <div key={field.limit} className="group rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-5 transition-all hover:bg-white/[0.05] hover:border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <Label htmlFor={`limit-${field.limit}`} className="text-[11px] font-black uppercase tracking-widest text-primary/80">{t(field.labelKey)}</Label>
              <div className="h-2 w-2 rounded-full bg-primary/20 group-hover:bg-primary transition-colors" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[9px] font-bold opacity-40 uppercase tracking-tighter ps-1">Limit</p>
                <Input
                  id={`limit-${field.limit}`}
                  type="number"
                  min={0}
                  value={formData.limits[field.limit]}
                  onChange={(event) => setFormData({
                    ...formData,
                    limits: {
                      ...formData.limits,
                      [field.limit]: Number(event.target.value || 0),
                    },
                  })}
                  className="h-10 rounded-xl bg-background/50 border-white/5 focus:border-primary/50 font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-[9px] font-bold opacity-40 uppercase tracking-tighter ps-1">Price/Unit</p>
                <div className="relative">
                  <Input
                    aria-label={`${t('pricePerUnit')} ${t(field.labelKey)}`}
                    type="number"
                    min={0}
                    value={Math.round(formData.pricing[field.price] / 100)}
                    onChange={(event) => setFormData({
                      ...formData,
                      pricing: {
                        ...formData.pricing,
                        [field.price]: Number(event.target.value || 0) * 100,
                      },
                    })}
                    className="h-10 rounded-xl bg-background/50 border-white/5 focus:border-primary/50 font-bold"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[2rem] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 border border-primary/10 shadow-inner">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-[0.2em] opacity-60">{t('estimatedSubscriptionPrice')}</span>
            <p className="text-[10px] font-bold text-muted-foreground opacity-40 uppercase">Dynamic Calculation Result</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black tracking-tighter text-primary">
              {isPriceLoading
                ? '...'
                : formatMoney(priceEstimate?.totalCents || 0, priceEstimate?.currency || formData.currency || 'USD')}
            </span>
            <p className="text-[10px] font-black opacity-40">PER INTERVAL</p>
          </div>
        </div>

        {priceEstimate?.lines?.length ? (
          <div className="mt-6 pt-6 border-t border-white/5 space-y-2">
            {priceEstimate.lines.map((line, index) => (
              <div key={`${line.type}-${line.feature || index}`} className="flex justify-between items-center gap-3 group/line">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 group-hover/line:opacity-100 transition-opacity">
                  {priceLineLabel(line)}{line.quantity > 1 ? ` (x${line.quantity})` : ''}
                </span>
                <span className="text-[11px] font-bold font-mono">
                  {formatMoney(line.amountCents, priceEstimate.currency)}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between glass-card p-4 rounded-2xl border-white/10 shadow-lg">
        <div className="relative w-full sm:w-72 group">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10 bg-white/5 border-white/10 focus:border-primary/50 rounded-xl transition-all h-11"
          />
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 me-2" />
              {t('addUser')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addUser')}</DialogTitle>
              <DialogDescription>
                {t('addBuyerDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={t('setAccountPassword')}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">{t('active')}</Label>
              </div>
              {renderLimitCalculator()}
               <p className="text-sm text-muted-foreground">
                {t('userLogonImmediately')}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleAdd} disabled={isSaving}>
                {isSaving ? t('creating') : t('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-2xl glass-card border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader className="bg-background/95 backdrop-blur-sm border-b border-white/10 shadow-sm">
             <TableRow className="hover:bg-transparent border-none">
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest py-4 ps-6">{t('users')}</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">{t('email')}</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">{t('subscription')}</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest text-center">{t('stores')}</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">{t('status')}</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">{t('expires')}</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest text-end pe-6">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isDataLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent border-b border-border/50">
                  <TableCell className="ps-6"><Skeleton className="w-32 h-5 rounded-lg" /></TableCell>
                  <TableCell><Skeleton className="w-48 h-5 rounded-lg opacity-50" /></TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Skeleton className="w-20 h-6 rounded-full" />
                      <Skeleton className="w-16 h-3 rounded opacity-30" />
                    </div>
                  </TableCell>
                  <TableCell className="text-center"><Skeleton className="w-8 h-8 rounded-lg mx-auto opacity-30" /></TableCell>
                  <TableCell><Skeleton className="w-16 h-6 rounded-full opacity-50" /></TableCell>
                  <TableCell><Skeleton className="w-24 h-5 rounded-lg opacity-30" /></TableCell>
                  <TableCell className="text-end pe-6"><Skeleton className="w-8 h-8 rounded-lg ms-auto opacity-20" /></TableCell>
                </TableRow>
              ))
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {t('noData')}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
                const userStores = getStoresByUserId(user.id)

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <p className="font-medium">{user.name}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{user.email}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <Badge variant="outline" className={cn("w-fit capitalize", planColors[user.subscriptionPlan as SubscriptionPlan])}>
                          {user.subscriptionPlan}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground mt-1 uppercase">
                          {user.subscriptionStatus}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{userStores.length}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'default' : 'secondary'}>
                        {user.isActive ? t('active') : t('inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.subscriptionEndDate ? new Date(user.subscriptionEndDate).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                           <DropdownMenuItem onClick={() => handleEdit(user)}>
                            <Edit className="h-4 w-4 me-2" />
                            {t('edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleManageSubscription(user)}>
                            <CreditCard className="h-4 w-4 me-2" />
                            {t('manageSubscription')}
                          </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                            {user.isActive ? (
                              <>
                                <UserX className="h-4 w-4 me-2" />
                                {t('deactivate')}
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 me-2" />
                                {t('activate')}
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(user.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 me-2" />
                            {t('delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Dialog */}
       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editUser')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">{t('name')}</Label>
              <Input
                id="editName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">{t('email')}</Label>
              <Input
                id="editEmail"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="editIsActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="editIsActive">{t('active')}</Label>
            </div>
            {renderLimitCalculator()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSaveEdit}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
