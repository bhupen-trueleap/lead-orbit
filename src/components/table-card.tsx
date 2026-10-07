import { cn } from 'cn'

interface TableCardProps {
  title: React.ReactNode
  actions?: React.ReactNode
  footer?: React.ReactNode
  bare?: boolean
  children: React.ReactNode
}

export function TableCard({
  title,
  actions,
  footer,
  bare = false,
  children,
}: TableCardProps) {
  return (
    <section className={bare ? undefined : 'overflow-hidden rounded-xl border'}>
      <header
        className={cn(
          'flex flex-wrap items-center gap-2 border-b px-3 py-2.5',
          bare && 'sticky top-0 z-20 bg-background',
        )}
      >
        <div aria-live="polite" className="mr-auto min-w-0 text-sm font-medium">
          {title}
        </div>
        {actions}
      </header>
      {children}
      {footer ? (
        <footer
          className={cn(
            'border-t px-3 py-2.5',
            bare && 'sticky bottom-0 z-20 bg-background',
          )}
        >
          {footer}
        </footer>
      ) : null}
    </section>
  )
}
