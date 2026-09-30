import { useEffect, useRef, useState } from 'react'

const KEYBOARD_STEP = 24

interface SplitPaneProps {
  left: React.ReactNode
  right: React.ReactNode
  storageKey: string
  label: string
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function readStoredWidth(key: string): number | null {
  try {
    const value = Number(window.localStorage.getItem(key))
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

function storeWidth(key: string, width: number) {
  try {
    window.localStorage.setItem(key, String(Math.round(width)))
  } catch {
    // storage unavailable; width just won't persist
  }
}

export function SplitPane({
  left,
  right,
  storageKey,
  label,
  defaultWidth = 360,
  minWidth = 280,
  maxWidth = 640,
}: SplitPaneProps) {
  const [width, setWidth] = useState(defaultWidth)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const widthRef = useRef(width)

  useEffect(() => {
    const stored = readStoredWidth(storageKey)
    if (stored !== null) setWidth(clamp(stored, minWidth, maxWidth))
  }, [storageKey, minWidth, maxWidth])

  useEffect(() => {
    widthRef.current = width
  }, [width])

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { startX: event.clientX, startWidth: widthRef.current }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    setWidth(
      clamp(drag.startWidth + event.clientX - drag.startX, minWidth, maxWidth),
    )
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return
    dragRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    storeWidth(storageKey, widthRef.current)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const delta =
      event.key === 'ArrowLeft'
        ? -KEYBOARD_STEP
        : event.key === 'ArrowRight'
          ? KEYBOARD_STEP
          : 0
    if (delta === 0) return
    event.preventDefault()
    const next = clamp(width + delta, minWidth, maxWidth)
    setWidth(next)
    storeWidth(storageKey, next)
  }

  const paneStyle: React.CSSProperties & Record<'--split-pane-width', string> =
    { '--split-pane-width': `${Math.round(width)}px` }

  return (
    <div className="@container">
      <div className="flex flex-col gap-6 @3xl:flex-row @3xl:gap-0">
        <aside
          aria-label={label}
          style={paneStyle}
          className="w-full shrink-0 @3xl:sticky @3xl:top-0 @3xl:max-h-[calc(100svh-7rem)] @3xl:w-(--split-pane-width) @3xl:self-start @3xl:overflow-y-auto @3xl:pr-4"
        >
          {left}
        </aside>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${label.toLowerCase()}`}
          aria-valuenow={Math.round(width)}
          aria-valuemin={minWidth}
          aria-valuemax={maxWidth}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          className="group hidden w-3 shrink-0 cursor-col-resize touch-none justify-center outline-hidden @3xl:flex"
        >
          <span className="h-full w-px bg-border transition-colors group-hover:bg-primary/50 group-focus-visible:w-0.5 group-focus-visible:bg-ring group-active:bg-primary/60" />
        </div>
        <div className="min-w-0 flex-1 @3xl:pl-4">{right}</div>
      </div>
    </div>
  )
}
