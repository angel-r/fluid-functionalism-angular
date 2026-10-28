import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  TemplateRef,
  afterNextRender,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  cn,
  spring,
  injectShape,
  type SizeVariant,
  injectSizeVariant,
  typeClass,
  injectTouchPrimary,
  ReducedMotion,
  type FluidAnimation,
  enterTransition,
  injectAnimateFluid,
} from '@angel-r/fluid-functionalism-angular/core';
import { FileThumbnail } from '@angel-r/fluid-functionalism-angular/file-thumbnail';
import { CHAT_MESSAGE_ENTRANCE_OVERRIDE } from './entrance';

export type ChatMessageFrom = 'user' | 'assistant';
/** Text, or a template for richer markup (React: `ReactNode`). */
export type ChatMessageSlot = string | number | TemplateRef<unknown> | null | undefined;

// ─── ChatMessage ──────────────────────────────────────────────────────────
// A single transcript entry with baked-in entrance + layout motion. Pairs with
// InputMessage's send: render one per sent/received message. Earlier messages
// slide to their new place when the transcript around them changes (the React
// `layout="position"`).

/**
 * One chat transcript entry: `<ff-chat-message from="user">Hi</ff-chat-message>`.
 * The projected content is the message body; when it is empty the body is
 * dropped (attachment-only message).
 */
@Component({
  selector: 'ff-chat-message',
  imports: [NgTemplateOutlet, FileThumbnail],
  host: {
    '[class]': 'hostClass()',
    '[style.transform-origin]': 'isUser() ? "bottom right" : "bottom left"',
  },
  template: `
    @if (files()?.length) {
      <div [class]="filesClass()">
        @for (file of files(); track fileKey(file, $index)) {
          <ff-file-thumbnail [file]="file" [size]="thumbnailSize()" />
        }
      </div>
    }
    <div #body data-slot="chat-message-body" [class]="bodyClass()"><ng-content /></div>
    @if (showTime() || actions()) {
      <!-- Meta row: timestamp + icon-only actions. Always rendered (so it
           reserves its height and the gap between bubbles never shifts) but
           hidden until the message is hovered or an action is focused. The
           timestamp is a user-message affordance only — assistant replies
           show their actions alone. User rows read date → icons left-to-right. -->
      <div data-slot="chat-message-meta" [class]="metaClass()">
        @if (showTime()) {
          <span class="tabular-nums">@if (timeTemplate(); as template) {<ng-container [ngTemplateOutlet]="template" />} @else {{{ time() }}}</span>
        }
        @if (actions(); as template) {
          <span class="flex items-center gap-0.5"><ng-container [ngTemplateOutlet]="template" /></span>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessage {
  /** Who sent the message. Drives alignment and bubble colour: `user` →
   *  right-aligned accent bubble, `assistant` → left-aligned plain text. */
  readonly from = input.required<ChatMessageFrom>();
  /** Optional attachments rendered as square thumbnails above the bubble. */
  readonly files = input<File[] | undefined>(undefined);
  /** Side length of each attachment thumbnail in pixels. */
  readonly thumbnailSize = input(64);
  /** Timestamp shown in the hover-revealed meta row, before the actions.
   *  User-message only — ignored on assistant replies. Caller pre-formats it
   *  (e.g. `"Wednesday 6:08 PM"`). */
  readonly time = input<ChatMessageSlot>(undefined);
  /** Icon-only action buttons shown in the hover-revealed meta row (e.g.
   *  copy, edit, regenerate), as a template. Rendered next to the timestamp. */
  readonly actions = input<TemplateRef<unknown> | null | undefined>(undefined);
  /** Pins the message to one step of the size ladder — compact tightens
   *  bubble type and padding. Omitted, it follows the surrounding SizeProvider. */
  readonly size = input<SizeVariant | undefined>(undefined);
  readonly userClass = input('', { alias: 'class' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly shape = injectShape();
  private readonly variant = injectSizeVariant(() => this.size());
  // Hover-reveal is unreachable on touch — keep the meta row visible there.
  private readonly isTouch = injectTouchPrimary();
  private readonly reduced = inject(ReducedMotion).value;
  private readonly animateFluid = injectAnimateFluid();
  private readonly entranceOverride = inject(CHAT_MESSAGE_ENTRANCE_OVERRIDE, { self: true, optional: true });
  private readonly body = viewChild.required<ElementRef<HTMLElement>>('body');

  protected readonly isUser = computed(() => this.from() === 'user');
  private readonly compact = computed(() => this.variant() === 'compact');
  // Timestamps are a user-message affordance; assistant replies show actions only.
  protected readonly showTime = computed(() => this.isUser() && this.time() != null);
  protected readonly timeTemplate = computed(() => {
    const time = this.time();
    return time instanceof TemplateRef ? time : null;
  });

  protected readonly hostClass = computed(() =>
    cn(
      'group flex max-w-[80%] flex-col gap-1.5',
      this.isUser() ? 'items-end self-end' : 'items-start self-start',
      this.userClass(),
    ),
  );
  protected readonly filesClass = computed(() =>
    cn('flex flex-wrap gap-1.5', this.isUser() ? 'justify-end' : 'justify-start'),
  );
  protected readonly bodyClass = computed(() => {
    const compact = this.compact();
    return cn(
      'whitespace-pre-wrap break-words',
      compact ? 'py-1.5' : 'py-2',
      typeClass('subtitle', compact ? 'compact' : 'default'),
      // User keeps the bubble chrome (rounded fill + horizontal padding); the
      // assistant reply is flush-left plain text with no background.
      this.isUser()
        ? cn(
            this.shape().bg,
            compact ? 'px-3' : 'px-3.5',
            // `text-pretty` is reserved for settled user bubbles. On the
            // assistant reply it's left off on purpose: `text-wrap: pretty`
            // re-balances the last lines on every content change, so a
            // word-by-word stream visibly reflows earlier words to new lines.
            'text-pretty bg-[color-mix(in_oklab,var(--accent),var(--background)_45%)] text-foreground',
          )
        : 'text-foreground',
    );
  });
  protected readonly metaClass = computed(() =>
    cn(
      'flex items-center gap-2 px-1 text-muted-foreground select-none',
      typeClass('caption', this.compact() ? 'compact' : 'default'),
      !this.isTouch() && [
        'opacity-0 pointer-events-none transition-opacity duration-150',
        'group-hover:opacity-100 group-hover:pointer-events-auto',
        'group-focus-within:opacity-100 group-focus-within:pointer-events-auto',
      ],
    ),
  );

  protected fileKey(file: File, index: number) {
    return `${file.name}-${file.size}-${file.lastModified}-${index}`;
  }

  constructor() {
    const destroyRef = inject(DestroyRef);
    // Start hidden so the first paint is the entrance's first frame.
    this.host.style.opacity = '0';
    this.host.style.transform = 'translateY(8px) scale(0.96)';

    afterNextRender(() => {
      this.watchBody(destroyRef);
      // A morph on this element plays the entrance instead (React initial={false}).
      if (this.entranceOverride?.takeOverEntrance()) {
        this.watchLayout(destroyRef);
        return;
      }
      const entrance = this.animateFluid(
        this.host,
        { opacity: [0, 1], y: [8, 0], scale: [0.96, 1] },
        enterTransition(spring.moderate),
      );
      destroyRef.onDestroy(() => entrance.stop());
      this.watchLayout(destroyRef);
    });
  }

  /** The body is dropped when nothing (or an empty string) is projected. */
  private watchBody(destroyRef: DestroyRef) {
    const body = this.body().nativeElement;
    const sync = () => {
      const hasContent = Array.from(body.childNodes).some(
        (node) => node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && node.textContent !== ''),
      );
      body.hidden = !hasContent;
    };
    sync();
    if (typeof MutationObserver === 'undefined') return;
    const mo = new MutationObserver(sync);
    mo.observe(body, { childList: true, characterData: true, subtree: true });
    destroyRef.onDestroy(() => mo.disconnect());
  }

  /**
   * FLIP on layout position: when the transcript around this message changes
   * (a message appended, a streamed reply growing) and its layout box moves,
   * it springs from where it was to where it is, on the same tier as the
   * entrance. Animates the CSS `translate` property so it composes with the
   * entrance's transform. Layout offsets are transform- and scroll-immune.
   */
  private watchLayout(destroyRef: DestroyRef) {
    const parent = this.host.parentElement;
    if (!parent) return;
    let last = { top: this.host.offsetTop, left: this.host.offsetLeft };
    let animation: FluidAnimation | null = null;

    const measure = () => {
      const next = { top: this.host.offsetTop, left: this.host.offsetLeft };
      const dx = last.left - next.left;
      const dy = last.top - next.top;
      last = next;
      if (dx === 0 && dy === 0) return;
      // React's `layout="position"` rides on transform, which reduced motion
      // makes instant: the message is already on its layout box. A reduced
      // jump would also be painted a frame late, and the next mutation stops
      // it unlanded — stranding a stale offset that the next FLIP compounds.
      if (this.reduced()) {
        animation?.stop();
        animation = null;
        this.host.style.translate = '';
        return;
      }
      // Re-targeting mid-flight starts from the visual offset still left.
      const [rx, ry] = parseTranslate(this.host.style.translate);
      const from = `${dx + rx}px ${dy + ry}px`;
      animation?.stop();
      this.host.style.translate = from;
      animation = this.animateFluid(this.host, { translate: [from, '0px 0px'] }, enterTransition(spring.moderate));
    };

    if (typeof MutationObserver !== 'undefined') {
      const mo = new MutationObserver(measure);
      mo.observe(parent, { childList: true, characterData: true, subtree: true });
      destroyRef.onDestroy(() => mo.disconnect());
    }
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(parent);
      destroyRef.onDestroy(() => ro.disconnect());
    }
    destroyRef.onDestroy(() => animation?.stop());
  }
}

function parseTranslate(value: string): [number, number] {
  const [x = '0', y = '0'] = value.trim().split(/\s+/);
  return [parseFloat(x) || 0, parseFloat(y) || 0];
}
