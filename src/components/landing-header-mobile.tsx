'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { Button } from '@/components/button'
import { scrollToSection } from '@/components/landing-header-nav'

interface LandingHeaderMobileProps {
  activeSection: string | null
}

export function LandingHeaderMobile({
  activeSection,
}: LandingHeaderMobileProps) {
  const [open, setOpen] = useState(false)
  const { t } = useLocale()
  const prefersReducedMotion = useReducedMotion()
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const firstLinkRef = useRef<HTMLAnchorElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  const navItems = [
    { key: 'how-it-works', label: t('header.nav.howItWorks') },
    { key: 'audience', label: t('header.nav.audience') },
    { key: 'pricing', label: t('header.nav.pricing'), href: '/pricing' },
  ]

  const close = useCallback(() => {
    setOpen(false)
    hamburgerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return

    const timer = setTimeout(() => firstLinkRef.current?.focus(), 100)

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close()
        return
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'a, button, [tabindex]:not([tabindex="-1"])',
        )
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, close])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const panelMotion = prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.1 },
      }
    : {
        initial: { opacity: 0, y: -8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.2, ease: 'easeOut' as const },
      }

  const overlayMotion = prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.1 },
      }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2 },
      }

  const iconMotion = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, rotate: -90 },
        animate: { opacity: 1, rotate: 0 },
        exit: { opacity: 0, rotate: 90 },
        transition: { duration: 0.15 },
      }

  return (
    <div className="lg:hidden">
      <Button
        ref={hamburgerRef}
        variant="ghost"
        size="icon"
        aria-label={open ? t('a11y.closeMenu') : t('a11y.openMenu')}
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="close" {...iconMotion}>
              <X className="h-5 w-5" />
            </motion.span>
          ) : (
            <motion.span key="open" {...iconMotion}>
              <Menu className="h-5 w-5" />
            </motion.span>
          )}
        </AnimatePresence>
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 top-16 z-40 bg-black/20"
              onClick={close}
              {...overlayMotion}
            />
            <motion.div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label={t('a11y.navigationMenu')}
              className="bg-background/98 fixed inset-x-0 top-16 z-50 backdrop-blur-sm"
              {...panelMotion}
            >
              <div className="px-6 pt-6 pb-8">
                <div className="flex flex-col gap-1">
                  {navItems.map((item, index) => (
                    <motion.a
                      key={item.key}
                      ref={index === 0 ? firstLinkRef : undefined}
                      href={item.href ?? `/#${item.key}`}
                      className={`w-full rounded-lg px-4 py-3 text-left text-base font-medium transition-colors ${
                        activeSection === item.key
                          ? 'bg-muted/50 text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                      onClick={(e) => {
                        if (!item.href) {
                          e.preventDefault()
                          close()
                          setTimeout(
                            () =>
                              scrollToSection(item.key, prefersReducedMotion),
                            150,
                          )
                        } else {
                          close()
                        }
                      }}
                      {...(prefersReducedMotion
                        ? {}
                        : {
                            initial: { opacity: 0, x: -8 },
                            animate: { opacity: 1, x: 0 },
                            transition: { duration: 0.2, delay: index * 0.04 },
                          })}
                    >
                      {item.label}
                    </motion.a>
                  ))}
                </div>

                <div className="border-border my-4 border-t" />

                <Link href="/upload" onClick={close}>
                  <Button variant="brand" size="lg" className="h-12 w-full">
                    {t('header.cta')}
                  </Button>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
