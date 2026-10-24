import { flagsFromEnv } from '../../src/lib/visit.ts';

export default async () => {
  const flags = flagsFromEnv({
    PAYMENTS_ENABLED: readEnv('PAYMENTS_ENABLED'),
    PRICE_RUB: readEnv('PRICE_RUB'),
    CITY: readEnv('CITY'),
    DURATION_MIN: readEnv('DURATION_MIN'),
    ADDRESS: readEnv('ADDRESS'),
    CHECKOUT_URL: readEnv('CHECKOUT_URL'),
  });
  return Response.json(flags);
};

function readEnv(name) {
  if (typeof Netlify !== 'undefined' && Netlify.env) return Netlify.env.get(name) || '';
  return process.env[name] || '';
}
