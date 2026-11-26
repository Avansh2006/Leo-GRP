'use client'

import React, { useEffect, useState } from 'react'
import { scopedStorage } from '@/servers'
import { useToast } from '@/components/ToastProvider'
import { isValidWebhookUrl, postToDiscord } from '@/utils/discord'
import { useT } from '@/i18n/I18nProvider'

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
  label,
  className,
}: {
  getText: () => string
  label?: string
  className?: string
}) {
  const t = useT()
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
          showToast(n > 1 ? t('discord.postedMany', { n }) : t('discord.posted'), 'success')
        } catch (e) {
          showToast(e instanceof Error ? e.message : t('discord.postFailed'), 'error')
        } finally {
          setBusy(false)
        }
      }}
      className={
        className ||
        'px-3 py-1.5 text-xs font-mono font-bold rounded bg-[#5865F2] hover:bg-[#4752c4] text-white flex items-center gap-1.5 disabled:opacity-60'
      }
      title={t('discord.postHint')}
    >
      <span>💬</span> {busy ? t('discord.posting') : label || t('discord.post')}
    </button>
  )
}

/** Profile-page settings card for the Discord webhook. */
export function DiscordSettings() {
  const t = useT()
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
      showToast(t('discord.invalid'), 'error')
      return
    }
    if (webhook.trim()) scopedStorage.setItem(WEBHOOK_KEY, webhook.trim())
    else scopedStorage.removeItem(WEBHOOK_KEY)
    if (username.trim()) scopedStorage.setItem(USERNAME_KEY, username.trim())
    else scopedStorage.removeItem(USERNAME_KEY)
    window.dispatchEvent(new Event(CHANGED_EVENT))
    showToast(webhook.trim() ? t('discord.saved') : t('discord.off'), 'success')
  }

  return (
    <div className="space-y-2 text-xs font-mono">
      <p className="text-on-surface-variant">
        {t('discord.help')}
      </p>
      <input
        type="url"
        value={webhook}
        onChange={(e) => setWebhook(e.target.value)}
        placeholder="https://discord.com/api/webhooks/…"
        aria-label={t('discord.urlLabel')}
        className={`w-full px-2 py-1.5 bg-surface-container-lowest border rounded text-xs text-on-surface ${valid ? 'border-outline-variant' : 'border-error'}`}
      />
      {!valid && <p className="text-error text-[11px]">{t('discord.invalidHint')}</p>}
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder={t('discord.namePlaceholder')}
        aria-label={t('discord.nameLabel')}
        className="w-full px-2 py-1.5 bg-surface-container-lowest border border-outline-variant rounded text-xs text-on-surface"
      />
      <div className="flex flex-wrap gap-2">
        <button onClick={save} className="px-3 py-1.5 rounded bg-primary text-on-primary font-bold">
          {t('common.save')}
        </button>
        <button
          disabled={!webhook.trim() || !valid || testing}
          onClick={async () => {
            setTesting(true)
            try {
              await postToDiscord(webhook, '✅ LEO Toolkit is connected to this channel.', { username })
              showToast(t('discord.testSent'), 'success')
            } catch (e) {
              showToast(e instanceof Error ? e.message : t('discord.testFailed'), 'error')
            } finally {
              setTesting(false)
            }
          }}
          className="px-3 py-1.5 rounded border border-outline-variant text-on-surface disabled:opacity-50"
        >
          {testing ? t('discord.sending') : t('discord.test')}
        </button>
      </div>
    </div>
  )
}
