'use client'

import { Languages } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/dropdown-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  useLocale,
  locales,
  localeNames,
  localizedPath,
  stripLocale,
  type Locale,
} from '@/lib/i18n'

export function LanguageSelector() {
  const { locale, setLocale, t } = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  // Changing language navigates to the same page under the new locale prefix
  // (URL is the source of truth). setLocale keeps state/cookie in sync.
  const changeLocale = (loc: Locale) => {
    setLocale(loc)
    const basePath = stripLocale(pathname || '/')
    router.push(localizedPath(loc, basePath))
  }

  return (
    <div className="flex items-center gap-1">
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Languages className="h-4 w-4" />
            <span className="sr-only">{t('a11y.selectLanguage')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {locales.map((loc) => (
            <DropdownMenuItem
              key={loc}
              onClick={() => changeLocale(loc)}
              className={locale === loc ? 'bg-accent' : ''}
            >
              {localeNames[loc]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
