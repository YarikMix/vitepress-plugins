import { h, nextTick, watch } from 'vue';
import { useData, type Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import { DiagramFrame, MermaidFrame, EraserFrame, DiagramSection } from '@wely6743/vitepress-diagram-viewer';
import { createMermaidRenderer } from '@wely6743/vitepress-mermaid-renderer';
import '@wely6743/vitepress-diagram-viewer/style.css';
import './fixture.css';
import { installModuleGraph, trackHeader } from '@wely6743/vitepress-module-graph/theme';
import '@wely6743/vitepress-module-graph/style.css';
import { data } from '../../modules/modules.data';
export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    installModuleGraph(app, data);
    for (const [name, component] of Object.entries({ DiagramFrame, MermaidFrame, EraserFrame, DiagramSection })) app.component(name, component);
  },
  Layout: () => {
    const { isDark } = useData();
    const render = () => createMermaidRenderer({ static: true, theme: isDark.value ? 'dark' : 'default' });
    nextTick(render);
    watch(isDark, render);
    return h(DefaultTheme.Layout, null, { 'doc-before': trackHeader });
  },
} satisfies Theme;
