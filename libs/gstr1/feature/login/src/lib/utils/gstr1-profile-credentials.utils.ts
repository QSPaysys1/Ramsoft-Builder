/**
 * GSTR-1 / GSTZen session fields stored in `public.profiles.data`.
 * Do not use legacy `userName` (Ramsoft short name) as GST portal username.
 * Seed via `supabase/seed/gstr1_gst_session_credentials.sql`.
 */

import type { LegacyUserFlatRow } from '@ramsoft-builder/e-invoices/data-access/einvoice';

/** GSTR return GSTIN for the logged-in Ramsoft user (not company e-invoice GSTIN). */
export const GSTR1_GSTR_REGISTRATION_GSTIN = '36AAYCA9563F1ZZ' as const;

/** Prefer these over `GSTIN` / `gstin` (often the company GSTIN on the profile). */
export const GSTR1_PROFILE_GSTR_GSTIN_KEYS = [
  'gstrGstin',
  'gstr1Gstin',
  'gstrRegistrationGstin',
  'registrationGstin',
  'gstr_gstin',
  'gstr1_gstin',
] as const;

export const GSTR1_PROFILE_GSTIN_KEYS = [
  'GSTIN',
  'gstin',
  'tinGstNo',
  'organizationGstin',
  'Gstin',
] as const;

export const GSTR1_PROFILE_PORTAL_USERNAME_KEYS = [
  'gstPortalUsername',
  'gst_portal_username',
  'GstPortalUsername',
  'GSTPortalUsername',
  'GSTPortalUser',
  'gstPortalUser',
  'gstPortalLogin',
  'gst_portal_login',
  'portalUsername',
  'portal_username',
  'gstUserName',
  'gst_username',
] as const;

export const GSTR1_PROFILE_GSTZEN_USERNAME_KEYS = [
  'gstZenUsername',
  'gstzen_username',
  'gstZenUser',
  'gst_zen_username',
  'gstZenLogin',
  'gstzen_login',
] as const;

export const GSTR1_PROFILE_GSTZEN_PASSWORD_KEYS = [
  'gstZenPassword',
  'gstzen_password',
  'gstZenPass',
  'gst_zen_password',
] as const;

const PROFILE_NESTED_BUCKETS = [
  'secureData',
  'gst',
  'gstSession',
  'gstCredentials',
  'extra',
] as const;

export type Gstr1ProfileGstCredentials = {
  readonly gstin: string;
  readonly portalUsername: string;
  readonly gstZenUsername: string;
  readonly gstZenPassword: string;
};

export type Gstr1GstrRegistration = {
  readonly gstin: string;
  readonly portalUsername: string;
  readonly gstZenUsername: string;
  readonly gstZenPassword: string;
};

/**
 * GSTR session for a Ramsoft login email (may differ from company `profiles.data.GSTIN`).
 */
export const GSTR1_GSTR_REGISTRATION_BY_EMAIL: Readonly<
  Record<string, Gstr1GstrRegistration>
> = {
  'ajay.gunda@sbpcorp.in': {
    gstin: GSTR1_GSTR_REGISTRATION_GSTIN,
    portalUsername: 'ARHASRI-23',
    gstZenUsername: 'ajay.a02@gmail.com',
    gstZenPassword: 'Arhasri@1234',
  },
  'ajay.a02@gmail.com': {
    gstin: GSTR1_GSTR_REGISTRATION_GSTIN,
    portalUsername: 'ARHASRI-23',
    gstZenUsername: 'ajay.a02@gmail.com',
    gstZenPassword: 'Arhasri@1234',
  },
};

export function pickProfileString(
  obj: Record<string, unknown> | undefined,
  keys: readonly string[],
): string {
  if (!obj) {
    return '';
  }
  for (const k of keys) {
    const s = coerceProfileString(obj[k]);
    if (s) {
      return s;
    }
  }
  for (const bucket of PROFILE_NESTED_BUCKETS) {
    const nested = obj[bucket];
    if (nested != null && typeof nested === 'object') {
      const inner = pickProfileString(nested as Record<string, unknown>, keys);
      if (inner) {
        return inner;
      }
    }
  }
  return '';
}

function coerceProfileString(value: unknown): string {
  if (typeof value === 'string') {
    const s = value.trim();
    return s.length > 0 ? s : '';
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return '';
}

/** Only `extra.gstPortalUsername` — not `user_name` (often Ramsoft short name `ajay`). */
function pickPortalUsernameFromLegacyFlat(
  flat: LegacyUserFlatRow | undefined,
): string {
  if (!flat) {
    return '';
  }
  return pickProfileString(flat.extra ?? undefined, GSTR1_PROFILE_PORTAL_USERNAME_KEYS);
}

function pickGstinFromLegacyFlat(flat: LegacyUserFlatRow | undefined): string {
  if (!flat) {
    return '';
  }
  const fromExtra = pickProfileString(
    flat.extra ?? undefined,
    GSTR1_PROFILE_GSTR_GSTIN_KEYS,
  ).toUpperCase();
  if (fromExtra) {
    return fromExtra;
  }
  const g = flat.gstin?.trim() ?? '';
  return g ? g.toUpperCase() : '';
}

function pickGstrGstinFromProfile(
  profile: Record<string, unknown> | undefined,
  legacyFlat?: LegacyUserFlatRow | undefined,
): string {
  return (
    pickProfileString(profile, GSTR1_PROFILE_GSTR_GSTIN_KEYS).toUpperCase() ||
    pickGstinFromLegacyFlat(legacyFlat) ||
    pickProfileString(profile, GSTR1_PROFILE_GSTIN_KEYS).toUpperCase()
  );
}

/** GSTIN for GSTR / GSTZen APIs for the current Ramsoft session. */
export function resolveLoggedInUserGstrGstin(
  profile: Record<string, unknown> | undefined,
  legacyFlat?: LegacyUserFlatRow | undefined,
  loggedInEmail?: string | null,
): string {
  return parseGstr1ProfileGstCredentials(profile, legacyFlat, loggedInEmail).gstin;
}

export function parseGstr1ProfileGstCredentials(
  profile: Record<string, unknown> | undefined,
  legacyFlat?: LegacyUserFlatRow | undefined,
  loggedInEmail?: string | null,
): Gstr1ProfileGstCredentials {
  const gstin = pickGstrGstinFromProfile(profile, legacyFlat);

  const portalUsername =
    pickProfileString(profile, GSTR1_PROFILE_PORTAL_USERNAME_KEYS) ||
    pickPortalUsernameFromLegacyFlat(legacyFlat);

  const gstZenUsername = pickProfileString(
    profile,
    GSTR1_PROFILE_GSTZEN_USERNAME_KEYS,
  );

  const gstZenPassword = pickProfileString(
    profile,
    GSTR1_PROFILE_GSTZEN_PASSWORD_KEYS,
  );

  return applyGstrRegistrationForLoggedInUser(
    {
      gstin,
      portalUsername,
      gstZenUsername,
      gstZenPassword,
    },
    loggedInEmail,
  );
}

function applyGstrRegistrationForLoggedInUser(
  creds: Gstr1ProfileGstCredentials,
  loggedInEmail?: string | null,
): Gstr1ProfileGstCredentials {
  const email = loggedInEmail?.trim().toLowerCase() ?? '';
  const registration = email ? GSTR1_GSTR_REGISTRATION_BY_EMAIL[email] : undefined;

  if (!registration) {
    return {
      gstin: creds.gstin,
      portalUsername: creds.portalUsername,
      gstZenUsername: creds.gstZenUsername || email,
      gstZenPassword: creds.gstZenPassword,
    };
  }

  return {
    gstin: registration.gstin,
    portalUsername: registration.portalUsername,
    gstZenUsername: registration.gstZenUsername,
    gstZenPassword: registration.gstZenPassword || creds.gstZenPassword,
  };
}

export function gstr1ProfileGstCredentialsReady(
  creds: Gstr1ProfileGstCredentials,
): boolean {
  return (
    creds.gstin.length === 15 &&
    creds.portalUsername.length > 0 &&
    creds.gstZenUsername.length > 0 &&
    creds.gstZenPassword.length > 0
  );
}

export function gstr1ProfileGstCredentialsMissingLabels(
  creds: Gstr1ProfileGstCredentials,
): string[] {
  const missing: string[] = [];
  if (creds.gstin.length !== 15) {
    missing.push('GSTIN');
  }
  if (!creds.portalUsername) {
    missing.push('gstPortalUsername');
  }
  if (!creds.gstZenUsername) {
    missing.push('gstZenUsername');
  }
  if (!creds.gstZenPassword) {
    missing.push('gstZenPassword');
  }
  return missing;
}
