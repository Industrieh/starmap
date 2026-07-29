'use client'

import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState, type JSX } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const OPTIONS = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: MonitorIcon },
] as const

export function ModeToggle(): JSX.Element {
  const { theme, setTheme } = useTheme()

  // The server cannot know which theme the browser stored, so the icon would
  // differ between the server render and the first client render — a hydration
  // mismatch. Waiting for mount before reading `theme` avoids it; until then the
  // button renders its neutral state at the right size, so nothing shifts.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const active = OPTIONS.find((option) => option.value === theme) ?? OPTIONS[2]
  const Icon = mounted ? active.icon : MonitorIcon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Change theme">
            <Icon />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuGroup>
          {OPTIONS.map((option) => (
            <DropdownMenuItem key={option.value} onClick={() => setTheme(option.value)}>
              <option.icon />
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
