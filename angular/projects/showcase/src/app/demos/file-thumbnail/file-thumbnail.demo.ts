import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FileThumbnail } from '@angel-r/fluid-functionalism-angular';
import { DemoPage, DemoSection } from '../../shared/demo-page';

// A one-page PDF drawn by hand. Its xref table is omitted on purpose: pdfjs
// rebuilds it, which keeps the sample short.
const SAMPLE_PDF = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 88 >> stream
0.42 0.59 1 rg 20 120 160 60 re f
BT /F1 18 Tf 0 0 0 rg 30 70 Td (Quarterly report) Tj ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
trailer << /Root 1 0 R >>
%%EOF`;

/** A gradient PNG drawn on a canvas, so the demo needs no asset. */
function sampleImage(): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 256, 256);
    gradient.addColorStop(0, '#6B97FF');
    gradient.addColorStop(1, '#F7B267');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  }
  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(new File([blob ?? new Blob()], 'gradient.png', { type: 'image/png' })), 'image/png'),
  );
}

@Component({
  selector: 'app-file-thumbnail-demo',
  imports: [DemoPage, DemoSection, FileThumbnail],
  template: `
    <app-demo-page
      title="File thumbnail"
      description="A read-only square preview of a File. Images show through an object URL, PDFs render their first page with pdfjs, and anything else gets a generic document glyph. A spinner covers the wait."
    >
      <app-demo-section title="Image, PDF and other files">
        @for (file of samples(); track file.name) {
          <div class="flex flex-col items-center gap-2">
            <ff-file-thumbnail [file]="file" [size]="72" />
            <span class="text-site-caption text-muted-foreground">{{ file.name }}</span>
          </div>
        }
      </app-demo-section>

      <app-demo-section title="Sizes">
        @if (samples()[0]; as file) {
          @for (size of sizes; track size) {
            <ff-file-thumbnail [file]="file" [size]="size" />
          }
        }
      </app-demo-section>

      <app-demo-section title="Nested radius">
        <div class="flex items-center gap-2 rounded-xl border border-border p-1">
          @for (file of samples(); track file.name) {
            <ff-file-thumbnail [file]="file" [size]="48" [radius]="8" />
          }
        </div>
      </app-demo-section>

      <app-demo-section title="Your files">
        <div class="flex flex-col items-center gap-4">
          <label class="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-site-body text-foreground hover:bg-hover">
            Choose files
            <input type="file" multiple class="sr-only" (change)="pick($event)" />
          </label>
          <div class="flex flex-wrap justify-center gap-2">
            @for (file of picked(); track $index) {
              <ff-file-thumbnail [file]="file" [size]="64" />
            }
          </div>
        </div>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class FileThumbnailDemo {
  protected readonly sizes = [32, 48, 64, 96];
  protected readonly samples = signal<File[]>([]);
  protected readonly picked = signal<File[]>([]);

  constructor() {
    const pdf = new File([SAMPLE_PDF], 'report.pdf', { type: 'application/pdf' });
    const notes = new File(['Meeting notes'], 'notes.txt', { type: 'text/plain' });
    void sampleImage().then((image) => this.samples.set([image, pdf, notes]));
  }

  protected pick(event: Event) {
    const input = event.target as HTMLInputElement;
    this.picked.set(Array.from(input.files ?? []));
  }
}
