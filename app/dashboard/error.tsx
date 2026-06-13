'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PremiumButton } from '@/components/ui/premium-button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.error('[DashboardError]', error)
    }
  }, [error])

  return (
    <div className="mx-auto flex min-h-[55vh] max-w-3xl items-center justify-center p-6">
      <Alert variant="destructive" className="rounded-2xl border-destructive/30 bg-destructive/5 p-6">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle className="text-base font-bold">Dashboard could not render</AlertTitle>
        <AlertDescription className="space-y-4">
          <p>
            A dashboard section failed before it could finish loading. Retry the view; if it repeats,
            check the latest API response and route logs.
          </p>
          {error.digest && (
            <p className="font-mono text-xs text-destructive/70">Digest: {error.digest}</p>
          )}
          <PremiumButton variant="outline" size="sm" onClick={reset}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Retry
          </PremiumButton>
        </AlertDescription>
      </Alert>
    </div>
  )
}
