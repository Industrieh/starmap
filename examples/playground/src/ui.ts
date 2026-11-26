/**
 * The two controls that appear in more than one view, as class strings.
 *
 * Tailwind reads source files as plain text and keeps the classes it finds
 * there — so a class has to appear *in full* somewhere. Joining complete
 * classes, as below, is fine; building one class out of pieces is not, and the
 * same rule is why the views map a value to a complete class name rather than
 * building one with a template literal.
 */

/**
 * Every control here can be reached with the keyboard, so every one of them
 * shows where the focus is — `focus-visible`, so a mouse click does not leave a
 * ring behind.
 */
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export const BUTTON: string = `cursor-pointer rounded-md border border-line bg-panel px-2.5 py-1 text-muted transition-colors enabled:hover:text-text disabled:cursor-default disabled:opacity-40 ${FOCUS}`

/**
 * A row of a list of objects: borderless, full width, left-aligned. The row of
 * the selected object carries `aria-current="true"`, which is also what styles
 * it — one attribute for the screen reader and for the eye.
 */
export const LIST_BUTTON: string = `w-full cursor-pointer rounded-md px-2 py-0.5 text-left text-muted transition-colors hover:bg-line/40 hover:text-text aria-[current=true]:bg-line/60 aria-[current=true]:text-text ${FOCUS}`

/** Added to {@link BUTTON} when that button is the one currently in effect. */
export const BUTTON_ON = 'border-accent text-text'

export const FIELD =
  'rounded-md border border-line bg-panel px-2 py-1 text-text outline-none focus-visible:border-accent'
