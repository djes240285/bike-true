export function apiUrl(): string {
  return (import.meta.env.PUBLIC_API_URL || '').replace(/\/$/, '');
}

export async function cabinetFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('X-BikeTrue', '1');
  if (init.body) headers.set('Content-Type', 'application/json');
  return fetch(`${apiUrl()}${path}`, { ...init, headers, credentials: 'include' });
}
