# Upstream maintenance

The Mermaid package is maintained in this monorepo at
`packages/vitepress-mermaid-renderer`. New fixes go here. The original fork and
its workflows are left intact.

The source is [YarikMix/vitepress-mermaid-renderer](https://github.com/YarikMix/vitepress-mermaid-renderer/tree/a9e25dca6d94710074b20e59e432de7882059ec6),
maintenance branch `feat/render-events`, SHA
`a9e25dca6d94710074b20e59e432de7882059ec6`. Its upstream is
[sametcn99/vitepress-mermaid-renderer](https://github.com/sametcn99/vitepress-mermaid-renderer).
Baseline `5b2556adf16dceae3918e458cc5a2e2965694f58` (1.2.3) is an ancestor,
followed by `959ec6d` (SPA disposal/render queue), `9e6c070` (fork metadata) and
`a9e25dc` (render result events). Importing the baseline alone would lose those
maintained fixes. The package retains the original author's MIT metadata;
the source contains no standalone LICENSE file.

To compare a later upstream version:

1. Fetch upstream into a separate clone, record the candidate SHA, and compare
   it against `5b2556adf16dceae3918e458cc5a2e2965694f58`. Separately inspect
   `5b2556a..a9e25dc` so lifecycle fixes and render-result events remain covered.
2. Compare source, tests, build/type declaration scripts, package exports and
   peer ranges with this monorepo package. Keep scoped imports, version and
   repository metadata here. Do not import generated `dist`, dependencies,
   upstream workflows or the full upstream documentation site.
3. Apply needed changes here and retain the existing controls, static mode,
   SSR behavior and bubbling `vitepress-mermaid:render-complete` event with
   `id: string`, `success: boolean` and optional original error.
4. Run `bun install`, `bun run build`, `bun run typecheck`, `bun run test`,
   `bun run check:packages` and
   `bun run --filter '@wely6743/vitepress-mermaid-renderer' test:e2e`.
   Use Playwright's Chromium or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an
   installed Chromium executable. Unit/archive checks preserve Mermaid 12;
   the original VitePress browser fixture uses Mermaid 11.
5. Record the new SHA, selected changes and check results here and in
   `ORIGINS.md`.
