import { deliverVisit } from '../../src/lib/visit.ts';

export default async (request) => {
  if (request.method !== 'POST') return Response.json({ ok: false, error: 'method' }, { status: 405 });
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 20_000) return Response.json({ ok: false, error: 'photo' }, { status: 413 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'name' }, { status: 400 });
  }

  const result = await deliverVisit(body, {
    TELEGRAM_BOT_TOKEN: readEnv('TELEGRAM_BOT_TOKEN'),
    TELEGRAM_CHAT_ID: readEnv('TELEGRAM_CHAT_ID'),
  });
  return Response.json(result.body, { status: result.status });
};

function readEnv(name) {
  if (typeof Netlify !== 'undefined' && Netlify.env) return Netlify.env.get(name) || '';
  return process.env[name] || '';
}
