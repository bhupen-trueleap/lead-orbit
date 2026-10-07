import { Check, Hash, Quote, ToggleLeft, Type, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from 'cn'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { FieldEvidence } from '@/lib/agent'
import type { ColumnDef, FieldValue } from '@/lib/columns'

export const cellClass = 'border-r'
export const pinnedEdge = 'shadow-[inset_-1px_0_0_var(--border)]'
export const pinnedHead =
  'z-10 bg-[color-mix(in_oklch,var(--muted)_40%,var(--background))]'
export const pinnedCell =
  'z-10 bg-background group-hover/row:bg-[color-mix(in_oklch,var(--muted)_50%,var(--background))] group-data-[state=selected]/row:bg-muted'
export const selectClass = `sticky left-0 w-10 max-w-10 min-w-10 px-0 [&:has([role=checkbox])]:px-0 ${pinnedEdge}`
export const numberClass = `sticky w-12 max-w-12 min-w-12 ${pinnedEdge}`
export const typeIcons: Record<ColumnDef['type'], LucideIcon> = {
  text: Type,
  number: Hash,
  boolean: ToggleLeft,
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const compactNumber = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function safeHref(url: string | null): string | null {
  if (!url) return null
  try {
    const { protocol } = new URL(url)
    return protocol === 'https:' || protocol === 'http:' ? url : null
  } catch {
    return null
  }
}

export function Missing() {
  return (
    <span
      role="img"
      aria-label="Not available"
      className="inline-block h-px w-3 bg-muted-foreground/50 align-middle"
    />
  )
}

const URL_DISPLAY_LENGTH = 34

export function displayUrl(url: string): string {
  const short = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
  return short.length > URL_DISPLAY_LENGTH
    ? `${short.slice(0, URL_DISPLAY_LENGTH - 1)}…`
    : short
}

export function ExternalLink({
  href,
  children,
}: {
  href: string
  children: string
}) {
  return (
    <a
      href={href}
      title={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block truncate underline underline-offset-4"
    >
      {children}
    </a>
  )
}

export function FieldCell({
  column,
  value,
}: {
  column: ColumnDef
  value?: FieldValue
}) {
  if (value === undefined) return <Missing />
  if (typeof value === 'boolean') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
          value
            ? 'bg-primary/15 text-foreground'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {value ? <Check className="size-3" /> : <X className="size-3" />}
        {value ? 'Yes' : 'No'}
      </span>
    )
  }
  if (typeof value === 'number') {
    return (
      <span className="tabular-nums" title={value.toLocaleString('en')}>
        {column.type === 'number' ? compactNumber.format(value) : value}
      </span>
    )
  }
  if (EMAIL_PATTERN.test(value)) {
    return (
      <a
        href={`mailto:${value}`}
        className="block truncate underline underline-offset-4"
      >
        {value}
      </a>
    )
  }
  const href = safeHref(value)
  if (href) return <ExternalLink href={href}>{value}</ExternalLink>
  return <p className="line-clamp-2">{value}</p>
}

export function EvidenceCell({
  label,
  evidence,
  children,
}: {
  label: string
  evidence?: FieldEvidence
  children: React.ReactNode
}) {
  if (!evidence || evidence.citations.length === 0) return children
  return (
    <div className="flex items-start gap-1.5">
      <div className="min-w-0 flex-1">{children}</div>
      <Popover>
        <PopoverTrigger
          openOnHover
          delay={150}
          aria-label={`Sources for ${label}`}
          className="mt-0.5 shrink-0 rounded-sm text-muted-foreground outline-hidden hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Quote className="size-3.5" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)]">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Sources</span>
            {evidence.confidence ? (
              <span>Confidence: {evidence.confidence}</span>
            ) : null}
          </div>
          <ul className="space-y-1.5">
            {evidence.citations.map((citation) => (
              <li key={citation.url} className="min-w-0">
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate underline underline-offset-4"
                >
                  {citation.title ?? citation.url}
                </a>
                {citation.title ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {citation.url}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  )
}
