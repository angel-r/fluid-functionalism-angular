// Self-contained sample attachments for the input message demos: the showcase
// ships no photo or PDF assets, so both are generated in memory as Files.

const PHOTO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#F59E0B"/><stop offset="1" stop-color="#6B97FF"/>
  </linearGradient></defs>
  <rect width="256" height="256" fill="url(#g)"/>
  <circle cx="184" cy="72" r="28" fill="#ffffff" fill-opacity="0.85"/>
  <path d="M0 210l70-80 50 50 40-34 96 64v46H0z" fill="#ffffff" fill-opacity="0.7"/>
</svg>`;

/** A one-page PDF with a title line, with a correct xref table so pdfjs
 *  renders its first page without repairing it. */
function makePdf(title: string): string {
  const stream = `BT /F1 28 Tf 72 700 Td (${title}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return body;
}

export function samplePhoto(name = 'photo.svg'): File {
  return new File([PHOTO_SVG], name, { type: 'image/svg+xml', lastModified: 1 });
}

export function samplePdf(name = 'design-notes.pdf', title = 'Design notes'): File {
  return new File([makePdf(title)], name, { type: 'application/pdf', lastModified: 1 });
}
