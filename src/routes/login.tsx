import { createFileRoute, redirect } from '@tanstack/react-router'
import { Orbit } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { appConfig } from '@/config/app'
import { authClient } from '@/lib/auth-client'
import { getSignInOptions, loadViewer } from '@/server/viewer'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { error?: string } =>
    typeof search.error === 'string' ? { error: search.error } : {},
  beforeLoad: async () => {
    if (await loadViewer()) throw redirect({ to: '/' })
  },
  loader: () => getSignInOptions(),
  head: () => ({ meta: [{ title: `Sign in · ${appConfig.name}` }] }),
  component: Login,
})

const NO_ACCESS =
  'This account has not been invited to LeadOrbit. Ask an admin to add your email.'

type Step = 'email' | 'code'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  )
}

function Login() {
  const { google } = Route.useLoaderData()
  const { error: callbackError } = Route.useSearch()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(
    callbackError ? NO_ACCESS : null,
  )

  async function withBusy(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function signInWithGoogle() {
    const { error: failure } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/',
      errorCallbackURL: '/login',
    })
    if (failure) setError('Could not start Google sign-in. Please try again.')
  }

  async function sendCode() {
    const { error: failure } = await authClient.emailOtp.sendVerificationOtp({
      email: email.trim(),
      type: 'sign-in',
    })
    if (failure) {
      setError('Could not send a code. Check the email and try again.')
      return
    }
    setStep('code')
  }

  async function verifyCode() {
    const { error: failure } = await authClient.signIn.emailOtp({
      email: email.trim(),
      otp: code.trim(),
    })
    if (failure) {
      setError(
        failure.status === 403
          ? NO_ACCESS
          : 'That code is wrong or has expired. Request a new one.',
      )
      return
    }
    window.location.assign('/')
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

        <div className="space-y-4 rounded-xl border p-5">
          {google ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={busy}
                onClick={() => void withBusy(signInWithGoogle)}
              >
                <GoogleIcon />
                Continue with Google
              </Button>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or use an email code
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          ) : null}

          {step === 'email' ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                void withBusy(sendCode)
              }}
            >
              <Input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                aria-label="Email"
                disabled={busy}
              />
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? 'Sending…' : 'Email me a sign-in code'}
              </Button>
            </form>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                void withBusy(verifyCode)
              }}
            >
              <p className="text-sm text-muted-foreground">
                If {email.trim()} has been invited, a 6-digit code is on its
                way.
              </p>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, ''))
                }
                placeholder="123456"
                aria-label="Sign-in code"
                disabled={busy}
                autoFocus
              />
              <Button
                type="submit"
                className="w-full"
                disabled={busy || code.length !== 6}
              >
                {busy ? 'Checking…' : 'Sign in'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                disabled={busy}
                onClick={() => {
                  setStep('email')
                  setCode('')
                  setError(null)
                }}
              >
                Use a different email
              </Button>
            </form>
          )}

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  )
}
