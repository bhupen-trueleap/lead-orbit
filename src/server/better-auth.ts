import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError } from 'better-auth/api'
import { emailOTP } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { account, session, user, verification } from '@/db/auth-schema'
import { isAllowedEmail } from '@/server/access'

const NO_ACCESS = 'This email has not been invited to LeadOrbit.'
const SESSION_DAYS = 30

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

export const googleEnabled = Boolean(googleClientId && googleClientSecret)

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification },
  }),
  session: { expiresIn: SESSION_DAYS * 24 * 60 * 60 },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {},
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => {
          if (!isAllowedEmail(newUser.email)) {
            throw new APIError('FORBIDDEN', { message: NO_ACCESS })
          }
        },
      },
    },
    session: {
      create: {
        before: async (newSession) => {
          const owner = (
            await db
              .select({ email: user.email })
              .from(user)
              .where(eq(user.id, newSession.userId))
          ).at(0)
          if (!owner || !isAllowedEmail(owner.email)) {
            throw new APIError('FORBIDDEN', { message: NO_ACCESS })
          }
        },
      },
    },
  },
  plugins: [
    emailOTP({
      sendVerificationOTP: async ({ email, otp, type }) => {
        if (type !== 'sign-in' || !isAllowedEmail(email)) return
        console.info(`[auth] Sign-in code for ${email}: ${otp}`)
      },
    }),
    tanstackStartCookies(),
  ],
})
