/** Supabase table name for e-way bills. */
export const EWAY_BILLS_TABLE = 'eway_bills' as const;

/** Supabase audit table for Part B / vehicle update API calls. */
export const EWAY_BILL_TRANSPORT_UPDATES_TABLE = 'eway_bill_transport_updates' as const;

/** GSTZen standalone generate endpoint (override via environment). */
export const GSTZEN_EWB_GENERATE_URL_DEFAULT =
  'https://my.gstzen.in/~gstzen/a/ewbapi/generate/' as const;

/** GSTZen standalone cancel endpoint (override via environment). */
export const GSTZEN_EWB_CANCEL_URL_DEFAULT =
  'https://my.gstzen.in/~gstzen/a/ewbapi/cancel/' as const;

/** GSTZen standalone “get e-way bill” by `ewbNo` (override via environment). */
export const GSTZEN_EWB_GET_URL_DEFAULT =
  'https://my.gstzen.in/~gstzen/a/ewbapi/getewb/' as const;

/** GSTZen standalone update Part B (override via environment). */
export const GSTZEN_EWB_UPDATE_PARTB_URL_DEFAULT =
  'https://my.gstzen.in/~gstzen/a/ewbapi/updatepartb/' as const;

/** GSTZen standalone update transporter (override via environment). */
export const GSTZEN_EWB_UPDATE_TRANSPORTER_URL_DEFAULT =
  'https://my.gstzen.in/~gstzen/a/ewbapi/update-transporter/' as const;

/** GSTZen GET transporter e-way list (override via environment). */
export const GSTZEN_EWB_GET_TRANSPORTER_VIEW_URL_DEFAULT =
  'https://my.gstzen.in/~gstzen/a/ewbapi/get-ewb-transporter-view/' as const;

/** GSTZen standalone extend e-way bill validity (override via environment). */
export const GSTZEN_EWB_EXTEND_URL_DEFAULT =
  'https://my.gstzen.in/~gstzen/a/ewbapi/extend/' as const;

/**
 * Initiate multi-vehicle movement — same NIC endpoint as extend unless GSTZen documents otherwise.
 * Override separately only if their API path diverges.
 */
export const GSTZEN_EWB_MULTI_VEHICLE_URL_DEFAULT = 'https://my.gstzen.in/~gstzen/a/ewbapi/extend/' as const;

/** GSTZen POST `ewbapi/add-multi-vehicles/` (add vehicles to multi-vehicle group). */
export const GSTZEN_EWB_MV_GROUP_POST_URL_DEFAULT =
  'https://my.gstzen.in/~gstzen/a/ewbapi/add-multi-vehicles/' as const;

/** GSTZen POST `ewbapi/change-multi-vehicles/` (swap vehicle / transport within a multi-vehicle group). */
export const GSTZEN_EWB_CHANGE_MULTI_VEHICLES_URL_DEFAULT =
  'https://my.gstzen.in/~gstzen/a/ewbapi/change-multi-vehicles/' as const;
