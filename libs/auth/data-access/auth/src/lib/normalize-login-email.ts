/**
 * Matches legacy usaccounting login: plain user names become `{user}@phone.com`
 * for email/password providers. If the user already entered a full email, it is left unchanged.
 */
export function normalizeLoginEmail(identifier: string): string {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (trimmed.includes('@')) {
    return trimmed;
  }
  return `${trimmed}@phone.com`;
}
