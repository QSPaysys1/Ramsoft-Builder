import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LlmApiError, LlmService } from '@ramsoft-builder/llm/data-access/api';
import {
  LLM_LANGUAGES,
  type LlmLanguage,
} from '@ramsoft-builder/llm/models/api';
import { finalize } from 'rxjs';
import {
  detectUrlSource,
  isLlmLanguage,
  isSupportedAudioFile,
  isSupportedVideoFile,
  isValidHttpUrl,
} from '../llm-file.utils';

@Component({
  standalone: true,
  selector: 'lib-notes-ai-create-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './notes-ai-create.page.html',
  styleUrl: './notes-ai-create.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotesAiCreatePageComponent {
  private readonly llm = inject(LlmService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly audioInput =
    viewChild<ElementRef<HTMLInputElement>>('audioInput');
  private readonly videoInput =
    viewChild<ElementRef<HTMLInputElement>>('videoInput');

  readonly languages = LLM_LANGUAGES;

  readonly title = signal('');
  readonly editorText = signal('');
  readonly mediaUrl = signal('');
  readonly selectedLanguage = signal<LlmLanguage>('English');
  readonly audioFile = signal<File | null>(null);
  readonly videoFile = signal<File | null>(null);
  readonly generatedText = signal('');
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  onAddAudio(): void {
    this.audioInput()?.nativeElement.click();
  }

  onAddVideo(): void {
    this.videoInput()?.nativeElement.click();
  }

  onAudioSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (!isSupportedAudioFile(file)) {
      this.errorMessage.set('Unsupported file type. Please upload an audio file.');
      input.value = '';
      return;
    }
    this.audioFile.set(file);
    this.videoFile.set(null);
    this.errorMessage.set('');
    input.value = '';
  }

  onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (!isSupportedVideoFile(file)) {
      this.errorMessage.set('Unsupported file type. Please upload a video file.');
      input.value = '';
      return;
    }
    this.videoFile.set(file);
    this.audioFile.set(null);
    this.errorMessage.set('');
    input.value = '';
  }

  onLanguageChange(value: string): void {
    if (isLlmLanguage(value)) {
      this.selectedLanguage.set(value);
    }
  }

  generate(): void {
    const audio = this.audioFile();
    const video = this.videoFile();
    const url = this.mediaUrl().trim();
    const text = this.editorText().trim();
    const language = this.selectedLanguage();

    if (!url && !audio && !video && !text) {
      this.errorMessage.set(
        'Add a media URL, audio, video, or enter text to continue.',
      );
      return;
    }

    if (url && !isValidHttpUrl(url)) {
      this.errorMessage.set('Enter a valid http(s) URL (e.g. a YouTube link).');
      return;
    }

    if (audio && !isSupportedAudioFile(audio)) {
      this.errorMessage.set('Unsupported file type. Please upload an audio file.');
      return;
    }

    if (video && !isSupportedVideoFile(video)) {
      this.errorMessage.set('Unsupported file type. Please upload a video file.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const request$ = url
      ? this.llm.extractFromUrl({
          url,
          language,
          source: detectUrlSource(url),
        })
      : audio
        ? this.llm.uploadAudio(audio, language)
        : video
          ? this.llm.uploadVideo(video, language)
          : this.llm.generateText({
              text,
              language,
              title: this.title().trim() || undefined,
            });

    request$
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.generatedText.set(res.text);
        },
        error: (err: unknown) => {
          const message =
            err instanceof LlmApiError
              ? err.message
              : 'Generation failed. Please try again.';
          this.errorMessage.set(message);
        },
      });
  }

  clear(): void {
    this.title.set('');
    this.editorText.set('');
    this.mediaUrl.set('');
    this.selectedLanguage.set('English');
    this.audioFile.set(null);
    this.videoFile.set(null);
    this.generatedText.set('');
    this.errorMessage.set('');
    this.loading.set(false);
  }
}
