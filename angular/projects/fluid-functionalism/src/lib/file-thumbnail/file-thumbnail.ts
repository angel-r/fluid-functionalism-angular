import {
  ChangeDetectionStrategy,
  Component,
  InjectionToken,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { cn } from '../core/utils';
import { injectShape } from '../core/shape';

// ─── Lazy pdfjs loader ────────────────────────────────────────────────────
// Imports pdfjs-dist on first PDF, caches the module, and points the worker
// at the matching CDN build. Consumers don't need bundler-side worker config.
type PdfjsModule = typeof import('pdfjs-dist');
let pdfjsPromise: Promise<PdfjsModule> | null = null;

export async function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((mod) => {
      if (!mod.GlobalWorkerOptions.workerSrc) {
        mod.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${mod.version}/build/pdf.worker.min.mjs`;
      }
      return mod;
    });
  }
  return pdfjsPromise;
}

export async function renderPdfFirstPage(file: File, targetWidth: number): Promise<string> {
  const pdfjs = await loadPdfjs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = (targetWidth * 2) / baseViewport.width; // 2× for retina
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvas, viewport }).promise;
  return canvas.toDataURL('image/png');
}

/**
 * Renders a PDF's first page to an image URL. Defaults to
 * `renderPdfFirstPage` (lazy pdfjs); override it to plug in another renderer
 * or to stub rendering in tests.
 */
export const FILE_THUMBNAIL_PDF_RENDERER = new InjectionToken<(file: File, size: number) => Promise<string>>(
  'FF_FILE_THUMBNAIL_PDF_RENDERER',
  { factory: () => renderPdfFirstPage },
);

// ─── Object URLs ──────────────────────────────────────────────────────────
// One blob URL per File while any thumbnail shows it: subscribing creates it,
// the last unsubscribe revokes it.
const objectUrls = new Map<File, { url: string; users: number }>();

function subscribeObjectUrl(file: File) {
  let entry = objectUrls.get(file);
  if (!entry) {
    entry = { url: URL.createObjectURL(file), users: 0 };
    objectUrls.set(file, entry);
  }
  entry.users += 1;
  const held = entry;
  return {
    url: held.url,
    release: () => {
      held.users -= 1;
      if (held.users === 0) {
        URL.revokeObjectURL(held.url);
        objectUrls.delete(file);
      }
    },
  };
}

// ─── File thumbnail ───────────────────────────────────────────────────────
// Read-only square preview of a File. Images use object-cover via
// `URL.createObjectURL`; PDFs render the first page via pdfjs; while either is
// resolving a spinner is shown. Self-contained (outline + surface + sizing) so
// it can be reused both inside the composer's preview row and to render
// already-sent attachments in a chat transcript.
@Component({
  selector: 'ff-file-thumbnail',
  host: {
    // The host stands in for React's <div>: a block box (inline would drop
    // its size outside a flex parent), with the same class list.
    style: 'display: block',
    '[class]': 'hostClass()',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    // Keep class radius overrides working at the default. Inline geometry is
    // reserved for an explicit nested-radius calculation.
    '[style.border-radius.px]': 'radius() ?? null',
  },
  template: `
    @if (previewUrl(); as url) {
      <img [src]="url" [alt]="file().name" class="absolute inset-0 w-full h-full object-cover" />
    } @else if (isPending()) {
      <!-- Circular spinner while we wait for the preview to be ready. The thin
           ring is mostly subtle (border-border) with one quadrant accented
           (border-t-muted-foreground) so the rotation reads as a moving arc. -->
      <div class="absolute inset-0 flex items-center justify-center">
        <div
          class="w-6 h-6 rounded-full border-2 border-border border-t-muted-foreground animate-spin"
          aria-label="Loading preview"
          role="status"
        ></div>
      </div>
    } @else {
      <!-- Generic document glyph for files with no renderable preview. Inline
           SVG (not the icon system) so the thumbnail stays self-contained. -->
      <div class="absolute inset-0 flex items-center justify-center text-muted-foreground" role="img" [attr.aria-label]="file().name">
        <svg
          [attr.width]="glyphSize()"
          [attr.height]="glyphSize()"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
        </svg>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileThumbnail {
  readonly file = input.required<File>();
  /** Side length of the square thumbnail in pixels. */
  readonly size = input.required<number>();
  /** Explicit corner radius for a known nested inset. Defaults to the active
   *  shape's regular image/control radius. */
  readonly radius = input<number | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  private readonly shape = injectShape();
  private readonly renderPdf = inject(FILE_THUMBNAIL_PDF_RENDERER);

  protected readonly hostClass = computed(() =>
    cn(
      // Paint the hairline over the preview: unlike a border, it costs no
      // space, and pure neutral ink stays clean over every surface tint.
      'relative shrink-0 overflow-hidden bg-accent outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10',
      this.shape().bg,
      this.userClass(),
    ),
  );

  private readonly isImage = computed(() => this.file().type.startsWith('image/'));
  private readonly isPdf = computed(() => this.file().type === 'application/pdf');

  private readonly imageUrl = signal<string | null>(null);

  // PDFs need async rendering — a loading flash is unavoidable for the first
  // ~100–300ms while pdfjs loads. Falls back to the generic icon on error
  // (corrupt/password-protected file, CDN worker blocked). The last render
  // stays up while a new one is on its way (a size change doesn't flash the
  // spinner); a failure only counts for the file and size it happened to.
  private readonly pdf = signal<{ url: string | null; failed: { file: File; size: number } | null }>({
    url: null,
    failed: null,
  });
  private readonly pdfError = computed(() => {
    const failed = this.pdf().failed;
    return failed?.file === this.file() && failed.size === this.size();
  });

  protected readonly previewUrl = computed(() => this.imageUrl() ?? this.pdf().url);
  // Spinner only while a preview is genuinely pending; anything that can't
  // produce one (failed PDF, unsupported type) gets the generic icon instead.
  protected readonly isPending = computed(
    () => (this.isImage() && !this.imageUrl()) || (this.isPdf() && !this.pdf().url && !this.pdfError()),
  );
  protected readonly glyphSize = computed(() => Math.max(16, this.size() * 0.35));

  constructor() {
    effect((onCleanup) => {
      const file = this.isImage() ? this.file() : null;
      if (!file) {
        this.imageUrl.set(null);
        return;
      }
      const { url, release } = untracked(() => subscribeObjectUrl(file));
      this.imageUrl.set(url);
      onCleanup(release);
    });

    effect((onCleanup) => {
      const isPdf = this.isPdf();
      const file = this.file();
      const size = this.size();
      if (!isPdf) {
        const current = untracked(this.pdf);
        if (current.url !== null || current.failed !== null) this.pdf.set({ url: null, failed: null });
        return;
      }
      let cancelled = false;
      untracked(() => this.renderPdf(file, size))
        .then((url) => {
          if (!cancelled) this.pdf.set({ url, failed: null });
        })
        .catch(() => {
          if (!cancelled) this.pdf.update((prev) => ({ ...prev, failed: { file, size } }));
        });
      onCleanup(() => (cancelled = true));
    });
  }
}
