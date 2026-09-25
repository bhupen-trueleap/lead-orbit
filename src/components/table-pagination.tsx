import { Button } from '@/components/ui/button'

interface TablePaginationProps<TSize extends number> {
  page: number
  pageSize: TSize
  pageSizes: ReadonlyArray<TSize>
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: TSize) => void
}

export function TablePagination<TSize extends number>({
  page,
  pageSize,
  pageSizes,
  total,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps<TSize>) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
      <p className="text-muted-foreground">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <div
          role="radiogroup"
          aria-label="Rows per page"
          className="flex items-center gap-2"
        >
          {pageSizes.map((size) => (
            <Button
              key={size}
              type="button"
              role="radio"
              aria-checked={pageSize === size}
              variant={pageSize === size ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageSizeChange(size)}
            >
              {size}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
