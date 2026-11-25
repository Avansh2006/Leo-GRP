'use client'

import React, { useEffect, useState } from 'react'
import { scopedStorage } from '@/servers'
import { useToast } from '@/components/ToastProvider'
import { isValidWebhookUrl, postToDiscord } from '@/utils/discord'

const WEBHOOK_KEY = 'leogrp_discord_webhook'
const USERNAME_KEY = 'leogrp_discord_username'
const CHANGED_EVENT = 'leogrp:discord-changed'

function readSettings() {
  return {
    webhook: scopedStorage.getItem(WEBHOOK_KEY) || '',
    username: scopedStorage.getItem(USERNAME_KEY) || '',
  }
}

function useDiscordSettings() {
  const [settings, setSettings] = useState({ webhook: '', username: '' })
  useEffect(() => {
    setSettings(readSettings())
    const onChange = () => setSettings(readSettings())
    window.addEventListener(CHANGED_EVENT, onChange)
    return () => window.removeEventListener(CHANGED_EVENT, onChange)
  }, [])
  return settings
}

/** "Post to Discord" button; hidden until a webhook is set up on the Profile page. */
export function DiscordPostButton({
  getText,
  label = 'Post to Discord',
  className,
}: {
  getText: () => string
  label?: string
  className?: string
}) {
  const { webhook, username } = useDiscordSettings()
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  if (!webhook) return null

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          const n = await postToDiscord(webhook, getText(), { username })
          showToast(n > 1 ? `Posted to Discord (${n} messages)` : 'Posted to Discord', 'success')
        } catch (e) {
          showToast(e instanceof Error ? e.message : 'Could not post to Discord', 'error')
        } finally {
          setBusy(false)
        }
      }}
      className={
        className ||
        'px-3 py-1.5 text-xs font-mono font-bold rounded bg-[#5865F2] hover:bg-[#4752c4] text-white flex items-center gap-1.5 disabled:opacity-60'
      }
      title="Send this report to your department's Discord channel"
    >
      <span>💬</span> {busy ? 'Posting…' : label}
    </button>
  )
}

/** Profile-page settings card for the Discord webhook. */
export function DiscordSettings() {
  const { showToast } = useToast()
  const [webhook, setWebhook] = useState('')
  const [username, setUsername] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    const s = readSettings()
    setWebhook(s.webhook)
    setUsername(s.username)
  }, [])

  const valid = webhook.trim() === '' || isValidWebhookUrl(webhook)

  const save = () => {
    if (!valid) {
      showToast('That is not a Discord webhook link', 'error')
      return
    }
    if (webhook.trim()) scopedStorage.setItem(WEBHOOK_KEY, webhook.trim())
    else scopedStorage.removeItem(WEBHOOK_KEY)
    if (username.trim()) scopedStorage.setItem(USERNAME_KEY, username.trim())
    else scopedStorage.removeItem(USERNAME_KEY)
    window.dispatchEvent(new Event(CHANGED_EVENT))
    showToast(webhook.trim() ? 'Discord webhook saved' : 'Discord posting turned off', 'success')
  }

  return (
    <div className="space-y-2 text-xs font-mono">
      <p className="text-on-surface-variant">
        Post shift, arrest and evidence reports straight to your department&apos;s Discord channel. In Discord: channel settings →
        Integrations → Webhooks → New Webhook → Copy Webhook URL. The link stays in this browser only and is used only when you
        click &quot;Post to Discord&quot;.
      </p>
      <input
        type="url"
        value={webhook}
        onChange={(e) => setWebhook(e.target.value)}
        placeholder="https://discord.com/api/webhooks/…"
        aria-label="Discord webhook URL"
        className={`w-full px-2 py-1.5 bg-surface-container-lowest border rounded text-xs text-on-surface ${valid ? 'border-outline-variant' : 'border-error'}`}
      />
      {!valid && <p className="text-error text-[11px]">Paste the full webhook link that starts with https://discord.com/api/webhooks/</p>}
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Post as (optional, e.g. your officer name)"
        aria-label="Discord display name"
        className="w-full px-2 py-1.5 bg-surface-container-lowest border border-outline-variant rounded text-xs text-on-surface"
      />
      <div className="flex flex-wrap gap-2">
        <button onClick={save} className="px-3 py-1.5 rounded bg-primary text-on-primary font-bold">
          Save
        </button>
        <button
          disabled={!webhook.trim() || !valid || testing}
          onClick={async () => {
            setTesting(true)
            try {
              await postToDiscord(webhook, '✅ LEO Toolkit is connected to this channel.', { username })
              showToast('Test message sent. Check your Discord channel', 'success')
            } catch (e) {
              showToast(e instanceof Error ? e.message : 'Test failed', 'error')
            } finally {
              setTesting(false)
            }
          }}
          className="px-3 py-1.5 rounded border border-outline-variant text-on-surface disabled:opacity-50"
        >
          {testing ? 'Sending…' : 'Send test message'}
        </button>
      </div>
    </div>
  )
}
