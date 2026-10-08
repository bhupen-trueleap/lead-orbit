import { cn } from 'cn'

import { Checkbox } from '@/components/ui/checkbox'

interface SettingsSectionProps {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}

export function SettingsSection({
  title,
  description,
  action,
  children,
}: SettingsSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-medium">{title}</h2>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

interface SettingCardProps {
  title: string
  description?: string
  control?: React.ReactNode
  children?: React.ReactNode
}

export function SettingCard({
  title,
  description,
  control,
  children,
}: SettingCardProps) {
  return (
    <div className="space-y-4 rounded-xl border p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 space-y-0.5">
          <h3 className="text-sm font-medium">{title}</h3>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {control ? <div className="shrink-0">{control}</div> : null}
      </div>
      {children}
    </div>
  )
}

interface SettingOptionsProps {
  label: string
  children: React.ReactNode
}

export function SettingOptions({ label, children }: SettingOptionsProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap gap-2 rounded-lg border border-dashed p-2"
    >
      {children}
    </div>
  )
}

interface SettingOptionProps {
  label: string
  hint?: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

export function SettingOption({
  label,
  hint,
  checked,
  disabled = false,
  onChange,
}: SettingOptionProps) {
  return (
    <label
      className={cn(
        'flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2 text-sm',
        disabled ? 'opacity-60' : 'cursor-pointer hover:bg-muted/50',
      )}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
      <span>{label}</span>
      {hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  )
}
