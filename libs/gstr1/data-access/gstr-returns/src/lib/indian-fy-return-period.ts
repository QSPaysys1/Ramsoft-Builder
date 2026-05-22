import { MONTH_SHORT } from '@ramsoft-builder/gstr1/data-access/gstzen-auth';

/** Indian financial year starting April 1 of `startYear` (label e.g. 2026-27). */
export interface IndianFySelection {
  readonly label: string;
  readonly startYear: number;
}

export const GST_QUARTERS = [
  { id: 'q1', label: 'Quarter 1 (Apr – Jun)' },
  { id: 'q2', label: 'Quarter 2 (Jul – Sep)' },
  { id: 'q3', label: 'Quarter 3 (Oct – Dec)' },
  { id: 'q4', label: 'Quarter 4 (Jan – Mar)' },
] as const;

export type QuarterId = (typeof GST_QUARTERS)[number]['id'];

export interface PeriodMonthOption {
  readonly id: string;
  readonly label: string;
  readonly retPeriod: string;
}

/** Financial year start calendar year for a date (April–March). */
export function indianFyStartYearForDate(d: Date): number {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return m >= 4 ? y : y - 1;
}

export function formatIndianFyLabel(startYear: number): string {
  const endYy = (startYear + 1) % 100;
  return `${startYear}-${String(endYy).padStart(2, '0')}`;
}

export function listIndianFinancialYears(anchor: Date, span = 7): IndianFySelection[] {
  const currentStart = indianFyStartYearForDate(anchor);
  const out: IndianFySelection[] = [];
  for (let i = 0; i < span; i++) {
    const sy = currentStart - i;
    out.push({
      label: formatIndianFyLabel(sy),
      startYear: sy,
    });
  }
  return out;
}

export function quarterIdForCalendarMonth(month1to12: number): QuarterId {
  if (month1to12 >= 4 && month1to12 <= 6) {
    return 'q1';
  }
  if (month1to12 >= 7 && month1to12 <= 9) {
    return 'q2';
  }
  if (month1to12 >= 10 && month1to12 <= 12) {
    return 'q3';
  }
  return 'q4';
}

export function periodMonthsForQuarter(
  fyStartYear: number,
  q: QuarterId,
): PeriodMonthOption[] {
  const mk = (month: number, year: number): PeriodMonthOption => {
    const mm = String(month).padStart(2, '0');
    const yyyy = String(year);
    const retPeriod = `${mm}${yyyy}`;
    return {
      id: retPeriod,
      label: MONTH_SHORT[month - 1],
      retPeriod,
    };
  };
  switch (q) {
    case 'q1':
      return [mk(4, fyStartYear), mk(5, fyStartYear), mk(6, fyStartYear)];
    case 'q2':
      return [mk(7, fyStartYear), mk(8, fyStartYear), mk(9, fyStartYear)];
    case 'q3':
      return [mk(10, fyStartYear), mk(11, fyStartYear), mk(12, fyStartYear)];
    case 'q4':
      return [
        mk(1, fyStartYear + 1),
        mk(2, fyStartYear + 1),
        mk(3, fyStartYear + 1),
      ];
    default:
      return [];
  }
}

/** FY / quarter / ret_period aligned with “today” in Indian FY terms. */
export function defaultSelectionForDate(now: Date): {
  readonly fy: IndianFySelection;
  readonly quarter: QuarterId;
  readonly retPeriod: string;
} {
  const fyStart = indianFyStartYearForDate(now);
  const m = now.getMonth() + 1;
  const q = quarterIdForCalendarMonth(m);
  const months = periodMonthsForQuarter(fyStart, q);
  const mm = String(m).padStart(2, '0');
  const yyyy = String(now.getFullYear());
  const fallback = `${mm}${yyyy}`;
  const retPeriod =
    months.find((x) => {
      const mon = Number.parseInt(x.retPeriod.slice(0, 2), 10);
      return mon === m;
    })?.retPeriod ??
    months[months.length - 1]?.retPeriod ??
    fallback;
  return {
    fy: { startYear: fyStart, label: formatIndianFyLabel(fyStart) },
    quarter: q,
    retPeriod,
  };
}
