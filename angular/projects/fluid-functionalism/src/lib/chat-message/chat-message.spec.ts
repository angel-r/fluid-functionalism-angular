/**
 * ChatMessage through its public interface. Upstream has no test for it, so
 * this adds one per rule of the React component: role alignment and bubble
 * chrome, the attachment row, the body dropped when empty, the meta row
 * (time is user-only; hover-revealed except on touch screens), the size
 * ladder, and the entrance transform origin.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { type SizeVariant } from '../core/size';
import { TouchPrimary } from '../core/environment';
import { FILE_THUMBNAIL_PDF_RENDERER } from '../file-thumbnail/file-thumbnail';
import { ChatMessage, type ChatMessageFrom } from './chat-message';

@Component({
  imports: [ChatMessage],
  template: `
    <ng-template #actions><button type="button" aria-label="Copy message">C</button></ng-template>
    <ff-chat-message
      data-testid="msg"
      class="mb-2"
      [from]="from()"
      [files]="files()"
      [thumbnailSize]="thumbnailSize()"
      [time]="time()"
      [actions]="withActions() ? actions : null"
      [size]="size()"
      >{{ body() }}</ff-chat-message
    >
  `,
})
class Host {
  readonly from = signal<ChatMessageFrom>('user');
  readonly files = signal<File[] | undefined>(undefined);
  readonly thumbnailSize = signal(64);
  readonly time = signal<string | undefined>(undefined);
  readonly withActions = signal(false);
  readonly size = signal<SizeVariant | undefined>(undefined);
  readonly body = signal('Hello there');
}

const image = new File(['img'], 'photo.png', { type: 'image/png' });
const notes = new File(['hi'], 'notes.txt', { type: 'text/plain' });

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
  configure(fixture.componentInstance);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const msg = el.querySelector<HTMLElement>('[data-testid="msg"]')!;
  const bubble = () => msg.querySelector<HTMLElement>('[data-slot="chat-message-body"]')!;
  const meta = () => msg.querySelector<HTMLElement>('[data-slot="chat-message-meta"]');
  const thumbs = () => msg.querySelectorAll('ff-file-thumbnail');
  const render = () => {
    fixture.detectChanges();
  };
  return { fixture, host: fixture.componentInstance, msg, bubble, meta, thumbs, render };
}

describe('ChatMessage: roles', () => {
  it('a user message is a right-aligned accent bubble', () => {
    const { msg, bubble } = setup();
    for (const c of ['group', 'flex', 'max-w-[80%]', 'flex-col', 'gap-1.5', 'items-end', 'self-end', 'mb-2']) {
      expect(msg.classList.contains(c)).toBe(true);
    }
    expect(bubble().textContent).toBe('Hello there');
    for (const c of ['whitespace-pre-wrap', 'break-words', 'py-2', 'px-3.5', 'text-pretty', 'text-foreground']) {
      expect(bubble().classList.contains(c)).toBe(true);
    }
    expect(bubble().classList.contains('bg-[color-mix(in_oklab,var(--accent),var(--background)_45%)]')).toBe(true);
    expect(msg.style.transformOrigin).toBe('bottom right');
  });

  it('an assistant reply is left-aligned plain text with no bubble chrome', () => {
    const { msg, bubble } = setup((h) => h.from.set('assistant'));
    expect(msg.classList.contains('items-start')).toBe(true);
    expect(msg.classList.contains('self-start')).toBe(true);
    expect(bubble().classList.contains('text-foreground')).toBe(true);
    expect(bubble().classList.contains('text-pretty')).toBe(false);
    expect(bubble().classList.contains('px-3.5')).toBe(false);
    expect(msg.style.transformOrigin).toBe('bottom left');
  });

  it('compact tightens the bubble padding and type', () => {
    const { bubble } = setup((h) => h.size.set('compact'));
    expect(bubble().classList.contains('py-1.5')).toBe(true);
    expect(bubble().classList.contains('px-3')).toBe(true);
    expect(bubble().className).toContain('--fs-subtitle-compact');
  });
});

describe('ChatMessage: body and attachments', () => {
  it('drops the body when it is empty, and brings it back with text', () => {
    const { bubble, host, render } = setup((h) => h.body.set(''));
    expect(bubble().hidden).toBe(true);
    host.body.set('Streaming…');
    render();
    return Promise.resolve().then(() => {
      expect(bubble().hidden).toBe(false);
    });
  });

  it('renders one thumbnail per file at thumbnailSize, aligned with the role', () => {
    const { thumbs, msg } = setup((h) => {
      h.files.set([image, notes]);
      h.thumbnailSize.set(48);
    });
    expect(thumbs().length).toBe(2);
    const row = thumbs()[0].parentElement!;
    expect(row.classList.contains('justify-end')).toBe(true);
    expect((thumbs()[0] as HTMLElement).style.width).toBe('48px');
    expect((thumbs()[1] as HTMLElement).style.height).toBe('48px');
    expect(msg.querySelector('img')).not.toBeNull();
  });

  it('renders no attachment row without files', () => {
    const { thumbs, msg } = setup((h) => h.files.set([]));
    expect(thumbs().length).toBe(0);
    expect(msg.querySelector('.flex-wrap')).toBeNull();
  });
});

describe('ChatMessage: meta row', () => {
  it('is absent without time or actions', () => {
    const { meta } = setup();
    expect(meta()).toBeNull();
  });

  it('shows the time then the actions on a user message, hidden until hover', () => {
    const { meta } = setup((h) => {
      h.time.set('Wednesday 6:08 PM');
      h.withActions.set(true);
    });
    const row = meta()!;
    const [time, actions] = Array.from(row.children) as HTMLElement[];
    expect(time.classList.contains('tabular-nums')).toBe(true);
    expect(time.textContent).toBe('Wednesday 6:08 PM');
    expect(actions.querySelector('button[aria-label="Copy message"]')).not.toBeNull();
    for (const c of ['opacity-0', 'pointer-events-none', 'group-hover:opacity-100', 'group-focus-within:opacity-100']) {
      expect(row.classList.contains(c)).toBe(true);
    }
  });

  it('ignores time on an assistant reply', () => {
    const { meta } = setup((h) => {
      h.from.set('assistant');
      h.time.set('Wednesday 6:08 PM');
    });
    expect(meta()).toBeNull();
  });

  it('assistant replies show their actions alone', () => {
    const { meta } = setup((h) => {
      h.from.set('assistant');
      h.time.set('Wednesday 6:08 PM');
      h.withActions.set(true);
    });
    expect(meta()!.querySelector('.tabular-nums')).toBeNull();
    expect(meta()!.querySelector('button')).not.toBeNull();
  });

  it('stays visible on touch screens, where hover is unreachable', () => {
    const { meta } = setup((h) => h.time.set('Now'), true);
    expect(meta()!.classList.contains('opacity-0')).toBe(false);
    expect(meta()!.classList.contains('pointer-events-none')).toBe(false);
  });
});
