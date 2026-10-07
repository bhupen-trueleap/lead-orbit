import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { MAX_LIST_NAME_LENGTH, parseListName } from '@/lib/lists'
import type { List, SaveListResult } from '@/lib/lists'
import { isSameName } from '@/lib/names'

interface ListNameDialogProps {
  open: boolean
  title: string
  description: string
  submitLabel: string
  initialName?: string
  takenNames: Array<string>
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string) => Promise<SaveListResult>
  onSaved: (list: List) => void
}

export function ListNameDialog({
  open,
  title,
  description,
  submitLabel,
  initialName = '',
  takenNames,
  onOpenChange,
  onSubmit,
  onSaved,
}: ListNameDialogProps) {
  const [name, setName] = useState(initialName)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsed = parseListName(name)
  const unchanged = parsed !== null && parsed === initialName
  const taken =
    parsed !== null &&
    !unchanged &&
    takenNames.some((existing) => isSameName(existing, parsed))

  async function submit() {
    if (!parsed || taken || unchanged) return
    setBusy(true)
    setError(null)
    try {
      const result = await onSubmit(parsed)
      if (result.status === 'ok') {
        onSaved(result.list)
        onOpenChange(false)
      } else {
        setError(
          result.status === 'duplicate'
            ? `You already have a list called “${parsed}”.`
            : 'Could not save the list. Try again.',
        )
      }
    } catch {
      setError('Could not save the list. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setName(initialName)
          setError(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <div className="space-y-1">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </div>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <div className="space-y-1.5">
            <Input
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
              placeholder="e.g. Fintech founders in Singapore"
              aria-label="List name"
              aria-invalid={taken || error !== null}
              aria-describedby="list-name-message"
              maxLength={MAX_LIST_NAME_LENGTH}
              disabled={busy}
              autoFocus
            />
            <p
              id="list-name-message"
              aria-live="polite"
              className="text-xs text-destructive empty:hidden"
            >
              {taken
                ? `You already have a list called “${parsed}”.`
                : (error ?? null)}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={busy || parsed === null || taken || unchanged}
            >
              {busy ? 'Saving…' : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
