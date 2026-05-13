/** Supabase table name for e-way bills. */
export const EWAY_BILLS_TABLE = 'eway_bills' as const;

/** GSTZen standalone generate endpoint (override via environment). */
export const GSTZEN_EWB_GENERATE_URL_DEFAULT =
  'https://my.gstzen.in/~gstzen/a/ewbapi/generate/' as const;

/** GSTZen standalone cancel endpoint (override via environment). */
export const GSTZEN_EWB_CANCEL_URL_DEFAULT =
  'https://my.gstzen.in/~gstzen/a/ewbapi/cancel/' as const;

/** GSTZen standalone “get e-way bill” by `ewbNo` (override via environment). */
export const GSTZEN_EWB_GET_URL_DEFAULT =
  'https://my.gstzen.in/~gstzen/a/ewbapi/getewb/' as const;
