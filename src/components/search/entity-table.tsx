import { AlignLeft, Globe, Link, Tag, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { SearchEntity } from '@/lib/search'

const typeLabels: Record<string, string> = {
  person: 'Person',
  company: 'Company',
  organization: 'Organization',
}

const cellClass = 'border-r border-b'

function safeHref(url: string | null): string | null {
  if (!url) return null
  try {
    const { protocol } = new URL(url)
    return protocol === 'https:' || protocol === 'http:' ? url : null
  } catch {
    return null
  }
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word).at(0) ?? '')
    .join('')
    .toUpperCase()
}

interface ColumnHeaderProps {
  icon: LucideIcon
  className?: string
  children: React.ReactNode
}

function ColumnHeader({ icon: Icon, className, children }: ColumnHeaderProps) {
  return (
    <TableHead className={`${cellClass} bg-muted/40 ${className ?? ''}`}>
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4 shrink-0" />
        {children}
      </span>
    </TableHead>
  )
}

interface EntityTableProps {
  entities: Array<SearchEntity>
}

export function EntityTable({ entities }: EntityTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table className="border-collapse">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={`${cellClass} w-12 bg-muted/40`} />
            <ColumnHeader icon={AlignLeft} className="min-w-52">
              Name
            </ColumnHeader>
            <ColumnHeader icon={Tag} className="w-32">
              Type
            </ColumnHeader>
            <ColumnHeader icon={Zap} className="min-w-72">
              Details
            </ColumnHeader>
            <ColumnHeader icon={Link} className="min-w-52">
              URL
            </ColumnHeader>
            <ColumnHeader icon={Globe} className="w-28 border-r-0">
              Source
            </ColumnHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entities.map(({ id, name, type, url, highlight, source }, index) => {
            const href = safeHref(url)
            return (
              <TableRow key={id} className="h-14">
                <TableCell
                  className={`${cellClass} text-right text-muted-foreground`}
                >
                  {index + 1}
                </TableCell>
                <TableCell className={`${cellClass} font-medium`}>
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground"
                    >
                      {getInitials(name)}
                    </span>
                    <span className="max-w-48 truncate">{name}</span>
                  </span>
                </TableCell>
                <TableCell className={cellClass}>
                  {typeLabels[type] ?? '—'}
                </TableCell>
                <TableCell
                  className={`${cellClass} max-w-md whitespace-normal text-muted-foreground`}
                >
                  <p className="line-clamp-2">{highlight ?? '—'}</p>
                </TableCell>
                <TableCell className={`${cellClass} max-w-52`}>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate underline underline-offset-4"
                    >
                      {url}
                    </a>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="border-b text-muted-foreground">
                  {source === 'exa' ? 'Web' : 'Saved'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
