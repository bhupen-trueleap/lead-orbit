import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
  title: string
  detail: string
}

export function StatCard({ title, detail }: StatCardProps) {
  return (
    <Card>
      <CardContent className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}
