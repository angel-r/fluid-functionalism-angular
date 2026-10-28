/** One row of a doc page's API reference. Plain strings, so the same data
 *  renders as a PropsTable on the page and as a Markdown table in the
 *  generated docs (D3). Ported from lib/docs/api/types.ts; the strings carry
 *  the Angular inputs and outputs instead of React props. */
export interface PropDef {
  name: string;
  type: string;
  default?: string;
  description: string;
}

/** One table of a page's API reference, titled as on the page. */
export interface ApiTable {
  title: string;
  props: PropDef[];
}
