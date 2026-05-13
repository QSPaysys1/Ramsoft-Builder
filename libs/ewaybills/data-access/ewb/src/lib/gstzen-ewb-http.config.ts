import { InjectionToken } from '@angular/core';
import {
  GSTZEN_EWB_CANCEL_URL_DEFAULT,
  GSTZEN_EWB_GENERATE_URL_DEFAULT,
  GSTZEN_EWB_GET_URL_DEFAULT,
  GSTZEN_EWB_UPDATE_PARTB_URL_DEFAULT,
  GSTZEN_EWB_UPDATE_TRANSPORTER_URL_DEFAULT,
  GSTZEN_EWB_EXTEND_URL_DEFAULT,
} from './ewb.constants';

export interface GstZenEwbHttpConfig {
  /** Full POST URL including trailing slash (optional; default {@link GSTZEN_EWB_GENERATE_URL_DEFAULT}). */
  generateUrl: string;
  /** Full cancel POST URL (optional; default {@link GSTZEN_EWB_CANCEL_URL_DEFAULT}). */
  cancelUrl?: string;
  /** Full get-by-number POST URL (optional; default {@link GSTZEN_EWB_GET_URL_DEFAULT}). */
  getUrl?: string;
  /** Full update Part B POST URL (optional; default {@link GSTZEN_EWB_UPDATE_PARTB_URL_DEFAULT}). */
  updatePartBUrl?: string;
  /** Full update transporter POST URL (optional; default {@link GSTZEN_EWB_UPDATE_TRANSPORTER_URL_DEFAULT}). */
  updateTransporterUrl?: string;
  /** Full extend e-way POST URL (optional; default {@link GSTZEN_EWB_EXTEND_URL_DEFAULT}). */
  extendUrl?: string;
  /** Primary GSTZen `Token` (e.g. “original” workspace). */
  token: string;
  /** Optional second token for e-way-only testing; used when topbar “EWB test token” is on. */
  ewbTestToken?: string;
}

export const GSTZEN_EWB_HTTP_CONFIG = new InjectionToken<GstZenEwbHttpConfig>(
  'GSTZEN_EWB_HTTP_CONFIG',
);

export function resolveEwbGenerateUrl(cfg: GstZenEwbHttpConfig): string {
  const u = cfg.generateUrl?.trim();
  return (u || GSTZEN_EWB_GENERATE_URL_DEFAULT).trim();
}

export function resolveEwbCancelUrl(cfg: GstZenEwbHttpConfig): string {
  const u = cfg.cancelUrl?.trim();
  return (u || GSTZEN_EWB_CANCEL_URL_DEFAULT).trim();
}

export function resolveEwbGetUrl(cfg: GstZenEwbHttpConfig): string {
  const u = cfg.getUrl?.trim();
  return (u || GSTZEN_EWB_GET_URL_DEFAULT).trim();
}

export function resolveEwbUpdatePartBUrl(cfg: GstZenEwbHttpConfig): string {
  const u = cfg.updatePartBUrl?.trim();
  return (u || GSTZEN_EWB_UPDATE_PARTB_URL_DEFAULT).trim();
}

export function resolveEwbUpdateTransporterUrl(cfg: GstZenEwbHttpConfig): string {
  const u = cfg.updateTransporterUrl?.trim();
  return (u || GSTZEN_EWB_UPDATE_TRANSPORTER_URL_DEFAULT).trim();
}

export function resolveEwbExtendUrl(cfg: GstZenEwbHttpConfig): string {
  const u = cfg.extendUrl?.trim();
  return (u || GSTZEN_EWB_EXTEND_URL_DEFAULT).trim();
}
