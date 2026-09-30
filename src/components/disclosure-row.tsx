import { ChevronRight } from 'lucide-react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface DisclosureRowProps {
  title: string
  summary?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}

export function DisclosureRow({
  title,
  summary,
  defaultOpen = false,
  children,
}: DisclosureRowProps) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="rounded-lg border">
      <CollapsibleTrigger className="group flex w-full cursor-pointer items-center gap-3 rounded-lg px-4 py-3 text-left text-sm outline-hidden select-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex-1">{title}</span>
        {summary !== undefined ? (
          <span className="truncate text-muted-foreground">{summary}</span>
        ) : null}
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out group-data-[panel-open]:rotate-90 motion-reduce:transition-none"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-200 ease-out data-[ending-style]:h-0 data-[ending-style]:opacity-0 data-[starting-style]:h-0 data-[starting-style]:opacity-0 motion-reduce:transition-none">
        <div className="border-t px-2 py-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}
