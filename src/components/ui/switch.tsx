import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { cn } from 'cn'

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-muted-foreground/30 transition-colors outline-none after:absolute after:-inset-2 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="block size-4 translate-x-0.5 rounded-full bg-background shadow-sm transition-transform duration-200 ease-out data-checked:translate-x-[1.125rem] motion-reduce:transition-none"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
