'use client'

import { useState } from 'react'
import { useData } from '@/lib/data-context'
import { useTranslations } from '@/hooks/use-translations'
import type { User, SubscriptionPlan } from '@/lib/types'
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
import { MoreHorizontal, Search, Plus, Edit, Trash2, UserCheck, UserX, Store, CreditCard } from 'lucide-react'
import { PLAN_PRICES } from '@/lib/types'

const planColors: Record<SubscriptionPlan, string> = {
  starter: 'bg-muted text-muted-foreground',
  pro: 'bg-primary/10 text-primary border-primary/20',
  business: 'bg-accent/10 text-accent border-accent/20',
  enterprise: 'bg-warning/10 text-warning border-warning/20',
  test: 'bg-muted text-muted-foreground border-dashed',
  custom: 'bg-info/10 text-info border-info/20',
}

export function UsersTable() {
  const { t } = useTranslations()
  const { 
    users, 
    subscriptions, 
    stores, 
    addUser, 
    updateUser, 
    deleteUser,
    addSubscription,
    getStoresByUserId,
    getSubscriptionByUserId,
  } = useData()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    isActive: true,
  })
  const [isSaving, setIsSaving] = useState(false)
  
  const [subscriptionForm, setSubscriptionForm] = useState<{
    plan: SubscriptionPlan
    duration: 'monthly' | 'yearly'
  }>({
    plan: 'starter',
    duration: 'monthly',
  })

  // Filter only store owners and map with subscription data
  const storeOwners = users
    .filter(u => u.role === 'store_owner' || u.role === 'user')
    .map(user => {
      const sub = getSubscriptionByUserId(user.id)
      return {
        ...user,
        subscriptionPlan: sub?.planId || 'starter',
        subscriptionStatus: sub?.status || 'active',
        subscriptionEndDate: sub?.endDate || ''
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
    })
    
    if (success) {
      setIsAddDialogOpen(false)
      resetForm()
    }
    setIsSaving(false)
  }

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Keep empty when editing
      isActive: user.isActive,
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = () => {
    if (selectedUser) {
      updateUser(selectedUser.id, formData)
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
    setSelectedUser(user)
    const currentSub = getSubscriptionByUserId(user.id)
    if (currentSub) {
      setSubscriptionForm({
        plan: currentSub.planId as SubscriptionPlan,
        duration: 'monthly',
      })
    }
    setIsSubscriptionDialogOpen(true)
  }

  const handleSaveSubscription = () => {
    if (selectedUser) {
      const startDate = new Date()
      const endDate = new Date()
      if (subscriptionForm.duration === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1)
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1)
      }
      
      const prices = PLAN_PRICES[subscriptionForm.plan]
      
      addSubscription({
        userId: selectedUser.id,
        planId: subscriptionForm.plan,
        status: 'active',
        isActive: true,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        monthlyPrice: prices.monthly,
        yearlyPrice: prices.yearly,
      })
      
      setIsSubscriptionDialogOpen(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 me-2" />
              {t('add')} User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('add')} User</DialogTitle>
              <DialogDescription>
                Create a new store owner account
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
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Set account password"
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
              <p className="text-sm text-muted-foreground">
                The user can log in immediately after you save.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleAdd} disabled={isSaving}>
                {isSaving ? 'Creating...' : t('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>User</TableHead>
              <TableHead>{t('email')}</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead className="text-center">{t('stores')}</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-end">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
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
                            Manage Subscription
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                            {user.isActive ? (
                              <>
                                <UserX className="h-4 w-4 me-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 me-2" />
                                Activate
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
            <DialogTitle>{t('edit')} User</DialogTitle>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSaveEdit}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Dialog */}
      <Dialog open={isSubscriptionDialogOpen} onOpenChange={setIsSubscriptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Subscription</DialogTitle>
            <DialogDescription>
              Assign or update subscription for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select 
                value={subscriptionForm.plan} 
                onValueChange={(v) => setSubscriptionForm({ ...subscriptionForm, plan: v as SubscriptionPlan })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter - $10/mo or $100/yr</SelectItem>
                  <SelectItem value="pro">Pro - $25/mo or $250/yr</SelectItem>
                  <SelectItem value="business">Business - $50/mo or $500/yr</SelectItem>
                  <SelectItem value="enterprise">Enterprise - Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select 
                value={subscriptionForm.duration} 
                onValueChange={(v) => setSubscriptionForm({ ...subscriptionForm, duration: v as 'monthly' | 'yearly' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly (2 months free)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">Plan Details:</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>Stores: {subscriptionForm.plan === 'starter' ? '1' : subscriptionForm.plan === 'pro' ? '3' : subscriptionForm.plan === 'business' ? '10' : 'Unlimited'}</li>
                <li>Products/Store: {subscriptionForm.plan === 'starter' ? '50' : subscriptionForm.plan === 'pro' ? '300' : 'Unlimited'}</li>
                <li>Storage: {subscriptionForm.plan === 'starter' ? '5GB' : subscriptionForm.plan === 'pro' ? '20GB' : subscriptionForm.plan === 'business' ? '100GB' : 'Unlimited'}</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubscriptionDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSaveSubscription}>Assign Subscription</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
