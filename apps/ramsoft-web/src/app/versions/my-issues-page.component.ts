import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-my-issues-page',
  template: `
    <div class="mx-auto max-w-3xl p-8">
      <h1 class="text-2xl font-semibold text-gray-900">My Issues</h1>
      <p class="mt-2 text-gray-600">Issues assigned to you will appear here.</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyIssuesPageComponent {}
