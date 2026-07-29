/**
 * Every path of the site, in one place.
 *
 * Two things live here, and the second one is why the file is worth having.
 *
 * 1. `routes` — the paths themselves. Nothing else in the app writes a URL as a
 *    string literal, so renaming a segment is a change to this file alone.
 * 2. `LIBRARIES` — the shape of the documentation: which library, which groups,
 *    which pages. The sidebar, the header tabs, the home page and the
 *    `generateStaticParams` of the dynamic routes all read *this*, so the route
 *    tree and the navigation cannot drift apart. Adding a page is one entry.
 *
 * The file is named `routes.ts`, not `route.ts`: inside `src/app/` the App
 * Router reserves `route.ts` for HTTP route handlers, and a file with that name
 * reads as an endpoint to anyone who knows Next.js. It sits in `src/lib/`
 * because it is plain data — no React, no server, importable from anywhere.
 */

/** A single documentation page, one entry in the sidebar. */
export type DocPage = {
  /** Last segment of the URL, and the key `generateStaticParams` emits. */
  slug: string
  title: string
  /** One line, shown under the title on index pages and in `<meta>`. */
  description: string
}

/** A labelled run of pages in the sidebar — "Get started", "Guides"… */
export type DocGroup = {
  title: string
  pages: DocPage[]
}

/** One of the two documentations, gathered under a single site. */
export type Library = {
  /** URL segment: `/docs/<slug>`. */
  slug: string
  /** What you type in a terminal — the npm name. */
  packageName: string
  /** What the tabs show, short enough to sit in a header. */
  name: string
  version: string
  tagline: string
  /** A paragraph for the home page and the library index. */
  summary: string
  groups: DocGroup[]
}

export const GITHUB_URL = 'https://github.com/Industrieh/starmap'

/**
 * The documentation tree. The groups mirror the Markdown that already exists in
 * each package — the site aggregates it, it does not invent it.
 */
export const LIBRARIES: readonly Library[] = [
  {
    slug: 'starmap',
    packageName: '@cotontigeh/starmap',
    name: 'starmap',
    version: '0.1.0',
    tagline: 'Describe, validate and query a star universe.',
    summary:
      'The core. You describe your universe with a typed object, `createGalaxy()` checks and completes it, and you get back what you need to query it: indexes, routes, orbital positions over time. No dependencies, no DOM, no notion of rendering.',
    groups: [
      {
        title: 'Get started',
        pages: [
          {
            slug: 'installation',
            title: 'Installation',
            description: 'Add the package to a project, and what it expects of your toolchain.',
          },
          {
            slug: 'quickstart',
            title: 'Quickstart',
            description: 'A universe in twenty lines, from an object to a query.',
          },
        ],
      },
      {
        title: 'Guides',
        pages: [
          {
            slug: 'data-model',
            title: 'Data model',
            description: 'What a galaxy, a system and a body are made of, and what is required.',
          },
          {
            slug: 'design',
            title: 'Design',
            description: 'The decisions behind the API, and the ones deliberately left out.',
          },
          {
            slug: 'architecture',
            title: 'Architecture',
            description: 'How the modules fit together, and where to add code.',
          },
          {
            slug: 'recipes',
            title: 'Recipes',
            description: 'Short answers to the questions that come up twice.',
          },
        ],
      },
      {
        title: 'Reference',
        pages: [
          {
            slug: 'api',
            title: 'API',
            description: 'Every exported function and type, with its signature.',
          },
        ],
      },
    ],
  },
  {
    slug: 'starmap-render',
    packageName: '@cotontigeh/starmap-render',
    name: 'starmap-render',
    version: '0.1.0',
    tagline: 'Turn a universe into SVG. Strings, not components.',
    summary:
      'The renderer. `renderSystem()` and `renderGalaxy()` turn a universe into an SVG string: no DOM, no framework, no stylesheet. Colours come in through a theme, interaction stays with your application.',
    groups: [
      {
        title: 'Get started',
        pages: [
          {
            slug: 'installation',
            title: 'Installation',
            description: 'Add the renderer next to the core, and what it needs from it.',
          },
          {
            slug: 'quickstart',
            title: 'Quickstart',
            description: 'From a galaxy to an SVG string, and where to put it.',
          },
        ],
      },
      {
        title: 'Guides',
        pages: [
          {
            slug: 'drawing',
            title: 'Drawing',
            description: 'How a system and a galaxy are laid out, and what the viewBox means.',
          },
          {
            slug: 'theming',
            title: 'Theming',
            description: 'The theme object: what it controls, and how to write your own.',
          },
          {
            slug: 'architecture',
            title: 'Architecture',
            description: 'How the renderer is split, and why it emits strings.',
          },
          {
            slug: 'recipes',
            title: 'Recipes',
            description: 'Animating, making it interactive, exporting a file.',
          },
        ],
      },
      {
        title: 'Reference',
        pages: [
          {
            slug: 'api',
            title: 'API',
            description: 'Every exported function and type, with its signature.',
          },
        ],
      },
    ],
  },
]

/**
 * The paths. Static ones are values, parameterised ones are functions — so a
 * caller can never forget a segment.
 */
export const routes = {
  home: '/',
  docs: '/docs',
  library: (library: string): string => `/docs/${library}`,
  page: (library: string, page: string): string => `/docs/${library}/${page}`,
  github: GITHUB_URL,
  githubPackage: (library: string): string => `${GITHUB_URL}/tree/main/packages/${library}`,
} as const

/** The library a URL segment refers to, or `undefined` if there is no such library. */
export function findLibrary(slug: string): Library | undefined {
  return LIBRARIES.find((library) => library.slug === slug)
}

/** A page inside a library, looked up by its two segments. */
export function findPage(library: Library, slug: string): DocPage | undefined {
  return library.groups.flatMap((group) => group.pages).find((page) => page.slug === slug)
}

/** Every page of a library, groups flattened, in sidebar order. */
export function flattenPages(library: Library): DocPage[] {
  return library.groups.flatMap((group) => group.pages)
}

/**
 * The page before and after `slug`, for the "previous / next" footer of a doc
 * page. Reading order is sidebar order, which is why it is derived here rather
 * than declared a second time.
 */
export function siblingPages(
  library: Library,
  slug: string,
): { previous: DocPage | undefined; next: DocPage | undefined } {
  const pages = flattenPages(library)
  const index = pages.findIndex((page) => page.slug === slug)

  return {
    previous: index > 0 ? pages[index - 1] : undefined,
    next: index >= 0 && index < pages.length - 1 ? pages[index + 1] : undefined,
  }
}
