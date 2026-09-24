import { Orbit } from 'lucide-react'

interface AppHeaderProps {
  appName: string
}

export function AppHeader({ appName }: AppHeaderProps) {
  return (
    <header className="flex h-14 items-center border-b px-4 md:px-6">
      <div className="flex items-center gap-2 font-semibold">
        <Orbit className="size-5" />
        {appName}
      </div>
    </header>
  )
}
