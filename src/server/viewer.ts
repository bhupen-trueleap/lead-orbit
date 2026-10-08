import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

import type { Viewer } from '@/lib/viewer'
import { viewerFromHeaders } from '@/server/auth'

const getViewer = createServerFn({ method: 'GET' }).handler(
  (): Promise<Viewer | null> => viewerFromHeaders(getRequest().headers),
)

let cachedViewer: Promise<Viewer | null> | null = null

export function loadViewer(): Promise<Viewer | null> {
  if (typeof window === 'undefined') return getViewer()
  cachedViewer ??= getViewer().catch((error: unknown) => {
    cachedViewer = null
    throw error
  })
  return cachedViewer
}
