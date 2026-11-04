import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/**/*.ts', '!src/**/*.d.ts'],
  unbundle: true,
  format: ['esm'],
  dts: true,
  clean: true,
  deps: { neverBundle: [/\.vue$/] },
  // VitePress compiles the Vue source, sharing the consuming site's Vue instance.
  copy: [
    { from: 'src/*.vue', to: 'dist', flatten: true },
    { from: 'src/style.css', to: 'dist', flatten: true },
    { from: 'src/diagram-scale.ts', to: 'dist', flatten: true },
    { from: 'src/mermaid-size.ts', to: 'dist', flatten: true },
  ],
});
