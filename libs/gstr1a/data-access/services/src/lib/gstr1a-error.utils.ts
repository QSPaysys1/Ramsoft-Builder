import {
  normalizeGstzenHttpError,
  type GstzenHttpErrorEnvelope,
} from '@ramsoft-builder/gstr1/utils/http-error';

export { normalizeGstzenHttpError, type GstzenHttpErrorEnvelope };

export function normalizeGstr1aHttpError(err: unknown): GstzenHttpErrorEnvelope | unknown {
  return normalizeGstzenHttpError(err);
}
