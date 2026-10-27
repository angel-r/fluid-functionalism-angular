# Security

How to report a vulnerability in the Angular port of Fluid Functionalism without making it public.

## Report it privately

Use GitHub's private reporting: [report a vulnerability](https://github.com/angel-r/fluid-functionalism-angular/security/advisories/new). Only the maintainer sees the report, and the conversation stays in that advisory. Don't open a public issue for a security problem.

Include the component, the package version, and the steps that show the problem. A small repo or a screen recording helps.

## What's covered

- The npm package [`@angel-r/fluid-functionalism-angular`](https://www.npmjs.com/package/@angel-r/fluid-functionalism-angular): everything under `angular/projects/fluid-functionalism/`.
- The demo at [angel-r.github.io/fluid-functionalism-angular](https://angel-r.github.io/fluid-functionalism-angular/).

A vulnerability in a package the library depends on (Angular, the Angular CDK, Motion and the others in its `package.json`) belongs to that project first. Report it there, then here if the library needs a fix or a higher version floor. A problem in the original React components goes to the [original project](https://github.com/mickadesign/fluid-functionalism/security/advisories/new).

## Versions

Fixes land in the latest published version only. Update with `npm i @angel-r/fluid-functionalism-angular@latest`.

## How dependencies stay safe

Dependabot opens a pull request when a package in `angular/package-lock.json` gets a security advisory.
