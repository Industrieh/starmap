import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import type { JSX, ReactNode } from 'react'

import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from '@/lib/metadata'
import { SITE_URL } from '@/lib/routes'

import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

/**
 * What every page inherits. Each page states its own canonical URL and preview
 * through `pageMetadata()`; nothing page-specific lives here, so a page that
 * forgets cannot claim to be the home page. Next.js merges `openGraph`
 * shallowly, so a page that sets it replaces this one whole.
 *
 * `metadataBase` is what lets those pages write relative paths: a canonical link
 * and `og:url` must be absolute, and this turns `/docs` into the full URL.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: { type: 'website', siteName: SITE_NAME },
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
