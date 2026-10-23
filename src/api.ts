// When deployed on Vercel (frontend + API in same project), BASE defaults to '/api'.
// For local dev, set VITE_API_URL in .env.local to your Vercel preview URL,
// or use `vercel dev` which runs both the frontend and API routes together.
const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');
const BASE = configuredApiUrl
  ? configuredApiUrl.endsWith('/api') ? configuredApiUrl : `${configuredApiUrl}/api`
  : '/api';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(BASE + path, { ...options, signal: options?.signal ?? controller.signal });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Request failed (${res.status})`);
    }
    return res.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('The request took too long. Check your connection and try again.', { cause: error });
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

/** Build FormData for hangout create/update. */
function buildFormData(body: {
  date?: string;
  label?: string;
  attendance?: { person_name: string; present: boolean }[];
  photo?: File | null;
}) {
  const fd = new FormData();
  if (body.date) fd.append('date', body.date);
  if (body.label !== undefined) fd.append('label', body.label);
  if (body.attendance) fd.append('attendance', JSON.stringify(body.attendance));
  if (body.photo) fd.append('photo', body.photo);
  return fd;
}

export const api = {
  getMembers: () => req<import('./types').Member[]>('/members'),

  getHangouts: (year?: number, month?: number) => {
    const params = year && month ? `?year=${year}&month=${month}` : '';
    return req<import('./types').Hangout[]>(`/hangouts${params}`);
  },

  getHangout: (id: number) => req<import('./types').Hangout>(`/hangouts/${id}`),

  createHangout: (body: {
    date: string;
    label?: string;
    attendance: { person_name: string; present: boolean }[];
    photo?: File | null;
  }) =>
    req<import('./types').Hangout>('/hangouts', {
      method: 'POST',
      body: buildFormData(body),
    }),

  updateHangout: (
    id: number,
    body: {
      label?: string;
      attendance?: { person_name: string; present: boolean }[];
      photo?: File | null;
    }
  ) =>
    req<import('./types').Hangout>(`/hangouts/${id}`, {
      method: 'PUT',
      body: buildFormData(body),
    }),

  deleteHangout: (id: number) =>
    req<{ success: boolean }>(`/hangouts/${id}`, { method: 'DELETE' }),

  getStats: () => req<import('./types').StatsResponse>('/stats'),
};
