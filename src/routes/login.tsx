import { createFileRoute, redirect } from '@tanstack/react-router'
import { Orbit } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { appConfig } from '@/config/app'
import { authClient } from '@/lib/auth-client'
import { loadViewer } from '@/server/viewer'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    if (await loadViewer()) throw redirect({ to: '/' })
  },
  head: () => ({ meta: [{ title: `Sign in · ${appConfig.name}` }] }),
  component: Login,
})

const NO_ACCESS =
  'This account has not been invited to LeadOrbit. Ask an admin to add your email.'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signIn() {
    setBusy(true)
    setError(null)
    try {
      const { error: failure } = await authClient.signIn.email({
        email: email.trim(),
        password,
      })
      if (!failure) {
        window.location.assign('/')
        return
      }
      setError(
        failure.status === 403
          ? NO_ACCESS
          : failure.status === 429
            ? 'Too many attempts. Wait a minute and try again.'
            : 'That email and password don’t match.',
      )
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setBusy(false)
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <Orbit className="mx-auto size-8" aria-hidden="true" />
          <h1 className="text-xl font-semibold">Sign in to {appConfig.name}</h1>
          <p className="text-sm text-muted-foreground">
            Access is by invitation.
          </p>
        </div>

        <form
          className="space-y-3 rounded-xl border p-5"
          onSubmit={(event) => {
            event.preventDefault()
            void signIn()
          }}
        >
          <Input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            aria-label="Email"
            disabled={busy}
            autoFocus
          />
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            aria-label="Password"
            disabled={busy}
          />
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Forgot your password? Ask an admin to reset it.
            </p>
          )}
        </form>
      </div>
    </main>
  )
}
