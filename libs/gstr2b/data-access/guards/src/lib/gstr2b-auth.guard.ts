import { gstr1AuthGuard } from '@ramsoft-builder/gstr1/data-access/gstzen-auth';

/** Requires GSTZen JWT from GSTR-1 login — no separate GSTR-2B auth. */
export const gstr2bAuthGuard = gstr1AuthGuard;
