import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { cookies } from 'next/headers'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'
import { ToastProvider } from '@/components/ToastProvider'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { DutyProvider } from '@/contexts/DutyContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { UserProfileProvider } from '@/contexts/UserProfileContext'
import { ProductivityProvider } from '@/contexts/ProductivityContext'
import AppShell from '@/components/shell/AppShell'
import { SequenceProvider } from '@/contexts/SequenceContext'
import { SERVER_COOKIE, DEFAULT_SERVER_ID, SERVER_PACKS } from '@/servers/registry'
import { I18nProvider } from '@/i18n/I18nProvider'
import { LANG_COOKIE, DEFAULT_LANG, isLang } from '@/i18n/languages'
import { PACK_ID_RE } from '@/utils/packValidation'
import { ServerProvider } from '@/servers/ServerContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LEO-GRP — Operations Center',
  description: 'Law Enforcement Operations Center for RP servers - bodycam commands, legislation guide, evidence generator, and duty tracking',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  appleWebApp: { capable: true, title: 'LEO Toolkit', statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  themeColor: '#131315',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // The chosen RP server is kept in a cookie so the first render already uses its pack.
  const cookieServer = cookies().get(SERVER_COOKIE)?.value
  // Built-in ids render on the server; ids of packs installed in the browser are resolved client-side
  const serverId = cookieServer && PACK_ID_RE.test(cookieServer) ? cookieServer : DEFAULT_SERVER_ID

  // Interface language: cookie, else the server pack's default, else English
  const cookieLang = cookies().get(LANG_COOKIE)?.value
  const packLang = SERVER_PACKS[serverId]?.server.defaultLanguage
  const lang = isLang(cookieLang) ? cookieLang : isLang(packLang) ? packLang : DEFAULT_LANG

  return (
    <html lang={lang} className="dark">
      <body className={`${inter.className} bg-background text-on-surface antialiased overflow-hidden`}>
        <ServerProvider serverId={serverId}>
          <I18nProvider initialLang={lang} hasCookie={isLang(cookieLang)} serverDefault={packLang}>
          <ThemeProvider>
            <NotificationProvider>
              <UserProfileProvider>
                <DutyProvider>
                  <ProductivityProvider>
                    <ToastProvider>
                      <SequenceProvider>
                        <AppShell>
                          {children}
                        </AppShell>
                      </SequenceProvider>
                    </ToastProvider>
                  </ProductivityProvider>
                </DutyProvider>
              </UserProfileProvider>
            </NotificationProvider>
          </ThemeProvider>
          </I18nProvider>
        </ServerProvider>
        <Analytics />
      </body>
    </html>
  )
}
