import { useEffect, useState } from 'react';
import { dict, type Locale } from '../i18n';
import { initials } from '../lib/avatar';
import { apiUrl, cabinetFetch } from '../lib/cabinet-client';
import { pathFor } from '../lib/paths';

type State = { kind: 'out' } | { kind: 'in'; name: string; avatar: string | null };

export default function AuthCorner({ locale }: { locale: Locale }) {
  const t = dict[locale].account;
  const [state, setState] = useState<State>({ kind: 'out' });
  const here = typeof location === 'undefined' ? '' : location.pathname;

  useEffect(() => {
    if (!apiUrl()) return;
    let alive = true;
    cabinetFetch('/me')
      .then(async (res) => {
        if (!alive || res.status === 401) return;
        const data = (await res.json()) as { name?: string; avatar?: string | null };
        if (res.ok && data.name) setState({ kind: 'in', name: data.name, avatar: data.avatar || null });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (state.kind === 'in') {
    return (
      <a className="auth-link is-user" href={pathFor(locale, '/account')} aria-current={here.endsWith('/account') ? 'page' : undefined}>
        {state.avatar ? (
          <img
            className="auth-face"
            src={state.avatar}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setState((current) => (current.kind === 'in' ? { ...current, avatar: null } : current))}
          />
        ) : (
          <span className="auth-mark" aria-hidden="true">{initials(state.name)}</span>
        )}
        <span className="auth-name">{state.name}</span>
      </a>
    );
  }

  return (
    <a className="auth-link" href={pathFor(locale, '/signin')} aria-current={here.endsWith('/signin') ? 'page' : undefined}>{t.signin}</a>
  );
}
