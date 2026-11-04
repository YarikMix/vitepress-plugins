# Личные VitePress-пакеты — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Выпустить три самостоятельных пакета `@wely6743` из нового `YarikMix/vitepress-plugins` с проверенной публикацией release-please/OIDC.

**Architecture:** Private Bun workspace объединяет module-graph из TP-Prepare, текущий личный форк Mermaid и выделенный из docs viewer. Пакеты не получают новых runtime-зависимостей друг на друга; их совместное использование проверяется установкой архивов вне workspace. Публикация идёт после ревью кода и CI; отдельный план переключает docs на эти выпуски.

**Tech Stack:** Bun, Node24/npm11.5.1+, Vue3.5, VitePress2.0.0-alpha.21, существующие tsdown/Vite/Vitest/Playwright, Panzoom, GitHub Actions/release-please manifest/npm OIDC.

**Spec:** `docs/superpowers/specs/2026-11-04-vitepress-plugins-monorepo-design.md` — утверждена пользователем, builder check: nothing important left.

## Global Constraints

- Новый публичный GitHub-репозиторий: `YarikMix/vitepress-plugins`; npm-аккаунт: `wely6743`.
- Пакеты: `@wely6743/vitepress-module-graph`, `@wely6743/vitepress-mermaid-renderer`, `@wely6743/vitepress-diagram-viewer`.
- Bootstrap всех имён: `0.0.0`, dist-tag `bootstrap`; первый рабочий выпуск: `0.1.0`, dist-tag `latest`.
- Версии независимые; root private; не переносить example-пакеты, весь docs, node_modules/dist и всю историю исходных реп.
- Сохранить исходные лицензии/авторство, exports и существующие тесты. Не менять source-репы и их npm-пакеты.
- Viewer сохраняет DOM-классы/события/готовность холста, поведение зума, доступность и CSS DiagramSection; loader, якоря, Nolebase и поиск Eraser-файлов остаются в docs.
- Не создавать новые runtime-связи между тремя пакетами, дополнительный core, сборочный framework или поддержку старых API.
- Изоляция реализации: `.claude/worktrees/initial-plugins`, ветка `feat/initial-plugins`. До выбора пользователем способа выполнения создавать только документы.
- В новом личном репозитории выпуск включает проверенный первичный PR/main и release PR, необходимые для согласованной npm-публикации. В docs результатом будет отдельный PR/превью; его слияние в этот план не входит.

## Review Focus

1. Архив работает в workspace, но теряет Vue/CSS/types в отдельном потребителе: проверить реальные tarballs и SSR/dev/build без symlink.
2. Текущий форк новее Git SHA в docs, использует Mermaid12 в разработке: проверить static/theme/lifecycle с Mermaid11 и сохранить тесты форка, не подменяя его старым a9e25d.
3. Извлечение viewer оставляет две панели, ломает готовность холста или resize/fullscreen: проверить реальные события, одну рамку и неизменённую навигацию/фокус.
4. Частичная публикация, registry403/5xx либо занятая версия: ошибку нельзя считать 404 и нельзя пропускать несовпадающий tarball; проверить планирование до первой записи в registry.
5. OIDC настроен, но не работает либо ботский release PR остаётся без CI: успешные настройки не равны выпуску; доказать реальные CI release PR и публикацию всех трёх0.1.0.

## Файлы и границы

- `packages/vitepress-module-graph/**`: исходный пакет, его fixtures и конфиги сборки, с новым npm-именем.
- `packages/vitepress-mermaid-renderer/**`: исходники/тесты/сборка/стенд форка, с новым npm-именем.
- `packages/vitepress-diagram-viewer/src/{index.ts,node.ts,DiagramFrame.vue,MermaidFrame.vue,EraserFrame.vue,DiagramSection.vue,diagram-scale.ts,mermaid-size.ts,mermaid-fence.ts,style.css}`: компоненты/математика/Markdown fence; package.json, конфиг сборки, test/**.
- `scripts/{check-module-graph-package.ts,check-packages.ts,check-site.ts,publish.ts,publish.test.ts,check-release-pr.ts,check-release-pr.test.ts}`: архивы и внешняя fixture, браузерная интеграция, безопасный выбор выпускаемых архивов, запуск CI точного head release PR.
- `tests/site/**`: один совместный стенд: module-graph, Mermaid, HTML Eraser, отсутствующая схема, пары текста/схем.
- Root `package.json`, lockfile, `.gitignore`, `.github/workflows/{ci.yml,release.yml}`, release-please manifest/config, `README.md`, `ORIGINS.md`, `docs/{release-runbook.md,upstream.md}`.

### Task 1: Самостоятельный module-graph в новой репе

**Interfaces:** Consumes source `TP-Prepare/frontend-packages@29e07ca92d6ec463f71d7937609fccf55b5c3c1e/packages/vitepress-module-graph` (проверить свежесть). Produces package0.0.0 с прежними exports `., /node, /theme, /style.css`, CLI `module-graph`, скрипт `bun scripts/check-module-graph-package.ts [archive.tgz]`. Root-команды build/typecheck/test запускают все уже добавленные пакеты.

- [ ] Проверить личный GitHub-аккаунт, точное существование target repo, локальные файлы и свежесть трёх источников. Не перезаписывать чужую существующую репу/рабочие изменения. Инициализировать локальный репозиторий только с утверждённой спекой/планами и ignore; создать изолированный worktree. Публичный новый remote создавать только как `YarikMix/vitepress-plugins`, без копирования source org. Если GitHub-аутентификация недоступна, локальную проверяемую часть продолжать и запросить подключение нужного аккаунта.
  Expected: источники/SHA записаны, исходные деревья чисты либо их изменения сохранены; main содержит документы, feature-ветка изолирована.
- [ ] До копирования продукта перенести существующий `scripts/check-module-graph-package.ts` в новый root, заменить имя на `@wely6743/...`; сохранить assertions, особенно установку вне workspace, отсутствие symlink, model/node/CLI и построение VitePress из архива. Настроить только необходимый root tooling для запуска этой проверки.
- [ ] Run: `bun scripts/check-module-graph-package.ts`. Expected RED: отсутствует новый пакет/собранный архив; зафиксировать точную причину.
- [ ] Перенести только source package, его необходимые tests/site/scripts/конфиги и лицензию. Обновить npm-имя/самоссылки/metadata, выставить0.0.0 и public publishConfig; добавить в ORIGINS точный source SHA. Root tooling взять из source там, где нужен, исключив example-пакеты. Не переписывать модель, UI и CLI.
- [ ] Run: `bun install`, затем `bun run build && bun run typecheck && bun run test && bun scripts/check-module-graph-package.ts`. Expected GREEN: прежние тесты пакета и архивный model/node/theme/CSS/CLI/VitePress consumer проходят. Lockfile сохранён, нет зависимости на локальный source-клон.
- [ ] Commit: `feat(module-graph): перенести пакет в личный scope`. Whole-task gate: `bun run test && bun scripts/check-module-graph-package.ts`.

### Task 2: Текущий форк Mermaid как npm-пакет

**Interfaces:** Consumes current fork baseline `5b2556adf16dceae3918e458cc5a2e2965694f58`, root workspaces Task1. Produces renderer0.0.0 с `createMermaidRenderer(options?)`, `MermaidRenderer`, `MermaidRendererOptions`, `/css`, static-режимом и неизменённым событием `{id:string,success:boolean}` `vitepress-mermaid:render-complete`.

- [ ] В root `scripts/check-packages.ts` добавить проверку renderer-архива: install вне workspace; SSR import без window/document; `.d.ts` и CSS доступны из опубликованных exports. Для client/static использовать исходные e2e/fixture форка, меняя только импорт на новое имя. Не имитировать успешный рендер SVG.
- [ ] Run: `bun scripts/check-packages.ts renderer`. Expected RED: новый renderer отсутствует/не устанавливается; сохранить вывод до продуктового переноса.
- [ ] Перенести форк вместе с tests, scripts/bundle-types.mjs, Vite/Vitest/Playwright-конфигами, необходимой test-project fixture и лицензией. Исключить node_modules/dist/.git/чужие workflows; версии/импорты/metadata привести к новому имени0.0.0 и target repository.directory. Сохранить существующие встроенные controls и static-режим, не переписывать их в viewer. Добавить происхождение в ORIGINS.
- [ ] Run: `bun install && bun run build && bun run typecheck && bun run test && bun scripts/check-packages.ts renderer`. Затем сохранённая команда `bun run --filter '@wely6743/vitepress-mermaid-renderer' test:e2e` с доступным Chromium. Expected GREEN: настоящий SVG, static без controls, темы и ошибки/события, существующий тестовый набор форка. Новая combined fixture далее использует Mermaid11; прежнюю проверку Mermaid12 сохранить.
- [ ] В `docs/upstream.md` записать источник/базовый SHA и минимальный порядок сравнения upstream с монорепозиторием; новые изменения делаются здесь. Исходный fork не архивировать, не удалять и не менять его workflow.
- [ ] Commit: `feat(mermaid): перенести renderer с исправлениями форка`. Whole-task gate: `bun run test && bun scripts/check-packages.ts renderer`.

### Task 3: Общий viewer с отдельным EraserFrame

**Interfaces:** Consumes renderer event Task2 и проверенный viewer docs@4b74e9d7871f2a24ef27f50bfe7d2f617cc76ded (учесть свежие изменения). Produces root exports `DiagramFrame`, `MermaidFrame`, `EraserFrame`, `DiagramSection`, type `DiagramSize={width:number;height:number}`; `/node` exports `mermaidFence(md:MarkdownRenderer):void`; `/style.css`.

**Компоненты:** `DiagramFrame` — `{title:string,size:DiagramSize|null}` и default/status/footer slots; `MermaidFrame` — `{title?:string}`/default slot; `EraserFrame` — `{title:string,src:string,size:DiagramSize|null,pngSrc?:string}`/status/footer slots; `DiagramSection` — default/diagram slots.

- [ ] Сначала перенести настоящие `scripts/{diagram-scale,mermaid-size,mermaid-fence}.test.ts` docs в `packages/vitepress-diagram-viewer/test/`, меняя только source-пути. Сохранить проверки границ масштаба, huge/height-only resize, геометрии SVG, обычных fence и Vue-компиляции DiagramSection.
- [ ] Run: `bun test packages/vitepress-diagram-viewer/test`. Expected RED: новые реализации не найдены. Записать причину.
- [ ] Добавить минимальный `tests/site` и `scripts/check-site.ts` на уже используемом форком Playwright: настоящий Mermaid11 static + MermaidFrame, Eraser HTML iframe с белым SVG-холстом, size:null, DiagramSection, обычная страница. Фикстура HTML представляет вход viewer; реальный CLI Eraser проверяет следующий план в docs. Не переносить все схемы CDD.
- [ ] До переноса компонентов выполнить `CHROMIUM_PATH=/usr/bin/google-chrome bun run check:site`. Expected browser RED: новый viewer/EraserFrame ещё отсутствует, fixture не строится. Сам тест ожидает один iframe в одной рамке, src с nested base, натуральные width/height, sandbox/lazy, ссылки и пользовательский missing-status; после адаптера проверить GREEN теми же assertions.
- [ ] Перенести компоненты/функции, их CSS и fence без изменения поведения. Выделить из специфичного `Diagram.vue` только iframe/shield/footer в `EraserFrame`; `size:null` не запускает Panzoom, показывает status slot. В пакете нет импорта dist/PNG/name-list, Bun API или загрузчика docs. Renderer подключается потребителем; viewer не устанавливает Mermaid для Eraser. Vue/VitePress — peers, Panzoom — runtime; source Vue собирается тем же проверяемым способом, что module-graph, без bundling второй Vue.
- [ ] Run: `bun run build && bun run typecheck && bun run test && CHROMIUM_PATH=/usr/bin/google-chrome bun run check:site`. Expected GREEN для обеих тем и390/2560px: одна рамка, одно событие результата, читаемый старт, ordinary wheel страницы/Ctrl-zoom, min/fit по обеим сторонам, height-only resize, drag/стрелки, fullscreen/overlay/Escape и восстановление фокуса; отсутствуют внутренние scrollbars, повторная панель и stale callbacks после SPA. Для root и `SITE_BASE=/branches/plugins-check/` использовать matching fixture builds.
- [ ] Commit: `feat(viewer): выделить общую рамку Mermaid и Eraser`. Whole-task gate: `bun run test && bun run check:site` (с configured Chromium).

### Task 4: Архивы, CI и проверяемый выпуск

**Interfaces:** Consumes packages Tasks1–3 с version0.0.0. Produces `bun run check:packages` (чистый tarball consumer всех трёх), `bun run check:site`, CI, release.yml, release-please manifest и release runbook.

**Publish interface (`scripts/publish.ts`):** `parseReleasedPaths(value:unknown,allowedPaths:readonly string[]):string[]` валидирует уже JSON-разобранный RELEASED_PATHS: только строки из config, дубликаты запрещены. `ReleaseArtifact={path:string;name:string;version:string;tarball:string;integrity:string}`; `planPublications(artifacts:readonly ReleaseArtifact[], registry:Readonly<Record<string,{integrity:string}|null>>):ReleaseArtifact[]`. Registry key — `${name}@${version}`; null означает настоящий404. Неизвестный/непроверенный key и несовпадающая integrity — ошибка; совпавшая опубликованная версия не публикуется повторно. Локальная integrity вычисляется по самим проверенным tarball-байтам.

**Release CI interface (`scripts/check-release-pr.ts`):** `requestReleaseCheck(number:number,io:{readHead:(number:number)=>Promise<{ref:string;sha:string}>;dispatch:(ref:string,expectedSha:string)=>Promise<void>}):Promise<void>` получает актуальный head через GitHub и вызывает dispatch того же `ci.yml`. CLI читает `prs` JSON output release-please и использует штатный gh/GITHUB_TOKEN; io — только внешняя API-граница для теста.

- [ ] Написать `scripts/publish.test.ts`: unknown release path, нестроковые RELEASED_PATHS, дубликаты, registry403/5xx/непроверенная версия и mismatch integrity вызывают ошибку до первого publish; настоящий404 даёт одну публикацию, совпадающая integrity —0, смешанный частичный выпуск — только отсутствующие. Подменять только внешние registry/publish границы, не живой npm. Run: `bun test scripts/publish.test.ts`. Expected RED: publish helper ещё не реализован.
- [ ] Реализовать helper/runner, переиспользуя в необходимом объёме source `scripts/publish.ts`: входные пути только из release config; сначала собрать, упаковать `npm pack --json`, проверить весь выбранный набор и registry, затем публиковать точные проверенные tarballs. Expected GREEN: `bun test scripts/publish.test.ts`; повторные запуски безопасны относительно уже выпущенных версий.
- [ ] Завершить `check-packages.ts`: установить три tarballs в tmp вне репы, проверить отсутствие workspace symlink/`workspace:*`/Git-зависимости на source, exports/types/CSS и CLI. Скопировать только source fixture `tests/site`, собрать и проверить dev/production с установленными архивами для root/nested base. Run: `bun run check:packages`. Expected GREEN: module model/CLI/graph, Mermaid SVG и Eraser viewer работают вместе из архивов; SSR не обращается к window/document. В packages sources не остаётся обязательных путей наружу монорепы.
- [ ] Подключить `.github/workflows/ci.yml`: frozen install, build/typecheck/test, архивная проверка и browser fixture; Chromium — существующий Playwright. Добавить `release.yml` с release-please manifest, components/tag prefixes трёх пакетов, версии0.0.0/initial0.1.0; отдельный publish job от outputs paths_released, id-token:write, public npm. Workflow не публикует в PR и не включает неизменившиеся packages. Root README показывает установку, exports/регистрацию, css/fence и отделение сайта от пакетов.
- [ ] Написать `scripts/check-release-pr.test.ts`: при API head `{ref:'release-please--branches--main',sha:'a'.repeat(40)}` dispatch получает ровно этот ref/SHA; при отклонении readHead dispatch не вызывается. Run: `bun test scripts/check-release-pr.test.ts`. Expected RED отсутствующего requestReleaseCheck. Реализовать его и API-адаптер, проверить GREEN той же командой.
- [ ] Для release PR использовать штатный GITHUB_TOKEN и явный запуск того же CI через workflow_dispatch, без нового PAT/App: на `prs_created` взять номера из `prs` action output и вызвать check-release-pr.ts. CI принимает dispatch/input `expected_sha`, до checkout/тестов проверяет равенство run SHA этому input; при несовпадении падает, при обновлении PR запускается заново. Release-job имеет actions:write; CI не получает publish/write права. Реальная привязка head/CI подтверждается ниже. Основание: [GitHub допускает dispatch из GITHUB_TOKEN](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow#triggering-a-workflow-from-a-workflow), при этом обычный bot PR может требовать одобрения запуска workflows. Не добавлять второй набор CI-команд.
- [ ] Run: `bun install --frozen-lockfile && bun run build && bun run typecheck && bun run test && bun run check:packages && bun run check:site`. Expected GREEN. Проверить локальный pack/dry-run выбора одного пакета: не затрагивает остальные; это не считается настоящей публикацией. Record RED→GREEN и результаты в ledger.
- [ ] Commit: `ci(release): настроить независимые релизы и npm OIDC`. Whole-task gate: `bun run test && bun run check:packages && bun run check:site`.

## Финальное ревью и настоящая публикация

Это обязательная интеграция после выбранного пользователем процесса ревью, а не замена ревью ранним push/main:

- [ ] Пройти предусмотренные выбранным execution skill проверки и итоговое ревью; исправить блокирующие замечания. Не создавать второй параллельный процесс реализации. Зафиксировать источники и финальный head, проверить diff/лицензии и чистое дерево.
- [ ] Открыть первичный PR нового личного репозитория из `feat/initial-plugins` в main. Дождаться CI exact head; после review gate включить код в main для согласованного выпуска. Сохранить worktree до конца интеграции. Не сливать PR docs.
- [ ] Из main0.0.0 собрать все3tarballs; установить их вне workspace, прогнать проверку и сохранить sha512. `npm whoami` должен вернуть **wely6743**; при401 использовать штатный `npm login` с участием пользователя, не просить секреты в чате. Проверить имена/отсутствие0.0.0 в registry; публикация только подготовленных артефактов: `npm publish <tarball> --access public --tag bootstrap`. Expected: все3bootstrap0.0.0 доступны registry с совпадающей integrity.
- [ ] Настроить publisher всех3пакетов: owner `YarikMix`, repository `vitepress-plugins`, workflow `release.yml`, direct `npm publish` разрешён. По возможности использовать доступные инструменты текущей npm-сессии; если нужен владелец — попросить конкретные действия на готовых package settings. Завершить первый publish до истечения срока непроверенной настройки npm; при истечении пересоздать настройку, не добавлять обходной постоянный токен.
- [ ] Дождаться реального release PR со всеми3версиями0.1.0, проверить его CI и точный head/состав: dispatch run SHA должен совпасть с текущим head PR. Если запуск не создан/устарел — устранить причину и повторить проверку до слияния; просто зелёный workflow другого SHA не заменяет CI.
- [ ] Включить проверенный release PR в main и дождаться реального OIDC publish job. Expected: три0.1.0/`latest` на npm; metadata repository/directory и integrity соответствуют exact release commit; workflowзелёный. GitHub Releases без npm-версий — незавершённая работа. При частичном сбое применить runbook, не поднимать версии для маскировки сбоя.
- [ ] Установить **registry0.1.0**, а не tgz/workspace, в чистый consumer и прогнать тот же совместный стенд. Зафиксировать SHA/releases/npm-версии/CI и доказательство, что single-package release selection не выпускает остальных. Не делать фиктивный дополнительный релиз ради проверки отбора.
- [ ] Завершить/архивировать ledger выбранного skill; передать точные опубликованные версии следующему плану `2026-11-04-vitepress-plugins-docs.md`.

Самопроверка плана: каждый раздел спеки о пакетах/источниках/выпуске покрыт Tasks1–4 либо интеграцией; все5 Review Focus имеют проверки. Межзадачные interfaces выше; source-specific consumer остаётся в следующем плане. Реализация не начата.
