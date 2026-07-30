/**
 * `@industrieh/starmap-render` — turn a `@industrieh/starmap` universe into SVG.
 *
 * The package produces **strings**, not components. A component would pick a
 * framework for you; a string is consumed everywhere — written to a `.svg`
 * file, inlined in a page, put in a `data:` URI, rendered on a server, built in
 * a worker.
 *
 * It follows from that that there is **no interaction here**. Pan, zoom,
 * selection and the clock belong to the application. This package draws one
 * frame, for one moment.
 *
 * Its only dependency is `@industrieh/starmap`. No DOM, no framework, no
 * stylesheet.
 *
 * @example Draw a system, and the galaxy it belongs to
 * ```ts
 * import { createGalaxy, findRoute } from '@industrieh/starmap'
 * import { renderGalaxy, renderSystem } from '@industrieh/starmap-render'
 *
 * const galaxy = createGalaxy({ systems: [...], lanes: [...] })
 *
 * const system = renderSystem(galaxy.systems[0], { t: 12.5 })
 * const map = renderGalaxy(galaxy, { highlight: findRoute(galaxy, 'sol', 'vega')?.systemIds })
 *
 * await Bun.write('system.svg', system)
 * ```
 *
 * @packageDocumentation
 */

// --- drawing a system
export { renderSystem, renderSystemContent, type RenderSystemOptions } from './core/system'

// --- drawing a galaxy
export { renderGalaxy, renderGalaxyContent, type RenderGalaxyOptions } from './core/galaxy'

// --- the document around a drawing
export { svgDocument, type DocumentOptions } from './core/root'

// --- framing and shapes
export {
  arcPath,
  backdropStars,
  GALAXY_MARGIN,
  galaxyViewBox,
  SYSTEM_MARGIN,
  systemViewBox,
  viewBoxAttr,
  type BackdropStar,
  type ViewBox,
} from './core/geometry'

// --- the look
export {
  DEFAULT_THEME,
  pickColor,
  pickRouteStyle,
  resolveTheme,
  type ColorMap,
  type RouteStyle,
  type RouteStyleMap,
  type Theme,
  type ThemeInput,
} from './core/theme'

// --- SVG string building blocks, for drawing your own overlays
export {
  background,
  dash,
  el,
  escapeXml,
  group,
  num,
  text,
  type Attrs,
  type AttrValue,
} from './core/svg'
