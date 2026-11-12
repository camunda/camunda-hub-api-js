/**
 * Prose for the spec's `x-availability` marker. Unknown values fail generation, so a new
 * deployment marker is never dropped silently. Prose rather than a custom tag: typedoc
 * treats unknown tags as errors.
 *
 * A Map (not an object literal) so inherited keys such as `constructor`, `toString` or
 * `__proto__` can never resolve to a note and bypass the unknown-value guard.
 */
const AVAILABILITY_NOTES: ReadonlyMap<string, string> = new Map([
  ['sm', '**Self-Managed only.** Camunda SaaS does not provide this endpoint.'],
  ['saas', '**SaaS only.** Self-Managed does not provide this endpoint.'],
]);

export function availabilityNote(opId: string, value: unknown): string | undefined {
  if (value === undefined) return undefined;
  const note = typeof value === 'string' ? AVAILABILITY_NOTES.get(value) : undefined;
  if (note === undefined) {
    throw new Error(`[class-gen] ${opId}: unknown x-availability ${JSON.stringify(value)}`);
  }
  return note;
}
