const UNITS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

const PATTERN = /^(\d+)\s*([smhd])$/;

/** Parses the `15m` / `30d` form used by the token TTL env vars into ms. */
export function parseDuration(
  value: string | undefined,
  fallback: string,
): number {
  const match = PATTERN.exec(value?.trim() ?? '') ?? PATTERN.exec(fallback);
  if (!match) throw new Error(`Unparseable duration: ${String(value)}`);
  return Number(match[1]) * UNITS[match[2]];
}

export function isDuration(value: string | undefined): boolean {
  return (
    value === undefined || value.trim() === '' || PATTERN.test(value.trim())
  );
}
