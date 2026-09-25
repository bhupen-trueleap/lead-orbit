import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

const SIDEBAR_COOKIE_NAME = 'sidebar_state'

export const getSidebarOpen = createServerFn({ method: 'GET' }).handler(
  () => getCookie(SIDEBAR_COOKIE_NAME) !== 'false',
)
