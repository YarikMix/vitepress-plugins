# Origins

The packages retain their source licenses and authorship. Their Git histories and generated output are not imported.

## Module graph

- Source: [TP-Prepare/frontend-packages](https://github.com/TP-Prepare/frontend-packages/tree/29e07ca92d6ec463f71d7937609fccf55b5c3c1e/packages/vitepress-module-graph), `packages/vitepress-module-graph`.
- Source SHA: `29e07ca92d6ec463f71d7937609fccf55b5c3c1e` (source `main`, checked 2026-11-04).
- Includes the source package, tests, site fixture, build configuration, package license and the necessary root TypeScript/Bun/archive-check tooling. Example packages and their tooling are excluded.
- License: MIT, copyright (c) 2026 TP-Prepare; preserved in `packages/vitepress-module-graph/LICENSE`.
- Local changes: npm scope `@wely6743`, repository metadata for `YarikMix/vitepress-plugins`, version `0.0.0`, and self-references in source, tests and documentation.

## Mermaid renderer

- Source: [YarikMix/vitepress-mermaid-renderer](https://github.com/YarikMix/vitepress-mermaid-renderer/tree/a9e25dca6d94710074b20e59e432de7882059ec6), maintenance branch `feat/render-events`.
- Imported SHA: `a9e25dca6d94710074b20e59e432de7882059ec6`, descended from upstream/main baseline `5b2556adf16dceae3918e458cc5a2e2965694f58` (1.2.3). The baseline alone predates the maintained fork fixes.
- Preserves lifecycle/SPA fix `959ec6d`, fork metadata `9e6c070`, and bubbling render-result events `a9e25dc`, all original unit/browser tests and the VitePress smoke fixture. Source docs, generated output, Git history and upstream workflows are excluded.
- Original project/author: [sametcn99/vitepress-mermaid-renderer](https://github.com/sametcn99/vitepress-mermaid-renderer), `sametcn99`; package license remains MIT. No standalone LICENSE file exists in the imported source; no copyright or license text has been invented.
- Local changes: npm scope `@wely6743`, repository metadata for `YarikMix/vitepress-plugins`, version `0.0.0`, import references, monorepo typecheck configuration/type-only lifecycle test corrections, and fixture-only static/theme/error browser coverage. Runtime source retains the maintained fork behavior.
- Future source changes are made here; comparison instructions are in [docs/upstream.md](docs/upstream.md). The source clone was read only.

## Other source checks before implementation

Checked 2026-11-04; these source trees were clean and were not modified.

- Mermaid renderer initial `main` check: `5b2556adf16dceae3918e458cc5a2e2965694f58`. The later maintenance commits above were imported after verifying their ancestry.
- Diagram viewer baseline: [Cringe-Driven-Development-Team/docs](https://github.com/Cringe-Driven-Development-Team/docs/tree/4b74e9d7871f2a24ef27f50bfe7d2f617cc76ded), clean local `heading-links` SHA `4b74e9d7871f2a24ef27f50bfe7d2f617cc76ded`. Current remote `main` was `34ea7a9c042a3e2bcd2677be71fe380bc674fbfb`, 24 commits ahead. The comparison changed no viewer, scale, SVG-size or fence source; the shared CSS change only adds a navigation-bar background.

## Diagram viewer

- Source: [Cringe-Driven-Development-Team/docs](https://github.com/Cringe-Driven-Development-Team/docs/tree/4b74e9d7871f2a24ef27f50bfe7d2f617cc76ded), `site/.vitepress/theme/{DiagramFrame,MermaidFrame,DiagramSection}.vue`, geometry helpers, diagram CSS from `custom.css`, `site/.vitepress/mermaid-fence.ts`, and the three original script tests.
- Imported SHA: `4b74e9d7871f2a24ef27f50bfe7d2f617cc76ded`. Current source main `34ea7a9c042a3e2bcd2677be71fe380bc674fbfb` changes none of these viewer/helper/fence files; its unrelated navbar CSS addition is excluded.
- Source project: Cringe-Driven-Development-Team/docs. No standalone LICENSE/COPYING file or package.json license field exists at that SHA. No license grant or copyright text was invented; the extracted viewer manifest is explicitly `UNLICENSED`.
- Local changes: generic `EraserFrame` accepts consumer-provided URLs/size instead of importing docs file discovery. Diagram interactions, geometry, DOM classes and DiagramSection CSS retain source behavior. Site-specific loader, heading feedback, anchors, Nolebase and file discovery remain in docs. A small browser fixture supplies a white SVG HTML canvas as Eraser input; real Eraser CLI validation belongs to the docs integration task.
- Runtime dependencies between the three packages: none. The renderer is a viewer **development** dependency solely for its real Mermaid 11 browser fixture. Vue/VitePress remain peers and are not bundled.
