import { Link } from '@tanstack/react-router'
import { Ellipsis, Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { List } from '@/lib/lists'
import { formatRelativeTime } from '@/lib/recent-searches'

interface ListCardProps {
  list: List
  onRename: (list: List) => void
  onDelete: (list: List) => void
}

export function ListCard({ list, onRename, onDelete }: ListCardProps) {
  return (
    <Card className="relative h-full transition-colors focus-within:ring-2 focus-within:ring-ring hover:bg-muted/40">
      <CardHeader className="flex items-start justify-between gap-2">
        <CardTitle className="line-clamp-2 min-w-0">
          <Link
            to="/lists/$listId"
            params={{ listId: list.id }}
            className="outline-hidden after:absolute after:inset-0 after:rounded-xl"
          >
            {list.name}
          </Link>
        </CardTitle>
        {list.isOwner ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Actions for ${list.name}`}
                  className="relative z-10 -mt-1 -mr-1 shrink-0"
                />
              }
            >
              <Ellipsis />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onRename(list)}>
                <Pencil />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(list)}
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-0.5 text-sm text-muted-foreground">
        {list.isOwner ? null : <p className="truncate">{list.ownerEmail}</p>}
        <p>
          {list.rowCount} {list.rowCount === 1 ? 'row' : 'rows'}
        </p>
        <p>
          Edited{' '}
          <time
            dateTime={list.updatedAt}
            title={new Date(list.updatedAt).toLocaleString()}
          >
            {formatRelativeTime(list.updatedAt)}
          </time>
        </p>
      </CardContent>
    </Card>
  )
}
