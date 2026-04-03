'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { WifiOff } from 'lucide-react'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { useLocale } from '@/lib/i18n'

export function OfflineIndicator() {
  const { isOnline } = useNetworkStatus()
  const { t } = useLocale()

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          role="alert"
          aria-live="assertive"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden bg-amber-500 text-amber-950 dark:bg-amber-600 dark:text-amber-50"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium">
            <WifiOff className="h-4 w-4 flex-shrink-0" />
            <span>{t('errors.offlineShort')}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
