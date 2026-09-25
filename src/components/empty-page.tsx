import { Card, CardContent } from '@/components/ui/card'

interface EmptyPageProps {
  description: string
}

export function EmptyPage({ description }: EmptyPageProps) {
  return (
    <div className="mx-auto max-w-4xl">
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {description}
        </CardContent>
      </Card>
    </div>
  )
}
