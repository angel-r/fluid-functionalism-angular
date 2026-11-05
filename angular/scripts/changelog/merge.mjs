// The changelog has two sources in the same format (see parse.mjs):
//
// - content/changelog/ at the repository root: the original library's monthly
//   releases, written upstream and synced from it unchanged.
// - angular/content/changelog/: changes that exist only in this port (new
//   Angular-only components, port fixes). Upstream never touches that folder,
//   so syncing never conflicts with it.
//
// The page reads one release per month, so a port month joins the upstream
// release of the same month (upstream title and intro, port entries after the
// upstream ones in each section) or, when upstream has none, stands as its own
// release. Every entry carries its source, which picks its badge and the
// repository its refs link to.
import { CHANGE_KINDS, releaseEntries } from './parse.mjs';

/** The repository each source's PR and commit refs point at. */
export const SOURCE_REPO = {
  upstream: 'https://github.com/mickadesign/fluid-functionalism',
  angular: 'https://github.com/angel-r/fluid-functionalism-angular',
};

function tag(release, source) {
  return {
    ...release,
    groups: release.groups.map((group) => ({
      kind: group.kind,
      entries: group.entries.map((entry) => ({ ...entry, source })),
    })),
  };
}

/** Both sources as one list of releases, newest month first. */
export function mergeReleases(upstream, port) {
  const byMonth = new Map(upstream.map((release) => [release.month, tag(release, 'upstream')]));
  for (const release of port) {
    const own = tag(release, 'angular');
    const base = byMonth.get(release.month);
    if (!base) {
      byMonth.set(release.month, own);
      continue;
    }
    const entriesOf = (r, kind) => r.groups.find((group) => group.kind === kind)?.entries ?? [];
    const groups = CHANGE_KINDS.map((kind) => ({ kind, entries: [...entriesOf(base, kind), ...entriesOf(own, kind)] })).filter(
      (group) => group.entries.length > 0,
    );
    byMonth.set(release.month, { ...base, groups });
  }
  return [...byMonth.values()].sort((a, b) => b.month.localeCompare(a.month));
}

const slugsOf = (releases, kinds) =>
  releases
    .flatMap((release) => releaseEntries(release))
    .filter((entry) => kinds.includes(entry.kind))
    .map((entry) => (entry.href ? /^\/docs\/([^/#?]+)/.exec(entry.href)?.[1] : undefined))
    .filter((slug) => !!slug);

/**
 * The doc slugs the site marks. Upstream's latest release marks New for its
 * New entries and Updated for its Updated and Breaking ones, plus the pages
 * listed ahead of the next release. Port releases from the latest upstream
 * month on add their own, so a port addition stays badged until upstream
 * ships a newer month.
 */
export function releaseMarks(upstream, port, ahead) {
  const latest = upstream[0];
  const pending = ahead.filter((entry) => !latest || entry.month > latest.month).flatMap((entry) => entry.slugs);
  const recent = port.filter((release) => !latest || release.month >= latest.month);
  const added = unique([...slugsOf(latest ? [latest] : [], ['new']), ...slugsOf(recent, ['new'])]);
  const updated = unique([
    ...slugsOf(latest ? [latest] : [], ['updated', 'breaking']),
    ...slugsOf(recent, ['updated', 'breaking']),
  ]).filter((slug) => !added.includes(slug) && !pending.includes(slug));
  return { new: added, updated, ahead: pending };
}

function unique(values) {
  return [...new Set(values)];
}
