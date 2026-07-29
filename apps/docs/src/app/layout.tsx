import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import type { JSX, ReactNode } from 'react'

import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'

import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'starmap — a typed star universe for JS/TS games',
    template: '%s · starmap',
  },
  description:
    'Describe, validate and query a star universe, then draw it as SVG. Two small libraries, no dependencies.',
}

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    // `suppressHydrationWarning` is required by next-themes: it writes the
    // stored theme onto this element before React hydrates.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="flex min-h-svh flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <SiteHeader />
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
