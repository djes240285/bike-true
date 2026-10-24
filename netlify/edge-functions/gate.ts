import { cookieValue, gateCookie, gateToken, isOpenPath, loginDecision, tokensMatch } from '../../src/lib/gate.ts';

declare const Netlify: { env: { get: (name: string) => string | undefined } };

type EdgeContext = { next: () => Promise<Response> };

export default async (request: Request, context: EdgeContext) => {
  const url = new URL(request.url);
  const password = readPassword();

  if (request.method === 'POST' && (url.pathname === '/enter' || url.pathname === '/enter/')) {
    const form = await request.formData();
    const decision = await loginDecision(
      password,
      String(form.get('password') || ''),
      String(form.get('next') || '/'),
    );
    if (!decision.ok) {
      return redirect(url, `/enter?next=${encodeURIComponent(decision.next)}&error=${decision.error}`);
    }
    return redirect(url, decision.next, gateCookie(decision.token, true));
  }

  if (isOpenPath(url.pathname)) return seal(await context.next());
  if (!password) return redirect(url, '/enter?error=closed');

  const given = cookieValue(request.headers.get('cookie'));
  if (tokensMatch(given, await gateToken(password))) return seal(await context.next());

  const next = `${url.pathname}${url.search}`;
  return redirect(url, `/enter?next=${encodeURIComponent(next)}`);
};

export const config = { path: '/*', cache: 'manual' };

function readPassword() {
  if (typeof Netlify !== 'undefined' && Netlify.env) return Netlify.env.get('SITE_PASSWORD') || '';
  return '';
}

function redirect(url: URL, location: string, cookie?: string) {
  const headers = new Headers({
    location: new URL(location, url).toString(),
    'cache-control': 'no-store',
  });
  if (cookie) headers.set('set-cookie', cookie);
  return new Response(null, { status: 303, headers });
}

function seal(response: Response) {
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'private, no-store');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
