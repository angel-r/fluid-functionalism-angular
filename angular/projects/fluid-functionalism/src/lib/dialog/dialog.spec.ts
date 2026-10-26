/**
 * Dialog through its public interface. Upstream has no behavior test for the
 * dialog itself (tests/popup-exit-sync only keeps the React exit hook's
 * copies identical; tests/command-menu covers the command menu built on it),
 * so these pin the rules of registry/base/dialog.tsx: trigger/close wiring,
 * controlled and uncontrolled open state, the popup's ARIA naming, the size
 * and position ladder, the +4 surface step that also reaches the content,
 * Escape / backdrop dismissal, exit-then-unmount, focus in and back, and the
 * `container` + `modal={false}` scoped mode.
 */
import { Component, ElementRef, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, vi } from 'vitest';
import { injectSurface, SurfaceProvider } from '../core/surface';
import { surfaceClasses } from '../core/surface-classes';
import { SizeProvider, type SizeVariant } from '../core/size';
import { ShapeProvider } from '../core/shape';
import { typeClass } from '../core/type-scale';
import { fontWeights } from '../core/font-weight';
import { Button } from '../button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  type DialogPosition,
  type DialogSize,
} from './index';

@Component({
  selector: 'test-surface-probe',
  template: `<span data-testid="probe">{{ surface() }}</span>`,
})
class SurfaceProbe {
  readonly surface = injectSurface();
}

@Component({
  imports: [
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
    DialogClose,
    Button,
    SurfaceProbe,
    SurfaceProvider,
    SizeProvider,
    ShapeProvider,
  ],
  template: `
    <section [ffSurface]="substrate()" ffSizeProvider [size]="sizeVariant()" ffShapeProvider [defaultShape]="shape()">
      <ff-dialog [defaultOpen]="defaultOpen()" (openChange)="changes.push($event)">
        <button #trigger ffButton ffDialogTrigger variant="tertiary" data-testid="trigger">Open dialog</button>
        <ff-dialog-content
          [size]="size()"
          [position]="position()"
          [showCloseButton]="showClose()"
          [class]="contentClass()"
        >
          <div ffDialogHeader data-testid="header">
            <h2 ffDialogTitle data-testid="title">Create teamspace</h2>
            <p ffDialogDescription data-testid="description">Add a new teamspace.</p>
          </div>
          <test-surface-probe />
          <div ffDialogFooter data-testid="footer">
            <button ffButton ffDialogClose variant="ghost" data-testid="cancel">Cancel</button>
            <button ffButton data-testid="create">Create</button>
          </div>
        </ff-dialog-content>
      </ff-dialog>
    </section>
  `,
})
class Host {
  readonly trigger = viewChild.required('trigger', { read: ElementRef<HTMLButtonElement> });
  readonly substrate = signal(1);
  readonly sizeVariant = signal<SizeVariant>('default');
  readonly shape = signal<'rounded' | 'pill'>('rounded');
  readonly defaultOpen = signal(false);
  readonly size = signal<DialogSize>('sm');
  readonly position = signal<DialogPosition>('center');
  readonly showClose = signal(true);
  readonly contentClass = signal('');
  readonly changes: boolean[] = [];
}

@Component({
  imports: [Dialog, DialogContent, DialogTitle],
  template: `
    <ff-dialog [(open)]="open">
      <ff-dialog-content>
        <h2 ffDialogTitle>Controlled</h2>
      </ff-dialog-content>
    </ff-dialog>
  `,
})
class ControlledHost {
  readonly open = signal(false);
}

@Component({
  imports: [Dialog, DialogTrigger, DialogContent, DialogTitle],
  template: `
    <div #frame data-testid="frame" class="relative overflow-hidden"></div>
    <ff-dialog [modal]="false" (openChange)="changes.push($event)">
      <button ffDialogTrigger type="button" data-testid="trigger">Open</button>
      <ff-dialog-content [container]="frame">
        <h2 ffDialogTitle>Scoped</h2>
        <button type="button" data-testid="inside">Inside</button>
      </ff-dialog-content>
    </ff-dialog>
    <button type="button" data-testid="outside">Outside</button>
  `,
})
class ScopedHost {
  readonly changes: boolean[] = [];
}

const q = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector);
const popup = () => q('[data-slot="dialog-popup"]');
const backdrop = () => q('[data-slot="dialog-backdrop"]');
const byTestId = (id: string) => q(`[data-testid="${id}"]`);
const closeButton = () => popup()?.querySelector<HTMLButtonElement>('[data-slot="dialog-close-button"]') ?? null;

async function setup(configure: (h: Host) => void = () => {}) {
  const fixture = TestBed.createComponent(Host);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  await fixture.whenStable();
  const host = fixture.componentInstance;
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const openDialog = async () => {
    host.trigger().nativeElement.click();
    await settle();
  };
  return { fixture, host, settle, openDialog };
}

afterEach(() => {
  document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = ''));
});

describe('dialog: trigger and open state', () => {
  it('renders nothing while closed and marks the trigger as a dialog opener', async () => {
    const { host } = await setup();
    expect(popup()).toBeNull();
    const trigger = host.trigger().nativeElement;
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.hasAttribute('data-popup-open')).toBe(false);
  });

  it('opens on a trigger click, in an overlay, and reports it', async () => {
    const { fixture, host, openDialog } = await setup();
    await openDialog();
    expect(popup()).not.toBeNull();
    expect((fixture.nativeElement as HTMLElement).contains(popup())).toBe(false);
    expect(popup()!.contains(byTestId('title'))).toBe(true);
    expect(host.changes).toEqual([true]);
    const trigger = host.trigger().nativeElement;
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.hasAttribute('data-popup-open')).toBe(true);
    expect(trigger.getAttribute('aria-controls')).toBe(popup()!.id);
  });

  it('starts open with defaultOpen, without reporting a change', async () => {
    const { host } = await setup((h) => h.defaultOpen.set(true));
    expect(popup()).not.toBeNull();
    expect(host.changes).toEqual([]);
  });

  it('follows a controlled [(open)] both ways', async () => {
    const fixture = TestBed.createComponent(ControlledHost);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(popup()).toBeNull();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(popup()).not.toBeNull();
    closeButton()!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(false);
  });
});

describe('dialog: popup semantics', () => {
  it('is a modal dialog named by its title and described by its description', async () => {
    const { openDialog } = await setup();
    await openDialog();
    const el = popup()!;
    expect(el.getAttribute('role')).toBe('dialog');
    expect(el.getAttribute('aria-modal')).toBe('true');
    expect(el.getAttribute('tabindex')).toBe('-1');
    expect(el.hasAttribute('data-open')).toBe(true);
    const title = byTestId('title')!;
    const description = byTestId('description')!;
    expect(title.id).toBeTruthy();
    expect(el.getAttribute('aria-labelledby')).toBe(title.id);
    expect(el.getAttribute('aria-describedby')).toBe(description.id);
  });

  it('carries the panel and scrim classes, the surface 4 steps up', async () => {
    const { openDialog } = await setup();
    await openDialog();
    for (const cls of [
      'fixed', 'left-1/2', 'z-50', 'w-[calc(100%-2rem)]', 'top-1/2', ...surfaceClasses(5).split(' '),
      'p-6', 'focus:outline-none', 'max-w-[400px]', 'rounded-xl',
    ]) {
      expect(popup()!.classList).toContain(cls);
    }
    for (const cls of ['fixed', 'inset-0', 'z-50', 'bg-black/40', 'dark:bg-black/80']) {
      expect(backdrop()!.classList).toContain(cls);
    }
  });

  it('widens per size and narrows one notch in compact regions', async () => {
    const cases: [DialogSize, SizeVariant, string][] = [
      ['sm', 'default', 'max-w-[400px]'],
      ['lg', 'default', 'max-w-[540px]'],
      ['xl', 'default', 'max-w-[880px]'],
      ['sm', 'compact', 'max-w-[360px]'],
      ['lg', 'compact', 'max-w-[480px]'],
      ['xl', 'compact', 'max-w-[800px]'],
    ];
    for (const [size, variant, cls] of cases) {
      const { fixture, openDialog } = await setup((h) => {
        h.size.set(size);
        h.sizeVariant.set(variant);
      });
      await openDialog();
      expect(popup()!.classList).toContain(cls);
      fixture.destroy();
      document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = ''));
    }
  });

  it('anchors 12dvh from the top with position="top"', async () => {
    const { openDialog } = await setup((h) => h.position.set('top'));
    await openDialog();
    expect(popup()!.classList).toContain('top-[12dvh]');
    expect(popup()!.classList).not.toContain('top-1/2');
  });

  it('merges the consumer class onto the panel and follows the shape', async () => {
    const { openDialog } = await setup((h) => {
      h.contentClass.set('p-0 h-[640px]');
      h.shape.set('pill');
    });
    await openDialog();
    expect(popup()!.classList).toContain('p-0');
    expect(popup()!.classList).not.toContain('p-6');
    expect(popup()!.classList).toContain('h-[640px]');
    expect(popup()!.classList).toContain('rounded-3xl');
  });
});

describe('dialog: surface', () => {
  it('provides its level to the content', async () => {
    const { openDialog } = await setup();
    await openDialog();
    expect(byTestId('probe')!.textContent).toBe('5');
  });

  it('sits 4 steps above its substrate, capped at 8', async () => {
    const { openDialog } = await setup((h) => h.substrate.set(6));
    await openDialog();
    expect(byTestId('probe')!.textContent).toBe('8');
    expect(popup()!.classList).toContain(surfaceClasses(8).split(' ')[0]);
  });
});

describe('dialog: parts', () => {
  it('styles the title on the title role, semibold, and the description on body', async () => {
    const { openDialog } = await setup();
    await openDialog();
    const title = byTestId('title')!;
    for (const cls of [...typeClass('title', 'default').split(' '), 'text-foreground']) {
      expect(title.classList).toContain(cls);
    }
    expect(title.style.fontVariationSettings).toBe(fontWeights.semibold);
    const description = byTestId('description')!;
    for (const cls of [...typeClass('body', 'default').split(' '), 'text-muted-foreground']) {
      expect(description.classList).toContain(cls);
    }
  });

  it('switches title and description to the compact step', async () => {
    const { openDialog } = await setup((h) => h.sizeVariant.set('compact'));
    await openDialog();
    expect(byTestId('title')!.classList).toContain(typeClass('title', 'compact').split(' ')[0]);
    expect(byTestId('description')!.classList).toContain(typeClass('body', 'compact').split(' ')[0]);
  });

  it('lays out the header and footer', async () => {
    const { openDialog } = await setup();
    await openDialog();
    for (const cls of ['flex', 'flex-col', 'gap-1.5', 'mb-4']) expect(byTestId('header')!.classList).toContain(cls);
    for (const cls of ['flex', 'justify-end', 'gap-2', 'mt-6']) expect(byTestId('footer')!.classList).toContain(cls);
  });
});

describe('dialog: dismissal', () => {
  it('renders a corner close button that closes the dialog', async () => {
    const { host, settle, openDialog } = await setup();
    await openDialog();
    const close = closeButton()!;
    expect(close).not.toBeNull();
    expect(close.textContent?.trim()).toBe('Close');
    for (const cls of ['absolute', 'right-3', 'top-3']) expect(close.classList).toContain(cls);
    close.click();
    await settle();
    expect(host.changes).toEqual([true, false]);
    expect(popup()!.hasAttribute('data-closed')).toBe(true);
  });

  it('drops the close button with showCloseButton=false', async () => {
    const { openDialog } = await setup((h) => h.showClose.set(false));
    await openDialog();
    expect(closeButton()).toBeNull();
  });

  it('closes from a DialogClose control', async () => {
    const { host, settle, openDialog } = await setup();
    await openDialog();
    byTestId('cancel')!.click();
    await settle();
    expect(host.changes).toEqual([true, false]);
  });

  it('closes on Escape and on a backdrop click, not on a click inside', async () => {
    const { host, settle, openDialog } = await setup();
    await openDialog();
    popup()!.click();
    await settle();
    expect(host.changes).toEqual([true]);
    popup()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await settle();
    expect(host.changes).toEqual([true, false]);
    await vi.waitFor(() => expect(popup()).toBeNull(), { timeout: 1000 });
    await openDialog();
    backdrop()!.click();
    await settle();
    expect(host.changes).toEqual([true, false, true, false]);
  });

  it('keeps the popup through its exit, then unmounts it', async () => {
    const { settle, openDialog } = await setup();
    await openDialog();
    closeButton()!.click();
    await settle();
    expect(popup()).not.toBeNull();
    await vi.waitFor(() => expect(popup()).toBeNull(), { timeout: 1000 });
    expect(backdrop()).toBeNull();
  });

  it('a reopen during the exit keeps the same popup', async () => {
    const { settle, openDialog } = await setup();
    await openDialog();
    const first = popup();
    closeButton()!.click();
    await settle();
    await openDialog();
    await new Promise((r) => setTimeout(r, 400));
    expect(popup()).toBe(first);
  });
});

describe('dialog: focus', () => {
  it('moves focus into the dialog on open and back to the trigger on close', async () => {
    const { host, settle, openDialog } = await setup();
    host.trigger().nativeElement.focus();
    await openDialog();
    // jsdom lays nothing out, so the CDK finds no tabbable row and focuses
    // its container, which holds the popup.
    await vi.waitFor(() => expect(document.activeElement?.closest('.cdk-overlay-container')).not.toBeNull());
    closeButton()!.click();
    await settle();
    await vi.waitFor(() => expect(document.activeElement).toBe(host.trigger().nativeElement), { timeout: 1000 });
  });
});

describe('dialog: container and non-modal', () => {
  async function setupScoped() {
    const fixture = TestBed.createComponent(ScopedHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    };
    byTestId('trigger')!.click();
    await settle();
    return { fixture, settle };
  }

  it('renders the scrim and panel inside the container, positioned absolute', async () => {
    await setupScoped();
    const frame = byTestId('frame')!;
    expect(frame.contains(popup())).toBe(true);
    expect(frame.contains(backdrop())).toBe(true);
    expect(popup()!.classList).toContain('absolute');
    expect(popup()!.classList).not.toContain('fixed');
    expect(backdrop()!.classList).toContain('absolute');
  });

  it('is not modal: no aria-modal, focus is free to leave', async () => {
    const { settle } = await setupScoped();
    expect(popup()!.hasAttribute('aria-modal')).toBe(false);
    const outside = byTestId('outside')!;
    outside.focus();
    await settle();
    expect(document.activeElement).toBe(outside);
  });

  it('closes on Escape and on an outside press, not on a press inside', async () => {
    const { fixture, settle } = await setupScoped();
    const changes = fixture.componentInstance.changes;
    byTestId('inside')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await settle();
    expect(changes).toEqual([true]);
    popup()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await settle();
    expect(changes).toEqual([true, false]);
    await vi.waitFor(() => expect(popup()).toBeNull(), { timeout: 1000 });
    byTestId('trigger')!.click();
    await settle();
    byTestId('outside')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await settle();
    expect(changes).toEqual([true, false, true, false]);
  });
});
