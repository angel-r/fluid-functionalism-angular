// ---------------------------------------------------------------------------
// /demo: the full-screen carousel of component slides. Ported from
// app/demo/page.tsx — same slides, same card, same scaling stage, same
// keyboard and URL behaviour, without the site shell (the route's
// `data: { shell: false }`).
//
// The slides come from slide-registry.ts; the settings sandbox from
// demo-settings-scope.ts; the card from demo-card.ts (the reference's
// bento-card with the footer action slot the home grid never uses).
// ---------------------------------------------------------------------------

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import {
  Button,
  ColorPickerPortalContainer,
  Icon,
  ShapeContext,
  ShapeProvider,
  SizeContext,
  SizeProvider,
  Tooltip,
  TooltipPortalContainer,
  enterTransition,
  fontWeights,
  injectAnimateFluid,
  spring,
} from '@angel-r/fluid-functionalism-angular';
import { SettingsContent } from '../../shell/settings-content';
import { DemoCard } from './demo-card';
import { DemoSettingsScope } from './demo-settings-scope';
import { DEMO_SLIDES, SETTINGS_SLUG } from './slide-registry';

/** The design size the stage scales up from: the card's aspect ratio and the
 *  width every slide is composed at. */
const BASE_WIDTH = 680;
const BASE_HEIGHT = 420;

@Component({
  selector: 'app-demo-page',
  imports: [
    NgComponentOutlet,
    RouterLink,
    Button,
    Icon,
    Tooltip,
    TooltipPortalContainer,
    ColorPickerPortalContainer,
    ShapeProvider,
    SizeProvider,
    DemoSettingsScope,
    DemoCard,
    SettingsContent,
  ],
  templateUrl: './demo.page.html',
  host: { style: 'display: block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DemoPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly animateFluid = injectAnimateFluid();

  // The site's own settings, read above the page's sandbox: the sandbox opens
  // on them and the page offers them back on the way out.
  private readonly siteShape = inject(ShapeContext);
  private readonly siteSize = inject(SizeContext);

  protected readonly slides = DEMO_SLIDES;
  protected readonly settingsSlug = SETTINGS_SLUG;
  protected readonly bold = fontWeights.bold;
  protected readonly aspectRatio = `${BASE_WIDTH} / ${BASE_HEIGHT}`;

  protected readonly initialShape = untracked(() => this.siteShape.shape());
  protected readonly initialSize = untracked(() => this.siteSize.size());

  /** The settings panel lives in the page's own sandbox; square icon buttons
   *  follow the step it is set to, since they sit inside it. */
  private readonly scope = viewChild(DemoSettingsScope);
  protected readonly iconSize = computed(() =>
    (this.scope()?.size() ?? this.initialSize) === 'compact' ? 'icon-compact' : 'icon',
  );

  private readonly querySlug = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('c'))),
    { initialValue: this.route.snapshot.queryParamMap.get('c') },
  );

  /** The slide on screen: `?c=<slug>` when it names one, else the first. */
  protected readonly index = signal(this.indexOf(this.route.snapshot.queryParamMap.get('c')) ?? 0);
  protected readonly current = computed(() => this.slides[this.index()]);
  /** The card block is keyed by slug (see the template), so this one-item list
   *  still remounts the card — and the preview inside it — on every nav. */
  protected readonly visible = computed(() => {
    const slide = this.current();
    return slide ? [slide] : [];
  });
  protected readonly prevSlide = computed(() => this.slides[this.index() - 1] ?? null);
  protected readonly nextSlide = computed(() => this.slides[this.index() + 1] ?? null);

  // Slides render at 1:1 by default — the size the component actually ships
  // at. Toggling this on scales the slide up to fill the card.
  protected readonly scaleOn = signal(false);
  private readonly cardWidthScale = signal(1);
  private readonly targetScale = computed(() => (this.scaleOn() ? this.cardWidthScale() : 1));

  private readonly cardRef = viewChild<ElementRef<HTMLElement>>('card');
  private readonly stageRef = viewChild<ElementRef<HTMLElement>>('stage');
  private appliedStage: HTMLElement | null = null;
  /** The slug this page last put in the URL: its emission is not a sync. */
  private written: string | null = null;

  constructor() {
    // A slide opens on the slug the URL names, and follows it afterwards —
    // back/forward, a URL edit, or a link into the demo from somewhere else.
    // The slug a nav just wrote is not news (the URL lands a tick later), and
    // the index is read untracked so a nav's own write cannot pull it back.
    effect(() => {
      const slug = this.querySlug();
      if (slug === null || slug === this.written) return;
      const index = this.indexOf(slug);
      if (index === null) return;
      this.written = slug;
      if (index !== untracked(() => this.index())) this.index.set(index);
    });

    afterNextRender(() => {
      const card = this.cardRef()?.nativeElement;
      if (card) this.observeCard(card);
      window.addEventListener('keydown', this.onKeyDown);
    });
    this.destroyRef.onDestroy(() => window.removeEventListener('keydown', this.onKeyDown));

    // The scaling stage: a slide arrives already at its scale (`initial={false}`
    // on the reference), so a mount is written straight and only a change of
    // target springs — either the toggle or a resize the stage chases.
    afterRenderEffect(() => {
      const stage = this.stageRef()?.nativeElement ?? null;
      const target = this.targetScale();
      if (!stage) return;
      if (stage !== this.appliedStage) {
        this.appliedStage = stage;
        stage.style.transform = `scale(${target})`;
        return;
      }
      this.animateFluid(stage, { scale: target }, enterTransition(spring.moderate));
    });
  }

  protected toggleScale(): void {
    this.scaleOn.update((on) => !on);
  }

  protected goTo(index: number): void {
    const slide = this.slides[index];
    if (!slide) return;
    this.index.set(index);
    this.written = slide.slug;
    // replace, not push: the back button leaves the demo instead of walking
    // every slide back.
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { c: slide.slug },
      replaceUrl: true,
    });
  }

  private indexOf(slug: string | null): number | null {
    if (!slug) return null;
    const index = DEMO_SLIDES.findIndex((slide) => slide.slug === slug);
    return index >= 0 ? index : null;
  }

  /** The stage scale that fills the card's width. */
  private observeCard(card: HTMLElement): void {
    const update = () => this.cardWidthScale.set(card.getBoundingClientRect().width / BASE_WIDTH);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(card);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  /** Arrow-hold keeps advancing because the handler reads the live signals
   *  rather than closing over an index. */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;

    const target = event.target instanceof HTMLElement ? event.target : null;
    const tag = target?.tagName;
    const role = target?.getAttribute('role');
    if (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      target?.isContentEditable ||
      role === 'slider' ||
      role === 'tablist' ||
      role === 'radiogroup' ||
      role === 'listbox' ||
      role === 'menu'
    ) {
      return;
    }
    if (target?.closest('[role=slider],[role=tablist],[role=radiogroup],[role=listbox],[role=menu],[role=menubar]')) {
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.goTo(this.index() + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.goTo(this.index() - 1);
    }
  };
}
