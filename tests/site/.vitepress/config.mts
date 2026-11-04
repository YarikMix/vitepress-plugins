import { defineConfig } from 'vitepress';
import { fileURLToPath } from 'node:url';
import { moduleSidebar, readModules } from '@wely6743/vitepress-module-graph/node';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import { mermaidFence } from '@wely6743/vitepress-diagram-viewer/node';
export default defineConfig({
  title: 'Diagram fixture', base: process.env.SITE_BASE || '/', appearance: true, cleanUrls: true, ignoreDeadLinks: true,
  markdown: { config: mermaidFence },
  vite: { ssr: { noExternal: ['@wely6743/vitepress-module-graph', '@wely6743/vitepress-diagram-viewer'] }, resolve: { dedupe: ['vue'], alias: { mermaid: require.resolve('mermaid') } } },
  themeConfig: { sidebar: { '/modules/': moduleSidebar(readModules(fileURLToPath(new URL('../modules', import.meta.url)))) }, nav: [{ text: 'Diagrams', link: '/' }, { text: 'Ordinary', link: '/ordinary' }] },
});
