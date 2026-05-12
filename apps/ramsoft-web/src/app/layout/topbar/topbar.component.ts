import {
  ChangeDetectionStrategy,
  Component,
  inject,
  PLATFORM_ID,
  signal,
  computed,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthStore, type AppUser } from '@ramsoft-builder/auth/data-access/auth';

@Component({
  standalone: true,
  selector: 'app-topbar',
  imports: [RouterLink],
  templateUrl: './topbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  readonly authStore = inject(AuthStore);

  readonly menuOpen = signal(false);
  readonly mobileMenuOpen = signal(false);

  readonly fy = signal<string | null>(null);

  readonly displayName = computed(() => {
    const user = this.authStore.user() as AppUser | null;
    if (!user) {
      return '';
    }
    return (
      user.displayName?.trim() ||
      user.email?.split('@')[0]?.trim() ||
      'User'
    );
  });

  readonly avatarUrl = computed(() => {
    const user = this.authStore.user() as AppUser | null;
    return user?.photoUrl ?? null;
  });

  readonly avatarInitial = computed(() => {
    const name = this.displayName();
    return name ? name.charAt(0).toUpperCase() : '?';
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.fy.set(globalThis.localStorage?.getItem('fy'));
    }
  }

  toggleUserMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  navigateTo(path: string): void {
    void this.router.navigateByUrl(path);
    this.mobileMenuOpen.set(false);
  }

  async logout(): Promise<void> {
    this.menuOpen.set(false);
    this.mobileMenuOpen.set(false);
    const ok = isPlatformBrowser(this.platformId)
      ? globalThis.confirm(
          'Are you sure you want to sign out of your account?',
        )
      : false;
    if (!ok) {
      return;
    }
    await this.authStore.logout();
    await this.router.navigateByUrl('/login');
  }
}
