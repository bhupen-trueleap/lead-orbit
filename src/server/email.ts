import { appConfig } from '@/config/app'
import type { EmailResult } from '@/lib/people'

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'

interface EmailMessage {
  to: string
  subject: string
  text: string
  html: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.BREVO_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) return 'not-configured'
  try {
    const response = await fetch(BREVO_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: from, name: appConfig.name },
        to: [{ email: message.to }],
        subject: message.subject,
        textContent: message.text,
        htmlContent: message.html,
      }),
    })
    if (response.ok) return 'sent'
    console.error('Brevo rejected an email', response.status)
    return 'failed'
  } catch (error) {
    console.error('Could not reach Brevo', error)
    return 'failed'
  }
}

export function sendSignInDetails(
  to: string,
  password: string,
  reason: 'invite' | 'reset',
): Promise<EmailResult> {
  const loginUrl = `${(process.env.BETTER_AUTH_URL ?? '').replace(/\/$/, '')}/login`
  const intro =
    reason === 'invite'
      ? `You have been invited to ${appConfig.name}.`
      : `Your ${appConfig.name} password has been reset by an admin.`
  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 16px 4px 0;color:#666">${label}</td><td style="padding:4px 0"><strong>${escapeHtml(value)}</strong></td></tr>`
  return sendEmail({
    to,
    subject:
      reason === 'invite'
        ? `Your ${appConfig.name} invitation`
        : `Your new ${appConfig.name} password`,
    text: [
      intro,
      '',
      `Sign in: ${loginUrl}`,
      `Email: ${to}`,
      `Password: ${password}`,
      '',
      'If you were not expecting this, you can ignore this email.',
    ].join('\n'),
    html: `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;color:#111">
<p>${escapeHtml(intro)}</p>
<table style="border-collapse:collapse;margin:12px 0">
${row('Sign in', loginUrl)}
${row('Email', to)}
${row('Password', password)}
</table>
<p><a href="${escapeHtml(loginUrl)}">Open ${escapeHtml(appConfig.name)}</a></p>
<p style="color:#666">If you were not expecting this, you can ignore this email.</p>
</div>`,
  })
}
