/**
 * The two controls that appear in more than one view, as class strings.
 *
 * Tailwind reads source files as plain text and keeps the classes it finds
 * there — so a class has to appear *in full* somewhere. These constants are
 * whole strings for that reason, never assembled from fragments, and the same
 * rule is why the views below map a value to a complete class name rather than
 * building one with a template literal.
 */

export const BUTTON =
  'cursor-pointer rounded-md border border-line bg-panel px-2.5 py-1 text-muted transition-colors enabled:hover:text-text disabled:cursor-default disabled:opacity-40'

/** Added to {@link BUTTON} when that button is the one currently in effect. */
export const BUTTON_ON = 'border-accent text-text'

export const FIELD =
  'rounded-md border border-line bg-panel px-2 py-1 text-text outline-none focus-visible:border-accent'
