import { flagsFromEnv } from '../../src/lib/visit.ts';

export default async () => {
  const flags = flagsFromEnv({
    PAYMENTS_ENABLED: readEnv('PAYMENTS_ENABLED'),
    SUBSCRIPTION_ENABLED: readEnv('SUBSCRIPTION_ENABLED'),
    PRICE_RUB: readEnv('PRICE_RUB'),
    CITY: readEnv('CITY'),
    DURATION_MIN: readEnv('DURATION_MIN'),
    ADDRESS: readEnv('ADDRESS'),
    CHECKOUT_URL: readEnv('CHECKOUT_URL'),
  });
  return Response.json(flags);
};

function readEnv(name) {
  const fromNetlify = typeof Netlify !== 'undefined' && Netlify.env ? Netlify.env.get(name) : '';
  return (fromNetlify || process.env[name] || '').trim();
}
