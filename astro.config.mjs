import { loadEnv } from 'vite';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

const site = process.env.URL || process.env.SITE_URL || 'http://localhost:4321';

export default defineConfig({
  site,
  integrations: [react()],
  vite: {
    plugins: [
      {
        name: 'biketrue-dev-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = req.url?.split('?')[0];
            const env = {
              ...process.env,
              ...loadEnv(server.config.mode, process.cwd(), ''),
            };
            const password = env.SITE_PASSWORD?.trim() || '';
            if (password) {
              const gate = await server.ssrLoadModule('/src/lib/gate.ts');
              if ((url === '/enter' || url === '/enter/') && req.method === 'POST') {
                const chunks = [];
                for await (const chunk of req) chunks.push(chunk);
                const form = new URLSearchParams(Buffer.concat(chunks).toString());
                const decision = await gate.loginDecision(password, form.get('password') || '', form.get('next') || '/');
                const secure = req.headers['x-forwarded-proto'] === 'https';
                res.statusCode = 303;
                if (decision.ok) res.setHeader('set-cookie', gate.gateCookie(decision.token, secure));
                const back = decision.ok
                  ? decision.next
                  : `/enter?next=${encodeURIComponent(decision.next)}&error=${decision.error}`;
                res.setHeader('location', back);
                res.end();
                return;
              }
              if (!gate.isOpenPath(url || '/')) {
                const header = Array.isArray(req.headers.cookie) ? req.headers.cookie.join('; ') : req.headers.cookie || '';
                const allowed = gate.tokensMatch(gate.cookieValue(header), await gate.gateToken(password));
                if (!allowed) {
                  if (req.method === 'GET' || req.method === 'HEAD') {
                    res.statusCode = 302;
                    res.setHeader('location', `/enter?next=${encodeURIComponent(req.url || '/')}`);
                    res.end();
                    return;
                  }
                  res.statusCode = 401;
                  res.end('Закрыто');
                  return;
                }
              }
            }
            if (url !== '/api/flags' && url !== '/api/visit') return next();
            const visit = await server.ssrLoadModule('/src/lib/visit.ts');
            if (url === '/api/flags') {
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify(visit.flagsFromEnv(env)));
              return;
            }
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end();
              return;
            }
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            let body = {};
            try {
              body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
            } catch {
              res.statusCode = 400;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: 'name' }));
              return;
            }
            const result = await visit.deliverVisit(body, env);
            res.statusCode = result.status;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify(result.body));
          });
        },
      },
    ],
  },
});
