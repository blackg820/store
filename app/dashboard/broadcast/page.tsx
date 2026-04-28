'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/hooks/use-translations'
import { DashboardHeader } from '@/components/dashboard/header'
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
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [lastSent, setLastSent] = useState<string | null>(null)

  if (user?.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">Only system administrators can access this page.</p>
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
    <div className="min-h-screen pb-12">
      <DashboardHeader title="System Broadcast" />
      
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
        <Card className="border-primary/20 shadow-xl overflow-hidden">
          <div className="bg-primary/5 p-4 flex items-center gap-3 border-b border-primary/10">
            <Megaphone className="h-6 w-6 text-primary animate-pulse" />
            <div>
              <CardTitle>Global Announcement</CardTitle>
              <CardDescription>Send a notification to all store owners and their Telegram bots.</CardDescription>
            </div>
          </div>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label htmlFor="title">Subject (Optional)</Label>
              <Input
                id="title"
                placeholder="e.g. System Maintenance, New Feature..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-12"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Broadcast Message</Label>
              <Textarea
                id="message"
                placeholder="Type your message here... Support HTML tags like <b>, <i>, <a>."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This message will be sent to all active stores' configured Telegram bots.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {lastSent && (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Last broadcast sent at {lastSent}
                  </>
                )}
              </div>
              <Button 
                size="lg" 
                className="px-8 font-bold gap-2" 
                onClick={handleBroadcast}
                disabled={isSending || !message}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Broadcast Now
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Broadcast Rules</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>• Avoid excessive broadcasting to prevent bot rate-limiting.</p>
              <p>• Ensure information is relevant to all store owners.</p>
              <p>• Use <b>bold</b> and <i>italic</i> tags sparingly for emphasis.</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Reach Summary</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>• Total Active Stores: Calculating...</p>
              <p>• Connected Telegram Bots: Calculating...</p>
              <p>• Coverage: Iraqi Market Region</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
