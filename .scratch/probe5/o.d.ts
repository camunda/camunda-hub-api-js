export interface ProjectCreateRequest { name: string; target?: { kind: 'a'; tag?: string } | { kind: 'b'; tag?: string }; }
