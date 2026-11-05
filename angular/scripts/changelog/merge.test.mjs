// Run with: node --test scripts/changelog/merge.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeReleases, releaseMarks } from './merge.mjs';

const entry = (name, slug) => ({
  kind: 'new',
  name,
  href: slug ? `/docs/${slug}` : null,
  text: [{ type: 'text', value: `${name} landed.` }],
  refs: [],
  diff: null,
  diffLang: null,
});

const release = (month, title, groups) => ({ month, released: null, title, intro: null, groups });
const group = (kind, ...entries) => ({ kind, entries: entries.map((e) => ({ ...e, kind })) });

const upstream = [
  release('2026-09', 'Upstream September', [group('new', entry('Combobox', 'combobox')), group('updated', entry('Select', 'select'))]),
  release('2026-08', 'Upstream August', [group('new', entry('Calendar', 'calendar'))]),
];

test('a port month with no upstream release becomes its own release, tagged angular', () => {
  const port = [release('2026-11', 'Port November', [group('new', entry('VirtualScroll', 'virtual-scroll'))])];
  const merged = mergeReleases(upstream, port);
  assert.deepEqual(merged.map((r) => r.month), ['2026-11', '2026-09', '2026-08']);
  assert.equal(merged[0].title, 'Port November');
  assert.equal(merged[0].groups[0].entries[0].source, 'angular');
  assert.equal(merged[1].groups[0].entries[0].source, 'upstream');
});

test('a port month that upstream also released joins it: upstream title, port entries after upstream ones', () => {
  const port = [
    release('2026-09', 'Port September', [
      group('breaking', entry('Entry points', null)),
      group('new', entry('VirtualScroll', 'virtual-scroll')),
    ]),
  ];
  const [september] = mergeReleases(upstream, port);
  assert.equal(september.title, 'Upstream September');
  assert.deepEqual(september.groups.map((g) => g.kind), ['new', 'breaking', 'updated']);
  assert.deepEqual(
    september.groups[0].entries.map((e) => [e.name, e.source]),
    [['Combobox', 'upstream'], ['VirtualScroll', 'angular']],
  );
  assert.equal(september.groups[1].entries[0].source, 'angular');
});

test('upstream marks are unchanged by a newer port release, which adds its own', () => {
  const ahead = [{ month: '2026-10', slugs: ['banner'] }];
  const port = [release('2026-11', 'Port November', [group('new', entry('VirtualScroll', 'virtual-scroll'))])];
  const without = releaseMarks(upstream, [], ahead);
  assert.deepEqual(without, { new: ['combobox'], updated: ['select'], ahead: ['banner'] });
  assert.deepEqual(releaseMarks(upstream, port, ahead), {
    new: ['combobox', 'virtual-scroll'],
    updated: ['select'],
    ahead: ['banner'],
  });
});

test('port entries older than the latest upstream release mark nothing', () => {
  const port = [release('2026-08', 'Port August', [group('new', entry('Old', 'old'))])];
  assert.deepEqual(releaseMarks(upstream, port, []).new, ['combobox']);
});

test('a port Updated entry marks Updated unless the slug is already New', () => {
  const port = [
    release('2026-10', 'Port October', [group('updated', entry('InputGroup', 'input-group'), entry('Combobox', 'combobox'))]),
  ];
  assert.deepEqual(releaseMarks(upstream, port, []).updated, ['select', 'input-group']);
});
