'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowLeft, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AccessRestrictedProps {
  title?: string
  description?: string
}

export function AccessRestricted({
  title = 'Access restricted',
  description = 'Your account role cannot open this dashboard area.',
}: AccessRestrictedProps) {
  return (
    <div className="flex min-h-[55vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-warning/10 text-warning">
          <Shield className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href="/dashboard/settings">
              <AlertTriangle className="h-4 w-4" />
              Account settings
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
