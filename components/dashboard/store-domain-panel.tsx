'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Copy, ExternalLink, Globe2, Loader2, ShieldAlert, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { Store } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface StoreDomainPanelProps {
  store: Store | null | undefined
  onSave: (id: string, data: Partial<Store>) => Promise<void>
}

const reserved = new Set(['admin', 'api', 'app', 'dashboard', 'cdn', 'media', 'ftp', 'mail', 'www', 'support', 'help', 'docs', 'status'])

export function StoreDomainPanel({ store, onSave }: StoreDomainPanelProps) {
  const [subdomain, setSubdomain] = useState(store?.subdomain || '')
  const [customDomain, setCustomDomain] = useState(store?.customDomain || '')
  const [isChecking, setIsChecking] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [checkMessage, setCheckMessage] = useState<string | null>(null)

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'example.com'
  const normalizedSubdomain = subdomain.trim().toLowerCase()
  const previewUrl = normalizedSubdomain ? `https://${normalizedSubdomain}.${rootDomain}` : null
  const isReserved = reserved.has(normalizedSubdomain)
  const verificationHost = customDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '')

  const status = useMemo(() => {
    if (!store?.customDomain) return { label: 'Not configured', tone: 'outline' as const }
    if (store.domainVerifiedAt) return { label: 'Verified', tone: 'default' as const }
    return { label: 'Pending DNS', tone: 'secondary' as const }
  }, [store?.customDomain, store?.domainVerifiedAt])

  if (!store) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Store domains</CardTitle>
          <CardDescription>Select a store first to manage public domains.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const checkDomain = async () => {
    setIsChecking(true)
    setCheckMessage(null)
    try {
      const res = await apiClient.get<{ success: boolean; data?: { available: boolean }; message?: string }>(
        '/api/v1/stores/check-domain',
        {
          storeId: null,
          params: {
            ignoreStoreId: store.id,
            subdomain: normalizedSubdomain,
            customDomain: verificationHost,
          },
        }
      )
      if (res.success && res.data?.available) {
        setCheckMessage('Domain values are available.')
        toast.success('Domain values are available')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Domain check failed'
      setCheckMessage(message)
      toast.error(message)
    } finally {
      setIsChecking(false)
    }
  }

  const saveDomain = async (clearCustomDomain = false) => {
    if (isReserved) {
      toast.error('This subdomain is reserved')
      return
    }

    setIsSaving(true)
    try {
      await onSave(store.id, {
        subdomain: normalizedSubdomain || null,
        customDomain: clearCustomDomain ? null : verificationHost || null,
      })
      toast.success('Store domain settings saved')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="overflow-hidden border-border/70">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-primary" />
              Store domains
            </CardTitle>
            <CardDescription>Use a clean subdomain now and connect a custom domain after DNS verification.</CardDescription>
          </div>
          <Badge variant={status.tone}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 p-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Subdomain</Label>
            <div className="flex rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring">
              <Input
                value={subdomain}
                onChange={(event) => setSubdomain(event.target.value)}
                className="border-0 shadow-none focus-visible:ring-0"
                placeholder="mystore"
              />
              <div className="flex items-center border-l px-3 text-sm text-muted-foreground">.{rootDomain}</div>
            </div>
            {isReserved && (
              <p className="flex items-center gap-2 text-xs font-medium text-destructive">
                <ShieldAlert className="h-3.5 w-3.5" />
                This subdomain is reserved for platform operations.
              </p>
            )}
            {previewUrl && !isReserved && (
              <a href={previewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                {previewUrl}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <div className="space-y-2">
            <Label>Custom domain</Label>
            <Input value={customDomain} onChange={(event) => setCustomDomain(event.target.value)} placeholder="shop.example.com" />
            <p className="text-xs text-muted-foreground">Custom domains remain pending until DNS points to the storefront ingress and an admin verifies ownership.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={checkDomain} disabled={isChecking || isReserved}>
              {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Check availability
            </Button>
            <Button type="button" onClick={() => saveDomain(false)} disabled={isSaving || isReserved}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save domains
            </Button>
            {store.customDomain && (
              <Button type="button" variant="destructive" onClick={() => saveDomain(true)} disabled={isSaving}>
                <XCircle className="h-4 w-4" />
                Remove custom domain
              </Button>
            )}
          </div>
          {checkMessage && <p className="text-sm text-muted-foreground">{checkMessage}</p>}
        </div>

        <div className="space-y-4 rounded-lg border bg-background/60 p-4">
          <div>
            <h3 className="text-sm font-semibold">DNS instructions</h3>
            <p className="mt-1 text-sm text-muted-foreground">Add this record at your DNS provider, then request verification.</p>
          </div>
          <div className="grid gap-2 text-sm">
            <div className="grid grid-cols-[90px_1fr_auto] items-center gap-2 rounded-md bg-muted/50 p-3">
              <span className="text-muted-foreground">Type</span>
              <code>CNAME</code>
              <Button size="icon" variant="ghost" onClick={() => navigator.clipboard.writeText('CNAME')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-[90px_1fr_auto] items-center gap-2 rounded-md bg-muted/50 p-3">
              <span className="text-muted-foreground">Host</span>
              <code className="truncate">{verificationHost || 'shop.example.com'}</code>
              <Button size="icon" variant="ghost" onClick={() => navigator.clipboard.writeText(verificationHost || '')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-[90px_1fr_auto] items-center gap-2 rounded-md bg-muted/50 p-3">
              <span className="text-muted-foreground">Value</span>
              <code className="truncate">storefront.{rootDomain}</code>
              <Button size="icon" variant="ghost" onClick={() => navigator.clipboard.writeText(`storefront.${rootDomain}`)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
