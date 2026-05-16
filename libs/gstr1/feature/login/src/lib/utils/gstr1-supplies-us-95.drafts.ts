import type {
  Us95B2bRow,
  Us95B2cRow,
  Us95Urp2bRow,
  Us95Urp2cRow,
} from './gstr1-supplies-us-95.mapper';

export interface Gstr1Us95DraftsState {
  readonly b2b: readonly Us95B2bRow[];
  readonly b2c: readonly Us95B2cRow[];
  readonly urp2b: readonly Us95Urp2bRow[];
  readonly urp2c: readonly Us95Urp2cRow[];
}

export function emptyUs95Drafts(): Gstr1Us95DraftsState {
  return { b2b: [], b2c: [], urp2b: [], urp2c: [] };
}

export function us95DraftsStorageKey(gstin: string, retPeriod: string): string {
  return `gstr1-us95-drafts:${gstin.trim().toUpperCase()}:${retPeriod.trim()}`;
}

function isDraftB2bRow(x: unknown): x is Us95B2bRow {
  if (!x || typeof x !== 'object') {
    return false;
  }
  const o = x as Us95B2bRow;
  return o.kind === 'Draft' && typeof o.rtin === 'string';
}

function isDraftB2cRow(x: unknown): x is Us95B2cRow {
  if (!x || typeof x !== 'object') {
    return false;
  }
  const o = x as Us95B2cRow;
  return o.kind === 'Draft' && typeof o.stin === 'string';
}

function isDraftUrp2bRow(x: unknown): x is Us95Urp2bRow {
  if (!x || typeof x !== 'object') {
    return false;
  }
  const o = x as Us95Urp2bRow;
  return o.kind === 'Draft' && typeof o.rtin === 'string';
}

function isDraftUrp2cRow(x: unknown): x is Us95Urp2cRow {
  if (!x || typeof x !== 'object') {
    return false;
  }
  const o = x as Us95Urp2cRow;
  return o.kind === 'Draft' && typeof o.pos === 'string';
}

export function readUs95DraftsFromJson(raw: string): Gstr1Us95DraftsState | null {
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== 'object') {
      return null;
    }
    const rec = o as Record<string, unknown>;
    const b2b = rec['b2b'];
    const b2c = rec['b2c'];
    const urp2b = rec['urp2b'];
    const urp2c = rec['urp2c'];
    if (!Array.isArray(b2b) || !Array.isArray(b2c) || !Array.isArray(urp2b) || !Array.isArray(urp2c)) {
      return null;
    }
    return {
      b2b: b2b.filter(isDraftB2bRow),
      b2c: b2c.filter(isDraftB2cRow),
      urp2b: urp2b.filter(isDraftUrp2bRow),
      urp2c: urp2c.filter(isDraftUrp2cRow),
    };
  } catch {
    return null;
  }
}
