import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

export type AuthToastKind = 'info' | 'success' | 'error';

export interface AuthToastItem {
  id: number;
  kind: AuthToastKind;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AuthToastService {
  private readonly platformId = inject(PLATFORM_ID);
  private seq = 0;

  /** Active toasts (newest last). */
  readonly items = signal<AuthToastItem[]>([]);

  /**
   * @param durationMs Auto-dismiss after this many ms. Use `0` to keep until dismissed/cleared.
   * @returns toast id
   */
  show(kind: AuthToastKind, message: string, durationMs = 4500): number {
    const id = ++this.seq;
    this.items.update((list) => [...list, { id, kind, message }]);
    if (durationMs > 0 && isPlatformBrowser(this.platformId)) {
      globalThis.setTimeout(() => this.dismiss(id), durationMs);
    }
    return id;
  }

  dismiss(id: number): void {
    this.items.update((list) => list.filter((t) => t.id !== id));
  }

  clear(): void {
    this.items.set([]);
  }
}
