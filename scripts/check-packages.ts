import assert from 'node:assert/strict';
import { cpSync, existsSync, lstatSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const config = await Bun.file(join(root, 'release-please-config.json')).json();
const supplied: unknown = JSON.parse(process.env.PACKAGE_ARCHIVES ?? '{}');
assert(supplied && typeof supplied === 'object' && !Array.isArray(supplied), 'PACKAGE_ARCHIVES must be an object');
for (const [path, file] of Object.entries(supplied)) {
  assert(Object.hasOwn(config.packages, path), `Unknown archive path: ${path}`);
  assert(typeof file === 'string' && existsSync(file), `Missing archive: ${file}`);
}
const consumer = mkdtempSync(join(realpathSync(tmpdir()), 'vitepress-plugins-consumer-'));
assert(!consumer.startsWith(root), 'Consumer must be outside the workspace');
function run(command: string[], cwd = consumer): string {
  const result = Bun.spawnSync(command, { cwd, stdout: 'pipe', stderr: 'pipe' });
  assert.equal(result.exitCode, 0, `${command.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
  return result.stdout.toString().trim();
}
try {
  const archives: Record<string, string> = {};
  const dependencies: Record<string, string> = { vitepress: '2.0.0-alpha.21', vue: '3.5.43', mermaid: '^11' };
  for (const path of Object.keys(config.packages)) {
    const pkg = await Bun.file(join(root, path, 'package.json')).json();
    const provided = (supplied as Record<string, string>)[path];
    const [packed] = provided ? [] : JSON.parse(run(['npm', 'pack', '--json', '--ignore-scripts', '--pack-destination', consumer], join(root, path)));
    archives[path] = provided ? resolve(provided) : join(consumer, packed.filename);
    dependencies[pkg.name] = archives[path]!;
  }
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies }));
  run(['bun', 'install', '--ignore-scripts']);
  for (const path of Object.keys(archives)) {
    const original = await Bun.file(join(root, path, 'package.json')).json();
    const installed = join(consumer, 'node_modules', original.name);
    assert(!lstatSync(installed).isSymbolicLink(), `${original.name} is a workspace symlink`);
    const manifest = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'));
    assert.equal(manifest.name, original.name);
    assert.equal(manifest.version, original.version);
    for (const deps of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      for (const value of Object.values(manifest[deps] ?? {})) assert(!/^(workspace:|file:|link:|git|github:)|TP-Prepare|frontend-packages|sametcn99/.test(String(value)), `${original.name} has source dependency ${value}`);
    }
    function exported(value: unknown): void {
      if (typeof value === 'string') {
        const file = join(installed, value);
        assert(existsSync(file), `${original.name}: missing export ${value}`);
        assert(realpathSync(file).startsWith(`${consumer}${sep}`), `Export escapes consumer: ${value}`);
      } else for (const item of Object.values(value as object)) exported(item);
    }
    exported(manifest.exports);
    for (const file of Object.values(manifest.bin ?? {})) exported(file);
  }
  // Preserve the original graph consumer's model/CLI/SSR and fixture assertions on these exact bytes.
  console.log(run(['bun', 'scripts/check-module-graph-package.ts', archives['packages/vitepress-module-graph']!], root));
  writeFileSync(join(consumer, 'check.mjs'), `
import assert from 'node:assert/strict';
assert.equal(typeof window, 'undefined'); assert.equal(typeof document, 'undefined');
const { createMermaidRenderer, MermaidRenderer } = await import('@wely6743/vitepress-mermaid-renderer');
assert.equal(typeof MermaidRenderer.getInstance, 'function');
const renderer = createMermaidRenderer({ static: true }); renderer.setToolbar({}); renderer.resetInstance();
// Raw Vue exports are exercised by VitePress SSR below, as with the graph theme.
const { mermaidFence } = await import('@wely6743/vitepress-diagram-viewer/node'); assert.equal(typeof mermaidFence, 'function');
for (const [name, suffix] of [['@wely6743/vitepress-mermaid-renderer/css', '/dist/index.css'], ['@wely6743/vitepress-diagram-viewer/style.css', '/dist/style.css'], ['@wely6743/vitepress-module-graph/style.css', '/dist/theme/style.css']]) assert(import.meta.resolve(name).endsWith(suffix));
`);
  run(['node', 'check.mjs']);
  writeFileSync(join(consumer, 'check.ts'), `
import { createMermaidRenderer, MermaidRenderer, type MermaidRendererOptions } from '@wely6743/vitepress-mermaid-renderer';
import { DiagramFrame, MermaidFrame, EraserFrame, DiagramSection } from '@wely6743/vitepress-diagram-viewer';
import { mermaidFence } from '@wely6743/vitepress-diagram-viewer/node';
import { defaultFilter, type ModuleGraphData } from '@wely6743/vitepress-module-graph';
import { createModulesLoader } from '@wely6743/vitepress-module-graph/node';
import { installModuleGraph } from '@wely6743/vitepress-module-graph/theme';
const options: MermaidRendererOptions = { static: true, theme: 'dark' };
const renderer: MermaidRenderer = createMermaidRenderer(options); renderer.setToolbar({});
void [DiagramFrame, MermaidFrame, EraserFrame, DiagramSection, mermaidFence, defaultFilter, createModulesLoader, installModuleGraph];
`);
  writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, skipLibCheck: true, noEmit: true, module: 'ESNext', moduleResolution: 'bundler', target: 'ESNext', types: [] }, files: ['check.ts'] }));
  run(['node', join(root, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json']);
  cpSync(join(root, 'tests/site'), join(consumer, 'tests/site'), { recursive: true, filter: source => !['node_modules', 'cache', 'dist'].includes(basename(source)) });
  // Fixture sources only; no parent workspace is available in this consumer.
  rmSync(join(consumer, 'tests/site/tsconfig.json'));
  console.log(run(['bun', 'scripts/check-site.ts', '--consumer', consumer, '--smoke'], root));
  // Keep the renderer's separately declared Mermaid 12 peer support checked as well.
  dependencies.mermaid = '^12.0.0';
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies }));
  run(['bun', 'install', '--ignore-scripts']);
  run(['node', 'check.mjs']);
  run(['node', join(root, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json']);
  console.log('All three npm archives: isolated install, exports/types/CSS/CLI/SSR, dev/production root+nested browser and Mermaid 12 SSR passed.');
} finally { rmSync(consumer, { recursive: true, force: true }); }
