/**
 * A minimal well-formedness check for the strings this package produces.
 *
 * The package writes XML by hand, so the risk it has to answer for is malformed
 * output: an unclosed tag, a name that was never escaped. A real parser would be
 * a dependency; this is thirty lines and catches exactly those two mistakes.
 *
 * It is not a validator. It says nothing about whether the SVG draws anything.
 */

const TAG = /<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g

/** Problems found in a fragment, empty if it is well formed. */
export function xmlProblems(source: string): string[] {
  const problems: string[] = []
  const open: string[] = []
  let cursor = 0

  for (const match of source.matchAll(TAG)) {
    const [tag, closing, name, , selfClosing] = match
    checkText(source.slice(cursor, match.index), problems)
    cursor = match.index + tag.length

    if (closing) {
      const last = open.pop()
      if (last !== name) problems.push(`</${name}> closes <${last ?? 'nothing'}>`)
    } else if (!selfClosing) {
      open.push(name)
    }
  }

  checkText(source.slice(cursor), problems)
  if (open.length) problems.push(`never closed: ${open.join(', ')}`)
  return problems
}

/** Text between two tags may hold no raw `<`, and no `&` that starts nothing. */
function checkText(text: string, problems: string[]): void {
  if (text.includes('<')) problems.push(`raw "<" in text: ${text.trim().slice(0, 40)}`)
  for (const match of text.matchAll(/&(?!(?:amp|lt|gt|quot|apos|#\d+);)/g)) {
    problems.push(`unescaped "&" in text: ${text.slice(match.index, match.index + 20)}`)
  }
}
