import { gstr1AuthGuard } from '@ramsoft-builder/gstr1/data-access/gstzen-auth';

/** Requires GSTZen JWT; redirects to `/gstr1/login` (shared GSTR-1 auth). */
export const gstr2aAuthGuard = gstr1AuthGuard;
