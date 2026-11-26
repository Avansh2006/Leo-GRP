#!/usr/bin/env node
// Discord webhook helpers (utils/discord.ts). Uses a stubbed fetch; nothing is sent.
import assert from 'node:assert/strict'
import { isValidWebhookUrl, splitForDiscord, postToDiscord } from '../utils/discord.ts'

assert.equal(isValidWebhookUrl('https://discord.com/api/webhooks/123456/abc-DEF_9'), true)
assert.equal(isValidWebhookUrl('https://canary.discord.com/api/webhooks/1/x'), true)
assert.equal(isValidWebhookUrl('https://evil.example.com/api/webhooks/1/x'), false)
assert.equal(isValidWebhookUrl('http://discord.com/api/webhooks/1/x'), false)

const long = Array.from({ length: 300 }, (_, i) => `Line ${i} ${'x'.repeat(20)}`).join('\n')
const parts = splitForDiscord(long)
assert.ok(parts.length > 1 && parts.every((p) => p.length <= 2000))
assert.equal(parts.join('\n'), long)
assert.ok(splitForDiscord('y'.repeat(4500)).every((p) => p.length <= 2000))

const sent = []
globalThis.fetch = async (url, init) => {
  sent.push(JSON.parse(init.body))
  return { ok: true, status: 204 }
}
const n = await postToDiscord('https://discord.com/api/webhooks/1/abc', long, { username: 'Officer Test' })
assert.equal(n, parts.length)
assert.equal(sent[0].username, 'Officer Test')
assert.deepEqual(sent[0].allowed_mentions, { parse: [] })

globalThis.fetch = async () => ({ ok: false, status: 404 })
await assert.rejects(postToDiscord('https://discord.com/api/webhooks/1/abc', 'hi'), /does not exist/)

console.log('Discord webhook\n  ✓ URL validation\n  ✓ long reports split under 2000 chars, nothing lost\n  ✓ payload: username, no pings\n  ✓ deleted webhook gives a clear error')
