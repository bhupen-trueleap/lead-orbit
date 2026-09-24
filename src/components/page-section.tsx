interface PageSectionProps {
  title: string
  children: React.ReactNode
}

export function PageSection({ title, children }: PageSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">{title}</h2>
      {children}
    </section>
  )
}
