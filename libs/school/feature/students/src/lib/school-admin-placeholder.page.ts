import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  standalone: true,
  selector: 'lib-school-admin-placeholder-page',
  template: `
    <section class="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
      <h2 class="text-lg font-semibold text-slate-900">{{ title }}</h2>
      <p class="mt-2 text-sm text-slate-500">This section is coming soon.</p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchoolAdminPlaceholderPageComponent {
  private readonly route = inject(ActivatedRoute);

  readonly title =
    (this.route.snapshot.data['title'] as string | undefined) ?? 'Coming soon';
}
