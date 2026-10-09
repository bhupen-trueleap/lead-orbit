import { Check, Copy, RefreshCw } from 'lucide-react'
import { useState } from 'react'

import { SegmentedControl } from '@/components/segmented-control'
import type { SegmentOption } from '@/components/segmented-control'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  generatePassword,
  invitePerson,
  parseEmail,
  parsePassword,
  resetPassword,
} from '@/lib/people'
import type { EmailResult, Person, SavePersonResult } from '@/lib/people'
import type { Role } from '@/lib/viewer'

const roleOptions: ReadonlyArray<SegmentOption<Role>> = [
  { value: 'user', label: 'User', hint: 'Their own lists only' },
  { value: 'admin', label: 'Admin', hint: 'The whole app' },
]

const failures: Record<Exclude<SavePersonResult, 'ok'>, string> = {
  duplicate: 'That email already has access.',
  forbidden: 'You can’t change this person.',
  missing: 'That person is no longer on the list. Close and try again.',
  error: 'Could not save. Please try again.',
}

const emailNotes: Record<EmailResult, string> = {
  sent: 'We emailed these sign-in details to them. They’re here too in case the email doesn’t arrive.',
  'not-configured':
    'Email isn’t set up yet, so send these sign-in details to them yourself.',
  failed:
    'The email could not be sent, so send these sign-in details to them yourself.',
}

interface PersonDialogProps {
  person: Person | null
  onClose: () => void
  onSaved: () => void
}

export function PersonDialog({ person, onClose, onSaved }: PersonDialogProps) {
  const [email, setEmail] = useState(person?.email ?? '')
  const [role, setRole] = useState<Role>('user')
  const [password, setPassword] = useState(generatePassword)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailed, setEmailed] = useState<EmailResult | null>(null)
  const [copied, setCopied] = useState(false)

  const parsedEmail = parseEmail(email)
  const parsedPassword = parsePassword(password)

  async function submit() {
    if (!parsedEmail || !parsedPassword) return
    setBusy(true)
    setError(null)
    try {
      const result = person
        ? await resetPassword(parsedEmail, parsedPassword)
        : await invitePerson(parsedEmail, role, parsedPassword)
      if (result.status === 'ok') {
        setEmailed(result.email)
        onSaved()
      } else {
        setError(failures[result.status])
      }
    } catch {
      setError(failures.error)
    }
    setBusy(false)
  }

  async function copyDetails() {
    try {
      await navigator.clipboard.writeText(
        `Email: ${parsedEmail ?? email}\nPassword: ${password}`,
      )
      setCopied(true)
    } catch {
      setError('Could not copy. Select the password and copy it yourself.')
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent>
        {emailed ? (
          <>
            <div className="space-y-1">
              <DialogTitle>
                {person ? 'Password changed' : 'Invited'}
              </DialogTitle>
              <DialogDescription>
                {emailNotes[emailed]} The password isn’t shown again after you
                close this.
              </DialogDescription>
            </div>
            <dl className="space-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="flex gap-3">
                <dt className="w-20 shrink-0 text-muted-foreground">Email</dt>
                <dd className="min-w-0 break-all">{parsedEmail}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-20 shrink-0 text-muted-foreground">
                  Password
                </dt>
                <dd className="min-w-0 font-mono break-all select-all">
                  {password}
                </dd>
              </div>
            </dl>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void copyDetails()}
              >
                {copied ? <Check /> : <Copy />}
                {copied ? 'Copied' : 'Copy details'}
              </Button>
              <DialogClose render={<Button type="button" />}>Done</DialogClose>
            </div>
          </>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            <div className="space-y-1">
              <DialogTitle>
                {person ? 'Reset password' : 'Invite someone'}
              </DialogTitle>
              <DialogDescription>
                {person
                  ? `Set a new password for ${person.email}. They’re signed out everywhere and emailed the new password.`
                  : 'They sign in with this email and the password you set here. They’re emailed the sign-in details.'}
              </DialogDescription>
            </div>

            {person ? null : (
              <>
                <label className="block space-y-1.5 text-sm">
                  <span className="font-medium">Email</span>
                  <Input
                    type="email"
                    autoComplete="off"
                    required
                    autoFocus
                    maxLength={MAX_EMAIL_LENGTH}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="person@company.com"
                    disabled={busy}
                  />
                </label>
                <div className="space-y-1.5 text-sm">
                  <p className="font-medium">Role</p>
                  <SegmentedControl
                    label="Role"
                    options={roleOptions}
                    value={role}
                    onChange={setRole}
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5 text-sm">
              <label htmlFor="person-password" className="font-medium">
                Password
              </label>
              <div className="flex gap-2">
                <Input
                  id="person-password"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  maxLength={MAX_PASSWORD_LENGTH}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="font-mono"
                  disabled={busy}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setPassword(generatePassword())}
                >
                  <RefreshCw />
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                At least {MIN_PASSWORD_LENGTH} characters.
              </p>
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <DialogClose
                render={<Button type="button" variant="outline" />}
                disabled={busy}
              >
                Cancel
              </DialogClose>
              <Button
                type="submit"
                disabled={busy || !parsedEmail || !parsedPassword}
              >
                {busy ? 'Saving…' : person ? 'Reset password' : 'Invite'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
