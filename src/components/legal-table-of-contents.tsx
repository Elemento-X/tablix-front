'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useLocale } from '@/lib/i18n'

interface TocItem {
  id: string
  label: string
}

interface LegalTableOfContentsProps {
  items: TocItem[]
}

export function LegalTableOfContents({ items }: LegalTableOfContentsProps) {
  const { t } = useLocale()
  const [activeId, setActiveId] = useState<string>('')
  const [isOpen, setIsOpen] = useState(false)
  const isClickScrolling = useRef(false)
  const clickTarget = useRef<string>('')

  const updateActive = useCallback(() => {
    if (isClickScrolling.current) return

    // At the very top of the page, always highlight the first section
    if (window.scrollY < 10 && items.length > 0) {
      setActiveId(items[0].id)
      return
    }

    const OFFSET = 100

    let current = ''
    for (const item of items) {
      const el = document.getElementById(item.id)
      if (el) {
        const rect = el.getBoundingClientRect()
        if (rect.top <= OFFSET) {
          current = item.id
        }
      }
    }

    if (current) {
      setActiveId(current)
    }
  }, [items])

  useEffect(() => {
    updateActive()
    window.addEventListener('scroll', updateActive, { passive: true })

    return () => {
      window.removeEventListener('scroll', updateActive)
    }
  }, [updateActive])

  const handleClick = (id: string) => {
    setIsOpen(false)

    // Lock scroll-spy to prevent it from overriding the clicked target
    isClickScrolling.current = true
    clickTarget.current = id
    setActiveId(id)

    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    // Unlock after smooth scroll finishes (~600ms is safe for most browsers)
    setTimeout(() => {
      isClickScrolling.current = false
      clickTarget.current = ''
    }, 800)
  }

  return (
    <nav aria-label={t('legal.tableOfContents')}>
      {/* Mobile: collapsible */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="border-border bg-muted flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium"
        >
          {t('legal.tableOfContents')}
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <ul className="border-border mt-2 space-y-1 rounded-lg border p-3">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleClick(item.id)}
                  className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                    activeId === item.id
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Desktop: sticky sidebar */}
      <div className="hidden lg:block">
        <p className="text-foreground mb-3 text-sm font-semibold">{t('legal.tableOfContents')}</p>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => handleClick(item.id)}
                className={`w-full rounded px-3 py-1.5 text-left text-sm transition-colors ${
                  activeId === item.id
                    ? 'text-foreground bg-muted font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
