import { AlignLeft, Globe, Link, Tag, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
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

const SKELETON_ROWS = 8

function SkeletonRows({ showSource }: { showSource: boolean }) {
  return Array.from({ length: SKELETON_ROWS }, (_, index) => (
    <TableRow key={index} className="h-14 hover:bg-transparent">
      <TableCell className={cellClass}>
        <Skeleton className="ml-auto h-4 w-4 motion-reduce:animate-none" />
      </TableCell>
      <TableCell className={cellClass}>
        <Skeleton className="h-4 w-32 motion-reduce:animate-none" />
      </TableCell>
      <TableCell className={cellClass}>
        <Skeleton className="h-4 w-16 motion-reduce:animate-none" />
      </TableCell>
      <TableCell className={cellClass}>
        <Skeleton className="h-4 w-full motion-reduce:animate-none" />
      </TableCell>
      <TableCell className={showSource ? cellClass : 'border-b'}>
        <Skeleton className="h-4 w-40 motion-reduce:animate-none" />
      </TableCell>
      {showSource ? (
        <TableCell className="border-b">
          <Skeleton className="h-4 w-12 motion-reduce:animate-none" />
        </TableCell>
      ) : null}
    </TableRow>
  ))
}

interface EntityTableProps {
  entities: Array<SearchEntity>
  isLoading?: boolean
  startIndex?: number
  showSource?: boolean
}

export function EntityTable({
  entities,
  isLoading = false,
  startIndex = 0,
  showSource = true,
}: EntityTableProps) {
  const showSkeleton = isLoading && entities.length === 0

  return (
    <div aria-busy={isLoading} className="overflow-hidden rounded-lg border">
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
            <ColumnHeader
              icon={Link}
              className={showSource ? 'min-w-52' : 'min-w-52 border-r-0'}
            >
              URL
            </ColumnHeader>
            {showSource ? (
              <ColumnHeader icon={Globe} className="w-28 border-r-0">
                Source
              </ColumnHeader>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {showSkeleton ? <SkeletonRows showSource={showSource} /> : null}
          {entities.map(({ id, name, type, url, highlight, source }, index) => {
            const href = safeHref(url)
            return (
              <TableRow key={id} className="h-14">
                <TableCell
                  className={`${cellClass} text-right text-muted-foreground`}
                >
                  {startIndex + index + 1}
                </TableCell>
                <TableCell
                  className={`${cellClass} max-w-64 truncate font-medium`}
                >
                  {name}
                </TableCell>
                <TableCell className={cellClass}>
                  {typeLabels[type] ?? '—'}
                </TableCell>
                <TableCell
                  className={`${cellClass} max-w-md whitespace-normal text-muted-foreground`}
                >
                  <p className="line-clamp-2">{highlight ?? '—'}</p>
                </TableCell>
                <TableCell
                  className={`${showSource ? cellClass : 'border-b'} max-w-52`}
                >
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
                {showSource ? (
                  <TableCell className="border-b text-muted-foreground">
                    {source === 'exa' ? 'Web' : 'Saved'}
                  </TableCell>
                ) : null}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
