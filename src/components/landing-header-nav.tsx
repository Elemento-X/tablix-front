'use client'

import { motion } from 'framer-motion'
import { useLocale } from '@/lib/i18n'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

interface NavItem {
  key: string
  label: string
  href: string
}

interface LandingHeaderNavProps {
  activeSection: string | null
}

function scrollToSection(id: string, instant: boolean) {
  if (id === 'top') {
    if (window.location.pathname !== '/') {
      window.location.href = '/'
      return
    }
    window.scrollTo({ top: 0, behavior: instant ? 'instant' : 'smooth' })
    return
  }
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({
      behavior: instant ? 'instant' : 'smooth',
      block: 'start',
    })
  } else {
    window.location.href = `/#${id}`
  }
}

export function LandingHeaderNav({ activeSection }: LandingHeaderNavProps) {
  const { t } = useLocale()
  const prefersReducedMotion = useReducedMotion()

  const navItems: NavItem[] = [
    {
      key: 'how-it-works',
      label: t('header.nav.howItWorks'),
      href: '/#how-it-works',
    },
    { key: 'audience', label: t('header.nav.audience'), href: '/#audience' },
    { key: 'pricing', label: t('header.nav.pricing'), href: '/#pricing' },
  ]

  return (
    <nav
      aria-label={t('a11y.mainNavigation')}
      className="hidden lg:flex lg:items-center lg:gap-1"
    >
      {navItems.map((item) => {
        const isActive = activeSection === item.key
        return (
          <a
            key={item.key}
            href={item.href}
            aria-current={isActive ? 'location' : undefined}
            className={`relative rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={(e) => {
              e.preventDefault()
              scrollToSection(item.key, prefersReducedMotion)
            }}
          >
            {item.label}
            {isActive &&
              (prefersReducedMotion ? (
                <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-teal-700 dark:bg-teal-500" />
              ) : (
                <motion.span
                  layoutId="nav-active-indicator"
                  className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-teal-700 dark:bg-teal-500"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              ))}
          </a>
        )
      })}
    </nav>
  )
}

export { scrollToSection }
