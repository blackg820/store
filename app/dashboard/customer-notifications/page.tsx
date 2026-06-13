'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, CalendarClock, Loader2, MousePointerClick, Plus, Send, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { useData } from '@/lib/data-context'
import { AccessRestricted } from '@/components/dashboard/access-restricted'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Campaign {
  id: number
  name: string
  status: string
  channels?: string[]
  scheduled_at?: string | null
  sent_at?: string | null
  deliveries_count?: number
  deliveriesCount?: number
}

interface Delivery {
  id: number
  status: string
  opened_at?: string | null
  clicked_at?: string | null
  failure_reason?: string | null
}

export default function CustomerNotificationsPage() {
  const { user } = useAuth()
  const { selectedStoreId, selectedStore } = useData()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [deliveries, setDeliveries] = useState<Record<number, Delivery[]>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [channel, setChannel] = useState('pwa')
  const [campaignStatus, setCampaignStatus] = useState<'draft' | 'scheduled'>('scheduled')
  const [scheduledAt, setScheduledAt] = useState('')

  const canManage = user?.role === 'admin' || user?.role === 'store_owner'

  const stats = useMemo(() => {
    const all = Object.values(deliveries).flat()
    return {
      sent: all.filter((delivery) => ['sent', 'delivered', 'opened', 'clicked', 'queued'].includes(delivery.status)).length,
      failed: all.filter((delivery) => delivery.status === 'failed').length,
      opened: all.filter((delivery) => delivery.opened_at).length,
      clicked: all.filter((delivery) => delivery.clicked_at).length,
    }
  }, [deliveries])

  const loadCampaigns = async () => {
    if (!selectedStoreId) return
    setIsLoading(true)
    try {
      const res = await apiClient.get<{ success: boolean; data?: { data?: Campaign[] } | Campaign[] }>(
        '/api/v1/customer-notifications/campaigns',
        { params: { storeId: selectedStoreId, limit: '20' } }
      )
      const rows = Array.isArray(res.data) ? res.data : res.data?.data || []
      setCampaigns(rows)

      const deliveryPairs = await Promise.all(rows.slice(0, 5).map(async (campaign) => {
        try {
          const deliveryRes = await apiClient.get<{ success: boolean; data?: { data?: Delivery[] } | Delivery[] }>(
            `/api/v1/customer-notifications/campaigns/${campaign.id}/deliveries`,
            { params: { limit: '100' } }
          )
          return [campaign.id, Array.isArray(deliveryRes.data) ? deliveryRes.data : deliveryRes.data?.data || []] as const
        } catch {
          return [campaign.id, []] as const
        }
      }))
      setDeliveries(Object.fromEntries(deliveryPairs))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load campaigns')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCampaigns()
  }, [selectedStoreId])

  const createCampaign = async () => {
    if (!selectedStoreId) {
      toast.error('Select a store first')
      return
    }
    if (!name.trim() || !title.trim() || !body.trim()) {
      toast.error('Campaign name, title, and message are required')
      return
    }

    setIsSaving(true)
    try {
      await apiClient.post('/api/v1/customer-notifications/campaigns', {
        storeId: selectedStoreId,
        name,
        channels: [channel],
        status: campaignStatus,
        scheduledAt: scheduledAt || null,
        template: {
          title,
          body,
          defaultLocale: selectedStore?.defaultLanguage || 'ar',
          translations: {
            [selectedStore?.defaultLanguage || 'ar']: { title, body },
          },
        },
      })
      toast.success(campaignStatus === 'draft' ? 'Draft saved' : scheduledAt ? 'Campaign scheduled' : 'Campaign queued')
      setName('')
      setTitle('')
      setBody('')
      setScheduledAt('')
      await loadCampaigns()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Campaign could not be created')
    } finally {
      setIsSaving(false)
    }
  }

  if (!canManage) {
    return <AccessRestricted description="Customer notification campaigns are available to store owners and platform admins." />
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 pb-20">
      <div className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">Customer notifications</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-muted-foreground">Create queue-backed customer campaigns without exposing browser or mobile push endpoints.</p>
        </div>
        <Button onClick={loadCampaigns} variant="outline" disabled={isLoading || !selectedStoreId}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {([
          ['Sent / queued', stats.sent, Send],
          ['Failed', stats.failed, Bell],
          ['Opened', stats.opened, CalendarClock],
          ['Clicked', stats.clicked, MousePointerClick],
        ] as Array<[string, number, LucideIcon]>).map(([label, value, Icon]) => (
          <Card key={String(label)}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{String(label)}</p>
                <p className="mt-2 text-3xl font-black">{String(value)}</p>
              </div>
              <Icon className="h-5 w-5 text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> New campaign</CardTitle>
            <CardDescription>Messages are queued. Provider workers can deliver PWA/mobile push later.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Campaign name</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="June VIP offer" />
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pwa">PWA Push</SelectItem>
                  <SelectItem value="mobile">Future Mobile Push</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={campaignStatus} onValueChange={(value) => setCampaignStatus(value as 'draft' | 'scheduled')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Save draft</SelectItem>
                  <SelectItem value="scheduled">Queue or schedule</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Your order favorites are back" />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={5} placeholder="Short, localized campaign message..." />
            </div>
            <div className="space-y-2">
              <Label>Schedule</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
            </div>
            <Button onClick={createCampaign} disabled={isSaving || !selectedStoreId} className="w-full">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {campaignStatus === 'draft' ? 'Save draft' : scheduledAt ? 'Schedule campaign' : 'Queue campaign'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campaigns</CardTitle>
            <CardDescription>{selectedStore ? selectedStore.name : 'Select a store to manage campaigns.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Loading campaigns...</div>
            ) : campaigns.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No campaigns yet.</div>
            ) : campaigns.map((campaign) => {
              const rows = deliveries[campaign.id] || []
              const opened = rows.filter((delivery) => delivery.opened_at).length
              const clicked = rows.filter((delivery) => delivery.clicked_at).length
              const failed = rows.filter((delivery) => delivery.status === 'failed').length
              return (
                <div key={campaign.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {campaign.scheduled_at ? `Scheduled ${new Date(campaign.scheduled_at).toLocaleString()}` : 'Immediate queue'}
                      </p>
                    </div>
                    <Badge variant={campaign.status === 'sent' ? 'default' : 'secondary'}>{campaign.status}</Badge>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm sm:grid-cols-4">
                    <span>Deliveries: {campaign.deliveries_count ?? campaign.deliveriesCount ?? rows.length}</span>
                    <span>Failed: {failed}</span>
                    <span>Opened: {opened}</span>
                    <span>Clicked: {clicked}</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
