export function getRequestEmail(request: Request): string | null {
  const header = request.headers.get('cf-access-authenticated-user-email')
  const email = (header ?? process.env.DEV_USER_EMAIL ?? '')
    .trim()
    .toLowerCase()
  return email === '' ? null : email
}
