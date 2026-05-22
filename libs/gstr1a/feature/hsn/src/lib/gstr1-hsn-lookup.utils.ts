/**
 * Lightweight HSN/SAC hint lookup for GSTR-1 HSN summary UX (offline subset + chapter fallbacks).
 * Full tariff masters live on GSTN/CBIC — extend {@link GSTR1_HSN_EXACT} as needed.
 */

export interface Gstr1HsnLookupResult {
  readonly productName: string;
  readonly description: string;
  /** Short line beside HSN (portal grey column). */
  readonly asideDescription: string;
  readonly uqc?: string;
  readonly rt?: number;
}

function asideFrom(description: string): string {
  const t = description.trim();
  if (t.length <= 96) {
    return t;
  }
  return `${t.slice(0, 93)}…`;
}

function row(
  productName: string,
  description: string,
  opts?: { uqc?: string; rt?: number; asideDescription?: string },
): Gstr1HsnLookupResult {
  return {
    productName,
    description,
    asideDescription: opts?.asideDescription ?? asideFrom(description),
    uqc: opts?.uqc,
    rt: opts?.rt,
  };
}

/** Digit / alphanumeric keys — normalized upper-case, spaces stripped. */
export const GSTR1_HSN_EXACT: Readonly<Record<string, Gstr1HsnLookupResult>> = {
  '1010': row(
    'Live horses & allied animals',
    'Live horses, asses, mules and hinnies — other than pure-bred breeding animals',
    { uqc: 'NOS', rt: 0 },
  ),
  '1006': row(
    'Rice',
    'Rice in husk (paddy or rough), husked (brown) rice, milled rice whether or not polished or glazed',
    { uqc: 'KGS', rt: 5 },
  ),
  '0901': row(
    'Coffee',
    'Coffee, whether or not roasted or decaffeinated; coffee husks and skins; coffee substitutes containing coffee',
    { uqc: 'KGS', rt: 5 },
  ),
  '2710': row(
    'Petroleum oils',
    'Petroleum oils and oils obtained from bituminous minerals (other than crude); preparations containing ≥70% petroleum oils',
    { uqc: 'LTR', rt: 18 },
  ),
  '3004': row(
    'Medicaments',
    'Medicaments (excluding goods of heading 3002, 3005 or 3006) consisting of mixed/unmixed products for therapeutic uses',
    { uqc: 'PCS', rt: 12 },
  ),
  '8471': row(
    'Computers & peripherals',
    'Automatic data processing machines and units thereof; magnetic/optical readers, machines for transcribing data',
    { uqc: 'PCS', rt: 18 },
  ),
  '8517': row(
    'Telephones & network gear',
    'Telephone sets including smartphones and other telephonic apparatus for transmission/reception of voice/images/data',
    { uqc: 'PCS', rt: 18 },
  ),
  '8703': row(
    'Motor cars',
    'Motor cars and other motor vehicles principally designed for transport of persons (other than buses)',
    { uqc: 'NOS', rt: 28 },
  ),
  '4901': row(
    'Printed books',
    'Printed books, brochures, leaflets and similar printed matter, whether or not in single sheets',
    { uqc: 'PCS', rt: 0 },
  ),
  '6203': row(
    "Men's suits & garments",
    "Men's/boys' suits, ensembles, jackets, blazers, trousers, bib/brace overalls, breeches and shorts",
    { uqc: 'PCS', rt: 5 },
  ),
  '7218': row(
    'Stainless steel bars',
    'Stainless steel angles, shapes and sections; stainless steel bars and rods',
    { uqc: 'KGS', rt: 18 },
  ),
  '7323': row(
    'Iron & steel tableware',
    'TABLE, KITCHEN OR OTHER HOUSEHOLD ARTICLES OF IRON/STEEL; IRON/STEEL WOOL; POT SCOURERS',
    { uqc: 'PCS', rt: 18 },
  ),
  '998313': row(
    'IT design & development',
    'Information technology (IT) consulting and software development services — except packaged software supply',
    { uqc: 'NA', rt: 18 },
  ),
  '998314': row(
    'Hosting & infra services',
    'Hosting and information technology infrastructure provisioning services including cloud computing services',
    { uqc: 'NA', rt: 18 },
  ),
  '998391': row(
    'Technical consulting',
    'Management consulting and management services including financial, strategic, human resources, marketing, operations',
    { uqc: 'NA', rt: 18 },
  ),
  '995411': row(
    'Construction commercial',
    'Construction services in respect of commercial/industrial buildings (composite supply)',
    { uqc: 'NA', rt: 18 },
  ),
};

const CHAPTER_GENERIC: Readonly<Record<string, Gstr1HsnLookupResult>> = (() => {
  const o: Record<string, Gstr1HsnLookupResult> = {};
  for (let i = 1; i <= 99; i++) {
    const k = String(i).padStart(2, '0');
    o[k] = row(
      `Chapter ${k} goods`,
      `Goods classified primarily under HSN chapter ${k}. Confirm exact 6-/8-digit tariff heading against GST notifications before filing.`,
      { uqc: 'PCS', asideDescription: `Chapter ${k} — verify 6-/8-digit HSN & rate in notifications.` },
    );
  }
  return o;
})();

export function normalizeHsnCode(raw: string): string {
  return raw.replace(/\s/g, '').toUpperCase();
}

export function lookupGstr1Hsn(codeRaw: string): Gstr1HsnLookupResult | null {
  const code = normalizeHsnCode(codeRaw);
  if (code.length < 2) {
    return null;
  }

  const direct = GSTR1_HSN_EXACT[code];
  if (direct) {
    return direct;
  }

  const digitsOnly = code.replace(/\D/g, '');
  if (digitsOnly.length >= 2) {
    for (let len = Math.min(10, digitsOnly.length); len >= 2; len--) {
      const sub = digitsOnly.slice(0, len);
      const hit = GSTR1_HSN_EXACT[sub];
      if (hit) {
        return hit;
      }
    }
    const chapter = digitsOnly.slice(0, 2);
    const chHit = CHAPTER_GENERIC[chapter];
    if (chHit) {
      return chHit;
    }
  }

  const alnum = code.replace(/[^0-9A-Z]/g, '');
  if (alnum.length >= 4) {
    for (let len = Math.min(alnum.length, 10); len >= 4; len--) {
      const sub = alnum.slice(0, len);
      const hit = GSTR1_HSN_EXACT[sub];
      if (hit) {
        return hit;
      }
    }
  }

  return null;
}
