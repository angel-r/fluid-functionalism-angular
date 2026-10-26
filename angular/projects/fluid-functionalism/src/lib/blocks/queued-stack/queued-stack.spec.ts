/**
 * QueuedStack through its public interface. Upstream has no queued-stack
 * test, so this pins one test per rule of registry/blocks/queued-stack.tsx:
 * one card per queued message (front card on top, attachment-only label,
 * thumbnails), the collapsed / expanded geometry and hover fan-out, the
 * gutter count once cards overflow the peeks, the enqueue recoil, edit
 * (double-click and ✎) and remove (×), drag-to-reorder while expanded, the
 * touch tap-to-expand and collapse button, the compact step, the exit of a
 * removed card, and the queued→sent morph claimed by `[ffQueuedStackMorph]`.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SizeProvider, type SizeVariant } from '../../core/size';
import { FILE_THUMBNAIL_PDF_RENDERER } from '../../file-thumbnail/file-thumbnail';
import { type QueuedMessage } from '../../input-message/input-message.types';
import { QUEUE_CARD_H, QUEUE_CARD_H_COMPACT, QueuedStack, collapsedStackHeight } from './queued-stack';
import { QueuedStackMorph } from './queued-stack-morph';

interface Sent {
  id: string;
  text: string;
  key?: string;
}

@Component({
  imports: [QueuedStack, QueuedStackMorph, SizeProvider],
  template: `
    <div class="relative" ffSizeProvider [size]="size()">
      <ff-queued-stack
        [(queue)]="queue"
        [bottom]="bottom()"
        [morphLayoutId]="morph() ? layoutId : undefined"
        (edit)="edits.push($event)"
        (remove)="removes.push($event)"
      />
      @for (t of sent(); track t.id) {
        <div data-testid="bubble" [ffQueuedStackMorph]="t.key">
          <span data-queued-morph-text>{{ t.text }}</span>
        </div>
      }
    </div>
  `,
})
class Host {
  readonly queue = signal<QueuedMessage[]>([]);
  readonly bottom = signal(60);
  readonly morph = signal(true);
  readonly size = signal<SizeVariant | undefined>(undefined);
  readonly sent = signal<Sent[]>([]);
  readonly layoutId = (item: QueuedMessage) => `qm-${item.id}`;
  readonly edits: QueuedMessage[] = [];
  readonly removes: QueuedMessage[] = [];
}

const png = new File(['img'], 'photo.png', { type: 'image/png', lastModified: 1 });
const queued = (id: string, text: string, files: File[] = []): QueuedMessage => ({ id, text, files });

let hoverNone = false;

beforeEach(() => {
  hoverNone = false;
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(hover: none)' ? hoverNone : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function setup(configure: (host: Host) => void = () => {}) {
  URL.createObjectURL = vi.fn(() => 'blob:test/1');
  URL.revokeObjectURL = vi.fn();
  TestBed.configureTestingModule({
    providers: [{ provide: FILE_THUMBNAIL_PDF_RENDERER, useValue: () => new Promise<string>(() => {}) }],
  });
  const fixture = TestBed.createComponent(Host);
  const host = fixture.componentInstance;
  configure(host);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const render = () => fixture.detectChanges();
  const stack = () => el.querySelector<HTMLElement>('[data-slot="queued-stack"]');
  const cards = () => Array.from(el.querySelectorAll<HTMLElement>('[data-slot="queued-stack-card"]'));
  const card = (key: string) => el.querySelector<HTMLElement>(`[data-slot="queued-stack-card"][data-key="${key}"]`);
  const button = (label: string) => el.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  return { fixture, host, el, render, stack, cards, card, button };
}

const pointer = (type: string, target: EventTarget, clientY: number, button = 0) =>
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, button, clientY }));

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

describe('QueuedStack', () => {
  it('renders nothing while the queue is empty', () => {
    const { stack } = setup();
    expect(stack()).toBeNull();
  });

  it('renders one card per queued message, the front card on top', () => {
    const { stack, cards } = setup((h) =>
      h.queue.set([queued('a', 'first'), queued('b', 'second'), queued('c', 'third')]),
    );
    expect(stack()!.style.bottom).toBe('60px');
    expect(cards().map((c) => c.textContent?.includes('first') || c.textContent?.includes('second') || c.textContent?.includes('third'))).toEqual([true, true, true]);
    expect(cards().map((c) => c.style.zIndex)).toEqual(['100', '99', '98']);
    expect(cards()[0].style.height).toBe(`${QUEUE_CARD_H}px`);
    expect(cards()[0].style.transformOrigin).toBe('bottom center');
    expect(cards()[0].classList.contains('pl-3.5')).toBe(true);
    expect(cards()[0].classList.contains('shadow-surface-3')).toBe(true);
  });

  it('labels an attachment-only card by its file count and shows the thumbnails', () => {
    const { card } = setup((h) => h.queue.set([queued('a', '', [png]), queued('b', '', [png, png, png, png, png])]));
    expect(card('a')!.querySelector('span.truncate')!.textContent!.trim()).toBe('1 attachment');
    expect(card('b')!.querySelector('span.truncate')!.textContent!.trim()).toBe('5 attachments');
    expect(card('a')!.classList.contains('pl-2')).toBe(true);
    // At most 3 thumbnails, then a "+N" chip.
    expect(card('b')!.querySelectorAll('ff-file-thumbnail')).toHaveLength(3);
    expect(card('b')!.textContent).toContain('+2');
  });

  it('collapses to the front card plus two peeks and fans out on hover', async () => {
    const { stack, render } = setup((h) =>
      h.queue.set([queued('a', 'first'), queued('b', 'second'), queued('c', 'third')]),
    );
    expect(collapsedStackHeight(3, QUEUE_CARD_H)).toBe(68);
    await vi.waitFor(() => expect(stack()!.style.height).toBe('68px'), { timeout: 2000 });
    expect(stack()!.hasAttribute('data-expanded')).toBe(false);
    stack()!.dispatchEvent(new MouseEvent('mouseenter'));
    render();
    expect(stack()!.hasAttribute('data-expanded')).toBe(true);
    await vi.waitFor(() => expect(stack()!.style.height).toBe(`${3 * 44 + 2 * 8}px`), { timeout: 2000 });
    stack()!.dispatchEvent(new MouseEvent('mouseleave'));
    render();
    expect(stack()!.hasAttribute('data-expanded')).toBe(false);
  });

  it('surfaces the total count in the gutter once cards overflow the peeks', () => {
    const { host, el, render } = setup((h) =>
      h.queue.set([queued('a', '1'), queued('b', '2'), queued('c', '3')]),
    );
    const count = () => el.querySelector('[data-slot="queued-stack-count"]');
    expect(count()).toBeNull();
    host.queue.update((q) => [...q, queued('d', '4')]);
    render();
    expect(count()!.textContent!.trim()).toBe('4');
  });

  it('recoils the collapsed stack when a message is enqueued', () => {
    const { host, el, render } = setup((h) => h.queue.set([queued('a', '1'), queued('b', '2')]));
    const layer = el.querySelector<HTMLElement>('[data-slot="queued-stack-layer"]')!;
    expect(layer.style.transform).not.toContain('-7px');
    host.queue.update((q) => [...q, queued('c', '3')]);
    render();
    expect(layer.style.transform).toContain('translateY(-7px)');
  });

  it('double-click and the ✎ button emit edit; × emits remove', () => {
    const { host, card, button } = setup((h) => h.queue.set([queued('a', 'first'), queued('b', 'second')]));
    card('b')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(host.edits.map((q) => q.id)).toEqual(['b']);
    button('Edit queued message: first')!.click();
    expect(host.edits.map((q) => q.id)).toEqual(['b', 'a']);
    button('Remove queued message: second')!.click();
    expect(host.removes.map((q) => q.id)).toEqual(['b']);
  });

  it('hides the card actions until hover on hover-capable devices', () => {
    const { button } = setup((h) => h.queue.set([queued('a', 'first')]));
    const group = button('Edit queued message: first')!.closest('ff-tooltip')!.parentElement!;
    expect(group.classList.contains('hidden')).toBe(true);
    expect(group.classList.contains('group-hover/qm:flex')).toBe(true);
  });

  it('drags a card between slots while expanded and reorders the queue', () => {
    const { host, stack, card, render } = setup((h) =>
      h.queue.set([queued('a', 'first'), queued('b', 'second'), queued('c', 'third')]),
    );
    vi.spyOn(stack()!, 'getBoundingClientRect').mockReturnValue(rect(0, 352, 400, 148));
    stack()!.dispatchEvent(new MouseEvent('mouseenter'));
    render();
    pointer('pointerdown', card('a')!, 478);
    // Under the 4px threshold: still a press.
    pointer('pointermove', window, 476);
    expect(host.queue().map((q) => q.id)).toEqual(['a', 'b', 'c']);
    // 60px from the bottom → slot 1 (cards are 44 + 8 apart).
    pointer('pointermove', window, 440);
    render();
    expect(host.queue().map((q) => q.id)).toEqual(['b', 'a', 'c']);
    expect(card('a')!.hasAttribute('data-dragging')).toBe(true);
    expect(card('a')!.style.zIndex).toBe('200');
    pointer('pointerup', window, 440);
    render();
    expect(card('a')!.hasAttribute('data-dragging')).toBe(false);
  });

  it('does not drag while collapsed, nor from the card buttons', () => {
    const { host, stack, card, button, render } = setup((h) =>
      h.queue.set([queued('a', 'first'), queued('b', 'second')]),
    );
    vi.spyOn(stack()!, 'getBoundingClientRect').mockReturnValue(rect(0, 404, 400, 96));
    pointer('pointerdown', card('a')!, 478);
    pointer('pointermove', window, 440);
    pointer('pointerup', window, 440);
    expect(host.queue().map((q) => q.id)).toEqual(['a', 'b']);
    stack()!.dispatchEvent(new MouseEvent('mouseenter'));
    render();
    pointer('pointerdown', button('Remove queued message: first')!, 478);
    pointer('pointermove', window, 440);
    pointer('pointerup', window, 440);
    expect(host.queue().map((q) => q.id)).toEqual(['a', 'b']);
  });

  it('touch: a tap expands the pile and the collapse button folds it back', () => {
    hoverNone = true;
    const { host, stack, card, button, render } = setup((h) =>
      h.queue.set([queued('a', 'first'), queued('b', 'second')]),
    );
    // Actions stay visible without hover.
    expect(button('Edit queued message: first')!.closest('ff-tooltip')!.parentElement!.classList.contains('flex')).toBe(true);
    expect(button('Collapse queued messages')).toBeNull();
    card('a')!.click();
    render();
    expect(stack()!.hasAttribute('data-expanded')).toBe(true);
    const collapse = button('Collapse queued messages')!;
    expect(collapse.style.height).toBe('44px');
    collapse.click();
    render();
    expect(stack()!.hasAttribute('data-expanded')).toBe(false);
    // Emptying the queue drops the pinned state: a fresh fill starts collapsed.
    card('a')!.click();
    render();
    host.queue.set([]);
    render();
    host.queue.set([queued('c', 'third')]);
    render();
    expect(stack()!.hasAttribute('data-expanded')).toBe(false);
  });

  it('compact step shrinks the card to 38px with tighter padding', () => {
    const { cards } = setup((h) => {
      h.size.set('compact');
      h.queue.set([queued('a', 'first'), queued('b', 'second', [png])]);
    });
    expect(cards()[0].style.height).toBe(`${QUEUE_CARD_H_COMPACT}px`);
    expect(cards()[0].classList.contains('pl-3')).toBe(true);
    expect(cards()[0].classList.contains('gap-1.5')).toBe(true);
    expect(cards()[1].classList.contains('pl-1.5')).toBe(true);
  });

  it('keeps a removed card for its exit, then drops it', async () => {
    const { host, card, render } = setup((h) => h.queue.set([queued('a', 'first'), queued('b', 'second')]));
    host.queue.set([queued('a', 'first')]);
    render();
    expect(card('b')).not.toBeNull();
    await vi.waitFor(
      () => {
        render();
        expect(card('b')).toBeNull();
      },
      { timeout: 2000 },
    );
    expect(card('a')).not.toBeNull();
  });

  it('morphs a dispatched text card into the sent bubble that claims its layout id', async () => {
    const { host, el, card, render } = setup((h) => h.queue.set([queued('a', 'first'), queued('b', 'second')]));
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.getAttribute('data-key') === 'a') return rect(40, 400, 300, 44);
      if (this.getAttribute('data-testid') === 'bubble') return rect(200, 100, 150, 22);
      return rect(0, 0, 0, 0);
    });
    host.queue.set([queued('b', 'second')]);
    host.sent.set([{ id: 'a', text: 'first', key: 'qm-a' }]);
    render();
    const bubble = el.querySelector<HTMLElement>('[data-testid="bubble"]')!;
    // The bubble starts on the card's box…
    expect(bubble.style.transform).toContain('translateX(-160px)');
    expect(bubble.style.transform).toContain('translateY(300px)');
    expect(bubble.style.transform).toContain('scaleX(2)');
    expect(bubble.style.transform).toContain('scaleY(2)');
    expect(bubble.style.transformOrigin).toBe('0 0');
    // …its text is counter-scaled so it doesn't stretch…
    const text = bubble.querySelector<HTMLElement>('[data-queued-morph-text]')!;
    expect(text.style.transform).toContain('scaleX(0.5)');
    // …and the card hands over at once instead of playing its exit.
    render();
    expect(card('a')).toBeNull();
    await vi.waitFor(() => expect(bubble.style.transformOrigin).toBe(''), { timeout: 2000 });
  });

  it('does not morph cards with attachments, nor without morphLayoutId', () => {
    const withFiles = setup((h) => h.queue.set([queued('a', 'first', [png]), queued('b', 'second')]));
    withFiles.host.queue.set([queued('b', 'second')]);
    withFiles.host.sent.set([{ id: 'a', text: 'first', key: 'qm-a' }]);
    withFiles.render();
    let bubble = withFiles.el.querySelector<HTMLElement>('[data-testid="bubble"]')!;
    expect(bubble.style.transform).toBe('');
    expect(withFiles.card('a')).not.toBeNull();

    TestBed.resetTestingModule();
    const noId = setup((h) => {
      h.morph.set(false);
      h.queue.set([queued('a', 'first'), queued('b', 'second')]);
    });
    noId.host.queue.set([queued('b', 'second')]);
    noId.host.sent.set([{ id: 'a', text: 'first', key: 'qm-a' }]);
    noId.render();
    bubble = noId.el.querySelector<HTMLElement>('[data-testid="bubble"]')!;
    expect(bubble.style.transform).toBe('');
    expect(noId.card('a')).not.toBeNull();
  });
});
