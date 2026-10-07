import { Link } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
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
import {
  MAX_COLLECTION_NAME_LENGTH,
  parseCollectionName,
  renameCollection,
} from '@/lib/collections'
import type { Collection } from '@/lib/collections'

interface RenameButtonProps {
  collection: Collection
  onRenamed: () => void
}

function RenameButton({ collection, onRenamed }: RenameButtonProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(collection.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const parsed = parseCollectionName(name)

  async function submit() {
    if (!parsed) return
    setBusy(true)
    setError(null)
    try {
      const result = await renameCollection(collection.id, parsed)
      if (result.status === 'ok') {
        setOpen(false)
        onRenamed()
      } else {
        setError(
          result.status === 'duplicate'
            ? `"${parsed}" is already in use.`
            : 'Could not rename. Try again.',
        )
      }
    } catch {
      setError('Could not rename. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setName(collection.name)
          setError(null)
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Rename collection: ${collection.name}`}
          />
        }
      >
        <Pencil />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <PopoverHeader>
          <PopoverTitle>Rename collection</PopoverTitle>
        </PopoverHeader>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Collection name"
            maxLength={MAX_COLLECTION_NAME_LENGTH}
            disabled={busy}
          />
          <Button
            type="submit"
            disabled={busy || !parsed || parsed === collection.name}
          >
            Save
          </Button>
        </form>
        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

interface CollectionsTableProps {
  collections: Array<Collection>
  onRenamed: () => void
  onDelete: (collection: Collection) => void
}

export function CollectionsTable({
  collections,
  onRenamed,
  onDelete,
}: CollectionsTableProps) {
  return (
    <Table className="border-collapse" containerClassName="rounded-lg border">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-12 border-r bg-muted/40" />
          <TableHead className="min-w-56 border-r bg-muted/40">Name</TableHead>
          <TableHead className="w-24 border-r bg-muted/40">Items</TableHead>
          <TableHead className="w-36 border-r bg-muted/40">Updated</TableHead>
          <TableHead className="w-24 bg-muted/40" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {collections.map((collection, row) => (
          <TableRow key={collection.id} className="h-14">
            <TableCell className="border-r text-right text-muted-foreground">
              {row + 1}
            </TableCell>
            <TableCell className="max-w-xl border-r font-medium">
              <Link
                to="/collections/$collectionId"
                params={{ collectionId: collection.id }}
                className="block truncate rounded-sm underline-offset-4 outline-hidden hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {collection.name}
              </Link>
            </TableCell>
            <TableCell className="border-r text-muted-foreground tabular-nums">
              {collection.itemCount}
            </TableCell>
            <TableCell className="border-r text-muted-foreground">
              {new Date(collection.updatedAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-1">
                <RenameButton collection={collection} onRenamed={onRenamed} />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete collection: ${collection.name}`}
                  onClick={() => onDelete(collection)}
                >
                  <Trash2 />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
