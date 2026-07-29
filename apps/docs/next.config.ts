import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // `next build` typechecks the app itself, through the TypeScript compiler
  // API — and the 7.x line does not expose it: "TypeScript 7.0.2 does not
  // provide the compiler API required by Next.js". The repo is on TypeScript 7
  // at the root, deliberately, so the alternative would be a second TypeScript
  // here, private to this app.
  //
  // This flag takes the other way out: Next.js shells out to the `tsc` CLI
  // instead of driving the API. Same check, one version — and it happens to be
  // four times faster, that CLI being the native compiler.
  //
  // It is experimental. If it ever gets in the way, the fallback is
  // `"typescript": "^5"` in this package's devDependencies, and this block
  // deleted.
  experimental: { useTypeScriptCli: true },
}

export default nextConfig
