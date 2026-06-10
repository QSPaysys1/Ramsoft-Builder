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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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

type BadgeVariant = 'green' | 'red' | 'blue' | 'neutral';
type MenuIcon =
  | 'invoice'
  | 'cancelled'
  | 'ewaybill'
  | 'document'
  | 'search'
  | 'truck'
  | 'location'
  | 'building'
  | 'graduation'
  | 'upload';

interface AiToolCard {
  id: string;
  title: string;
  description: string;
  icon: MenuIcon;
  iconColor: string;
}

interface ApplicationCard {
  id: string;
  title: string;
  description: string;
  icon: MenuIcon;
  iconColor: string;
  route: string;
}

interface GstModuleCard {
  id: string;
  route: string;
  title: string;
  subtitle: string;
  icon: MenuIcon;
  countField?: string;
  badgeVariant?: BadgeVariant;
  badgeText?: string;
}

type QuickActionAccent =
  | 'slate'
  | 'indigo'
  | 'blue'
  | 'sky'
  | 'teal'
  | 'cyan'
  | 'emerald'
  | 'amber'
  | 'violet'
  | 'dark';

interface QuickAction {
  route: string;
  label: string;
  accent: QuickActionAccent;
  primary?: boolean;
}

interface StatCard {
  label: string;
  count: number;
  accent: string;
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
  private readonly router = inject(Router);
  private readonly userProfile = inject(UserProfileRepository);
  private readonly userDashboard = inject(UserDashboardRepository);
  readonly authStore = inject(AuthStore);

  readonly aiTools: readonly AiToolCard[] = [
    {
      id: 'notes-ai',
      title: 'Notes AI',
      description: 'Create notes using AI text editor',
      icon: 'document',
      iconColor: 'text-indigo-600',
    },
    {
      id: 'audio-to-text',
      title: 'Audio to Text',
      description: 'Upload audio and convert speech into text',
      icon: 'search',
      iconColor: 'text-violet-600',
    },
    {
      id: 'video-to-text',
      title: 'Video to Text',
      description: 'Upload video and extract transcript',
      icon: 'document',
      iconColor: 'text-sky-600',
    },
    {
      id: 'summarizer',
      title: 'Summarizer',
      description: 'Convert long text into summary',
      icon: 'document',
      iconColor: 'text-emerald-600',
    },
    {
      id: 'translate',
      title: 'Translate Notes',
      description: 'Convert content into selected language',
      icon: 'document',
      iconColor: 'text-amber-600',
    },
  ];

  readonly applications: readonly ApplicationCard[] = [
    {
      id: 'school-management',
      title: 'School Management',
      description: 'Manage schools, classes, students, and staff',
      icon: 'graduation',
      iconColor: 'text-teal-600',
      route: '/school-management/hub/home',
    },
    {
      id: 'upload',
      title: 'Upload Files',
      description: 'Upload images and files to Cloudflare storage',
      icon: 'upload',
      iconColor: 'text-indigo-600',
      route: '/upload',
    },
  ];

  readonly gstModules: readonly GstModuleCard[] = [
    {
      id: 'einvoices',
      route: '/e-invoices/einvoiceslist',
      title: 'E-Invoices',
      subtitle: 'View and manage invoices',
      icon: 'invoice',
      countField: 'invoices',
      badgeVariant: 'green',
    },
    {
      id: 'cancelled',
      route: '/e-invoices/cancelledeinvoices',
      title: 'Cancelled Invoices',
      subtitle: 'Review cancelled records',
      icon: 'cancelled',
      countField: 'cinvoices',
      badgeVariant: 'red',
    },
    {
      id: 'ewaybills',
      route: '/ewaybills/list',
      title: 'E-waybills',
      subtitle: 'Track generated e-way bills',
      icon: 'ewaybill',
      countField: 'ewaybills',
      badgeVariant: 'red',
    },
    {
      id: 'gstr1',
      route: '/gstr1',
      title: 'GSTR-1 (GSTZen)',
      subtitle: 'File and review returns',
      icon: 'document',
      badgeVariant: 'blue',
      badgeText: 'Connect',
    },
    {
      id: 'create-irn',
      route: '/e-invoice/create',
      title: 'GSTZen e-invoice (IRN)',
      subtitle: 'Enterprise create flow',
      icon: 'invoice',
    },
    {
      id: 'get-irn',
      route: '/e-invoice/get-by-irn',
      title: 'Get e-invoice by IRN',
      subtitle: 'GSTZen geteinv',
      icon: 'search',
    },
    {
      id: 'get-ewb',
      route: '/ewaybills/get',
      title: 'Get e-way bill',
      subtitle: 'GSTZen · ewbNo',
      icon: 'search',
    },
    {
      id: 'transporter-ewb',
      route: '/ewaybills/transporter-view',
      title: 'Transporter EWB view',
      subtitle: 'GSTZen · date + gstin',
      icon: 'truck',
    },
    {
      id: 'transporter-state',
      route: '/ewaybills/transporter-state-view',
      title: 'Transporter state view',
      subtitle: 'GSTZen · date + state + gstin',
      icon: 'location',
    },
    {
      id: 'transporter-gstin',
      route: '/ewaybills/transporter-gstin-view',
      title: 'Transporter GSTIN view',
      subtitle: 'GSTZen · date + gstin + gen_gstin',
      icon: 'building',
    },
    {
      id: 'create-irn-ewb',
      route: '/e-invoice/create-ewaybill',
      title: 'GSTZen e-invoice + e-way bill',
      subtitle: 'IRN and EWB together',
      icon: 'ewaybill',
    },
  ];

  readonly ewayQuickActions: readonly QuickAction[] = [
    { route: '/ewaybills/get', label: 'Get E-Way Bill', accent: 'slate' },
    {
      route: '/ewaybills/transporter-view',
      label: 'Transporter view',
      accent: 'indigo',
    },
    {
      route: '/ewaybills/transporter-state-view',
      label: 'Transporter state view',
      accent: 'blue',
    },
    {
      route: '/ewaybills/transporter-gstin-view',
      label: 'Transporter GSTIN view',
      accent: 'sky',
    },
    { route: '/ewaybills/extend', label: 'Extend EWB', accent: 'teal' },
    {
      route: '/ewaybills/multi-vehicle',
      label: 'Multi-vehicle',
      accent: 'cyan',
    },
    {
      route: '/ewaybills/add-multi-vehicles',
      label: 'Add multi-vehicles',
      accent: 'emerald',
    },
    {
      route: '/ewaybills/change-multi-vehicles',
      label: 'Change multi vehicles',
      accent: 'amber',
    },
    {
      route: '/ewaybills/update-part-b',
      label: 'Update Part-B',
      accent: 'sky',
    },
    {
      route: '/ewaybills/update-transporter',
      label: 'Update transporter',
      accent: 'violet',
    },
    {
      route: '/ewaybills/create',
      label: 'Create E-Way Bill',
      accent: 'dark',
    },
    {
      route: '/e-invoices/create',
      label: 'Create E-Invoice',
      accent: 'dark',
      primary: true,
    },
  ];

  quickActionIconClass(action: QuickAction): string {
    if (action.primary) {
      return 'quick-action__icon quick-action__icon--primary';
    }
    return `quick-action__icon quick-action__icon--${action.accent}`;
  }

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
      'Welcome'
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

  readonly statCards = computed((): StatCard[] => [
    {
      label: 'E-Invoices',
      count: this.dashboardCount('invoices'),
      accent: 'text-emerald-600',
    },
    {
      label: 'Cancelled',
      count: this.dashboardCount('cinvoices'),
      accent: 'text-red-600',
    },
    {
      label: 'E-Way Bills',
      count: this.dashboardCount('ewaybills'),
      accent: 'text-rose-600',
    },
  ]);

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
        this.profile.set(d as Record<string, unknown> | undefined);
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
            return of(undefined);
          }
          return this.userDashboard.watchDashboard(user.id, fy).pipe(
            catchError(() => of(undefined)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((d) => {
        this.dashboard.set(d as Record<string, unknown> | undefined);
      });
  }

  dashboardCount(field: string): number {
    const raw = this.dashboard()?.[field];
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  openAiTool(id: string): void {
    const routes: Record<string, string[]> = {
      'notes-ai': ['/notes-ai/create'],
      'audio-to-text': ['/audio-to-text/create'],
      'video-to-text': ['/video-to-text/create'],
      summarizer: ['/summarizer/create'],
      translate: ['/translate/create'],
    };
    const path = routes[id];
    if (path) {
      void this.router.navigate(path);
    }
  }

  badgeClass(variant: BadgeVariant | undefined): string {
    switch (variant) {
      case 'green':
        return 'home-badge home-badge--green';
      case 'red':
        return 'home-badge home-badge--red';
      case 'blue':
        return 'home-badge home-badge--blue';
      default:
        return 'home-badge home-badge--neutral';
    }
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
