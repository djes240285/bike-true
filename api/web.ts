import { join, relative, resolve, sep } from 'node:path';
import { cookieValue, gateCookie, gateToken, isOpenPath, loginDecision, tokensMatch } from '../src/lib/gate';
import { deliverVisit, flagsFromEnv } from '../src/lib/visit';

const root = resolve(process.env.WEB_ROOT?.trim() || join(process.cwd(), 'dist'));
const port = Number(process.env.WEB_PORT || 8788);
const password = () => process.env.SITE_PASSWORD?.trim() || '';

function secure(request: Request) {
  return request.headers.get('x-forwarded-proto') === 'https' || new URL(request.url).protocol === 'https:';
}

function redirect(location: string, cookie?: string) {
  const headers = new Headers({ location, 'cache-control': 'no-store' });
  if (cookie) headers.set('set-cookie', cookie);
  return new Response(null, { status: 303, headers });
}

function seal(response: Response) {
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'private, no-store');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('x-frame-options', 'DENY');
  headers.set('permissions-policy', 'geolocation=(), microphone=()');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function staticFile(pathname: string) {
  const clean = decodeURIComponent(pathname.split('?')[0] || '/');
  const relativePath = clean === '/' ? '' : clean.replace(/^\/+/, '').replace(/\/+$/, '');
  const names = relativePath
    ? [relativePath, `${relativePath}.html`, join(relativePath, 'index.html')]
    : ['index.html'];

  for (const name of names) {
    const resolved = resolve(join(root, name));
    const rel = relative(root, resolved);
    if (!rel || rel.startsWith('..') || rel.includes(`..${sep}`)) continue;
    const file = Bun.file(resolved);
    if (await file.exists()) return new Response(file);
  }
  return new Response('Not found', { status: 404 });
}

async function handleVisit(request: Request) {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'name' }, { status: 400 });
  }
  const result = await deliverVisit(body, process.env);
  return Response.json(result.body, { status: result.status });
}

async function handle(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const sitePassword = password();

  if (request.method === 'POST' && (path === '/enter' || path === '/enter/')) {
    const form = await request.formData();
    const decision = await loginDecision(
      sitePassword,
      String(form.get('password') || ''),
      String(form.get('next') || '/'),
    );
    if (!decision.ok) {
      return redirect(`/enter?next=${encodeURIComponent(decision.next)}&error=${decision.error}`);
    }
    return redirect(decision.next, gateCookie(decision.token, secure(request)));
  }

  if (path === '/api/flags') {
    if (sitePassword) {
      const given = cookieValue(request.headers.get('cookie'));
      if (!tokensMatch(given, await gateToken(sitePassword))) return new Response('Закрыто', { status: 401 });
    }
    return seal(Response.json(flagsFromEnv(process.env)));
  }

  if (path === '/api/visit') {
    if (sitePassword) {
      const given = cookieValue(request.headers.get('cookie'));
      if (!tokensMatch(given, await gateToken(sitePassword))) return new Response('Закрыто', { status: 401 });
    }
    return seal(await handleVisit(request));
  }

  if (isOpenPath(path)) return seal(await staticFile(path));

  if (!sitePassword) return redirect('/enter?error=closed');

  const given = cookieValue(request.headers.get('cookie'));
  if (tokensMatch(given, await gateToken(sitePassword))) return seal(await staticFile(path));

  if (request.method === 'GET' || request.method === 'HEAD') {
    return redirect(`/enter?next=${encodeURIComponent(`${path}${url.search}`)}`);
  }
  return new Response('Закрыто', { status: 401 });
}

Bun.serve({
  hostname: '127.0.0.1',
  port,
  fetch: handle,
});

console.log(`BikeTrue web on 127.0.0.1:${port}, root ${root}`);
