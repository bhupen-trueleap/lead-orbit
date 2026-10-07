import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import { createServerEntry } from '@tanstack/react-start/server-entry'

import { withDatabase } from '@/db'

const handle = createStartHandler(defaultStreamHandler)

export default createServerEntry({
  fetch: (request, options) => withDatabase(() => handle(request, options)),
})
