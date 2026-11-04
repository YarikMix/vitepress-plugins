import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

export type ReleaseArtifact = { path: string; name: string; version: string; tarball: string; integrity: string };
type RegistryVersion = { integrity: string } | null;

export function parseReleasedPaths(value: unknown, allowedPaths: readonly string[]): string[] {
  if (!Array.isArray(value) || !value.every(path => typeof path === 'string')) throw new Error('RELEASED_PATHS must be a JSON array of package paths');
  const seen = new Set<string>();
  for (const path of value) {
    if (!allowedPaths.includes(path)) throw new Error(`Unknown release path: ${path}`);
    if (seen.has(path)) throw new Error(`Duplicate release path: ${path}`);
    seen.add(path);
  }
  return value;
}

export function planPublications(artifacts: readonly ReleaseArtifact[], registry: Readonly<Record<string, RegistryVersion>>): ReleaseArtifact[] {
  return artifacts.filter(artifact => {
    const key = `${artifact.name}@${artifact.version}`;
    if (!Object.hasOwn(registry, key) || registry[key] === undefined) throw new Error(`Unverified registry version: ${key}`);
    const published = registry[key];
    if (published === null) return true;
    if (published.integrity !== artifact.integrity) throw new Error(`Registry integrity mismatch for ${key}`);
    return false;
  });
}

export async function readRegistryVersion(artifact: Pick<ReleaseArtifact, 'name' | 'version'>, request: (url: string) => Promise<Response> = fetch): Promise<RegistryVersion> {
  const response = await request(`https://registry.npmjs.org/${encodeURIComponent(artifact.name)}/${encodeURIComponent(artifact.version)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Registry HTTP ${response.status} for ${artifact.name}@${artifact.version}`);
  const value = await response.json() as { dist?: { integrity?: unknown } };
  if (typeof value?.dist?.integrity !== 'string' || !value.dist.integrity) throw new Error(`Missing registry integrity for ${artifact.name}@${artifact.version}`);
  return { integrity: value.dist.integrity };
}

export async function publishArtifacts(artifacts: readonly ReleaseArtifact[], io: {
  readRegistry: (artifact: ReleaseArtifact) => Promise<RegistryVersion>;
  publish: (artifact: ReleaseArtifact) => Promise<void>;
}): Promise<void> {
  const registry = Object.fromEntries(await Promise.all(artifacts.map(async artifact => [`${artifact.name}@${artifact.version}`, await io.readRegistry(artifact)])));
  // Resolve the entire batch before the first irreversible write.
  for (const artifact of planPublications(artifacts, registry)) await io.publish(artifact);
}

if (import.meta.main) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const temporary = mkdtempSync(join(tmpdir(), 'vitepress-release-'));
  const integrity = (tarball: string) => `sha512-${createHash('sha512').update(readFileSync(tarball)).digest('base64')}`;
  function run(command: string[], cwd = root, env = process.env): string {
    const result = Bun.spawnSync(command, { cwd, env, stdout: 'pipe', stderr: 'inherit' });
    if (result.exitCode !== 0) throw new Error(`${command.join(' ')} failed (${result.exitCode})`);
    return result.stdout.toString();
  }
  try {
    const { values } = parseArgs({ options: { 'dry-run': { type: 'boolean' }, tag: { type: 'string', default: 'latest' } } });
    if (!['latest', 'bootstrap'].includes(values.tag!)) throw new Error('Tag must be latest or bootstrap');
    const config = await Bun.file(join(root, 'release-please-config.json')).json();
    const paths = parseReleasedPaths(JSON.parse(process.env.RELEASED_PATHS ?? '[]'), Object.keys(config.packages));
    if (paths.length) {
      run(['bun', 'run', 'build']);
      const artifacts: ReleaseArtifact[] = [];
      for (const path of paths) {
        const pkg = await Bun.file(join(root, path, 'package.json')).json();
        if ((pkg.version === '0.0.0') !== (values.tag === 'bootstrap')) throw new Error(`${pkg.name}@${pkg.version} requires ${pkg.version === '0.0.0' ? 'bootstrap' : 'latest'} tag`);
        const [packed] = JSON.parse(run(['npm', 'pack', '--json', '--ignore-scripts', '--pack-destination', temporary], join(root, path)));
        const tarball = join(temporary, packed.filename);
        artifacts.push({ path, name: pkg.name, version: pkg.version, tarball, integrity: integrity(tarball) });
      }
      const gate = run(['bun', 'scripts/check-packages.ts'], root, { ...process.env, PACKAGE_ARCHIVES: JSON.stringify(Object.fromEntries(artifacts.map(a => [a.path, a.tarball]))) });
      console.log(gate);
      // The checker and npm publish must use precisely the same bytes.
      for (const artifact of artifacts) if (integrity(artifact.tarball) !== artifact.integrity) throw new Error(`Tarball changed: ${artifact.tarball}`);
      await publishArtifacts(artifacts, {
        readRegistry: artifact => readRegistryVersion(artifact),
        publish: async artifact => {
          console.log(`${values['dry-run'] ? 'Dry run' : 'Publishing'} ${artifact.name}@${artifact.version} (${artifact.integrity})`);
          console.log(run(['npm', 'publish', artifact.tarball, '--access', 'public', '--tag', values.tag!, '--ignore-scripts', ...(values['dry-run'] ? ['--dry-run'] : [])]));
        },
      });
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}
