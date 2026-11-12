// Classification of public API changes by scripts/api-compat.ts, on minimal declaration
// builds shaped like the real one (index / logger / fn entry points, a nominal HubCore class,
// HubClient methods built from request and response models).
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { compareApis } from '../scripts/api-compat';

const root = fs.mkdtempSync(path.join(__dirname, '.api-compat-'));
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

interface Shape {
  request?: string;
  response?: string;
  extraMethods?: string;
  extraExports?: string;
  fnExtra?: string;
}

const base: Required<Shape> = {
  request: 'name: string; description?: string;',
  response: 'projectKey: string; name: string;',
  extraMethods: 'getInfo(): Promise<{ version: string }>;',
  extraExports: '',
  fnExtra: '',
};

let n = 0;
function build(shape: Shape = {}): string {
  const s = { ...base, ...shape };
  const dir = path.join(root, `b${n++}`);
  fs.mkdirSync(path.join(dir, 'fn'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'index.d.ts'),
    `declare class HubCore { private readonly secret; configure(): void; }
export interface ProjectCreateRequest { ${s.request} }
export interface ProjectResult { ${s.response} }
declare class HubClientBase extends HubCore {
  createProject(input: ProjectCreateRequest): Promise<ProjectResult>;
  ${s.extraMethods}
}
export type HubClient = HubClientBase;
export declare function createHubClient(): HubClient;
${s.extraExports}
export { HubCore, HubClientBase };
`
  );
  fs.writeFileSync(
    path.join(dir, 'logger.d.ts'),
    'export declare function createLogger(): void;\n'
  );
  fs.writeFileSync(
    path.join(dir, 'fn', 'index.d.ts'),
    `import type { HubCore, ProjectCreateRequest, ProjectResult } from '../index';
export declare function createProject(core: HubCore, input: ProjectCreateRequest): Promise<ProjectResult>;
${s.fnExtra}
`
  );
  return dir;
}

const compare = (oldShape: Shape, newShape: Shape) => compareApis(build(oldShape), build(newShape));

describe('api-compat', () => {
  it('reports no change for identical builds, despite nominal runtime classes', () => {
    const r = compare({}, {});
    expect(r.decision).toBe('none');
    expect(r).toMatchObject({ breakingSignatures: [], changedTypes: [], compatibleSignatures: [] });
  });

  it('adding a required request property is breaking', () => {
    const r = compare({}, { request: `${base.request} workspaceKey: string;` });
    expect(r.decision).toBe('breaking');
    expect(r.breakingSignatures).toEqual(
      expect.arrayContaining([
        'HubClient.createProject (parameters)',
        './fn createProject (parameters)',
      ])
    );
  });

  it('adding an optional request property is additive', () => {
    const r = compare({}, { request: `${base.request} tags?: string[];` });
    expect(r.decision).toBe('additive');
    expect(r.compatibleSignatures).toContain('HubClient.createProject (parameters)');
  });

  it('making a required request property optional is additive', () => {
    const r = compare({}, { request: 'name?: string; description?: string;' });
    expect(r.decision).toBe('additive');
  });

  it('removing a response property is breaking', () => {
    const r = compare({}, { response: 'projectKey: string;' });
    expect(r.decision).toBe('breaking');
    expect(r.breakingSignatures).toContain('HubClient.createProject (result)');
  });

  it('a response property becoming nullable is breaking', () => {
    const r = compare({}, { response: 'projectKey: string; name: string | null;' });
    expect(r.decision).toBe('breaking');
    expect(r.breakingSignatures).toContain('HubClient.createProject (result)');
  });

  it('adding a response property is additive', () => {
    const r = compare({}, { response: `${base.response} createdAt: string;` });
    expect(r.decision).toBe('additive');
    expect(r.compatibleSignatures).toContain('HubClient.createProject (result)');
  });

  it('a removed client method is breaking', () => {
    const r = compare({}, { extraMethods: '' });
    expect(r.decision).toBe('breaking');
    expect(r.removedMethods).toEqual(['getInfo']);
  });

  it('an added client method and export are additive', () => {
    const r = compare(
      {},
      {
        extraMethods: `${base.extraMethods} getEnvironments(): Promise<string[]>;`,
        extraExports: 'export type EnvironmentResult = { id: string };',
      }
    );
    expect(r.decision).toBe('additive');
    expect(r.addedMethods).toEqual(['getEnvironments']);
    expect(r.addedExports).toEqual(['.: EnvironmentResult']);
  });

  it('a removed export is breaking', () => {
    const r = compare(
      { fnExtra: 'export declare function getInfo(core: HubCore): Promise<string>;' },
      {}
    );
    expect(r.decision).toBe('breaking');
    expect(r.removedExports).toEqual(['./fn: getInfo']);
  });

  it('removing an optional request property is breaking (object literals are excess-checked)', () => {
    const r = compare({}, { request: 'name: string;' });
    expect(r.decision).toBe('breaking');
    expect(r.breakingSignatures).toEqual(
      expect.arrayContaining([
        'HubClient.createProject (parameters: removed arg0.description)',
        './fn createProject (parameters: removed arg0.description)',
      ])
    );
  });

  it('removing a nested request property is breaking', () => {
    const r = compare(
      { request: 'name: string; filter?: { owner?: string; tag?: string };' },
      { request: 'name: string; filter?: { owner?: string };' }
    );
    expect(r.breakingSignatures).toContain(
      'HubClient.createProject (parameters: removed arg0.filter.tag)'
    );
  });

  it('removing a property from one union member is breaking', () => {
    const r = compare(
      { request: 'name: string; target?: { a: string } | { b?: string };' },
      { request: 'name: string; target?: { a: string } | {};' }
    );
    expect(r.breakingSignatures).toContain(
      'HubClient.createProject (parameters: removed arg0.target.b)'
    );
  });

  it('a removed key under an index signature is not breaking', () => {
    const r = compare(
      { request: 'name: string; labels?: { [k: string]: string; env?: string };' },
      { request: 'name: string; labels?: { [k: string]: string };' }
    );
    expect(r.breakingSignatures).toEqual([]);
  });

  const key = (members: string) =>
    `export type ProjectKey = string & { __brand: 'ProjectKey' };\nexport declare const ProjectKey: { ${members} };`;
  const keyMembers =
    'assumeExists(value: string): ProjectKey; getValue(key: ProjectKey): string; isValid(value: string): boolean;';

  it('an unchanged value export is no change', () => {
    expect(
      compare({ extraExports: key(keyMembers) }, { extraExports: key(keyMembers) }).decision
    ).toBe('none');
  });

  it('removing a member of a value export is breaking', () => {
    const r = compare(
      { extraExports: key(keyMembers) },
      { extraExports: key('getValue(key: ProjectKey): string; isValid(value: string): boolean;') }
    );
    expect(r.decision).toBe('breaking');
    expect(r.removedExports).toEqual(['.: ProjectKey.assumeExists']);
  });

  it('removing the value side of a merged type/value export is breaking', () => {
    const r = compare(
      { extraExports: key(keyMembers) },
      { extraExports: "export type ProjectKey = string & { __brand: 'ProjectKey' };" }
    );
    expect(r.decision).toBe('breaking');
    expect(r.removedExports).toEqual(['.: ProjectKey (value)']);
  });

  it('a breaking change to a value member signature is breaking', () => {
    const r = compare(
      { extraExports: key(keyMembers) },
      {
        extraExports: key(
          'assumeExists(value: string, strict: boolean): ProjectKey; getValue(key: ProjectKey): string; isValid(value: string): boolean;'
        ),
      }
    );
    expect(r.breakingSignatures).toContain('ProjectKey.assumeExists (parameters)');
  });

  it('compares enums by members: identical copies match, an added member is a change', () => {
    const errorEnum = (members: string) =>
      `export declare enum ConfigErrorCode { ${members} }\nexport interface ConfigErrorDetail { code: ConfigErrorCode; }`;
    expect(
      compare({ extraExports: errorEnum('A = "A"') }, { extraExports: errorEnum('A = "A"') })
        .decision
    ).toBe('none');
    const r = compare(
      { extraExports: errorEnum('A = "A"') },
      { extraExports: errorEnum('A = "A", B = "B"') }
    );
    expect(r.decision).toBe('additive');
    expect(r.changedTypes).toContain('ConfigErrorCode');
  });
});
