import {
  Directive,
  Injectable,
  InjectionToken,
  type Signal,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import {
  fieldTouchClass,
  typeClasses,
  typeScale,
  type TypeScaleRole,
} from './type-scale';

export type SizeVariant = 'default' | 'compact';

export interface SizeClasses {
  /** The variant these classes belong to — handy for conditionals. */
  variant: SizeVariant;
  /** Bounded control height — buttons, inputs, select triggers, subtle tabs —
   *  AND list/menu rows (select options, dropdown, checkbox and radio rows).
   *  One token by design: a popup row lines up with the trigger that opened
   *  it because they share this height. */
  control: string;
  /** `control` as a number, for consumers that need raw pixels. */
  controlHeight: number;
  /** Tab trigger height inside a padded segmented list. Sized so
   *  `segmentPad` + `segmentItem` adds back up to the control height. */
  segmentItem: string;
  /** Padding of the segmented list around its tabs. */
  segmentPad: string;
  /** Body text inside controls (size + line height), same as `type.body`. */
  text: string;
  /** `text` for an editable field: the same body role, plus 16px on touch
   *  screens (`fieldTouchClass`), since iOS Safari zooms the page into a
   *  focused field set under 16px. */
  field: string;
  /** One class string per type role at this step (size + leading). */
  type: Record<TypeScaleRole, string>;
  /** Horizontal padding of bounded controls (select trigger, inputs). */
  px: string;
  /** Horizontal padding of list/menu rows, which sit inside a padded popup
   *  or group and need less inset than a bounded control. */
  itemPx: string;
  /** Gap between an icon / control glyph and its label, and between
   *  neighbouring controls in a row. The compact step halves it. */
  gap: string;
  /** Glyph size in px: leading/trailing icons inside controls, and the
   *  checkbox square / radio circle. */
  icon: number;
}

export const sizeMap: Record<SizeVariant, SizeClasses> = {
  // 36px — the default control height.
  default: {
    variant: 'default',
    control: 'h-9',
    controlHeight: 36,
    segmentItem: 'h-7',
    segmentPad: 'p-1',
    text: typeClasses.default.body,
    field: `${typeClasses.default.body} ${fieldTouchClass}`,
    type: typeClasses.default,
    px: 'px-3',
    itemPx: 'px-2',
    gap: 'gap-2',
    icon: 16,
  },
  // 28px — the compact height for dense surfaces: filter bars, toolbars,
  // table headers, sidebars. One step down in text (12px) and icon (14px)
  // so the whole control shrinks together, not just its box.
  compact: {
    variant: 'compact',
    control: 'h-7',
    controlHeight: 28,
    segmentItem: 'h-6',
    segmentPad: 'p-0.5',
    text: typeClasses.compact.body,
    field: `${typeClasses.compact.body} ${fieldTouchClass}`,
    type: typeClasses.compact,
    px: 'px-2.5',
    itemPx: 'px-1.5',
    gap: 'gap-1',
    icon: 14,
  },
};

/** The size state a region shares: the React SizeContext value. */
export abstract class SizeContext {
  abstract readonly size: Signal<SizeVariant>;
  abstract setSize(next: SizeVariant): void;
}

/** Initial size for the app-level context created by `provideFluid()`. */
export const FF_DEFAULT_SIZE = new InjectionToken<SizeVariant>('FF_DEFAULT_SIZE', {
  factory: () => 'default',
});

/** App-level size context, registered by `provideFluid()`. */
@Injectable()
export class RootSizeContext extends SizeContext {
  private readonly defaultSize = inject(FF_DEFAULT_SIZE);
  private readonly internal = linkedSignal(() => this.defaultSize);
  readonly size = this.internal.asReadonly();
  setSize(next: SizeVariant) {
    this.internal.set(next);
  }
}

/**
 * Scopes a size to a region. `[size]` is controlled — it pins the region
 * (e.g. a compact filter bar) and `setSize` is ignored, so a background write
 * can't pop back out if the input is later removed. `defaultSize` seeds the
 * switchable internal state.
 */
@Directive({
  selector: '[ffSizeProvider]',
  exportAs: 'ffSizeProvider',
  providers: [{ provide: SizeContext, useExisting: SizeProvider }],
})
export class SizeProvider extends SizeContext {
  readonly controlledSize = input<SizeVariant | undefined>(undefined, { alias: 'size' });
  readonly defaultSize = input<SizeVariant>('default');
  private readonly internal = linkedSignal(() => this.defaultSize());
  readonly size = computed(() => this.controlledSize() ?? this.internal());
  setSize(next: SizeVariant) {
    if (this.controlledSize() !== undefined) return;
    this.internal.set(next);
  }
}

type SizeOverride = () => SizeVariant | null | undefined;

/** Resolve the active size variant: explicit override > provider > "default". */
export function injectSizeVariant(override?: SizeOverride): Signal<SizeVariant> {
  const ctx = inject(SizeContext, { optional: true });
  return computed(() => override?.() ?? ctx?.size() ?? 'default');
}

/** Resolve size classes: explicit override > provider > "default". */
export function injectSize(override?: SizeOverride): Signal<SizeClasses> {
  const variant = injectSizeVariant(override);
  return computed(() => sizeMap[variant()]);
}

/** The type scale resolved for the active ladder step (font size in px per role). */
export function injectTypeScale(override?: SizeOverride): Signal<Record<TypeScaleRole, number>> {
  const variant = injectSizeVariant(override);
  return computed(() => {
    const v = variant();
    return {
      display: typeScale.display[v],
      title: typeScale.title[v],
      subtitle: typeScale.subtitle[v],
      body: typeScale.body[v],
      caption: typeScale.caption[v],
      micro: typeScale.micro[v],
    };
  });
}

export function injectSizeContext(): SizeContext {
  const ctx = inject(SizeContext, { optional: true });
  if (!ctx) throw new Error('injectSizeContext() requires provideFluid() or [ffSizeProvider]');
  return ctx;
}
