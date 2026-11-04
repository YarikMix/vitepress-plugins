import { describe, expect, test } from 'bun:test';
import { parseReleasedPaths, planPublications, publishArtifacts, readRegistryVersion, type ReleaseArtifact } from './publish';

const allowed = ['packages/a', 'packages/b'] as const;
const a: ReleaseArtifact = { path: allowed[0]!, name: '@scope/a', version: '0.1.0', tarball: '/tmp/a.tgz', integrity: 'sha512-a' };
const b: ReleaseArtifact = { path: allowed[1]!, name: '@scope/b', version: '0.2.0', tarball: '/tmp/b.tgz', integrity: 'sha512-b' };

describe('release paths', () => {
  test('accepts only configured paths', () => {
    expect(parseReleasedPaths([allowed[1]!], allowed)).toEqual([allowed[1]]);
    expect(() => parseReleasedPaths(['packages/unknown'], allowed)).toThrow('Unknown release path');
  });
  test.each([null, {}, 'packages/a', [1], ['packages/a', null]])('rejects non-string arrays: %j', value => {
    expect(() => parseReleasedPaths(value, allowed)).toThrow('JSON array');
  });
  test('rejects duplicates', () => expect(() => parseReleasedPaths([allowed[0], allowed[0]], allowed)).toThrow('Duplicate'));
});

describe('publication preflight', () => {
  test('a true 404 needs one publication', async () => {
    expect(await readRegistryVersion(a, async () => new Response('', { status: 404 }))).toBeNull();
    expect(planPublications([a], { '@scope/a@0.1.0': null })).toEqual([a]);
  });
  test('matching integrity skips an already published version', () => {
    expect(planPublications([a], { '@scope/a@0.1.0': { integrity: a.integrity } })).toEqual([]);
  });
  test('partial release publishes only absent versions', async () => {
    const published: string[] = [];
    await publishArtifacts([a, b], {
      readRegistry: async artifact => artifact === a ? { integrity: a.integrity } : null,
      publish: async artifact => { published.push(artifact.name); },
    });
    expect(published).toEqual([b.name]);
  });
  test('unverified keys and integrity mismatches fail closed', () => {
    expect(() => planPublications([a], {})).toThrow('Unverified');
    expect(() => planPublications([a], { '@scope/a@0.1.0': { integrity: 'sha512-other' } })).toThrow('integrity');
  });
  test.each([403, 500, 503])('registry HTTP %i aborts before publishing even an earlier missing package', async status => {
    const published: ReleaseArtifact[] = [];
    await expect(publishArtifacts([a, b], {
      readRegistry: artifact => readRegistryVersion(artifact, async () => new Response('', { status: artifact === a ? 404 : status })),
      publish: async artifact => { published.push(artifact); },
    })).rejects.toThrow(`HTTP ${status}`);
    expect(published).toEqual([]);
  });
  test('a later integrity mismatch aborts before the first publish', async () => {
    const published: ReleaseArtifact[] = [];
    await expect(publishArtifacts([a, b], {
      readRegistry: async artifact => artifact === a ? null : { integrity: 'sha512-other' },
      publish: async artifact => { published.push(artifact); },
    })).rejects.toThrow('integrity');
    expect(published).toEqual([]);
  });
  test('a malformed registry success never means absent', async () => {
    await expect(readRegistryVersion(a, async () => Response.json({ dist: {} }))).rejects.toThrow('integrity');
  });
});
