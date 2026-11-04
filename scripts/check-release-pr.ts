export async function requestReleaseCheck(number: number, io: {
  readHead: (number: number) => Promise<{ ref: string; sha: string }>;
  dispatch: (ref: string, expectedSha: string) => Promise<void>;
}): Promise<void> {
  const { ref, sha } = await io.readHead(number);
  await io.dispatch(ref, sha);
}

if (import.meta.main) {
  try {
    function gh(args: string[]): string {
      const result = Bun.spawnSync(['gh', ...args], { stdout: 'pipe', stderr: 'inherit' });
      if (result.exitCode !== 0) throw new Error(`gh ${args[0]} failed (${result.exitCode})`);
      return result.stdout.toString();
    }
    const prs: unknown = JSON.parse(process.env.RELEASE_PRS ?? '[]');
    if (!Array.isArray(prs) || !prs.every(pr => pr && Number.isSafeInteger(pr.number) && pr.number > 0)) throw new Error('RELEASE_PRS must contain PR numbers');
    const repo = process.env.GITHUB_REPOSITORY;
    if (!repo) throw new Error('GITHUB_REPOSITORY is required');
    for (const pr of prs) await requestReleaseCheck(pr.number, {
      readHead: async number => {
        const { head } = JSON.parse(gh(['api', `repos/${repo}/pulls/${number}`]));
        if (typeof head?.ref !== 'string' || !/^[a-f0-9]{40}$/.test(head?.sha ?? '')) throw new Error(`Invalid PR ${number} head`);
        return head;
      },
      dispatch: async (ref, expectedSha) => {
        gh(['workflow', 'run', 'ci.yml', '--repo', repo, '--ref', ref, '--field', `expected_sha=${expectedSha}`]);
        console.log(`Requested CI for PR ${pr.number}: ${ref}@${expectedSha}`);
      },
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
