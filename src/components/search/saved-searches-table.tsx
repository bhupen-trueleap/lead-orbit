import { Link } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { SavedSearch } from '@/lib/saved-searches'

const categoryLabels = { people: 'People', company: 'Companies' }

interface SavedSearchesTableProps {
  savedSearches: Array<SavedSearch>
  onDelete: (id: string) => void
}

export function SavedSearchesTable({
  savedSearches,
  onDelete,
}: SavedSearchesTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table className="border-collapse">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="min-w-64 border-r bg-muted/40">
              Search
            </TableHead>
            <TableHead className="w-32 border-r bg-muted/40">Filter</TableHead>
            <TableHead className="w-24 border-r bg-muted/40">Results</TableHead>
            <TableHead className="w-36 border-r bg-muted/40">Saved</TableHead>
            <TableHead className="w-40 bg-muted/40" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {savedSearches.map(({ id, query, category, limit, createdAt }) => (
            <TableRow key={id} className="h-14">
              <TableCell className="max-w-sm truncate border-r font-medium">
                {query}
              </TableCell>
              <TableCell className="border-r text-muted-foreground">
                {category ? categoryLabels[category] : 'All'}
              </TableCell>
              <TableCell className="border-r text-muted-foreground">
                {limit}
              </TableCell>
              <TableCell className="border-r text-muted-foreground">
                {new Date(createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <Link
                    to="/searches"
                    search={{
                      q: query,
                      category: category ?? undefined,
                      limit,
                    }}
                    className={buttonVariants({
                      variant: 'outline',
                      size: 'sm',
                    })}
                  >
                    Run
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete saved search: ${query}`}
                    onClick={() => onDelete(id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
