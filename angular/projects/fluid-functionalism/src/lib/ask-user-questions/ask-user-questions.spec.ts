/**
 * The upstream suite has no behavior test for AskUserQuestions (only preset
 * install guards for the docs site), so this pins one test per rule of the
 * React component: the flow (single, multi, Other, freeText, skip, back,
 * finish), controlled and uncontrolled state, the 1-9 and arrow keyboard
 * model, roving tabindex, focus restoration, the keyboard focus ring, the
 * hand-built radio/checkbox group ARIA and the freeText field wiring.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { SizeVariant } from '../core/size';
import { AskUserQuestions } from './ask-user-questions';
import type { AskUserAnswer, AskUserQuestion } from './types';

// ── Fixtures ─────────────────────────────────────────────

const SINGLE: AskUserQuestion[] = [
  {
    id: 'role',
    title: "What's your role?",
    options: [
      { id: 'design', title: 'Designer', description: 'Visual / interaction' },
      { id: 'eng', title: 'Engineer', description: 'Frontend / backend' },
      { id: 'pm', title: 'PM' },
    ],
  },
  {
    id: 'tools',
    title: 'Which tool do you use most?',
    options: [
      { id: 'figma', title: 'Figma' },
      { id: 'vscode', title: 'VS Code' },
    ],
  },
];

const MULTI: AskUserQuestion[] = [
  {
    id: 'features',
    title: 'Which features should we prioritize?',
    multiSelect: true,
    options: [
      { id: 'dm', title: 'Dark mode' },
      { id: 'a11y', title: 'Accessibility' },
      { id: 'perf', title: 'Performance' },
    ],
  },
  { id: 'platforms', title: 'Which platforms?', multiSelect: true, options: [{ id: 'web', title: 'Web' }] },
];

@Component({
  imports: [AskUserQuestions],
  template: `
    <button type="button" data-testid="outside">Outside</button>
    <ff-ask-user-questions
      class="my-auq"
      [questions]="questions()"
      [(currentIndex)]="index"
      [(answers)]="answers"
      [defaultCurrentIndex]="defaultIndex()"
      [defaultAnswers]="defaultAnswers()"
      [skipLabel]="skipLabel()"
      [size]="size()"
      (currentIndexChange)="indexChanged($event)"
      (answersChange)="answersChanged($event)"
      (complete)="completed($event)"
      (skip)="skipped($event)"
    />
  `,
})
class AuqHost {
  readonly questions = signal<AskUserQuestion[]>(SINGLE);
  readonly index = signal<number | undefined>(undefined);
  readonly answers = signal<Record<string, AskUserAnswer> | undefined>(undefined);
  readonly defaultIndex = signal(0);
  readonly defaultAnswers = signal<Record<string, AskUserAnswer> | undefined>(undefined);
  readonly skipLabel = signal('Skip');
  readonly size = signal<SizeVariant | undefined>(undefined);
  readonly indexChanged = vi.fn();
  readonly answersChanged = vi.fn();
  readonly completed = vi.fn();
  readonly skipped = vi.fn();
}

function renderAuq(configure: (host: AuqHost) => void = () => {}) {
  const fixture = TestBed.createComponent(AuqHost);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const host = fixture.componentInstance;
  const flush = () => fixture.detectChanges();
  const root = () => el.querySelector<HTMLElement>('ff-ask-user-questions')!;
  const rows = () => Array.from(el.querySelectorAll<HTMLElement>('[data-fluid-hover-index]'));
  const row = (title: string) => rows().find((r) => r.textContent?.includes(title))!;
  const group = () => el.querySelector<HTMLElement>('[role="radiogroup"], [role="group"]')!;
  const header = () => root().firstElementChild!.textContent!.replace(/\s+/g, ' ').trim();
  const title = () => el.querySelector<HTMLElement>('h3')!;
  /** A footer button by its visible label, only while it is present. */
  const button = (label: string) =>
    Array.from(root().querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.includes(label) && !b.closest('[data-present="false"]'),
    ) ?? null;
  const textarea = () => el.querySelector<HTMLTextAreaElement>('textarea')!;
  const update = (fn: (h: AuqHost) => void) => {
    fn(host);
    flush();
  };
  const key = (target: EventTarget, k: string, init: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    flush();
    return event;
  };
  const type = (value: string) => {
    const field = textarea();
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    flush();
  };
  const click = (target: HTMLElement) => {
    target.click();
    flush();
  };
  return { fixture, el, host, flush, root, rows, row, group, header, title, button, textarea, update, key, type, click };
}

function expectClasses(el: Element, classes: string) {
  for (const c of classes.split(' ')) expect(el.classList.contains(c), c).toBe(true);
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const lastCall = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls[fn.mock.calls.length - 1]?.[0];

// ── Structure ────────────────────────────────────────────

describe('AskUserQuestions: structure', () => {
  it('renders the card, the header count, the title and one radio row per option', () => {
    const { root, header, title, rows, group } = renderAuq();
    expectClasses(root(), 'my-auq relative w-full max-w-[520px] overflow-hidden bg-card border border-border rounded-xl');
    expect(header()).toBe('Question 1 of 2');
    expect(title().textContent!.trim()).toBe("What's your role?");
    expect(title().style.fontVariationSettings).toContain("'wght' 550");
    expect(group().getAttribute('role')).toBe('radiogroup');
    expect(group().getAttribute('aria-labelledby')).toBe(title().id);
    expect(rows().map((r) => r.getAttribute('role'))).toEqual(['radio', 'radio', 'radio']);
    expect(rows().map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'false', 'false']);
    expect(rows().map((r) => r.getAttribute('data-state'))).toEqual(['unchecked', 'unchecked', 'unchecked']);
    // Chips number the rows 1..n.
    expect(rows().map((r) => r.querySelector('[data-slot="auq-chip"]')!.textContent!.trim())).toEqual(['1', '2', '3']);
  });

  it('shows the option description after the title, muted', () => {
    const { row } = renderAuq();
    const muted = row('Designer').querySelector('.text-muted-foreground:not([data-slot])');
    expect(muted!.textContent).toBe('Visual / interaction');
  });

  it('falls back to "No questions." when the list is empty', () => {
    const { root, rows } = renderAuq((h) => h.questions.set([]));
    expect(root().textContent).toContain('No questions.');
    expectClasses(root(), 'w-full max-w-[520px] p-5 bg-card border border-border rounded-xl');
    expect(rows()).toHaveLength(0);
  });

  it('pins the compact step with size', () => {
    const { row, root, update } = renderAuq();
    expectClasses(row('Designer'), 'min-h-10 py-1.5 pl-3 pr-1.5 gap-3 items-center rounded-lg');
    update((h) => h.size.set('compact'));
    expectClasses(row('Designer'), 'min-h-8 py-1');
    expectClasses(root().firstElementChild!, 'px-3.5 pt-2.5 pb-1.5');
  });

  it('stacked layout tops the chip and puts the description under the title', () => {
    const { row, update } = renderAuq();
    update((h) => h.questions.set([{ ...SINGLE[0], layout: 'stacked' }]));
    expectClasses(row('Designer'), 'min-h-14 py-2 items-start');
    const body = row('Designer').querySelector('[data-slot="auq-body"]')!;
    expectClasses(body, 'flex flex-col gap-0.5');
    expectClasses(row('Designer').querySelector('[data-slot="auq-chip-slot"]')!, '-mt-[1px]');
  });

  it('chipPosition left leads with the chip and keeps a right slot for the arrow', () => {
    const { row, update } = renderAuq();
    update((h) => h.questions.set([{ ...SINGLE[0], chipPosition: 'left' }]));
    const r = row('Designer');
    expectClasses(r, 'gap-2 pl-1.5 pr-1.5');
    expect(r.firstElementChild!.getAttribute('data-slot')).toBe('auq-chip-slot');
    expect(r.querySelector('[data-slot="auq-arrow-slot"]')).not.toBeNull();
  });
});

// ── Single select ────────────────────────────────────────

describe('AskUserQuestions: single select', () => {
  it('a row click answers the question and advances', () => {
    const { host, row, header, click } = renderAuq();
    click(row('Engineer'));
    expect(lastCall(host.answersChanged)).toEqual({
      role: { questionId: 'role', selectedIds: ['eng'], otherText: undefined, skipped: false },
    });
    expect(host.indexChanged).toHaveBeenLastCalledWith(1);
    expect(header()).toBe('Question 2 of 2');
  });

  it('the last answer completes with every answer', () => {
    const { host, row, click } = renderAuq();
    click(row('Engineer'));
    click(row('VS Code'));
    expect(host.completed).toHaveBeenCalledTimes(1);
    expect(host.completed.mock.calls[0][0]).toEqual({
      role: { questionId: 'role', selectedIds: ['eng'], otherText: undefined, skipped: false },
      tools: { questionId: 'tools', selectedIds: ['vscode'], otherText: undefined, skipped: false },
    });
  });

  it('Back returns to the previous question and shows it answered', () => {
    const { row, header, button, click } = renderAuq();
    expect(button('Back')).toBeNull();
    click(row('Engineer'));
    click(button('Back')!);
    expect(header()).toBe('Question 1 of 2');
    expect(row('Engineer').getAttribute('aria-checked')).toBe('true');
    expect(row('Engineer').getAttribute('data-state')).toBe('checked');
    expect(button('Back')).toBeNull();
  });

  it('roving tabindex: the first row when unanswered, the selected row once answered', () => {
    const { rows, row, click, button } = renderAuq();
    expect(rows().map((r) => r.tabIndex)).toEqual([0, -1, -1]);
    click(row('PM'));
    click(button('Back')!);
    expect(rows().map((r) => r.tabIndex)).toEqual([-1, -1, 0]);
  });

  it('hosts a hidden radio primitive per row, out of the a11y tree and tab order', () => {
    const { row } = renderAuq();
    const hidden = row('Designer').querySelector<HTMLElement>('.sr-only')!;
    expect(hidden.getAttribute('aria-hidden')).toBe('true');
    expect(hidden.getAttribute('tabindex')).toBe('-1');
    expect(hidden.getAttribute('role')).toBe('radio');
  });
});

// ── Skip ─────────────────────────────────────────────────

describe('AskUserQuestions: skip', () => {
  it('Skip marks the answer skipped, emits skip and advances', () => {
    const { host, header, button, click, update } = renderAuq();
    update((h) => h.skipLabel.set('Not now'));
    click(button('Not now')!);
    expect(host.skipped).toHaveBeenCalledWith({ questionId: 'role', index: 0 });
    expect(lastCall(host.answersChanged).role).toEqual({
      questionId: 'role',
      selectedIds: [],
      otherText: undefined,
      skipped: true,
    });
    expect(header()).toBe('Question 2 of 2');
  });

  it('skippable: false hides Skip; a single question never shows it', () => {
    const { button, update } = renderAuq();
    update((h) => h.questions.set([{ ...SINGLE[0], skippable: false }, SINGLE[1]]));
    expect(button('Skip')).toBeNull();
    update((h) => h.questions.set([SINGLE[0]]));
    expect(button('Skip')).toBeNull();
  });
});

// ── Multi select ─────────────────────────────────────────

describe('AskUserQuestions: multi select', () => {
  it('rows are checkboxes in a group; clicks toggle without advancing', () => {
    const { host, row, rows, group, header, click } = renderAuq((h) => h.questions.set(MULTI));
    expect(group().getAttribute('role')).toBe('group');
    expect(rows().map((r) => r.getAttribute('role'))).toEqual(['checkbox', 'checkbox', 'checkbox']);
    click(row('Dark mode'));
    click(row('Performance'));
    expect(row('Dark mode').getAttribute('aria-checked')).toBe('true');
    expect(lastCall(host.answersChanged).features.selectedIds).toEqual(['dm', 'perf']);
    click(row('Dark mode'));
    expect(row('Dark mode').getAttribute('aria-checked')).toBe('false');
    expect(lastCall(host.answersChanged).features.selectedIds).toEqual(['perf']);
    expect(header()).toBe('Question 1 of 2');
  });

  it('fills the chip of a checked row', () => {
    const { row, click } = renderAuq((h) => h.questions.set(MULTI));
    const chip = () => row('Dark mode').querySelector('[data-slot="auq-chip"]')!;
    expectClasses(chip(), 'border border-border text-muted-foreground');
    click(row('Dark mode'));
    expectClasses(chip(), 'bg-foreground text-background');
  });

  it('Continue is disabled until something is selected, then advances; the last says Finish', () => {
    const { host, row, header, button, click } = renderAuq((h) => h.questions.set(MULTI));
    expect(button('Continue')!.disabled).toBe(true);
    click(row('Accessibility'));
    expect(button('Continue')!.disabled).toBe(false);
    click(button('Continue')!);
    expect(header()).toBe('Question 2 of 2');
    click(row('Web'));
    click(button('Finish')!);
    expect(host.completed).toHaveBeenCalledTimes(1);
    expect(host.completed.mock.calls[0][0].platforms.selectedIds).toEqual(['web']);
  });

  it('nextLabel overrides the submit label', () => {
    const { button, update } = renderAuq((h) => h.questions.set(MULTI));
    update((h) => h.questions.set([{ ...MULTI[0], nextLabel: 'Go on' }, MULTI[1]]));
    expect(button('Go on')).not.toBeNull();
  });

  it('Ctrl+Enter commits from anywhere inside the card once there is an answer', () => {
    const { row, header, key, click } = renderAuq((h) => h.questions.set(MULTI));
    key(row('Dark mode'), 'Enter', { ctrlKey: true });
    expect(header()).toBe('Question 1 of 2');
    click(row('Dark mode'));
    const event = key(row('Dark mode'), 'Enter', { ctrlKey: true });
    expect(event.defaultPrevented).toBe(true);
    expect(header()).toBe('Question 2 of 2');
  });

  it('shows the platform shortcut hint in the submit button', () => {
    const { button } = renderAuq((h) => h.questions.set(MULTI));
    const kbd = button('Continue')!.querySelector('kbd')!;
    expect(kbd.getAttribute('aria-hidden')).toBe('true');
    expect(kbd.textContent).toBe('⌃↵');
  });
});

// ── Other ────────────────────────────────────────────────

describe('AskUserQuestions: Other', () => {
  const withOther = (h: AuqHost) => h.questions.set([{ ...SINGLE[0], allowOther: true }, SINGLE[1]]);

  it('appends a numbered free-text row with a labelled textarea', () => {
    const { rows, textarea } = renderAuq(withOther);
    expect(rows()).toHaveLength(4);
    const other = rows()[3];
    expect(other.hasAttribute('role')).toBe(false);
    expect(other.getAttribute('aria-label')).toBe('Describe in your own words');
    expect(other.tabIndex).toBe(-1);
    expect(other.querySelector('[data-slot="auq-chip"]')!.textContent!.trim()).toBe('4');
    expect(textarea().placeholder).toBe('Describe in your own words…');
    expect(textarea().getAttribute('aria-label')).toBe('Describe in your own words');
    expect(textarea().rows).toBe(1);
  });

  it('typing writes otherText; Enter submits, Shift+Enter does not', () => {
    const { host, header, type, textarea, key } = renderAuq(withOther);
    type('Hiring');
    expect(lastCall(host.answersChanged).role).toEqual({
      questionId: 'role',
      selectedIds: [],
      otherText: 'Hiring',
      skipped: false,
    });
    key(textarea(), 'Enter', { shiftKey: true });
    expect(header()).toBe('Question 1 of 2');
    const event = key(textarea(), 'Enter');
    expect(event.defaultPrevented).toBe(true);
    expect(header()).toBe('Question 2 of 2');
  });

  it('a filled Other row reads as selected', () => {
    const { rows, type } = renderAuq(withOther);
    type('Hiring');
    expect(rows()[3].getAttribute('data-state')).toBe('checked');
  });

  it('clicking the Other row focuses its textarea', () => {
    const { rows, textarea, click } = renderAuq(withOther);
    click(rows()[3]);
    expect(document.activeElement).toBe(textarea());
  });

  it('the arrow submits a filled Other answer when its row is active', async () => {
    const { rows, header, type, textarea, flush } = renderAuq(withOther);
    type('Hiring');
    textarea().focus();
    flush();
    const arrow = rows()[3].querySelector<HTMLElement>('[data-slot="auq-arrow"]')!;
    expect(arrow.getAttribute('data-present')).toBe('true');
    expect(arrow.getAttribute('role')).toBe('button');
    arrow.click();
    flush();
    expect(header()).toBe('Question 2 of 2');
  });

  it('in multi-select, Enter in the Other field never submits', () => {
    const { header, type, textarea, key } = renderAuq((h) =>
      h.questions.set([{ ...MULTI[0], allowOther: true }, MULTI[1]]),
    );
    type('Offline');
    key(textarea(), 'Enter');
    expect(header()).toBe('Question 1 of 2');
  });
});

// ── freeText ─────────────────────────────────────────────

describe('AskUserQuestions: freeText', () => {
  const freeText = (extra: Partial<AskUserQuestion> = {}) => (h: AuqHost) =>
    h.questions.set([{ id: 'name', title: 'What should we call it?', freeText: true, ...extra }, SINGLE[0]]);

  it('renders one auto-focused textarea labelled by the title, no rows', async () => {
    const { rows, textarea, title, flush } = renderAuq(freeText());
    await nextFrame();
    flush();
    expect(rows()).toHaveLength(0);
    expect(textarea().placeholder).toBe('Type your answer…');
    expect(textarea().getAttribute('aria-labelledby')).toBe(title().id);
    expect(document.activeElement).toBe(textarea());
  });

  it('submit stays disabled until there is text; it submits the trimmed text', () => {
    const { host, header, button, type, click } = renderAuq(freeText());
    expect(button('Continue')!.disabled).toBe(true);
    type('  Fluid  ');
    expect(button('Continue')!.disabled).toBe(false);
    click(button('Continue')!);
    expect(lastCall(host.answersChanged).name).toEqual({
      questionId: 'name',
      selectedIds: [],
      otherText: 'Fluid',
      skipped: false,
    });
    expect(header()).toBe('Question 2 of 2');
  });

  it('multi-line: Enter is a newline and Ctrl+Enter submits', () => {
    const { header, type, textarea, key } = renderAuq(freeText());
    type('Fluid');
    expect(key(textarea(), 'Enter').defaultPrevented).toBe(false);
    expect(header()).toBe('Question 1 of 2');
    key(textarea(), 'Enter', { ctrlKey: true });
    expect(header()).toBe('Question 2 of 2');
  });

  it('single-line: plain Enter submits', () => {
    const { header, type, textarea, key, el } = renderAuq(freeText({ freeTextMultiline: false }));
    expectClasses(textarea().parentElement!, 'min-h-10');
    expect(el.querySelector('.min-h-\\[76px\\]')).toBeNull();
    type('Fluid');
    key(textarea(), 'Enter');
    expect(header()).toBe('Question 2 of 2');
  });

  it('validation blocks the submit, shows the error wired to the field, and clears on edit', () => {
    const validate = (v: string) => (v.length < 3 ? 'At least 3 characters' : null);
    const { header, type, textarea, button, click, el } = renderAuq(freeText({ freeTextValidate: validate }));
    type('ab');
    click(button('Continue')!);
    expect(header()).toBe('Question 1 of 2');
    const error = el.querySelector<HTMLElement>('[role="alert"]')!;
    expect(error.textContent!.trim()).toBe('At least 3 characters');
    expectClasses(error, 'text-destructive');
    expect(textarea().getAttribute('aria-invalid')).toBe('true');
    expect(textarea().getAttribute('aria-describedby')).toBe(error.id);
    type('abc');
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(textarea().hasAttribute('aria-invalid')).toBe(false);
    click(button('Continue')!);
    expect(header()).toBe('Question 2 of 2');
  });
});

// ── Controlled / uncontrolled ────────────────────────────

describe('AskUserQuestions: state', () => {
  it('defaultCurrentIndex and defaultAnswers seed the uncontrolled state', () => {
    const { header, row } = renderAuq((h) => {
      h.defaultIndex.set(1);
      h.defaultAnswers.set({ tools: { questionId: 'tools', selectedIds: ['figma'] } });
    });
    expect(header()).toBe('Question 2 of 2');
    expect(row('Figma').getAttribute('aria-checked')).toBe('true');
  });

  it('currentIndex and answers drive the view when bound', () => {
    const { header, row, update, host } = renderAuq((h) => h.index.set(1));
    expect(header()).toBe('Question 2 of 2');
    update((h) => h.answers.set({ tools: { questionId: 'tools', selectedIds: ['vscode'] } }));
    expect(row('VS Code').getAttribute('aria-checked')).toBe('true');
    update((h) => h.index.set(0));
    expect(header()).toBe('Question 1 of 2');
    // Two-way: a selection writes back to the bound signals.
    row('PM').click();
    expect(host.index()).toBe(1);
    expect(host.answers()!['role'].selectedIds).toEqual(['pm']);
  });

  it('clamps an out-of-range index to the last question', () => {
    const { header } = renderAuq((h) => h.index.set(9));
    expect(header()).toBe('Question 2 of 2');
  });
});

// ── Keyboard ─────────────────────────────────────────────

describe('AskUserQuestions: digits', () => {
  it('1-9 answers the matching option from anywhere on the page', () => {
    const { host, header, key } = renderAuq();
    key(document.body, '2');
    expect(lastCall(host.answersChanged).role.selectedIds).toEqual(['eng']);
    expect(header()).toBe('Question 2 of 2');
  });

  it('ignores digits with a modifier, inside a field, or past the options', () => {
    const { host, key, el } = renderAuq();
    key(document.body, '1', { metaKey: true });
    key(document.body, '1', { altKey: true });
    key(document.body, '9');
    const input = document.createElement('input');
    el.appendChild(input);
    key(input, '1');
    expect(host.answersChanged).not.toHaveBeenCalled();
  });

  it('in multi-select a digit toggles', () => {
    const { host, row, key } = renderAuq((h) => h.questions.set(MULTI));
    key(document.body, '1');
    expect(row('Dark mode').getAttribute('aria-checked')).toBe('true');
    key(document.body, '1');
    expect(lastCall(host.answersChanged).features.selectedIds).toEqual([]);
  });

  it('the digit after the options focuses the Other field', () => {
    const { key, textarea } = renderAuq((h) => h.questions.set([{ ...SINGLE[0], allowOther: true }]));
    key(document.body, '4');
    expect(document.activeElement).toBe(textarea());
  });

  it('only one instance answers: the most recently mounted when focus is outside', () => {
    @Component({
      imports: [AskUserQuestions],
      template: `
        <ff-ask-user-questions data-testid="a" [questions]="questions" (answersChange)="a($event)" />
        <ff-ask-user-questions data-testid="b" [questions]="questions" (answersChange)="b($event)" />
      `,
    })
    class TwoHost {
      readonly questions = SINGLE;
      readonly a = vi.fn();
      readonly b = vi.fn();
    }
    const fixture = TestBed.createComponent(TwoHost);
    fixture.detectChanges();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.a).not.toHaveBeenCalled();
    expect(fixture.componentInstance.b).toHaveBeenCalledTimes(1);
    // Focus inside the first instance routes the digit there instead.
    const first = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '[data-testid="a"] [data-fluid-hover-index="0"]',
    )!;
    first.focus();
    first.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.a).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.b).toHaveBeenCalledTimes(1);
  });
});

describe('AskUserQuestions: arrows', () => {
  it('Up/Down move focus and the highlight between rows and wrap; Home/End jump', () => {
    const { rows, key, root } = renderAuq();
    rows()[0].focus();
    const down = key(rows()[0], 'ArrowDown');
    expect(down.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(rows()[1]);
    expect(root().querySelector('[data-fluid-hover-active-index]')!.getAttribute('data-fluid-hover-active-index')).toBe('1');
    key(rows()[1], 'ArrowUp');
    key(rows()[0], 'ArrowUp');
    expect(document.activeElement).toBe(rows()[2]);
    key(rows()[2], 'Home');
    expect(document.activeElement).toBe(rows()[0]);
    key(rows()[0], 'End');
    expect(document.activeElement).toBe(rows()[2]);
  });

  it('ArrowDown into the Other row focuses its textarea; ArrowUp at the caret start leaves it', () => {
    const { rows, key, textarea } = renderAuq((h) => h.questions.set([{ ...SINGLE[0], allowOther: true }]));
    rows()[2].focus();
    key(rows()[2], 'ArrowDown');
    expect(document.activeElement).toBe(textarea());
    key(textarea(), 'ArrowUp');
    expect(document.activeElement).toBe(rows()[2]);
  });

  it('Enter and Space on a row select it', () => {
    const { host, rows, key } = renderAuq((h) => h.questions.set(MULTI));
    key(rows()[1], ' ');
    expect(rows()[1].getAttribute('aria-checked')).toBe('true');
    key(rows()[2], 'Enter');
    expect(lastCall(host.answersChanged).features.selectedIds).toEqual(['a11y', 'perf']);
  });

  it('ArrowRight skips and ArrowLeft goes back, without reaching page navigation', () => {
    const { rows, header, key, host } = renderAuq();
    const pageNav = vi.fn();
    window.addEventListener('keydown', pageNav);
    try {
      key(rows()[0], 'ArrowRight');
      expect(header()).toBe('Question 2 of 2');
      expect(host.skipped).toHaveBeenCalledWith({ questionId: 'role', index: 0 });
      key(rows()[0], 'ArrowLeft');
      expect(header()).toBe('Question 1 of 2');
      expect(pageNav).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('keydown', pageNav);
    }
  });
});

describe('AskUserQuestions: focus', () => {
  beforeEach(() => {
    // jsdom never matches :focus-visible; Chrome matches it for any script
    // focus(), the mousedown redirect included.
    const matches = Element.prototype.matches;
    vi.spyOn(Element.prototype, 'matches').mockImplementation(function (this: Element, selector: string) {
      if (selector === ':focus-visible') return this === document.activeElement;
      return matches.call(this, selector);
    });
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(400);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(40);
  });
  afterEach(() => vi.restoreAllMocks());

  const ring = (el: HTMLElement) => el.querySelector('[data-slot="fluid-hover-highlight"][class*="--focus-ring"]');

  it('draws the ring for keyboard focus, never after a click', async () => {
    const { el, rows, key, flush } = renderAuq((h) => h.questions.set(MULTI));
    await nextFrame();
    await nextFrame();
    flush();
    rows()[0].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    flush();
    expect(document.activeElement).toBe(rows()[0]);
    expect(ring(el)).toBeNull();
    key(rows()[0], 'ArrowDown');
    expect(document.activeElement).toBe(rows()[1]);
    expect(ring(el)).not.toBeNull();
  });

  it('a keyboard answer refocuses the next question’s first row; a click does not', async () => {
    const { rows, key, flush, header, el } = renderAuq();
    await nextFrame();
    flush();
    rows()[0].focus();
    key(rows()[0], 'ArrowDown');
    key(rows()[1], 'Enter');
    await nextFrame();
    flush();
    expect(header()).toBe('Question 2 of 2');
    expect(document.activeElement).toBe(rows()[0]);
    expect(rows()[0].textContent).toContain('Figma');

    // A pointer answer leaves focus where it was.
    key(rows()[0], 'ArrowLeft');
    (el.querySelector('[data-testid="outside"]') as HTMLElement).focus();
    rows()[0].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    rows()[0].click();
    flush();
    await nextFrame();
    flush();
    expect(header()).toBe('Question 2 of 2');
    expect(document.activeElement).not.toBe(rows()[0]);
  });

  it('focusing the empty Other field shows the type-here hint', async () => {
    const { el, textarea, flush } = renderAuq((h) => h.questions.set([{ ...SINGLE[0], allowOther: true }]));
    await nextFrame();
    await nextFrame();
    flush();
    textarea().focus();
    flush();
    expect(el.querySelector('.ring-inset.bg-card')).not.toBeNull();
    // No focus ring around the Other field.
    expect(ring(el)).toBeNull();
  });
});
