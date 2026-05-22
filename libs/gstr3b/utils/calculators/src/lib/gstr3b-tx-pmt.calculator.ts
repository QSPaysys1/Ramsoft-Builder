import type {
  Gstr3bCreditLedgerBalance,
  Gstr3bItcElg,
  Gstr3bNetTaxPayRow,
  Gstr3bPaymentGridRow,
  Gstr3bPaymentTaxKey,
  Gstr3bRetsavePdcashRow,
  Gstr3bRetsavePditc,
  Gstr3bTaxPayComponent,
  Gstr3bTxPmt,
} from '@ramsoft-builder/gstr3b/models/entities';
import { gstr2AsRecord } from '@ramsoft-builder/gstr3b/utils/helpers';
import {
  GSTR3B_TX_PMT_NON_RC,
  GSTR3B_TX_PMT_RC,
} from '@ramsoft-builder/gstr3b/utils/constants';

export { GSTR3B_TX_PMT_NON_RC, GSTR3B_TX_PMT_RC };

function num(v: unknown): number {
  if (v === null || v === undefined || v === '') {
    return 0;
  }
  const n =
    typeof v === 'number'
      ? v
      : Number.parseFloat(typeof v === 'string' ? v.trim().replace(/,/g, '') : String(v));
  return Number.isFinite(n) ? n : 0;
}

function parseTaxComponent(raw: Record<string, unknown> | undefined): Gstr3bTaxPayComponent {
  if (!raw) {
    return { tx: 0, intr: 0, fee: 0 };
  }
  return {
    tx: num(raw['tx']),
    intr: num(raw['intr']),
    fee: num(raw['fee']),
  };
}

export function parseGstr3bNetTaxPayRow(raw: Record<string, unknown>): Gstr3bNetTaxPayRow {
  return {
    liab_ldg_id: num(raw['liab_ldg_id']),
    tran_desc: String(raw['tran_desc'] ?? '').trim(),
    trans_typ: num(raw['trans_typ']),
    igst: parseTaxComponent(gstr2AsRecord(raw['igst'])),
    cgst: parseTaxComponent(gstr2AsRecord(raw['cgst'])),
    sgst: parseTaxComponent(gstr2AsRecord(raw['sgst'])),
    cess: parseTaxComponent(gstr2AsRecord(raw['cess'])),
  };
}

export function emptyGstr3bPdcashRow(trans_typ = GSTR3B_TX_PMT_NON_RC): Gstr3bRetsavePdcashRow {
  return {
    liab_ldg_id: 0,
    trans_typ,
    ipd: 0,
    cpd: 0,
    spd: 0,
    cspd: 0,
    i_intrpd: 0,
    c_intrpd: 0,
    s_intrpd: 0,
    cs_intrpd: 0,
    i_lfeepd: 0,
    c_lfeepd: 0,
    s_lfeepd: 0,
    cs_lfeepd: 0,
  };
}

export function emptyGstr3bPditc(): Gstr3bRetsavePditc {
  return {
    liab_ldg_id: 0,
    trans_typ: GSTR3B_TX_PMT_NON_RC,
    i_pdi: 0,
    i_pdc: 0,
    i_pds: 0,
    c_pdi: 0,
    c_pdc: 0,
    s_pdi: 0,
    s_pds: 0,
    cs_pdcs: 0,
  };
}

export function emptyGstr3bTxPmt(): Gstr3bTxPmt {
  return {
    pditc: emptyGstr3bPditc(),
    pdcash: [emptyGstr3bPdcashRow(GSTR3B_TX_PMT_NON_RC), emptyGstr3bPdcashRow(GSTR3B_TX_PMT_RC)],
    net_tax_pay: [],
  };
}

function parsePditc(raw: Record<string, unknown> | undefined): Gstr3bRetsavePditc {
  if (!raw) {
    return emptyGstr3bPditc();
  }
  return {
    liab_ldg_id: num(raw['liab_ldg_id']),
    trans_typ: num(raw['trans_typ']) || GSTR3B_TX_PMT_NON_RC,
    i_pdi: num(raw['i_pdi']),
    i_pdc: num(raw['i_pdc']),
    i_pds: num(raw['i_pds']),
    c_pdi: num(raw['c_pdi']),
    c_pdc: num(raw['c_pdc']),
    s_pdi: num(raw['s_pdi']),
    s_pds: num(raw['s_pds']),
    cs_pdcs: num(raw['cs_pdcs']),
  };
}

function parsePdcashRow(raw: Record<string, unknown>): Gstr3bRetsavePdcashRow {
  return {
    liab_ldg_id: num(raw['liab_ldg_id']),
    trans_typ: num(raw['trans_typ']) || GSTR3B_TX_PMT_NON_RC,
    ipd: num(raw['ipd']),
    cpd: num(raw['cpd']),
    spd: num(raw['spd']),
    cspd: num(raw['cspd']),
    i_intrpd: num(raw['i_intrpd']),
    c_intrpd: num(raw['c_intrpd']),
    s_intrpd: num(raw['s_intrpd']),
    cs_intrpd: num(raw['cs_intrpd']),
    i_lfeepd: num(raw['i_lfeepd']),
    c_lfeepd: num(raw['c_lfeepd']),
    s_lfeepd: num(raw['s_lfeepd']),
    cs_lfeepd: num(raw['cs_lfeepd']),
  };
}

export function normalizeGstr3bPdcash(rows: Gstr3bRetsavePdcashRow[]): Gstr3bRetsavePdcashRow[] {
  const byTyp = new Map<number, Gstr3bRetsavePdcashRow>();
  for (const row of rows) {
    byTyp.set(row.trans_typ, row);
  }
  return [
    byTyp.get(GSTR3B_TX_PMT_NON_RC) ?? emptyGstr3bPdcashRow(GSTR3B_TX_PMT_NON_RC),
    byTyp.get(GSTR3B_TX_PMT_RC) ?? emptyGstr3bPdcashRow(GSTR3B_TX_PMT_RC),
  ];
}

export function findGstr3bNetTaxPayByTyp(
  rows: Gstr3bNetTaxPayRow[],
  transTyp: number,
): Gstr3bNetTaxPayRow | undefined {
  return rows.find((row) => row.trans_typ === transTyp);
}

export function findGstr3bPdcashByTyp(
  rows: Gstr3bRetsavePdcashRow[],
  transTyp: number,
): Gstr3bRetsavePdcashRow | undefined {
  return rows.find((row) => row.trans_typ === transTyp);
}

function taxComponentForKey(
  row: Gstr3bNetTaxPayRow | undefined,
  key: Gstr3bPaymentTaxKey,
): Gstr3bTaxPayComponent {
  if (!row) {
    return { tx: 0, intr: 0, fee: 0 };
  }
  return row[key];
}

function cashFieldForKey(
  row: Gstr3bRetsavePdcashRow | undefined,
  key: Gstr3bPaymentTaxKey,
): number {
  if (!row) {
    return 0;
  }
  switch (key) {
    case 'igst':
      return row.ipd;
    case 'cgst':
      return row.cpd;
    case 'sgst':
      return row.spd;
    case 'cess':
      return row.cspd;
  }
}

function intrCashForKey(
  row: Gstr3bRetsavePdcashRow | undefined,
  key: Gstr3bPaymentTaxKey,
): number {
  if (!row) {
    return 0;
  }
  switch (key) {
    case 'igst':
      return row.i_intrpd;
    case 'cgst':
      return row.c_intrpd;
    case 'sgst':
      return row.s_intrpd;
    case 'cess':
      return row.cs_intrpd;
  }
}

function feeCashForKey(
  row: Gstr3bRetsavePdcashRow | undefined,
  key: Gstr3bPaymentTaxKey,
): number {
  if (!row) {
    return 0;
  }
  switch (key) {
    case 'igst':
      return row.i_lfeepd;
    case 'cgst':
      return row.c_lfeepd;
    case 'sgst':
      return row.s_lfeepd;
    case 'cess':
      return row.cs_lfeepd;
  }
}

export function buildGstr3bPaymentGrid(txPmt: Gstr3bTxPmt): Gstr3bPaymentGridRow[] {
  const nonRc = findGstr3bNetTaxPayByTyp(txPmt.net_tax_pay, GSTR3B_TX_PMT_NON_RC);
  const rc = findGstr3bNetTaxPayByTyp(txPmt.net_tax_pay, GSTR3B_TX_PMT_RC);
  const cashNonRc = findGstr3bPdcashByTyp(txPmt.pdcash, GSTR3B_TX_PMT_NON_RC);
  const cashRc = findGstr3bPdcashByTyp(txPmt.pdcash, GSTR3B_TX_PMT_RC);
  const pditc = txPmt.pditc;

  const rows: Array<{
    key: Gstr3bPaymentTaxKey;
    label: string;
    itcIgst: number;
    itcCgst: number;
    itcSgst: number;
    itcCess: number;
  }> = [
    {
      key: 'igst',
      label: 'Integrated Tax (₹)',
      itcIgst: pditc.i_pdi,
      itcCgst: pditc.i_pdc,
      itcSgst: pditc.i_pds,
      itcCess: 0,
    },
    {
      key: 'cgst',
      label: 'Central Tax (₹)',
      itcIgst: pditc.c_pdi,
      itcCgst: pditc.c_pdc,
      itcSgst: 0,
      itcCess: 0,
    },
    {
      key: 'sgst',
      label: 'State/UT Tax (₹)',
      itcIgst: pditc.s_pdi,
      itcCgst: 0,
      itcSgst: pditc.s_pds,
      itcCess: 0,
    },
    {
      key: 'cess',
      label: 'CESS (₹)',
      itcIgst: 0,
      itcCgst: 0,
      itcSgst: 0,
      itcCess: pditc.cs_pdcs,
    },
  ];

  return rows.map(({ key, label, itcIgst, itcCgst, itcSgst, itcCess }) => {
    const nonRcTax = taxComponentForKey(nonRc, key);
    const rcTax = taxComponentForKey(rc, key);
    return {
      key,
      label,
      netNonRc: nonRcTax.tx,
      netRc: rcTax.tx,
      itcIgst,
      itcCgst,
      itcSgst,
      itcCess,
      cashNonRc: cashFieldForKey(cashNonRc, key),
      cashRc: cashFieldForKey(cashRc, key),
      intrPayable: nonRcTax.intr + rcTax.intr,
      intrCash: intrCashForKey(cashNonRc, key) + intrCashForKey(cashRc, key),
      feePayable: nonRcTax.fee + rcTax.fee,
      feeCash: feeCashForKey(cashNonRc, key) + feeCashForKey(cashRc, key),
    };
  });
}

export function creditLedgerFromItcAvl(itcElg: Gstr3bItcElg): Gstr3bCreditLedgerBalance {
  return itcElg.itc_avl.reduce<Gstr3bCreditLedgerBalance>(
    (acc, row) => ({
      igst: acc.igst + row.iamt,
      cgst: acc.cgst + row.camt,
      sgst: acc.sgst + row.samt,
      cess: acc.cess + row.csamt,
    }),
    { igst: 0, cgst: 0, sgst: 0, cess: 0 },
  );
}

export function gstr3bHasPendingTaxLiability(txPmt: Gstr3bTxPmt): boolean {
  for (const row of txPmt.net_tax_pay) {
    for (const key of ['igst', 'cgst', 'sgst', 'cess'] as const) {
      const part = row[key];
      if (part.tx + part.intr + part.fee > 0) {
        return true;
      }
    }
  }
  return false;
}

export function parseGstr3bTxPmtFromData(
  txPmt: Record<string, unknown> | undefined,
): Gstr3bTxPmt {
  if (!txPmt) {
    return emptyGstr3bTxPmt();
  }

  const pdcashRaw = txPmt['pdcash'];
  const pdcash = Array.isArray(pdcashRaw)
    ? pdcashRaw
        .map((r) => gstr2AsRecord(r))
        .filter((r): r is Record<string, unknown> => !!r)
        .map(parsePdcashRow)
    : [];

  const netRaw = txPmt['net_tax_pay'];
  const net_tax_pay = Array.isArray(netRaw)
    ? netRaw
        .map((r) => gstr2AsRecord(r))
        .filter((r): r is Record<string, unknown> => !!r)
        .map(parseGstr3bNetTaxPayRow)
    : [];

  return {
    pditc: parsePditc(gstr2AsRecord(txPmt['pditc'])),
    pdcash: normalizeGstr3bPdcash(pdcash),
    net_tax_pay,
  };
}

export function sumGstr3bTxPmtCash(txPmt: Gstr3bTxPmt): number {
  return txPmt.pdcash.reduce(
    (sum, row) =>
      sum +
      row.ipd +
      row.cpd +
      row.spd +
      row.cspd +
      row.i_intrpd +
      row.c_intrpd +
      row.s_intrpd +
      row.cs_intrpd +
      row.i_lfeepd +
      row.c_lfeepd +
      row.s_lfeepd +
      row.cs_lfeepd,
    0,
  );
}

export function sumGstr3bTxPmtCredit(pditc: Gstr3bRetsavePditc): number {
  return (
    pditc.i_pdi +
    pditc.i_pdc +
    pditc.i_pds +
    pditc.c_pdi +
    pditc.c_pdc +
    pditc.s_pdi +
    pditc.s_pds +
    pditc.cs_pdcs
  );
}
