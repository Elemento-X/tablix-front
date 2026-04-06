'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface GridBackgroundProps {
  active?: boolean
  animated?: boolean
  className?: string
}

/** Fixed intersection positions (percentage) for teal pulse dots */
const INTERSECTIONS = [
  { top: 12, left: 18, delay: 0 },
  { top: 28, left: 72, delay: 1.2 },
  { top: 45, left: 35, delay: 2.8 },
  { top: 62, left: 85, delay: 0.6 },
  { top: 78, left: 22, delay: 3.5 },
  { top: 15, left: 55, delay: 4.2 },
  { top: 52, left: 65, delay: 1.8 },
  { top: 85, left: 48, delay: 5.1 },
  { top: 35, left: 12, delay: 2.2 },
  { top: 68, left: 42, delay: 6.3 },
  { top: 22, left: 88, delay: 3.8 },
  { top: 92, left: 75, delay: 7.0 },
]

const MASK = 'radial-gradient(ellipse at center, black 30%, transparent 80%)'

export function GridBackground({
  active = false,
  animated = false,
  className,
}: GridBackgroundProps) {
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!animated || !gridRef.current) return

    let frameId: number
    let start: number | null = null

    function tick(time: number) {
      if (!start) start = time
      const elapsed = (time - start) / 1000
      const x = Math.sin(elapsed * 0.6) * 12 + Math.cos(elapsed * 0.35) * 6
      const y = Math.cos(elapsed * 0.5) * 10 + Math.sin(elapsed * 0.4) * 5
      if (gridRef.current) {
        gridRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
      }
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [animated])

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      style={{ maskImage: MASK, WebkitMaskImage: MASK }}
    >
      <div
        ref={gridRef}
        className={cn(
          'absolute -inset-10',
          active ? 'opacity-40' : 'opacity-[0.08] dark:opacity-[0.06]',
        )}
        style={{
          backgroundImage: [
            `linear-gradient(to right, ${active ? '#14b8a6' : 'currentColor'} 1px, transparent 1px)`,
            `linear-gradient(to bottom, ${active ? '#14b8a6' : 'currentColor'} 1px, transparent 1px)`,
          ].join(', '),
          backgroundSize: '24px 24px',
        }}
      />
      {animated &&
        INTERSECTIONS.map((pos) => (
          <span
            key={`${pos.top}-${pos.left}`}
            className="absolute h-1 w-1 animate-pulse rounded-full bg-teal-500"
            style={{
              top: `${pos.top}%`,
              left: `${pos.left}%`,
              animationDelay: `${pos.delay}s`,
              animationDuration: '3s',
            }}
          />
        ))}
    </div>
  )
}
