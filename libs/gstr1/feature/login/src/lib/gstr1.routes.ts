import { Routes } from '@angular/router';
import { gstr1AuthGuard } from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { returnsDashboardRoute } from './returns-dashboard.routes';
import { gstr1AuthRoutes } from './routes/gstr1-auth.routes';

export const gstr1Routes: Routes = [
  ...gstr1AuthRoutes,
  {
    path: 'workspace',
    loadComponent: () =>
      import('./pages/gstr1-workspace-layout.page').then(
        (m) => m.Gstr1WorkspaceLayoutPageComponent,
      ),
    canActivate: [gstr1AuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'returns-dashboard' },
      returnsDashboardRoute,
      {
        path: 'gstr1-download',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/gstr1-download-return.page').then(
                (m) => m.Gstr1DownloadReturnPageComponent,
              ),
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/add-b2b',
            loadComponent: () =>
              import('./pages/gstr1-b2b-add-record.page').then(
                (m) => m.Gstr1B2bAddRecordPageComponent,
              ),
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/add-b2cl',
            loadComponent: () =>
              import('./pages/gstr1-b2cl-add-record.page').then(
                (m) => m.Gstr1B2clAddRecordPageComponent,
              ),
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/add-exp',
            loadComponent: () =>
              import('./pages/gstr1-exp-add-record.page').then(
                (m) => m.Gstr1ExpAddRecordPageComponent,
              ),
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/add-b2cs',
            loadComponent: () =>
              import('./pages/gstr1-b2cs-add-record.page').then(
                (m) => m.Gstr1B2csAddRecordPageComponent,
              ),
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/add-nil',
            loadComponent: () =>
              import('./pages/gstr1-nil-supplies.page').then((m) => m.Gstr1NilSuppliesPageComponent),
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/add-cdnr',
            loadComponent: () =>
              import('./pages/gstr1-cdnr-add-record.page').then(
                (m) => m.Gstr1CdnrAddRecordPageComponent,
              ),
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/add-cdnur',
            loadComponent: () =>
              import('./pages/gstr1-cdnur-add-record.page').then(
                (m) => m.Gstr1CdnurAddRecordPageComponent,
              ),
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/add-at-statewise',
            loadComponent: () =>
              import('./pages/gstr1-at-add-statewise.page').then(
                (m) => m.Gstr1AtAddStatewisePageComponent,
              ),
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/add-txpd-statewise',
            loadComponent: () =>
              import('./pages/gstr1-txpd-add-statewise.page').then(
                (m) => m.Gstr1TxpdAddStatewisePageComponent,
              ),
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/add-hsn',
            loadComponent: () =>
              import('./pages/gstr1-hsn-summary-add.page').then(
                (m) => m.Gstr1HsnSummaryAddPageComponent,
              ),
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/documents-issued',
            loadComponent: () =>
              import('./pages/gstr1-documents-issued.page').then(
                (m) => m.Gstr1DocumentsIssuedPageComponent,
              ),
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/amend-ecoma',
            loadComponent: () =>
              import('./pages/gstr1a-route-redirect.page').then(
                (m) => m.Gstr1aRouteRedirectPageComponent,
              ),
            data: { gstr1aTarget: 'gstr1a-view', gstr1aAmendSuffix: 'amend-ecoma' },
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/supplies-eco',
            loadComponent: () =>
              import('./pages/gstr1-eco-supplies.page').then(
                (m) => m.Gstr1EcoSuppliesPageComponent,
              ),
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/amend-supecoa',
            loadComponent: () =>
              import('./pages/gstr1a-route-redirect.page').then(
                (m) => m.Gstr1aRouteRedirectPageComponent,
              ),
            data: { gstr1aTarget: 'gstr1a-view', gstr1aAmendSuffix: 'amend-supecoa' },
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/supplies-us-95',
            loadComponent: () =>
              import('./pages/gstr1-supplies-us-95.page').then(
                (m) => m.Gstr1SuppliesUs95PageComponent,
              ),
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/amend-b2b',
            loadComponent: () =>
              import('./pages/gstr1a-route-redirect.page').then(
                (m) => m.Gstr1aRouteRedirectPageComponent,
              ),
            data: { gstr1aTarget: 'gstr1a-view', gstr1aAmendSuffix: 'amend-b2b' },
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/amend-b2cla',
            loadComponent: () =>
              import('./pages/gstr1a-route-redirect.page').then(
                (m) => m.Gstr1aRouteRedirectPageComponent,
              ),
            data: { gstr1aTarget: 'gstr1a-view', gstr1aAmendSuffix: 'amend-b2cla' },
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/amend-exp',
            loadComponent: () =>
              import('./pages/gstr1a-route-redirect.page').then(
                (m) => m.Gstr1aRouteRedirectPageComponent,
              ),
            data: { gstr1aTarget: 'gstr1a-view', gstr1aAmendSuffix: 'amend-exp' },
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/amend-cdnra',
            loadComponent: () =>
              import('./pages/gstr1a-route-redirect.page').then(
                (m) => m.Gstr1aRouteRedirectPageComponent,
              ),
            data: { gstr1aTarget: 'gstr1a-view', gstr1aAmendSuffix: 'amend-cdnra' },
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/amend-cdnura',
            loadComponent: () =>
              import('./pages/gstr1a-route-redirect.page').then(
                (m) => m.Gstr1aRouteRedirectPageComponent,
              ),
            data: { gstr1aTarget: 'gstr1a-view', gstr1aAmendSuffix: 'amend-cdnura' },
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/amend-b2csa',
            loadComponent: () =>
              import('./pages/gstr1a-route-redirect.page').then(
                (m) => m.Gstr1aRouteRedirectPageComponent,
              ),
            data: { gstr1aTarget: 'gstr1a-view', gstr1aAmendSuffix: 'amend-b2csa' },
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/amend-ata',
            loadComponent: () =>
              import('./pages/gstr1a-route-redirect.page').then(
                (m) => m.Gstr1aRouteRedirectPageComponent,
              ),
            data: { gstr1aTarget: 'gstr1a-view', gstr1aAmendSuffix: 'amend-ata' },
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/amend-txpa',
            loadComponent: () =>
              import('./pages/gstr1a-route-redirect.page').then(
                (m) => m.Gstr1aRouteRedirectPageComponent,
              ),
            data: { gstr1aTarget: 'gstr1a-view', gstr1aAmendSuffix: 'amend-txpa' },
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod',
            loadComponent: () =>
              import('./pages/gstr1-return-section-details.page').then(
                (m) => m.Gstr1ReturnSectionDetailsPageComponent,
              ),
          },
        ],
      },
      {
        path: 'gstr1a-b2b/:gstin/:retPeriod',
        loadComponent: () =>
          import('./pages/gstr1a-route-redirect.page').then(
            (m) => m.Gstr1aRouteRedirectPageComponent,
          ),
        data: { gstr1aTarget: 'gstr1a-b2b' },
      },
      {
        path: 'gstr1a-b2cl/:gstin/:retPeriod',
        loadComponent: () =>
          import('./pages/gstr1a-route-redirect.page').then(
            (m) => m.Gstr1aRouteRedirectPageComponent,
          ),
        data: { gstr1aTarget: 'gstr1a-b2cl' },
      },
      {
        path: 'gstr1a-exp/:gstin/:retPeriod',
        loadComponent: () =>
          import('./pages/gstr1a-route-redirect.page').then(
            (m) => m.Gstr1aRouteRedirectPageComponent,
          ),
        data: { gstr1aTarget: 'gstr1a-exp' },
      },
      {
        path: 'gstr1a-b2cs/:gstin/:retPeriod',
        loadComponent: () =>
          import('./pages/gstr1a-route-redirect.page').then(
            (m) => m.Gstr1aRouteRedirectPageComponent,
          ),
        data: { gstr1aTarget: 'gstr1a-b2cs' },
      },
      {
        path: 'gstr1a-nil/:gstin/:retPeriod',
        loadComponent: () =>
          import('./pages/gstr1a-route-redirect.page').then(
            (m) => m.Gstr1aRouteRedirectPageComponent,
          ),
        data: { gstr1aTarget: 'gstr1a-nil' },
      },
      {
        path: 'gstr1a-cdnr/:gstin/:retPeriod',
        loadComponent: () =>
          import('./pages/gstr1a-route-redirect.page').then(
            (m) => m.Gstr1aRouteRedirectPageComponent,
          ),
        data: { gstr1aTarget: 'gstr1a-cdnr' },
      },
      {
        path: 'gstr1a-cdnur/:gstin/:retPeriod',
        loadComponent: () =>
          import('./pages/gstr1a-route-redirect.page').then(
            (m) => m.Gstr1aRouteRedirectPageComponent,
          ),
        data: { gstr1aTarget: 'gstr1a-cdnur' },
      },
      {
        path: 'gstr1a-at/:gstin/:retPeriod',
        loadComponent: () =>
          import('./pages/gstr1a-route-redirect.page').then(
            (m) => m.Gstr1aRouteRedirectPageComponent,
          ),
        data: { gstr1aTarget: 'gstr1a-at' },
      },
      {
        path: 'gstr1a-at/:gstin/:retPeriod/add-statewise',
        loadComponent: () =>
          import('./pages/gstr1a-route-redirect.page').then(
            (m) => m.Gstr1aRouteRedirectPageComponent,
          ),
        data: { gstr1aTarget: 'gstr1a-at' },
      },
      {
        path: 'gstr1a-hsn/:gstin/:retPeriod',
        loadComponent: () =>
          import('./pages/gstr1a-route-redirect.page').then(
            (m) => m.Gstr1aRouteRedirectPageComponent,
          ),
        data: { gstr1aTarget: 'gstr1a-hsn' },
      },
      {
        path: 'gstr1a-view',
        loadComponent: () =>
          import('./pages/gstr1a-route-redirect.page').then(
            (m) => m.Gstr1aRouteRedirectPageComponent,
          ),
        data: { gstr1aTarget: 'gstr1a-view' },
      },
      {
        path: 'gstr2a-view',
        loadComponent: () =>
          import('./pages/gstr2a-route-redirect.page').then(
            (m) => m.Gstr2aRouteRedirectPageComponent,
          ),
        data: { gstr2aTarget: 'hub' },
      },
      {
        path: 'gstr2b-view',
        loadComponent: () =>
          import('./pages/gstr2b-view.page').then((m) => m.Gstr2bViewPageComponent),
      },
      {
        path: 'gstr3b-view',
        loadComponent: () =>
          import('./pages/gstr3b-route-redirect.page').then(
            (m) => m.Gstr3bRouteRedirectPageComponent,
          ),
        data: { gstr3bTarget: 'summary' },
      },
      {
        path: 'gstr3b-sup-details',
        loadComponent: () =>
          import('./pages/gstr3b-route-redirect.page').then(
            (m) => m.Gstr3bRouteRedirectPageComponent,
          ),
        data: { gstr3bTarget: 'outward-supplies' },
      },
      {
        path: 'gstr3b-eco-details',
        loadComponent: () =>
          import('./pages/gstr3b-route-redirect.page').then(
            (m) => m.Gstr3bRouteRedirectPageComponent,
          ),
        data: { gstr3bTarget: 'outward-supplies/eco' },
      },
      {
        path: 'gstr3b-inter-sup-details',
        loadComponent: () =>
          import('./pages/gstr3b-route-redirect.page').then(
            (m) => m.Gstr3bRouteRedirectPageComponent,
          ),
        data: { gstr3bTarget: 'outward-supplies/inter' },
      },
      {
        path: 'gstr3b-itc-details',
        loadComponent: () =>
          import('./pages/gstr3b-route-redirect.page').then(
            (m) => m.Gstr3bRouteRedirectPageComponent,
          ),
        data: { gstr3bTarget: 'itc' },
      },
      {
        path: 'gstr3b-inward-sup-details',
        loadComponent: () =>
          import('./pages/gstr3b-route-redirect.page').then(
            (m) => m.Gstr3bRouteRedirectPageComponent,
          ),
        data: { gstr3bTarget: 'inward-supplies' },
      },
      {
        path: 'gstr3b-intr-ltfee-details',
        loadComponent: () =>
          import('./pages/gstr3b-route-redirect.page').then(
            (m) => m.Gstr3bRouteRedirectPageComponent,
          ),
        data: { gstr3bTarget: 'interest-late-fee' },
      },
      {
        path: 'gstr3b-payment-details',
        loadComponent: () =>
          import('./pages/gstr3b-route-redirect.page').then(
            (m) => m.Gstr3bRouteRedirectPageComponent,
          ),
        data: { gstr3bTarget: 'payment-tax' },
      },
      {
        path: 'gstr2a-b2b',
        loadComponent: () =>
          import('./pages/gstr2a-route-redirect.page').then(
            (m) => m.Gstr2aRouteRedirectPageComponent,
          ),
        data: { gstr2aTarget: 'b2b' },
      },
      {
        path: 'gstr2a-b2ba',
        loadComponent: () =>
          import('./pages/gstr2a-b2ba.page').then(
            (m) => m.Gstr2aB2baPageComponent,
          ),
      },
      {
        path: 'gstr2a-eco',
        loadComponent: () =>
          import('./pages/gstr2a-eco.page').then(
            (m) => m.Gstr2aEcoPageComponent,
          ),
      },
      {
        path: 'gstr2a-ecoa',
        loadComponent: () =>
          import('./pages/gstr2a-ecoa.page').then(
            (m) => m.Gstr2aEcomaPageComponent,
          ),
      },
      {
        path: 'gstr2a-isd',
        loadComponent: () =>
          import('./pages/gstr2a-isd.page').then((m) => m.Gstr2aIsdPageComponent),
        data: { isdSection: 'isd' },
      },
      {
        path: 'gstr2a-isda',
        loadComponent: () =>
          import('./pages/gstr2a-isd.page').then((m) => m.Gstr2aIsdPageComponent),
        data: { isdSection: 'isda' },
      },
      {
        path: 'gstr2a-tds',
        loadComponent: () =>
          import('./pages/gstr2a-tds-tcs.page').then((m) => m.Gstr2aTdsTcsPageComponent),
        data: { tdsTcsSection: 'tds' },
      },
      {
        path: 'gstr2a-tdsa',
        loadComponent: () =>
          import('./pages/gstr2a-tds-tcs.page').then((m) => m.Gstr2aTdsTcsPageComponent),
        data: { tdsTcsSection: 'tdsa' },
      },
      {
        path: 'gstr2a-tcs',
        loadComponent: () =>
          import('./pages/gstr2a-tds-tcs.page').then((m) => m.Gstr2aTdsTcsPageComponent),
        data: { tdsTcsSection: 'tcs' },
      },
      {
        path: 'gstr2a-impg',
        loadComponent: () =>
          import('./pages/gstr2a-impg.page').then((m) => m.Gstr2aImpgPageComponent),
      },
      {
        path: 'gstr2a-impgsez',
        loadComponent: () =>
          import('./pages/gstr2a-impgsez.page').then((m) => m.Gstr2aImpgsezPageComponent),
      },
      {
        path: 'gstr2a-cdna',
        loadComponent: () =>
          import('./pages/gstr2a-cdna.page').then(
            (m) => m.Gstr2aCdnaPageComponent,
          ),
      },
      {
        path: 'gstr2a-cdn',
        loadComponent: () =>
          import('./pages/gstr2a-cdn.page').then((m) => m.Gstr2aCdnPageComponent),
      },
      {
        path: 'gstr2a-cdn-notes',
        loadComponent: () =>
          import('./pages/gstr2a-cdn-notes.page').then((m) => m.Gstr2aCdnNotesPageComponent),
      },
      {
        path: 'gstr2a-cdn-note-detail',
        loadComponent: () =>
          import('./pages/gstr2a-cdn-note-detail.page').then(
            (m) => m.Gstr2aCdnNoteDetailPageComponent,
          ),
      },
      {
        path: 'session',
        loadComponent: () =>
          import('./pages/gstr1-workspace-session.page').then(
            (m) => m.Gstr1WorkspaceSessionPageComponent,
          ),
      },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'workspace' },
];
