// The API reference of /docs/table: its PropsTables and the API section
// of /docs/table.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

export const tableProps: PropDef[] = [
  { name: "size", type: '"default" | "compact"', default: "from the size context", description: "Pins every cell to one step of the size ladder (see /docs/sizes)." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the `<table>` element." },
  { name: "<ng-content />", type: "projected content", description: "TableHeader and TableBody children (`thead[ffTableHeader]`, `tbody[ffTableBody]`)." },
];

export const rowProps: PropDef[] = [
  { name: "index", type: "number", description: "Row index for fluid hover. Omit for header rows." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the row." },
  { name: "<ng-content />", type: "projected content", description: "TableCell or TableHead children (`th[ffTableHead]`, `td[ffTableCell]`)." },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "Table", props: tableProps },
  { title: "TableRow", props: rowProps },
];
