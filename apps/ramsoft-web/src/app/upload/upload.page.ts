import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { UploadService, type UploadRow } from './upload.service';

const ACCEPTED =
  'image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip,.mp4,.mov,.webm,.mp3';

@Component({
  standalone: true,
  selector: 'app-upload-page',
  templateUrl: './upload.page.html',
  styleUrl: './upload.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadPageComponent {
  private readonly uploadService = inject(UploadService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly fileInput =
    viewChild<ElementRef<HTMLInputElement>>('fileInput');

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  readonly accept = ACCEPTED;

  readonly selectedFile = signal<File | null>(null);
  readonly dragOver = signal(false);
  readonly uploading = signal(false);
  readonly progress = signal(0);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly isImage = signal(false);
  readonly previewUrl = signal<string | null>(null);

  readonly uploads = signal<UploadRow[]>([]);
  readonly loadingUploads = signal(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.refreshUploads();
    }
    this.destroyRef.onDestroy(() => {
      if (this.toastTimer) {
        clearTimeout(this.toastTimer);
      }
    });
  }

  openFilePicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setFile(input.files?.[0] ?? null);
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    this.setFile(event.dataTransfer?.files?.[0] ?? null);
  }

  clear(): void {
    this.revokePreview();
    this.selectedFile.set(null);
    this.isImage.set(false);
    this.errorMessage.set('');
    this.progress.set(0);
  }

  startUpload(): void {
    const file = this.selectedFile();
    if (!file || this.uploading()) {
      return;
    }

    const name = file.name;
    this.uploading.set(true);
    this.progress.set(0);
    this.errorMessage.set('');

    this.uploadService
      .upload(file)
      .pipe(
        finalize(() => this.uploading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (event) => {
          if (event.kind === 'progress') {
            this.progress.set(event.progress);
          } else {
            this.progress.set(100);
            this.showToast(`"${name}" uploaded successfully.`);
            this.clear();
            this.refreshUploads();
          }
        },
        error: (err: unknown) => {
          this.errorMessage.set(
            err instanceof Error
              ? err.message
              : 'Upload failed. Please try again.',
          );
        },
      });
  }

  dismissToast(): void {
    this.successMessage.set('');
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
  }

  uploadUrl(row: UploadRow): string {
    return row.cloudflare_image_url ?? row.r2_public_url ?? '';
  }

  isImageRow(row: UploadRow): boolean {
    return row.storage_type === 'cloudflare_images';
  }

  /** Small, auto-format optimized thumbnail served by Cloudflare Images. */
  thumbUrl(row: UploadRow): string {
    return (
      this.optimizedImageUrl(row, 'width=128,height=128,fit=cover,quality=75,format=auto') ||
      this.uploadUrl(row)
    );
  }

  /** Larger optimized render for viewing (auto WebP/AVIF, capped width). */
  viewUrl(row: UploadRow): string {
    if (!this.isImageRow(row)) {
      return row.r2_public_url ?? '';
    }
    return (
      this.optimizedImageUrl(row, 'width=1600,fit=scale-down,quality=85,format=auto') ||
      this.uploadUrl(row)
    );
  }

  /** Falls back to the stored public URL if a transform URL fails (e.g. flexible variants disabled). */
  onThumbError(event: Event, row: UploadRow): void {
    const img = event.target as HTMLImageElement;
    const fallback = this.uploadUrl(row);
    if (fallback && img.src !== fallback) {
      img.src = fallback;
    }
  }

  formatBytes(bytes: number | null | undefined): string {
    if (bytes == null || !Number.isFinite(bytes)) {
      return '';
    }
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = bytes / 1024;
    let i = 0;
    while (value >= 1024 && i < units.length - 1) {
      value /= 1024;
      i += 1;
    }
    return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
  }

  /**
   * Builds a Cloudflare Images flexible-variant URL by swapping the trailing
   * variant segment of the stored delivery URL.
   * Pattern: `imagedelivery.net/<hash>/<id>/<transform>`.
   */
  private optimizedImageUrl(row: UploadRow, transform: string): string {
    const base = row.cloudflare_image_url;
    if (!base) {
      return '';
    }
    const idx = base.lastIndexOf('/');
    const root = idx > -1 ? base.slice(0, idx) : base;
    return `${root}/${transform}`;
  }

  private refreshUploads(): void {
    this.loadingUploads.set(true);
    this.uploadService
      .listUploads()
      .pipe(
        finalize(() => this.loadingUploads.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (rows) => this.uploads.set(rows),
        error: () => {
          // Listing is best-effort; keep the page usable on failure.
        },
      });
  }

  private showToast(message: string): void {
    this.successMessage.set(message);
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => this.successMessage.set(''), 4000);
  }

  private setFile(file: File | null): void {
    this.revokePreview();
    this.errorMessage.set('');
    this.progress.set(0);
    this.selectedFile.set(file);
    const image = !!file && file.type.startsWith('image/');
    this.isImage.set(image);
    this.previewUrl.set(image && file ? URL.createObjectURL(file) : null);
  }

  private revokePreview(): void {
    const url = this.previewUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.previewUrl.set(null);
    }
  }
}
