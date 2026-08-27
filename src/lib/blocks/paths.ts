/**
 * Deep get/set for block props, used by inline front-end editing.
 * Paths look like `heading`, `tiles.0.title`, `primary.0.label`.
 */

export function getPath(source: unknown, path: string): unknown {
  const parts = path.split('.').filter(Boolean);
  let cur: unknown = source;
  for (const part of parts) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) {
      const i = Number(part);
      if (!Number.isInteger(i)) return undefined;
      cur = cur[i];
    } else if (typeof cur === 'object') {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return cur;
}

/** Immutable set — returns a new structure, leaving `source` untouched. */
export function setPath<T>(source: T, path: string, value: unknown): T {
  const parts = path.split('.').filter(Boolean);
  if (!parts.length) return source;

  const clone = (node: unknown, depth: number): unknown => {
    const key = parts[depth];
    const last = depth === parts.length - 1;

    if (Array.isArray(node)) {
      const i = Number(key);
      if (!Number.isInteger(i) || i < 0 || i >= node.length) return node;
      const next = [...node];
      next[i] = last ? value : clone(node[i], depth + 1);
      return next;
    }

    const base =
      node && typeof node === 'object' ? { ...(node as Record<string, unknown>) } : {};
    base[key] = last ? value : clone((base as Record<string, unknown>)[key], depth + 1);
    return base;
  };

  return clone(source, 0) as T;
}

/**
 * `block:<id>:<path>` · `setting:<key>` · `record:<model>:<id>:<field>`
 * → structured target.
 */
export type EditTarget =
  | { kind: 'block'; id: string; path: string }
  | { kind: 'setting'; path: string }
  | { kind: 'record'; model: string; id: string; field: string };

export function parseEditTarget(raw: string): EditTarget | null {
  if (raw.startsWith('block:')) {
    const rest = raw.slice('block:'.length);
    const sep = rest.indexOf(':');
    if (sep < 1) return null;
    const id = rest.slice(0, sep);
    const path = rest.slice(sep + 1);
    if (!id || !path) return null;
    return { kind: 'block', id, path };
  }
  if (raw.startsWith('record:')) {
    // record:<model>:<id>:<field>, where field may itself be a path (items.0)
    const [, model, id, ...rest] = raw.split(':');
    const field = rest.join(':');
    if (!model || !id || !field) return null;
    return { kind: 'record', model, id, field };
  }
  if (raw.startsWith('setting:')) {
    const path = raw.slice('setting:'.length);
    return path ? { kind: 'setting', path } : null;
  }
  return null;
}
