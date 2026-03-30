'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/button'
import { useLocale } from '@/lib/i18n'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { t } = useLocale()

  const isDark = theme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
    >
      <Sun className="h-4 w-4 scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-4 w-4 scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0" />
    </Button>
  )
}
