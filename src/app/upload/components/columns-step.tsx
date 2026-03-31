'use client'

import { AnimatedList, AnimatedListItem } from '@/components/animated-list'
import { Button } from '@/components/button'
import { Card, CardContent } from '@/components/card'
import { useLocale } from '@/lib/i18n'
import type { UsageInfo } from '@/hooks/use-usage'
import { ArrowLeft, Loader2 } from 'lucide-react'

interface ColumnsStepProps {
  detectedColumns: string[]
  selectedColumns: string[]
  isProcessing: boolean
  usage: UsageInfo | null
  onToggleColumn: (column: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onProcess: () => Promise<void>
  onStartOver: () => void
}

export function ColumnsStep({
  detectedColumns,
  selectedColumns,
  isProcessing,
  usage,
  onToggleColumn,
  onSelectAll,
  onDeselectAll,
  onProcess,
  onStartOver,
}: ColumnsStepProps) {
  const { t } = useLocale()

  return (
    <Card className="border-border">
      <CardContent className="p-4 sm:p-8">
        <section className="flex flex-col gap-4 sm:gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-foreground text-lg font-semibold">
                {t('columns.detected')} ({detectedColumns.length})
              </h3>
              <p className="text-muted-foreground mt-1 text-sm">
                {selectedColumns.length} {t('columns.of')}{' '}
                {detectedColumns.length} {t('columns.selected')}
                {usage && ` (${t('columns.max')} ${usage.limits.maxColumns})`}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onStartOver}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('columns.startOver')}
            </Button>
          </div>

          <AnimatedList
            data-testid="column-grid"
            className="grid max-h-96 grid-cols-1 gap-2 overflow-y-auto p-1 sm:grid-cols-2 sm:gap-3 sm:p-2 md:grid-cols-3"
          >
            {detectedColumns.map((column) => (
              <AnimatedListItem key={column}>
                <button
                  onClick={() => onToggleColumn(column)}
                  aria-pressed={selectedColumns.includes(column)}
                  className={`flex w-full items-center gap-2 rounded-lg border-2 p-3 text-left transition-all ${
                    selectedColumns.includes(column)
                      ? 'border-teal-700 bg-teal-700 text-white'
                      : 'border-border bg-card text-foreground hover:border-stone-400 dark:hover:border-stone-500'
                  }`}
                >
                  <div
                    className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 ${
                      selectedColumns.includes(column)
                        ? 'border-white bg-white'
                        : 'border-stone-300 dark:border-stone-600'
                    }`}
                  >
                    {selectedColumns.includes(column) && (
                      <div className="h-2 w-2 rounded-sm bg-teal-700" />
                    )}
                  </div>
                  <span className="truncate text-sm font-medium">{column}</span>
                </button>
              </AnimatedListItem>
            ))}
          </AnimatedList>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onDeselectAll}
              className="flex-1"
              disabled={selectedColumns.length === 0}
            >
              {t('columns.deselectAll')}
            </Button>
            <Button
              variant="outline"
              onClick={onSelectAll}
              className="flex-1"
              disabled={selectedColumns.length === detectedColumns.length}
            >
              {t('columns.selectAll')}
            </Button>
          </div>

          <Button
            data-testid="btn-process"
            variant="brand"
            onClick={onProcess}
            disabled={selectedColumns.length === 0 || isProcessing}
            className="h-12 w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t('upload.processing')}
              </>
            ) : (
              t('columns.processAndDownload')
            )}
          </Button>
        </section>
      </CardContent>
    </Card>
  )
}
