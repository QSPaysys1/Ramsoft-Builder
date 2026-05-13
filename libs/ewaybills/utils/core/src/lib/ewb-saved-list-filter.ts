import type {
  EwaybillListView,
  EwaybillSavedListTransportFilter,
} from '@ramsoft-builder/ewaybills/models/ewb';

export function filterEwaybillListByTransport(
  rows: EwaybillListView[],
  filter: EwaybillSavedListTransportFilter,
): EwaybillListView[] {
  if (filter === 'all') {
    return rows;
  }
  return rows.filter((r) => {
    switch (filter) {
      case 'success':
        return r.transportLastStatus === 'success';
      case 'failed':
        return r.transportLastStatus === 'failed';
      case 'pending':
        return r.status === 'generated' && r.transportSuccessCount === 0;
      case 'updated':
        return r.transportSuccessCount > 0;
      case 'vehicle_changed':
        return r.transportLastVehicleChanged;
      default:
        return true;
    }
  });
}

export function canCancelSavedEwaybillRow(row: EwaybillListView): boolean {
  return row.status === 'generated' && !!row.ewbNumber;
}

export function canUpdatePartBForSavedEwaybillRow(row: EwaybillListView): boolean {
  return row.status === 'generated' && !!row.ewbNumber;
}

/** Same eligibility as Part B: active bill with NIC EWB number. */
export function canExtendEwaybillForSavedEwaybillRow(row: EwaybillListView): boolean {
  return row.status === 'generated' && !!row.ewbNumber;
}

/** Same eligibility as Part B: active bill with NIC EWB number. */
export function canUpdateTransporterForSavedEwaybillRow(row: EwaybillListView): boolean {
  return row.status === 'generated' && !!row.ewbNumber;
}
