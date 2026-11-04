import { defineConfig } from 'vitepress';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import { mermaidFence } from '@wely6743/vitepress-diagram-viewer/node';
export default defineConfig({
  title: 'Diagram fixture', base: process.env.SITE_BASE || '/', appearance: true,
  markdown: { config: mermaidFence },
  vite: { resolve: { dedupe: ['vue'], alias: { mermaid: require.resolve('mermaid') } } },
  themeConfig: { nav: [{ text: 'Diagrams', link: '/' }, { text: 'Ordinary', link: '/ordinary' }] },
});
