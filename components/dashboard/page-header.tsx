'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DashboardPageHeaderProps {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
  className?: string
}

export function DashboardPageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: DashboardPageHeaderProps) {
  return (
    <section className={cn('border-b border-border pb-6', className)}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          {eyebrow && (
            <div className="text-xs font-semibold text-primary">
              {eyebrow}
            </div>
          )}
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            {description && (
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                {description}
              </p>
            )}
          </div>
          {meta && <div className="flex flex-wrap gap-2">{meta}</div>}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </section>
  )
}
