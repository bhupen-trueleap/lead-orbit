const ALGORITHM = 'pbkdf2-sha256'
const ITERATIONS = 50_000
const MAX_ITERATIONS = 100_000
const SALT_BYTES = 16
const KEY_BITS = 256

const encoder = new TextEncoder()

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(text), (character) => character.charCodeAt(0))
}

async function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    KEY_BITS,
  )
  return new Uint8Array(bits)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const key = await derive(password, salt, ITERATIONS)
  return [ALGORITHM, ITERATIONS, toBase64(salt), toBase64(key)].join('$')
}

export async function verifyPassword({
  hash,
  password,
}: {
  hash: string
  password: string
}): Promise<boolean> {
  const [algorithm, rounds, salt, expected] = hash.split('$')
  const iterations = Number(rounds)
  if (
    algorithm !== ALGORITHM ||
    !Number.isInteger(iterations) ||
    iterations < 1 ||
    iterations > MAX_ITERATIONS ||
    !salt ||
    !expected
  ) {
    return false
  }
  try {
    const actual = await derive(password, fromBase64(salt), iterations)
    const wanted = fromBase64(expected)
    if (actual.length !== wanted.length) return false
    let difference = 0
    actual.forEach((byte, index) => {
      difference |= byte ^ (wanted.at(index) ?? 0)
    })
    return difference === 0
  } catch {
    return false
  }
}
