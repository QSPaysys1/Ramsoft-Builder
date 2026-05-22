import { gstr1AuthGuard } from '@ramsoft-builder/gstr1/data-access/gstzen-auth';

/** GSTR-1A uses the same GSTZen JWT as GSTR-1 — no separate login. */
export const gstr1aAuthGuard = gstr1AuthGuard;
