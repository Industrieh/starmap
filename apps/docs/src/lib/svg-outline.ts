/**
 * Readable outlines of the renderer's real output, for the pages that show what
 * a call returns.
 *
 * A listing typed by hand next to the call it claims to come from is exactly
 * the drift these docs keep promising not to have: the Quickstart's said
 * `width="700"` and "no routes layer" about a call that produced neither. These
 * helpers fold the real string instead, so a listing changes when the renderer
 * does.
 *
 * The parser is only as clever as the input requires. The renderer writes
 * well-formed markup with no comments, no CDATA and no `>` inside attribute
 * values (it escapes them), so splitting on tags is exact here — it is not a
 * general XML parser, and must not be pointed at anything else.
 */

type SvgNode = {
  /** The opening tag, attributes included, exactly as written. */
  open: string
  name: string
  selfClosing: boolean
  children: SvgNode[]
  /** Text directly inside the element, e.g. a label. */
  text: string
}

function parse(svg: string): SvgNode {
  const root: SvgNode = { open: '', name: '#root', selfClosing: false, children: [], text: '' }
  const stack: SvgNode[] = [root]

  for (const [token] of svg.matchAll(/<[^>]+>|[^<]+/g)) {
    const parent = stack[stack.length - 1]
    if (token.startsWith('</')) {
      stack.pop()
    } else if (token.startsWith('<')) {
      const node: SvgNode = {
        open: token,
        name: /^<([\w:-]+)/.exec(token)?.[1] ?? '',
        selfClosing: token.endsWith('/>'),
        children: [],
        text: '',
      }
      parent.children.push(node)
      if (!node.selfClosing) stack.push(node)
    } else {
      parent.text += token
    }
  }

  const svgNode = root.children[0]
  if (svgNode === undefined) throw new Error('svg-outline: no element in the input')
  return svgNode
}

/** The first node, depth first, whose opening tag passes `test`. */
function find(node: SvgNode, test: (openTag: string) => boolean): SvgNode | undefined {
  if (test(node.open)) return node
  for (const child of node.children) {
    const found = find(child, test)
    if (found) return found
  }
  return undefined
}

/** One element on one line: in full if it holds only text, folded to `…` otherwise. */
function fold(node: SvgNode): string {
  if (node.selfClosing) return node.open
  const inner = node.children.length === 0 ? node.text.trim() : '…'
  return `${node.open}${inner}</${node.name}>`
}

/**
 * A rendered document, one line per top-level element, contents folded.
 *
 * @param unfold the top-level elements to open one level further — their
 * children are listed, folded in turn.
 */
export function outlineSvg(
  svg: string,
  unfold: (openTag: string) => boolean = () => false,
): string {
  const root = parse(svg)
  const lines = [root.open]

  for (const child of root.children) {
    if (!child.selfClosing && child.children.length > 0 && unfold(child.open)) {
      lines.push(child.open, ...child.children.map((c) => `  ${fold(c)}`), `</${child.name}>`)
    } else {
      lines.push(fold(child))
    }
  }

  lines.push(`</${root.name}>`)
  return lines.join('\n')
}

/**
 * One element of a rendered document and its direct children, each child on its
 * own line, annotated.
 *
 * @param match picks the element, by its opening tag
 * @param note a comment for a child, or `undefined` for none
 * @param parentOf picks the element's parent, printed around it, so the
 * listing shows where it sits
 */
export function outlineElement(
  svg: string,
  {
    match,
    note,
    parentOf,
  }: {
    match: (openTag: string) => boolean
    note: (openTag: string, index: number) => string | undefined
    parentOf?: (openTag: string) => boolean
  },
): string {
  const root = parse(svg)
  const element = find(root, match)
  if (!element) throw new Error('svg-outline: no element matches')

  const parent = parentOf ? find(root, parentOf) : undefined
  const indent = parent ? '  ' : ''

  const rows = element.children.map((child, i) => ({
    code: fold(child),
    note: note(child.open, i),
  }))
  const width = Math.max(...rows.map((row) => row.code.length))
  const body = rows.map(
    (row) =>
      `${indent}  ${row.note === undefined ? row.code : `${row.code.padEnd(width)}   ${row.note}`}`,
  )

  const lines = [`${indent}${element.open}`, ...body, `${indent}</${element.name}>`]
  return parent ? [parent.open, ...lines, `</${parent.name}>`].join('\n') : lines.join('\n')
}
