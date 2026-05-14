import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Gstr1GstnCheckSessionModalComponent } from './gstr1-gstn-check-session.modal';
import { Gstr1GstnRefreshSessionModalComponent } from './gstr1-gstn-refresh-session.modal';
import { AuthToastService } from '@ramsoft-builder/auth/ui/login';
import { Gstr1AuthStore } from '@ramsoft-builder/gstr1/data-access/gstzen-auth';

@Component({
  selector: 'lib-gstr1-workspace-page',
  standalone: true,
  imports: [RouterLink, DatePipe, Gstr1GstnCheckSessionModalComponent, Gstr1GstnRefreshSessionModalComponent],
  templateUrl: './gstr1-workspace.page.html',
  host: {
    class:
      'block min-h-[60vh] bg-blue-50 px-4 py-8 md:px-8',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr1WorkspacePageComponent {
  private readonly router = inject(Router);
  private readonly toast = inject(AuthToastService);
  readonly gstr1Auth = inject(Gstr1AuthStore);

  readonly checkSessionModalOpen = signal(false);
  readonly refreshSessionModalOpen = signal(false);

  readonly username = computed(() => this.gstr1Auth.username());
  readonly expiresAtMs = computed(() => this.gstr1Auth.expiresAtMs());
  readonly hasToken = computed(() => this.gstr1Auth.hasValidToken());
  readonly accessTokenText = computed(() => this.gstr1Auth.accessToken() ?? '');
  readonly refreshTokenText = computed(() => this.gstr1Auth.refreshToken() ?? '');

  openCheckSessionModal(): void {
    this.checkSessionModalOpen.set(true);
  }

  closeCheckSessionModal(): void {
    this.checkSessionModalOpen.set(false);
  }

  closeRefreshSessionModal(): void {
    this.refreshSessionModalOpen.set(false);
  }

  openRefreshSessionModal(): void {
    this.refreshSessionModalOpen.set(true);
  }

  logout(): void {
    this.gstr1Auth.logout();
    void this.router.navigateByUrl('/gstr1/login', { replaceUrl: true });
  }

  async copyAccessToken(): Promise<void> {
    const ok = await this.gstr1Auth.copyAccessTokenToClipboard();
    this.toast.show(
      ok ? 'success' : 'error',
      ok ? 'Access token copied to clipboard.' : 'Could not copy access token.',
      5000,
    );
  }

  async copyRefreshToken(): Promise<void> {
    const ok = await this.gstr1Auth.copyRefreshTokenToClipboard();
    this.toast.show(
      ok ? 'success' : 'error',
      ok ? 'Refresh token copied to clipboard.' : 'Could not copy refresh token.',
      5000,
    );
  }
}
