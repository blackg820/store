'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/hooks/use-translations'
import { useData } from '@/lib/data-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Megaphone, Send, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export default function BroadcastPage() {
  const { user } = useAuth()
  const { t } = useTranslations()
  const { stores } = useData()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [lastSent, setLastSent] = useState<string | null>(null)

  const activeStores = stores.filter(s => s.isActive)
  const telegramStores = stores.filter(s => (s.telegramUserId || s.telegramGroupId || s.telegramChatId || s.telegramChannelId) && s.isActive)

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 space-y-4">
        <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-3xl font-black tracking-tighter">Access Denied</h1>
        <p className="text-muted-foreground font-medium max-w-sm">Only system administrators can access the global broadcast system.</p>
        <Button variant="outline" onClick={() => window.history.back()} className="rounded-xl px-8">Go Back</Button>
      </div>
    )
  }

  const handleBroadcast = async () => {
    if (!message) {
      toast.error('Please enter a message')
      return
    }

    setIsSending(true)
    try {
      const token = localStorage.getItem('storify_access_token')
      const res = await fetch('/api/v1/admin/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, message })
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Broadcast sent successfully to all stores!')
        setLastSent(new Date().toLocaleTimeString())
        setMessage('')
        setTitle('')
      } else {
        toast.error(data.error || 'Failed to send broadcast')
      }
    } catch (error) {
      toast.error('Internal server error')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-12 max-w-[1600px] mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-border pb-8">
        <div className="space-y-1">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-foreground font-heading">
            System Broadcast
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base font-medium max-w-2xl leading-relaxed">
            Dispatch high-priority announcements to all storefronts.
            Deliver instant updates via Telegram to every connected store owner.
          </p>
        </div>
      </div>

      <div className="grid gap-12 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-2xl shadow-primary/5 bg-card/50 backdrop-blur-sm rounded-[2.5rem] overflow-hidden">
            <div className="bg-primary/5 p-8 flex items-center gap-4 border-b border-white/5">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Megaphone className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-xl font-black tracking-tight">Compose Announcement</CardTitle>
                <CardDescription className="text-sm font-medium opacity-60">Global message to all active store tenants.</CardDescription>
              </div>
            </div>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-3">
                <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-1">Subject Line</Label>
                <Input
                  id="title"
                  placeholder="e.g. Critical System Maintenance Schedule"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-14 rounded-2xl bg-background/50 border-white/10 focus:ring-primary/20 text-lg font-bold"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="message" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-1">Broadcast Content</Label>
                <Textarea
                  id="message"
                  placeholder="Type your message here... You can use HTML for rich formatting."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={10}
                  className="rounded-[2rem] bg-background/50 border-white/10 focus:ring-primary/20 resize-none p-6 text-base font-medium leading-relaxed"
                />
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
                    Supported: &lt;b&gt;, &lt;i&gt;, &lt;a&gt;, &lt;code&gt;
                  </p>
                  {lastSent && (
                    <div className="flex items-center gap-2 text-[10px] font-black text-success uppercase tracking-widest">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Last sent: {lastSent}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <Button
                  size="lg"
                  className="w-full h-16 rounded-2xl font-black text-lg gap-3 shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-95"
                  onClick={handleBroadcast}
                  disabled={isSending || !message}
                >
                  {isSending ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                  Dispatch Broadcast
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="border-none shadow-xl shadow-primary/5 bg-card/30 backdrop-blur-sm rounded-[2rem] p-8 space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Estimated Reach</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-background/40 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Send className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold opacity-60">Active Stores</span>
                </div>
                <span className="text-2xl font-black tracking-tighter">{activeStores.length}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-background/40 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold opacity-60">Connected Bots</span>
                </div>
                <span className="text-2xl font-black tracking-tighter text-accent">{telegramStores.length}</span>
              </div>
            </div>
            <p className="text-[10px] font-medium text-muted-foreground/60 leading-relaxed text-center px-4">
              Real-time delivery to all configured Telegram storefronts across the MENA region.
            </p>
          </Card>

          <Card className="border-none shadow-xl shadow-primary/5 bg-card/30 backdrop-blur-sm rounded-[2rem] p-8 space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Guidelines</h3>
            <ul className="space-y-4">
              {[
                'Avoid excessive broadcasting (rate-limit)',
                'Ensure mission-critical relevancy',
                'Verify links and HTML syntax',
                'Monitor system logs for delivery status'
              ].map((rule, i) => (
                <li key={i} className="flex items-start gap-3 text-xs font-bold text-muted-foreground/80">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  {rule}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
