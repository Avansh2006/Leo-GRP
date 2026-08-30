import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'
import { ToastProvider } from '@/components/ToastProvider'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { DutyProvider } from '@/contexts/DutyContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { UserProfileProvider } from '@/contexts/UserProfileContext'
import { ProductivityProvider } from '@/contexts/ProductivityContext'
import AppShell from '@/components/shell/AppShell'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LEO-GRP — Operations Center',
  description: 'Law Enforcement Operations Center for Grand RP - Bodycam commands, patrolman guide, evidence generator, and duty tracking',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-on-surface antialiased overflow-hidden`}>
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
        <Analytics />
      </body>
    </html>
  )
}
