'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/hooks/use-translations'
import { useData } from '@/lib/data-context'
import { DashboardHeader } from '@/components/dashboard/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
    <div className="min-h-screen">
      <DashboardHeader title={t('subscriptions')} />
      
      <div className="p-4 md:p-6 space-y-6">
        {/* Revenue Stats */}
        <div className="grid gap-4 sm:grid-cols-5">
          <Card className="sm:col-span-2">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-success/10">
                <CreditCard className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Recurring Revenue</p>
                <p className="text-2xl font-bold">${totalMRR}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <p className="text-2xl font-bold">{activeSubscriptions.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Plan Distribution</p>
              <div className="flex gap-2 flex-wrap">
                {dbPlans.map(p => (
                  <Badge key={p.id} variant={p.code === 'pro' ? 'default' : 'secondary'}>
                    {planCounts[p.code] || 0} {p.name ? p.name.split(' ')[0] : ''}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plans Grid */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Available Plans</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {dbPlans.map((p) => {
              const planInfo = plans.find(pl => pl.plan === p.code)
              return (
                <Card key={p.id} className={cn('relative', planColors[p.code], p.code === 'pro' && 'border-2')}>
                  {p.code === 'pro' && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div>
                      <CardTitle>{p.name}</CardTitle>
                      <CardDescription>
                        <span className="text-2xl font-bold text-foreground">${Number(p.price).toLocaleString()}</span>
                        <span className="text-muted-foreground text-xs ml-1">/{p.duration_days} days</span>
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingPlan(p)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {planInfo && (
                      <ul className="space-y-2 mb-4">
                        {planInfo.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Check className="h-4 w-4 text-success shrink-0 mt-0.5 opacity-50" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        {planCounts[p.code] || 0} active {planCounts[p.code] === 1 ? 'subscriber' : 'subscribers'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Edit Plan Dialog */}
        <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Subscription Plan</DialogTitle>
              <DialogDescription>
                Modify the pricing and duration for the {editingPlan?.name} plan.
              </DialogDescription>
            </DialogHeader>
            {editingPlan && (
              <div className="space-y-4 py-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Plan Name</Label>
                    <Input 
                      value={editingPlan.name} 
                      onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Price ($)</Label>
                    <Input 
                      type="number" 
                      value={editingPlan.price} 
                      onChange={(e) => setEditingPlan({...editingPlan, price: Number(e.target.value)})} 
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Duration (Days)</Label>
                    <Input 
                      type="number" 
                      value={editingPlan.duration_days} 
                      onChange={(e) => setEditingPlan({...editingPlan, duration_days: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={editingPlan.status}
                      onChange={(e) => setEditingPlan({...editingPlan, status: e.target.value as any})}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Storage (GB)</Label>
                    <Input 
                      type="number" 
                      value={editingPlan.storage_gb} 
                      onChange={(e) => setEditingPlan({...editingPlan, storage_gb: Number(e.target.value)})} 
                    />
                    <p className="text-[10px] text-muted-foreground">-1 for unlimited</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Stores Limit</Label>
                    <Input 
                      type="number" 
                      value={editingPlan.stores_limit} 
                      onChange={(e) => setEditingPlan({...editingPlan, stores_limit: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Products Limit</Label>
                    <Input 
                      type="number" 
                      value={editingPlan.products_limit} 
                      onChange={(e) => setEditingPlan({...editingPlan, products_limit: Number(e.target.value)})} 
                    />
                    <p className="text-[10px] text-muted-foreground">-1 for unlimited</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingPlan(null)}>Cancel</Button>
              <Button onClick={handleUpdatePlan} disabled={isUpdatingPlan}>
                {isUpdatingPlan ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Check className="h-4 w-4 me-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manage Subscriptions Table */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">{language === 'en' ? 'Manage All Subscriptions' : 'إدارة جميع الاشتراكات'}</h2>
          <SubscriptionsTable />
        </div>
      </div>
    </div>
  )
}
