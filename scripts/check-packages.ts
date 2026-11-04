import { strict as assert } from "node:assert";
import { existsSync, lstatSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const target = process.argv[2];
assert([undefined, "graph", "renderer"].includes(target), `Unknown package: ${target}`);

function run(command: string[], cwd: string): string {
	const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
	assert.equal(result.exitCode, 0, `${command.join(" ")} failed:\n${result.stdout}\n${result.stderr}`);
	return result.stdout.toString().trim();
}

if (!target || target === "graph") {
	run(["bun", "scripts/check-module-graph-package.ts"], root);
	console.log("Module-graph archive check passed.");
}

if (!target || target === "renderer") {
	const pkg = join(root, "packages/vitepress-mermaid-renderer");
	assert(existsSync(join(pkg, "package.json")), "Missing renderer package");
	const consumer = mkdtempSync(join(realpathSync(tmpdir()), "mermaid-renderer-package-check-"));
	try {
		const archive = run(["bun", "pm", "pack", "--destination", consumer, "--quiet"], pkg);
		const name = "@wely6743/vitepress-mermaid-renderer";
		writeFileSync(join(consumer, "package.json"), JSON.stringify({
			private: true,
			type: "module",
			dependencies: { [name]: resolve(pkg, archive), mermaid: "^12.0.0", vue: "^3.5.42" },
		}));
		run(["bun", "install", "--ignore-scripts"], consumer);
		const installed = join(consumer, "node_modules", name);
		assert(!lstatSync(installed).isSymbolicLink(), "Renderer must not be a workspace symlink");
		const manifest = JSON.parse(readFileSync(join(installed, "package.json"), "utf8"));
		assert.equal(manifest.name, name);
		assert.equal(manifest.version, JSON.parse(readFileSync(join(pkg, "package.json"), "utf8")).version);
		for (const file of [manifest.exports["."].types, manifest.exports["."].import, manifest.exports["./css"]]) {
			const path = join(installed, file);
			assert(existsSync(path), `Missing exported file: ${file}`);
			assert(realpathSync(path).startsWith(`${consumer}${sep}`), `File escaped consumer: ${file}`);
		}
		writeFileSync(join(consumer, "check.mjs"), `
import { strict as assert } from "node:assert";
assert.equal(typeof window, "undefined");
assert.equal(typeof document, "undefined");
const { createMermaidRenderer, MermaidRenderer } = await import("${name}");
assert.equal(typeof MermaidRenderer.getInstance, "function");
const renderer = createMermaidRenderer({ static: true });
renderer.setToolbar({});
renderer.resetInstance();
const css = import.meta.resolve("${name}/css");
assert(css.endsWith("/dist/index.css"));
`);
		run(["node", "check.mjs"], consumer);
		writeFileSync(join(consumer, "check.ts"), `
import { createMermaidRenderer, MermaidRenderer, type MermaidRendererOptions } from "${name}";
const options: MermaidRendererOptions = { static: true, theme: "dark" };
const renderer: MermaidRenderer = createMermaidRenderer(options);
renderer.setToolbar({});
`);
		writeFileSync(join(consumer, "tsconfig.json"), JSON.stringify({
			compilerOptions: { strict: true, skipLibCheck: true, noEmit: true, module: "ESNext", moduleResolution: "bundler", target: "ESNext", types: [] },
			files: ["check.ts"],
		}));
		run(["node", join(root, "node_modules/typescript/bin/tsc"), "-p", "tsconfig.json"], consumer);
		console.log("Renderer tarball installs outside the workspace; SSR, declarations and CSS exports pass (Mermaid 12).");
	} finally {
		rmSync(consumer, { recursive: true, force: true });
	}
}
