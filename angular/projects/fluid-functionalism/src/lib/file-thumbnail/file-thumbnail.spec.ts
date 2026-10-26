/**
 * FileThumbnail through its public interface: an image shows through one
 * shared, ref-counted object URL; a PDF shows a spinner while its first page
 * renders, then the render (or the generic glyph on failure); anything else
 * shows the glyph straight away.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, vi } from 'vitest';
import { FILE_THUMBNAIL_PDF_RENDERER, FileThumbnail } from './file-thumbnail';

@Component({
  imports: [FileThumbnail],
  template: `
    @for (f of files(); track $index) {
      <ff-file-thumbnail data-testid="thumb" class="m-1" [file]="f" [size]="size()" [radius]="radius()" />
    }
  `,
})
class Host {
  readonly files = signal<File[]>([]);
  readonly size = signal(64);
  readonly radius = signal<number | undefined>(undefined);
}

const image = new File(['img'], 'photo.png', { type: 'image/png' });
const pdf = new File(['%PDF'], 'report.pdf', { type: 'application/pdf' });
const text = new File(['hi'], 'notes.txt', { type: 'text/plain' });

let created: string[];
let revoked: string[];

beforeEach(() => {
  created = [];
  revoked = [];
  let n = 0;
  URL.createObjectURL = vi.fn(() => {
    const url = `blob:test/${++n}`;
    created.push(url);
    return url;
  });
  URL.revokeObjectURL = vi.fn((url: string) => void revoked.push(url));
});

afterEach(() => vi.restoreAllMocks());

interface Deferred {
  resolve: (url: string) => void;
  reject: (err: unknown) => void;
  file: File;
  size: number;
}

function setup(files: File[], configure: (host: Host) => void = () => {}) {
  const calls: Deferred[] = [];
  TestBed.configureTestingModule({
    providers: [
      {
        provide: FILE_THUMBNAIL_PDF_RENDERER,
        useValue: (file: File, size: number) =>
          new Promise<string>((resolve, reject) => calls.push({ resolve, reject, file, size })),
      },
    ],
  });
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.files.set(files);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const thumbs = () => Array.from(el.querySelectorAll<HTMLElement>('[data-testid="thumb"]'));
  const settle = async () => {
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
  };
  return { fixture, host: fixture.componentInstance, thumbs, calls, settle };
}

describe('FileThumbnail: frame', () => {
  it('is a square of `size` with the shape radius and merged classes', () => {
    const { thumbs } = setup([text]);
    const t = thumbs()[0];
    expect(t.style.width).toBe('64px');
    expect(t.style.height).toBe('64px');
    expect(t.style.borderRadius).toBe('');
    for (const c of ['relative', 'shrink-0', 'overflow-hidden', 'bg-accent', 'outline-1', 'rounded-lg', 'm-1']) {
      expect(t.classList).toContain(c);
    }
  });

  it("is a block box like React's <div>, so its size applies outside a flex parent", () => {
    const { thumbs } = setup([text]);
    expect(thumbs()[0].style.display).toBe('block');
    expect(thumbs()[0].classList).not.toContain('block');
  });

  it('an explicit radius goes inline', () => {
    const { thumbs } = setup([text], (h) => h.radius.set(6));
    expect(thumbs()[0].style.borderRadius).toBe('6px');
  });
});

describe('FileThumbnail: images', () => {
  it('shows the image through an object URL, named after the file', () => {
    const { thumbs } = setup([image]);
    const img = thumbs()[0].querySelector('img')!;
    expect(img.getAttribute('src')).toBe(created[0]);
    expect(img.getAttribute('alt')).toBe('photo.png');
    expect(img.className).toBe('absolute inset-0 w-full h-full object-cover');
  });

  it('shares one URL per file and revokes it when the last thumbnail goes', () => {
    const { host, fixture, thumbs } = setup([image, image]);
    expect(created.length).toBe(1);
    expect(thumbs().map((t) => t.querySelector('img')!.getAttribute('src'))).toEqual([created[0], created[0]]);
    host.files.set([image]);
    fixture.detectChanges();
    expect(revoked).toEqual([]);
    host.files.set([]);
    fixture.detectChanges();
    expect(revoked).toEqual([created[0]]);
  });
});

describe('FileThumbnail: PDFs', () => {
  it('spins while the first page renders, then shows the render', async () => {
    const { thumbs, calls, settle } = setup([pdf]);
    const status = thumbs()[0].querySelector('[role="status"]')!;
    expect(status.getAttribute('aria-label')).toBe('Loading preview');
    expect(calls.length).toBe(1);
    expect(calls[0].file).toBe(pdf);
    expect(calls[0].size).toBe(64);
    calls[0].resolve('data:image/png;base64,AAA');
    await settle();
    expect(thumbs()[0].querySelector('[role="status"]')).toBeNull();
    const img = thumbs()[0].querySelector('img')!;
    expect(img.getAttribute('src')).toBe('data:image/png;base64,AAA');
    expect(img.getAttribute('alt')).toBe('report.pdf');
  });

  it('falls back to the generic glyph when rendering fails', async () => {
    const { thumbs, calls, settle } = setup([pdf]);
    calls[0].reject(new Error('corrupt'));
    await settle();
    const glyph = thumbs()[0].querySelector('[role="img"]')!;
    expect(glyph.getAttribute('aria-label')).toBe('report.pdf');
    expect(thumbs()[0].querySelector('[role="status"]')).toBeNull();
  });

  it('keeps the last render up while a new size renders, and a failure counts only for its size', async () => {
    const { host, fixture, thumbs, calls, settle } = setup([pdf]);
    calls[0].resolve('data:first');
    await settle();
    host.size.set(96);
    fixture.detectChanges();
    expect(calls.length).toBe(2);
    expect(calls[1].size).toBe(96);
    expect(thumbs()[0].querySelector('img')!.getAttribute('src')).toBe('data:first');
    expect(thumbs()[0].querySelector('[role="status"]')).toBeNull();
    calls[1].reject(new Error('blocked'));
    await settle();
    // The last good render stays, as in the React version.
    expect(thumbs()[0].querySelector('img')!.getAttribute('src')).toBe('data:first');
  });

  it('ignores a render that finishes after the thumbnail moved on', async () => {
    const { host, fixture, thumbs, calls, settle } = setup([pdf]);
    host.files.set([text]);
    fixture.detectChanges();
    calls[0].resolve('data:late');
    await settle();
    expect(thumbs()[0].querySelector('img')).toBeNull();
    expect(thumbs()[0].querySelector('[role="img"]')!.getAttribute('aria-label')).toBe('notes.txt');
  });
});

describe('FileThumbnail: other files', () => {
  it('shows the generic glyph, scaled to the thumbnail, with no spinner', () => {
    const { thumbs, calls } = setup([text], (h) => h.size.set(100));
    const glyph = thumbs()[0].querySelector('[role="img"]')!;
    expect(glyph.getAttribute('aria-label')).toBe('notes.txt');
    const svg = glyph.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('35');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(thumbs()[0].querySelector('[role="status"]')).toBeNull();
    expect(calls.length).toBe(0);
    expect(created.length).toBe(0);
  });

  it('never shrinks the glyph below 16px', () => {
    const { thumbs } = setup([text], (h) => h.size.set(20));
    expect(thumbs()[0].querySelector('svg')!.getAttribute('width')).toBe('16');
  });
});
