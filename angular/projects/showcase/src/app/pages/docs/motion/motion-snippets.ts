// The Code tab of every /docs/motion preview, as Angular (the React page in
// app/docs/motion/page.tsx carried motion/react snippets).

/** Three speeds: the tiers, and how a port reaches for them. */
export const springTokensCode = `import { enterTransition, exitTransition, injectAnimateFluid, spring } from '@angel-r/fluid-functionalism-angular';

// fast     — 0.08s, bounce 0.    Hover, fades, tooltips, focus rings.
// moderate — 0.16s, bounce 0.    Critically damped: dropdowns, tabs, short
//                                travel, and panels that must land exactly
//                                (drawers, merged selection).
// slow     — 0.24s, bounce 0.12. Dialogs, drawers, large surfaces.

// enterTransition(spring.<tier>) is the enter; exitTransition(spring.<tier>)
// is the matching exit tween.
const animate = injectAnimateFluid();
animate(el, { x: 120 }, enterTransition(spring.fast));        // enter
animate(el, { opacity: 0 }, exitTransition(spring.fast));     // leave`;

/** Slow in, faster out: same enter, two exits. */
export const modalCode = `// Both modals open on spring.slow. Only the exit differs.
const animate = injectAnimateFluid();

// ❌ Slow exit — same 0.4s as the enter, drags on the way out
animate(backdrop, { opacity: 1 }, enterTransition(spring.slow));
animate(backdrop, { opacity: 0 }, { duration: 0.4 });

// ✅ Faster exit — leaves on exitTransition(spring.slow) (0.16s tween)
animate(backdrop, { opacity: 1 }, enterTransition(spring.slow));
animate(backdrop, { opacity: 0 }, exitTransition(spring.slow));`;
