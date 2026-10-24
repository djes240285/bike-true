import { join, relative, resolve, sep } from 'node:path';
import { cookieValue, gateCookie, gateToken, isOpenPath, loginDecision, tokensMatch } from '../src/lib/gate';
import { deliverVisit, flagsFromEnv } from '../src/lib/visit';

const root = resolve(process.env.WEB_ROOT?.trim() || join(process.cwd(), 'dist'));
const port = Number(process.env.WEB_PORT || 8788);
const password = () => process.env.SITE_PASSWORD?.trim() || '';

const guardHeaders = {
  'cache-control': 'private, no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'permissions-policy': 'geolocation=(), microphone=()',
} as const;

function secure(request: Request) {
  return request.headers.get('x-forwarded-proto') === 'https' || new URL(request.url).protocol === 'https:';
}

function redirect(location: string, cookie?: string) {
  const headers = new Headers({ location, 'cache-control': 'no-store' });
  if (cookie) headers.set('set-cookie', cookie);
  return new Response(null, { status: 303, headers });
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: guardHeaders });
}

function text(body: string, status: number) {
  return new Response(body, { status, headers: { ...guardHeaders, 'content-type': 'text/plain; charset=utf-8' } });
}

async function staticFile(pathname: string, method: string) {
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
    if (!(await file.exists())) continue;
    if (method === 'HEAD') {
      return new Response(null, {
        status: 200,
        headers: {
          ...guardHeaders,
          'content-type': file.type || 'application/octet-stream',
          'content-length': String(file.size),
        },
      });
    }
    return new Response(file, { headers: guardHeaders });
  }
  return text('Not found', 404);
}

async function handleVisit(request: Request) {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: guardHeaders });
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'name' }, 400);
  }
  const result = await deliverVisit(body, process.env);
  return json(result.body, result.status);
}

async function gateAllows(request: Request, sitePassword: string) {
  const given = cookieValue(request.headers.get('cookie'));
  return tokensMatch(given, await gateToken(sitePassword));
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
    if (sitePassword && !(await gateAllows(request, sitePassword))) return text('Закрыто', 401);
    return json(flagsFromEnv(process.env));
  }

  if (path === '/api/visit') {
    if (sitePassword && !(await gateAllows(request, sitePassword))) return text('Закрыто', 401);
    return handleVisit(request);
  }

  if (isOpenPath(path)) return staticFile(path, request.method);

  if (!sitePassword) return redirect('/enter?error=closed');
  if (await gateAllows(request, sitePassword)) return staticFile(path, request.method);

  if (request.method === 'GET' || request.method === 'HEAD') {
    return redirect(`/enter?next=${encodeURIComponent(`${path}${url.search}`)}`);
  }
  return text('Закрыто', 401);
}

Bun.serve({
  hostname: '127.0.0.1',
  port,
  fetch: handle,
});

console.log(`BikeTrue web on 127.0.0.1:${port}, root ${root}`);
