import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Gstr1aFilingWorkflowHandler } from './gstr1a-filing-workflow.handler';

@Component({
  selector: 'lib-gstr1a-filing-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="p-4">
      <a routerLink="/gstr1a/hub" class="text-sm text-blue-700">← GSTR-1A</a>
      <h1 class="mt-2 text-lg font-semibold">Filing</h1>
      <p class="text-sm text-slate-600">Workflow state: {{ workflow.state() }}</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr1aFilingPageComponent {
  readonly workflow = inject(Gstr1aFilingWorkflowHandler);
}
