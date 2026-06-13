'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Bell, Database, Gauge, HardDrive, ShieldAlert, Workflow } from 'lucide-react'
import { AccessRestricted } from '@/components/dashboard/access-restricted'
import { DashboardPageHeader } from '@/components/dashboard/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'

interface OpsSummary {
  queues: { pending: number; failed: number; connection: string }
  storage: { mediaBytes: number; bunnyConfigured: boolean }
  notifications: { failedToday: number; queued: number }
  integrations: { telegramFailuresToday: number; bunnyFailuresToday: number }
  security: { tenantDenialsToday: number; domainResolutionFailuresToday: number; suspiciousAuthFailuresToday: number }
  analytics: { slowEndpointsToday: number; lastAggregate: string | null }
  recentEvents: Array<{ id: number; type: string; severity: string; source: string | null; message: string; occurred_at: string }>
}

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

const cards = [
  { key: 'queues', label: 'Queues', icon: Workflow },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'storage', label: 'Storage', icon: HardDrive },
  { key: 'security', label: 'Security', icon: ShieldAlert },
] as const

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

export default function OpsPage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<OpsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.get<ApiResponse<OpsSummary>>('/api/v1/admin/ops/summary', { storeId: null })
      setSummary(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operations summary failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') void load()
  }, [user?.role])

  const totals = useMemo(() => {
    if (!summary) return null
    return {
      queues: summary.queues.failed + summary.queues.pending,
      notifications: summary.notifications.failedToday + summary.notifications.queued,
      storage: summary.storage.mediaBytes,
      security: summary.security.tenantDenialsToday + summary.security.domainResolutionFailuresToday + summary.security.suspiciousAuthFailuresToday,
    }
  }, [summary])

  if (user?.role !== 'admin') {
    return <AccessRestricted description="Operations telemetry is restricted to platform admins." />
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 pb-20">
      <DashboardPageHeader
        eyebrow="Platform operations"
        title="Operations"
        description="Monitor health signals, queue pressure, provider failures, and tenant security events without exposing provider secrets."
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Gauge className="h-4 w-4" />
          <span>{summary?.analytics.lastAggregate ? `Last aggregate ${new Date(summary.analytics.lastAggregate).toLocaleString()}` : 'Aggregation heartbeat unavailable'}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          const value = totals?.[card.key]
          const display = card.key === 'storage' ? formatBytes(value ?? 0) : value ?? (loading ? '...' : 0)

          return (
            <div key={card.key} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{card.label}</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{display}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {summary && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Recent system events</h2>
              </div>
              <Badge variant="outline">{summary.recentEvents.length}</Badge>
            </div>
            <div className="divide-y divide-border">
              {summary.recentEvents.length === 0 ? (
                <div className="px-5 py-8 text-sm text-muted-foreground">No recent system events.</div>
              ) : (
                summary.recentEvents.map((event) => (
                  <div key={event.id} className="grid gap-2 px-5 py-4 md:grid-cols-[160px_1fr_auto]">
                    <Badge variant="outline" className={cn(event.severity === 'error' && 'border-destructive/50 text-destructive')}>
                      {event.type}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{event.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{event.source || 'system'}</p>
                    </div>
                    <time className="text-xs text-muted-foreground">{new Date(event.occurred_at).toLocaleString()}</time>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <div className="mb-5 flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Counters</h2>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ['Failed jobs', summary.queues.failed],
                ['Pending jobs', summary.queues.pending],
                ['Queued notifications', summary.notifications.queued],
                ['Notification failures today', summary.notifications.failedToday],
                ['Telegram failures today', summary.integrations.telegramFailuresToday],
                ['Bunny failures today', summary.integrations.bunnyFailuresToday],
                ['Tenant denials today', summary.security.tenantDenialsToday],
                ['Domain failures today', summary.security.domainResolutionFailuresToday],
                ['Slow analytics endpoints today', summary.analytics.slowEndpointsToday],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-b border-border/60 pb-3 last:border-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold tabular-nums">{value}</span>
                </div>
              ))}
            </div>
            {!summary.storage.bunnyConfigured && (
              <div className="mt-5 flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Bunny storage is not fully configured. Uploads should use local fallback until deployment env vars are set.</span>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
