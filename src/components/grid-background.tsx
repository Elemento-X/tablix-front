import { cn } from '@/lib/utils'

interface GridBackgroundProps {
  active?: boolean
  className?: string
}

export function GridBackground({ active = false, className }: GridBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 transition-opacity duration-300',
        active ? 'opacity-40' : 'opacity-[0.08] dark:opacity-[0.06]',
        className,
      )}
      style={{
        backgroundImage: [
          `linear-gradient(to right, ${active ? '#14b8a6' : 'currentColor'} 1px, transparent 1px)`,
          `linear-gradient(to bottom, ${active ? '#14b8a6' : 'currentColor'} 1px, transparent 1px)`,
        ].join(', '),
        backgroundSize: '24px 24px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
      }}
    />
  )
}
