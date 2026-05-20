import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import { UserProfileRepository } from '@ramsoft-builder/e-invoices/data-access/einvoice';
import { RETURN_PERIOD_REGEX } from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { catchError, of, switchMap } from 'rxjs';
import {
  GSTR2A_PARTS,
  type Gstr2aSectionTile,
} from '../constants/gstr2a-view.constants';

function pickProfileString(
  obj: Record<string, unknown> | undefined,
  keys: string[],
): string {
  if (!obj) {
    return '';
  }
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return '';
}

function indianFyLabelFromMmYyyy(retPeriod: string): string {
  if (!RETURN_PERIOD_REGEX.test(retPeriod)) {
    return '—';
  }
  const mm = Number.parseInt(retPeriod.slice(0, 2), 10);
  const yyyy = Number.parseInt(retPeriod.slice(2), 10);
  const fyStart = mm >= 4 ? yyyy : yyyy - 1;
  return `${fyStart}-${String(fyStart + 1).slice(-2)}`;
}

function monthNameFromMmYyyy(retPeriod: string): string {
  if (!RETURN_PERIOD_REGEX.test(retPeriod)) {
    return '—';
  }
  const mm = Number.parseInt(retPeriod.slice(0, 2), 10);
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return months[mm - 1] ?? retPeriod;
}

@Component({
  selector: 'lib-gstr2a-view-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './gstr2a-view.page.html',
  styleUrl: './gstr2a-view.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr2aViewPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);

  readonly parts = GSTR2A_PARTS;

  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingLabel = signal('');
  readonly legalName = signal('');
  readonly tradeName = signal('');
  readonly selectedTile = signal<Gstr2aSectionTile | null>(null);

  readonly fyLabel = computed(() => indianFyLabelFromMmYyyy(this.retPeriod()));
  readonly taxPeriodLabel = computed(() => monthNameFromMmYyyy(this.retPeriod()));

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => {
        const g = (q.get('gstin') ?? '').trim().toUpperCase();
        const r = (q.get('ret_period') ?? '').trim();
        const fl = (q.get('filing_status') ?? '').trim();
        if (g) {
          this.gstin.set(g);
        }
        if (r) {
          this.retPeriod.set(r);
        }
        if (fl) {
          this.filingLabel.set(fl);
        }
      });

    toObservable(this.authStore.user)
      .pipe(
        switchMap((user) => {
          if (!user?.id) {
            return of(undefined);
          }
          return this.userProfile.watchProfileData(user.id).pipe(
            catchError(() => of(undefined)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((prof) => {
        const p = prof as Record<string, unknown> | undefined;
        this.legalName.set(
          pickProfileString(p, [
            'legal_name',
            'legalName',
            'LegalName',
            'companyName',
            'CompanyName',
            'organizationName',
            'name',
            'Name',
          ]),
        );
        this.tradeName.set(
          pickProfileString(p, [
            'tradeName',
            'TradeName',
            'trade_name',
            'dba',
          ]),
        );
      });
  }

  selectTile(tile: Gstr2aSectionTile): void {
    const gstin = this.gstin().trim().toUpperCase();
    const ret_period = this.retPeriod().trim();
    if (gstin.length !== 15 || !RETURN_PERIOD_REGEX.test(ret_period)) {
      return;
    }
    const queryParams = {
      gstin,
      ret_period,
      filing_status: this.filingLabel().trim() || undefined,
    };
    if (tile.id === 'b2b') {
      void this.router.navigate(['/gstr1/workspace/gstr2a-b2b'], { queryParams });
      return;
    }
    if (tile.id === 'cdn') {
      void this.router.navigate(['/gstr1/workspace/gstr2a-cdn'], { queryParams });
      return;
    }
    if (tile.id === 'b2ba') {
      void this.router.navigate(['/gstr1/workspace/gstr2a-b2ba'], { queryParams });
      return;
    }
    if (tile.id === 'cdna') {
      void this.router.navigate(['/gstr1/workspace/gstr2a-cdna'], { queryParams });
      return;
    }
    if (tile.id === 'eco') {
      void this.router.navigate(['/gstr1/workspace/gstr2a-eco'], { queryParams });
      return;
    }
    if (tile.id === 'ecoa') {
      void this.router.navigate(['/gstr1/workspace/gstr2a-ecoa'], { queryParams });
      return;
    }
    this.selectedTile.set(tile);
  }

  clearSelectedTile(): void {
    this.selectedTile.set(null);
  }

  tileActive(tile: Gstr2aSectionTile): boolean {
    return this.selectedTile()?.id === tile.id;
  }

  openGstHelp(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.open('https://www.gst.gov.in/', '_blank', 'noopener,noreferrer');
  }
}
