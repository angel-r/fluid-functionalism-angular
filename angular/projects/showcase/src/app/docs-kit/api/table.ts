// The API reference of /docs/table: its PropsTables and the API section
// of /docs/table.md both read these, so the two cannot drift.
import type { ApiTable, PropDef } from './types';

export const tableProps: PropDef[] = [
  { name: "size", type: '"default" | "compact"', default: "from the size context", description: "Pins every cell to one step of the size ladder (see /docs/sizes)." },
  { name: "data", type: "readonly T[]", description: "The rows `*ffTableRows` renders, in the order given. The table never sorts or slices them: it shows new rows only when `data` changes." },
  { name: "sort", type: "{ column: string; direction: 'ASC' | 'DESC' } | null", default: "null", description: "The starting sort. Header clicks move it on without waiting for the parent; binding a new value resets it." },
  { name: "offset", type: "number", default: "0", description: "The starting offset of the page shown. Same contract as `sort`." },
  { name: "pageSize", type: "number", description: "Rows per page. Set it to show `<ff-table-pagination>`; it is the `limit` of every query." },
  { name: "total", type: "number", description: "Total rows on the server, for the range label and the last page. Without it, a short page marks the last one." },
  { name: "sortChange", type: "(query: TableQuery) => void", description: "A sortable header was clicked: `{ column, direction, offset: 0, limit }`. Sorting goes back to the first page." },
  { name: "pageChange", type: "(query: TableQuery) => void", description: "The pagination moved: `{ column, direction, offset, limit }`, with the current sort (`null` column and direction when unsorted)." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the `<table>` element." },
  { name: "<ng-content />", type: "projected content", description: "TableHeader and TableBody children (`thead[ffTableHeader]`, `tbody[ffTableBody]`), plus an optional `ff-table-pagination` rendered under the table." },
];

export const headerProps: PropDef[] = [
  { name: "sticky", type: "boolean", default: "false", description: "Pins the header to the top of the nearest scroll container (CSS `position: sticky`), on the surface it sits on." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the `<thead>`." },
];

export const headProps: PropDef[] = [
  { name: "sortKey", type: "string", description: "Makes the column sortable: the label becomes a button, `aria-sort` reflects the direction, and a click emits `sortChange` with this column." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the header cell." },
];

export const rowProps: PropDef[] = [
  { name: "index", type: "number", description: "Row index for fluid hover. Omit for header rows." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the row." },
  { name: "<ng-content />", type: "projected content", description: "TableCell or TableHead children (`th[ffTableHead]`, `td[ffTableCell]`)." },
];

export const rowsProps: PropDef[] = [
  { name: "*ffTableRows", type: "let row of table; let i = index", description: "Stamps the row once per item of the table's `data`. `of` takes the table's template reference and types `row`; omitted, the directive reads the table it sits in. `index` and `count` are in the context." },
];

export const paginationProps: PropDef[] = [
  { name: "for", type: "Table", description: "The table to page. Omitted, the table it sits in." },
  { name: "class", type: "string", default: '""', description: "Additional classes for the pagination bar." },
];

/** The page's tables in page order, titled as on the page. */
export const apiReference: ApiTable[] = [
  { title: "Table", props: tableProps },
  { title: "TableHeader", props: headerProps },
  { title: "TableHead", props: headProps },
  { title: "TableRow", props: rowProps },
  { title: "TableRows", props: rowsProps },
  { title: "TablePagination", props: paginationProps },
];
