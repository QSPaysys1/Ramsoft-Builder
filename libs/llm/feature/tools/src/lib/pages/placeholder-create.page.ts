import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'lib-placeholder-create-page',
  imports: [RouterLink],
  template: `
    <div class="min-h-[calc(100vh-3.5rem)] bg-slate-50">
      <div class="mx-auto max-w-3xl px-4 py-8">
        <nav class="mb-6 text-sm text-slate-500" aria-label="Breadcrumb">
          <ol class="flex items-center gap-2">
            <li>
              <a routerLink="/home" class="hover:text-indigo-600">Home</a>
            </li>
            <li aria-hidden="true">/</li>
            <li class="font-medium text-slate-800" aria-current="page">
              {{ toolName() }}
            </li>
          </ol>
        </nav>
        <div
          class="rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <h1 class="text-2xl font-semibold text-slate-900">{{ toolName() }}</h1>
          <p class="mt-3 text-slate-600">Coming soon.</p>
          <a
            routerLink="/home"
            class="mt-6 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderCreatePageComponent {
  private readonly route = inject(ActivatedRoute);

  readonly toolName = () =>
    (this.route.snapshot.data['toolName'] as string) ?? 'AI Tool';
}
