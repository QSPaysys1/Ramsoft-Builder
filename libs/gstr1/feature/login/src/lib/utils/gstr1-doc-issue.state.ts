/** GSTR-1 Table 13 — `doc_issue.doc_det[]` (GSTZen / NIC retsave). */

export interface Gstr1DocIssueRow {
  readonly num: number;
  readonly from: string;
  readonly to: string;
  readonly totnum: number;
  readonly cancel: number;
  readonly net_issue: number;
}

export interface Gstr1DocIssueGroup {
  readonly doc_num: number;
  readonly docs: readonly Gstr1DocIssueRow[];
}

export interface Gstr1DocIssueState {
  readonly doc_det: readonly Gstr1DocIssueGroup[];
}

export function docIssueStorageKey(gstin: string, retPeriod: string): string {
  return `gstr1:doc_issue:v1:${gstin.trim().toUpperCase()}:${retPeriod.trim()}`;
}

export function emptyDocIssueState(): Gstr1DocIssueState {
  return { doc_det: [] };
}

function numFromUnknown(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return Math.trunc(v);
  }
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function strFromUnknown(v: unknown): string {
  if (typeof v === 'string') {
    return v.trim();
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    return String(v);
  }
  return '';
}

/** Best-effort parse from `message.doc_issue` or a lone `{ doc_det }` object. */
export function parseDocIssueFromEnvelope(raw: unknown): Gstr1DocIssueState | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  let inner: unknown = raw;
  const root = raw as Record<string, unknown>;
  if (root['message'] && typeof root['message'] === 'object') {
    const msg = root['message'] as Record<string, unknown>;
    inner = msg['doc_issue'] ?? msg;
  }
  if (!inner || typeof inner !== 'object') {
    return null;
  }
  const o = inner as Record<string, unknown>;
  const docDetRaw = o['doc_det'];
  if (!Array.isArray(docDetRaw)) {
    return null;
  }
  return normalizeDocIssueState({ doc_det: docDetRaw });
}

export function normalizeDocIssueState(raw: unknown): Gstr1DocIssueState {
  if (!raw || typeof raw !== 'object') {
    return emptyDocIssueState();
  }
  const docDetRaw = (raw as Record<string, unknown>)['doc_det'];
  if (!Array.isArray(docDetRaw)) {
    return emptyDocIssueState();
  }
  const groups: Gstr1DocIssueGroup[] = [];
  for (const g0 of docDetRaw) {
    if (!g0 || typeof g0 !== 'object') {
      continue;
    }
    const g = g0 as Record<string, unknown>;
    const docNum = numFromUnknown(g['doc_num'], 0);
    if (docNum <= 0) {
      continue;
    }
    const docsRaw = g['docs'];
    const rows: Gstr1DocIssueRow[] = [];
    if (Array.isArray(docsRaw)) {
      for (const d0 of docsRaw) {
        if (!d0 || typeof d0 !== 'object') {
          continue;
        }
        const d = d0 as Record<string, unknown>;
        const totnum = numFromUnknown(d['totnum'], 0);
        const cancel = numFromUnknown(d['cancel'], 0);
        const net =
          d['net_issue'] !== undefined && d['net_issue'] !== null
            ? numFromUnknown(d['net_issue'], Math.max(0, totnum - cancel))
            : Math.max(0, totnum - cancel);
        rows.push({
          num: numFromUnknown(d['num'], rows.length + 1),
          from: strFromUnknown(d['from']),
          to: strFromUnknown(d['to']),
          totnum,
          cancel,
          net_issue: net,
        });
      }
    }
    if (rows.length > 0) {
      groups.push({ doc_num: docNum, docs: rows });
    }
  }
  return { doc_det: groups };
}

export function rowsForDocType(state: Gstr1DocIssueState, docNum: number): readonly Gstr1DocIssueRow[] {
  const g = state.doc_det.find((x) => x.doc_num === docNum);
  return g?.docs ?? [];
}

export function nextRowNumInGroup(group: Gstr1DocIssueGroup | undefined): number {
  if (!group || group.docs.length === 0) {
    return 1;
  }
  return Math.max(...group.docs.map((d) => d.num)) + 1;
}

export function withDocIssueGroup(
  state: Gstr1DocIssueState,
  docNum: number,
  updater: (group: Gstr1DocIssueGroup | undefined) => Gstr1DocIssueGroup,
): Gstr1DocIssueState {
  const others = state.doc_det.filter((g) => g.doc_num !== docNum);
  const cur = state.doc_det.find((g) => g.doc_num === docNum);
  const nextGroup = updater(cur);
  const nextDet =
    nextGroup.docs.length > 0
      ? [...others, nextGroup].sort((a, b) => a.doc_num - b.doc_num)
      : others;
  return { doc_det: nextDet };
}

export function appendDocRow(
  state: Gstr1DocIssueState,
  docNum: number,
  row: Omit<Gstr1DocIssueRow, 'num'>,
): Gstr1DocIssueState {
  return withDocIssueGroup(state, docNum, (cur) => {
    const n = nextRowNumInGroup(cur);
    const nextRow: Gstr1DocIssueRow = {
      num: n,
      ...row,
    };
    const existing = cur?.docs ?? [];
    return {
      doc_num: docNum,
      docs: [...existing, nextRow],
    };
  });
}

export function updateDocRow(
  state: Gstr1DocIssueState,
  docNum: number,
  rowNum: number,
  patch: Pick<Gstr1DocIssueRow, 'from' | 'to' | 'totnum' | 'cancel' | 'net_issue'>,
): Gstr1DocIssueState {
  return withDocIssueGroup(state, docNum, (cur) => {
    if (!cur) {
      return { doc_num: docNum, docs: [] };
    }
    const docs = cur.docs.map((d) =>
      d.num === rowNum
        ? {
            num: d.num,
            from: patch.from,
            to: patch.to,
            totnum: patch.totnum,
            cancel: patch.cancel,
            net_issue: patch.net_issue,
          }
        : d,
    );
    return { doc_num: docNum, docs };
  });
}

export function removeDocRow(state: Gstr1DocIssueState, docNum: number, rowNum: number): Gstr1DocIssueState {
  return withDocIssueGroup(state, docNum, (cur) => {
    if (!cur) {
      return { doc_num: docNum, docs: [] };
    }
    const docs = cur.docs.filter((d) => d.num !== rowNum);
    return { doc_num: docNum, docs: docs };
  });
}

export function buildRetsaveDocIssuePayload(
  fp: string,
  gstin: string,
  state: Gstr1DocIssueState,
): Record<string, unknown> {
  const doc_det = state.doc_det
    .filter((g) => g.docs.length > 0)
    .map((g) => ({
      doc_num: g.doc_num,
      docs: g.docs.map((d) => ({
        num: d.num,
        from: d.from,
        to: d.to,
        totnum: d.totnum,
        cancel: d.cancel,
        net_issue: d.net_issue,
      })),
    }));

  return {
    fp: fp.trim(),
    gstin: gstin.trim().toUpperCase(),
    gt: 0,
    cur_gt: 0,
    doc_issue: { doc_det },
  };
}
