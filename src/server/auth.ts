const ALLOWED_EMAIL_DOMAIN = '@trueleap.io'

export function getRequestEmail(request: Request): string | null {
  const header = request.headers.get('cf-access-authenticated-user-email')
  const email = (header ?? process.env.DEV_USER_EMAIL ?? '')
    .trim()
    .toLowerCase()
  return email.endsWith(ALLOWED_EMAIL_DOMAIN) ? email : null
}
