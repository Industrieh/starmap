'use client'

import { CheckIcon, CopyIcon } from 'lucide-react'
import { useEffect, useState, type JSX } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * The only interactive part of a code block, so the only part that ships as a
 * Client Component. The code itself is highlighted and rendered on the server.
 */
export function CopyButton({
  value,
  className,
}: {
  value: string
  className?: string
}): JSX.Element {
  const [copied, setCopied] = useState(false)

  // Reset the tick after a moment. The timer is cleared on unmount, and on a
  // second click, so a fast double-copy cannot leave the button stuck.
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={copied ? 'Copied' : 'Copy code'}
      className={cn('text-muted-foreground hover:text-foreground', className)}
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => setCopied(true))
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  )
}
