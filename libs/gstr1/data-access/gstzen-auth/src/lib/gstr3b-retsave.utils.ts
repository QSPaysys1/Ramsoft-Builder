import type {
  Gstr3bRetsaveFormState,
  Gstr3bRetsaveFullTaxLine,
  Gstr3bRetsaveInterSupRow,
  Gstr3bRetsaveItcRow,
  Gstr3bRetsaveItcTaxOnly,
  Gstr3bRetsaveInwardSupRow,
  Gstr3bRetsaveRequestBody,
  Gstr3bRetsaveTxvalLine,
  Gstr3bRetsaveZeroRatedLine,
  Gstr3bSupDetails,
  Gstr3bEcoDetails,
} from './gstr3b.models';
import {
  gstr2AsRecord,
  gstr2CoercePayloadRoot,
  gstr2LogicalError,
  gstr2StatusIndicatesSuccess,
} from './gstr2-response.utils';
import { extractLiabitc } from './gstr3b-payload.utils';

export function numGstr3b(v: unknown): number {
  if (v === null || v === undefined || v === '') {
    return 0;
  }
  const n =
    typeof v === 'number'
      ? v
      : Number.parseFloat(typeof v === 'string' ? v.trim().replace(/,/g, '') : String(v));
  return Number.isFinite(n) ? n : 0;
}

function num(v: unknown): number {
  return numGstr3b(v);
}

function unwrapAutoliabSection(section: unknown): Record<string, unknown> | undefined {
  const sec = gstr2AsRecord(section);
  if (!sec) {
    return undefined;
  }
  if (
    sec['txval'] !== undefined ||
    sec['iamt'] !== undefined ||
    sec['igst'] !== undefined ||
    sec['camt'] !== undefined
  ) {
    return sec;
  }
  return gstr2AsRecord(sec['subtotal']) ?? sec;
}

function childSection(
  parent: Record<string, unknown> | undefined,
  ...keys: readonly string[]
): Record<string, unknown> | undefined {
  if (!parent) {
    return undefined;
  }
  for (const key of keys) {
    const unwrapped = unwrapAutoliabSection(parent[key]);
    if (unwrapped) {
      return unwrapped;
    }
  }
  return undefined;
}

export function fullTaxLine(raw: Record<string, unknown> | undefined): Gstr3bRetsaveFullTaxLine {
  return {
    txval: num(raw?.['txval']),
    iamt: num(raw?.['iamt'] ?? raw?.['igst']),
    camt: num(raw?.['camt'] ?? raw?.['cgst']),
    samt: num(raw?.['samt'] ?? raw?.['sgst']),
    csamt: num(raw?.['csamt'] ?? raw?.['cess']),
  };
}

export function zeroRatedLine(raw: Record<string, unknown> | undefined): Gstr3bRetsaveZeroRatedLine {
  return {
    txval: num(raw?.['txval']),
    iamt: num(raw?.['iamt'] ?? raw?.['igst']),
    csamt: num(raw?.['csamt'] ?? raw?.['cess']),
  };
}

export function txvalLine(raw: Record<string, unknown> | undefined): Gstr3bRetsaveTxvalLine {
  return { txval: num(raw?.['txval']) };
}

export function itcTaxOnly(raw: Record<string, unknown> | undefined): Gstr3bRetsaveItcTaxOnly {
  return {
    iamt: num(raw?.['iamt'] ?? raw?.['igst']),
    camt: num(raw?.['camt'] ?? raw?.['cgst']),
    samt: num(raw?.['samt'] ?? raw?.['sgst']),
    csamt: num(raw?.['csamt'] ?? raw?.['cess']),
  };
}

export function itcRow(raw: Record<string, unknown>, ty: string): Gstr3bRetsaveItcRow {
  return { ty, ...itcTaxOnly(raw) };
}

export function interRow(raw: Record<string, unknown>): Gstr3bRetsaveInterSupRow {
  return {
    pos: String(raw['pos'] ?? '').trim().padStart(2, '0').slice(-2),
    txval: num(raw['txval']),
    iamt: num(raw['iamt'] ?? raw['igst']),
  };
}

export function inwardRow(raw: Record<string, unknown>, ty: string): Gstr3bRetsaveInwardSupRow {
  return {
    ty,
    inter: num(raw['inter'] ?? raw['inter_state']),
    intra: num(raw['intra'] ?? raw['intra_state']),
  };
}

export function interRows(raw: unknown): Gstr3bRetsaveInterSupRow[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((r) => gstr2AsRecord(r))
    .filter((r): r is Record<string, unknown> => !!r)
    .map(interRow);
}

function interRowsFromAutoliab(raw: unknown): Gstr3bRetsaveInterSupRow[] {
  if (Array.isArray(raw)) {
    return interRows(raw);
  }
  const sec = gstr2AsRecord(raw);
  if (!sec) {
    return [];
  }
  const details = sec['details'] ?? sec['subtotal'];
  if (Array.isArray(details)) {
    return interRows(details);
  }
  const row = unwrapAutoliabSection(details);
  return row ? [interRow(row)] : [];
}

export function itcRowsFromAutoliab(raw: unknown, types: readonly string[]): Gstr3bRetsaveItcRow[] {
  if (Array.isArray(raw)) {
    return raw
      .map((r) => gstr2AsRecord(r))
      .filter((r): r is Record<string, unknown> => !!r)
      .map((r) => itcRow(r, String(r['ty'] ?? '').trim().toUpperCase()));
  }
  const container = gstr2AsRecord(raw);
  if (!container) {
    return types.map((ty) => itcRow({}, ty));
  }
  return types.map((ty) => {
    const sec =
      container[ty] ?? container[ty.toLowerCase()] ?? container[ty.toUpperCase()];
    return itcRow(unwrapAutoliabSection(sec) ?? {}, ty);
  });
}

export function emptyGstr3bSupDetails(): Gstr3bSupDetails {
  const zeroFull: Gstr3bRetsaveFullTaxLine = {
    txval: 0,
    iamt: 0,
    camt: 0,
    samt: 0,
    csamt: 0,
  };
  return {
    osup_det: { ...zeroFull },
    osup_zero: { txval: 0, iamt: 0, csamt: 0 },
    osup_nil_exmp: { txval: 0 },
    isup_rev: { ...zeroFull },
    osup_nongst: { txval: 0 },
  };
}

export function emptyGstr3bEcoDetails(): Gstr3bEcoDetails {
  const zeroFull: Gstr3bRetsaveFullTaxLine = {
    txval: 0,
    iamt: 0,
    camt: 0,
    samt: 0,
    csamt: 0,
  };
  return {
    eco_sup: { ...zeroFull },
    eco_reg_sup: { txval: 0 },
  };
}

export function emptyGstr3bRetsaveFormState(): Gstr3bRetsaveFormState {
  const zeroItc: Gstr3bRetsaveItcTaxOnly = { iamt: 0, camt: 0, samt: 0, csamt: 0 };

  return {
    sup_details: emptyGstr3bSupDetails(),
    inter_sup: { unreg_details: [], comp_details: [], uin_details: [] },
    eco_dtls: emptyGstr3bEcoDetails(),
    itc_elg: {
      itc_avl: ['IMPG', 'IMPS', 'ISRC', 'ISD', 'OTH'].map((ty) => ({ ty, ...zeroItc })),
      itc_rev: ['RUL', 'OTH'].map((ty) => ({ ty, ...zeroItc })),
      itc_net: { ...zeroItc },
      itc_inelg: ['RUL', 'OTH'].map((ty) => ({ ty, ...zeroItc })),
    },
    inward_sup: {
      isup_details: [
        { ty: 'GST', inter: 0, intra: 0 },
        { ty: 'NONGST', inter: 0, intra: 0 },
      ],
    },
    intr_ltfee: { intr_details: { ...zeroItc } },
  };
}

function parseSupDetailsFromAutoliab(
  sup: Record<string, unknown> | undefined,
): Gstr3bSupDetails {
  const s31a = gstr2AsRecord(sup?.['osup_3_1a']);
  const source = s31a ?? sup;
  return {
    osup_det: fullTaxLine(childSection(source, 'osup_det', 'OSUP_DET')),
    osup_zero: zeroRatedLine(childSection(source, 'osup_zero', 'OSUP_ZERO')),
    osup_nil_exmp: txvalLine(childSection(source, 'osup_nil_exmp', 'OSUP_NIL_EXMP')),
    isup_rev: fullTaxLine(childSection(source, 'isup_rev', 'ISUP_REV')),
    osup_nongst: txvalLine(childSection(source, 'osup_nongst', 'OSUP_NONGST')),
  };
}

function parseItcElgFromAutoliab(liabitc: Record<string, unknown>): Gstr3bRetsaveFormState['itc_elg'] {
  const itc = gstr2AsRecord(liabitc['itc_elg'] ?? liabitc['elgitc']);
  if (!itc) {
    return emptyGstr3bRetsaveFormState().itc_elg;
  }
  const avlTypes = ['IMPG', 'IMPS', 'ISRC', 'ISD', 'OTH'] as const;
  const revTypes = ['RUL', 'OTH'] as const;
  return {
    itc_avl: itcRowsFromAutoliab(itc['itc_avl'] ?? itc['itcavl'] ?? itc, avlTypes),
    itc_rev: itcRowsFromAutoliab(itc['itc_rev'] ?? itc['itcrev'] ?? itc, revTypes),
    itc_net: itcTaxOnly(unwrapAutoliabSection(itc['itc_net'] ?? itc['itcnet'])),
    itc_inelg: itcRowsFromAutoliab(itc['itc_inelg'] ?? itc['itcinelg'] ?? itc, revTypes),
  };
}

export function computeGstr3bItcNet(state: Gstr3bRetsaveFormState): Gstr3bRetsaveItcTaxOnly {
  const sum = (rows: readonly Gstr3bRetsaveItcRow[]) =>
    rows.reduce(
      (acc, row) => ({
        iamt: acc.iamt + row.iamt,
        camt: acc.camt + row.camt,
        samt: acc.samt + row.samt,
        csamt: acc.csamt + row.csamt,
      }),
      { iamt: 0, camt: 0, samt: 0, csamt: 0 },
    );
  const avl = sum(state.itc_elg.itc_avl);
  const rev = sum(state.itc_elg.itc_rev);
  return {
    iamt: avl.iamt - rev.iamt,
    camt: avl.camt - rev.camt,
    samt: avl.samt - rev.samt,
    csamt: avl.csamt - rev.csamt,
  };
}

export function withComputedItcNet(state: Gstr3bRetsaveFormState): Gstr3bRetsaveFormState {
  return {
    ...state,
    itc_elg: { ...state.itc_elg, itc_net: computeGstr3bItcNet(state) },
  };
}

export function parseGstr3bRetsaveFromAutoliab(payload: unknown): Gstr3bRetsaveFormState {
  const liabitc = extractLiabitc(payload);
  if (!liabitc) {
    return emptyGstr3bRetsaveFormState();
  }

  const sup = gstr2AsRecord(liabitc['sup_details']);
  const inter = gstr2AsRecord(liabitc['inter_sup']);
  const inward = gstr2AsRecord(liabitc['inward_sup']);
  const intr = gstr2AsRecord(liabitc['intr_ltfee']);
  const eco = gstr2AsRecord(liabitc['eco_dtls']);
  const s31b = gstr2AsRecord(sup?.['osup_3_1b']);
  const ecoSource = eco ?? s31b;

  return withComputedItcNet({
    sup_details: parseSupDetailsFromAutoliab(sup),
    inter_sup: {
      unreg_details: interRowsFromAutoliab(inter?.['unreg_details']),
      comp_details: interRowsFromAutoliab(inter?.['comp_details']),
      uin_details: interRowsFromAutoliab(inter?.['uin_details']),
    },
    eco_dtls: {
      eco_sup: fullTaxLine(childSection(ecoSource, 'eco_sup', 'ECO_SUP')),
      eco_reg_sup: txvalLine(childSection(ecoSource, 'eco_reg_sup', 'ECO_REG_SUP')),
    },
    itc_elg: parseItcElgFromAutoliab(liabitc),
    inward_sup: {
      isup_details: Array.isArray(inward?.['isup_details'])
        ? (inward['isup_details'] as unknown[])
            .map((r) => gstr2AsRecord(r))
            .filter((r): r is Record<string, unknown> => !!r)
            .map((r) => inwardRow(r, String(r['ty'] ?? '').trim().toUpperCase()))
        : [
            inwardRow(unwrapAutoliabSection(inward?.['GST']) ?? {}, 'GST'),
            inwardRow(unwrapAutoliabSection(inward?.['NONGST']) ?? {}, 'NONGST'),
          ],
    },
    intr_ltfee: {
      intr_details: itcTaxOnly(unwrapAutoliabSection(intr?.['intr_details'] ?? intr?.['intr'])),
    },
  });
}

export function buildGstr3bRetsavePayload(
  gstin: string,
  ret_period: string,
  state: Gstr3bRetsaveFormState,
): Gstr3bRetsaveRequestBody {
  return {
    gstin: gstin.trim().toUpperCase(),
    ret_period: ret_period.trim(),
    ...withComputedItcNet(state),
  };
}

export function gstr3bRetsaveLogicalError(payload: unknown): string | null {
  const root = gstr2CoercePayloadRoot(payload);
  if (!root) {
    return 'GSTR-3B retsave: empty response';
  }
  if (gstr2StatusIndicatesSuccess(root)) {
    return null;
  }
  return gstr2LogicalError(payload, 'GSTR-3B retsave');
}
