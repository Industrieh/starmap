# Working on this repo with Claude

Rules for Claude Code in this monorepo. They take precedence over Claude's
defaults.

## Git: commit and push are allowed

The maintainer grants these rights durably — there is no need to ask first:

- **commit** your changes, with a conventional message
  (`fix(packages/starmap): …`, `feat(apps/docs): …`, `chore(ci): …`);
- **push** them, and **open or update a pull request** with `gh`.

Guardrails that still apply:

- Never commit on `main`: create a branch first (`fix/…`, `feat/…`), or keep
  committing on the branch of the pull request you are working on.
- Never force-push `main`, never rewrite published history of someone else's
  branch, never merge a pull request — merging stays a human decision.
- Run `bun run check` (and `bun run build` when a build could be affected)
  before pushing, and report honestly if something fails.
- Never commit secrets or machine-local files (`.env*`,
  `.claude/settings.local.json`, `.orbit-data.json`).
- A change to a published package (`packages/*`) comes with a changeset
  (`bun run changeset`), as `CONTRIBUTING.md` asks.

## Documentation is part of every change

Whenever a change alters something the documentation describes — a public API,
an option or its default, a behaviour, an error, a command, a script, the CI or
the release flow — **update the documentation in the same change**, without
waiting to be asked. A change is not finished while a page still says the old
thing.

The documentation lives in several places, and the same fact is often written
in more than one of them. Update every copy:

| what changed                     | where it is documented                                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/starmap` behaviour/API | its TSDoc in `src/`, `packages/starmap/README.md`, `packages/starmap/docs/*.md`, `apps/docs/src/content/starmap/*.tsx`                      |
| `packages/starmap-render`        | its TSDoc in `src/`, `packages/starmap-render/README.md`, `packages/starmap-render/docs/*.md`, `apps/docs/src/content/starmap-render/*.tsx` |
| how to contribute to a package   | `packages/*/CONTRIBUTING.md` and `apps/docs/src/content/*/contributing.tsx`                                                                 |
| the repo, commands, CI, release  | the root `README.md`, the comments at the top of the workflow or script                                                                     |
| an example                       | `examples/*/README.md`                                                                                                                      |
| the docs site itself             | `apps/docs/README.md`                                                                                                                       |

Notes:

- `llms-full.txt` is generated from the packages' Markdown, so the `.md` files
  are what LLM readers see: never let them lag behind the TSX pages, nor the
  reverse.
- Numbers printed in the docs (RNG outputs, measured costs, example values) must
  be the real ones: run the code to get them.
- If you are unsure whether a change needs a doc update, grep the docs for the
  names you touched — it usually does.
- In your final report, list the documentation you updated.
