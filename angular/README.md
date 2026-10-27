# Angular workspace

The workspace behind [@angel-r/fluid-functionalism-angular](https://www.npmjs.com/package/@angel-r/fluid-functionalism-angular), an unofficial Angular port of [Fluid Functionalism](https://github.com/mickadesign/fluid-functionalism). Installing and using the library is in the [main README](../README.md); this page is for working on the port.

| Project | What it is |
|---|---|
| `projects/fluid-functionalism` | The library (ng-packagr), published as `@angel-r/fluid-functionalism-angular`. Components, DI foundations, theme CSS, icon packs. |
| `projects/showcase` | The demo app, one route per component and block, deployed to [GitHub Pages](https://angel-r.github.io/fluid-functionalism-angular/). |

The React/Next source at the repository root is untouched, so upstream changes can still be merged and compared 1:1.

Not ported: the Next docs site itself (playgrounds, presets, changelog, OG images, evals, skill) and the site-only `nav-item` / `nav-menu`.


## How React maps to Angular

| React | Angular |
|---|---|
| `FluidProvider` / `ShapeProvider` / `SizeProvider` / `IconProvider` | `provideFluid()`, `[ffShapeProvider]`, `[ffSizeProvider]`, `provideIcons()` |
| `useShape()` / `useSize()` / `useIcons()` | `injectShape()` / `injectSize()` / `<ff-icon name="…">` |
| `value` + `onValueChange` | `[(value)]` (`model()`); menus and select keep `[open]` / `[value]` + output so a bound value always wins |
| `asChild` / Slot | attribute selectors on the native element (`button[ffButton]`, `a[ffButton]`) |
| `onSelect`, `onCopy`, `onClick` | `itemSelect`, `copied`, `cardClick` (never named after native DOM events) |
| Radix / Base UI primitives | `@angular/aria` (menu, listbox, tabs) and `@angular/cdk` (overlay, dialog, a11y); hand-written ARIA where neither fits |
| `motion/react` springs | `motion` vanilla `animate()` with the same spring tiers; exits run imperatively |
| `@daypicker/react` | a framework-free date model inside `calendar` |

The per-component differences (and why) are recorded in `odd/tasks/angular-port.md` at the repository root. `PORTING.md` holds the conventions and the gotchas found while porting.

## Development

| Task | Command (from `angular/`) |
|---|---|
| Install the workspace | `npm install` |
| Showcase dev server | `npx ng serve showcase` |
| All tests (Vitest, jsdom) | `npx ng test fluid-functionalism --watch=false` |
| One component's tests | `npx ng test fluid-functionalism --watch=false --include='**/select/*.spec.ts'` |
| Browser motion/layout checks | `node scripts/browser-checks/run.mjs --url http://localhost:4200` (needs the showcase running and a local Chrome; `--only <text>` filters) |
| Build the library | `npx ng build fluid-functionalism` (output in `dist/fluid-functionalism`) |
| Publish to npm | bump `version` in `projects/fluid-functionalism/package.json`, commit, then push a matching tag (`git tag v0.1.0 && git push origin v0.1.0`). The `Publish Angular library` workflow tests, builds and publishes with npm trusted publishing. |
| Regenerate the icon packs | `node scripts/generate-icon-packs.mjs` |

In the workspace, the `@angel-r/fluid-functionalism-angular` import path points at the library source, so the showcase needs no library build.

## Checklist for a change

- [ ] Class strings, `data-*` attributes and ARIA match the React source.
- [ ] Motion uses a spring tier from `core/springs`, never a hand-written duration.
- [ ] The component's spec covers each rule through its public interface.
- [ ] The showcase demo shows the change.

## License

[MIT](../LICENSE). Fluid Functionalism © Micka Touillaud; Angular port © angel-r.
