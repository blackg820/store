'use client'

import { useState } from 'react'
import { useData } from '@/lib/data-context'
import { useTranslations } from '@/hooks/use-translations'
import { useAuth } from '@/lib/auth-context'
import type { Subscription, SubscriptionPlan } from '@/lib/types'
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
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { MoreHorizontal, Search, ShieldCheck, ShieldAlert, Edit, Calendar, User as UserIcon } from 'lucide-react'

export function SubscriptionsTable() {
  const { t } = useTranslations()
  const { language } = useAuth()
  const { subscriptions, updateSubscription } = useData()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  
  const [editPlan, setEditPlan] = useState<SubscriptionPlan>('starter')
  const [editStatus, setEditStatus] = useState<'active' | 'past_due' | 'canceled' | 'trialing'>('active')
  const [editEndDate, setEditEndDate] = useState('')

  const filteredSubs = (subscriptions || []).filter(sub => {
    if (!sub) return false
    const searchLower = searchQuery.toLowerCase()
    const userName = (sub as any).userName?.toLowerCase() || ''
    const userEmail = (sub as any).userEmail?.toLowerCase() || ''
    const userId = (sub.userId || '').toLowerCase()
    const planId = (sub.planId || '').toLowerCase()

    return (
      userName.includes(searchLower) ||
      userEmail.includes(searchLower) ||
      userId.includes(searchLower) ||
      planId.includes(searchLower)
    )
  })

  const handleEdit = (sub: Subscription) => {
    setSelectedSub(sub)
    setEditPlan(sub.planId)
    setEditStatus(sub.status)
    setEditEndDate(sub.endDate ? sub.endDate.split('T')[0] : new Date().toISOString().split('T')[0])
    setIsEditDialogOpen(true)
  }

  const handleSave = () => {
    if (selectedSub) {
      updateSubscription(selectedSub.id, {
        planId: editPlan,
        status: editStatus,
        endDate: new Date(editEndDate).toISOString()
      })
      setIsEditDialogOpen(false)
    }
  }

  const toggleStatus = (sub: Subscription) => {
    updateSubscription(sub.id, {
      status: sub.status === 'active' ? 'canceled' : 'active'
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={language === 'en' ? 'Search subscribers...' : 'بحث في المشتركين...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>{language === 'en' ? 'User' : 'المستخدم'}</TableHead>
                <TableHead>{language === 'en' ? 'Plan' : 'الخطة'}</TableHead>
                <TableHead>{language === 'en' ? 'Status' : 'الحالة'}</TableHead>
                <TableHead>{language === 'en' ? 'Expiry Date' : 'تاريخ الانتهاء'}</TableHead>
                <TableHead className="text-end">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t('noData')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubs.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{(sub as any).userName || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{(sub as any).userEmail || sub.userId}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {sub.planId}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          'capitalize',
                          sub.status === 'active' ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'
                        )}
                      >
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'N/A'}
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
                          <DropdownMenuItem onClick={() => handleEdit(sub)}>
                            <Edit className="h-4 w-4 me-2" />
                            {language === 'en' ? 'Manage Account' : 'إدارة الحساب'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleStatus(sub)}>
                            {sub.status === 'active' ? (
                              <>
                                <ShieldAlert className="h-4 w-4 me-2 text-destructive" />
                                <span className="text-destructive">Deactivate</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="h-4 w-4 me-2 text-success" />
                                <span className="text-success">Activate</span>
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'en' ? 'Manage Subscription' : 'إدارة الاشتراك'}</DialogTitle>
            <DialogDescription>
              {language === 'en' ? 'Update plan, status and expiry date for this user.' : 'تحديث الخطة والحالة وتاريخ الانتهاء لهذا المستخدم.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{language === 'en' ? 'Plan' : 'الخطة'}</Label>
              <Select value={editPlan} onValueChange={(v) => setEditPlan(v as SubscriptionPlan)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('status')}</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                  <SelectItem value="trialing">Trialing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === 'en' ? 'Expiry Date' : 'تاريخ الانتهاء'}</Label>
              <div className="relative">
                <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="ps-9"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSave}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
