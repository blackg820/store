'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, AlertCircle, ExternalLink, ShieldCheck } from 'lucide-react'

export function AlWaseetSettings() {
  const { t } = useTranslations()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [settings, setSettings] = useState({
    username: '',
    password: '',
    enabled: false,
    has_credentials: false,
    token_valid: false,
    token_expires_at: null as string | null
  })

  // Mock plan level check - in reality this would come from the user object
  const planLevel = user?.subscription_plan === 'starter' ? 1 : 2 // Simplified for demo

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/v1/alwaseet/settings')
      const json = await res.json()
      if (json.success) {
        setSettings(prev => ({ ...prev, ...json.data }))
      }
    } catch (error) {
      console.error('Failed to fetch Al-Waseet settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await fetch('/api/v1/alwaseet/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: settings.username,
          password: settings.password,
          enabled: settings.enabled
        })
      })
      const json = await res.json()
      if (json.success) {
        toast.success(t('settingsUpdated'))
        fetchSettings()
      } else {
        toast.error(json.message || t('updateFailed'))
      }
    } catch (error) {
      toast.error(t('updateFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    try {
      const res = await fetch('/api/v1/alwaseet/settings/test', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        toast.success(json.data.message)
        fetchSettings()
      } else {
        toast.error(json.message || 'Connection failed')
      }
    } catch (error) {
      toast.error('Connection test failed')
    } finally {
      setIsTesting(false)
    }
  }

  if (planLevel < 2) {
    return (
      <Card className="border-warning/20 bg-warning/5">
        <CardHeader>
          <div className="flex items-center gap-2 text-warning">
            <AlertCircle className="h-5 w-5" />
            <CardTitle>{t('upgradeRequired')}</CardTitle>
          </div>
          <CardDescription>
            {t('alwaseetPremiumFeature')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Al-Waseet logistics integration is available for Pro and Enterprise plans.
            Upgrade your subscription to unlock automated shipping and real-time tracking.
          </p>
          <Button className="w-full sm:w-auto">
            {t('viewPlans')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Al-Waseet Integration</CardTitle>
              <CardDescription>
                Configure your Al-Waseet Merchant API credentials to enable logistics services.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {settings.has_credentials ? (
                <Badge variant={settings.token_valid ? 'success' : 'warning'} className="gap-1">
                  {settings.token_valid ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {settings.token_valid ? 'Connected' : 'Token Expired'}
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Not Configured
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label>Enable Integration</Label>
                <p className="text-xs text-muted-foreground">
                  Allow orders to be sent to Al-Waseet from the dashboard.
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">Merchant Username</Label>
                <Input
                  id="username"
                  value={settings.username}
                  onChange={(e) => setSettings({ ...settings, username: e.target.value })}
                  placeholder="Enter your Al-Waseet username"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Merchant Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={settings.password}
                  onChange={(e) => setSettings({ ...settings, password: e.target.value })}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>
            </div>

            {settings.token_expires_at && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                Token expires: {new Date(settings.token_expires_at).toLocaleString()}
              </p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-3 border-t pt-6 bg-muted/10">
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t('saveSettings')}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isLoading || isTesting || !settings.has_credentials}
              onClick={handleTestConnection}
              className="w-full sm:w-auto"
            >
              {isTesting && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              Test Connection
            </Button>
            <Button variant="ghost" className="w-full sm:w-auto ml-auto gap-2" asChild>
              <a href="https://alwaseet-iq.net/merchant/login" target="_blank" rel="noopener noreferrer">
                Al-Waseet Portal
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider">Logistics Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Cities Synced</p>
              <p className="text-2xl font-bold">18</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Active Regions</p>
              <p className="text-2xl font-bold">245</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Rate Limit</p>
              <p className="text-2xl font-bold">30/30s</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant="success" className="h-6">Healthy</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
