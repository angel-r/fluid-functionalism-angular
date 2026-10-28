import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { animate } from 'motion';
import {
  cn,
  spring,
  enterTransition,
  fontWeights,
  injectShape,
  injectSize,
  type SizeVariant,
  typeClass,
} from '../core';
import { Button } from '../button';
import {
  FLUID_HOVER,
  FluidHoverItem,
  createFluidHover,
  type ItemRect,
  FluidHoverHighlight,
} from '../fluid-hover';
import { SelectionBackgrounds, createMergeSplitBlocks, createSelectionRuns } from '../merge-split';
import { createGroupFocus } from '../radio-group';
import { AskUserQuestionRow } from './row';
import { AuqPresence, fastWithFade, type PresencePose } from './presence';
import { AuqArrowLeftKey, AuqArrowRightKey } from './arrow-key-icon';
import {
  optionKey,
  questionKey,
  type AskUserAnswer,
  type AskUserOption,
  type AskUserQuestion,
  type AskUserSkipEvent,
} from './types';

type Answers = Record<string, AskUserAnswer>;

// One empty list each, so a question without options or an unanswered one
// keeps the same identity across reads.
const NO_OPTIONS: AskUserOption[] = [];
const NO_IDS: string[] = [];

// Mounted-instance registry for the document-level 1-9 shortcut. The listener
// has to be global (digits work without focus in the card), but only ONE
// instance may answer a keypress: the one containing focus, or — when focus
// is outside every instance — the most recently mounted one.
const mountedInstances: HTMLElement[] = [];

let nextUid = 0;

const FOOTER_POP: PresencePose = { opacity: 0, scale: 0.85 };

/**
 * A card that asks a short sequence of questions: single-select rows that
 * answer on click, multi-select rows with a Continue button, an inline Other
 * field, or one open free-text field. 1-9 answers by number, arrows move
 * between rows (← back, → skip), ⌘/⌃+Enter submits.
 */
@Component({
  selector: 'ff-ask-user-questions',
  imports: [
    NgTemplateOutlet,
    Button,
    FluidHoverItem,
    FluidHoverHighlight,
    SelectionBackgrounds,
    AskUserQuestionRow,
    AuqPresence,
  ],
  providers: [{ provide: FLUID_HOVER, useFactory: () => inject(AskUserQuestions).hover }],
  templateUrl: './ask-user-questions.html',
  host: {
    // A block box standing in for React's root <div>, with its exact classes.
    style: 'display: block',
    '[class]': 'hostClass()',
    '(keydown)': 'handleRootKey($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AskUserQuestions {
  /** Base UI's visually hidden form inputs (Radio / Checkbox), style for style. */
  protected readonly hiddenRadioStyle =
    'clip-path:inset(50%);overflow:hidden;white-space:nowrap;border:0;padding:0;width:1px;height:1px;margin:0;position:fixed;top:0;left:0';
  protected readonly hiddenCheckboxStyle =
    'clip-path:inset(50%);overflow:hidden;white-space:nowrap;border:0;padding:0;width:1px;height:1px;margin:-1px;position:absolute';

  /** Ordered list of questions to ask. */
  readonly questions = input.required<AskUserQuestion[]>();
  /** The active question. Bind `[(currentIndex)]` to control it; omitted,
   *  the flow keeps its own, starting at `defaultCurrentIndex`. */
  readonly currentIndex = model<number | undefined>(undefined);
  readonly defaultCurrentIndex = input(0);
  /** Answers keyed by question id. Bind `[(answers)]` to control them;
   *  omitted, the flow keeps its own, starting at `defaultAnswers`. */
  readonly answers = model<Answers | undefined>(undefined);
  readonly defaultAnswers = input<Answers | undefined>(undefined);
  /** Label for the skip control. */
  readonly skipLabel = input('Skip');
  /** Pins the flow to one step of the size ladder. Omitted, it follows the
   *  surrounding SizeProvider. */
  readonly sizeInput = input<SizeVariant | undefined>(undefined, { alias: 'size' });
  readonly userClass = input('', { alias: 'class' });
  /** Emitted after the last question is answered or submitted. */
  readonly complete = output<Answers>();
  /** Emitted when a question is skipped. */
  readonly skip = output<AskUserSkipEvent>();

  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly shape = injectShape();
  protected readonly size = injectSize(() => this.sizeInput());
  protected readonly compact = computed(() => this.size().variant === 'compact');

  // ⌘ on macOS, ⌃ (Control) elsewhere, for both the hint and the shortcut.
  protected readonly isMac = (() => {
    const nav = this.document.defaultView?.navigator as (Navigator & { userAgentData?: { platform?: string } }) | undefined;
    const platform = nav?.userAgentData?.platform || nav?.platform || '';
    return /mac/i.test(platform);
  })();

  private readonly uid = `auq-${++nextUid}`;
  protected readonly semibold = fontWeights.semibold;
  protected readonly normal = fontWeights.normal;
  protected readonly arrowLeftKey = AuqArrowLeftKey;
  protected readonly arrowRightKey = AuqArrowRightKey;
  protected readonly footerPop = FOOTER_POP;
  protected readonly footerEnter = fastWithFade(0.1);
  protected readonly errorFrom: PresencePose = { opacity: 0, y: -2 };
  protected readonly errorEnter = fastWithFade(0.12);

  // ── Controlled / uncontrolled state ──────────────────────
  private readonly index = computed(() => this.currentIndex() ?? this.defaultCurrentIndex());
  private readonly currentAnswers = computed<Answers>(() => this.answers() ?? this.defaultAnswers() ?? {});

  protected readonly total = computed(() => this.questions().length);
  protected readonly safeIndex = computed(() =>
    Math.max(0, Math.min(this.index(), Math.max(0, this.total() - 1))),
  );
  protected readonly question = computed<AskUserQuestion | undefined>(() => this.questions()[this.safeIndex()]);
  protected readonly qId = computed(() => {
    const q = this.question();
    return q ? questionKey(q, this.safeIndex()) : '';
  });
  /** The current question as a one-item list keyed by its id, so its
   *  content remounts per question (the React `key={qId}`). */
  protected readonly view = computed(() => {
    const q = this.question();
    return q ? [{ key: this.qId(), q }] : [];
  });
  private readonly currentAnswer = computed<AskUserAnswer | undefined>(() => this.currentAnswers()[this.qId()]);

  protected readonly isMulti = computed(() => !!this.question()?.multiSelect);
  private readonly isSkippable = computed(() => this.question()?.skippable !== false);
  protected readonly isFreeText = computed(() => !!this.question()?.freeText);
  // Multi-line is the default; single-line is opt-out.
  protected readonly isFreeTextMultiline = computed(() => this.question()?.freeTextMultiline !== false);
  // freeText owns the whole answer area, so the Other row is suppressed even
  // if a caller sets both.
  protected readonly allowOther = computed(() => !this.isFreeText() && !!this.question()?.allowOther);
  protected readonly selectedIds = computed(() => this.currentAnswer()?.selectedIds ?? NO_IDS);
  protected readonly otherText = computed(() => this.currentAnswer()?.otherText ?? '');
  protected readonly options = computed(() => this.question()?.options ?? NO_OPTIONS);
  protected readonly otherIndex = computed(() => (this.allowOther() ? this.options().length : -1));
  private readonly rowCount = computed(() => this.options().length + (this.allowOther() ? 1 : 0));
  protected readonly layout = computed(() => (this.question()?.layout === 'stacked' ? 'stacked' : 'inline'));
  protected readonly chipPosition = computed(() => this.question()?.chipPosition ?? 'right');
  protected readonly otherLabel = computed(() => this.question()?.otherPlaceholder ?? 'Describe in your own words');
  protected readonly otherPlaceholder = computed(
    () => this.question()?.otherPlaceholder ?? 'Describe in your own words…',
  );
  protected readonly titleId = computed(() => `${this.uid}-${this.qId()}-title`);
  protected readonly errorId = computed(() => `${this.uid}-${this.qId()}-error`);

  // ── Refs & fluid hover ───────────────────────────────────
  private readonly rowsEl = viewChild<ElementRef<HTMLElement>>('rows');
  private readonly otherInput = viewChild<ElementRef<HTMLTextAreaElement>>('otherInput');
  private readonly morphEl = viewChild<ElementRef<HTMLElement>>('morph');
  private readonly measureEl = viewChild<ElementRef<HTMLElement>>('measure');

  readonly hover = createFluidHover(() => this.rowsEl()?.nativeElement);
  protected readonly activeIndex = this.hover.activeIndex;

  /** Focus tracking for the current rows container: activeIndex follows
   *  focus, and the focused index (keyboard focus only) feeds the ring. A
   *  new question brings a new container, so it starts with nothing focused. */
  protected readonly groupFocus = computed(() => {
    const el = this.rowsEl()?.nativeElement;
    return el ? createGroupFocus(this.hover, el) : null;
  });
  private readonly focusedIndex = computed(() => this.groupFocus()?.focusedIndex() ?? null);

  /** Whether the Other textarea currently shows more than one line. */
  protected readonly isOtherMultiline = signal(false);
  /** Validation message for the current freeText question (null = valid). */
  protected readonly freeTextError = signal<string | null>(null);
  private readonly contentHeight = signal<number | null>(null);
  private restoreFocus = false;

  // ── Selected-row grouping (merges contiguous selections) ──
  // A filled Other row joins the selection, so it merges into the same
  // morphing background as adjacent selected options.
  private readonly selectedIndices = computed(() => {
    const ids = this.selectedIds();
    const list: number[] = [];
    this.options().forEach((opt, i) => {
      if (ids.includes(optionKey(opt, i))) list.push(i);
    });
    if (this.allowOther() && this.otherText().length > 0) list.push(this.otherIndex());
    return list;
  });
  private readonly runs = createSelectionRuns(() => this.selectedIndices());
  protected readonly blocks = createMergeSplitBlocks(this.runs, this.hover.itemRects, () => this.shape().bgRadius);

  // ── Indicators ───────────────────────────────────────────
  // The focus ring follows keyboard focus over option rows, 2px outside the
  // row. Suppressed for the Other field, which has its own treatment.
  protected readonly focusRingRect = computed<ItemRect | null>(() => {
    const index = this.focusedIndex();
    if (index === null || (this.allowOther() && index === this.otherIndex())) return null;
    const rect = this.hover.itemRects()[index];
    return rect ? { top: rect.top - 2, left: rect.left - 2, width: rect.width + 4, height: rect.height + 4 } : null;
  });
  // The "type here" hint: the empty Other field, focused.
  protected readonly hintRect = computed<ItemRect | null>(() => {
    if (!this.allowOther()) return null;
    const index = this.otherIndex();
    if (this.focusedIndex() !== index || this.otherText().length > 0) return null;
    return this.hover.itemRects()[index] ?? null;
  });
  protected readonly hintClass = computed(() =>
    cn('absolute pointer-events-none bg-card ring-1 ring-inset ring-border', this.shape().bg),
  );
  protected readonly ringClass = computed(() =>
    cn(
      'absolute pointer-events-none bg-transparent border border-[color:var(--focus-ring,#6B97FF)] z-20',
      this.shape().focusRing,
    ),
  );

  // ── Footer ───────────────────────────────────────────────
  protected readonly showBack = computed(() => this.total() > 1 && this.safeIndex() > 0);
  protected readonly showSkip = computed(() => this.total() > 1 && this.isSkippable());
  // freeText commits through the same bottom submit button as multi-select.
  protected readonly showSubmit = computed(() => this.isMulti() || this.isFreeText());
  protected readonly showFooter = computed(() => this.showBack() || this.showSkip() || this.showSubmit());
  protected readonly submitLabel = computed(
    () => this.question()?.nextLabel ?? (this.safeIndex() >= this.total() - 1 ? 'Finish' : 'Continue'),
  );
  protected readonly submitDisabled = computed(() =>
    this.isFreeText()
      ? this.otherText().trim().length === 0
      : this.selectedIds().length === 0 && this.otherText().trim().length === 0,
  );

  // ── Roving tabindex ──────────────────────────────────────
  // One tab stop for the whole group: the first selected row, or the first
  // row while unanswered. The Other row never takes it.
  private readonly firstSelectedRow = computed(() => {
    const ids = this.selectedIds();
    return this.options().findIndex((opt, i) => ids.includes(optionKey(opt, i)));
  });

  // ── Classes ──────────────────────────────────────────────
  protected readonly hostClass = computed(() =>
    this.question()
      ? cn(
          // overflow-hidden crops the footer buttons to the card's rounded
          // bounds, so a button animating out is clipped at the edge.
          'relative w-full max-w-[520px] overflow-hidden bg-card border border-border',
          this.shape().container,
          this.userClass(),
        )
      : cn('w-full max-w-[520px] p-5 bg-card border border-border', this.shape().container, this.userClass()),
  );
  protected readonly headerClass = computed(() =>
    cn(
      'flex items-center text-muted-foreground',
      // px-3.5 is the floor: the option rows bleed by -mx-3.
      this.compact()
        ? 'px-3.5 sm:px-4 pt-2.5 sm:pt-3 pb-1.5 text-[length:var(--fs-caption-compact,11px)] leading-[var(--lh-caption-compact,14px)]'
        : 'px-4 sm:px-5 pt-3.5 sm:pt-4 pb-2 text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)]',
    ),
  );
  protected readonly measureClass = computed(() =>
    cn(
      this.compact() ? 'px-3.5 sm:px-4' : 'px-4 sm:px-5',
      this.showFooter() ? 'pb-1' : this.compact() ? 'pb-2 sm:pb-2.5' : 'pb-2.5 sm:pb-3',
    ),
  );
  protected readonly footerClass = computed(() =>
    cn('pt-1', this.compact() ? 'px-3.5 sm:px-4 pb-1.5' : 'px-4 sm:px-5 pb-2'),
  );
  protected readonly captionClass = computed(() =>
    cn(typeClass('caption', this.compact() ? 'compact' : 'default'), 'text-muted-foreground'),
  );
  protected readonly freeTextBoxClass = computed(() =>
    cn(
      'relative mt-1 cursor-text transition-colors',
      this.compact() ? '-mx-2.5 py-2' : '-mx-3 py-2.5',
      this.size().px,
      this.isFreeTextMultiline() ? 'min-h-[76px]' : this.compact() ? 'min-h-8' : 'min-h-10',
      this.shape().bg,
      this.otherText().length > 0
        ? 'bg-active'
        : 'hover:bg-hover focus-within:bg-card focus-within:ring-1 focus-within:ring-inset focus-within:ring-border',
    ),
  );
  private readonly fieldBase =
    'block w-full bg-transparent border-0 p-0 m-0 outline-none resize-none overflow-hidden text-foreground placeholder:text-muted-foreground';
  protected readonly freeTextFieldClass = computed(() =>
    // Touch screens get 16px text; 1px of padding holds the overhang so the
    // auto-resize's scrollHeight doesn't round up, and -1px margins keep the
    // row's height.
    cn(this.fieldBase, this.size().field, 'pointer-coarse:py-px pointer-coarse:-my-px'),
  );
  protected readonly otherFieldClass = computed(() =>
    cn('col-start-1 row-start-1', this.fieldBase, this.size().field, 'pointer-coarse:py-px pointer-coarse:-my-px'),
  );

  constructor() {
    // Reset transient state when the question changes, so the new question
    // never shows the last one's highlight, error or multi-line flag.
    effect(() => {
      this.safeIndex();
      this.qId();
      untracked(() => {
        this.hover.setActiveIndex(null);
        this.freeTextError.set(null);
        this.isOtherMultiline.set(false);
      });
    });

    // The document-level 1-9 shortcut, while there is a question.
    effect((onCleanup) => {
      if (!this.question()) return;
      const root = this.host;
      mountedInstances.push(root);
      const handler = (e: KeyboardEvent) => this.handleDigit(e);
      this.document.addEventListener('keydown', handler);
      onCleanup(() => {
        const i = mountedInstances.indexOf(root);
        if (i !== -1) mountedInstances.splice(i, 1);
        this.document.removeEventListener('keydown', handler);
      });
    });

    // Keyboard focus restoration: the question content remounts, which
    // drops focus. If the user was keyboard-driving inside the rows, focus
    // the new question's first row so arrows keep routing here.
    afterRenderEffect(() => {
      this.safeIndex();
      untracked(() => {
        if (!this.restoreFocus) return;
        this.restoreFocus = false;
        this.rowsEl()?.nativeElement.querySelector<HTMLElement>('[data-fluid-hover-index="0"]')?.focus();
      });
    });

    // Textarea auto-resize: reset to 0 so it can shrink, then grow to its
    // scrollHeight; flag the Other row multi-line past 1.5 line-heights.
    afterRenderEffect(() => {
      this.otherText();
      this.qId();
      const el = this.otherInput()?.nativeElement;
      if (!el) return;
      untracked(() => {
        el.style.height = '0px';
        el.style.height = `${el.scrollHeight}px`;
        const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 18;
        const multiline = el.scrollHeight > lineHeight * 1.5;
        if (multiline !== this.isOtherMultiline()) this.isOtherMultiline.set(multiline);
      });
    });

    // freeText auto-focus: drop the caret into the field as the question
    // appears, without scrolling the viewport to it.
    afterRenderEffect(() => {
      if (!this.isFreeText()) return;
      this.qId();
      const el = this.otherInput()?.nativeElement;
      untracked(() => el?.focus({ preventScroll: true }));
    });

    // Animated height: track the natural height of the Q/A content and
    // animate the wrapper's real height to it, so the card border and the
    // footer reflow frame by frame with the spring.
    afterRenderEffect((onCleanup) => {
      const el = this.measureEl()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') return;
      const update = () => this.contentHeight.set(el.offsetHeight);
      update();
      const ro = new ResizeObserver(update);
      ro.observe(el);
      onCleanup(() => ro.disconnect());
    });
    let measured = false;
    effect((onCleanup) => {
      const height = this.contentHeight();
      const morph = this.morphEl()?.nativeElement;
      if (height === null || !morph) return;
      // initial={false}: the first height lands without a morph.
      if (!measured) {
        measured = true;
        morph.style.height = `${height}px`;
        return;
      }
      const controls = animate(morph, { height }, enterTransition(spring.slow));
      onCleanup(() => controls.stop());
    });
  }

  // ── Answer actions ───────────────────────────────────────
  private writeAnswers(updater: (prev: Answers) => Answers): Answers {
    const next = updater(this.currentAnswers());
    this.answers.set(next);
    return next;
  }

  private setIndex(next: number) {
    this.currentIndex.set(next);
  }

  private markFocusRestore() {
    // Only when keyboard-driving: focusedIndex is non-null only for keyboard
    // focus, so a click never restores (and never strands the ring).
    if (this.rowsEl()?.nativeElement.contains(this.document.activeElement) && this.focusedIndex() !== null) {
      this.restoreFocus = true;
    }
  }

  private goNext(snapshot: Answers) {
    const index = this.safeIndex();
    if (index >= this.total() - 1) {
      this.complete.emit(snapshot);
    } else {
      this.markFocusRestore();
      this.setIndex(index + 1);
    }
  }

  protected handleSingleSelect(optId: string) {
    if (!this.question()) return;
    const qId = this.qId();
    const text = this.currentAnswers()[qId]?.otherText;
    const snapshot = this.writeAnswers((prev) => ({
      ...prev,
      [qId]: { questionId: qId, selectedIds: [optId], otherText: text || undefined, skipped: false },
    }));
    this.goNext(snapshot);
  }

  protected handleMultiToggle(optId: string) {
    if (!this.question()) return;
    const qId = this.qId();
    this.writeAnswers((prev) => {
      const existing = prev[qId];
      const set = new Set(existing?.selectedIds ?? []);
      if (set.has(optId)) set.delete(optId);
      else set.add(optId);
      return {
        ...prev,
        [qId]: { questionId: qId, selectedIds: Array.from(set), otherText: existing?.otherText, skipped: false },
      };
    });
  }

  /** Mirrors a hidden primitive's state into the answer, so the two never
   *  disagree (rows normally go through the toggle/select handlers). */
  protected handleHiddenChange(optId: string, checked: boolean) {
    if (!this.isMulti()) {
      if (checked) this.handleSingleSelect(optId);
      return;
    }
    if (this.selectedIds().includes(optId) !== checked) this.handleMultiToggle(optId);
  }

  protected handleOtherChange(text: string) {
    if (!this.question()) return;
    const qId = this.qId();
    // Editing clears a standing validation error — the user is fixing it.
    this.freeTextError.set(null);
    this.writeAnswers((prev) => ({
      ...prev,
      [qId]: { questionId: qId, selectedIds: prev[qId]?.selectedIds ?? [], otherText: text, skipped: false },
    }));
  }

  protected handleOtherSubmit() {
    const question = this.question();
    if (!question) return;
    const qId = this.qId();
    const text = (this.currentAnswers()[qId]?.otherText ?? '').trim();
    if (!text) return;
    // freeText questions may validate on submit; a returned message blocks
    // navigation and surfaces in the footer.
    if (question.freeText && question.freeTextValidate) {
      const message = question.freeTextValidate(text);
      if (message) {
        this.freeTextError.set(message);
        return;
      }
    }
    this.freeTextError.set(null);
    const snapshot = this.writeAnswers((prev) => ({
      ...prev,
      [qId]: { questionId: qId, selectedIds: prev[qId]?.selectedIds ?? [], otherText: text, skipped: false },
    }));
    this.goNext(snapshot);
  }

  protected handleSkip() {
    if (!this.question()) return;
    const qId = this.qId();
    const snapshot = this.writeAnswers((prev) => ({
      ...prev,
      [qId]: {
        questionId: qId,
        selectedIds: prev[qId]?.selectedIds ?? [],
        otherText: prev[qId]?.otherText,
        skipped: true,
      },
    }));
    this.skip.emit({ questionId: qId, index: this.safeIndex() });
    this.goNext(snapshot);
  }

  protected handleMultiNext() {
    this.goNext(this.currentAnswers());
  }

  protected handleBack() {
    const index = this.safeIndex();
    if (index > 0) {
      this.markFocusRestore();
      this.setIndex(index - 1);
    }
  }

  protected submit() {
    if (this.isFreeText()) this.handleOtherSubmit();
    else this.handleMultiNext();
  }

  protected focusOther() {
    this.otherInput()?.nativeElement.focus();
  }

  // ── Row helpers ──────────────────────────────────────────
  protected optionId(opt: AskUserOption, i: number) {
    return optionKey(opt, i);
  }

  protected isSelected(opt: AskUserOption, i: number) {
    return this.selectedIds().includes(optionKey(opt, i));
  }

  protected rowTabIndex(i: number) {
    const first = this.firstSelectedRow();
    return i === first || (first === -1 && i === 0) ? 0 : -1;
  }

  protected selectOption(opt: AskUserOption, i: number) {
    const id = optionKey(opt, i);
    if (this.isMulti()) this.handleMultiToggle(id);
    else this.handleSingleSelect(id);
  }

  protected onRowKey(e: KeyboardEvent, opt: AskUserOption, i: number) {
    // ⌘/Ctrl+Enter falls through to the root handler (Continue) instead of
    // toggling the focused row.
    if ((e.key === ' ' || e.key === 'Enter') && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      this.selectOption(opt, i);
    }
  }

  protected showOtherArrow() {
    const index = this.otherIndex();
    return (
      !this.isMulti() &&
      (this.focusedIndex() === index || this.activeIndex() === index) &&
      this.otherText().trim().length > 0
    );
  }

  protected onOtherKey(e: KeyboardEvent) {
    // Plain Enter submits, Shift+Enter inserts a newline. In multi-select,
    // plain Enter stays a newline and ⌘/⌃+Enter (root) continues.
    if (e.key !== 'Enter' || e.shiftKey) return;
    if (!this.isMulti()) {
      e.preventDefault();
      this.handleOtherSubmit();
    }
  }

  protected onFreeTextKey(e: KeyboardEvent) {
    // Multi-line: plain Enter is a newline; ⌘/⌃+Enter submits (root).
    // Single-line: plain Enter submits like an input.
    if (e.key !== 'Enter') return;
    if (e.shiftKey || e.metaKey || e.ctrlKey) return;
    if (!this.isFreeTextMultiline()) {
      e.preventDefault();
      this.handleOtherSubmit();
    }
  }

  // ── Keyboard ─────────────────────────────────────────────
  private handleDigit(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
    // Only one mounted instance may answer this keypress.
    const root = this.host;
    if (!root.contains(target)) {
      if (mountedInstances.some((el) => el !== root && el.contains(target))) return;
      // A focused element that wraps instances narrows the pick to the ones
      // inside it; focus on <body> wraps them all.
      const wrapped = mountedInstances.filter((el) => target.contains(el));
      const pool = wrapped.length > 0 ? wrapped : mountedInstances;
      if (pool[pool.length - 1] !== root) return;
    }
    const code = e.key;
    if (code.length !== 1 || code < '1' || code > '9') return;
    const idx = parseInt(code, 10) - 1;
    const options = this.options();
    if (idx >= 0 && idx < options.length) {
      e.preventDefault();
      const id = optionKey(options[idx], idx);
      if (this.isMulti()) this.handleMultiToggle(id);
      else this.handleSingleSelect(id);
    } else if (idx === options.length && this.allowOther()) {
      e.preventDefault();
      this.focusOther();
    }
  }

  private focusRow(idx: number) {
    this.rowsEl()?.nativeElement.querySelector<HTMLElement>(`[data-fluid-hover-index="${idx}"]`)?.focus();
  }

  private moveActive(next: number) {
    this.hover.setActiveIndex(next);
    // The Other row is a text field: focus the textarea so typing works.
    if (this.allowOther() && next === this.otherIndex()) this.focusOther();
    else this.focusRow(next);
  }

  /** Up/Down move the highlight and focus between rows (the same indicator
   *  as hover), Home/End jump, ← goes back, → skips. The arrows handled stop
   *  here so page-level ←/→ navigation doesn't also fire. */
  protected handleNavKey(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    // Inside the Other field, ←/→ and Home/End move the caret. ↑/↓ leave
    // the field only when the caret has nowhere left to go in that direction.
    if (isTextInput && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    if (isTextInput && target.tagName === 'TEXTAREA') {
      const ta = target as HTMLTextAreaElement;
      if (e.key === 'ArrowUp' && ta.selectionStart > 0) return;
      if (e.key === 'ArrowDown' && ta.selectionEnd < ta.value.length) return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'ArrowLeft') {
        if (this.safeIndex() > 0) this.handleBack();
      } else if (this.isSkippable() && this.total() > 1) {
        this.handleSkip();
      }
      return;
    }

    const rowCount = this.rowCount();
    if (rowCount === 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      e.stopPropagation();
      let next: number;
      if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = rowCount - 1;
      else {
        // In the Other field, treat it as the Other row.
        const base = isTextInput ? this.otherIndex() : (this.activeIndex() ?? -1);
        next = e.key === 'ArrowDown' ? base + 1 : base - 1;
        next = (next + rowCount) % rowCount;
      }
      this.moveActive(next);
    }
  }

  /** ⌘+Enter (macOS) / Ctrl+Enter elsewhere commits a multi-select or
   *  freeText question from anywhere inside the card. */
  protected handleRootKey(e: KeyboardEvent) {
    if (e.key !== 'Enter' || !this.question()) return;
    const mod = this.isMac ? e.metaKey : e.ctrlKey;
    if (!mod || !(this.isMulti() || this.isFreeText())) return;
    e.preventDefault();
    if (this.isFreeText()) {
      if (this.otherText().trim().length > 0) this.handleOtherSubmit();
      return;
    }
    const hasAnswer = this.selectedIds().length > 0 || this.otherText().trim().length > 0;
    if (hasAnswer) this.handleMultiNext();
  }
}
