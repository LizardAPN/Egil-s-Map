export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}
