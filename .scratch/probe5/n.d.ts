export interface ProjectCreateRequest { name: string; target?: { kind: 'a' | 'c'; tag?: string } | { kind: 'b'; tag?: string }; }
