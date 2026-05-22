import type { Gstr2aB2bSupplierRow } from '@ramsoft-builder/gstr2a/models/entities';
import type { Gstr2aTableColumnDef } from '@ramsoft-builder/gstr2a/models/interfaces';

export const GSTR2A_B2B_TABLE_COLUMNS: readonly Gstr2aTableColumnDef<Gstr2aB2bSupplierRow>[] =
  [
    {
      id: 'supplierGstin',
      label: 'GSTIN of Supplier',
      field: 'supplierGstin',
      locked: true,
    },
    { id: 'supplierName', label: 'Supplier Name', field: 'supplierName' },
    {
      id: 'gstr1FilingStatus',
      label: 'GSTR-1/IFF/GSTR-1A/GSTR-5 Filing Status',
      field: 'gstr1FilingStatus',
    },
    {
      id: 'gstr1FilingDate',
      label: 'GSTR-1/IFF/GSTR-1A/GSTR-5 Filing Date',
      field: 'gstr1FilingDate',
    },
    {
      id: 'gstr1FilingPeriod',
      label: 'GSTR-1/IFF/GSTR-1A/GSTR-5 Filing Period',
      field: 'gstr1FilingPeriod',
    },
    {
      id: 'gstr3bFilingStatus',
      label: 'GSTR-3B filing status',
      field: 'gstr3bFilingStatus',
    },
    {
      id: 'cancellationDate',
      label: 'Effective date of cancellation',
      field: 'cancellationDate',
    },
  ];
