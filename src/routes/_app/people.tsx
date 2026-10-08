import { createFileRoute } from '@tanstack/react-router'
import { UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'

import { PeopleTable } from '@/components/people/people-table'
import { PersonDialog } from '@/components/people/person-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { changeRole, fetchPeople, removePerson } from '@/lib/people'
import type { Person } from '@/lib/people'
import { requireAdmin } from '@/lib/viewer'
import type { Role } from '@/lib/viewer'

export const Route = createFileRoute('/_app/people')({
  beforeLoad: requireAdmin,
  component: People,
})

type LoadState = 'loading' | 'ready' | 'error'

type Editing = { mode: 'invite' } | { mode: 'password'; person: Person }

function People() {
  const [people, setPeople] = useState<Array<Person>>([])
  const [state, setState] = useState<LoadState>('loading')
  const [message, setMessage] = useState<string | null>(null)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [pendingRemove, setPendingRemove] = useState<Person | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchPeople(controller.signal)
      .then((list) => {
        if (list) setPeople(list)
        setState(list ? 'ready' : 'error')
      })
      .catch(() => {
        if (!controller.signal.aborted) setState('error')
      })
    return () => controller.abort()
  }, [reloadKey])

  const reload = () => setReloadKey((key) => key + 1)

  async function run(action: () => Promise<string>, failure: string) {
    setMessage(null)
    try {
      if ((await action()) === 'ok') {
        reload()
        return
      }
    } catch {
      // handled below
    }
    setMessage(failure)
    reload()
  }

  function handleRoleChange(person: Person, role: Role) {
    void run(
      () => changeRole(person.email, role),
      `Could not change the role for ${person.email}. Please try again.`,
    )
  }

  function handleRemove(person: Person) {
    setPendingRemove(null)
    void run(
      () => removePerson(person.email),
      `Could not remove ${person.email}. Please try again.`,
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-prose text-sm text-muted-foreground">
          Only the people here can sign in. Admins see the whole app; users see
          only their own lists.
        </p>
        <Button type="button" onClick={() => setEditing({ mode: 'invite' })}>
          <UserPlus />
          Invite
        </Button>
      </div>

      <div
        aria-live="polite"
        className="text-sm text-muted-foreground empty:hidden"
      >
        {state === 'loading' ? 'Loading…' : null}
        {state === 'error' ? 'Could not load people.' : null}
        {message}
      </div>

      {people.length > 0 ? (
        <PeopleTable
          people={people}
          onRoleChange={handleRoleChange}
          onResetPassword={(person) => setEditing({ mode: 'password', person })}
          onRemove={setPendingRemove}
        />
      ) : null}

      {editing ? (
        <PersonDialog
          person={editing.mode === 'password' ? editing.person : null}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      ) : null}

      <AlertDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {pendingRemove?.email ?? 'this person'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They’re signed out now and can’t sign in again. Their lists are
              kept, and you can invite them back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingRemove) handleRemove(pendingRemove)
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
