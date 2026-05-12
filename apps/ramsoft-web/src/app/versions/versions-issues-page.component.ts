import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-versions-issues-page',
  template: `
    <div class="mx-auto max-w-3xl p-8">
      <h1 class="text-2xl font-semibold text-gray-900">Issues</h1>
      <p class="mt-2 text-gray-600">Tracked issues and support requests will appear here.</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VersionsIssuesPageComponent {}
