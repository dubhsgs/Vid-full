export function normalizeActivationCode(rawCode: string): string {
  const trimmed = rawCode.trim().toUpperCase();
  const compact = trimmed.replace(/[^A-Z0-9]/g, '');

  if (compact.startsWith('VAID') && compact.length === 16) {
    return `VAID-${compact.slice(4, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}`;
  }

  return trimmed;
}
