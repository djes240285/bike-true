import { Hono } from 'hono';
import { cors } from 'hono/cors';

export function createApp() {
  const app = new Hono();
  const origin = process.env.WEB_ORIGIN?.trim() || 'http://localhost:4321';
  app.use('*', cors({ origin, credentials: true, allowHeaders: ['Content-Type', 'X-BikeTrue'] }));
  app.use('*', async (c, next) => {
    const method = c.req.method;
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && c.req.header('x-biketrue') !== '1') {
      return c.json({ ok: false, error: 'forbidden' }, 403);
    }
    await next();
  });
  return app;
}
