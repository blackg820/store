'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/hooks/use-translations'
import { useData } from '@/lib/data-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { PLAN_LIMITS, PLAN_PRICES, type SubscriptionPlan } from '@/lib/types'
import { Check, CreditCard, Users, Store, Package, Database, Bell, BarChart3, Settings } from 'lucide-react'
import { SubscriptionsTable } from '@/components/dashboard/subscriptions-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import { Edit2, Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const planColors: Record<string, string> = {
  test: 'border-muted',
  starter: 'border-muted',
  pro: 'border-primary',
  business: 'border-accent',
  enterprise: 'border-warning',
  custom: 'border-accent',
}

interface Plan {
  id: number
  code: string
  name: string
  price: number
  duration_days: number
  status: 'active' | 'inactive'
  storage_gb: number
  stores_limit: number
  products_limit: number
}

export default function SubscriptionsPage() {
  const router = useRouter()
  const { user, language } = useAuth()
  const { t } = useTranslations()
  const { subscriptions, users, refetchAll } = useData()

  const [dbPlans, setDbPlans] = useState<Plan[]>([])
  const [isPlansLoading, setIsPlansLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false)

  // Fetch real plans from DB
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await apiClient.get<any>('/api/v1/admin/plans')
        if (res.success && Array.isArray(res.data)) {
          setDbPlans(res.data)
        }
      } catch (error) {
        console.error('Error fetching plans:', error)
      } finally {
        setIsPlansLoading(false)
      }
    }
    fetchPlans()
  }, [])

  const handleUpdatePlan = async () => {
    if (!editingPlan) return
    setIsUpdatingPlan(true)
    try {
      const res = await apiClient.patch<any>('/api/v1/admin/plans', editingPlan)
      if (res.success) {
        toast.success('Plan updated successfully')
        // Update local state
        setDbPlans(prev => prev.map(p => p.id === editingPlan.id ? editingPlan : p))
        setEditingPlan(null)
      } else {
        toast.error(res.error || 'Failed to update plan')
      }
    } catch (error) {
      toast.error('Network error while updating plan')
    } finally {
      setIsUpdatingPlan(false)
    }
  }

  // Admin only page
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [user, router])

  if (user?.role !== 'admin') {
    return null
  }

  // Calculate stats
  const activeSubscriptions = subscriptions.filter(s => s.isActive)
  const planCounts: Record<string, number> = {}
  dbPlans.forEach(p => {
    planCounts[p.code] = activeSubscriptions.filter(s => s.planId === p.code).length
  })

  const totalMRR = activeSubscriptions.reduce((sum, s) => sum + (Number(s.monthlyPrice) || 0), 0)

  const plans: { plan: SubscriptionPlan; name: string; price: string; features: string[] }[] = [
    {
      plan: 'starter',
      name: 'Starter',
      price: '$10/mo',
      features: [
        '1 Store',
        '50 Products per store',
        '5GB Storage',
        'Images only',
        'Private Telegram chat',
      ],
    },
    {
      plan: 'pro',
      name: 'Pro',
      price: '$25/mo',
      features: [
        '3 Stores',
        '300 Products per store',
        '20GB Storage',
        'Images + Videos',
        'Telegram groups',
        'Product ratings',
        'Discounts',
        'Buyer risk detection',
        'CSV/Excel export',
      ],
    },
    {
      plan: 'business',
      name: 'Business',
      price: '$50/mo',
      features: [
        '10 Stores',
        'Unlimited Products',
        '100GB Storage',
        'Advanced discounts',
        'Advanced analytics',
        'API access',
        'Full audit logs',
        'Priority support',
      ],
    },
    {
      plan: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      features: [
        'Unlimited everything',
        'Full customization',
        'Dedicated server option',
        'Custom integrations',
        '24/7 support',
      ],
    },
  ]

  return (
    <div className="space-y-12 max-w-[1600px] mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-border pb-8">
        <div className="space-y-1">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-foreground font-heading">
            {t('subscriptions')}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base font-medium max-w-2xl leading-relaxed">
            Manage your platform monetization model.
            Configure tier limits, pricing, and monitor active recurring revenue.
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="sm:col-span-2 p-8 rounded-[2rem] border border-border bg-card/30 backdrop-blur-sm flex flex-col justify-between group hover:scale-[1.02] transition-all duration-500 shadow-xl shadow-primary/5">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Monthly Recurring Revenue</span>
            <div className="text-5xl font-black tracking-tighter text-success">${totalMRR}</div>
          </div>
          <div className="flex items-center gap-3 mt-8">
            <div className="h-12 w-12 rounded-2xl bg-success/10 text-success flex items-center justify-center">
              <CreditCard className="h-6 w-6" />
            </div>
            <p className="text-xs font-medium text-muted-foreground opacity-60 max-w-[150px]">
              Total projected monthly revenue across all active tiers.
            </p>
          </div>
        </div>

        <div className="p-8 rounded-[2rem] border border-border bg-card/30 backdrop-blur-sm flex flex-col justify-between group hover:scale-[1.03] transition-all duration-500">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Active Subscriptions</span>
            <div className="text-4xl font-black tracking-tighter">{activeSubscriptions.length}</div>
          </div>
          <div className="flex items-center gap-3 mt-8">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-xs font-medium text-muted-foreground opacity-60">Paying customers</p>
          </div>
        </div>

        <div className="p-8 rounded-[2rem] border border-border bg-card/30 backdrop-blur-sm flex flex-col justify-between group hover:scale-[1.03] transition-all duration-500">
          <div className="space-y-1 mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Plan Distribution</span>
          </div>
          <div className="flex flex-col gap-2">
            {dbPlans.slice(0, 4).map(p => (
              <div key={p.id} className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase opacity-50 tracking-widest">{p.name}</span>
                <Badge variant={p.code === 'pro' ? 'default' : 'outline'} className="rounded-full text-[10px] h-5 min-w-[30px] flex justify-center border-border/50">
                  {planCounts[p.code] || 0}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-8 w-1.5 rounded-full bg-primary" />
          <h2 className="text-2xl font-black tracking-tight">Available Subscription Tiers</h2>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {dbPlans.map((p) => {
            const planInfo = plans.find(pl => pl.plan === p.code)
            return (
              <Card key={p.id} className={cn(
                'relative border-none shadow-xl transition-all duration-500 rounded-[2.5rem] overflow-hidden bg-card/40 backdrop-blur-md',
                p.code === 'pro' && 'ring-2 ring-primary shadow-primary/20 scale-[1.05] z-10'
              )}>
                {p.code === 'pro' && (
                  <div className="absolute top-0 right-0 p-6 ps-10 pb-10 bg-primary/10 rounded-bl-[4rem]">
                    <Badge className="bg-primary text-primary-foreground font-black text-[10px] uppercase tracking_widest px-3 py-1">Best Value</Badge>
                  </div>
                )}
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <CardTitle className="text-xl font-black tracking-tighter">{p.name}</CardTitle>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/5" onClick={() => setEditingPlan(p)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-foreground tracking-tighter">${Number(p.price).toLocaleString('en-US')}</span>
                    <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-60">/{p.duration_days} days</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-4">
                  {planInfo && (
                    <ul className="space-y-4 mb-8">
                      {planInfo.features.slice(0, 6).map((feature, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm font-medium text-muted-foreground leading-relaxed">
                          <div className="h-5 w-5 rounded-full bg-success/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="h-3 w-3 text-success" />
                          </div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="pt-6 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-6 w-6 rounded-full border-2 border-card bg-muted" />
                        ))}
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                        {planCounts[p.code] || 0} Platform Active
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Edit Plan Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
        <DialogContent className="rounded-[2rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">Edit Subscription Plan</DialogTitle>
            <DialogDescription className="font-medium">
              Modify the pricing and duration for the {editingPlan?.name} plan.
            </DialogDescription>
          </DialogHeader>
          {editingPlan && (
            <div className="space-y-6 py-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-1">Plan Name</Label>
                  <Input
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-1">Monthly Price ($)</Label>
                  <Input
                    type="number"
                    value={editingPlan.price}
                    onChange={(e) => setEditingPlan({...editingPlan, price: Number(e.target.value)})}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-1">Duration (Days)</Label>
                  <Input
                    type="number"
                    value={editingPlan.duration_days}
                    onChange={(e) => setEditingPlan({...editingPlan, duration_days: Number(e.target.value)})}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-1">Status</Label>
                  <Select
                    value={editingPlan.status}
                    onValueChange={(v) => setEditingPlan({...editingPlan, status: v as any})}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="active" className="rounded-lg">Active</SelectItem>
                      <SelectItem value="inactive" className="rounded-lg">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dynamic Features Edit */}
              <div className="space-y-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-1 rounded-full bg-primary" />
                  <h3 className="text-sm font-black uppercase tracking-widest">Plan Features & Limits</h3>
                </div>

                <div className="grid gap-4 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                  {(editingPlan as any).features?.map((feature: any) => (
                    <div key={feature.slug} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
                      <div className="space-y-0.5">
                        <span className="text-sm font-bold tracking-tight">{feature.name}</span>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.1em]">{feature.type}</p>
                      </div>

                      {feature.type === 'boolean' ? (
                        <Switch
                          checked={feature.isEnabled}
                          onCheckedChange={(checked: boolean) => {
                            const newFeatures = (editingPlan as any).features.map((f: any) =>
                              f.slug === feature.slug ? { ...f, isEnabled: checked } : f
                            );
                            setEditingPlan({ ...editingPlan, features: newFeatures } as any);
                          }}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={feature.limit ?? ''}
                            placeholder="∞"
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : Number(e.target.value);
                              const newFeatures = (editingPlan as any).features.map((f: any) =>
                                f.slug === feature.slug ? { ...f, limit: val } : f
                              );
                              setEditingPlan({ ...editingPlan, features: newFeatures } as any);
                            }}
                            className="w-20 h-9 rounded-lg text-center font-bold"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingPlan(null)} className="h-12 rounded-xl px-8 font-bold transition-all">Cancel</Button>
            <Button onClick={handleUpdatePlan} disabled={isUpdatingPlan} className="h-12 rounded-xl px-8 font-bold shadow-xl shadow-primary/20 transition-all hover:scale-105">
              {isUpdatingPlan ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Check className="h-4 w-4 me-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Subscriptions Table */}
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1.5 rounded-full bg-accent" />
          <h2 className="text-2xl font-black tracking-tight">{language === 'en' ? 'Manage All Subscriptions' : 'إدارة جميع الاشتراكات'}</h2>
        </div>
        <SubscriptionsTable />
      </div>
    </div>
  )
}
