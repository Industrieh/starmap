'use client'

import { CheckIcon, CopyIcon, XIcon } from 'lucide-react'
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
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  // Back to idle after a moment. The timer is cleared on unmount, and on a
  // second click, so a fast double-copy cannot leave the button stuck.
  useEffect(() => {
    if (status === 'idle') return
    const timer = setTimeout(() => setStatus('idle'), 2000)
    return () => clearTimeout(timer)
  }, [status])

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={
        status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : 'Copy code'
      }
      className={cn('text-muted-foreground hover:text-foreground', className)}
      onClick={() => {
        // The clipboard can refuse: no permission, an insecure origin, a
        // browser without the API. Say so on the button rather than leaving an
        // unhandled rejection and a click that silently did nothing.
        void Promise.resolve()
          .then(() => navigator.clipboard.writeText(value))
          .then(
            () => setStatus('copied'),
            () => setStatus('failed'),
          )
      }}
    >
      {status === 'copied' ? <CheckIcon /> : status === 'failed' ? <XIcon /> : <CopyIcon />}
    </Button>
  )
}
