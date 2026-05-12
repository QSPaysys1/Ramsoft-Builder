import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopbarComponent } from './topbar/topbar.component';

@Component({
  standalone: true,
  selector: 'app-shell',
  imports: [TopbarComponent, RouterOutlet],
  template: `
    <div class="min-h-screen bg-slate-50">
      <app-topbar />
      <main class="pt-14">
        <router-outlet />
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {}
