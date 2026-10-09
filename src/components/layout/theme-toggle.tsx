import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { currentTheme, setTheme } from '@/lib/theme'

const iconMotion =
  'transition-[scale,rotate,opacity] duration-300 ease-out motion-reduce:transition-none'

export function ThemeToggle() {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Switch between light and dark mode"
      className="relative mr-1 rounded-full"
      onClick={() => setTheme(currentTheme() === 'dark' ? 'light' : 'dark')}
    >
      <Moon
        className={`${iconMotion} dark:scale-0 dark:rotate-90 dark:opacity-0`}
      />
      <Sun
        className={`${iconMotion} absolute scale-0 -rotate-90 opacity-0 dark:scale-100 dark:rotate-0 dark:opacity-100`}
      />
    </Button>
  )
}
