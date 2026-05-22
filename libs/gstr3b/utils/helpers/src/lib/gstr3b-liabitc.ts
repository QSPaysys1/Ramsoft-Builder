import {
  gstr2AsRecord,
  gstr2CoercePayloadRoot,
  gstr2MessageRecord,
} from './gstr2-response.utils';

export function extractLiabitc(payload: unknown): Record<string, unknown> | undefined {
  const root = gstr2CoercePayloadRoot(payload);
  if (!root) {
    return undefined;
  }
  const msg = gstr2MessageRecord(root);
  if (!msg) {
    return undefined;
  }
  const autopop = gstr2AsRecord(msg['r3bautopop'] ?? msg['R3bautopop']);
  return gstr2AsRecord(autopop?.['liabitc'] ?? autopop?.['Liabitc']);
}
