import { KeyRound, Trash2 } from 'lucide-react'

import { OptionMenu } from '@/components/option-menu'
import type { MenuOption } from '@/components/option-menu'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Person } from '@/lib/people'
import type { Role } from '@/lib/viewer'

const roleLabels: Record<Role, string> = { admin: 'Admin', user: 'User' }

const roleOptions: Array<MenuOption<Role>> = [
  { value: 'user', label: 'User', hint: 'Sees only their own lists' },
  { value: 'admin', label: 'Admin', hint: 'Sees the whole app' },
]

const tagClass =
  'shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground'

interface PeopleTableProps {
  people: Array<Person>
  onRoleChange: (person: Person, role: Role) => void
  onResetPassword: (person: Person) => void
  onRemove: (person: Person) => void
}

export function PeopleTable({
  people,
  onRoleChange,
  onResetPassword,
  onRemove,
}: PeopleTableProps) {
  return (
    <Table className="border-collapse" containerClassName="rounded-lg border">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-12 border-r bg-muted/40" />
          <TableHead className="min-w-64 border-r bg-muted/40">Email</TableHead>
          <TableHead className="w-36 border-r bg-muted/40">Role</TableHead>
          <TableHead className="w-28 border-r bg-muted/40">Password</TableHead>
          <TableHead className="w-32 border-r bg-muted/40">Invited</TableHead>
          <TableHead className="w-24 bg-muted/40" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {people.map((person, row) => {
          const locked = person.isYou || person.isFallbackAdmin
          return (
            <TableRow key={person.email} className="h-14">
              <TableCell className="border-r text-right text-muted-foreground">
                {row + 1}
              </TableCell>
              <TableCell className="max-w-xl border-r font-medium">
                <div className="flex items-center gap-2">
                  <span className="truncate">{person.email}</span>
                  {person.isYou ? <span className={tagClass}>You</span> : null}
                  {person.isFallbackAdmin ? (
                    <span
                      className={tagClass}
                      title="Listed in ADMIN_EMAILS, so always an admin"
                    >
                      Always admin
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="border-r">
                {locked ? (
                  <span className="text-muted-foreground">
                    {roleLabels[person.role]}
                  </span>
                ) : (
                  <OptionMenu
                    label={`Role for ${person.email}`}
                    triggerLabel={roleLabels[person.role]}
                    options={roleOptions}
                    value={person.role}
                    onChange={(role) => {
                      if (role !== person.role) onRoleChange(person, role)
                    }}
                  />
                )}
              </TableCell>
              <TableCell className="border-r text-muted-foreground">
                {person.hasPassword ? (
                  'Set'
                ) : (
                  <span className="text-destructive">Not set</span>
                )}
              </TableCell>
              <TableCell className="border-r text-muted-foreground">
                {person.invitedAt
                  ? new Date(person.invitedAt).toLocaleDateString()
                  : '—'}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Reset password: ${person.email}`}
                    title="Reset password"
                    onClick={() => onResetPassword(person)}
                  >
                    <KeyRound />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${person.email}`}
                    title={
                      person.isYou
                        ? 'You can’t remove yourself'
                        : person.isFallbackAdmin
                          ? 'Remove this email from ADMIN_EMAILS instead'
                          : 'Remove'
                    }
                    disabled={locked}
                    onClick={() => onRemove(person)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
