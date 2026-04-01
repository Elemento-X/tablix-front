'use client'

import { Card, CardContent } from '@/components/card'
import { formatFileSize, type UsageInfo } from '@/hooks/use-usage'
import { useLocale } from '@/lib/i18n'
import { Info } from 'lucide-react'

interface UsageStatusProps {
  usage: UsageInfo | null
  isLoading: boolean
}

function UsageStatusSkeleton({ label }: { label: string }) {
  return (
    <Card className="border-border mb-6" aria-label={label}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="bg-muted mt-0.5 h-5 w-5 flex-shrink-0 animate-pulse rounded" />
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="bg-muted h-4 w-24 animate-pulse rounded" />
              <div className="bg-muted h-4 w-32 animate-pulse rounded" />
            </div>
            <div className="bg-muted h-2 w-full animate-pulse rounded-full" />
            <div className="bg-muted h-3 w-3/4 animate-pulse rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function UsageStatus({ usage, isLoading }: UsageStatusProps) {
  const { t } = useLocale()

  if (isLoading) {
    return <UsageStatusSkeleton label={t('status.loading')} />
  }

  if (!usage) {
    return null
  }

  const progressPercent = Math.min(
    100,
    (usage.unifications.remaining / usage.unifications.max) * 100,
  )
  const progressColor =
    usage.unifications.remaining === 0
      ? 'bg-destructive'
      : usage.unifications.remaining === 1
        ? 'bg-warning'
        : 'bg-success'

  return (
    <Card data-testid="usage-status" className="border-border bg-info/10 mb-6">
      <CardContent className="p-4">
        <section className="flex items-start gap-3">
          <Info className="text-info mt-0.5 h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-foreground text-sm font-medium">
                {t('status.plan')}: {usage.plan.toUpperCase()}
              </span>

              <span className="text-foreground text-sm font-medium">
                {usage.unifications.remaining}/{usage.unifications.max}{' '}
                {t('status.unificationsRemaining')}
              </span>
            </div>

            <div
              className="bg-muted h-2 w-full rounded-full"
              role="progressbar"
              aria-valuenow={usage.unifications.remaining}
              aria-valuemin={0}
              aria-valuemax={usage.unifications.max}
              aria-label={t('a11y.usageProgress')}
            >
              <div
                className={`h-2 rounded-full transition-all ${progressColor}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <p className="text-muted-foreground mt-2 text-xs">
              {t('status.maxFiles')} {usage.limits.maxInputFiles}{' '}
              {t('status.files')} • {t('status.maxTotalSize')}:{' '}
              {formatFileSize(usage.limits.maxTotalSize)} •{' '}
              {t('status.maxRowsLabel')} {usage.limits.maxRows}{' '}
              {t('status.maxRows')} • {t('status.maxColumnsLabel')}{' '}
              {usage.limits.maxColumns} {t('status.maxColumns')}
            </p>
          </div>
        </section>
      </CardContent>
    </Card>
  )
}
