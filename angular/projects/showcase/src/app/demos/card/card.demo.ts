import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CARD_PARTS, type IconName } from 'fluid-functionalism';
import { DemoPage, DemoSection } from '../../shared/demo-page';

// Clarity-blue mesh placeholders, the same art the React docs use.
const BANNER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180'%3E%3Cdefs%3E%3CradialGradient id='a' cx='12%25' cy='16%25' r='70%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.9'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='b' cx='90%25' cy='12%25' r='65%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.45'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='c' cx='82%25' cy='94%25' r='75%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.8'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='d' cx='24%25' cy='90%25' r='68%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.55'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='320' height='180' fill='%23ffffff'/%3E%3Crect width='320' height='180' fill='%236B97FF' fill-opacity='0.2'/%3E%3Crect width='320' height='180' fill='url(%23a)'/%3E%3Crect width='320' height='180' fill='url(%23b)'/%3E%3Crect width='320' height='180' fill='url(%23c)'/%3E%3Crect width='320' height='180' fill='url(%23d)'/%3E%3C/svg%3E";
const THUMB =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cdefs%3E%3CradialGradient id='a' cx='20%25' cy='18%25' r='80%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.95'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='b' cx='86%25' cy='14%25' r='75%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.5'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='c' cx='72%25' cy='94%25' r='85%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.85'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='40' height='40' fill='%23ffffff'/%3E%3Crect width='40' height='40' fill='%236B97FF' fill-opacity='0.35'/%3E%3Crect width='40' height='40' fill='url(%23a)'/%3E%3Crect width='40' height='40' fill='url(%23b)'/%3E%3Crect width='40' height='40' fill='url(%23c)'/%3E%3C/svg%3E";

@Component({
  selector: 'app-card-demo',
  imports: [DemoPage, DemoSection, CARD_PARTS],
  template: `
    <app-demo-page
      title="Card"
      description="shadcn's compositional card, dressed in Fluid Functionalism. Stacked, inline, or grid — borderless by default with fluid hover that previews where a click will land."
    >
      <app-demo-section title="Basic">
        <div class="w-full max-w-[520px]">
          <ff-card-group orientation="inline">
            @for (f of features; track f.title) {
              <ff-card (cardClick)="noop()">
                <ff-card-media [icon]="f.icon" />
                <div ffCardHeader>
                  <span ffCardTitle>{{ f.title }}</span>
                  <p ffCardDescription>{{ f.description }}</p>
                </div>
                <div ffCardFooter><button ffCardButton>Connect</button></div>
              </ff-card>
            }
          </ff-card-group>
        </div>
      </app-demo-section>

      <app-demo-section title="Grid: 2-D fluid hover">
        <div class="w-full max-w-[560px]">
          <ff-card-group [columns]="2" border="outlined" separated>
            @for (f of features; track f.title) {
              <ff-card (cardClick)="noop()">
                <img ffCardImage [src]="banner" />
                <div ffCardHeader>
                  <span ffCardTitle>{{ f.title }}</span>
                  <p ffCardDescription>{{ f.description }}</p>
                </div>
                <div ffCardFooter>
                  <button ffCardButton variant="primary">Get started</button>
                  <button ffCardButton variant="secondary">Learn more</button>
                </div>
              </ff-card>
            }
          </ff-card-group>
        </div>
      </app-demo-section>

      <app-demo-section title="Outlined group">
        <div class="w-full max-w-[520px]">
          <ff-card-group orientation="inline" border="outlined">
            @for (f of features; track f.title) {
              <ff-card (cardClick)="noop()">
                <ff-card-media [logo]="thumb" />
                <div ffCardHeader>
                  <span ffCardTitle>{{ f.title }}</span>
                  <p ffCardDescription>{{ f.description }}</p>
                </div>
                <div ffCardFooter><button ffCardButton variant="primary">Get started</button></div>
              </ff-card>
            }
          </ff-card-group>
        </div>
      </app-demo-section>

      <app-demo-section title="Separated tiles">
        <div class="w-full max-w-[560px]">
          <ff-card-group orientation="inline" separated>
            @for (f of features; track f.title) {
              <ff-card (cardClick)="noop()">
                <img ffCardImage [src]="banner" />
                <div ffCardHeader>
                  <span ffCardTitle>{{ f.title }}</span>
                  <p ffCardDescription>{{ f.description }}</p>
                </div>
                <div ffCardFooter>
                  <button ffCardButton variant="primary">Get started</button>
                  <button ffCardButton variant="secondary">Learn more</button>
                  <button ffCardButton>Connect</button>
                </div>
              </ff-card>
            }
          </ff-card-group>
        </div>
      </app-demo-section>

      <app-demo-section title="Fully yours — compose anything">
        @if (dismissed()) {
          <button
            type="button"
            class="text-site-body text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
            (click)="dismissed.set(false)"
          >
            Restore card
          </button>
        } @else {
          <div class="w-full max-w-[300px]">
            <ff-card dismissible class="border border-border/60 overflow-hidden rounded-xl" (dismiss)="dismissed.set(true)">
              <img ffCardImage [src]="banner" />
              <div ffCardHeader><span ffCardTitle>Meet the new Card component</span></div>
              <div ffCardContent class="flex flex-col gap-3">
                <ff-card-feature
                  icon="paintbrush"
                  title="Always pixel-perfect"
                  description="Renders your design exactly — token-driven and crisp in light and dark, at any radius"
                />
                <ff-card-feature
                  icon="square-library"
                  title="Stacked, inline, or grid"
                  description="One compositional API — borderless by default, with separated tiles or a shared frame"
                />
              </div>
              <div ffCardFooter>
                <button ffCardButton variant="primary">Get started</button>
                <button ffCardButton variant="ghost">Learn more</button>
              </div>
            </ff-card>
          </div>
        }
      </app-demo-section>

      <app-demo-section title="Selected">
        <!-- One card carries the persistent fill, its title bolds, and the
             group drops the dividers around it so the fill reads clean. -->
        <div class="w-full max-w-[520px]">
          <ff-card-group orientation="inline">
            @for (f of features; track f.title; let i = $index) {
              <ff-card [label]="f.title" [selected]="selected() === i" (cardClick)="selected.set(i)">
                <ff-card-media [icon]="f.icon" />
                <div ffCardHeader>
                  <span ffCardTitle>{{ f.title }}</span>
                  <p ffCardDescription>{{ f.description }}</p>
                </div>
              </ff-card>
            }
          </ff-card-group>
        </div>
      </app-demo-section>
    </app-demo-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CardDemo {
  protected readonly banner = BANNER;
  protected readonly thumb = THUMB;
  protected readonly features: { icon: IconName; title: string; description: string }[] = [
    { icon: 'circle', title: 'Fluid motion', description: 'Spring-tuned transitions calibrated across three tiers' },
    { icon: 'shield', title: 'Accessible by default', description: 'Focus-visible rings and ARIA roles in every part' },
    { icon: 'palette', title: 'Yours to theme', description: 'Swap radius, icons, and primitive at runtime' },
    { icon: 'moon', title: 'Dark mode ready', description: 'Tokens adapt to light and dark automatically' },
  ];
  protected readonly selected = signal(1);
  protected readonly dismissed = signal(false);
  protected noop() {}
}
