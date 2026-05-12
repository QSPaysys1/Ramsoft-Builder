import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthStore, type AppUser } from '@ramsoft-builder/auth/data-access/auth';
import {
  UserDashboardRepository,
  UserProfileRepository,
} from '@ramsoft-builder/e-invoices/data-access/einvoice';
import { catchError, merge, of, switchMap } from 'rxjs';

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

@Component({
  standalone: true,
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly userProfile = inject(UserProfileRepository);
  private readonly userDashboard = inject(UserDashboardRepository);
  readonly authStore = inject(AuthStore);

  private readonly profile = signal<Record<string, unknown> | undefined>(
    undefined,
  );
  private readonly dashboard = signal<Record<string, unknown> | undefined>(
    undefined,
  );

  readonly heading = computed(() => {
    const u = this.authStore.user() as AppUser | null;
    const p = this.profile();
    return (
      pickProfileString(p, ['fullName', 'FullName']) ||
      pickProfileString(p, ['companyName', 'CompanyName']) ||
      pickProfileString(p, [
        'organizationName',
        'tradeNam',
        'lgnm',
        'name',
        'legalName',
        'LglNm',
      ]) ||
      u?.displayName?.trim() ||
      u?.email?.trim() ||
      ''
    );
  });

  readonly gstinDisplay = computed(() => {
    const p = this.profile();
    const raw = pickProfileString(p, [
      'GSTIN',
      'gstin',
      'tinGstNo',
      'organizationGstin',
      'Gstin',
    ]);
    return raw ? raw.toUpperCase() : '—';
  });

  constructor() {
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
      .subscribe((d) => {
        const p = d as Record<string, unknown> | undefined;
        this.profile.set(p);
        const fy = this.readFinancialYearKey();
        console.debug('[home] user profile fetch', {
          fyKeyActive: fy,
          hasProfile: !!p,
          userType: p?.['userType'],
          status: p?.['status'],
          isRolesAdded: p?.['isRolesAdded'],
        });
      });

    merge(
      toObservable(this.authStore.user),
      this.route.queryParamMap,
    )
      .pipe(
        switchMap(() => {
          const user = this.authStore.user();
          if (!user?.id) {
            return of(undefined);
          }
          const fy = this.readFinancialYearKey();
          if (!fy) {
            console.debug('[home] user_dashboard_fy skipped — no FY in storage');
            return of(undefined);
          }
          console.debug('[home] subscribing dashboard row', {
            userId: user.id,
            fyKey: fy,
          });
          return this.userDashboard.watchDashboard(user.id, fy).pipe(
            catchError(() => of(undefined)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((d) => {
        this.dashboard.set(d as Record<string, unknown> | undefined);
        console.debug('[home] user_dashboard_fy row', {
          fyKey: this.readFinancialYearKey(),
          row: d,
        });
      });
  }

  dashboardCount(field: string): number {
    const raw = this.dashboard()?.[field];
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  private readFinancialYearKey(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const fromQuery = this.route.snapshot.queryParamMap.get('fy');
    if (fromQuery) {
      globalThis.sessionStorage?.setItem('financialYear', fromQuery);
      globalThis.localStorage?.setItem('fy', fromQuery);
      return fromQuery;
    }
    return (
      globalThis.sessionStorage?.getItem('financialYear') ??
      globalThis.localStorage?.getItem('fy') ??
      '2021-2022'
    );
  }
}
