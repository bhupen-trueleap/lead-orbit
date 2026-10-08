import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { cn } from 'cn'

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('font-medium', className)}
      {...props}
    />
  )
}

const dialogSizes = {
  form: 'top-1/2 left-1/2 grid w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 gap-4 bg-popover p-4 text-popover-foreground',
  wide: 'top-1/2 left-1/2 grid max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto bg-popover p-4 text-popover-foreground',
  screen:
    'inset-x-3 top-1/2 max-h-[calc(100svh-1.5rem)] -translate-y-1/2 overflow-y-auto bg-background text-foreground sm:inset-x-6 sm:max-h-[calc(100svh-3rem)]',
}

function DialogContent({
  className,
  size = 'form',
  ...props
}: DialogPrimitive.Popup.Props & { size?: keyof typeof dialogSizes }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="dialog-overlay"
        className="fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          'fixed z-50 rounded-xl ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          dialogSizes[size],
          className,
        )}
        {...props}
      />
    </DialogPrimitive.Portal>
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle }
