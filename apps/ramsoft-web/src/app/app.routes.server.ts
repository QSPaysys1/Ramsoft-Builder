import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'e-invoices/einvoice/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'gstr1/workspace/gstr1-download/section/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'gstr1/workspace/gstr1a-b2b/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'gstr1/workspace/gstr1a-b2cl/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'gstr1/workspace/gstr1a-exp/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'gstr1/workspace/gstr1a-b2cs/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'gstr1/workspace/gstr1a-nil/**',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
