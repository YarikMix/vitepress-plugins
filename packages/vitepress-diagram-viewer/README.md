# @wely6743/vitepress-diagram-viewer

A shared VitePress frame for Mermaid and Eraser diagrams. Vue and VitePress are peers; Panzoom is loaded in the browser when a canvas has a known size.

Register the components and import the stylesheet in your VitePress theme:

```ts
import { DiagramFrame, MermaidFrame, EraserFrame, DiagramSection } from '@wely6743/vitepress-diagram-viewer';
import '@wely6743/vitepress-diagram-viewer/style.css';

export default {
  enhanceApp({ app }) {
    for (const [name, component] of Object.entries({ DiagramFrame, MermaidFrame, EraserFrame, DiagramSection })) app.component(name, component);
  },
};
```

Configure Markdown fences separately:

```ts
import { mermaidFence } from '@wely6743/vitepress-diagram-viewer/node';
export default {
  markdown: { config: mermaidFence },
  vite: { ssr: { noExternal: ['@wely6743/vitepress-diagram-viewer'] } },
};
```

The consumer installs/configures its Mermaid renderer in static mode. `MermaidFrame` listens for the bubbling `vitepress-mermaid:render-complete` event with `{ id: string, success: boolean }` and reads the rendered SVG's natural geometry. The viewer does not install or initialize Mermaid.

```vue
<EraserFrame title="Architecture" :src="withBase('/architecture.html')" :png-src="withBase('/architecture.png')" :size="{ width: 1200, height: 1800 }" />

<EraserFrame title="Unavailable" src="/missing.html" :size="null">
  <template #status><p>Diagram not rendered yet.</p></template>
</EraserFrame>
```

The consumer supplies `src`, optional `pngSrc`, and `size: DiagramSize | null` from its own files or metadata. The exported `DiagramSize` type is `{ width: number; height: number }`. Apply `withBase` in the consuming site. A null size shows the `status` slot without loading an iframe or Panzoom. The optional `footer` slot replaces the HTML/PNG links.

`DiagramFrame` accepts `{ title: string, size: DiagramSize | null }` and default, `status`, `footer` slots. `MermaidFrame` accepts an optional title and a default diagram slot. `DiagramSection` places its default text slot beside its `diagram` slot when space permits, stacking them on narrow pages.

Zoom with Ctrl/⌘ + wheel or the buttons; ordinary wheel scrolls the page. Drag or focus the frame and use arrow keys to pan. Fullscreen uses the browser API with an overlay fallback and Escape to close.

Source: Cringe-Driven-Development-Team/docs at `4b74e9d7871f2a24ef27f50bfe7d2f617cc76ded`. The source contains no license grant or LICENSE file; this package is marked `UNLICENSED`. See [ORIGINS.md](../../ORIGINS.md).
