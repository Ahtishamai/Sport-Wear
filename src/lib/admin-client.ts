'use client';

/** Thin fetch wrapper for the /api/admin endpoints. */

export class ApiError extends Error {}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers:
      init?.body instanceof FormData
        ? init?.headers
        : { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json?.error || `Request failed (${res.status})`);
  return json as T;
}

export const api = {
  list: <T>(resource: string, params?: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([k, v]) => {
      if (v !== undefined && v !== '') sp.set(k, String(v));
    });
    const qs = sp.toString();
    return request<{ items: T[]; total: number }>(
      `/api/admin/${resource}${qs ? `?${qs}` : ''}`
    );
  },

  get: <T>(resource: string, id: string) =>
    request<{ item: T }>(`/api/admin/${resource}/${id}`),

  create: <T>(resource: string, data: unknown) =>
    request<{ item: T }>(`/api/admin/${resource}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: <T>(resource: string, id: string, data: unknown) =>
    request<{ item: T }>(`/api/admin/${resource}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  remove: (resource: string, id: string, force = false) =>
    request<{ ok: true }>(`/api/admin/${resource}/${id}${force ? '?force=1' : ''}`, {
      method: 'DELETE',
    }),

  reorder: (resource: string, order: { id: string; position: number }[]) =>
    request<{ ok: true }>(`/api/admin/${resource}/reorder`, {
      method: 'POST',
      body: JSON.stringify({ order }),
    }),

  replaceNav: (menu: string, items: { label: string; href: string; newTab?: boolean }[]) =>
    request<{ ok: true }>(`/api/admin/nav/replace`, {
      method: 'POST',
      body: JSON.stringify({ menu, items }),
    }),

  saveSettings: (patch: unknown) =>
    request<{ settings: Record<string, unknown> }>(`/api/admin/settings`, {
      method: 'POST',
      body: JSON.stringify(patch),
    }),

  upload: (files: File[], folder = 'general') => {
    const fd = new FormData();
    fd.set('folder', folder);
    files.forEach((f) => fd.append('files', f));
    return request<{ items: MediaItem[] }>('/api/admin/upload', { method: 'POST', body: fd });
  },

  stats: () => request<AdminStats>('/api/admin/stats'),
};

export type MediaItem = {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string;
  folder: string;
  createdAt: string;
};

export type AdminStats = {
  products: number;
  collections: number;
  pages: number;
  quotes: number;
  newQuotes: number;
  contacts: number;
  newContacts: number;
  quotes30: number;
  pipeline: number;
  recentQuotes: {
    id: string;
    reference: string;
    team: string;
    name: string;
    subject: string;
    status: string;
    estTotal: number | null;
    createdAt: string;
  }[];
};
