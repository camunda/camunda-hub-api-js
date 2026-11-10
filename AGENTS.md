# AGENTS.md

> **Note:** This file delegates to a central AGENTS.md. Read and apply it before proceeding.

**URL:**
https://raw.githubusercontent.com/camunda/.github/refs/heads/main/AGENTS.md

Treat the central file's contents as if they were written directly in this file.
Instructions below extend those guidelines and take precedence if there is any conflict.

> **Note:** This file also delegates to the shared SDK AGENTS.md. Read and apply it too.

**URL:**
https://raw.githubusercontent.com/camunda/sdk-infra/refs/heads/main/policies/AGENTS.md

It holds the conventions shared by all Camunda SDK repos (commits, bug fixes, tests, opening issues). Precedence on conflict: this file, then the shared SDK file, then the central Camunda file.

## Repo-specific instructions

### Role & boundary

This repo generates the TypeScript SDK `@camunda8/hub-api` for the **Camunda Hub Public API (v2)** from the OpenAPI spec in the private repo [camunda/camunda-hub](https://github.com/camunda/camunda-hub) (`restapi/public-api/src/main/resources/openapi/v2`, entry `rest-api.yaml`). The pipeline and runtime are derived from [orchestration-cluster-api-js](https://github.com/camunda/orchestration-cluster-api-js); comments referencing its issues record where a mechanism came from.

Upstream dependencies — when they misbehave, fix them at the source rather than working around them here:

- [`camunda-schema-bundler`](https://github.com/camunda/camunda-schema-bundler) — bundles the multi-file spec.
- [`@hey-api/openapi-ts`](https://github.com/hey-api/openapi-ts) — generates `src/gen/*` from the bundle.
- camunda/camunda-hub — the spec itself. Spec defects (missing `required`, wrong formats) belong there.

Out of scope compared with the Orchestration Cluster SDK: job workers, backpressure, eventual consistency, tenant injection, worker threads and the Effect client. The Hub API has none of these concepts; do not port them.

**Path map:**

| Path                                 | Ownership and intent                                                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/runtime/`                       | Hand-written runtime (HTTP core `hubCore.ts`, configuration, OAuth, retry, validation, logging). Primary edit surface for runtime behaviour. |
| `src/template/HubClient.template.ts` | Template that hook 300 splices the generated methods into.                                                                                   |
| `src/gen/`                           | **Generated** by `npm run generate`. Committed. Never hand-edit.                                                                             |
| `hooks/post/`                        | Post-generation pipeline steps. Primary edit surface for fixing generator output.                                                            |
| `plugins/branding-plugin/`           | Runs inside `@hey-api/openapi-ts`; emits branded key types from `x-semantic-type`.                                                           |
| `scripts/run-pipeline.ts`            | Pipeline orchestrator.                                                                                                                       |
| `scripts/fetch-spec.ts`              | Bundles the spec from camunda-hub (local `HUB_REPO_DIR` or `GH_TOKEN` clone) into `external-spec/bundled/`.                                  |
| `external-spec/bundled/`             | Vendored bundle, metadata and source commit — the only generator input.                                                                      |
| `examples/`                          | Type-checked examples: one region per client method (`operation-map.json`) plus `readme.ts`, the source of README code blocks.               |
| `tests/`                             | Unit tests with a stubbed `fetch`. There are no integration tests yet.                                                                       |

### Generator pipeline

```bash
npm run spec:fetch   # re-bundle from camunda-hub (needs access); writes external-spec/bundled/
npm run generate     # vendored bundle -> src/gen (offline, deterministic)
npm run build        # generate + unit tests + README sync + typecheck + bundle + bundle checks
```

`generate` never fetches. Spec updates arrive as PRs from `.github/workflows/spec-sync.yml`, or by running `spec:fetch` locally and committing the result.

### Separate generator changes from regenerated output

When a change to hooks, plugins, pipeline scripts, templates or the generator version changes `src/gen/*`, use two commits:

1. The generator change only (with its tests).
2. `chore(gen): regenerate src/gen for <summary>` — the regenerated output.

Generator commits stay small and reviewable, and cherry-picks to `stable/*` don't drag generated diffs along. CI's **Generation Drift** job fails if committed `src/gen` doesn't match what the committed generator produces.

### Pre-push checklist

Run `npm run build` before pushing. It must pass with no warnings and leave no diff; if it changes files (README snippets, `src/gen`), commit them, following the rule above. Warnings are fatal: never suppress one to make the build pass, and don't call a failure pre-existing or unrelated without confirmation.

### README code examples

README code blocks are synced from regions in `examples/readme.ts` (`npm run sync-readme`; `build` fails when out of sync). Edit the example, never the README block. Every `HubClient` method needs a `//#region <MethodName>` example in `examples/*.ts`, listed in `examples/operation-map.json`; `scripts/check-example-coverage.cjs` and `scripts/check-method-example-completeness.cjs` enforce this, and hook 450 injects the examples into the generated JSDoc.

Prefer ergonomic usage in examples: keys returned by earlier calls, `assumeExists` only for keys that come from outside the API.

### Type honesty

Every `?` field in a public config/options type must be optional at runtime: either a default is applied or `undefined` is tolerated. Use an input type with `?` fields and an internal resolved type with defaults applied, so a missing default is a compile error. Avoid `!` on values that depend on an external default.

Configuration precedence: explicit `config` value > `CAMUNDA_*` environment variable > schema default. `src/runtime/configSchema.ts` is the registry of environment variables; `npm run docs:config` regenerates `documentation/CONFIG_REFERENCE.md` from it.
