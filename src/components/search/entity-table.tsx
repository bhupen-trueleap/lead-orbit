import {
  AlignLeft,
  Briefcase,
  Check,
  Hash,
  Link,
  MapPin,
  Quote,
  Tag,
  ToggleLeft,
  Type,
  X,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from 'cn'

import { Skeleton } from '@/components/ui/skeleton'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { entityTypeLabel } from '@/lib/labels'
import type { ColumnDef, FieldValue } from '@/lib/columns'
import type { SearchEntity } from '@/lib/search'
import type { FieldEvidence } from '@/lib/agent'

const cellClass = 'border-r border-b'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const compactNumber = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const typeIcons: Record<ColumnDef['type'], LucideIcon> = {
  text: Type,
  number: Hash,
  boolean: ToggleLeft,
}

interface TableColumn {
  id: string
  header: string
  icon: LucideIcon
  className: string
  skeletonClass: string
  render: (entity: SearchEntity) => React.ReactNode
}

function safeHref(url: string | null): string | null {
  if (!url) return null
  try {
    const { protocol } = new URL(url)
    return protocol === 'https:' || protocol === 'http:' ? url : null
  } catch {
    return null
  }
}

function Missing() {
  return <span className="text-muted-foreground">—</span>
}

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block truncate underline underline-offset-4"
    >
      {children}
    </a>
  )
}

function FieldCell({
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

function EvidenceCell({
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

function dynamicColumns(columns: Array<ColumnDef>): Array<TableColumn> {
  return columns.map((column) => ({
    id: column.id,
    header: column.label,
    icon: typeIcons[column.type],
    className:
      column.type === 'text' ? 'min-w-44 max-w-72 whitespace-normal' : 'w-32',
    skeletonClass: column.type === 'text' ? 'w-32' : 'w-12',
    render: (entity) => (
      <EvidenceCell label={column.label} evidence={entity.evidence[column.key]}>
        <FieldCell column={column} value={entity.values[column.key]} />
      </EvidenceCell>
    ),
  }))
}

const summaryColumns: Array<TableColumn> = [
  {
    id: 'role',
    header: 'Role',
    icon: Briefcase,
    className: 'min-w-56 max-w-64 whitespace-normal',
    skeletonClass: 'w-36',
    render: ({ role }) =>
      role ? <p className="line-clamp-2">{role}</p> : <Missing />,
  },
  {
    id: 'location',
    header: 'Location',
    icon: MapPin,
    className: 'min-w-44 max-w-52 truncate text-muted-foreground',
    skeletonClass: 'w-28',
    render: ({ location }) => location ?? <Missing />,
  },
  {
    id: 'details',
    header: 'Details',
    icon: Zap,
    className: 'min-w-72 max-w-md whitespace-normal text-muted-foreground',
    skeletonClass: 'w-full',
    render: ({ highlight }) =>
      highlight ? <p className="line-clamp-2">{highlight}</p> : <Missing />,
  },
]

function buildColumns(
  columns: Array<ColumnDef> | undefined,
): Array<TableColumn> {
  return [
    {
      id: 'name',
      header: 'Name',
      icon: AlignLeft,
      className: 'min-w-52 max-w-64 truncate font-medium',
      skeletonClass: 'w-32',
      render: ({ name }) => name,
    },
    {
      id: 'type',
      header: 'Type',
      icon: Tag,
      className: 'w-28',
      skeletonClass: 'w-16',
      render: ({ type }) => entityTypeLabel(type, 'one'),
    },
    ...(columns ? dynamicColumns(columns) : summaryColumns),
    {
      id: 'url',
      header: 'URL',
      icon: Link,
      className: 'min-w-52 max-w-52',
      skeletonClass: 'w-40',
      render: ({ url }) => {
        const href = safeHref(url)
        return href && url ? (
          <ExternalLink href={href}>{url}</ExternalLink>
        ) : (
          <Missing />
        )
      },
    },
  ]
}

const SKELETON_ROWS = 8

interface EntityTableProps {
  entities: Array<SearchEntity>
  columns?: Array<ColumnDef>
  isLoading?: boolean
  startIndex?: number
}

export function EntityTable({
  entities,
  columns,
  isLoading = false,
  startIndex = 0,
}: EntityTableProps) {
  const showSkeleton = isLoading && entities.length === 0
  const tableColumns = buildColumns(columns)
  const lastIndex = tableColumns.length - 1
  const edge = (index: number) => (index === lastIndex ? 'border-b' : cellClass)

  return (
    <div aria-busy={isLoading} className="overflow-x-auto rounded-lg border">
      <Table className="border-collapse">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={`${cellClass} w-12 bg-muted/40`} />
            {tableColumns.map(
              ({ id, header, icon: Icon, className }, index) => (
                <TableHead
                  key={id}
                  className={cn(
                    edge(index),
                    'bg-muted/40',
                    className,
                    'truncate',
                  )}
                >
                  <span className="flex items-center gap-2 font-normal text-muted-foreground">
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{header}</span>
                  </span>
                </TableHead>
              ),
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {showSkeleton
            ? Array.from({ length: SKELETON_ROWS }, (_, row) => (
                <TableRow key={row} className="h-14 hover:bg-transparent">
                  <TableCell className={cellClass}>
                    <Skeleton className="ml-auto h-4 w-4 motion-reduce:animate-none" />
                  </TableCell>
                  {tableColumns.map(({ id, skeletonClass }, index) => (
                    <TableCell key={id} className={edge(index)}>
                      <Skeleton
                        className={cn(
                          'h-4 motion-reduce:animate-none',
                          skeletonClass,
                        )}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : null}
          {entities.map((entity, row) => (
            <TableRow key={entity.id} className="h-14">
              <TableCell
                className={`${cellClass} text-right text-muted-foreground`}
              >
                {startIndex + row + 1}
              </TableCell>
              {tableColumns.map(({ id, className, render }, index) => (
                <TableCell key={id} className={cn(edge(index), className)}>
                  {render(entity)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
