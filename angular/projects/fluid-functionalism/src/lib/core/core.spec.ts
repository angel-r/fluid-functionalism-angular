import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  Elevated,
  Icon,
  ShapeProvider,
  SizeProvider,
  SurfaceProvider,
  ThemeService,
  animateFluid,
  cn,
  createKeyboardNavGate,
  injectShape,
  injectSize,
  injectSurface,
  provideFluid,
  provideIcons,
  shapeMap,
  surfaceClasses,
  type IconNode,
} from './index';

describe('cn', () => {
  it('keeps a type-scale role next to a text color', () => {
    expect(cn('text-body', 'text-muted-foreground')).toBe('text-body text-muted-foreground');
  });

  it('lets a later type-scale role replace an earlier one', () => {
    expect(cn('text-body', 'text-caption')).toBe('text-caption');
  });
});

describe('surfaceClasses', () => {
  it('clamps and rounds to the 8-step ladder', () => {
    expect(surfaceClasses(0)).toBe('bg-surface-1 shadow-surface-1');
    expect(surfaceClasses(12, 3.4)).toBe('bg-surface-8 shadow-surface-3');
  });
});

@Component({ selector: 'ff-probe', template: '' })
class Probe {
  readonly shape = injectShape();
  readonly size = injectSize();
  readonly surface = injectSurface();
}

@Component({
  imports: [Probe, ShapeProvider, SizeProvider, Elevated, SurfaceProvider],
  template: `
    <ff-probe #page />
    <div ffShapeProvider defaultShape="pill" #shapeCtx="ffShapeProvider">
      <ff-probe #pill />
    </div>
    <div ffSizeProvider [size]="pinned()" #sizeCtx="ffSizeProvider">
      <ff-probe #compact />
    </div>
    <div [ffSurface]="3">
      <div [ffElevated]="2" data-testid="menu">
        <div [ffElevated]="4" data-testid="dialog"><ff-probe #nested /></div>
      </div>
    </div>
  `,
})
class Host {
  readonly pinned = signal<'compact' | undefined>('compact');
}

describe('shape, size and surface context', () => {
  it('falls back to rounded, default size and page surface without providers', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const page = fixture.debugElement.children[0].componentInstance as Probe;
    expect(page.shape()).toBe(shapeMap.rounded);
    expect(page.size().controlHeight).toBe(36);
    expect(page.surface()).toBe(1);
  });

  it('scopes a shape to its region and publishes --shape-input-radius', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const probes = fixture.debugElement.queryAll((d) => d.componentInstance instanceof Probe);
    expect(probes[1].componentInstance.shape().variant).toBe('pill');
    expect(document.documentElement.style.getPropertyValue('--shape-input-radius')).toBe('20px');
  });

  it('ignores setSize while the size is controlled', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const ctx = fixture.debugElement.children[2].injector.get(SizeProvider);
    ctx.setSize('default');
    expect(ctx.size()).toBe('compact');
    fixture.componentInstance.pinned.set(undefined);
    fixture.detectChanges();
    ctx.setSize('compact');
    expect(ctx.size()).toBe('compact');
  });

  it('walks the surface ladder through nested elevated elements', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid=menu]')!.className).toContain('bg-surface-5');
    expect(el.querySelector('[data-testid=dialog]')!.className).toContain('bg-surface-8');
    const nested = fixture.debugElement.queryAll((d) => d.componentInstance instanceof Probe)[3];
    expect(nested.componentInstance.surface()).toBe(8);
  });
});

describe('provideFluid', () => {
  it('sets the app-level shape and size', () => {
    TestBed.configureTestingModule({ providers: [provideFluid({ shape: 'pill', size: 'compact' })] });
    const fixture = TestBed.createComponent(Probe);
    expect(fixture.componentInstance.shape().variant).toBe('pill');
    expect(fixture.componentInstance.size().variant).toBe('compact');
  });
});

@Component({
  imports: [Icon],
  template: `<ff-icon name="check" [size]="14" class="stroke-[1.5]" />`,
})
class IconHost {}

@Component({
  imports: [Icon],
  template: `<ff-icon name="x" [size]="size()" [strokeWidth]="stroke()" [class]="cls()" />`,
})
class LiveIconHost {
  readonly size = signal(16);
  readonly stroke = signal(2);
  readonly cls = signal('text-muted-foreground');
}

describe('ff-icon', () => {
  it('renders the default Lucide icon with the class on the svg', () => {
    const fixture = TestBed.createComponent(IconHost);
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('14');
    expect(svg.getAttribute('class')).toBe('lucide lucide-check stroke-[1.5]');
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('updates size, stroke and class in place so CSS transitions can tween', () => {
    const fixture = TestBed.createComponent(LiveIconHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const svg = el.querySelector('svg')!;
    fixture.componentInstance.stroke.set(1.5);
    fixture.componentInstance.cls.set('text-foreground');
    fixture.componentInstance.size.set(20);
    fixture.detectChanges();
    expect(el.querySelector('svg')).toBe(svg);
    expect(svg.getAttribute('stroke-width')).toBe('1.5');
    expect(svg.getAttribute('width')).toBe('20');
    expect(svg.getAttribute('class')).toBe('lucide lucide-x text-foreground');
  });

  it('follows provideIcons overrides', () => {
    const custom: IconNode = [['circle', { cx: 12, cy: 12, r: 4 }]];
    TestBed.configureTestingModule({ providers: [provideIcons({ check: custom })] });
    const fixture = TestBed.createComponent(IconHost);
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg')!;
    expect(svg.querySelector('circle')!.getAttribute('r')).toBe('4');
  });
});

describe('ThemeService', () => {
  it('swaps the root class and cross-fades only after the first application', async () => {
    const theme = TestBed.inject(ThemeService);
    TestBed.tick();
    const root = document.documentElement;
    expect(root.classList.contains('transitioning')).toBe(false);
    theme.setTheme('dark');
    TestBed.tick();
    expect(root.classList.contains('dark')).toBe(true);
    expect(root.classList.contains('transitioning')).toBe(true);
    theme.cycle();
    TestBed.tick();
    expect(root.classList.contains('dark')).toBe(false);
    expect(root.classList.contains('light')).toBe(false);
  });
});

describe('createKeyboardNavGate', () => {
  it('earns the ring on navigation keys only', () => {
    const open = signal(false);
    const gate = TestBed.runInInjectionContext(() => createKeyboardNavGate(open));
    open.set(true);
    TestBed.tick();
    expect(gate.keyboardNav.current).toBe(false);
    gate.trackKeyboardNav(new KeyboardEvent('keydown', { key: 'a' }));
    expect(gate.keyboardNav.current).toBe(false);
    gate.trackKeyboardNav(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(gate.keyboardNav.current).toBe(true);
  });
});

describe('animateFluid', () => {
  it('jumps transforms but keeps the fade under reduced motion', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const anim = animateFluid(el, { opacity: [0, 1], transform: ['scale(0.9)', 'scale(1)'] }, { duration: 0.05 }, true);
    await anim.finished;
    expect(el.style.transform).toBe('scale(1)');
    expect(el.style.opacity).toBe('1');
    el.remove();
  });
});

