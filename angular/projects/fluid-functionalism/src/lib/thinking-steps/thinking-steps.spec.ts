/**
 * ThinkingSteps through its public interface. Upstream has no test for it,
 * so this adds one per rule of the React component: the collapsible root
 * (uncontrolled default-open, defaultOpen, controlled open + openChange,
 * trigger ↔ panel ARIA, `hidden` only after the exit), the header label,
 * the size ladder, step states (pending hidden, active shimmer, connector
 * line, icon or dot), nested details, sources and images.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, vi } from 'vitest';
import { type SizeVariant } from '../core/size';
import {
  type StepStatus,
  ThinkingStep,
  ThinkingStepDetails,
  ThinkingStepImage,
  ThinkingStepSource,
  ThinkingStepSources,
  ThinkingSteps,
  ThinkingStepsContent,
  ThinkingStepsHeader,
} from './thinking-steps';

@Component({
  imports: [
    ThinkingSteps,
    ThinkingStepsHeader,
    ThinkingStepsContent,
    ThinkingStep,
    ThinkingStepDetails,
    ThinkingStepSources,
    ThinkingStepSource,
    ThinkingStepImage,
  ],
  template: `
    <ff-thinking-steps
      data-testid="root"
      class="mx-2"
      [size]="size()"
      [defaultOpen]="defaultOpen()"
      [open]="open()"
      (openChange)="onOpenChange($event)"
    >
      @if (customHeader()) {
        <ff-thinking-steps-header>Research Agent</ff-thinking-steps-header>
      } @else {
        <ff-thinking-steps-header />
      }
      <ff-thinking-steps-content class="gap-1">
        <ff-thinking-step data-testid="s1" icon="search" label="Searched the web" [status]="status()" description="Three queries">
          <ff-thinking-step-sources>
            <ff-thinking-step-source color="blue" [delay]="0.05">x.com</ff-thinking-step-source>
          </ff-thinking-step-sources>
        </ff-thinking-step>
        <ff-thinking-step data-testid="s2" icon="globe" label="Read 3 sources">
          <ff-thinking-step-details summary="Explored 2 files" [details]="['Read a.ts', 'Read b.ts']" [defaultOpen]="detailsOpen()" />
          <ff-thinking-step-image src="/shot.png" alt="Screenshot" caption="Homepage" />
        </ff-thinking-step>
        <ff-thinking-step data-testid="s3" [showIcon]="false" label="Done" isLast />
      </ff-thinking-steps-content>
    </ff-thinking-steps>
  `,
})
class Host {
  readonly size = signal<SizeVariant | undefined>(undefined);
  readonly defaultOpen = signal(true);
  readonly open = signal<boolean | undefined>(undefined);
  readonly echo = signal(true);
  readonly customHeader = signal(false);
  readonly status = signal<StepStatus>('complete');
  readonly detailsOpen = signal(false);
  readonly changes: boolean[] = [];
  onOpenChange(next: boolean) {
    this.changes.push(next);
    if (this.echo() && this.open() !== undefined) this.open.set(next);
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(configure: (host: Host) => void = () => {}) {
  const fixture = TestBed.createComponent(Host);
  configure(fixture.componentInstance);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const root = el.querySelector<HTMLElement>('[data-testid="root"]')!;
  const triggers = () => Array.from(root.querySelectorAll<HTMLButtonElement>('button[aria-expanded]'));
  const header = () => triggers()[0];
  const panelOf = (trigger: HTMLButtonElement) => document.getElementById(trigger.getAttribute('aria-controls')!)!;
  const step = (id: string) => root.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
  const flush = (ms = 0) => {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  };
  return { fixture, host: fixture.componentInstance, root, triggers, header, panelOf, step, flush };
}

const EXIT_MS = 600; // past the height exit (or its fallback timer)

describe('ThinkingSteps: root collapsible', () => {
  it('starts open, with the trigger wired to its panel', () => {
    const { root, header, panelOf } = setup();
    expect(root.classList.contains('w-80')).toBe(true);
    expect(root.classList.contains('max-w-full')).toBe(true);
    expect(root.classList.contains('mx-2')).toBe(true);
    expect(header().getAttribute('aria-expanded')).toBe('true');
    expect(header().hasAttribute('data-panel-open')).toBe(true);
    expect(header().type).toBe('button');
    const panel = panelOf(header());
    expect(panel).not.toBeNull();
    expect(panel.hidden).toBe(false);
    expect(panel.textContent).toContain('Searched the web');
  });

  it('a click closes it, reports the change, and hides the panel after the exit', () => {
    const { header, panelOf, host, fixture, flush } = setup();
    header().click();
    fixture.detectChanges();
    expect(header().getAttribute('aria-expanded')).toBe('false');
    expect(header().hasAttribute('data-panel-open')).toBe(false);
    expect(host.changes).toEqual([false]);
    // Still displayed while the height exit runs.
    expect(panelOf(header()).hidden).toBe(false);
    flush(EXIT_MS);
    expect(panelOf(header()).hidden).toBe(true);
    header().click();
    fixture.detectChanges();
    expect(panelOf(header()).hidden).toBe(false);
    expect(host.changes).toEqual([false, true]);
  });

  it('defaultOpen false starts collapsed with the panel hidden', () => {
    const { header, panelOf } = setup((h) => h.defaultOpen.set(false));
    expect(header().getAttribute('aria-expanded')).toBe('false');
    expect(panelOf(header()).hidden).toBe(true);
  });

  it('controlled open follows the input and only reports clicks', () => {
    const { header, host, fixture } = setup((h) => {
      h.open.set(false);
      h.echo.set(false);
    });
    expect(header().getAttribute('aria-expanded')).toBe('false');
    host.open.set(true);
    fixture.detectChanges();
    expect(header().getAttribute('aria-expanded')).toBe('true');
    expect(host.changes).toEqual([]);
    host.echo.set(true);
    header().click();
    fixture.detectChanges();
    expect(host.changes).toEqual([false]);
    expect(host.open()).toBe(false);
    expect(header().getAttribute('aria-expanded')).toBe('false');
  });
});

describe('ThinkingSteps: header', () => {
  it('reads "Thinking" by default, semibold and foreground while open', () => {
    const { header } = setup();
    const [sizer, label] = Array.from(header().querySelectorAll<HTMLElement>('.col-start-1'));
    expect(label.textContent?.trim()).toBe('Thinking');
    expect(sizer.getAttribute('aria-hidden')).toBe('true');
    expect(sizer.textContent?.trim()).toBe('Thinking');
    expect(label.classList.contains('text-foreground')).toBe(true);
    expect(header().querySelector('svg.lucide-chevron-right')).not.toBeNull();
  });

  it('takes a custom label', () => {
    const { header } = setup((h) => h.customHeader.set(true));
    expect(header().textContent).toContain('Research Agent');
    expect(header().textContent).not.toContain('Thinking');
  });

  it('a collapsed label is muted until hovered, and hovering adds the tint', () => {
    const { header, fixture } = setup((h) => h.defaultOpen.set(false));
    const label = () => header().querySelectorAll<HTMLElement>('.col-start-1')[1];
    expect(label().classList.contains('text-muted-foreground')).toBe(true);
    const wrap = header().parentElement!;
    wrap.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(label().classList.contains('text-foreground')).toBe(true);
    const tint = wrap.querySelector<HTMLElement>('[data-slot="hover-tint"]');
    expect(tint).not.toBeNull();
    expect(tint!.classList.contains('bg-hover')).toBe(true);
    expect(tint!.classList.contains('pointer-events-none')).toBe(true);
  });

  it('size compact propagates to every row', () => {
    const { header, step } = setup((h) => h.size.set('compact'));
    expect(header().classList.contains('py-1.5')).toBe(true);
    expect(header().classList.contains('px-2.5')).toBe(true);
    expect(step('s1').querySelector('svg.lucide-search')!.getAttribute('width')).toBe('12');
  });

  it('default size uses the default row padding and a 14px step icon', () => {
    const { header, step } = setup();
    expect(header().classList.contains('py-2')).toBe(true);
    expect(header().classList.contains('px-3')).toBe(true);
    expect(step('s1').querySelector('svg.lucide-search')!.getAttribute('width')).toBe('14');
  });
});

describe('ThinkingSteps: steps', () => {
  it('a complete step shows its icon, label, description, connector and children', () => {
    const { step } = setup();
    const s1 = step('s1');
    const label = s1.querySelector<HTMLElement>('.text-foreground')!;
    expect(label.textContent?.trim()).toBe('Searched the web');
    expect(label.classList.contains('shimmer-text')).toBe(false);
    expect(s1.textContent).toContain('Three queries');
    expect(s1.querySelector('.w-px')).not.toBeNull();
    expect(s1.textContent).toContain('x.com');
  });

  it('an active step shimmers and trails an ellipsis', () => {
    const { step } = setup((h) => h.status.set('active'));
    const label = step('s1').querySelector<HTMLElement>('.shimmer-text')!;
    expect(label.textContent?.trim()).toBe('Searched the web…');
  });

  it('a pending step renders nothing, and appears when it becomes active', () => {
    const { step, host, fixture } = setup((h) => h.status.set('pending'));
    expect(step('s1').textContent?.trim()).toBe('');
    host.status.set('active');
    fixture.detectChanges();
    expect(step('s1').textContent).toContain('Searched the web');
  });

  it('isLast drops the connector; showIcon false draws a dot', () => {
    const { step } = setup();
    const s3 = step('s3');
    expect(s3.querySelector('.w-px')).toBeNull();
    expect(s3.querySelector('svg')).toBeNull();
    expect(s3.querySelector('.rounded-full.bg-muted-foreground\\/60')).not.toBeNull();
  });
});

describe('ThinkingSteps: details, sources, images', () => {
  it('details start collapsed and open on click', () => {
    const { triggers, panelOf, fixture } = setup();
    const details = triggers()[1];
    expect(details.textContent).toContain('Explored 2 files');
    expect(details.getAttribute('aria-expanded')).toBe('false');
    expect(panelOf(details).hidden).toBe(true);
    // The details row overrides the trigger padding.
    expect(details.classList.contains('py-1')).toBe(true);
    expect(details.classList.contains('px-3')).toBe(true);
    expect(details.classList.contains('gap-1.5')).toBe(true);
    details.click();
    fixture.detectChanges();
    expect(details.getAttribute('aria-expanded')).toBe('true');
    expect(panelOf(details).hidden).toBe(false);
    const lines = Array.from(panelOf(details).querySelectorAll('span')).map((s) => s.textContent?.trim());
    expect(lines).toEqual(['Read a.ts', 'Read b.ts']);
  });

  it('details defaultOpen starts expanded', () => {
    const { triggers, panelOf } = setup((h) => h.detailsOpen.set(true));
    expect(triggers()[1].getAttribute('aria-expanded')).toBe('true');
    expect(panelOf(triggers()[1]).hidden).toBe(false);
  });

  it('a source is a small solid badge in the given color', () => {
    const { root } = setup();
    const sources = root.querySelector<HTMLElement>('ff-thinking-step-sources')!;
    for (const c of ['flex', 'flex-wrap', 'gap-1.5', 'mt-1']) expect(sources.classList.contains(c)).toBe(true);
    const badge = sources.querySelector<HTMLElement>('ff-badge')!;
    expect(badge.textContent?.trim()).toBe('x.com');
    expect(badge.style.backgroundColor).not.toBe('');
  });

  it('an image renders with its alt text, outline and caption', () => {
    const { root } = setup();
    const img = root.querySelector<HTMLImageElement>('ff-thinking-step-image img')!;
    expect(img.getAttribute('src')).toBe('/shot.png');
    expect(img.alt).toBe('Screenshot');
    for (const c of ['w-full', 'max-w-[200px]', 'object-cover', 'outline-1', '-outline-offset-1']) {
      expect(img.classList.contains(c)).toBe(true);
    }
    const caption = root.querySelector<HTMLElement>('ff-thinking-step-image span')!;
    expect(caption.textContent?.trim()).toBe('Homepage');
    expect(caption.classList.contains('block')).toBe(true);
  });
});
