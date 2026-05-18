import { Routes } from '@angular/router';
import {
  gstr1AuthGuard,
  gstr1LoginRedirectGuard,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { returnsDashboardRoute } from './returns-dashboard.routes';

export const gstr1Routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/gstr1-login.page').then((m) => m.Gstr1LoginPageComponent),
    canActivate: [gstr1LoginRedirectGuard],
  },
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
              import('./pages/gstr1-ecoma-amend-record.page').then(
                (m) => m.Gstr1EcomaAmendRecordPageComponent,
              ),
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
              import('./pages/gstr1-supecoa-amend-record.page').then(
                (m) => m.Gstr1SupecoaAmendRecordPageComponent,
              ),
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
              import('./pages/gstr1-b2ba-amend-record.page').then(
                (m) => m.Gstr1B2baAmendRecordPageComponent,
              ),
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/amend-b2cla',
            loadComponent: () =>
              import('./pages/gstr1-b2cla-amend-record.page').then(
                (m) => m.Gstr1B2claAmendRecordPageComponent,
              ),
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/amend-exp',
            loadComponent: () =>
              import('./pages/gstr1-expa-amend-record.page').then(
                (m) => m.Gstr1ExpaAmendRecordPageComponent,
              ),
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/amend-cdnra',
            loadComponent: () =>
              import('./pages/gstr1-cdnra-amend-record.page').then(
                (m) => m.Gstr1CdnraAmendRecordPageComponent,
              ),
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/amend-cdnura',
            loadComponent: () =>
              import('./pages/gstr1-cdnura-amend-record.page').then(
                (m) => m.Gstr1CdnuraAmendRecordPageComponent,
              ),
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/amend-b2csa',
            loadComponent: () =>
              import('./pages/gstr1-b2csa-amend-record.page').then(
                (m) => m.Gstr1B2csaAmendRecordPageComponent,
              ),
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/amend-ata',
            loadComponent: () =>
              import('./pages/gstr1-ata-amend-record.page').then(
                (m) => m.Gstr1AtaAmendRecordPageComponent,
              ),
          },
          {
            path: 'section/:apiName/:gstin/:retPeriod/amend-txpa',
            loadComponent: () =>
              import('./pages/gstr1-txpa-amend-record.page').then(
                (m) => m.Gstr1TxpaAmendRecordPageComponent,
              ),
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
          import('./pages/gstr1a-b2b-section.page').then(
            (m) => m.Gstr1aB2bSectionPageComponent,
          ),
      },
      {
        path: 'gstr1a-b2cl/:gstin/:retPeriod',
        loadComponent: () =>
          import('./pages/gstr1a-b2cl-section.page').then(
            (m) => m.Gstr1aB2clSectionPageComponent,
          ),
      },
      {
        path: 'gstr1a-exp/:gstin/:retPeriod',
        loadComponent: () =>
          import('./pages/gstr1a-exp-section.page').then(
            (m) => m.Gstr1aExpSectionPageComponent,
          ),
      },
      {
        path: 'gstr1a-view',
        loadComponent: () =>
          import('./pages/gstr1a-view.page').then((m) => m.Gstr1aViewPageComponent),
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
  {
    path: 'gstn/generate-otp',
    loadComponent: () =>
      import('./pages/gstr1-gstn-generate-otp.page').then(
        (m) => m.Gstr1GstnGenerateOtpPageComponent,
      ),
    canActivate: [gstr1AuthGuard],
  },
  {
    path: 'gstn/return-status',
    loadComponent: () =>
      import('./pages/gstr1-gstn-return-status.page').then(
        (m) => m.Gstr1GstnReturnStatusPageComponent,
      ),
    canActivate: [gstr1AuthGuard],
  },
  {
    path: 'gstn/view-track-returns',
    loadComponent: () =>
      import('./pages/gstr1-gstn-view-track-returns.page').then(
        (m) => m.Gstr1GstnViewTrackReturnsPageComponent,
      ),
    canActivate: [gstr1AuthGuard],
  },
  { path: '', pathMatch: 'full', redirectTo: 'workspace' },
];
