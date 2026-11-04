# Release runbook

Repository: `YarikMix/vitepress-plugins`. npm owner: `wely6743`. All commands below run at the repository root after task and whole-branch review. The documentation consumer lives in a different repository and is updated after the registry gate.

1. Enable repository **Settings → Actions → General → Allow GitHub Actions to create and approve pull requests**. Keep default workflow permissions read-only; `release.yml` grants its release job only the additional permissions it needs. Create/merge the initial implementation PR after the complete CI checks on its current head.
2. Authenticate locally with `npm login`, enable account 2FA, and verify `npm whoami` returns `wely6743`. Use Node 24 and npm 11.15+ for the `npm trust` CLI (OIDC publication itself requires npm 11.5.1+). Login/2FA may require the owner at the browser.
3. Reserve the three names with real, checked `0.0.0` archives and the `bootstrap` tag. This runner builds, packs, checks all selected archives, reads every registry version, then publishes their exact bytes. First run it with `--dry-run`; remove that flag for the actual bootstrap:

   ```sh
   RELEASED_PATHS='["packages/vitepress-module-graph","packages/vitepress-mermaid-renderer","packages/vitepress-diagram-viewer"]' bun scripts/publish.ts --tag bootstrap --dry-run
   ```

4. Configure each existing npm package to trust this exact repository and workflow. `--allow-publish` authorizes direct `npm publish`; no npm token, PAT or GitHub App is stored in Actions:

   ```sh
   npm trust github @wely6743/vitepress-module-graph --repo YarikMix/vitepress-plugins --file release.yml --allow-publish
   npm trust github @wely6743/vitepress-mermaid-renderer --repo YarikMix/vitepress-plugins --file release.yml --allow-publish
   npm trust github @wely6743/vitepress-diagram-viewer --repo YarikMix/vitepress-plugins --file release.yml --allow-publish
   npm trust list @wely6743/vitepress-module-graph
   npm trust list @wely6743/vitepress-mermaid-renderer
   npm trust list @wely6743/vitepress-diagram-viewer
   ```

5. A main push runs release-please with `GITHUB_TOKEN`. Its manifest starts at `0.0.0`, initial versions are `0.1.0`, tags are `vitepress-module-graph-v…`, `vitepress-mermaid-renderer-v…`, `vitepress-diagram-viewer-v…`. Review the release PR's package versions, changelogs and manifest. Each package changes independently; a single changed package must not release the others.
6. `prs_created` covers both creation and updates. The release job reads each PR's **current** API head, dispatches `ci.yml` on that branch with `expected_sha`, and CI checks its run SHA before checkout. Before merging, compare the latest PR head SHA against the successful dispatched run's `headSha` (`gh pr view NUMBER --json headRefOid` and `gh run view RUN_ID --json headSha,event,conclusion`). An old successful run is insufficient. Any changed head requires a new successful run; a race fails the SHA guard. This path uses the ordinary `GITHUB_TOKEN`; [GitHub permits workflow dispatch from that token](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow#triggering-a-workflow-from-a-workflow).
7. Merge the reviewed release PR only after the current head's CI passes. The separate publish job receives exactly `paths_released`; it builds and checks tarballs before public OIDC publication under `latest`. The PR workflow has no publication permissions. Confirm the main CI, release and publish jobs, then inspect all three `npm view PACKAGE@0.1.0 version dist.integrity dist.tarball` and `npm view PACKAGE dist-tags --json` results. Install those registry versions in a clean consumer before changing the documentation site.

For a local single-package selection check:

```sh
RELEASED_PATHS='["packages/vitepress-diagram-viewer"]' bun scripts/publish.ts --tag bootstrap --dry-run
```

Use `--tag latest` once its version is `0.1.0` or later. Dry-run performs real build, npm pack, isolated installation, browser checks and registry reads; it calls only npm's publication dry-run. It does not prove authentication or successful publication. The archive fixture also needs Chromium (`bunx --no-install playwright install chromium`, or `CHROMIUM_PATH`).

A retry skips only versions whose registry integrity exactly matches the locally checked tarball. A real 404 means absent. Permission errors, registry failures, invalid responses, unknown paths, duplicate paths or different bytes stop the entire preflight before any publication. A failure partway through publishing can still leave some versions released; rerun from the same commit with the same lockfile and toolchain. If integrity differs, inspect the artifacts rather than overwriting or changing versions automatically.

References: [npm trusted publishers](https://docs.npmjs.com/trusted-publishers/), [npm trust CLI and required permissions](https://docs.npmjs.com/cli/v11/commands/npm-trust/), [release-please action outputs](https://github.com/googleapis/release-please-action#outputs).
