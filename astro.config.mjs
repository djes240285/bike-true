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
            if (url !== '/api/flags' && url !== '/api/visit') return next();
            const env = {
              ...process.env,
              ...loadEnv(server.config.mode, process.cwd(), ''),
            };
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
