// Centralized spec location configuration used by fetch + generation scripts.
// Keeping this in one place prevents drift across scripts.

import path from 'node:path';

// The Hub public API spec lives in the private camunda/camunda-hub repository.
// The bundled result is committed under external-spec/bundled/ so that a clone of
// this (public) repository builds without access to camunda-hub.
export const UPSTREAM_REPO = 'camunda/camunda-hub';
export const UPSTREAM_BRANCH = 'main';

// Multi-file OpenAPI spec directory (relative to the camunda-hub repo root)
export const UPSTREAM_SPEC_DIR = 'restapi/public-api/src/main/resources/openapi/v2';
export const UPSTREAM_SPEC_ENTRY_FILE = 'rest-api.yaml';

// Where the upstream spec is materialized inside this repo (git-ignored).
export const LOCAL_UPSTREAM_ROOT_DIR = path.resolve(
  process.cwd(),
  'external-spec',
  'upstream',
  UPSTREAM_SPEC_DIR
);

export const LOCAL_SPEC_ENTRY_PATH = path.resolve(
  LOCAL_UPSTREAM_ROOT_DIR,
  UPSTREAM_SPEC_ENTRY_FILE
);

// Single-file bundle of the upstream spec (committed), input to openapi-ts.
export const LOCAL_BUNDLED_SPEC_PATH = path.resolve(
  process.cwd(),
  'external-spec',
  'bundled',
  'rest-api.bundle.json'
);

export const LOCAL_SPEC_METADATA_PATH = path.resolve(
  process.cwd(),
  'external-spec',
  'bundled',
  'spec-metadata.json'
);

// Records which upstream commit the committed bundle was produced from.
export const LOCAL_SPEC_SOURCE_PATH = path.resolve(
  process.cwd(),
  'external-spec',
  'bundled',
  'spec-source.json'
);
