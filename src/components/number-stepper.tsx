import { Minus, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface NumberStepperProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function NumberStepper({
  label,
  value,
  min,
  max,
  step = 5,
  onChange,
}: NumberStepperProps) {
  const [text, setText] = useState(String(value))
  const latestRef = useRef(value)

  useEffect(() => {
    latestRef.current = value
    setText(String(value))
  }, [value])

  function apply(next: number) {
    if (next === latestRef.current) return
    latestRef.current = next
    setText(String(next))
    onChange(next)
  }

  function commit(raw: string) {
    const parsed = Number.parseInt(raw, 10)
    const next = Number.isNaN(parsed)
      ? latestRef.current
      : clamp(parsed, min, max)
    setText(String(next))
    apply(next)
  }

  function nudge(direction: 1 | -1) {
    const current = latestRef.current
    const snapped =
      direction === 1
        ? Math.floor(current / step) * step + step
        : Math.ceil(current / step) * step - step
    apply(clamp(snapped, min, max))
  }

  return (
    <div className="inline-flex h-8 items-stretch overflow-hidden rounded-lg border">
      <button
        type="button"
        aria-label={`Decrease ${label.toLowerCase()}`}
        disabled={value <= min}
        onClick={() => nudge(-1)}
        className="flex w-8 items-center justify-center text-muted-foreground outline-hidden hover:bg-muted hover:text-foreground focus-visible:bg-muted disabled:pointer-events-none disabled:opacity-40"
      >
        <Minus className="size-3.5" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={text}
        onChange={(event) => setText(event.target.value.replace(/\D/g, ''))}
        onBlur={(event) => commit(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit(event.currentTarget.value)
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            nudge(1)
          } else if (event.key === 'ArrowDown') {
            event.preventDefault()
            nudge(-1)
          }
        }}
        className="w-12 border-x bg-transparent text-center text-sm tabular-nums outline-hidden focus-visible:bg-muted/40"
      />
      <button
        type="button"
        aria-label={`Increase ${label.toLowerCase()}`}
        disabled={value >= max}
        onClick={() => nudge(1)}
        className="flex w-8 items-center justify-center text-muted-foreground outline-hidden hover:bg-muted hover:text-foreground focus-visible:bg-muted disabled:pointer-events-none disabled:opacity-40"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  )
}
