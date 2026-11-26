/**
 * What the page shows when the galaxy cannot be built, instead of a blank one.
 *
 * The README invites you to break the generator on purpose. When you do,
 * `createGalaxy()` throws a `GalaxyValidationError` that lists every problem
 * with its path — and without a boundary, React would unmount the whole app
 * and leave nothing to read. This catches the error and shows that list.
 *
 * It has to be a class: React only offers error boundaries through
 * `getDerivedStateFromError`, which has no hook equivalent. `App` gives it a
 * `key` per universe, so asking for another seed starts over with a fresh one.
 */

import { GalaxyValidationError } from '@industrieh/starmap'
import { Component, type JSX, type ReactNode } from 'react'

import { Notice } from './views/Notice'

export interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  /** Whether something below threw. Kept apart from `error`: anything can be thrown, `undefined` included. */
  failed: boolean
  error?: unknown
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { failed: true, error }
  }

  override render(): ReactNode {
    return this.state.failed ? <Failure error={this.state.error} /> : this.props.children
  }
}

function Failure({ error }: { error: unknown }): JSX.Element {
  if (error instanceof GalaxyValidationError) {
    return (
      <Notice role="alert" title="createGalaxy() rejected this galaxy">
        <p className="mb-3 text-muted">
          {error.issues.length} problem{error.issues.length === 1 ? '' : 's'}, each with the path of
          the value at fault. Fix the generator and save, or try another seed.
        </p>
        <ul className="flex flex-col gap-1 font-mono text-xs">
          {/* The list never reorders, and two issues can share a path and a message. */}
          {error.issues.map((issue, index) => (
            <li key={index}>
              <span className="text-accent">{issue.path || '(root)'}</span> — {issue.message}
            </li>
          ))}
        </ul>
      </Notice>
    )
  }

  return (
    <Notice role="alert" title="Something broke while drawing this galaxy">
      <pre className="font-mono text-xs whitespace-pre-wrap text-muted">
        {error instanceof Error ? error.message : String(error)}
      </pre>
    </Notice>
  )
}
