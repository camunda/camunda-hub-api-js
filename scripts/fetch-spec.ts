/**
 * Fetch the Hub public API spec from camunda/camunda-hub and bundle it into
 * external-spec/bundled/ (rest-api.bundle.json + spec-metadata.json + spec-source.json).
 *
 * camunda/camunda-hub is private. The bundle is committed so that building this SDK
 * never needs access to it; only refreshing the spec does.
 *
 * Sources (first match wins):
 *   --hub-dir <path> | HUB_REPO_DIR   a local camunda-hub checkout (reads the working tree)
 *   otherwise                          sparse clone of github.com/camunda/camunda-hub at
 *                                      --ref <ref> | SPEC_REF (default: main), authenticated
 *                                      with GH_TOKEN / GITHUB_TOKEN when set
 *
 *   --check   bundle into a temp dir and exit 1 if the committed bundle differs (drift check)
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  LOCAL_BUNDLED_SPEC_PATH,
  LOCAL_SPEC_METADATA_PATH,
  LOCAL_SPEC_SOURCE_PATH,
  LOCAL_UPSTREAM_ROOT_DIR,
  UPSTREAM_BRANCH,
  UPSTREAM_REPO,
  UPSTREAM_SPEC_DIR,
  UPSTREAM_SPEC_ENTRY_FILE,
} from './spec-location';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const check = process.argv.includes('--check');
const hubDir = arg('--hub-dir') ?? process.env.HUB_REPO_DIR;
const explicitRef = arg('--ref') ?? process.env.SPEC_REF;
const ref = explicitRef ?? UPSTREAM_BRANCH;

function git(args: string[], cwd?: string): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

function copyDir(src: string, dest: string): void {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

let source: { repo: string; ref: string; commit: string; specDir: string };

if (hubDir) {
  const specDir = path.resolve(hubDir, UPSTREAM_SPEC_DIR);
  if (!fs.existsSync(path.join(specDir, UPSTREAM_SPEC_ENTRY_FILE))) {
    console.error(`[fetch-spec] ${UPSTREAM_SPEC_ENTRY_FILE} not found under ${specDir}`);
    process.exit(1);
  }
  const dirty = git(['status', '--porcelain', '--', UPSTREAM_SPEC_DIR], hubDir) !== '';
  const commit = git(['rev-parse', 'HEAD'], hubDir) + (dirty ? '-dirty' : '');
  copyDir(specDir, LOCAL_UPSTREAM_ROOT_DIR);
  source = {
    repo: UPSTREAM_REPO,
    ref: explicitRef ?? git(['rev-parse', '--abbrev-ref', 'HEAD'], hubDir),
    commit,
    specDir: UPSTREAM_SPEC_DIR,
  };
  console.log(`[fetch-spec] using local checkout ${hubDir} @ ${commit}`);
} else {
  const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  const url = token
    ? `https://x-access-token:${token}@github.com/${UPSTREAM_REPO}.git`
    : `https://github.com/${UPSTREAM_REPO}.git`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-spec-'));
  try {
    git(['init', '-q', tmp]);
    git(['-C', tmp, 'remote', 'add', 'origin', url]);
    git(['-C', tmp, 'sparse-checkout', 'set', '--no-cone', `/${UPSTREAM_SPEC_DIR}`]);
    git(['-C', tmp, 'fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', ref]);
    git(['-C', tmp, 'checkout', '-q', 'FETCH_HEAD']);
    const commit = git(['-C', tmp, 'rev-parse', 'HEAD']);
    copyDir(path.join(tmp, UPSTREAM_SPEC_DIR), LOCAL_UPSTREAM_ROOT_DIR);
    source = { repo: UPSTREAM_REPO, ref, commit, specDir: UPSTREAM_SPEC_DIR };
    console.log(`[fetch-spec] fetched ${UPSTREAM_REPO}@${ref} (${commit})`);
  } catch (e) {
    console.error(
      `[fetch-spec] could not fetch ${UPSTREAM_REPO}@${ref}. The repository is private: set GH_TOKEN, or point HUB_REPO_DIR at a local checkout.`
    );
    throw e;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const outDir = check
  ? fs.mkdtempSync(path.join(os.tmpdir(), 'hub-bundle-'))
  : path.dirname(LOCAL_BUNDLED_SPEC_PATH);
fs.mkdirSync(outDir, { recursive: true });
const outSpec = path.join(outDir, path.basename(LOCAL_BUNDLED_SPEC_PATH));
const outMeta = path.join(outDir, path.basename(LOCAL_SPEC_METADATA_PATH));

execFileSync(
  'camunda-schema-bundler',
  [
    '--spec-dir',
    LOCAL_UPSTREAM_ROOT_DIR,
    '--entry-file',
    UPSTREAM_SPEC_ENTRY_FILE,
    '--deref-path-local',
    '--output-spec',
    outSpec,
    '--output-metadata',
    outMeta,
  ],
  { stdio: 'inherit' }
);

if (check) {
  const same = (a: string, b: string) =>
    fs.existsSync(b) && fs.readFileSync(a, 'utf8') === fs.readFileSync(b, 'utf8');
  const drift = [
    [outSpec, LOCAL_BUNDLED_SPEC_PATH],
    [outMeta, LOCAL_SPEC_METADATA_PATH],
  ].filter(([a, b]) => !same(a, b));
  fs.rmSync(outDir, { recursive: true, force: true });
  if (drift.length) {
    console.error(
      `[fetch-spec] committed bundle is out of date with ${source.repo}@${source.commit}: ${drift.map(([, b]) => path.relative(process.cwd(), b)).join(', ')}. Run \`npm run spec:fetch\` and \`npm run generate\`.`
    );
    process.exit(1);
  }
  console.log(`[fetch-spec] committed bundle matches ${source.repo}@${source.commit}`);
} else {
  fs.writeFileSync(LOCAL_SPEC_SOURCE_PATH, `${JSON.stringify(source, null, 2)}\n`);
  console.log(`[fetch-spec] wrote ${path.relative(process.cwd(), outDir)}`);
}
