import { createApp } from './app';

const app = createApp();
const port = Number(process.env.PORT || 8787);

if (import.meta.main) {
  Bun.serve({ hostname: '127.0.0.1', port, fetch: app.fetch });
}

export { app };
