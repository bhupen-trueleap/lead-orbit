import { AlignLeft, Briefcase, Link, MapPin, Tag, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from 'cn'

import {
  EvidenceCell,
  ExternalLink,
  FieldCell,
  Missing,
  cellClass,
  displayUrl,
  numberClass,
  pinnedCell,
  pinnedHead,
  safeHref,
  selectClass,
  typeIcons,
} from '@/components/table-cells'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { entityTypeLabel } from '@/lib/labels'
import type { ColumnDef } from '@/lib/columns'
import type { SearchEntity } from '@/lib/search'

interface TableColumn {
  id: string
  header: string
  icon: LucideIcon
  className: string
  skeletonClass: string
  render: (entity: SearchEntity) => React.ReactNode
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
      className: 'min-w-72 max-w-72',
      skeletonClass: 'w-40',
      render: ({ url }) => {
        const href = safeHref(url)
        return href && url ? (
          <ExternalLink href={href}>{displayUrl(url)}</ExternalLink>
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
  selectedIds?: ReadonlySet<string>
  onSelectionChange?: (selectedIds: Set<string>) => void
  flush?: boolean
}

export function EntityTable({
  entities,
  columns,
  isLoading = false,
  startIndex = 0,
  selectedIds,
  onSelectionChange,
  flush = false,
}: EntityTableProps) {
  const showSkeleton = isLoading && entities.length === 0
  const tableColumns = buildColumns(columns)
  const lastIndex = tableColumns.length - 1
  const edge = (index: number) => (index === lastIndex ? '' : cellClass)
  const selection =
    selectedIds && onSelectionChange
      ? { ids: selectedIds, change: onSelectionChange }
      : null
  const selectedOnPage = selection
    ? entities.filter((entity) => selection.ids.has(entity.id)).length
    : 0
  const allOnPage = entities.length > 0 && selectedOnPage === entities.length
  const numberLeft = selection ? 'left-10' : 'left-0'
  const nameClass = `@2xl/table:sticky ${selection ? '@2xl/table:left-22' : '@2xl/table:left-12'} @2xl/table:border-r-0 @2xl/table:shadow-[inset_-1px_0_0_var(--border)]`

  function toggleRow(id: string, checked: boolean) {
    if (!selection) return
    const next = new Set(selection.ids)
    if (checked) next.add(id)
    else next.delete(id)
    selection.change(next)
  }

  function togglePage(checked: boolean) {
    if (!selection) return
    const next = new Set(selection.ids)
    for (const { id } of entities) {
      if (checked) next.add(id)
      else next.delete(id)
    }
    selection.change(next)
  }

  return (
    <Table
      aria-busy={isLoading}
      className="border-collapse"
      containerClassName={cn('@container/table', !flush && 'rounded-lg border')}
    >
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {selection ? (
            <TableHead className={`${selectClass} ${pinnedHead}`}>
              <Checkbox
                className="mx-auto"
                aria-label="Select all rows on this page"
                checked={allOnPage}
                indeterminate={selectedOnPage > 0 && !allOnPage}
                disabled={entities.length === 0}
                onCheckedChange={togglePage}
              />
            </TableHead>
          ) : null}
          <TableHead className={`${numberClass} ${numberLeft} ${pinnedHead}`} />
          {tableColumns.map(({ id, header, icon: Icon, className }, index) => (
            <TableHead
              key={id}
              className={cn(
                edge(index),
                'bg-muted/40',
                className,
                'truncate',
                index === 0 && `${nameClass} ${pinnedHead}`,
              )}
            >
              <span className="flex items-center gap-2 font-normal text-muted-foreground">
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{header}</span>
              </span>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {showSkeleton
          ? Array.from({ length: SKELETON_ROWS }, (_, row) => (
              <TableRow key={row} className="h-14 hover:bg-transparent">
                {selection ? (
                  <TableCell className={`${selectClass} bg-background`}>
                    <Skeleton className="mx-auto size-4 motion-reduce:animate-none" />
                  </TableCell>
                ) : null}
                <TableCell
                  className={`${numberClass} ${numberLeft} bg-background`}
                >
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
          <TableRow
            key={entity.id}
            data-state={selection?.ids.has(entity.id) ? 'selected' : undefined}
            className="group/row h-14"
          >
            {selection ? (
              <TableCell className={`${selectClass} ${pinnedCell}`}>
                <Checkbox
                  className="mx-auto"
                  aria-label={`Select ${entity.name}`}
                  checked={selection.ids.has(entity.id)}
                  onCheckedChange={(checked) => toggleRow(entity.id, checked)}
                />
              </TableCell>
            ) : null}
            <TableCell
              className={`${numberClass} ${numberLeft} ${pinnedCell} text-right text-muted-foreground`}
            >
              {startIndex + row + 1}
            </TableCell>
            {tableColumns.map(({ id, className, render }, index) => (
              <TableCell
                key={id}
                className={cn(
                  edge(index),
                  className,
                  index === 0 && `${nameClass} ${pinnedCell}`,
                )}
              >
                {render(entity)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
