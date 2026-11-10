# Contributing

Thanks for your interest in contributing to the Camunda Hub TypeScript SDK.

## Development Setup

Requirements: Node.js 22 or newer, npm 10+.

```bash
npm ci
npm run build   # regenerate, test, type-check, bundle, check bundles
npm test        # unit tests only (fast inner loop)
```

`npm run build` must leave the working tree clean: two consecutive builds produce no git diff.

## How the client is generated

```
camunda/camunda-hub (private)            this repo
restapi/public-api/.../openapi/v2  ──►  external-spec/bundled/rest-api.bundle.json  ──►  src/gen/
           npm run spec:fetch                                          npm run generate
```

- **`npm run spec:fetch`** re-bundles the spec with `camunda-schema-bundler` and writes `external-spec/bundled/` (bundle, metadata, and `spec-source.json` with the source commit). It needs access to camunda/camunda-hub: either a local checkout (`HUB_REPO_DIR=../camunda-hub`) or a token with read access (`GH_TOKEN`). Pick a ref with `SPEC_REF`.
- **`npm run spec:check`** reports whether the vendored bundle is behind the source, without writing.
- **`npm run generate`** reads only the vendored bundle; it never touches the network. It runs `@hey-api/openapi-ts`, then the hooks in `hooks/post/` that build `src/gen/HubClient.ts`, branded keys, Zod schemas and the per-operation functions.

In CI, `.github/workflows/spec-sync.yml` runs the fetch on a schedule and opens a PR when the spec changes.

`src/gen/` is committed. CI's **Generation Drift** job regenerates from the committed bundle and fails if the output differs, so a change to the generator, its version, or a hook must be committed together with its regenerated output.

## Commits

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) and are checked by commitlint. semantic-release derives versions and the CHANGELOG from them:

- `fix:` → patch, `feat:` → minor.
- A `BREAKING CHANGE:` footer → major. Use it only for a change that breaks consumers, never for corrections within a feature branch. PR CI fails on the marker unless the PR has the `breaking-change-approved` label.
- Keep generator changes (`hooks/`, `src/template/`, `src/runtime/`) and their regenerated output in separate commits where practical, so review can tell cause from effect.

## Releases

Releases run from GitHub Actions (`.github/workflows/release.yml`) on every push:

- `main` publishes prereleases on the `alpha` npm dist-tag.
- `stable/<major>` publishes releases on `latest` (when it is the line set in the `CAMUNDA_SDK_CURRENT_STABLE_MAJOR` repository variable) or on `<major>-stable` (older lines).

npm publishing uses trusted publishing (OIDC) with provenance; there is no npm token.

## Tests

- Unit tests (`tests/`) run with a stubbed `fetch`: no live Hub needed. Inject the clock and randomness through the client's `clock`/`random` hooks instead of using real timers.
- `npm run test:dist` loads the built ESM and CJS entries.
- `npm run test:cross-runtime` installs the packed tarball and runs a smoke test under Node, Deno and Bun. Set `CAMUNDA_HUB_ADDRESS` (and auth variables) to also call `getInfo` on a live Hub.

## README examples

Code blocks in `README.md` are copied from regions in `examples/*.ts`, which are type-checked against both the source and the built package. Edit the example, then run `npm run sync-readme`. Every client method needs an example region; the operation-to-region map is `examples/operation-map.json`.

## Code style

[Biome](https://biomejs.dev/) formats and lints: `npm run format` before pushing, `npm run format:check` in CI.

## Security

Never log secrets. Configuration logging redacts secret variables. If you add a secret variable, mark it as secret in `src/runtime/configSchema.ts`.
