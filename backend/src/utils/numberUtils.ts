export function parseDecimalString(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  const parsed = parseFloat(value.toString());
  if (isNaN(parsed)) {
    console.warn(`[NumberUtils] Invalid decimal string: ${value}. Returning 0.`);
    return 0;
  }
  return parsed;
}
