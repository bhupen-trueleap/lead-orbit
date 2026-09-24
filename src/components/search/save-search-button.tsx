import { Bookmark, BookmarkCheck } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { saveSearch } from '@/lib/saved-searches'
import type { SearchRequest } from '@/lib/search'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface SaveSearchButtonProps {
  request: SearchRequest
}

const labels: Record<SaveStatus, string> = {
  idle: 'Save search',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Could not save. Retry',
}

export function SaveSearchButton({ request }: SaveSearchButtonProps) {
  const [status, setStatus] = useState<SaveStatus>('idle')

  async function handleClick() {
    setStatus('saving')
    try {
      setStatus((await saveSearch(request)) ? 'saved' : 'error')
    } catch {
      setStatus('error')
    }
  }

  const Icon = status === 'saved' ? BookmarkCheck : Bookmark

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={status === 'saving' || status === 'saved'}
      onClick={() => void handleClick()}
    >
      <Icon />
      {labels[status]}
    </Button>
  )
}
