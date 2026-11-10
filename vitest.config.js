import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig(() => {
  return {
    resolve: {
      // Source-time resolution of the #platform subpath import (package.json "imports"
      // points at dist/, which does not exist when unit tests run).
      alias: {
        '#platform': fileURLToPath(new URL('./src/runtime/platform/node.ts', import.meta.url)),
      },
    },
    test: {
      globals: true,
    },
  };
});
