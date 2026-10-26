import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Renderer2,
  type Type,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FF_ICONS, type IconDefinition, type IconName, type IconNode } from './icons';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Renders an icon by role (`name`) from the provided icon map, or a given
 * `icon` definition. SVG-node icons get Lucide's 24×24 stroke frame; component
 * icons receive `size`, `strokeWidth` and `class`. The host is
 * `display: contents`, so `class` lands on the <svg> itself — components
 * animate stroke width and size through it.
 */
@Component({
  selector: 'ff-icon',
  imports: [NgComponentOutlet],
  template: `
    @if (component(); as c) {
      <ng-container *ngComponentOutlet="c; inputs: componentInputs()" />
    }
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon {
  readonly name = input<IconName>();
  readonly icon = input<IconDefinition>();
  readonly size = input<number | string>(24);
  readonly strokeWidth = input<number | string>(2);
  readonly userClass = input<string>('', { alias: 'class' });

  private readonly icons = inject(FF_ICONS);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private svg: SVGSVGElement | null = null;

  private readonly definition = computed<IconDefinition | undefined>(() => {
    const name = this.name();
    return this.icon() ?? (name ? this.icons[name] : undefined);
  });

  protected readonly component = computed(() => {
    const def = this.definition();
    return typeof def === 'function' ? (def as Type<unknown>) : null;
  });

  protected readonly componentInputs = computed(() => ({
    size: this.size(),
    strokeWidth: this.strokeWidth(),
    class: this.userClass(),
  }));

  constructor() {
    // The <svg> is rebuilt only when the glyph changes. Size, stroke and class
    // update the same element in place, so a CSS transition on stroke width
    // (1.5 → 2 on hover) tweens instead of snapping to a fresh node.
    effect(() => {
      const def = this.definition();
      untracked(() => {
        this.svg?.remove();
        this.svg = null;
        if (!Array.isArray(def)) return;
        this.svg = this.renderSvg(def);
        this.renderer.appendChild(this.host.nativeElement, this.svg);
      });
    });
    effect(() => {
      const attrs = this.liveAttrs();
      this.definition();
      if (!this.svg) return;
      for (const [key, value] of Object.entries(attrs)) this.renderer.setAttribute(this.svg, key, value);
    });
  }

  private readonly liveAttrs = computed(() => {
    const name = this.name();
    return {
      width: String(this.size()),
      height: String(this.size()),
      'stroke-width': String(this.strokeWidth()),
      class: ['lucide', name ? `lucide-${name}` : '', this.userClass()].filter(Boolean).join(' '),
    };
  });

  private renderSvg(nodes: IconNode): SVGSVGElement {
    const r = this.renderer;
    const svg = r.createElement('svg', SVG_NS) as SVGSVGElement;
    const attrs: Record<string, string> = {
      xmlns: SVG_NS,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
      ...untracked(this.liveAttrs),
    };
    for (const [key, value] of Object.entries(attrs)) r.setAttribute(svg, key, value);
    for (const [tag, childAttrs] of nodes) {
      const child = r.createElement(tag, SVG_NS);
      for (const [key, value] of Object.entries(childAttrs)) r.setAttribute(child, key, String(value));
      r.appendChild(svg, child);
    }
    return svg;
  }
}
