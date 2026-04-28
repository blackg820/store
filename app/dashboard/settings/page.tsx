'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/hooks/use-translations'
import { useData } from '@/lib/data-context'
import { DashboardHeader } from '@/components/dashboard/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { PLAN_LIMITS, type SubscriptionPlan } from '@/lib/types'
import { User, Send, Globe, Shield, CreditCard, Loader2, Check, Upload, Link as LinkIcon, MessageCircle, Copy, ExternalLink, Store, Bell, Info } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { user, language, setLanguage, updateUser } = useAuth()
  const { t } = useTranslations()
  const { getSubscriptionByUserId, getStoresByUserId, stores, updateStore, settings } = useData()
  
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
  const planLimits = isAdmin ? PLAN_LIMITS.unlimited : (subscription ? PLAN_LIMITS[subscription.planId] : null)

  const [selectedStore, setSelectedStore] = useState('')
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

  const selectedStoreData = stores.find(s => s.id === selectedStore)
  
  useEffect(() => {
    if (!selectedStore) {
      if (isAdmin && stores.length > 0) setSelectedStore(String(stores[0].id))
      else if (userStores.length > 0) setSelectedStore(String(userStores[0].id))
    }
  }, [stores, userStores, isAdmin, selectedStore])

  // Sync state when store changes
  useEffect(() => {
    if (selectedStoreData) {
      setTelegramUserId(selectedStoreData.telegramUserId || '')
      setTelegramGroupId(selectedStoreData.telegramGroupId || '')
      setDefaultLanguage(selectedStoreData.defaultLanguage || 'ar')
      if (selectedStoreData.notificationSettings) {
        setNotificationSettings(selectedStoreData.notificationSettings)
      } else {
        setNotificationSettings({
          newOrders: true,
          orderConfirmations: true,
          statusChanges: true,
          riskAlerts: true
        })
      }
    }
  }, [selectedStoreData])

  const handleConnect = async (type: 'user' | 'group') => {
    if (!selectedStore) return
    setIsConnecting(true)
    try {
      const res = await fetch('/api/telegram/link-bot', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('storify_access_token')}`
        },
        body: JSON.stringify({ storeId: selectedStore, type })
      })
      const data = await res.json()
      if (data.success && data.deeplink) {
        window.location.href = data.deeplink
        toast.info(t('followInstructionsInTelegram' as any) || 'Please follow the instructions in Telegram')
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
    if (selectedStore) {
      updateStore(selectedStore, {
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
        toast.success(t('passwordUpdated' as any) || 'Password updated successfully')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
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
    <div className="min-h-screen">
      <DashboardHeader title={t('settings')} />
      
      <div className="p-4 md:p-6 space-y-6">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 me-2" />
              {t('profile' as any)}
            </TabsTrigger>
            <TabsTrigger value="telegram">
              <Send className="h-4 w-4 me-2" />
              {t('telegram' as any)}
            </TabsTrigger>
            {!isAdmin && (
              <TabsTrigger value="subscription">
                <CreditCard className="h-4 w-4 me-2" />
                {t('subscription' as any)}
              </TabsTrigger>
            )}
            <TabsTrigger value="preferences">
              <Globe className="h-4 w-4 me-2" />
              {t('preferences' as any)}
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 me-2" />
              {t('security' as any)}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="saas">
                <Shield className="h-4 w-4 me-2" />
                {t('saasSettings' as any)}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('profileInfo' as any)}</CardTitle>
                <CardDescription>{t('updateAccountDetails' as any)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('name')}</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('email')}</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'}>
                    {user?.role === 'admin' ? t('administrator' as any) : t('storeOwner' as any)}
                  </Badge>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    {t('active')}
                  </Badge>
                </div>
                <Button onClick={handleSaveProfile} disabled={isUpdatingProfile}>
                  {isUpdatingProfile && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                  {t('save')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('changePassword' as any)}</CardTitle>
                <CardDescription>{t('updatePasswordDesc' as any)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">{t('currentPassword' as any)}</Label>
                  <Input 
                    id="currentPassword" 
                    type="password" 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{t('newPassword' as any)}</Label>
                    <Input 
                      id="newPassword" 
                      type="password" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('confirmPassword' as any)}</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                    />
                  </div>
                </div>
                <Button onClick={handleUpdatePassword} disabled={isUpdatingPassword}>
                  {isUpdatingPassword && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                  {t('changePassword' as any)}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Telegram Tab */}
          <TabsContent value="telegram" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('telegramSettings')}</CardTitle>
                <CardDescription>
                  {t('configureTelegram' as any)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {(!isAdmin && userStores.length === 0) || (isAdmin && stores.length === 0) ? (
                  <p className="text-muted-foreground">{t('noStoresYet' as any)}</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>{t('selectStoreLabel' as any)}</Label>
                      <select
                        value={selectedStore}
                        onChange={(e) => setSelectedStore(e.target.value)}
                        className="w-full p-2 rounded-lg border border-input bg-background"
                      >
                        {(isAdmin ? stores : userStores).map(store => (
                          <option key={store.id} value={store.id}>
                            {language === 'ar' ? store.nameAr : store.name} {isAdmin && `(Owner ID: ${store.userId})`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <Card className={cn("relative overflow-hidden border-2 transition-all", telegramUserId ? "border-success/20 bg-success/5" : "border-muted bg-muted/30")}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                              <User className="h-4 w-4 text-primary" />
                              {t('privateNotifications' as any) || 'Private Bot'}
                            </CardTitle>
                            {telegramUserId && <Badge variant="default" className="bg-success hover:bg-success">Connected</Badge>}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-xs text-muted-foreground">
                            {telegramUserId 
                              ? `Linked to ID: ${telegramUserId}`
                              : 'Receive order notifications directly in your private Telegram chat.'}
                          </p>
                          <Button 
                            variant={telegramUserId ? "outline" : "default"} 
                            size="sm" 
                            className="w-full rounded-xl"
                            onClick={() => handleConnect('user')}
                            disabled={isConnecting}
                          >
                            {isConnecting ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Send className="h-4 w-4 me-2" />}
                            {telegramUserId ? 'Reconnect / Change' : 'Connect Private Bot'}
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className={cn("relative overflow-hidden border-2 transition-all", telegramGroupId ? "border-success/20 bg-success/5" : "border-muted bg-muted/30")}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                              <MessageCircle className="h-4 w-4 text-primary" />
                              {t('groupNotifications' as any) || 'Group Bot'}
                            </CardTitle>
                            {telegramGroupId && <Badge variant="default" className="bg-success hover:bg-success">Connected</Badge>}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-xs text-muted-foreground">
                            {telegramGroupId 
                              ? `Linked to Group ID: ${telegramGroupId}`
                              : 'Send order notifications to a Telegram group for your team.'}
                          </p>
                          <Button 
                            variant={telegramGroupId ? "outline" : "default"} 
                            size="sm" 
                            className="w-full rounded-xl"
                            onClick={() => handleConnect('group')}
                            disabled={isConnecting || (!planLimits?.telegramGroup && !isAdmin)}
                          >
                            {isConnecting ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Send className="h-4 w-4 me-2" />}
                            {telegramGroupId ? 'Reconnect / Change' : 'Connect Group Bot'}
                          </Button>
                          {!planLimits?.telegramGroup && !isAdmin && (
                            <p className="text-[10px] text-center text-destructive font-medium uppercase tracking-wider">
                              {t('upgradeRequired' as any) || 'Upgrade Required'}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    <div className="p-4 rounded-lg bg-muted space-y-2">
                      <p className="text-sm font-medium">{t('notificationEvents' as any)}:</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={notificationSettings.newOrders} 
                            onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, newOrders: checked})} 
                          />
                          <Label className="text-sm">{t('newOrders' as any)}</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={notificationSettings.orderConfirmations} 
                            onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, orderConfirmations: checked})} 
                          />
                          <Label className="text-sm">{t('orderConfirmations' as any)}</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={notificationSettings.statusChanges} 
                            onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, statusChanges: checked})} 
                          />
                          <Label className="text-sm">{t('statusChanges' as any)}</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={notificationSettings.riskAlerts} 
                            onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, riskAlerts: checked})} 
                          />
                          <Label className="text-sm">{t('highRiskBuyers' as any)}</Label>
                        </div>
                      </div>
                    </div>

                    <Button onClick={saveTelegramSettings}>{t('save')}</Button>
                  </>
                )}
              </CardContent>
            </Card>
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
                      <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                        <div>
                          <Badge className="capitalize mb-2">{subscription.planId} {t('plan' as any)}</Badge>
                          <p className="font-bold text-2xl">${subscription.monthlyPrice}/{t('month' as any)}</p>
                          <p className="text-sm text-muted-foreground">
                            {t('renewsOn' as any)} {new Date(subscription.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={subscription.isActive ? 'default' : 'destructive'}>
                          {subscription.isActive ? t('active') : t('expired' as any)}
                        </Badge>
                      </div>

                      {!subscription.isActive && settings.saas_contact_whatsapp && (
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="text-center sm:text-start">
                            <p className="font-bold text-primary">{t('renewNow' as any)}</p>
                            <p className="text-sm text-muted-foreground">{t('contactToRenew' as any)}</p>
                          </div>
                          <Button asChild>
                            <a 
                              href={`https://wa.me/${settings.saas_contact_whatsapp.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="gap-2"
                            >
                              <Send className="h-4 w-4" />
                              {t('contactOnWhatsapp' as any)}
                            </a>
                          </Button>
                        </div>
                      )}

                      <div className="space-y-4">
                        <h4 className="font-medium">{t('planLimits' as any)}</h4>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="p-4 rounded-lg bg-muted">
                            <Store className="h-5 w-5 text-primary mb-2" />
                            <p className="text-sm text-muted-foreground">{t('stores')}</p>
                            <p className="font-bold">
                              {userStores.length} / {planLimits?.stores === Infinity ? t('unlimited' as any) : planLimits?.stores}
                            </p>
                          </div>
                          <div className="p-4 rounded-lg bg-muted">
                            <Shield className="h-5 w-5 text-primary mb-2" />
                            <p className="text-sm text-muted-foreground">{t('productsPerStore' as any)}</p>
                            <p className="font-bold">
                              {planLimits?.productsPerStore === Infinity ? t('unlimited' as any) : planLimits?.productsPerStore}
                            </p>
                          </div>
                          <div className="p-4 rounded-lg bg-muted">
                            <Globe className="h-5 w-5 text-primary mb-2" />
                            <p className="text-sm text-muted-foreground">{t('storage' as any)}</p>
                            <p className="font-bold">
                              {planLimits?.storage === Infinity ? t('unlimited' as any) : `${planLimits?.storage}GB`}
                            </p>
                          </div>
                          <div className="p-4 rounded-lg bg-muted">
                            <Bell className="h-5 w-5 text-primary mb-2" />
                            <p className="text-sm text-muted-foreground">{t('telegram' as any)}</p>
                            <p className="font-bold">
                              {planLimits?.telegramGroup ? t('userAndGroups' as any) : t('userOnly' as any)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-medium">{t('features' as any)}</h4>
                        <div className="flex flex-wrap gap-2">
                          {planLimits?.ratings && <Badge variant="secondary">{t('productRatings' as any)}</Badge>}
                          {planLimits?.discounts && <Badge variant="secondary">{t('discounts' as any)}</Badge>}
                          {planLimits?.advancedDiscounts && <Badge variant="secondary">{t('advancedDiscounts' as any)}</Badge>}
                          {planLimits?.riskDetection && <Badge variant="secondary">{t('riskDetection' as any)}</Badge>}
                          {planLimits?.exports && <Badge variant="secondary">{t('csvExcelExport' as any)}</Badge>}
                          {planLimits?.analytics && <Badge variant="secondary">{t('analytics' as any)}</Badge>}
                          {planLimits?.apiAccess && <Badge variant="secondary">{t('apiAccess' as any)}</Badge>}
                          {planLimits?.auditLogs && <Badge variant="secondary">{t('auditLogs' as any)}</Badge>}
                          {planLimits?.prioritySupport && <Badge variant="secondary">{t('prioritySupport' as any)}</Badge>}
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
                    <div className="space-y-2">
                      <Label>{t('selectStoreLabel' as any)}</Label>
                      <select
                        value={selectedStore}
                        onChange={(e) => setSelectedStore(e.target.value)}
                        className="w-full p-2 h-11 rounded-xl border border-input bg-background"
                      >
                        {userStores.map(store => (
                          <option key={store.id} value={store.id}>
                            {language === 'ar' ? store.nameAr : store.name}
                          </option>
                        ))}
                      </select>
                    </div>

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
                      if (selectedStore) {
                        updateStore(selectedStore, { defaultLanguage })
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
  const [siteName, setSiteName] = useState(settings.site_name || 'Storify')
  const [siteLogo, setSiteLogo] = useState(settings.site_logo || '')
  const [contactWhatsapp, setContactWhatsapp] = useState(settings.saas_contact_whatsapp || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isSettingWebhook, setIsSettingWebhook] = useState(false)

  // Sync state with settings when they are fetched
  useEffect(() => {
    if (settings.site_name) setSiteName(settings.site_name)
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
      const res = await fetch('/api/telegram/setup-webhook', {
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
            <Label htmlFor="contactWhatsapp">{language === 'ar' ? 'واتساب التواصل (للاشتراكات)' : 'Contact WhatsApp (for subscriptions)'}</Label>
            <Input
              id="contactWhatsapp"
              value={contactWhatsapp}
              onChange={(e) => setContactWhatsapp(e.target.value)}
              placeholder="e.g. 9647XXXXXXXX"
              className="h-12"
            />
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'هذا الرقم سيظهر للمستخدمين عند انتهاء اشتراكهم أو لطلب اشتراك جديد.' : 'This number will be shown to users when their subscription expires or to request a new one.'}
            </p>
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
