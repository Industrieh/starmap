/**
 * Golden drawings.
 *
 * The other tests check what ends up in a drawing, loosely and on purpose.
 * These pin the exact output of a few drawings to files in `__snapshots__/` —
 * real `.svg` files, so a change to the look of the package shows up in review
 * both as a diff and as a picture anyone can open.
 *
 * A visual regression is exactly what the loose tests let through: the galaxy
 * backdrop once covered only a corner of any galaxy not centred on the origin,
 * and every assertion still passed. When a change to the output is intended,
 * look at the new files, then update them with `bunx vitest run -u`.
 */

import { createGalaxy, findRoute, indexSystems } from '@industrieh/starmap'
import { describe, expect, test } from 'vitest'

import { renderGalaxy, renderSystem } from '../src/index'
import { galaxy, sol } from './fixture'

describe('golden drawings', () => {
  test('a system, mid-orbit, with its gate labels resolved', async () => {
    const svg = renderSystem(sol, { t: 3, title: 'Sol', systems: indexSystems(galaxy) })
    await expect(svg).toMatchFileSnapshot('__snapshots__/system.svg')
  })

  test('a galaxy, with a route lit', async () => {
    const route = findRoute(galaxy, 'sol', 'kepler')
    const svg = renderGalaxy(galaxy, { title: 'Galaxy', highlight: route?.systemIds })
    await expect(svg).toMatchFileSnapshot('__snapshots__/galaxy.svg')
  })

  test('a galaxy far from the origin, whose sky must still fill the frame', async () => {
    const far = createGalaxy({
      seed: 'far',
      systems: [
        { id: 'a', name: 'Aster', x: 1000, y: 1000, star: { class: 'K', radius: 5 } },
        { id: 'b', name: 'Brume', x: 2000, y: 1400, star: { class: 'M', radius: 5 } },
        { id: 'c', name: 'Cinder', x: 1500, y: 2000, star: { class: 'G', radius: 5 } },
      ],
      lanes: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
      ],
    })
    await expect(renderGalaxy(far)).toMatchFileSnapshot('__snapshots__/galaxy-far.svg')
  })
})
