'use client'

interface TablixLogoProps {
  showWordmark?: boolean
  className?: string
  symbolSize?: number
}

function TablixSymbol({ size = 28 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      width={size}
      height={size}
      aria-hidden="true"
      className="shrink-0"
    >
      <rect
        x="4"
        y="7"
        width="16"
        height="3"
        rx="1.5"
        className="fill-teal-500"
        transform="rotate(-8 20 8.5)"
      />
      <rect x="4" y="14.5" width="20" height="3" rx="1.5" className="fill-teal-500" />
      <rect
        x="4"
        y="22"
        width="16"
        height="3"
        rx="1.5"
        className="fill-teal-500"
        transform="rotate(8 20 23.5)"
      />
      <circle cx="26" cy="16" r="3" className="fill-teal-500" />
    </svg>
  )
}

export function TablixLogo({ showWordmark = true, className, symbolSize = 28 }: TablixLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <TablixSymbol size={symbolSize} />
      {showWordmark && (
        <span className="text-foreground text-xl font-semibold tracking-tight">Tablix</span>
      )}
    </span>
  )
}

export { TablixSymbol }
