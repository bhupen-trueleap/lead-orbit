import { useRef } from 'react'
import { cn } from 'cn'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  hint?: string
}

interface SegmentedControlProps<T extends string> {
  label: string
  options: ReadonlyArray<SegmentOption<T>>
  value: T
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([])

  function move(delta: number) {
    const target = Math.min(options.length - 1, Math.max(0, index + delta))
    const next = options.at(target)
    if (!next || next.value === value) return
    onChange(next.value)
    buttonsRef.current[target]?.focus()
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      move(1)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      move(-1)
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className="rounded-lg border bg-muted/50 p-1"
    >
      <div
        className="relative grid"
        style={{
          gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
        }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 rounded-md bg-background shadow-sm ring-1 ring-foreground/10 transition-[left] duration-200 ease-out motion-reduce:transition-none"
          style={{
            left: `${(index / options.length) * 100}%`,
            width: `${100 / options.length}%`,
          }}
        />
        {options.map((option, position) => {
          const selected = position === index
          return (
            <button
              key={option.value}
              ref={(element) => {
                buttonsRef.current[position] = element
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(option.value)}
              className="relative flex cursor-pointer flex-col items-center gap-0.5 rounded-md px-1.5 py-2 text-center outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn(
                  'text-sm transition-colors',
                  selected
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {option.label}
              </span>
              {option.hint ? (
                <span className="text-xs text-balance text-muted-foreground">
                  {option.hint}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
