'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/hooks/use-translations'
import { useData } from '@/lib/data-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { PLAN_LIMITS, type SubscriptionPlan } from '@/lib/types'
import { User, Send, Globe, Shield, CreditCard, Loader2, Check, Upload, Link as LinkIcon, MessageCircle, Copy, ExternalLink, Store, Bell, Info, Truck } from 'lucide-react'
import { AlWaseetSettings } from '@/components/dashboard/alwaseet-settings'
import { AlWaseetInvoicesTable } from '@/components/dashboard/invoices-table'
import { StoreDomainPanel } from '@/components/dashboard/store-domain-panel'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { user, language, setLanguage, updateUser, logout } = useAuth()
  const { t } = useTranslations()
  const { getSubscriptionByUserId, getStoresByUserId, stores, updateStore, settings, selectedStoreId } = useData()

  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  const isAdmin = user?.role === 'admin'
  const subscription = user ? getSubscriptionByUserId(user.id) : undefined
  const userStores = user ? getStoresByUserId(user.id) : []
  const planLimits = isAdmin ? PLAN_LIMITS.unlimited : (subscription?.planCode ? PLAN_LIMITS[subscription.planCode] : null)

  // Using selectedStoreId from context instead of local state
  const [defaultLanguage, setDefaultLanguage] = useState<'ar' | 'en' | 'ku'>('ar')
  const [telegramUserId, setTelegramUserId] = useState('')
  const [telegramGroupId, setTelegramGroupId] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [notificationSettings, setNotificationSettings] = useState({
    newOrders: true,
    orderConfirmations: true,
    statusChanges: true,
    riskAlerts: true
  })

  const selectedStoreData = stores.find(s => s.id === selectedStoreId)

  // Initial sync removed as we use global selectedStoreId directly

  // Sync state when store changes
  useEffect(() => {
    if (selectedStoreData) {
      setTelegramUserId(selectedStoreData.telegramUserId || '')
      setTelegramGroupId(selectedStoreData.telegramGroupId || '')
      setDefaultLanguage(selectedStoreData.defaultLanguage || 'ar')
      setNotificationSettings(selectedStoreData.notificationSettings || {
        newOrders: true,
        orderConfirmations: true,
        statusChanges: true,
        riskAlerts: true
      })
    }
  }, [selectedStoreData])

  const handleConnect = async (type: 'user' | 'group' | 'channel') => {
    if (!selectedStoreId) return
    setIsConnecting(true)
    try {
      const res = await fetch('/api/v1/telegram/link-bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('storify_access_token')}`
        },
        body: JSON.stringify({ storeId: selectedStoreId, type })
      })
      const data = await res.json()
      if (data.success && data.deeplink) {
        window.location.href = data.deeplink
        toast.info(t('followInstructionsInTelegram'))
      } else {
        toast.error(data.error || 'Failed to generate link')
      }
    } catch (error) {
      toast.error('Network error')
    } finally {
      setIsConnecting(false)
    }
  }

  const saveTelegramSettings = () => {
    if (selectedStoreId) {
      updateStore(selectedStoreId, {
        telegramUserId: telegramUserId || undefined,
        telegramGroupId: telegramGroupId || undefined,
        notificationSettings: {
          ...notificationSettings,
          notificationMethod: (selectedStoreData?.notificationSettings as any)?.notificationMethod || 'telegram'
        }
      })
      toast.success(t('settingsSaved' as any))
    }
  }

  const handleSaveProfile = async () => {
    if (!name || !email) return
    setIsUpdatingProfile(true)
    try {
      const res = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('storify_access_token')}`
        },
        body: JSON.stringify({ name, email })
      })
      const data = await res.json()
      if (data.success) {
        updateUser({ name, email })
        toast.success(t('profileUpdated' as any) || 'Profile updated successfully')
      } else {
        toast.error(data.error || 'Failed to update profile')
      }
    } catch (error) {
      toast.error('Network error')
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t('allFieldsRequired' as any))
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordsDontMatch' as any) || 'Passwords do not match')
      return
    }
    setIsUpdatingPassword(true)
    try {
      const res = await fetch('/api/v1/profile/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('storify_access_token')}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message || t('passwordUpdated' as any) || 'Password updated successfully')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        logout()
      } else {
        toast.error(data.error || 'Failed to update password')
      }
    } catch (error) {
      toast.error('Network error')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  return (
    <div className="space-y-12 max-w-[1600px] mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-border pb-8">
        <div className="space-y-1">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-foreground font-heading">
            {t('settings')}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base font-medium max-w-2xl leading-relaxed">
            Manage your account preferences, security, and store-specific notifications.
            Configure your SaaS branding and Telegram integration.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent border-b border-border w-full justify-start rounded-none pb-0 mb-8 overflow-x-auto no-scrollbar">
            <TabsTrigger
              value="profile"
              className="px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-sm transition-all"
            >
              <User className="h-4 w-4 me-2" />
              {t('profile' as any)}
            </TabsTrigger>
            <TabsTrigger
              value="telegram"
              className="px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-sm transition-all"
            >
              <Send className="h-4 w-4 me-2" />
              {t('telegram' as any)}
            </TabsTrigger>
            {!isAdmin && (
              <TabsTrigger
                value="subscription"
                className="px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-sm transition-all"
              >
                <CreditCard className="h-4 w-4 me-2" />
                {t('subscription' as any)}
              </TabsTrigger>
            )}
            <TabsTrigger
              value="preferences"
              className="px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-sm transition-all"
            >
              <Globe className="h-4 w-4 me-2" />
              {t('preferences' as any)}
            </TabsTrigger>
            <TabsTrigger
              value="domains"
              className="px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-sm transition-all"
            >
              <LinkIcon className="h-4 w-4 me-2" />
              Domains
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-sm transition-all"
            >
              <Shield className="h-4 w-4 me-2" />
              {t('security' as any)}
            </TabsTrigger>
            <TabsTrigger
              value="alwaseet"
              className="px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-sm transition-all"
            >
              <Truck className="h-4 w-4 me-2" />
              {t('alwaseetIntegration' as any)}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger
                value="saas"
                className="px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-sm transition-all"
              >
                <Shield className="h-4 w-4 me-2" />
                {t('saasSettings' as any)}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-none shadow-xl shadow-primary/5 bg-card/50 backdrop-blur-sm rounded-[2rem] overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-2xl font-black tracking-tight">{t('profileInfo' as any)}</CardTitle>
                <CardDescription className="text-sm font-medium">{t('updateAccountDetails' as any)}</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-8">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-1">{t('name')}</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-1">{t('email')}</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'} className="px-4 py-1.5 rounded-full font-bold">
                    {user?.role === 'admin' ? t('administrator' as any) : t('storeOwner' as any)}
                  </Badge>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20 px-4 py-1.5 rounded-full font-bold">
                    {t('active')}
                  </Badge>
                </div>
                <Button onClick={handleSaveProfile} disabled={isUpdatingProfile} className="h-12 px-10 rounded-xl font-bold">
                  {isUpdatingProfile && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                  {t('save')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-none shadow-xl shadow-primary/5 bg-card/50 backdrop-blur-sm rounded-[2rem] overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-2xl font-black tracking-tight">{t('changePassword' as any)}</CardTitle>
                <CardDescription className="text-sm font-medium">{t('updatePasswordDesc' as any)}</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-1">{t('currentPassword' as any)}</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-1">{t('newPassword' as any)}</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-1">{t('confirmPassword' as any)}</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>
                <Button onClick={handleUpdatePassword} disabled={isUpdatingPassword} className="h-12 px-10 rounded-xl font-bold mt-4">
                  {isUpdatingPassword && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                  {t('changePassword' as any)}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="telegram" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-none shadow-xl shadow-primary/5 bg-card/50 backdrop-blur-sm rounded-[2rem] overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-2xl font-black tracking-tight">{t('telegramSettings')}</CardTitle>
                <CardDescription className="text-sm font-medium">{t('configureTelegram' as any)}</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-10">
                {(!isAdmin && userStores.length === 0) || (isAdmin && stores.length === 0) ? (
                  <p className="text-muted-foreground">{t('noStoresYet' as any)}</p>
                ) : (
                  <>
                    {/* Local store selector removed in favor of global topbar selector */}

                    <div className="space-y-6 p-6 rounded-2xl bg-primary/5 border border-primary/10">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-8 w-1.5 rounded-full bg-primary" />
                        <p className="text-sm font-black uppercase tracking-widest">{t('botConfiguration')}</p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed px-1">
                        {t('botTokenManagedByPlatform')}
                      </p>
                    </div>

                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                      <Card className={cn("relative overflow-hidden border-2 transition-all duration-500 rounded-[1.5rem]", telegramUserId ? "border-success/20 bg-success/5 shadow-lg shadow-success/5" : "border-muted bg-muted/30")}>
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            {telegramUserId && <Badge variant="default" className="bg-success hover:bg-success text-[10px] font-black uppercase tracking-widest">Connected</Badge>}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <CardTitle className="text-lg font-black tracking-tight">{t('privateNotifications' as any) || 'Private Bot'}</CardTitle>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {telegramUserId
                              ? `Linked to Account ID: ${telegramUserId}`
                              : 'Receive order notifications directly in your private Telegram chat for maximum privacy and speed.'}
                          </p>
                          <Button
                            variant={telegramUserId ? "outline" : "default"}
                            className="w-full h-11 rounded-xl font-bold transition-all"
                            onClick={() => handleConnect('user')}
                            disabled={isConnecting}
                          >
                            {isConnecting ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Send className="h-4 w-4 me-2" />}
                            {telegramUserId ? 'Reconnect Account' : 'Connect Private Bot'}
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className={cn("relative overflow-hidden border-2 transition-all duration-500 rounded-[1.5rem]", telegramGroupId ? "border-success/20 bg-success/5 shadow-lg shadow-success/5" : "border-muted bg-muted/30")}>
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <MessageCircle className="h-5 w-5 text-primary" />
                            </div>
                            {telegramGroupId && <Badge variant="default" className="bg-success hover:bg-success text-[10px] font-black uppercase tracking-widest">Connected</Badge>}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <CardTitle className="text-lg font-black tracking-tight">{t('groupNotifications' as any) || 'Group Bot'}</CardTitle>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {telegramGroupId
                              ? `Linked to Group ID: ${telegramGroupId}`
                              : 'Broadcast order notifications to your team\'s Telegram group for collaborative fulfillment.'}
                          </p>
                          <Button
                            variant={telegramGroupId ? "outline" : "default"}
                            className="w-full h-11 rounded-xl font-bold transition-all"
                            onClick={() => handleConnect('group')}
                            disabled={isConnecting || (!planLimits?.telegramGroup && !isAdmin)}
                          >
                            {isConnecting ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Send className="h-4 w-4 me-2" />}
                            {telegramGroupId ? 'Reconnect Group' : 'Connect Group Bot'}
                          </Button>
                          {!planLimits?.telegramGroup && !isAdmin && (
                            <p className="text-[10px] text-center text-destructive font-black uppercase tracking-[0.2em] animate-pulse">
                              {t('upgradeRequired' as any)}
                            </p>
                          )}
                        </CardContent>
                      </Card>

                      <Card className={cn("relative overflow-hidden border-2 transition-all duration-500 rounded-[1.5rem]", selectedStoreData?.telegramChannelId ? "border-success/20 bg-success/5 shadow-lg shadow-success/5" : "border-muted bg-muted/30")}>
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <Globe className="h-5 w-5 text-primary" />
                            </div>
                            {selectedStoreData?.telegramChannelId && <Badge variant="default" className="bg-success hover:bg-success text-[10px] font-black uppercase tracking-widest">Connected</Badge>}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <CardTitle className="text-lg font-black tracking-tight">{t('channelNotifications' as any) || 'Channel Bot'}</CardTitle>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {selectedStoreData?.telegramChannelId
                              ? `Linked to Channel ID: ${selectedStoreData.telegramChannelId}`
                              : 'Post updates directly to your public or private Telegram channel.'}
                          </p>
                          <Button
                            variant={selectedStoreData?.telegramChannelId ? "outline" : "default"}
                            className="w-full h-11 rounded-xl font-bold transition-all"
                            onClick={() => handleConnect('channel')}
                            disabled={isConnecting}
                          >
                            {isConnecting ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <ExternalLink className="h-4 w-4 me-2" />}
                            {selectedStoreData?.telegramChannelId ? 'Reconnect Channel' : 'Connect Channel'}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="p-8 rounded-[1.5rem] bg-muted/30 border border-border/50 space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-8 w-1.5 rounded-full bg-primary" />
                        <p className="text-sm font-black uppercase tracking-widest">{t('notificationEvents' as any)}</p>
                      </div>
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/50 hover:border-primary/20 transition-all group">
                          <div className="space-y-1">
                            <Label className="text-sm font-bold tracking-tight cursor-pointer">{t('newOrders' as any)}</Label>
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Instant delivery</p>
                          </div>
                          <Switch
                            checked={notificationSettings.newOrders}
                            onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, newOrders: checked})}
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/50 hover:border-primary/20 transition-all group">
                          <div className="space-y-1">
                            <Label className="text-sm font-bold tracking-tight cursor-pointer">{t('orderConfirmations' as any)}</Label>
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Team updates</p>
                          </div>
                          <Switch
                            checked={notificationSettings.orderConfirmations}
                            onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, orderConfirmations: checked})}
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/50 hover:border-primary/20 transition-all group">
                          <div className="space-y-1">
                            <Label className="text-sm font-bold tracking-tight cursor-pointer">{t('statusChanges' as any)}</Label>
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Logistics tracking</p>
                          </div>
                          <Switch
                            checked={notificationSettings.statusChanges}
                            onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, statusChanges: checked})}
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/50 hover:border-primary/20 transition-all group">
                          <div className="space-y-1">
                            <Label className="text-sm font-bold tracking-tight cursor-pointer">{t('highRiskBuyers' as any)}</Label>
                            <p className="text-[10px] text-destructive uppercase font-black tracking-widest opacity-80">Security alerts</p>
                          </div>
                          <Switch
                            checked={notificationSettings.riskAlerts}
                            onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, riskAlerts: checked})}
                          />
                        </div>
                      </div>
                    </div>

                    <Button onClick={saveTelegramSettings} className="h-12 px-12 rounded-xl font-bold shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                      {t('saveSettings' as any) || 'Save Configuration'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="domains" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <StoreDomainPanel store={selectedStoreData} onSave={updateStore} />
          </TabsContent>

          {/* Subscription Tab */}
          {!isAdmin && (
            <TabsContent value="subscription" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('currentSubscription' as any)}</CardTitle>
                  <CardDescription>{t('manageSubscription' as any)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {subscription ? (
                    <>
                      <div className="flex items-center justify-between p-8 rounded-[2rem] bg-muted/30 border border-border/50 group hover:scale-[1.01] transition-all duration-500">
                        <div className="space-y-2">
                          <Badge className="capitalize px-4 py-1 rounded-full font-black tracking-widest">{subscription.plan?.name || subscription.planCode} Plan</Badge>
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black tracking-tighter">${subscription.monthlyPrice}</span>
                            <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-60">/month</span>
                          </div>
                          <p className="text-sm text-muted-foreground font-medium">
                            {t('renewsOn' as any)} {new Date(subscription.endsAt || subscription.endDate || Date.now()).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                          <Badge variant={subscription.isActive ? 'default' : 'destructive'} className={cn(
                            "px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-lg",
                            subscription.isActive ? "bg-success shadow-success/20" : "bg-destructive shadow-destructive/20"
                          )}>
                            {subscription.isActive ? t('active') : t('expired' as any)}
                          </Badge>
                          {subscription.trialEndsAt && new Date(subscription.trialEndsAt) > new Date() && (
                            <Badge variant="outline" className="px-4 py-1 rounded-full border-primary/20 text-primary font-bold">
                              Trialing
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Usage and Limits */}
                      <div className="space-y-6 pt-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-1.5 rounded-full bg-primary" />
                          <h4 className="text-xl font-black tracking-tight">{t('planLimits' as any)}</h4>
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                          {subscription.plan?.features?.map((feature: any) => {
                            const isLimit = feature.type === 'limit';
                            const limit = feature.limit;
                            const isEnabled = feature.isEnabled;

                            if (feature.type === 'boolean') {
                              return (
                                <div key={feature.slug} className={cn(
                                  "p-6 rounded-2xl border transition-all duration-300 flex items-center justify-between",
                                  isEnabled ? "border-success/20 bg-success/5" : "border-muted bg-muted/20 opacity-60"
                                )}>
                                  <div className="flex items-center gap-4">
                                    <div className={cn(
                                      "h-10 w-10 rounded-xl flex items-center justify-center",
                                      isEnabled ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                                    )}>
                                      {isEnabled ? <Check className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                                    </div>
                                    <span className="text-sm font-bold tracking-tight">{feature.name}</span>
                                  </div>
                                  {!isEnabled && <Badge variant="outline" className="text-[9px] uppercase font-black">Locked</Badge>}
                                </div>
                              );
                            }

                            return (
                              <div key={feature.slug} className="p-6 rounded-2xl border border-border/50 bg-background/50 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-70">{feature.name}</span>
                                  <span className="text-sm font-black tracking-tight">
                                    {limit === null ? 'Unlimited' : limit}
                                  </span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full transition-all duration-1000"
                                    style={{ width: limit === null ? '100%' : '50%' }} // TODO: Implement actual usage tracking on frontend
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 space-y-6">
                      <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <CreditCard className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="max-w-xs mx-auto space-y-2">
                        <p className="font-bold text-xl">{t('noSubscription' as any)}</p>
                        <p className="text-muted-foreground text-sm">
                          {language === 'ar'
                            ? 'يرجى التواصل مع إدارة المنصة لتفعيل اشتراكك والبدء في إدارة متجرك.'
                            : 'Please contact the platform administration to activate your subscription and start managing your store.'}
                        </p>
                      </div>
                      {settings.saas_contact_whatsapp && (
                        <Button size="lg" className="rounded-full px-8" asChild>
                          <a
                            href={`https://wa.me/${settings.saas_contact_whatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gap-2"
                          >
                            <Send className="h-5 w-5" />
                            {language === 'ar' ? 'تواصل معنا عبر واتساب' : 'Contact us via WhatsApp'}
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Al-Waseet Tab */}
          <TabsContent value="alwaseet" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {(!subscription || (subscription.planId as any) < 2) && !isAdmin ? (
              <Card className="border-none shadow-xl shadow-primary/5 bg-card/50 backdrop-blur-sm rounded-[2rem] overflow-hidden">
                <CardHeader className="p-8 pb-4 text-center">
                  <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <CardTitle className="text-2xl font-black tracking-tight">{t('alwaseetIntegration' as any)}</CardTitle>
                  <CardDescription className="text-base font-medium max-w-md mx-auto mt-2">
                    {t('alwaseetPremiumFeature' as any)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-4 flex justify-center">
                  <Button variant="default" className="h-12 px-10 rounded-xl font-bold">
                    {t('viewPlans' as any)}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <AlWaseetSettings />
                <div className="space-y-4">
                  <h2 className="text-2xl font-black tracking-tight px-4">{t('invoices' as any)}</h2>
                  <AlWaseetInvoicesTable />
                </div>
              </div>
            )}
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('languageAndDisplay' as any)}</CardTitle>
                <CardDescription>{t('customizeExperience' as any)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <p className="font-medium">{t('language' as any)}</p>
                    <p className="text-sm text-muted-foreground">{t('chooseLanguage' as any)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={language === 'en' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLanguage('en')}
                    >
                      English
                    </Button>
                    <Button
                      variant={language === 'ar' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLanguage('ar')}
                    >
                      العربية
                    </Button>
                    <Button
                      variant={language === 'ku' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLanguage('ku')}
                    >
                      کوردی
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <p className="font-medium">{t('emailNotifications' as any)}</p>
                    <p className="text-sm text-muted-foreground">{t('emailNotificationsDesc' as any)}</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <p className="font-medium">{t('orderAlerts' as any)}</p>
                    <p className="text-sm text-muted-foreground">{t('orderAlertsDesc' as any)}</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="space-y-6 pt-6 border-t mt-6">
                  <div className="space-y-1">
                    <p className="font-bold text-lg">{t('storeSpecificDefaults' as any) || 'Store Specific Defaults'}</p>
                    <p className="text-sm text-muted-foreground">{t('configureDefaultsPerStore' as any) || 'Configure language and other defaults for your storefronts.'}</p>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2 p-4 rounded-xl bg-muted/30 border border-black/5">
                    {/* Local store selector removed in favor of global topbar selector */}

                    <div className="space-y-2">
                      <Label>{t('storeDefaultLanguage' as any) || 'Store Default Language'}</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={defaultLanguage === 'en' ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1 h-11 rounded-xl"
                          onClick={() => setDefaultLanguage('en')}
                        >
                          English
                        </Button>
                        <Button
                          variant={defaultLanguage === 'ar' ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1 h-11 rounded-xl"
                          onClick={() => setDefaultLanguage('ar')}
                        >
                          العربية
                        </Button>
                        <Button
                          variant={defaultLanguage === 'ku' ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1 h-11 rounded-xl"
                          onClick={() => setDefaultLanguage('ku')}
                        >
                          کوردی
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      if (selectedStoreId) {
                        updateStore(selectedStoreId, { defaultLanguage })
                        toast.success(t('settingsSaved' as any))
                      }
                    }}
                    className="rounded-xl px-8"
                  >
                    {t('saveStoreSettings' as any) || 'Save Store Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SaaS Settings Tab (Admin Only) */}
          {isAdmin && (
            <TabsContent value="saas" className="space-y-6">
              <SaaSSettings language={language} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}

function SaaSSettings({ language }: { language: string }) {
  const { settings, updateSettings } = useData()
  const { t } = useTranslations()
  const [siteName, setSiteName] = useState(settings.site_name || settings.siteName || '')
  const [siteLogo, setSiteLogo] = useState(settings.site_logo || settings.siteLogo || '')
  const [contactWhatsapp, setContactWhatsapp] = useState(settings.saas_contact_whatsapp || settings.contactWhatsapp || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isSettingWebhook, setIsSettingWebhook] = useState(false)

  // Sync state with settings when they are fetched
  useEffect(() => {
    if (settings.site_logo) setSiteLogo(settings.site_logo)
    if (settings.saas_contact_whatsapp) setContactWhatsapp(settings.saas_contact_whatsapp)
  }, [settings])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateSettings({
        site_name: siteName,
        site_logo: siteLogo,
        saas_contact_whatsapp: contactWhatsapp
      })
      toast.success(t('settingsSaved' as any))
    } catch (e) {
      toast.error(t('settingsSaveFailed' as any))
    } finally {
      setIsSaving(false)
    }
  }

  const handleSetWebhook = async () => {
    setIsSettingWebhook(true)
    try {
      const res = await fetch('/api/v1/telegram/setup-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('storify_access_token')}`
        }
      })
      const data = await res.json()
      if (data.success) {
        toast.success(t('webhookSetSuccess' as any) || 'Telegram Webhook set successfully!')
      } else {
        toast.error(data.error || 'Failed to set webhook')
      }
    } catch (e) {
      toast.error('Network error')
    } finally {
      setIsSettingWebhook(false)
    }
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle>{t('globalSaasConfig' as any)}</CardTitle>
        <CardDescription>{t('manageSaasBranding' as any)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="siteName">{t('saasName' as any)}</Label>
            <Input
              id="siteName"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="e.g. Storify"
              className="h-12 text-lg font-bold"
            />
            <p className="text-xs text-muted-foreground">
              {t('saasNameDesc' as any)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="siteLogo">{t('saasLogoUrl' as any)}</Label>
            <Input
              id="siteLogo"
              value={siteLogo}
              onChange={(e) => setSiteLogo(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="h-12"
            />
            <p className="text-xs text-muted-foreground">
              {t('saasLogoDesc' as any)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactWhatsapp">{t('saasContactWhatsapp')}</Label>
            <Input
              id="contactWhatsapp"
              value={contactWhatsapp}
              onChange={(e) => setContactWhatsapp(e.target.value)}
              placeholder="e.g. 9647XXXXXXXX"
              className="h-12"
            />
              {t('saasContactWhatsappDesc')}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-bold flex items-center gap-2">
              <Send className="h-4 w-4" />
              Telegram Bot Integration
            </h4>
            <p className="text-xs text-muted-foreground">
              Configure the global bot webhook to enable one-click store linking.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleSetWebhook}
            disabled={isSettingWebhook}
            className="rounded-xl border-primary/20 hover:bg-primary/5"
          >
            {isSettingWebhook ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Globe className="h-4 w-4 me-2" />}
            Set Global Webhook
          </Button>
        </div>

        <div className="pt-4 border-t">
          <Button size="lg" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Check className="h-4 w-4 me-2" />}
            {t('saveGlobalSettings' as any)}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
