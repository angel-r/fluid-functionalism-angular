import type { Type } from '@angular/core';

/**
 * One entry per showcase page. Each demo lives in `demos/<slug>/<slug>.demo.ts`
 * and default-exports its standalone component, so routes stay lazy.
 */
export interface DemoEntry {
  slug: string;
  title: string;
  group: 'Foundations' | 'Components' | 'Blocks';
  load: () => Promise<{ default: Type<unknown> }>;
}

export const demos: DemoEntry[] = [
  {
    slug: 'foundations',
    title: 'Foundations',
    group: 'Foundations',
    load: () => import('./foundations/foundations.demo'),
  },
];
