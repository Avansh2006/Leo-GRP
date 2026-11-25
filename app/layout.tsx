import type { Metadata } from 'next'
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
import { SERVER_COOKIE, DEFAULT_SERVER_ID, isKnownServerId } from '@/servers/registry'
import { ServerProvider } from '@/servers/ServerContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LEO-GRP — Operations Center',
  description: 'Law Enforcement Operations Center for RP servers - bodycam commands, legislation guide, evidence generator, and duty tracking',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // The chosen RP server is kept in a cookie so the first render already uses its pack.
  const cookieServer = cookies().get(SERVER_COOKIE)?.value
  const serverId = isKnownServerId(cookieServer) ? cookieServer : DEFAULT_SERVER_ID

  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-on-surface antialiased overflow-hidden`}>
        <ServerProvider serverId={serverId}>
          <ThemeProvider>
            <NotificationProvider>
              <UserProfileProvider>
                <DutyProvider>
                  <ProductivityProvider>
                    <ToastProvider>
                      <AppShell>
                        {children}
                      </AppShell>
                    </ToastProvider>
                  </ProductivityProvider>
                </DutyProvider>
              </UserProfileProvider>
            </NotificationProvider>
          </ThemeProvider>
        </ServerProvider>
        <Analytics />
      </body>
    </html>
  )
}
