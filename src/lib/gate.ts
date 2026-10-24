export const GATE_COOKIE = 'bt_gate';
export const GATE_MAX_AGE = 60 * 60 * 24 * 30;
const GATE_LABEL = 'biketrue-gate-v1';

export async function gateToken(password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(GATE_LABEL));
  return [...new Uint8Array(sig)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function tokensMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function cookieValue(header: string | null, name = GATE_COOKIE): string {
  if (!header) return '';
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return '';
}

export function gateCookie(token: string, secure: boolean): string {
  const securePart = secure ? '; Secure' : '';
  return `${GATE_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${GATE_MAX_AGE}${securePart}`;
}

export function safeNext(raw: string | null | undefined): string {
  if (!raw) return '/';
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    return '/';
  }
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/';
  if (value.includes('\\') || value.includes('\n') || value.includes('\r') || value.includes('://')) return '/';
  if (value === '/enter' || value.startsWith('/enter/') || value.startsWith('/enter?')) return '/';
  return value;
}

export function isPwaAsset(pathname: string): boolean {
  if (pathname.includes('..')) return false;
  if (pathname === '/favicon.svg' || pathname === '/manifest.webmanifest' || pathname === '/sw.js') return true;
  if (pathname === '/offline' || pathname === '/offline/' || pathname === '/offline/index.html') return true;
  return pathname.startsWith('/icons/');
}

export function isOpenPath(pathname: string): boolean {
  return pathname === '/enter' || pathname === '/enter/' || isPwaAsset(pathname);
}

export async function loginDecision(sitePassword: string, given: string, nextRaw: string) {
  const next = safeNext(nextRaw);
  const expected = sitePassword.trim();
  if (!expected) return { ok: false as const, next, error: 'closed' as const };
  const a = await gateToken(expected);
  const b = await gateToken(given);
  if (!tokensMatch(a, b)) return { ok: false as const, next, error: 'wrong' as const };
  return { ok: true as const, next, token: a };
}
