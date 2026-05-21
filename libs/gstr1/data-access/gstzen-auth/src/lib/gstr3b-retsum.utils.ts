import type {
  Gstr3bAutoliabBundle,
  Gstr3bAutoliabMeta,
  Gstr3bExemptAmounts,
  Gstr3bInterStateAmounts,
  Gstr3bPaymentAmounts,
  Gstr3bRetsaveFormState,
  Gstr3bRetsaveItcTaxOnly,
  Gstr3bSupDetails,
  Gstr3bTaxAmounts,
} from './gstr3b.models';
import {
  gstr2AsRecord,
  gstr2CoercePayloadRoot,
  gstr2LogicalError,
  gstr2MessageRecord,
  gstr2ParseJsonLike,
  gstr2StatusIndicatesSuccess,
} from './gstr2-response.utils';
import {
  emptyGstr3bRetsaveFormState,
  fullTaxLine,
  interRows,
  inwardRow,
  itcRowsFromAutoliab,
  itcTaxOnly,
  numGstr3b,
  txvalLine,
  zeroRatedLine,
} from './gstr3b-retsave.utils';

function num(v: unknown): number {
  return numGstr3b(v);
}

function taxAmounts(iamt: number, camt: number, samt: number, csamt: number): Gstr3bTaxAmounts {
  return {
    igst: iamt.toFixed(2),
    cgst: camt.toFixed(2),
    sgst: samt.toFixed(2),
    cess: csamt.toFixed(2),
  };
}

function sumTaxLines(
  lines: readonly Gstr3bRetsaveItcTaxOnly[],
): Gstr3bTaxAmounts {
  const totals = lines.reduce(
    (acc, line) => ({
      iamt: acc.iamt + line.iamt,
      camt: acc.camt + line.camt,
      samt: acc.samt + line.samt,
      csamt: acc.csamt + line.csamt,
    }),
    { iamt: 0, camt: 0, samt: 0, csamt: 0 },
  );
  return taxAmounts(totals.iamt, totals.camt, totals.samt, totals.csamt);
}

/** Extract `message.data` (or parsed `data_json_string`) from GSTR-3B retsum. */
export function extractGstr3bRetsumData(payload: unknown): Record<string, unknown> | undefined {
  const root = gstr2CoercePayloadRoot(payload);
  const msg = root ? gstr2MessageRecord(root) : undefined;
  const data = gstr2AsRecord(msg?.['data']);
  if (data) {
    return data;
  }
  const jsonStr = msg?.['data_json_string'];
  if (typeof jsonStr === 'string' && jsonStr.trim()) {
    const parsed = gstr2ParseJsonLike(jsonStr);
    return gstr2AsRecord(parsed);
  }
  return undefined;
}

export function isGstr3bRetsumSuccessEnvelope(payload: unknown): boolean {
  const root = gstr2CoercePayloadRoot(payload);
  if (!root || !gstr2StatusIndicatesSuccess(root)) {
    return false;
  }
  return !!extractGstr3bRetsumData(payload);
}

export function gstr3bRetsumLogicalError(payload: unknown): string | null {
  if (isGstr3bRetsumSuccessEnvelope(payload)) {
    return null;
  }
  return gstr2LogicalError(payload, 'GSTR-3B retsum');
}

function parseSupDetailsFromRetsum(sup: Record<string, unknown> | undefined): Gstr3bSupDetails {
  return {
    osup_det: fullTaxLine(gstr2AsRecord(sup?.['osup_det'])),
    osup_zero: zeroRatedLine(gstr2AsRecord(sup?.['osup_zero'])),
    osup_nil_exmp: txvalLine(gstr2AsRecord(sup?.['osup_nil_exmp'])),
    isup_rev: fullTaxLine(gstr2AsRecord(sup?.['isup_rev'])),
    osup_nongst: txvalLine(gstr2AsRecord(sup?.['osup_nongst'])),
  };
}

function parseItcElgFromRetsum(itc: Record<string, unknown> | undefined): Gstr3bRetsaveFormState['itc_elg'] {
  if (!itc) {
    return emptyGstr3bRetsaveFormState().itc_elg;
  }
  const avlTypes = ['IMPG', 'IMPS', 'ISRC', 'ISD', 'OTH'] as const;
  const revTypes = ['RUL', 'OTH'] as const;
  return {
    itc_avl: itcRowsFromAutoliab(itc['itc_avl'], avlTypes),
    itc_rev: itcRowsFromAutoliab(itc['itc_rev'], revTypes),
    itc_net: itcTaxOnly(gstr2AsRecord(itc['itc_net'])),
    itc_inelg: itcRowsFromAutoliab(itc['itc_inelg'], revTypes),
  };
}

function paymentFromRetsum(txPmt: Record<string, unknown> | undefined): Gstr3bPaymentAmounts {
  if (!txPmt) {
    return { balanceLiability: '0.00', paidThroughCash: '0.00', paidThroughCredit: '0.00' };
  }

  let paidCash = 0;
  const pdcash = txPmt['pdcash'];
  if (Array.isArray(pdcash)) {
    for (const row of pdcash) {
      const rec = gstr2AsRecord(row);
      if (!rec) {
        continue;
      }
      paidCash +=
        num(rec['ipd']) +
        num(rec['cpd']) +
        num(rec['spd']) +
        num(rec['cspd']) +
        num(rec['i_intrpd']) +
        num(rec['c_intrpd']) +
        num(rec['s_intrpd']) +
        num(rec['cs_intrpd']);
    }
  }

  let paidCredit = 0;
  const pditc = gstr2AsRecord(txPmt['pditc']);
  if (pditc) {
    paidCredit =
      num(pditc['i_pdi']) +
      num(pditc['i_pdc']) +
      num(pditc['i_pds']) +
      num(pditc['c_pdi']) +
      num(pditc['c_pdc']) +
      num(pditc['s_pdi']) +
      num(pditc['s_pds']) +
      num(pditc['cs_pdcs']);
  }

  return {
    balanceLiability: '0.00',
    paidThroughCash: paidCash.toFixed(2),
    paidThroughCredit: paidCredit.toFixed(2),
  };
}

/** Map retsum `message.data` into the retsave form shape. */
export function parseGstr3bRetsaveFromRetsumData(
  data: Record<string, unknown>,
): Gstr3bRetsaveFormState {
  const sup = gstr2AsRecord(data['sup_details']);
  const inter = gstr2AsRecord(data['inter_sup']);
  const eco = gstr2AsRecord(data['eco_dtls']);
  const itc = gstr2AsRecord(data['itc_elg']);
  const inward = gstr2AsRecord(data['inward_sup']);
  const intr = gstr2AsRecord(data['intr_ltfee']);

  return {
    sup_details: parseSupDetailsFromRetsum(sup),
    inter_sup: {
      unreg_details: interRows(inter?.['unreg_details']),
      comp_details: interRows(inter?.['comp_details']),
      uin_details: interRows(inter?.['uin_details']),
    },
    eco_dtls: {
      eco_sup: fullTaxLine(gstr2AsRecord(eco?.['eco_sup'])),
      eco_reg_sup: txvalLine(gstr2AsRecord(eco?.['eco_reg_sup'])),
    },
    itc_elg: parseItcElgFromRetsum(itc),
    inward_sup: {
      isup_details: Array.isArray(inward?.['isup_details'])
        ? (inward['isup_details'] as unknown[])
            .map((r) => gstr2AsRecord(r))
            .filter((r): r is Record<string, unknown> => !!r)
            .map((r) => inwardRow(r, String(r['ty'] ?? '').trim().toUpperCase()))
        : emptyGstr3bRetsaveFormState().inward_sup.isup_details,
    },
    intr_ltfee: {
      intr_details: itcTaxOnly(gstr2AsRecord(intr?.['intr_details'])),
    },
  };
}

export function parseGstr3bRetsaveFromRetsum(payload: unknown): Gstr3bRetsaveFormState | null {
  const data = extractGstr3bRetsumData(payload);
  if (!data) {
    return null;
  }
  return parseGstr3bRetsaveFromRetsumData(data);
}

/** Card summary totals for the GSTR-3B dashboard from retsum. */
export function parseGstr3bBundleFromRetsum(payload: unknown): Gstr3bAutoliabBundle | null {
  const data = extractGstr3bRetsumData(payload);
  if (!data) {
    return null;
  }

  const form = parseGstr3bRetsaveFromRetsumData(data);
  const sup = form.sup_details;
  const interRowsAll = [
    ...form.inter_sup.unreg_details,
    ...form.inter_sup.comp_details,
    ...form.inter_sup.uin_details,
  ];

  const meta: Gstr3bAutoliabMeta = {
    gstin: String(data['gstin'] ?? '').trim().toUpperCase(),
    returnPeriod: String(data['ret_period'] ?? '').trim(),
    r1FileDate: '',
    r2bGenDate: '',
    r3bGenDate: '',
  };

  const table32: Gstr3bInterStateAmounts = {
    taxableValue: interRowsAll.reduce((s, r) => s + r.txval, 0).toFixed(2),
    igst: interRowsAll.reduce((s, r) => s + r.iamt, 0).toFixed(2),
  };

  const inward = form.inward_sup.isup_details;
  const table5: Gstr3bExemptAmounts =
    inward.length > 0
      ? {
          interState: inward.reduce((s, r) => s + r.inter, 0).toFixed(2),
          intraState: inward.reduce((s, r) => s + r.intra, 0).toFixed(2),
        }
      : { interState: '0.00', intraState: '0.00' };

  return {
    meta,
    table31: sumTaxLines([sup.osup_det, sup.isup_rev]),
    table311: sumTaxLines([form.eco_dtls.eco_sup]),
    table32,
    table4: taxAmounts(
      form.itc_elg.itc_net.iamt,
      form.itc_elg.itc_net.camt,
      form.itc_elg.itc_net.samt,
      form.itc_elg.itc_net.csamt,
    ),
    table5,
    table51: taxAmounts(
      form.intr_ltfee.intr_details.iamt,
      form.intr_ltfee.intr_details.camt,
      form.intr_ltfee.intr_details.samt,
      form.intr_ltfee.intr_details.csamt,
    ),
    table61: paymentFromRetsum(gstr2AsRecord(data['tx_pmt'])),
  };
}
