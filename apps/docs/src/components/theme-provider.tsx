'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ComponentProps, JSX } from 'react'

/**
 * `next-themes`, wrapped so the root layout can stay a Server Component.
 *
 * The provider writes the theme onto `<html>` as a class, which is what
 * `@custom-variant dark (&:is(.dark *))` in `globals.css` looks for. It runs a
 * blocking inline script before paint, so the stored theme is applied on the
 * first frame and there is no flash — that script is also why `<html>` carries
 * `suppressHydrationWarning`: it changes the markup before React sees it.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>): JSX.Element {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
