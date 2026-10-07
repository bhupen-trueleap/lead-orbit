import { useEffect, useRef, useState } from 'react'

const DEFAULT_SHARE = 27.4138
const KEYBOARD_STEP = 2

interface SplitPaneProps {
  left: React.ReactNode
  right: React.ReactNode
  storageKey: string
  label: string
}

function clampShare(value: number) {
  return Math.min(100, Math.max(0, value))
}

function readStoredShare(key: string): number | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return null
    const value = Number(raw)
    return Number.isFinite(value) && value >= 0 && value <= 100 ? value : null
  } catch {
    return null
  }
}

function storeShare(key: string, share: number) {
  try {
    window.localStorage.setItem(key, share.toFixed(4))
  } catch {
    // storage unavailable; width just won't persist
  }
}

export function SplitPane({ left, right, storageKey, label }: SplitPaneProps) {
  const [share, setShare] = useState(DEFAULT_SHARE)
  const paneRef = useRef<HTMLElement>(null)
  const shareRef = useRef(share)
  const dragRef = useRef<{
    startX: number
    startWidth: number
    rowWidth: number
  } | null>(null)

  useEffect(() => {
    const stored = readStoredShare(storageKey)
    if (stored !== null) setShare(stored)
  }, [storageKey])

  useEffect(() => {
    shareRef.current = share
  }, [share])

  function measure() {
    const pane = paneRef.current
    const rowWidth = pane?.parentElement?.clientWidth ?? 0
    if (!pane || rowWidth === 0) return null
    return { paneWidth: pane.getBoundingClientRect().width, rowWidth }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const size = measure()
    if (!size) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      startX: event.clientX,
      startWidth: size.paneWidth,
      rowWidth: size.rowWidth,
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    const width = drag.startWidth + event.clientX - drag.startX
    setShare(clampShare((width / drag.rowWidth) * 100))
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return
    dragRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    const size = measure()
    const settled = size
      ? clampShare((size.paneWidth / size.rowWidth) * 100)
      : shareRef.current
    setShare(settled)
    storeShare(storageKey, settled)
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
    const size = measure()
    const current = size ? (size.paneWidth / size.rowWidth) * 100 : share
    const next = clampShare(current + delta)
    setShare(next)
    storeShare(storageKey, next)
  }

  const paneStyle: React.CSSProperties & Record<'--split-pane-width', string> =
    { '--split-pane-width': `${share}%` }

  return (
    <div className="@container">
      <div className="flex flex-col gap-6 @3xl:flex-row @3xl:gap-0">
        <aside
          ref={paneRef}
          aria-label={label}
          style={paneStyle}
          className="w-full shrink-0 @3xl:sticky @3xl:top-0 @3xl:max-h-[calc(100svh-7rem)] @3xl:w-(--split-pane-width) @3xl:max-w-4xl @3xl:min-w-[min(636px,max(0px,100%_-_360px))] @3xl:self-start @3xl:overflow-y-auto @3xl:pr-4"
        >
          {left}
        </aside>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${label.toLowerCase()}`}
          aria-valuenow={Math.round(share)}
          aria-valuemin={0}
          aria-valuemax={100}
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
