import fs from 'node:fs';
import path from 'node:path';
import { availabilityNote } from '../lib/availability';

const ROOT = process.cwd();
const METADATA_PATH = path.join(ROOT, 'external-spec/bundled/spec-metadata.json');
const TEMPLATE_FILE = path.join(ROOT, 'src/template/HubClient.template.ts');
const CLASS_FILE = path.join(ROOT, 'src/gen/HubClient.ts');
const SDK_GEN_PATH = path.join(ROOT, 'src/gen/sdk.gen.ts');
const OPS_FILE = path.join(ROOT, 'src/gen/operations.gen.ts');
const OP_SCHEMAS_DIR = path.join(ROOT, 'src/gen/zod');

/**
 * Turn a line of a generated method body into the equivalent line of the standalone
 * function: one indent level less, and `this` replaced by the core's runtime view.
 */
function toFunctionBody(line: string): string {
  return line
    .replace(/^ {2}/, '')
    .replace(/\(this as any\)/g, '(rt as any)')
    .replace(/\bthis\._isVoidResponse\(/g, '_isVoidResponse(')
    .replace(/\bthis\./g, 'rt.');
}

const MARK_TYPES_START = '// === AUTO-GENERATED HUB SUPPORT TYPES START ===';
const MARK_TYPES_END = '// === AUTO-GENERATED HUB SUPPORT TYPES END ===';
const MARK_METHODS_START = '// === AUTO-GENERATED HUB METHODS START ===';
const MARK_METHODS_END = '// === AUTO-GENERATED HUB METHODS END ===';

// Operations whose HTTP calls are never retried. The Hub API has none today; add
// operation ids here if a non-idempotent call must not be replayed on 429/503.
const RETRY_EXEMPT_OPS: ReadonlySet<string> = new Set<string>();

function isExempt(opId: string): boolean {
  return RETRY_EXEMPT_OPS.has(opId);
}

async function main() {
  if (!fs.existsSync(METADATA_PATH)) {
    throw new Error('[class-gen] spec-metadata.json missing');
  }
  if (!fs.existsSync(TEMPLATE_FILE)) {
    throw new Error('[class-gen] Template missing, skipping');
  }
  const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
  const tpl = fs.readFileSync(TEMPLATE_FILE, 'utf8');
  const tS = tpl.indexOf(MARK_TYPES_START),
    tE = tpl.indexOf(MARK_TYPES_END),
    mS = tpl.indexOf(MARK_METHODS_START),
    mE = tpl.indexOf(MARK_METHODS_END);
  if ([tS, tE, mS, mE].some((i) => i === -1) || tE < tS || mE < mS) {
    throw new Error('[class-gen] Markers missing');
  }

  // Underlying docs
  const docs: Record<string, string> = {};
  if (fs.existsSync(SDK_GEN_PATH)) {
    const sdk = fs.readFileSync(SDK_GEN_PATH, 'utf8');
    const re = /\n\/\*\*([\s\S]*?)\*\/\nexport const (\w+)\s*=\s*</g;
    let m;
    while ((m = re.exec(sdk))) docs[m[2]] = `/**${m[1]}*/`;
  }
  // Collect available exported zod response schema names to avoid emitting invalid references
  const availableSchemas = new Set<string>();
  const voidResponses = new Set<string>();
  const ZOD_GEN_PATH = path.join(ROOT, 'src/gen/zod.gen.ts');
  if (fs.existsSync(ZOD_GEN_PATH)) {
    const zsrc = fs.readFileSync(ZOD_GEN_PATH, 'utf8');
    const rResp = /export const (z[A-Z][A-Za-z0-9_]*)\s*=\s*([^;]+);/g;
    let mm;
    while ((mm = rResp.exec(zsrc))) {
      const name = mm[1];
      const rhs = mm[2];
      availableSchemas.add(name);
      // Only classify as void if the schema is pure z.void(), not a z.union
      // that happens to contain z.void() alongside data types (e.g. 200+204).
      if (/z\.void\s*\(\)/.test(rhs) && !/z\.union\s*\(/.test(rhs)) voidResponses.add(name);
    }
  }

  interface OpMeta {
    opId: string;
    hasBody: boolean;
    bodyOnly: boolean;
    summary?: string;
    description?: string;
    tags?: string[];
    availability?: string;
    originalOpId: string;
    unionBodies: string[];
    verb: string;
    pathParams: string[];
    queryParams: Array<{ name: string; required: boolean }>;
  }
  const ops: OpMeta[] = [];
  for (const op of metadata.operations) {
    const originalId = op.operationId;
    const opId = sanitize(originalId);
    ops.push({
      opId,
      hasBody: op.hasRequestBody,
      bodyOnly: op.bodyOnly,
      summary: op.summary,
      description: op.description,
      tags: op.tags,
      availability: availabilityNote(originalId, op.vendorExtensions?.['x-availability']),
      originalOpId: originalId,
      unionBodies: (op.requestBodyUnionRefs || []).map((r: string) => sanitize(r)),
      verb: op.method.toLowerCase(),
      pathParams: op.pathParams || [],
      queryParams: op.queryParams || [],
    });
  }
  ops.sort((a, b) => a.opId.localeCompare(b.opId));

  const support: string[] = [];
  support.push('// Generated');
  support.push(`// Operations: ${ops.length}`);
  support.push('type _RawReturn<F> = F extends (...a:any)=>Promise<infer R> ? R : never;');
  support.push(
    'type _DataOf<F> = Exclude<_RawReturn<F> extends { data: infer D } ? D : _RawReturn<F>, undefined>;'
  );
  // Each operation's input is assembled from its public hey-api `<OpId>Data` type
  // (exported from the package root) by indexed access, so every type the input refers
  // to is public and documented.
  const dataTypeOf = (opId: string) => `${opId.charAt(0).toUpperCase()}${opId.slice(1)}Data`;
  support.push(
    `import type { ${ops
      .filter((o) => o.hasBody || o.pathParams.length || o.queryParams.length)
      .map((o) => dataTypeOf(o.opId))
      .join(', ')} } from './types.gen';`
  );
  for (const o of ops) {
    const data = dataTypeOf(o.opId);
    const pieces: string[] = [];
    if (o.hasBody) pieces.push(`NonNullable<${data}['body']>`);
    const extras: string[] = [];
    for (const pp of o.pathParams) extras.push(`${pp}: ${data}['path']['${pp}']`);
    for (const qp of o.queryParams)
      extras.push(
        `${qp.name}${qp.required ? '' : '?'}: NonNullable<NonNullable<${data}['query']>['${qp.name}']>`
      );
    if (extras.length) pieces.push(`{ ${extras.join('; ')} }`);
    support.push(`export type ${o.opId}Input = ${pieces.length ? pieces.join(' & ') : 'void'};`);
  }

  // Static VOID_RESPONSES set so the generated _isVoidResponse doesn't need runtime zod access
  const voidEntries = [...voidResponses].map((n) => `'${n}'`).join(', ');
  support.push(`const VOID_RESPONSES = new Set([${voidEntries}]);`);

  const methods: string[] = [];
  /** Standalone per-operation functions (src/gen/operations.gen.ts). */
  const fns: string[] = [];
  /** operationId -> zod schema names its function validates with. */
  const opSchemaModules = new Map<string, string[]>();
  methods.push(
    '  // Generated methods: each delegates to its standalone function in operations.gen.ts'
  );
  for (const o of ops) {
    const jsdoc = forwardJsDoc(o, docs);
    if (jsdoc) methods.push(indent(jsdoc, 2));
    // Method signature (single unified input)
    const returnType = `_DataOf<typeof Sdk.${o.opId}>`;
    const hasInput = Boolean(o.hasBody || o.pathParams.length || o.queryParams.length);
    const publicParams = [
      ...(hasInput ? [`input: ${o.opId}Input`] : []),
      'options?: OperationOptions',
    ].join(', ');
    // No-input operations take only `options`, in the class and the standalone function
    // alike, so `client.getInfo({ retry: false })` applies the options.
    const implParams = hasInput ? 'arg: any, options?: OperationOptions' : publicParams;
    const fnImplParams = implParams;
    const forwardArgs = [...(hasInput ? ['arg'] : []), 'options'].join(', ');
    methods.push(`  ${o.opId}(${publicParams}): CancelablePromise<${returnType}>;`);
    methods.push(`  ${o.opId}(${implParams}): CancelablePromise<any> {`);
    // Everything pushed from here to the closing brace is the operation body. It is
    // moved into the standalone function below; the method only delegates.
    const bodyStart = methods.length;
    methods.push('    return toCancelable(async signal => {');
    // Build envelope
    const hasInputs = o.hasBody || o.pathParams.length || o.queryParams.length;
    if (hasInputs) {
      // Destructure and separate
      const queryParamNames = o.queryParams.map((q) => q.name);
      const allParamNames = [...o.pathParams, ...queryParamNames];
      if (o.hasBody) {
        if (allParamNames.length) {
          methods.push(`      const { ${allParamNames.join(', ')}, ..._body } = arg || {};`);
        } else {
          methods.push('      const _body = arg;');
        }
      } else if (allParamNames.length) {
        methods.push(`      const { ${allParamNames.join(', ')} } = arg || {};`);
      }
      methods.push('      let envelope: any = {};');
      if (o.pathParams.length)
        methods.push(`      envelope.path = { ${o.pathParams.join(', ')} };`);
      if (o.queryParams.length)
        methods.push(`      envelope.query = { ${queryParamNames.join(', ')} };`);
      if (o.hasBody) methods.push('      envelope.body = _body;');
      // Request validation against the full envelope (lazy-loads zod schemas on first use).
      // hey-api 0.86 emits a single `z<OpId>Data` envelope schema; hey-api 0.96+ splits this into
      // `z<OpId>Body` / `z<OpId>Path` / `z<OpId>Query`. We emit different validation code per case:
      //   * Data present     → validate the full envelope (path + query + body together).
      //   * Per-part schemas → validate each present envelope slot against its own schema and
      //                        assign the parsed value back, so strict-mode coercion and defaults
      //                        still apply to path and query params, not just the body.
      //   * Neither          → no-op (gateRequest accepts an undefined schema).
      // Keeping the Data branch means this generator-only patch stays safe to backport to
      // branches still pinned to hey-api 0.86. See issue #405 for the coverage regression that
      // the per-part branch restores (0.96+ initially validated the body only, silently dropping
      // path and query validation for every operation).
      const opCap = o.opId.charAt(0).toUpperCase() + o.opId.slice(1);
      const dataName = `z${opCap}Data`;
      const useDataEnvelope = availableSchemas.has(dataName);
      // Envelope slot → per-part schema name, in the order the slots are assigned above.
      const partSchemas: Array<{ slot: 'body' | 'path' | 'query'; schema: string }> = [];
      for (const slot of ['body', 'path', 'query'] as const) {
        const name = `z${opCap}${slot.charAt(0).toUpperCase()}${slot.slice(1)}`;
        if (availableSchemas.has(name)) partSchemas.push({ slot, schema: name });
      }
      methods.push(`      if (this._validation.settings.req !== 'none') {`);
      methods.push(`        const _schemas = await this._loadSchemas();`);
      if (useDataEnvelope) {
        methods.push(
          `        const maybe = await this._validation.gateRequest('${o.originalOpId}', _schemas.${dataName}, envelope);`
        );
        methods.push(`        if (this._validation.settings.req === 'strict') envelope = maybe;`);
      } else if (partSchemas.length) {
        for (const { slot, schema } of partSchemas) {
          const local = `maybe${slot.charAt(0).toUpperCase()}${slot.slice(1)}`;
          methods.push(`        if (envelope.${slot} !== undefined) {`);
          methods.push(
            `          const ${local} = await this._validation.gateRequest('${o.originalOpId}', _schemas.${schema}, envelope.${slot});`
          );
          methods.push(
            `          if (this._validation.settings.req === 'strict') envelope.${slot} = ${local};`
          );
          methods.push(`        }`);
        }
      } else {
        methods.push(
          `        await this._validation.gateRequest('${o.originalOpId}', undefined, envelope);`
        );
      }
      methods.push('      }');
      // Build options for SDK call
      methods.push(
        '      const opts: any = { client: this._client, signal, throwOnError: false };'
      );
      if (o.pathParams.length) methods.push('      if (envelope.path) opts.path = envelope.path;');
      if (o.queryParams.length)
        methods.push('      if (envelope.query) opts.query = envelope.query;');
      if (o.hasBody)
        methods.push('      if (envelope.body !== undefined) opts.body = envelope.body;');
      methods.push(`      const call = async () => {`);
      methods.push(`        try {`);
      methods.push(`        const _raw = await Sdk.${o.opId}(opts);`);
      methods.push(
        `        let data = this._evaluateResponse(_raw, '${o.originalOpId}', (resp: any) => {`
      );
      methods.push('          const st = resp.status ?? resp.response?.status;');
      methods.push('          if (!st) return undefined;');
      methods.push('          const candidate = st === 429 || st === 503 || st === 500;');
      methods.push('          if (!candidate) return undefined;');
      methods.push('          let prob: any = undefined;');
      methods.push(
        "          if (resp.error && typeof resp.error === 'object') prob = resp.error;"
      );
      methods.push(
        "          const err: any = new Error((prob && (prob.title || prob.detail)) ? (prob.title || prob.detail) : ('HTTP ' + st));"
      );
      methods.push("          err.status = st; err.name = 'HttpSdkError';");
      methods.push(
        "          if (prob) { for (const k of ['type','title','detail','instance']) if (prob[k] !== undefined) err[k] = prob[k]; }"
      );
      methods.push('          const isBp = st === 429 || st === 503;');
      methods.push('          if (!isBp) err.nonRetryable = true;');
      methods.push('          return err;');
      methods.push('        });');
      methods.push(
        `        const _respSchemaName = 'z${o.opId.charAt(0).toUpperCase() + o.opId.slice(1)}Response';`
      );
      methods.push('        if (this._isVoidResponse(_respSchemaName)) {');
      methods.push('          data = undefined;');
      methods.push('        }');
      // Response validation (guarded) occurs BEFORE any enrichment so fanatical mode sees raw spec shape
      const respName = `z${o.opId.charAt(0).toUpperCase() + o.opId.slice(1)}Response`;
      if (availableSchemas.has(respName)) {
        methods.push("        if (this._validation.settings.res !== 'none') {");
        methods.push(`          const _schemas = await this._loadSchemas();`);
        methods.push(`          const _schema = _schemas.${respName};`);
        methods.push('          if (_schema) {');
        methods.push(
          `            const maybeR = await this._validation.gateResponse('${o.originalOpId}', _schema, data);`
        );
        methods.push("            if (this._validation.settings.res === 'strict') data = maybeR;");
        methods.push('          }');
        methods.push('        }');
      }
      methods.push('        return data;');
      methods.push('        } catch(e) {');
      methods.push('          // Defer normalization to outer executeWithHttpRetry boundary');
      methods.push('          throw e;');
      methods.push('        }');
      methods.push('      };');
      // Inject HTTP retry wrapper
      methods.push(
        `      return this._invokeWithRetry(() => call(), { opId: '${o.originalOpId}', exempt: ${isExempt(o.opId)}, retryOverride: options?.retry });`
      );
    } else {
      // No-input operation
      methods.push(
        '      const opts: any = { client: this._client, signal, throwOnError: false };'
      );
      methods.push('      const call = async () => {');
      methods.push('        try {');
      methods.push(`        const _raw = await Sdk.${o.opId}(opts as any);`);
      methods.push(
        `        let data = this._evaluateResponse(_raw, '${o.originalOpId}', (resp: any) => {`
      );
      methods.push('          const st = resp.status ?? resp.response?.status;');
      methods.push('          if (!st) return undefined;');
      methods.push('          const candidate = st === 429 || st === 503 || st === 500;');
      methods.push('          if (!candidate) return undefined;');
      methods.push('          let prob: any = undefined;');
      methods.push(
        "          if (resp.error && typeof resp.error === 'object') prob = resp.error;"
      );
      methods.push(
        "          const err: any = new Error((prob && (prob.title || prob.detail)) ? (prob.title || prob.detail) : ('HTTP ' + st));"
      );
      methods.push("          err.status = st; err.name = 'HttpSdkError';");
      methods.push(
        "          if (prob) { for (const k of ['type','title','detail','instance']) if (prob[k] !== undefined) err[k] = prob[k]; }"
      );
      methods.push('          const isBp = st === 429 || st === 503;');
      methods.push('          if (!isBp) err.nonRetryable = true;');
      methods.push('          return err;');
      methods.push('        });');
      methods.push(
        `        const _respSchemaName = 'z${o.opId.charAt(0).toUpperCase() + o.opId.slice(1)}Response';`
      );
      methods.push('        if (this._isVoidResponse(_respSchemaName)) {');
      methods.push('          data = undefined;');
      methods.push('        }');
      const respName2 = `z${o.opId.charAt(0).toUpperCase() + o.opId.slice(1)}Response`;
      if (availableSchemas.has(respName2)) {
        methods.push("        if (this._validation.settings.res !== 'none') {");
        methods.push(`          const _schemas = await this._loadSchemas();`);
        methods.push(`          const _schema = _schemas.${respName2};`);
        methods.push('          if (_schema) {');
        methods.push(
          `            const maybeR = await this._validation.gateResponse('${o.originalOpId}', _schema, data);`
        );
        methods.push("            if (this._validation.settings.res === 'strict') data = maybeR;");
        methods.push('          }');
        methods.push('        }');
      }
      methods.push('        return data;');
      methods.push('        } catch(e) {');
      methods.push('          throw e;');
      methods.push('        }');
      methods.push('      };');
      methods.push(
        `      return this._invokeWithRetry(() => call(), { opId: '${o.originalOpId}', exempt: ${isExempt(o.opId)}, retryOverride: options?.retry });`
      );
    }
    methods.push('    });');
    const body = methods.splice(bodyStart);
    methods.push(`    return Ops.${o.opId}(this, ${forwardArgs});`);
    methods.push('  }');
    methods.push('');
    if (jsdoc) fns.push(jsdoc);
    fns.push(
      `export function ${o.opId}(core: HubCore, ${publicParams}): CancelablePromise<${returnType}>;`
    );
    fns.push(`export function ${o.opId}(core: HubCore, ${fnImplParams}): CancelablePromise<any> {`);
    fns.push('  const rt = core as unknown as OperationRuntime;');
    // Per-operation schema module: the function lazily imports only the zod schemas
    // it references (see hook 720 for why unused schemas then drop out of bundles).
    const fnBody = body.map(toFunctionBody);
    const schemaNames = [
      ...new Set(
        fnBody
          .join('\n')
          .match(/\b_schemas\.(z\w+)/g)
          ?.map((m) => m.slice(9)) ?? []
      ),
    ].sort();
    if (schemaNames.length) {
      opSchemaModules.set(o.opId, schemaNames);
      for (let i = 0; i < fnBody.length; i++) {
        fnBody[i] = fnBody[i].replace(
          'await rt._loadSchemas()',
          `await import('./zod/${o.opId}.gen')`
        );
      }
    }
    fns.push(...fnBody);
    fns.push('}');
    fns.push('');
  }

  // Standalone per-operation functions: the single implementation of every operation.
  // HubClient methods delegate here; `@camunda8/hub-api/fn`
  // exports them directly so bundlers keep only the operations a consumer imports.
  const supportSrc = support.join('\n');
  const exportedTypes = [...supportSrc.matchAll(/^export (?:type|interface) (\w+)/gm)].map(
    (m) => m[1]
  );
  const opsSrc = [
    '// @generated by hooks/post/300-generate-class-methods.ts - DO NOT EDIT DIRECTLY',
    '// One standalone function per operation. HubClient methods delegate to these.',
    "import type { HubCore, OperationRuntime } from '../runtime/hubCore';",
    "import { type CancelablePromise, toCancelable } from '../runtime/cancelable';",
    "import type { OperationOptions } from '../runtime/retry';",
    "import * as Sdk from './sdk.gen';",
    '',
    supportSrc,
    'function _isVoidResponse(name: string): boolean {',
    '  return VOID_RESPONSES.has(name);',
    '}',
    '',
    ...fns,
  ].join('\n');
  // Gate: every schema access must go through the operation's own schema module.
  if (/_loadSchemas\(|_schemas\[/.test(fns.join('\n'))) {
    console.error(
      '[class-gen][FAIL] operations.gen.ts loads schemas other than via its per-operation module'
    );
    process.exit(1);
  }
  fs.rmSync(OP_SCHEMAS_DIR, { recursive: true, force: true });
  fs.mkdirSync(OP_SCHEMAS_DIR, { recursive: true });
  for (const [opId, names] of opSchemaModules) {
    fs.writeFileSync(
      path.join(OP_SCHEMAS_DIR, `${opId}.gen.ts`),
      [
        '// @generated by hooks/post/300-generate-class-methods.ts - DO NOT EDIT DIRECTLY',
        `// Zod schemas used by ${opId}, loaded lazily on first validation.`,
        `export { ${names.join(', ')} } from '../zod.gen';`,
        '',
      ].join('\n'),
      'utf8'
    );
  }
  // Gate: a body that still references `this` would silently break in a free function.
  if (/\bthis\b/.test(fns.join('\n').replace(/\/\*\*[\s\S]*?\*\//g, ''))) {
    console.error('[class-gen][FAIL] operations.gen.ts function body still references `this`');
    process.exit(1);
  }
  fs.writeFileSync(OPS_FILE, opsSrc, 'utf8');

  // The class module re-exports the public support types (unchanged public names).
  const clientSupport = [
    '// Generated',
    `// Operations: ${ops.length}`,
    'type _RawReturn<F> = F extends (...a:any)=>Promise<infer R> ? R : never;',
    'type _DataOf<F> = Exclude<_RawReturn<F> extends { data: infer D } ? D : _RawReturn<F>, undefined>;',
    "import * as Ops from './operations.gen';",
    `import type { ${exportedTypes.join(', ')} } from './operations.gen';`,
    `export type { ${exportedTypes.join(', ')} } from './operations.gen';`,
  ].join('\n');

  const banner = '// @generated from HubClient.template.ts - DO NOT EDIT DIRECTLY\n';
  const withTypes = `${tpl.slice(0, tS + MARK_TYPES_START.length)}\n${clientSupport}\n${tpl.slice(tE)}`;
  const w2S = withTypes.indexOf(MARK_METHODS_START);
  const w2E = withTypes.indexOf(MARK_METHODS_END);
  let finalSrc =
    banner +
    withTypes.slice(0, w2S + MARK_METHODS_START.length) +
    '\n' +
    methods.join('\n') +
    '\n' +
    withTypes.slice(w2E);
  // Strip template-only @ts-ignore annotations (we keep them in template for DX, but don't ship them)
  finalSrc = finalSrc.replace(/\n[^\n]*@ts-ignore[^\n]*\n/g, () => '\n');
  // Strip any template hint comments (// TEMPLATE: ...)
  finalSrc = finalSrc.replace(/^\/\/ TEMPLATE:.*(?:\r?\n|$)/gm, '');
  fs.writeFileSync(CLASS_FILE, finalSrc, 'utf8');
  // Regression gate: forbid usage of private Zod internals '_def?.typeName'
  if (/_def\?\.typeName/.test(finalSrc)) {
    console.error(
      '[class-gen][FAIL] Detected forbidden pattern _def?.typeName in generated output.'
    );
    process.exit(1);
  }
  console.log(`[class-gen] Wrote HubClient.ts with ${ops.length} methods`);
}

function sanitize(id: string): string {
  return id.replace(/XML/g, 'Xml');
}
function forwardJsDoc(op: any, docs: Record<string, string>): string {
  const base = docs[op.opId];
  if (base) {
    const inj: string[] = [];
    if (op.availability) inj.push(' *', ` * ${op.availability}`);
    inj.push(' *');
    inj.push(` * @operationId ${op.originalOpId}`);
    if (op.tags?.length) inj.push(` * @tags ${op.tags.join(', ')}`);
    // Drop the closing `*/` and any trailing blank lines before appending the tags.
    return base.replace(/(?:\n[ \t]*\*[ \t]*)*\n[ \t]*\*\/\s*$/, `\n${inj.join('\n')}\n */`);
  }
  return buildJsDoc(op);
}
function buildJsDoc(op: {
  summary?: string;
  description?: string;
  originalOpId: string;
  tags?: string[];
  availability?: string;
}) {
  const parts: string[] = [];
  if (op.summary) parts.push(op.summary);
  if (op.description) parts.push(...String(op.description).split(/\r?\n/));
  if (op.availability) parts.push('', op.availability);
  parts.push(`@operationId ${op.originalOpId}`);
  if (op.tags?.length) parts.push(`@tags ${op.tags.join(', ')}`);
  return `/**\n${parts.map((l) => ` * ${l.replace(/\*/g, '')}`).join('\n')}\n */`;
}
function indent(s: string, d: number) {
  const pad = ' '.repeat(d);
  return s
    .split('\n')
    .map((l) => pad + l)
    .join('\n');
}

try {
  await main();
} catch (e) {
  console.error('[class-gen] error', e);
  process.exitCode = 1;
}
