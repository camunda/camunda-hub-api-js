import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import * as SDK from '../src';
import { SortOrderEnum } from '../src';

describe('runtime enum objects', () => {
  it('SortOrderEnum exposes values at runtime', () => {
    expect(SortOrderEnum.ASC).toBe('ASC');
    expect(SortOrderEnum.DESC).toBe('DESC');
    expect(Object.values(SortOrderEnum)).toEqual(['ASC', 'DESC']);
  });

  it('string literals remain assignable to the type', () => {
    // Backwards-compatibility: raw string literals still satisfy the enum type
    const order: SortOrderEnum = 'ASC';
    expect(order).toBe(SortOrderEnum.ASC);
  });

  it('supports validation of raw input via Object.values', () => {
    const values = Object.values(SortOrderEnum) as string[];
    expect(values.includes('DESC')).toBe(true);
    expect(values.includes('SIDEWAYS')).toBe(false);
  });

  it('every *Enum type in types.gen.ts has a runtime const companion', () => {
    // Parse types.gen.ts to discover all enum names the hook should have transformed
    const typesPath = path.join(__dirname, '..', 'src', 'gen', 'types.gen.ts');
    const source = fs.readFileSync(typesPath, 'utf8');
    const enumNames: string[] = [];
    const pattern = /^export const (\w+Enum)\s*=/gm;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(source)) !== null) {
      enumNames.push(m[1]);
    }

    expect(enumNames.length).toBeGreaterThan(0);

    for (const name of enumNames) {
      const exported = (SDK as Record<string, unknown>)[name];
      expect(exported, `${name} should be exported from SDK`).toBeDefined();
      expect(typeof exported, `${name} should be an object`).toBe('object');

      const entries = Object.entries(exported as Record<string, string>);
      expect(entries.length, `${name} should have at least one member`).toBeGreaterThan(0);

      // Every entry should have key === value (the as-const identity pattern)
      for (const [key, value] of entries) {
        expect(value, `${name}.${key} should equal its key`).toBe(key);
      }
    }
  });
});
