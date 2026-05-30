import { Routes } from '@angular/router';

export const notesAiRoutes: Routes = [
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/notes-ai-create.page').then(
        (m) => m.NotesAiCreatePageComponent,
      ),
  },
  { path: '', pathMatch: 'full', redirectTo: 'create' },
];

export const audioToTextRoutes: Routes = [
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/placeholder-create.page').then(
        (m) => m.PlaceholderCreatePageComponent,
      ),
    data: { toolName: 'Audio to Text' },
  },
  { path: '', pathMatch: 'full', redirectTo: 'create' },
];

export const videoToTextRoutes: Routes = [
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/placeholder-create.page').then(
        (m) => m.PlaceholderCreatePageComponent,
      ),
    data: { toolName: 'Video to Text' },
  },
  { path: '', pathMatch: 'full', redirectTo: 'create' },
];

export const summarizerRoutes: Routes = [
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/placeholder-create.page').then(
        (m) => m.PlaceholderCreatePageComponent,
      ),
    data: { toolName: 'Summarizer' },
  },
  { path: '', pathMatch: 'full', redirectTo: 'create' },
];

export const translateRoutes: Routes = [
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/placeholder-create.page').then(
        (m) => m.PlaceholderCreatePageComponent,
      ),
    data: { toolName: 'Translate Notes' },
  },
  { path: '', pathMatch: 'full', redirectTo: 'create' },
];
