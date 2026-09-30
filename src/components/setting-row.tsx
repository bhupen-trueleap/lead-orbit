interface SettingRowProps {
  title: string
  description: string
  children: React.ReactNode
}

export function SettingRow({ title, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-2 py-2">
      <div className="min-w-0">
        <p className="text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
