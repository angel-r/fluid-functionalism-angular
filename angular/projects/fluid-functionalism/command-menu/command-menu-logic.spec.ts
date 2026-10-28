/**
 * Command menu, pure parts (ported from tests/command-menu.test.tsx): the
 * shortcut syntax both the trigger and the caps read, the default filter,
 * and the sectioning with suggestions first.
 */
import {
  defaultCommandMenuFilter,
  formatShortcut,
  hasModifier,
  matchesShortcut,
  parseShortcut,
  sectionRows,
  type CommandMenuItemData,
} from './index';

const key = (overrides: Partial<KeyboardEvent> & { key: string }) => ({
  code: '',
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...overrides,
});

describe('parseShortcut', () => {
  it('reads modifiers and one key', () => {
    expect(parseShortcut('mod+shift+p')).toEqual({
      mod: true,
      meta: false,
      ctrl: false,
      alt: false,
      shift: true,
      key: 'p',
    });
    expect(parseShortcut('Ctrl+Alt+Delete').key).toBe('delete');
    expect(parseShortcut('/').key).toBe('/');
  });

  it('keeps a trailing + as the key', () => {
    expect(parseShortcut('mod++')).toMatchObject({ mod: true, key: '+' });
  });

  it('maps named keys to their KeyboardEvent.key spelling', () => {
    expect(parseShortcut('esc').key).toBe('escape');
    expect(parseShortcut('space').key).toBe(' ');
    expect(parseShortcut('cmd+up')).toMatchObject({ meta: true, key: 'arrowup' });
    expect(parseShortcut('').key).toBe('');
  });
});

describe('matchesShortcut', () => {
  const modK = parseShortcut('mod+k');

  it('mod accepts ⌘ or Ctrl', () => {
    expect(matchesShortcut(key({ key: 'k', metaKey: true }), modK)).toBe(true);
    expect(matchesShortcut(key({ key: 'k', ctrlKey: true }), modK)).toBe(true);
    expect(matchesShortcut(key({ key: 'k' }), modK)).toBe(false);
  });

  it('an unnamed modifier rules the press out', () => {
    expect(matchesShortcut(key({ key: 'k', metaKey: true, altKey: true }), modK)).toBe(false);
    expect(matchesShortcut(key({ key: 'K', metaKey: true, shiftKey: true }), modK)).toBe(true);
  });

  it('letters also match on code, for ⌥ combos that change key', () => {
    const altK = parseShortcut('alt+k');
    expect(matchesShortcut(key({ key: '˚', code: 'KeyK', altKey: true }), altK)).toBe(true);
  });

  it('the physical key only stands in for non-Latin layouts, never for a Latin letter', () => {
    // Cyrillic layout: the K key types "л", the combo still lands.
    expect(matchesShortcut(key({ key: 'л', code: 'KeyK', metaKey: true }), modK)).toBe(true);
    // Dvorak: the physical K types "t"; ⌘T must stay ⌘T.
    expect(matchesShortcut(key({ key: 't', code: 'KeyK', metaKey: true }), modK)).toBe(false);
  });

  it('a bare key ignores modified presses', () => {
    const slash = parseShortcut('/');
    expect(matchesShortcut(key({ key: '/' }), slash)).toBe(true);
    expect(matchesShortcut(key({ key: '/', metaKey: true }), slash)).toBe(false);
  });

  it('an empty combo never matches', () => {
    expect(matchesShortcut(key({ key: 'k' }), parseShortcut(''))).toBe(false);
  });
});

describe('hasModifier', () => {
  it('a modifier combo may fire in fields, a bare key may not', () => {
    expect(hasModifier(parseShortcut('mod+k'))).toBe(true);
    expect(hasModifier(parseShortcut('alt+k'))).toBe(true);
    expect(hasModifier(parseShortcut('shift+k'))).toBe(false);
    expect(hasModifier(parseShortcut('/'))).toBe(false);
  });
});

describe('formatShortcut', () => {
  it('draws symbols on a Mac and words elsewhere', () => {
    expect(formatShortcut('mod+shift+p', true)).toEqual(['⌘', '⇧', 'P']);
    expect(formatShortcut('mod+shift+p', false)).toEqual(['Ctrl', 'Shift', 'P']);
    expect(formatShortcut('mod+,', true)).toEqual(['⌘', ',']);
    expect(formatShortcut('enter', false)).toEqual(['Enter']);
  });

  it('keeps pre-formatted caps, one per glyph', () => {
    expect(formatShortcut('⌘⇧P', false)).toEqual(['⌘', '⇧', 'P']);
  });

  it('spells named keys out and capitalizes unknown words', () => {
    expect(formatShortcut('up', true)).toEqual(['↑']);
    expect(formatShortcut('esc', false)).toEqual(['Esc']);
    expect(formatShortcut('f5', false)).toEqual(['F5']);
  });
});

const ITEMS: CommandMenuItemData[] = [
  { value: 'new', label: 'New file', description: 'Blank document', keywords: ['create'], group: 'Actions' },
  { value: 'theme', label: 'Toggle dark mode', group: 'Actions' },
  { value: 'locked', label: 'Export', group: 'Actions', disabled: true },
  { value: 'home', label: 'Home', group: 'Go to' },
  { value: 'calendar', label: 'Calendar', group: 'Go to' },
];

describe('defaultCommandMenuFilter', () => {
  it('matches every word against label, description, and keywords', () => {
    expect(defaultCommandMenuFilter(ITEMS[0], 'blank doc')).toBe(true);
    expect(defaultCommandMenuFilter(ITEMS[0], 'create')).toBe(true);
    expect(defaultCommandMenuFilter(ITEMS[0], 'new home')).toBe(false);
    expect(defaultCommandMenuFilter(ITEMS[1], 'DARK')).toBe(true);
  });

  it('an empty or blank query matches everything', () => {
    expect(defaultCommandMenuFilter(ITEMS[3], '')).toBe(true);
    expect(defaultCommandMenuFilter(ITEMS[3], '   ')).toBe(true);
  });
});

describe('sectionRows', () => {
  it('lists suggestions first while the query is empty, and only once', () => {
    const sections = sectionRows(ITEMS, ['calendar', 'new'], 'Recent', '');
    expect(sections.map((s) => s.heading)).toEqual(['Recent', 'Actions', 'Go to']);
    expect(sections[0].items.map((i) => i.value)).toEqual(['calendar', 'new']);
    expect(sections[1].items.map((i) => i.value)).toEqual(['theme', 'locked']);
    expect(sections[2].items.map((i) => i.value)).toEqual(['home']);
    expect(sections.map((s) => s.start)).toEqual([0, 2, 4]);
  });

  it('drops the suggestions once something is typed', () => {
    const sections = sectionRows(ITEMS.slice(0, 2), ['theme'], 'Recent', 't');
    expect(sections.map((s) => s.heading)).toEqual(['Actions']);
  });

  it('ungrouped rows form one unlabelled section, in first-appearance order', () => {
    const sections = sectionRows(
      [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B', group: 'G' },
        { value: 'c', label: 'C' },
      ],
      undefined,
      'Suggestions',
      '',
    );
    expect(sections.map((s) => [s.id, s.heading])).toEqual([
      ['ungrouped', null],
      ['group:G', 'G'],
    ]);
    expect(sections[0].items.map((i) => i.value)).toEqual(['a', 'c']);
  });
});
