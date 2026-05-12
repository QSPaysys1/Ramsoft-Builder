import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-versions-page',
  template: `
    <div class="mx-auto max-w-3xl p-8">
      <h1 class="text-2xl font-semibold text-gray-900">Versions</h1>
      <p class="mt-2 text-gray-600">Release notes and version history will appear here.</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VersionsPageComponent {}
