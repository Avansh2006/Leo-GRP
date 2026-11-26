/**
 * Post reports to a Discord channel through a webhook the officer sets up themselves
 * (Discord: Channel settings → Integrations → Webhooks → Copy URL).
 * The URL is stored only in this browser, per server. Nothing is sent unless the officer clicks.
 */

const WEBHOOK_RE = /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/

/** Discord rejects messages longer than this */
export const DISCORD_MAX = 2000

export function isValidWebhookUrl(url: string): boolean {
  return WEBHOOK_RE.test(url.trim())
}

/** Split text into Discord-sized messages, breaking on line boundaries where possible. */
export function splitForDiscord(text: string, max = DISCORD_MAX): string[] {
  const chunks: string[] = []
  let current = ''
  for (const line of text.split('\n')) {
    const candidate = current ? `${current}\n${line}` : line
    if (candidate.length <= max) {
      current = candidate
      continue
    }
    if (current) chunks.push(current)
    // A single line longer than the limit gets hard-split
    let rest = line
    while (rest.length > max) {
      chunks.push(rest.slice(0, max))
      rest = rest.slice(max)
    }
    current = rest
  }
  if (current.trim()) chunks.push(current)
  return chunks
}

export interface DiscordPostOptions {
  /** Shown as the message author instead of the webhook's default name */
  username?: string
}

/** Send text to the webhook, in as many messages as needed. Throws with a readable message on failure. */
export async function postToDiscord(webhookUrl: string, text: string, opts: DiscordPostOptions = {}): Promise<number> {
  if (!isValidWebhookUrl(webhookUrl)) throw new Error('That is not a Discord webhook link.')
  const parts = splitForDiscord(text.trim())
  if (parts.length === 0) throw new Error('Nothing to post.')
  for (const content of parts) {
    const res = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        username: opts.username?.slice(0, 80) || undefined,
        allowed_mentions: { parse: [] }, // never ping @everyone/roles from report text
      }),
    })
    if (res.status === 429) throw new Error('Discord is rate-limiting this webhook. Try again in a moment.')
    if (res.status === 404 || res.status === 401) throw new Error('Discord says this webhook does not exist anymore. Paste a new link on the Profile page.')
    if (!res.ok) throw new Error(`Discord returned an error (${res.status}).`)
  }
  return parts.length
}
