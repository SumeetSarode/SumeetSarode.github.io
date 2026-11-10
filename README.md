# sumeetsarode.github.io

The source of [Sumeet Sarode's portfolio site](https://sumeetsarode.github.io): a fast, accessible,
static website with light and dark themes and three case studies.

- **Built with** [Astro](https://astro.build), TypeScript, and plain CSS. No client-side framework.
- **Tested with** Vitest (unit) and Playwright (real browsers, including axe accessibility checks in both
  themes). Continuous integration runs the checks on Linux, macOS, and Windows.
- **Published** to GitHub Pages by GitHub Actions, only after every check passes.

```bash
npm install
npm run dev          # live preview
npm test             # unit tests
npm run build        # production build into dist/
```

This is a personal site, so I'm not looking for contributions. Day-to-day instructions for editing and
publishing are in [MAINTAINING.md](MAINTAINING.md).
