/** Client-side B2BA validation before retsave. */
export function validateGstr1aB2baSection(section: unknown): string | null {
  if (!Array.isArray(section) || section.length === 0) {
    return 'Add at least one amended B2B record.';
  }
  for (const g of section) {
    if (!g || typeof g !== 'object') {
      return 'Invalid B2B amendment group.';
    }
    const inv = (g as Record<string, unknown>)['inv'];
    if (!Array.isArray(inv) || inv.length === 0) {
      return 'Each CTIN group must include amended invoice(s).';
    }
  }
  return null;
}
