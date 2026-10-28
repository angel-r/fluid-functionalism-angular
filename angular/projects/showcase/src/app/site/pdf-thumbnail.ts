// PDF thumbnails for the input-message and chat-message demos. The library
// ships no PDF renderer (a PDF shows the generic glyph), so the site plugs
// one in with pdfjs-dist, loaded on the first PDF. The worker is served from
// the site's own build (angular.json copies it next to index.html), so it
// works offline and under a strict CSP; the same recipe is in the library
// README.

import type { Provider } from '@angular/core';
import { FILE_THUMBNAIL_PDF_RENDERER, type FileThumbnailPdfRenderer } from '@angel-r/fluid-functionalism-angular';

let pdfjs: Promise<typeof import('pdfjs-dist')> | null = null;

const loadPdfjs = () =>
  (pdfjs ??= import('pdfjs-dist').then((mod) => {
    // Resolved against <base href>: the site lives under a sub-path.
    mod.GlobalWorkerOptions.workerSrc = new URL('pdf.worker.min.mjs', document.baseURI).href;
    return mod;
  }));

const renderPdfFirstPage: FileThumbnailPdfRenderer = async (file, size) => {
  const { getDocument } = await loadPdfjs();
  const pdf = await getDocument({ data: await file.arrayBuffer() }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: (size * 2) / page.getViewport({ scale: 1 }).width }); // 2× for retina
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvas, viewport }).promise;
  return canvas.toDataURL('image/png');
};

export function providePdfThumbnails(): Provider {
  return { provide: FILE_THUMBNAIL_PDF_RENDERER, useValue: renderPdfFirstPage };
}
