'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface DropdownMenuContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const DropdownMenuContext = React.createContext<
  DropdownMenuContextValue | undefined
>(undefined)

function useDropdownMenu() {
  const context = React.useContext(DropdownMenuContext)
  if (!context) {
    throw new Error('useDropdownMenu must be used within DropdownMenu')
  }
  return context
}

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block" data-slot="dropdown-menu">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  )
}

const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & { asChild?: boolean }
>(({ children, asChild, ...props }, ref) => {
  const { open, setOpen } = useDropdownMenu()

  if (asChild && React.isValidElement(children)) {
    // React 19 compatible ref handling
    const childElement = children as React.ReactElement<{
      onClick?: (e: React.MouseEvent) => void
      ref?: React.Ref<HTMLButtonElement>
    }>
    const childProps = {
      onClick: (e: React.MouseEvent) => {
        setOpen(!open)
        const childOnClick = childElement.props.onClick
        if (childOnClick) childOnClick(e)
      },
      'aria-expanded': open,
      'data-state': open ? 'open' : 'closed',
    }

    // Merge refs if child has ref
    if (ref) {
      const childRef = (
        childElement as unknown as { ref?: React.Ref<HTMLButtonElement> }
      ).ref
      const mergedRef = (node: HTMLButtonElement | null) => {
        if (typeof ref === 'function') ref(node)
        else if (ref)
          (ref as React.MutableRefObject<HTMLButtonElement | null>).current =
            node

        if (childRef) {
          if (typeof childRef === 'function') childRef(node)
          else if (childRef)
            (
              childRef as React.MutableRefObject<HTMLButtonElement | null>
            ).current = node
        }
      }
      return React.cloneElement(childElement, { ...childProps, ref: mergedRef })
    }

    return React.cloneElement(childElement, childProps)
  }

  return (
    <button
      ref={ref}
      data-slot="dropdown-menu-trigger"
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      data-state={open ? 'open' : 'closed'}
      {...props}
    >
      {children}
    </button>
  )
})
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger'

function DropdownMenuContent({
  children,
  className,
  align = 'center',
  sideOffset = 4,
  ...props
}: React.ComponentProps<'div'> & {
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
}) {
  const { open, setOpen } = useDropdownMenu()
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target as Node)
      ) {
        const trigger = contentRef.current.previousElementSibling
        if (trigger && !trigger.contains(e.target as Node)) {
          setOpen(false)
        }
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, setOpen])

  if (!open) return null

  const alignmentClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  }

  return (
    <div
      ref={contentRef}
      data-slot="dropdown-menu-content"
      className={cn(
        'bg-popover text-popover-foreground absolute z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md',
        'animate-in fade-in-0 zoom-in-95 slide-in-from-top-2',
        alignmentClasses[align],
        className,
      )}
      style={{ top: `calc(100% + ${sideOffset}px)` }}
      {...props}
    >
      {children}
    </div>
  )
}

function DropdownMenuItem({
  className,
  onClick,
  ...props
}: React.ComponentProps<'div'>) {
  const { setOpen } = useDropdownMenu()

  return (
    <div
      data-slot="dropdown-menu-item"
      className={cn(
        'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm transition-colors outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      onClick={(e) => {
        onClick?.(e)
        setOpen(false)
      }}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dropdown-menu-separator"
      className={cn('bg-muted -mx-1 my-1 h-px', className)}
      {...props}
    />
  )
}

function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dropdown-menu-label"
      className={cn('px-2 py-1.5 text-sm font-semibold', className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
}
