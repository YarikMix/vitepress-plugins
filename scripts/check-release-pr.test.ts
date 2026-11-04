import { expect, test } from 'bun:test';
import { requestReleaseCheck } from './check-release-pr';

test('dispatches the current API head ref and SHA', async () => {
  const calls: [string, string][] = [];
  const sha = 'a'.repeat(40);
  await requestReleaseCheck(17, {
    readHead: async number => { expect(number).toBe(17); return { ref: 'release-please--branches--main', sha }; },
    dispatch: async (ref, expectedSha) => { calls.push([ref, expectedSha]); },
  });
  expect(calls).toEqual([['release-please--branches--main', sha]]);
});
test('does not dispatch when the API cannot read the head', async () => {
  let dispatched = false;
  await expect(requestReleaseCheck(17, {
    readHead: async () => { throw new Error('API denied'); },
    dispatch: async () => { dispatched = true; },
  })).rejects.toThrow('API denied');
  expect(dispatched).toBe(false);
});
