'use client'

import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/hooks/use-translations'
import { useData } from '@/lib/data-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Check, Shield, Star, Zap, Send, Loader2, Info, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AccessRestricted } from '@/components/dashboard/access-restricted'

export default function BillingPage() {
  const { user, language } = useAuth()
  const { t } = useTranslations()
  const { getSubscriptionByUserId, stores, settings } = useData()

  const subscription = user ? getSubscriptionByUserId(user.id) : undefined

  if (user?.role === 'employee') {
    return (
      <AccessRestricted description="Billing and subscription changes are restricted to store owners and platform admins." />
    )
  }


  return (
    <div className="space-y-12 max-w-[1400px] mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-border pb-8">
        <div className="space-y-1">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-foreground font-heading">
            {t('billing' as any) || 'Billing & Limits'}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base font-medium max-w-2xl leading-relaxed">
            Monitor your account usage, view plan limits, and contact support to upgrade your capacity.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Current Subscription Status */}
        <Card className="lg:col-span-2 border-none shadow-2xl shadow-primary/5 bg-card/50 backdrop-blur-sm rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-10 pb-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-3xl font-black tracking-tight">Account Usage</CardTitle>
                <CardDescription className="text-base font-medium">Overview of your active plan and operational limits</CardDescription>
              </div>
              {subscription?.isActive && (
                <Badge className="bg-success hover:bg-success px-6 py-2 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-success/20">
                  Active
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-10 pt-0 space-y-10">
            {subscription ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 p-8 rounded-[2rem] bg-muted/30 border border-border/50">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Star className="h-5 w-5 text-primary" />
                      </div>
                      <Badge variant="outline" className="px-4 py-1 rounded-full border-primary/20 text-primary font-black uppercase tracking-widest text-[10px]">
                        {subscription.plan?.name || subscription.planCode} Plan
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black tracking-tighter">${subscription.monthlyPrice}</span>
                      <span className="text-muted-foreground text-sm font-bold uppercase tracking-widest opacity-60">/month</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-center sm:text-right">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Next Renewal</p>
                    <p className="text-2xl font-black tracking-tight">{new Date(subscription.endsAt || subscription.endDate || Date.now()).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="grid gap-8 sm:grid-cols-2">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="text-sm font-black uppercase tracking-widest">Stores Usage</span>
                      </div>
                      <span className="text-sm font-bold">{stores.length} / {subscription.plan?.features?.find(f => f.slug === 'stores_limit')?.limit || '∞'}</span>
                    </div>
                    <Progress value={(stores.length / (Number(subscription.plan?.features?.find(f => f.slug === 'stores_limit')?.limit) || 1)) * 100} className="h-3 rounded-full" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        <span className="text-sm font-black uppercase tracking-widest">Storage & Media</span>
                      </div>
                      <span className="text-sm font-bold">Unlimited</span>
                    </div>
                    <Progress value={0} className="h-3 rounded-full" />
                  </div>
                </div>

                <div className="pt-6 border-t border-border/50">
                   <h3 className="text-sm font-black uppercase tracking-widest mb-4">Included Features</h3>
                   <div className="grid gap-3 sm:grid-cols-2">
                      {subscription.plan?.features?.filter(f => f.type === 'boolean' && f.isEnabled).map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm font-medium">
                           <Check className="h-4 w-4 text-success" />
                           <span>{f.name}</span>
                        </div>
                      ))}
                      {!subscription.plan?.features && (
                        <p className="text-xs text-muted-foreground">Detailed feature list for your tier will appear here.</p>
                      )}
                   </div>
                </div>
              </>
            ) : (
              <div className="text-center py-10 space-y-6">
                 <div className="h-20 w-20 rounded-full bg-muted mx-auto flex items-center justify-center">
                    <Shield className="h-10 w-10 text-muted-foreground opacity-30" />
                 </div>
                 <div className="space-y-2">
                    <p className="text-2xl font-black tracking-tight">No Active Subscription</p>
                    <p className="text-muted-foreground font-medium max-w-sm mx-auto">Contact the administrator to activate your store subscription.</p>
                 </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Owner / Upgrade Request */}
        <Card className="border-none shadow-2xl shadow-primary/5 bg-primary text-primary-foreground rounded-[2.5rem] overflow-hidden flex flex-col">
          <CardHeader className="p-10 pb-6">
            <CardTitle className="text-3xl font-black tracking-tight">Need More?</CardTitle>
            <CardDescription className="text-primary-foreground/70 font-medium">Contact the SaaS owner to upgrade your limits or change plans</CardDescription>
          </CardHeader>
          <CardContent className="p-10 pt-0 space-y-8 flex-grow">
            <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center gap-4">
               <div className="h-12 w-16 bg-white/10 rounded-lg flex items-center justify-center">
                  <div className="h-6 w-10 bg-white/20 rounded-sm" />
               </div>
               <div>
                  <p className="font-bold">Manual Billing</p>
                  <p className="text-xs text-white/60 uppercase tracking-widest font-black">Admin Managed</p>
               </div>
            </div>
            <p className="text-sm font-medium leading-relaxed opacity-80">
               Your account limits are managed by the platform owner. If you need more stores, products, or advanced features, reach out via WhatsApp for immediate support.
            </p>
          </CardContent>
          <CardFooter className="p-10 pt-0">
            <Button variant="secondary" className="w-full h-14 rounded-2xl font-black text-primary shadow-xl shadow-black/10 group" asChild>
               <a href={`https://wa.me/${settings.saas_contact_whatsapp?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                  <Send className="h-5 w-5 me-2 group-hover:translate-x-1 transition-transform" />
                  REQUEST UPGRADE
               </a>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Help Banner */}
      <div className="p-10 rounded-[3rem] bg-muted/30 border border-border/50 flex flex-col md:flex-row items-center justify-between gap-8">
         <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-3xl bg-background flex items-center justify-center shadow-lg">
               <Info className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1 text-center md:text-left">
               <h3 className="text-2xl font-black tracking-tight">Billing Questions?</h3>
               <p className="text-muted-foreground font-medium">For invoice history or payment adjustments, please contact our support team.</p>
            </div>
         </div>
         <Button variant="outline" className="h-14 px-10 rounded-2xl border-2 font-black tracking-widest hover:bg-primary hover:text-primary-foreground transition-all" asChild>
            <a href={`https://wa.me/${settings.saas_contact_whatsapp?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
               SUPPORT CENTER
            </a>
         </Button>
      </div>
    </div>
  )
}
