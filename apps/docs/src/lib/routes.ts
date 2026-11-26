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
 *
 * It imports nothing either, and that is deliberate: the navigation's Client
 * Components import this file, so whatever it imports ships to the browser. The
 * versions, read from the packages' manifests, live in `versions.ts` instead.
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
  tagline: string
  groups: DocGroup[]
}

export const GITHUB_URL = 'https://github.com/Industrieh/starmap'

/**
 * Where this site lives, without a trailing slash.
 *
 * Only what is read away from the site needs it: `llms.txt`, `llms-full.txt`,
 * the sitemap and `robots.txt`, whose links have to resolve from anywhere, and
 * `metadataBase`, which turns canonical and Open Graph paths into absolute
 * URLs. Everything the browser follows stays relative, through `routes` below.
 */
export const SITE_URL = 'https://starmap.industrieh.dev'

/**
 * The documentation tree. The pages themselves are written for this site, one
 * module each under `src/content/`. Several cover the same ground as the
 * Markdown guides in each package's `docs/` — which is what `llms-full.txt`
 * serves — so a change to one of them usually wants the same change in the
 * other.
 */
export const LIBRARIES: readonly Library[] = [
  {
    slug: 'starmap',
    packageName: '@industrieh/starmap',
    name: 'starmap',
    tagline: 'Describe, validate and query a star universe.',
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
            slug: 'querying',
            title: 'Querying a galaxy',
            description: 'Indexes, neighbours, routes — finding your way around the structure.',
          },
          {
            slug: 'animating',
            title: 'Animating orbits',
            description: 'Turning a time value into positions, once per frame.',
          },
          {
            slug: 'randomness',
            title: 'Deterministic randomness',
            description: 'Generating a universe from a seed, and getting it back tomorrow.',
          },
          {
            slug: 'recipes',
            title: 'Recipes',
            description: 'Short answers to the questions that come up twice.',
          },
        ],
      },
      {
        title: 'Under the hood',
        pages: [
          {
            slug: 'design',
            title: 'Design decisions',
            description: 'The three lines this library does not cross, and why.',
          },
          {
            slug: 'architecture',
            title: 'Architecture',
            description: 'How the modules fit together, and where to add code.',
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
    packageName: '@industrieh/starmap-render',
    name: 'starmap-render',
    tagline: 'Turn a universe into SVG. Strings, not components.',
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
            description: 'The layers, and how each object is built out of them.',
          },
          {
            slug: 'theming',
            title: 'Theming',
            description: 'Every colour the renderer reads, and how to replace one.',
          },
          {
            slug: 'framing',
            title: 'Framing & embedding',
            description: 'The viewBox, the margins, and the four ways to put a string on a page.',
          },
          {
            slug: 'interactivity',
            title: 'Making it interactive',
            description: 'Click, hover, pan and zoom — none of it here, all of it possible.',
          },
          {
            slug: 'recipes',
            title: 'Recipes',
            description: 'Animating, exporting a file, drawing your own overlay.',
          },
        ],
      },
      {
        title: 'Under the hood',
        pages: [
          {
            slug: 'design',
            title: 'Design decisions',
            description: 'Why it returns strings, and why interaction is not its job.',
          },
          {
            slug: 'architecture',
            title: 'Architecture',
            description: 'How the renderer is split, and where a change belongs.',
          },
          {
            slug: 'contributing',
            title: 'Contributing',
            description: 'The house rule, the checklists, and how to review a visual change.',
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
  /** The source of a documentation page — what "Edit this page" opens. */
  githubPage: (library: string, page: string): string =>
    `${GITHUB_URL}/blob/main/apps/docs/src/content/${library}/${page}.tsx`,
} as const

/** One entry of the header, and of the drawer that replaces it below `md`. */
export type NavTab = {
  href: string
  label: string
  /**
   * Whether the tab lights up for its subtree or only for itself.
   *
   * A library tab stays lit while you read any of its pages, so it matches the
   * subtree. `/docs` is the parent of every one of those pages, so the same rule
   * would keep it lit everywhere and tell you nothing — it matches exactly.
   */
  exact: boolean
}

/**
 * The header, in one list, so the desktop tabs and the mobile drawer cannot
 * disagree about what the site contains.
 *
 * `/docs` is first and named in full: it is the only page that introduces both
 * libraries at once, and without a link here it was reachable from the footer
 * alone.
 */
export const NAV_TABS: readonly NavTab[] = [
  { href: routes.docs, label: 'Documentation', exact: true },
  ...LIBRARIES.map((library) => ({
    href: routes.library(library.slug),
    label: library.name,
    exact: false,
  })),
]

/** Whether a tab should read as the current one, for a given path. */
export function isTabActive(tab: NavTab, pathname: string): boolean {
  return tab.exact
    ? pathname === tab.href
    : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
}

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
