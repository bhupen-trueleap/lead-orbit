import { createContext, use, useEffect, useMemo, useState } from 'react'

interface PageCrumb {
  crumb: string | null
  setCrumb: (crumb: string | null) => void
}

const PageCrumbContext = createContext<PageCrumb>({
  crumb: null,
  setCrumb: () => undefined,
})

export function PageCrumbProvider({ children }: { children: React.ReactNode }) {
  const [crumb, setCrumb] = useState<string | null>(null)
  const value = useMemo(() => ({ crumb, setCrumb }), [crumb])
  return <PageCrumbContext value={value}>{children}</PageCrumbContext>
}

export function useCurrentCrumb(): string | null {
  return use(PageCrumbContext).crumb
}

export function usePageCrumb(label: string | null) {
  const { setCrumb } = use(PageCrumbContext)
  useEffect(() => {
    setCrumb(label)
    return () => setCrumb(null)
  }, [label, setCrumb])
}
