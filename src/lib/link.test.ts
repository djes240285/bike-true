import { describe, expect, test } from 'bun:test';
import { decideLink } from './link';

describe('decideLink', () => {
  test('известный вход открывает своего человека', () => {
    expect(decideLink({ sessionUserId: null, identityUserId: 4, emailUserId: null })).toEqual({ action: 'login', userId: 4 });
    expect(decideLink({ sessionUserId: 4, identityUserId: 4, emailUserId: null })).toEqual({ action: 'login', userId: 4 });
  });

  test('чужой вход к открытой сессии не сливается', () => {
    expect(decideLink({ sessionUserId: 3, identityUserId: 4, emailUserId: null })).toEqual({ action: 'taken' });
  });

  test('новый вход в сессии привязывается к ней', () => {
    expect(decideLink({ sessionUserId: 3, identityUserId: null, emailUserId: 9 })).toEqual({ action: 'attach', userId: 3 });
  });

  test('та же почта без сессии привязывает вход', () => {
    expect(decideLink({ sessionUserId: null, identityUserId: null, emailUserId: 9 })).toEqual({ action: 'attach-email', userId: 9 });
  });

  test('совсем новый человек создаётся', () => {
    expect(decideLink({ sessionUserId: null, identityUserId: null, emailUserId: null })).toEqual({ action: 'create' });
  });
});
