export type LinkDecision =
  | { action: 'login'; userId: number }
  | { action: 'attach'; userId: number }
  | { action: 'attach-email'; userId: number }
  | { action: 'create' }
  | { action: 'taken' };

export function decideLink(input: {
  sessionUserId: number | null;
  identityUserId: number | null;
  emailUserId: number | null;
}): LinkDecision {
  if (input.identityUserId !== null) {
    if (input.sessionUserId !== null && input.sessionUserId !== input.identityUserId) return { action: 'taken' };
    return { action: 'login', userId: input.identityUserId };
  }
  if (input.sessionUserId !== null) return { action: 'attach', userId: input.sessionUserId };
  if (input.emailUserId !== null) return { action: 'attach-email', userId: input.emailUserId };
  return { action: 'create' };
}
