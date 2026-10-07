export function parseName(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const name = value.trim().replace(/\s+/g, ' ')
  return name === '' || name.length > maxLength ? null : name
}

export function isSameName(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}
