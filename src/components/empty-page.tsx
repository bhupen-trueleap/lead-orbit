import { AppShell } from '@/components/layout/app-shell'
import { Card, CardContent } from '@/components/ui/card'

interface EmptyPageProps {
  title: string
  description: string
}

export function EmptyPage({ title, description }: EmptyPageProps) {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {description}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
