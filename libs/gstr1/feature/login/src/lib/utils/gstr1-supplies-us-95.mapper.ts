/** Flatten `ecom` / `ecoma` payloads for GSTR-1 section 15 — Supplies u/s 9(5). */

export type Us95RecordKind = 'Current' | 'Amended' | 'Draft';

export interface Us95B2bRow {
  readonly kind: Us95RecordKind;
  /** Present for locally added draft rows (session drafts). */
  readonly draftKey?: string;
  readonly rtin: string;
  readonly stin: string;
  readonly inum: string;
  readonly idt: string;
  readonly val: number;
  readonly pos: string;
  readonly invTyp: string;
  readonly splyTy: string;
  readonly rt: string;
  readonly txval: number;
  readonly iamt: number;
  readonly camt: number;
  readonly samt: number;
  readonly csamt: number;
  readonly origInum: string;
  readonly origIdt: string;
}

export interface Us95B2cRow {
  readonly kind: Us95RecordKind;
  readonly draftKey?: string;
  readonly stin: string;
  readonly ostin: string;
  readonly pos: string;
  readonly omon: string;
  readonly splyTy: string;
  readonly rt: string;
  readonly txval: number;
  readonly iamt: number;
  readonly camt: number;
  readonly samt: number;
  readonly csamt: number;
  readonly flag: string;
}

export interface Us95Urp2bRow {
  readonly kind: Us95RecordKind;
  readonly draftKey?: string;
  readonly rtin: string;
  readonly inum: string;
  readonly idt: string;
  readonly val: number;
  readonly pos: string;
  readonly invTyp: string;
  readonly splyTy: string;
  readonly rt: string;
  readonly txval: number;
  readonly iamt: number;
  readonly camt: number;
  readonly samt: number;
  readonly csamt: number;
  readonly origInum: string;
  readonly origIdt: string;
}

export interface Us95Urp2cRow {
  readonly kind: Us95RecordKind;
  readonly draftKey?: string;
  readonly pos: string;
  readonly omon: string;
  readonly splyTy: string;
  readonly rt: string;
  readonly txval: number;
  readonly iamt: number;
  readonly camt: number;
  readonly samt: number;
  readonly csamt: number;
  readonly flag: string;
}

function num(x: unknown): number {
  if (typeof x === 'number' && Number.isFinite(x)) {
    return x;
  }
  if (typeof x === 'string' && x.trim() !== '') {
    const n = Number.parseFloat(x);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function str(x: unknown): string {
  if (x == null) {
    return '';
  }
  return String(x);
}

function aggregateItms(itms: unknown): {
  readonly rtLabel: string;
  readonly txval: number;
  readonly iamt: number;
  readonly camt: number;
  readonly samt: number;
  readonly csamt: number;
} {
  const rates = new Set<string>();
  let txval = 0;
  let iamt = 0;
  let camt = 0;
  let samt = 0;
  let csamt = 0;
  if (!Array.isArray(itms)) {
    return { rtLabel: '—', txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 };
  }
  for (const raw of itms) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const itm = raw as Record<string, unknown>;
    const det = itm['itm_det'];
    if (!det || typeof det !== 'object') {
      continue;
    }
    const d = det as Record<string, unknown>;
    const rt = d['rt'];
    if (rt !== undefined && rt !== '') {
      rates.add(String(rt));
    }
    txval += num(d['txval']);
    iamt += num(d['iamt']);
    camt += num(d['camt']);
    samt += num(d['samt']);
    csamt += num(d['csamt']);
  }
  const rtLabel = rates.size > 0 ? [...rates].sort().join(', ') : '—';
  return { rtLabel, txval, iamt, camt, samt, csamt };
}

function asObjArray(x: unknown): Record<string, unknown>[] {
  if (!Array.isArray(x)) {
    return [];
  }
  return x.filter((v): v is Record<string, unknown> => !!v && typeof v === 'object');
}

export function mapUs95B2b(
  ecom: Record<string, unknown> | null,
  ecoma: Record<string, unknown> | null,
): Us95B2bRow[] {
  const rows: Us95B2bRow[] = [];
  for (const g of asObjArray(ecom?.['b2b'])) {
    const rtin = str(g['rtin']);
    const stin = str(g['stin']);
    for (const inv of asObjArray(g['inv'])) {
      const agg = aggregateItms(inv['itms']);
      rows.push({
        kind: 'Current',
        rtin,
        stin,
        inum: str(inv['inum']),
        idt: str(inv['idt']),
        val: num(inv['val']),
        pos: str(inv['pos']),
        invTyp: str(inv['inv_typ']),
        splyTy: str(inv['sply_ty']),
        rt: agg.rtLabel,
        txval: agg.txval,
        iamt: agg.iamt,
        camt: agg.camt,
        samt: agg.samt,
        csamt: agg.csamt,
        origInum: '',
        origIdt: '',
      });
    }
  }
  for (const g of asObjArray(ecoma?.['b2ba'])) {
    const rtin = str(g['rtin']);
    const stin = str(g['stin']);
    for (const inv of asObjArray(g['inv'])) {
      const agg = aggregateItms(inv['itms']);
      rows.push({
        kind: 'Amended',
        rtin,
        stin,
        inum: str(inv['inum']),
        idt: str(inv['idt']),
        val: num(inv['val']),
        pos: str(inv['pos']),
        invTyp: str(inv['inv_typ']),
        splyTy: str(inv['sply_ty']),
        rt: agg.rtLabel,
        txval: agg.txval,
        iamt: agg.iamt,
        camt: agg.camt,
        samt: agg.samt,
        csamt: agg.csamt,
        origInum: str(inv['oinum']),
        origIdt: str(inv['oidt']),
      });
    }
  }
  return rows;
}

export function mapUs95B2c(
  ecom: Record<string, unknown> | null,
  ecoma: Record<string, unknown> | null,
): Us95B2cRow[] {
  const rows: Us95B2cRow[] = [];
  for (const r of asObjArray(ecom?.['b2c'])) {
    rows.push({
      kind: 'Current',
      stin: str(r['stin']),
      ostin: '',
      pos: str(r['pos']),
      omon: '',
      splyTy: str(r['sply_ty']),
      rt: str(r['rt']),
      txval: num(r['txval']),
      iamt: num(r['iamt']),
      camt: num(r['camt']),
      samt: num(r['samt']),
      csamt: num(r['csamt']),
      flag: str(r['flag']),
    });
  }
  for (const blk of asObjArray(ecoma?.['b2ca'])) {
    const pos = str(blk['pos']);
    for (const pi of asObjArray(blk['posItms'])) {
      const stin = str(pi['stin']);
      const ostin = str(pi['ostin']);
      const omon = str(pi['omon']);
      const sply = str(pi['sply_ty']);
      const flag = str(pi['flag']);
      for (const line of asObjArray(pi['itms'])) {
        rows.push({
          kind: 'Amended',
          stin,
          ostin,
          pos,
          omon,
          splyTy: sply,
          rt: str(line['rt']),
          txval: num(line['txval']),
          iamt: num(line['iamt']),
          camt: num(line['camt']),
          samt: num(line['samt']),
          csamt: num(line['csamt']),
          flag,
        });
      }
    }
  }
  return rows;
}

export function mapUs95Urp2b(
  ecom: Record<string, unknown> | null,
  ecoma: Record<string, unknown> | null,
): Us95Urp2bRow[] {
  const rows: Us95Urp2bRow[] = [];
  for (const g of asObjArray(ecom?.['urp2b'])) {
    const rtin = str(g['rtin']);
    for (const inv of asObjArray(g['inv'])) {
      const agg = aggregateItms(inv['itms']);
      rows.push({
        kind: 'Current',
        rtin,
        inum: str(inv['inum']),
        idt: str(inv['idt']),
        val: num(inv['val']),
        pos: str(inv['pos']),
        invTyp: str(inv['inv_typ']),
        splyTy: str(inv['sply_ty']),
        rt: agg.rtLabel,
        txval: agg.txval,
        iamt: agg.iamt,
        camt: agg.camt,
        samt: agg.samt,
        csamt: agg.csamt,
        origInum: '',
        origIdt: '',
      });
    }
  }
  for (const g of asObjArray(ecoma?.['urp2ba'])) {
    const rtin = str(g['rtin']);
    for (const inv of asObjArray(g['inv'])) {
      const agg = aggregateItms(inv['itms']);
      rows.push({
        kind: 'Amended',
        rtin,
        inum: str(inv['inum']),
        idt: str(inv['idt']),
        val: num(inv['val']),
        pos: str(inv['pos']),
        invTyp: str(inv['inv_typ']),
        splyTy: str(inv['sply_ty']),
        rt: agg.rtLabel,
        txval: agg.txval,
        iamt: agg.iamt,
        camt: agg.camt,
        samt: agg.samt,
        csamt: agg.csamt,
        origInum: str(inv['oinum']),
        origIdt: str(inv['oidt']),
      });
    }
  }
  return rows;
}

export function mapUs95Urp2c(
  ecom: Record<string, unknown> | null,
  ecoma: Record<string, unknown> | null,
): Us95Urp2cRow[] {
  const rows: Us95Urp2cRow[] = [];
  for (const r of asObjArray(ecom?.['urp2c'])) {
    rows.push({
      kind: 'Current',
      pos: str(r['pos']),
      omon: '',
      splyTy: str(r['sply_ty']),
      rt: str(r['rt']),
      txval: num(r['txval']),
      iamt: num(r['iamt']),
      camt: num(r['camt']),
      samt: num(r['samt']),
      csamt: num(r['csamt']),
      flag: str(r['flag']),
    });
  }
  for (const blk of asObjArray(ecoma?.['urp2ca'])) {
    const pos = str(blk['pos']);
    const omon = str(blk['omon']);
    const sply = str(blk['sply_ty']);
    const flag = str(blk['flag']);
    for (const line of asObjArray(blk['itms'])) {
      rows.push({
        kind: 'Amended',
        pos,
        omon,
        splyTy: sply,
        rt: str(line['rt']),
        txval: num(line['txval']),
        iamt: num(line['iamt']),
        camt: num(line['camt']),
        samt: num(line['samt']),
        csamt: num(line['csamt']),
        flag,
      });
    }
  }
  return rows;
}
