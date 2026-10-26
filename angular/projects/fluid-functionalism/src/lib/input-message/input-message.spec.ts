/**
 * InputMessage through its public interface. Ports the upstream
 * `tests/touch-fields.test.tsx` InputMessage case (textareaProps.className
 * merges with the field's classes) and adds one test per rule of the React
 * component: value and send, auto-grow, disabled, attachments (picker, drop,
 * dedup, accept, maxFiles, remove), the streaming queue (stop, enqueue,
 * auto-dispatch, row edit/remove/reorder), history recall, the Tab-fill
 * ghost suggestion, the suggestions listbox, click-to-focus, the size step
 * and the edge shadow.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TouchPrimary } from '../core/environment';
import { fieldTouchClass } from '../core/type-scale';
import { type SizeVariant } from '../core/size';
import { FILE_THUMBNAIL_PDF_RENDERER } from '../file-thumbnail/file-thumbnail';
import { InputMessage } from './input-message';
import {
  type InputMessageSendEvent,
  type InputMessageStatus,
  type InputMessageTextareaProps,
  type QueuedMessage,
} from './input-message.types';

@Component({
  imports: [InputMessage],
  template: `
    <ng-template #left let-openFilePicker="openFilePicker" let-files="files">
      <button type="button" data-testid="attach" (click)="openFilePicker('image/*')">Attach {{ files.length }}</button>
    </ng-template>
    <ng-template #right><a href="#model" data-testid="model">Model</a></ng-template>
    <ff-input-message
      data-testid="im"
      class="mt-4"
      [(value)]="value"
      [(files)]="files"
      [(queue)]="queue"
      [status]="status()"
      [disabled]="disabled()"
      [minRows]="minRows()"
      [maxRows]="maxRows()"
      [clickToFocus]="clickToFocus()"
      [sendLabel]="sendLabel()"
      [placeholder]="placeholder()"
      [accept]="accept()"
      [maxFiles]="maxFiles()"
      [showQueue]="showQueue()"
      [history]="history()"
      [placeholderSuggestion]="placeholderSuggestion()"
      [suggestions]="suggestions()"
      [size]="size()"
      [textareaProps]="textareaProps()"
      [leftSlot]="withSlots() ? left : undefined"
      [rightSlot]="withSlots() ? right : undefined"
      (send)="sent.push($event)"
      (stop)="stops = stops + 1"
    />
  `,
})
class Host {
  readonly value = signal('');
  readonly files = signal<File[] | undefined>(undefined);
  readonly queue = signal<QueuedMessage[] | undefined>(undefined);
  readonly status = signal<InputMessageStatus | undefined>(undefined);
  readonly disabled = signal(false);
  readonly minRows = signal(1);
  readonly maxRows = signal(8);
  readonly clickToFocus = signal(true);
  readonly sendLabel = signal('Send');
  readonly placeholder = signal('Ask me anything…');
  readonly accept = signal('image/png,image/jpeg,application/pdf');
  readonly maxFiles = signal<number | undefined>(undefined);
  readonly showQueue = signal(true);
  readonly history = signal<string[]>([]);
  readonly placeholderSuggestion = signal<string | undefined>(undefined);
  readonly suggestions = signal<string[] | undefined>(undefined);
  readonly size = signal<SizeVariant | undefined>(undefined);
  readonly textareaProps = signal<InputMessageTextareaProps | undefined>(undefined);
  readonly withSlots = signal(false);
  readonly sent: InputMessageSendEvent[] = [];
  stops = 0;
}

/** No `(stop)` listener: the streaming button can't become a Stop control. */
@Component({
  imports: [InputMessage],
  template: `<ff-input-message [(value)]="value" status="streaming" />`,
})
class NoStopHost {
  readonly value = signal('');
}

const png = (name = 'photo.png', body = 'img') => new File([body], name, { type: 'image/png', lastModified: 1 });
const pdf = new File(['%PDF'], 'notes.pdf', { type: 'application/pdf', lastModified: 1 });
const txt = new File(['hi'], 'notes.txt', { type: 'text/plain', lastModified: 1 });

function setup(configure: (host: Host) => void = () => {}, touch = false) {
  URL.createObjectURL = vi.fn(() => 'blob:test/1');
  URL.revokeObjectURL = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      { provide: FILE_THUMBNAIL_PDF_RENDERER, useValue: () => new Promise<string>(() => {}) },
      { provide: TouchPrimary, useValue: { value: signal(touch) } },
    ],
  });
  const fixture = TestBed.createComponent(Host);
  const host = fixture.componentInstance;
  configure(host);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const im = el.querySelector<HTMLElement>('[data-testid="im"]')!;
  const textarea = () => im.querySelector('textarea')!;
  const sendButton = () => im.querySelector<HTMLButtonElement>('button[ffButton]')!;
  const fileInput = () => im.querySelector<HTMLInputElement>('input[type="file"]');
  const render = () => fixture.detectChanges();
  const key = (k: string, init: KeyboardEventInit = {}, target: HTMLElement = textarea()) => {
    const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    render();
    return event;
  };
  const type = (text: string) => {
    textarea().value = text;
    textarea().dispatchEvent(new Event('input', { bubbles: true }));
    render();
  };
  return { fixture, host, el, im, textarea, sendButton, fileInput, render, key, type };
}

/** A DragEvent stand-in: jsdom has neither DragEvent nor DataTransfer. */
function dragEvent(name: string, types: string[], files: File[] = []) {
  const event = new Event(name, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: { types, files, dropEffect: 'none' } });
  return event as DragEvent;
}

function setInputFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', { configurable: true, value: files });
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('InputMessage: textareaProps.className (touch-fields)', () => {
  it('adds to the field’s classes, so the touch size survives it', () => {
    const { textarea } = setup((h) => h.textareaProps.set({ className: 'font-mono' }));
    const classes = textarea().className.split(/\s+/);
    expect(classes).toContain('font-mono');
    expect(classes).toContain(fieldTouchClass);
    expect(classes).toContain('resize-none');
  });

  it('forwards other attributes and a custom accessible name', () => {
    const { textarea } = setup((h) =>
      h.textareaProps.set({ 'aria-label': 'Prompt', name: 'prompt', spellcheck: false, 'aria-describedby': 'help' }),
    );
    expect(textarea().getAttribute('aria-label')).toBe('Prompt');
    expect(textarea().getAttribute('name')).toBe('prompt');
    expect(textarea().hasAttribute('spellcheck')).toBe(false);
    expect(textarea().getAttribute('aria-describedby')).toBe('help');
  });
});

describe('InputMessage: composer', () => {
  it('renders the surface-2 composer with the default placeholder and label', () => {
    const { im, textarea } = setup();
    for (const c of ['flex', 'flex-col', 'gap-1', 'p-2', 'bg-surface-2', 'shadow-surface-2', 'rounded-xl', 'cursor-text', 'mt-4']) {
      expect(im.classList.contains(c)).toBe(true);
    }
    expect(textarea().getAttribute('placeholder')).toBe('Ask me anything…');
    expect(textarea().getAttribute('aria-label')).toBe('Message');
    expect(textarea().getAttribute('rows')).toBe('1');
  });

  it('typing writes the value two-way', () => {
    const { host, type } = setup();
    type('hello');
    expect(host.value()).toBe('hello');
  });

  it('Enter sends the trimmed value; Shift+Enter does not', () => {
    const { host, key } = setup((h) => h.value.set('  hi there  '));
    const shift = key('Enter', { shiftKey: true });
    expect(shift.defaultPrevented).toBe(false);
    expect(host.sent).toEqual([]);
    const enter = key('Enter');
    expect(enter.defaultPrevented).toBe(true);
    expect(host.sent).toEqual([{ value: 'hi there', files: [] }]);
  });

  it('skips Enter while an IME composition is running', () => {
    const { host, key } = setup((h) => h.value.set('hi'));
    key('Enter', { isComposing: true });
    expect(host.sent).toEqual([]);
  });

  it('an empty draft cannot send; the send button carries sendLabel', () => {
    const { host, key, sendButton, render } = setup((h) => h.sendLabel.set('Submit'));
    expect(sendButton().getAttribute('aria-label')).toBe('Submit');
    expect(sendButton().disabled).toBe(true);
    key('Enter');
    expect(host.sent).toEqual([]);
    host.value.set('ok');
    render();
    expect(sendButton().disabled).toBe(false);
    sendButton().click();
    expect(host.sent).toEqual([{ value: 'ok', files: [] }]);
  });

  it('disabled disables the field and the button and drops the click-to-focus cursor', () => {
    const { im, textarea, sendButton } = setup((h) => {
      h.value.set('text');
      h.disabled.set(true);
    });
    expect(textarea().disabled).toBe(true);
    expect(sendButton().disabled).toBe(true);
    expect(im.classList.contains('opacity-50')).toBe(true);
    expect(im.classList.contains('pointer-events-none')).toBe(true);
    expect(im.classList.contains('cursor-text')).toBe(false);
  });

  it('auto-grows between minRows and maxRows', () => {
    const scroll = vi.spyOn(HTMLTextAreaElement.prototype, 'scrollHeight', 'get').mockReturnValue(0);
    try {
      const { textarea, host, render } = setup((h) => h.minRows.set(2));
      // jsdom has no line height: the 20px fallback applies.
      expect(textarea().getAttribute('rows')).toBe('2');
      expect(textarea().style.height).toBe('40px');
      expect(textarea().style.overflowY).toBe('hidden');
      scroll.mockReturnValue(500);
      host.maxRows.set(4);
      host.value.set('a\nb\nc\nd\ne\nf');
      render();
      expect(textarea().style.height).toBe('80px');
      expect(textarea().style.overflowY).toBe('auto');
    } finally {
      scroll.mockRestore();
    }
  });

  it('clicking the container focuses the textarea, but not a click on a control', () => {
    const { im, textarea, el } = setup((h) => h.withSlots.set(true));
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    im.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(textarea());
    textarea().blur();
    const onLink = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    el.querySelector('[data-testid="model"]')!.dispatchEvent(onLink);
    expect(onLink.defaultPrevented).toBe(false);
    expect(document.activeElement).not.toBe(textarea());
  });

  it('clickToFocus=false leaves container clicks alone', () => {
    const { im, textarea } = setup((h) => h.clickToFocus.set(false));
    im.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(document.activeElement).not.toBe(textarea());
    expect(im.classList.contains('cursor-text')).toBe(false);
  });

  it('recolors the edge ring on hover and on keyboard focus', () => {
    const { im, render } = setup();
    expect(im.style.boxShadow).toBe('');
    im.dispatchEvent(new MouseEvent('mouseenter'));
    render();
    expect(im.style.boxShadow).toContain('var(--border)');
    im.dispatchEvent(new MouseEvent('mouseleave'));
    render();
    expect(im.style.boxShadow).toBe('');
  });

  it('renders slot templates with the slot context', () => {
    const { el } = setup((h) => {
      h.withSlots.set(true);
      h.files.set([png()]);
    });
    expect(el.querySelector('[data-testid="attach"]')!.textContent).toBe('Attach 1');
    expect(el.querySelector('[data-testid="model"]')).not.toBeNull();
  });

  it('the compact step scales the field typography and footer', () => {
    const { textarea, im } = setup((h) => h.size.set('compact'));
    expect(textarea().classList.contains('text-[length:var(--fs-subtitle-compact,13px)]')).toBe(true);
    expect(textarea().classList.contains('px-1.5')).toBe(true);
    const footer = im.querySelector('[data-slot="input-message-footer"]')!;
    expect(footer.classList.contains('gap-1.5')).toBe(true);
    expect(footer.classList.contains('[&_button]:h-6')).toBe(true);
  });
});

describe('InputMessage: attachments', () => {
  it('has no file input while files is unbound', () => {
    const { fileInput } = setup();
    expect(fileInput()).toBeNull();
  });

  it('the picker adds accepted files, de-duplicates and caps at maxFiles', () => {
    const { host, fileInput, render, im } = setup((h) => {
      h.files.set([]);
      h.maxFiles.set(2);
    });
    const input = fileInput()!;
    expect(input.accept).toBe('image/png,image/jpeg,application/pdf');
    expect(input.multiple).toBe(true);
    expect(input.getAttribute('aria-hidden')).toBe('true');
    expect(input.tabIndex).toBe(-1);
    setInputFiles(input, [png(), txt, png()]);
    render();
    expect(host.files()!.map((f) => f.name)).toEqual(['photo.png']);
    setInputFiles(input, [pdf, png('second.png', 'other bytes')]);
    render();
    expect(host.files()!.map((f) => f.name)).toEqual(['photo.png', 'notes.pdf']);
    expect(im.querySelectorAll('ff-file-thumbnail').length).toBe(2);
  });

  it('maxFiles=1 makes the picker single-select', () => {
    const { fileInput } = setup((h) => {
      h.files.set([]);
      h.maxFiles.set(1);
    });
    expect(fileInput()!.multiple).toBe(false);
  });

  it('a slot opens the picker with a narrowed accept, then restores it', async () => {
    const { el, fileInput } = setup((h) => {
      h.files.set([]);
      h.withSlots.set(true);
    });
    const input = fileInput()!;
    const accepts: string[] = [];
    input.click = vi.fn(() => accepts.push(input.accept));
    (el.querySelector('[data-testid="attach"]') as HTMLElement).click();
    expect(accepts).toEqual(['image/*']);
    await Promise.resolve();
    expect(input.accept).toBe('image/png,image/jpeg,application/pdf');
  });

  it('the remove button drops its file', () => {
    const { host, im, render } = setup((h) => h.files.set([png(), pdf]));
    const remove = im.querySelector<HTMLButtonElement>('button[aria-label="Remove photo.png"]')!;
    expect(remove).not.toBeNull();
    remove.click();
    render();
    expect(host.files()!.map((f) => f.name)).toEqual(['notes.pdf']);
  });

  it('a file drag swaps the placeholder and rings the edge; a drop adds the files', () => {
    const { host, im, textarea, render } = setup((h) => h.files.set([]));
    const over = dragEvent('dragover', ['Files']);
    im.dispatchEvent(over);
    render();
    expect(over.defaultPrevented).toBe(true);
    expect(textarea().getAttribute('placeholder')).toBe('Drop files here to add to chat');
    expect(im.style.boxShadow).toMatch(/#6B97FF|rgb\(107, 151, 255\)/i);
    im.dispatchEvent(dragEvent('drop', ['Files'], [png(), txt]));
    render();
    expect(host.files()!.map((f) => f.name)).toEqual(['photo.png']);
    expect(textarea().getAttribute('placeholder')).toBe('Ask me anything…');
  });

  it('ignores text drags, and drops while disabled', () => {
    const { host, im, textarea, render } = setup((h) => h.files.set([]));
    const text = dragEvent('dragover', ['text/plain']);
    im.dispatchEvent(text);
    render();
    expect(text.defaultPrevented).toBe(false);
    expect(textarea().getAttribute('placeholder')).toBe('Ask me anything…');
    host.disabled.set(true);
    render();
    im.dispatchEvent(dragEvent('drop', ['Files'], [png()]));
    render();
    expect(host.files()).toEqual([]);
  });

  it('removing the last file collapses the row and unmounts its tile', async () => {
    const { host, im, render } = setup((h) => h.files.set([png()]));
    expect(im.querySelector('[data-slot="input-message-files"]')).not.toBeNull();
    im.querySelector<HTMLButtonElement>('button[aria-label="Remove photo.png"]')!.click();
    render();
    expect(host.files()).toEqual([]);
    await vi.waitFor(
      () => {
        render();
        expect(im.querySelector('[data-slot="input-message-files"]')).toBeNull();
        expect(im.querySelector('ff-file-thumbnail')).toBeNull();
      },
      { timeout: 3000 },
    );
  });

  it('a removed tile exits while the others stay', async () => {
    const { host, im, render } = setup((h) => h.files.set([png(), pdf]));
    im.querySelector<HTMLButtonElement>('button[aria-label="Remove notes.pdf"]')!.click();
    render();
    expect(host.files()!.map((f) => f.name)).toEqual(['photo.png']);
    await vi.waitFor(
      () => {
        render();
        expect(im.querySelectorAll('ff-input-message-file-tile').length).toBe(1);
      },
      { timeout: 3000 },
    );
    expect(im.querySelector('button[aria-label="Remove photo.png"]')).not.toBeNull();
  });

  it('files alone can be sent', () => {
    const file = png();
    const { host, sendButton } = setup((h) => h.files.set([file]));
    expect(sendButton().disabled).toBe(false);
    sendButton().click();
    expect(host.sent).toEqual([{ value: '', files: [file] }]);
  });
});

describe('InputMessage: streaming queue', () => {
  const queued = (id: string, text: string, files: File[] = []): QueuedMessage => ({ id, text, files });

  it('streaming with an empty draft turns the button into Stop', () => {
    const { host, sendButton, render } = setup((h) => h.status.set('streaming'));
    expect(sendButton().getAttribute('aria-label')).toBe('Stop');
    expect(sendButton().disabled).toBe(false);
    sendButton().click();
    expect(host.stops).toBe(1);
    expect(host.sent).toEqual([]);
    host.status.set('idle');
    render();
    expect(sendButton().getAttribute('aria-label')).toBe('Send');
  });

  it('the glyph swaps from the arrow to a stop square', async () => {
    const { host, sendButton, render } = setup();
    const glyph = () => sendButton().querySelector('[data-glyph]')!;
    expect(glyph().getAttribute('data-glyph')).toBe('arrow');
    expect(glyph().querySelector('.lucide-arrow-up')).not.toBeNull();
    host.status.set('streaming');
    render();
    await vi.waitFor(
      () => {
        render();
        expect(glyph().getAttribute('data-glyph')).toBe('stop');
      },
      { timeout: 3000 },
    );
    expect(glyph().querySelector('.bg-current')).not.toBeNull();
  });

  it('without a stop listener the streaming button stays Send', () => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(NoStopHost);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button[ffButton]')!;
    expect(button.getAttribute('aria-label')).toBe('Send');
  });

  it('a submit while streaming enqueues the draft and clears the composer', () => {
    const file = png();
    const { host, key, sendButton, render, im } = setup((h) => {
      h.status.set('streaming');
      h.queue.set([]);
      h.files.set([file]);
      h.value.set('  next one ');
    });
    expect(sendButton().getAttribute('aria-label')).toBe('Queue message');
    key('Enter');
    expect(host.sent).toEqual([]);
    expect(host.queue()!.length).toBe(1);
    expect(host.queue()![0]).toMatchObject({ text: 'next one', files: [file] });
    expect(typeof host.queue()![0].id).toBe('string');
    expect(host.value()).toBe('');
    expect(host.files()).toEqual([]);
    render();
    const row = im.querySelector('[data-im-queue] li')!;
    expect(row.getAttribute('aria-label')).toBe('Queued message 1 of 1: next one');
  });

  it('showQueue=false keeps queueing but renders no rows', () => {
    const { host, key, im } = setup((h) => {
      h.status.set('streaming');
      h.queue.set([]);
      h.showQueue.set(false);
      h.value.set('later');
    });
    key('Enter');
    expect(host.queue()!.map((q) => q.text)).toEqual(['later']);
    expect(im.querySelector('[data-im-queue]')).toBeNull();
  });

  it('the streaming → idle edge dispatches the head of the queue', () => {
    const { host, render, im } = setup((h) => {
      h.status.set('streaming');
      h.queue.set([queued('a', 'first'), queued('b', 'second')]);
      h.value.set('my draft');
    });
    host.status.set('idle');
    render();
    expect(host.sent).toEqual([{ value: 'first', files: [], meta: { queuedId: 'a' } }]);
    expect(host.queue()!.map((q) => q.id)).toEqual(['b']);
    expect(host.value()).toBe('my draft');
    expect(im.querySelector('[role="status"]')!.textContent!.trim()).toBe('Message sent. 1 still queued.');
  });

  it('rows edit on Enter, F2 or double-click, remove on Delete, reorder on Alt+Arrow', async () => {
    const file = png();
    const { host, render, im, key, textarea } = setup((h) => {
      h.status.set('streaming');
      h.files.set([]);
      h.queue.set([queued('a', 'first', [file]), queued('b', 'second'), queued('c', 'third')]);
    });
    const rows = () => [...im.querySelectorAll<HTMLElement>('[data-im-queue] li:not([data-exiting])')];
    expect(rows().map((r) => r.getAttribute('aria-label'))).toEqual([
      'Queued message 1 of 3: first',
      'Queued message 2 of 3: second',
      'Queued message 3 of 3: third',
    ]);
    expect(rows()[0].tabIndex).toBe(0);

    key('ArrowDown', { altKey: true }, rows()[0]);
    expect(host.queue()!.map((q) => q.id)).toEqual(['b', 'a', 'c']);

    key('Delete', {}, rows()[2]);
    expect(host.queue()!.map((q) => q.id)).toEqual(['b', 'a']);

    key('Enter', {}, rows().find((r) => r.getAttribute('aria-label')!.endsWith('first'))!);
    expect(host.value()).toBe('first');
    expect(host.files()).toEqual([file]);
    expect(host.queue()!.map((q) => q.id)).toEqual(['b']);
    await vi.waitFor(() => expect(document.activeElement).toBe(textarea()));

    rows()[0].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    render();
    expect(host.value()).toBe('second');
    expect(host.queue()).toEqual([]);
  });

  it('the row remove button deletes without editing', () => {
    const { host, render, im } = setup((h) => {
      h.status.set('streaming');
      h.queue.set([queued('a', 'first'), queued('b', '', [png()])]);
    });
    expect(im.querySelector('[aria-label="Queued message 2 of 2: 1 attachment"]')).not.toBeNull();
    const remove = im.querySelector<HTMLButtonElement>('button[aria-label="Remove queued message: first"]')!;
    expect(remove.classList.contains('opacity-0')).toBe(true);
    remove.click();
    render();
    expect(host.queue()!.map((q) => q.id)).toEqual(['b']);
    expect(host.value()).toBe('');
  });

  it('dragging a row past its neighbor reorders the queue', () => {
    const { host, render, im } = setup((h) => {
      h.status.set('streaming');
      h.queue.set([queued('a', 'first'), queued('b', 'second'), queued('c', 'third')]);
    });
    const first = im.querySelector<HTMLElement>('[data-im-queue] li')!;
    const pointer = (type: string, target: EventTarget, clientY: number) =>
      target.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0, clientY }));
    pointer('pointerdown', first, 100);
    // Under the drag threshold: still a press, nothing moves.
    pointer('pointermove', window, 101);
    expect(host.queue()!.map((q) => q.id)).toEqual(['a', 'b', 'c']);
    pointer('pointermove', window, 120);
    expect(first.hasAttribute('data-dragging')).toBe(true);
    expect(host.queue()!.map((q) => q.id)).toEqual(['b', 'a', 'c']);
    render();
    pointer('pointerup', window, 120);
    expect(first.hasAttribute('data-dragging')).toBe(false);
    expect(first.style.translate).toBe('');
  });

  it('touch screens keep the row remove button visible', () => {
    const { im } = setup((h) => {
      h.status.set('streaming');
      h.queue.set([queued('a', 'first')]);
    }, true);
    const remove = im.querySelector<HTMLButtonElement>('button[aria-label="Remove queued message: first"]')!;
    expect(remove.classList.contains('opacity-100')).toBe(true);
    expect(remove.classList.contains('opacity-0')).toBe(false);
  });
});

describe('InputMessage: history', () => {
  it('ArrowUp walks back through history and ArrowDown returns to the draft', () => {
    const { host, key } = setup((h) => {
      h.history.set(['one', 'two']);
      h.value.set('draft');
    });
    const up = key('ArrowUp');
    expect(up.defaultPrevented).toBe(true);
    expect(host.value()).toBe('two');
    key('ArrowUp');
    expect(host.value()).toBe('one');
    key('ArrowUp');
    expect(host.value()).toBe('one');
    key('ArrowDown');
    expect(host.value()).toBe('two');
    key('ArrowDown');
    expect(host.value()).toBe('draft');
  });

  it('ArrowUp on a lower line keeps native caret movement', () => {
    const { host, key, textarea } = setup((h) => {
      h.history.set(['one']);
      h.value.set('line 1\nline 2');
    });
    textarea().setSelectionRange(10, 10);
    const up = key('ArrowUp');
    expect(up.defaultPrevented).toBe(false);
    expect(host.value()).toBe('line 1\nline 2');
  });
});

describe('InputMessage: suggested placeholder', () => {
  it('shows a ghost with a Tab keycap and fills it on Tab', async () => {
    const { host, key, im, textarea, render } = setup((h) => h.placeholderSuggestion.set('Why so stiff?'));
    expect(textarea().hasAttribute('placeholder')).toBe(false);
    const ghost = im.querySelector('[data-slot="input-message-ghost"]')!;
    expect(ghost.getAttribute('aria-hidden')).toBe('true');
    expect(ghost.textContent).toContain('Why so stiff?');
    expect(ghost.querySelector('kbd')!.textContent!.trim()).toBe('Tab');
    const hintId = textarea().getAttribute('aria-describedby')!;
    expect(document.getElementById(hintId)!.textContent!.replace(/\s+/g, ' ').trim()).toBe(
      'Suggested prompt: Why so stiff?. Press Tab to fill the composer with it.',
    );

    const shiftTab = key('Tab', { shiftKey: true });
    expect(shiftTab.defaultPrevented).toBe(false);
    expect(host.value()).toBe('');

    const tab = key('Tab');
    expect(tab.defaultPrevented).toBe(true);
    expect(host.value()).toBe('Why so stiff?');
    expect(host.sent).toEqual([]);
    render();
    expect(im.querySelector('[data-slot="input-message-ghost"]')).toBeNull();
    expect(textarea().hasAttribute('aria-describedby')).toBe(false);
    await vi.waitFor(() => expect(document.activeElement).toBe(textarea()));
  });
});

describe('InputMessage: suggestions', () => {
  const list = ['Alpha', 'Beta', 'Gamma'];

  it('ArrowDown/ArrowUp move a highlight tracked by aria-activedescendant; Enter fills', () => {
    const { host, key, im, textarea } = setup((h) => h.suggestions.set(list));
    const listbox = im.querySelector('[role="listbox"]')!;
    expect(listbox.getAttribute('aria-label')).toBe('Suggested prompts');
    const options = () => [...listbox.querySelectorAll<HTMLElement>('[role="option"]')];
    expect(options().map((o) => o.textContent!.trim())).toEqual(list);
    expect(options().every((o) => o.getAttribute('aria-selected') === 'false')).toBe(true);
    // The first row signposts ArrowDown while nothing is highlighted.
    expect(options()[0].querySelector('.lucide-arrow-down')).not.toBeNull();

    key('ArrowDown');
    expect(options()[0].getAttribute('aria-selected')).toBe('true');
    expect(textarea().getAttribute('aria-activedescendant')).toBe(options()[0].id);
    expect(options()[0].querySelector('.lucide-arrow-down')).toBeNull();
    key('ArrowDown');
    key('ArrowDown');
    key('ArrowDown');
    expect(textarea().getAttribute('aria-activedescendant')).toBe(options()[2].id);
    key('ArrowUp');
    expect(options()[1].getAttribute('aria-selected')).toBe('true');

    const enter = key('Enter');
    expect(enter.defaultPrevented).toBe(true);
    expect(host.value()).toBe('Beta');
    expect(host.sent).toEqual([]);
    expect(textarea().hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('ArrowUp from the first row leaves the list; Escape drops the highlight', () => {
    const { key, textarea } = setup((h) => h.suggestions.set(list));
    key('ArrowDown');
    key('ArrowUp');
    expect(textarea().hasAttribute('aria-activedescendant')).toBe(false);
    key('ArrowDown');
    const escape = key('Escape');
    expect(escape.defaultPrevented).toBe(true);
    expect(textarea().hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('a click fills the prompt, and typing collapses the list', async () => {
    const { host, im, render, type } = setup((h) => h.suggestions.set(list));
    im.querySelectorAll<HTMLElement>('[role="option"]')[2].click();
    render();
    expect(host.value()).toBe('Gamma');
    type('');
    expect(im.querySelector('[role="listbox"]')).not.toBeNull();
    type('x');
    await vi.waitFor(() => {
      render();
      expect(im.querySelector('[role="listbox"]')).toBeNull();
    });
  });

  it('accepting a suggestion keeps the list mounted while its region collapses, then drops it', async () => {
    const { host, im, render } = setup((h) => h.suggestions.set(list));
    im.querySelectorAll<HTMLElement>('[role="option"]')[0].click();
    render();
    expect(host.value()).toBe('Alpha');
    expect(im.querySelector('[role="listbox"]')).not.toBeNull();
    await vi.waitFor(() => {
      render();
      expect(im.querySelector('[role="listbox"]')).toBeNull();
    });
  });
});
