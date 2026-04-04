'use client'

import Link from 'next/link'
import { Button, buttonVariants } from '@/components/button'
import { Card, CardContent } from '@/components/card'
import { useLocale } from '@/lib/i18n'
import type { ResultData } from '@/hooks/use-upload-flow'
import type { UsageInfo } from '@/hooks/use-usage'
import {
  CircleCheckBig,
  FileSpreadsheet,
  Rows3,
  Columns3,
  ArrowRight,
  RotateCcw,
} from 'lucide-react'

interface ResultStepProps {
  resultData: ResultData
  usage: UsageInfo | null
  onStartOver: () => void
}

export function ResultStep({ resultData, usage, onStartOver }: ResultStepProps) {
  const { t } = useLocale()
  const isFree = usage?.plan === 'free'

  return (
    <Card className="border-border">
      <CardContent className="p-4 sm:p-8">
        <section className="flex flex-col items-center gap-6">
          <div className="rounded-full bg-teal-100 p-4 dark:bg-teal-900/30">
            <CircleCheckBig className="h-10 w-10 text-teal-700 dark:text-teal-400" />
          </div>

          <div className="text-center">
            <h2 className="text-foreground text-xl font-bold sm:text-2xl">{t('result.title')}</h2>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              {t('result.subtitle')}
            </p>
          </div>

          <div className="bg-muted w-full rounded-lg p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-md p-2">
                <FileSpreadsheet className="h-5 w-5 flex-shrink-0 text-teal-700 dark:text-teal-400" />
                <div>
                  <p className="text-foreground text-sm font-medium">
                    {t('result.filesUnified', { count: resultData.fileCount })}
                  </p>
                </div>
              </div>

              {resultData.rowCount > 0 && (
                <div className="flex items-center gap-3 rounded-md p-2">
                  <Rows3 className="h-5 w-5 flex-shrink-0 text-teal-700 dark:text-teal-400" />
                  <div>
                    <p className="text-foreground text-sm font-medium">
                      {t('result.rowsProcessed', {
                        count: resultData.rowCount,
                      })}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 rounded-md p-2">
                <Columns3 className="h-5 w-5 flex-shrink-0 text-teal-700 dark:text-teal-400" />
                <div>
                  <p className="text-foreground text-sm font-medium">
                    {t('result.columnsSelected', {
                      count: resultData.columnCount,
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {usage && (
            <p className="text-muted-foreground text-sm">
              {t('result.remainingQuota', {
                remaining: usage.unifications.remaining,
                max: usage.unifications.max,
              })}
            </p>
          )}

          {isFree && (
            <div className="border-border w-full rounded-lg border bg-teal-50/50 p-4 dark:bg-teal-950/20">
              <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
                <div className="flex-1">
                  <p className="text-foreground text-sm font-semibold">{t('result.upgradePro')}</p>
                  <p className="text-muted-foreground mt-1 text-xs">{t('result.upgradeMessage')}</p>
                </div>
                <Link href="/#pricing" className={buttonVariants({ variant: 'brand', size: 'sm' })}>
                  {t('result.upgradePro')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          <Button variant="outline" onClick={onStartOver} className="h-12 w-full" size="lg">
            <RotateCcw className="mr-2 h-4 w-4" />
            {t('result.newUnification')}
          </Button>
        </section>
      </CardContent>
    </Card>
  )
}
