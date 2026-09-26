const LINKEDIN_COUNTRY_SUBDOMAIN = /^[a-z]{2}\.(?=linkedin\.com$)/

export function normalizeUrl(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null

  const host = url.host
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(LINKEDIN_COUNTRY_SUBDOMAIN, '')
  const path = url.pathname.replace(/\/+$/, '')
  return `https://${host}${path}`
}
