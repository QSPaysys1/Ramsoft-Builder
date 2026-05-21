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
        path: 'gstr1a-b2cs/:gstin/:retPeriod',
        loadComponent: () =>
          import('./pages/gstr1a-b2cs-section.page').then(
            (m) => m.Gstr1aB2csSectionPageComponent,
          ),
      },
      {
        path: 'gstr1a-nil/:gstin/:retPeriod',
        loadComponent: () =>
          import('./pages/gstr1a-nil-section.page').then(
            (m) => m.Gstr1aNilSectionPageComponent,
          ),
      },
      {
        path: 'gstr1a-cdnr/:gstin/:retPeriod',
        loadComponent: () =>
          import('./pages/gstr1a-cdnr-section.page').then(
            (m) => m.Gstr1aCdnrSectionPageComponent,
          ),
      },
      {
        path: 'gstr1a-cdnur/:gstin/:retPeriod',
        loadComponent: () =>
          import('./pages/gstr1a-cdnur-section.page').then(
            (m) => m.Gstr1aCdnurSectionPageComponent,
          ),
      },
      {
        path: 'gstr1a-at/:gstin/:retPeriod',
        loadComponent: () =>
          import('./pages/gstr1a-at-section.page').then(
            (m) => m.Gstr1aAtSectionPageComponent,
          ),
      },
      {
        path: 'gstr1a-at/:gstin/:retPeriod/add-statewise',
        loadComponent: () =>
          import('./pages/gstr1a-at-add-statewise.page').then(
            (m) => m.Gstr1aAtAddStatewisePageComponent,
          ),
      },
      {
        path: 'gstr1a-hsn/:gstin/:retPeriod',
        loadComponent: () =>
          import('./pages/gstr1a-hsn-section.page').then(
            (m) => m.Gstr1aHsnSectionPageComponent,
          ),
      },
      {
        path: 'gstr1a-view',
        loadComponent: () =>
          import('./pages/gstr1a-view.page').then((m) => m.Gstr1aViewPageComponent),
      },
      {
        path: 'gstr2a-view',
        loadComponent: () =>
          import('./pages/gstr2a-view.page').then((m) => m.Gstr2aViewPageComponent),
      },
      {
        path: 'gstr2b-view',
        loadComponent: () =>
          import('./pages/gstr2b-view.page').then((m) => m.Gstr2bViewPageComponent),
      },
      {
        path: 'gstr3b-view',
        loadComponent: () =>
          import('./pages/gstr3b-view.page').then((m) => m.Gstr3bViewPageComponent),
      },
      {
        path: 'gstr3b-sup-details',
        loadComponent: () =>
          import('./pages/gstr3b-sup-details.page').then(
            (m) => m.Gstr3bSupDetailsPageComponent,
          ),
      },
      {
        path: 'gstr3b-eco-details',
        loadComponent: () =>
          import('./pages/gstr3b-eco-details.page').then(
            (m) => m.Gstr3bEcoDetailsPageComponent,
          ),
      },
      {
        path: 'gstr3b-inter-sup-details',
        loadComponent: () =>
          import('./pages/gstr3b-inter-sup-details.page').then(
            (m) => m.Gstr3bInterSupDetailsPageComponent,
          ),
      },
      {
        path: 'gstr3b-itc-details',
        loadComponent: () =>
          import('./pages/gstr3b-itc-details.page').then(
            (m) => m.Gstr3bItcDetailsPageComponent,
          ),
      },
      {
        path: 'gstr3b-inward-sup-details',
        loadComponent: () =>
          import('./pages/gstr3b-inward-sup-details.page').then(
            (m) => m.Gstr3bInwardSupDetailsPageComponent,
          ),
      },
      {
        path: 'gstr3b-intr-ltfee-details',
        loadComponent: () =>
          import('./pages/gstr3b-intr-ltfee-details.page').then(
            (m) => m.Gstr3bIntrLtfeeDetailsPageComponent,
          ),
      },
      {
        path: 'gstr3b-payment-details',
        loadComponent: () =>
          import('./pages/gstr3b-payment-details.page').then(
            (m) => m.Gstr3bPaymentDetailsPageComponent,
          ),
      },
      {
        path: 'gstr2a-b2b',
        loadComponent: () =>
          import('./pages/gstr2a-b2b.page').then((m) => m.Gstr2aB2bPageComponent),
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
