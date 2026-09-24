import { createFileRoute } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold">Welcome to Lead Orbit</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Edit <code>src/routes/index.tsx</code> to get started.
      </p>
      <div className="mt-6 flex gap-3">
        <Button>Get started</Button>
        <Button variant="outline">Learn more</Button>
      </div>
    </div>
  )
}
