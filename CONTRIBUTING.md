# Contributing

An issue first, then a pull request that follows the rules below.

## Start with an issue

Open an [issue](https://github.com/angel-r/fluid-functionalism-angular/issues) before a pull request, so the direction is agreed before the work starts. There's a form for bugs and one for ideas. A security problem goes to a [private report](https://github.com/angel-r/fluid-functionalism-angular/security/advisories/new) instead (see [SECURITY.md](SECURITY.md)).

This repository is the Angular port. A question about how a component should look or move belongs to the [original project](https://github.com/mickadesign/fluid-functionalism), since the port follows it.

## Set up

You need Node 22.22.3 or later (or Node 24.15.0 or later), the range Angular 22 supports.

```bash
cd angular
npm ci
npx ng serve showcase    # demo app on http://localhost:4200
```

## Where things live

- `angular/projects/fluid-functionalism/`: the library. Each component has its folder at the package root (`<name>/`), with its spec next to it; every folder is a secondary entry point.
- `angular/projects/showcase/`: the demo app, one route per component and block.
- `angular/PORTING.md`: how React maps to Angular, the gotchas found so far, the upstream sync and releases.
- Everything outside `angular/` is the original React project. It stays unchanged so upstream changes can be merged and ported.

## Rules

1. **The React source is the reference.** Class strings, `data-*` attributes, ARIA and keyboard behavior match the matching file under `registry/`.
2. **Motion comes from the system.** Springs come from `core/springs`, in the 3 speeds [motion-guidelines.md](motion-guidelines.md) describes. No hand-picked durations.
3. **Tests go through the public interface.** A fix or a new input gets a spec that renders the component and checks what a user sees.
4. **The showcase shows the change.** Its links and assets stay relative, because the demo is served under a sub-path.
5. **Copy follows the tone guide.** Docs text, comments and pull request text follow [tone-of-voice.md](tone-of-voice.md): plain words, present tense, no em dashes.

## Check your work

From `angular/`:

```bash
npx ng test fluid-functionalism --watch=false
npx ng build fluid-functionalism
npx ng build showcase
```

When you change motion or layout, also run the browser checks against the running showcase:

```bash
node scripts/browser-checks/run.mjs --url http://localhost:4200
```

## Pull requests

- One change per pull request, linked to its issue.
- Titles follow the history: `fix(select): …`, `feat(angular): …`, `docs(readme): …`.
- The pull request template's checklist repeats the rules above, so tick it before you ask for a review.

By contributing, you agree that your work is released under the [MIT license](LICENSE), and you follow the [code of conduct](CODE_OF_CONDUCT.md).
