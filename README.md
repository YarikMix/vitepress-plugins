# VitePress plugins

Three independently versioned packages. Node 22+ and Vue 3.5; the graph and viewer target VitePress `2.0.0-alpha.21`. The Mermaid renderer also supports Mermaid 12; the integrated site uses Mermaid 11.

```sh
npm install @wely6743/vitepress-module-graph @wely6743/vitepress-mermaid-renderer @wely6743/vitepress-diagram-viewer vitepress@2.0.0-alpha.21 vue@^3.5 mermaid@^11
```

The initial working release is `0.1.0`; `0.0.0` under the `bootstrap` tag only reserves each package name. See the [release runbook](docs/releasing.md).

| Package | Exports |
| --- | --- |
| [module-graph](packages/vitepress-module-graph/README.md) | model `.`, loaders/sidebar `./node`, Vue registration `./theme`, `./style.css`; `module-graph` CLI |
| [mermaid-renderer](packages/vitepress-mermaid-renderer/README.md) | `createMermaidRenderer`, `MermaidRenderer`, options/types `.`, `./css` |
| [diagram-viewer](packages/vitepress-diagram-viewer/README.md) | `DiagramFrame`, `MermaidFrame`, `EraserFrame`, `DiagramSection` `.`, `mermaidFence` `./node`, `./style.css` |

Configure Markdown and SSR in `.vitepress/config.mts`:

```ts
import { defineConfig } from 'vitepress';
import { mermaidFence } from '@wely6743/vitepress-diagram-viewer/node';

export default defineConfig({
  markdown: { config: mermaidFence },
  vite: { ssr: { noExternal: [
    '@wely6743/vitepress-module-graph',
    '@wely6743/vitepress-diagram-viewer',
  ] } },
});
```

In `.vitepress/theme/index.ts`, register the diagram components and import CSS:

```ts
import DefaultTheme from 'vitepress/theme';
import { DiagramFrame, MermaidFrame, EraserFrame, DiagramSection } from '@wely6743/vitepress-diagram-viewer';
import '@wely6743/vitepress-diagram-viewer/style.css';
import '@wely6743/vitepress-mermaid-renderer/css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    for (const [name, component] of Object.entries({ DiagramFrame, MermaidFrame, EraserFrame, DiagramSection })) app.component(name, component);
  },
};
```

Call `createMermaidRenderer({ static: true, theme })` on client mount, route changes and theme changes after `nextTick`; the viewer consumes its render-complete event and supplies the toolbar. For a complete theme and graph registration (`installModuleGraph(app, data)`, `trackHeader`, data loader and sidebar), see [the shared fixture](tests/site/.vitepress/theme/index.ts) and the package READMEs.

The packages do not import one another at runtime. Site-specific route hooks, anchors, Nolebase integration, Eraser file lookup and generated artifact metadata belong in the consuming documentation site. Pass the resulting URLs and dimensions to `EraserFrame`.

```sh
bun install --frozen-lockfile
bun run build
bun run typecheck
bun run test
bunx --no-install playwright install chromium
bun run check:packages
bun run check:site
```

`check:packages` installs actual npm tarballs outside the workspace, checks public exports/types/CSS/CLI and SSR, and runs the same fixture in dev and production under `/` and a nested base. `check:site` runs the full browser interaction suite. Set `CHROMIUM_PATH` to use an existing Chromium installation.

Origins, authorship and licensing are recorded in [ORIGINS.md](ORIGINS.md). The viewer preserves its source's `UNLICENSED` status; public availability does not grant a license.
