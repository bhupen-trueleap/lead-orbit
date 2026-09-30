import { ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface MenuOption<T extends string | number> {
  value: T
  label: string
  hint?: string
  disabled?: boolean
}

interface OptionMenuProps<T extends string | number> {
  label: string
  triggerLabel: string
  options: ReadonlyArray<MenuOption<T>>
  value: T
  onChange: (value: T) => void
  triggerClassName?: string
}

export function OptionMenu<T extends string | number>({
  label,
  triggerLabel,
  options,
  value,
  onChange,
  triggerClassName,
}: OptionMenuProps<T>) {
  const hasHints = options.some((option) => option.hint)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={triggerClassName}
            aria-label={`${label}: ${triggerLabel}`}
          />
        }
      >
        {triggerLabel}
        <ChevronDown className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={hasHints ? 'w-72' : 'w-44'}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={value}>
            {options.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                closeOnClick
                onClick={() => onChange(option.value)}
              >
                <span className="flex flex-col gap-0.5">
                  <span>{option.label}</span>
                  {option.hint ? (
                    <span className="text-xs text-muted-foreground">
                      {option.hint}
                    </span>
                  ) : null}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
