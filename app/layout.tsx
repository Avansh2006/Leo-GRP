import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import Navbar from '@/components/Navbar'
import { ToastProvider } from '@/components/ToastProvider'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { DutyProvider } from '@/contexts/DutyContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { UserProfileProvider } from '@/contexts/UserProfileContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Grand RP LEO Toolkit',
  description: 'Law Enforcement Officer toolkit for Grand RP - Bodycam commands, patrolman\'s guide, and evidence generator',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <NotificationProvider>
            <UserProfileProvider>
              <DutyProvider>
                <ToastProvider>
                  <Navbar />
                  <main className="container mx-auto px-4 py-8">
                    {children}
                  </main>
                </ToastProvider>
              </DutyProvider>
            </UserProfileProvider>
          </NotificationProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
