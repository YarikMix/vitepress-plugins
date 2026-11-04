# Подключение личных VitePress-пакетов в docs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Переключить docs на три опубликованных пакета `@wely6743` и подтвердить прежнее поведение реальным Pages-превью.

**Architecture:** Пакетные module-graph, renderer и viewer заменяют старые imports и локальные копии. `Diagram.vue` остаётся адаптером name→URL/размер, loader/якоря/тема — кодом сайта. Одна целостная задача включает код, скрытые CLI-caller, тесты и превью.

**Tech Stack:** существующие Bun/VitePress2.0.0-alpha.21/Vue/Mermaid11, npm registry пакеты0.1.0, существующий Puppeteer readiness harness.

**Spec:** `docs/superpowers/specs/2026-11-04-vitepress-plugins-monorepo-design.md` в `YarikMix/vitepress-plugins`; predecessor plan `2026-11-04-vitepress-plugins-packages.md`.

## Global Constraints

- Начинать consumer migration после настоящей registry-публикации всех3пакетов0.1.0; до этого можно только read-only готовить список caller и исходный baseline.
- Использовать точные обычные npm-версии; без Git SHA, tarball/workspace override, npm alias на старые имена и второго параллельного legacy-подключения.
- Новые имена — `@wely6743/vitepress-module-graph`, `@wely6743/vitepress-mermaid-renderer`, `@wely6743/vitepress-diagram-viewer`.
- Работать в отдельном worktree docs `.claude/worktrees/vitepress-plugins`, ветка `chore/vitepress-plugins`, от актуального origin/main. Не трогать sibling worktrees/планы и не откатывать свежий Figma/loader/heading-links код.
- Сохранить Markdown, IDs/якоря, frontmatter, данные модулей, пути и рендер Eraser, loader и поведение темы. CSS первой строки заголовка DiagramSection уже является частью viewer-пакета.
- Root README/активные инструкции обновляются; старые спеки/исторические SHA не переписываются. При правке `.agents/skills/` запускать `bun run skills:sync` для копии `.claude/skills/`.
- Результат — PR в main и проверенное Pages-превью; слияние этого PR пользователь не поручал.

## Review Focus

1. CLI-хуки продолжают искать старый scoped path и молча пропускают неверные модули: проверить настоящий invalid-frontmatter exit2 в Codex и Claude hooks при наличии только нового пакета.
2. Вынесенные Vue-компоненты работают в dev, но падают при SSR либо отсутствует CSS в preview base: проверить production build/root/nested и реальный опубликованный bundle.
3. Удаление локальных копий ломает loader readiness, graph/sidebar либо Markdown получает двойную MermaidFrame: проверить взаимодействие страницы, события и штатную навигацию.
4. В новом renderer исправления после a9e25d взаимодействуют с Mermaid11 иначе: реальный render/error/theme/lifecycle на потребителе, а не только package mocks.
5. Pages dispatch/зелёный main workflow не доказывает наличие нужного branch SHA: проверить строку списка превью, exact head и живые graph/Mermaid/Eraser.

## Карта файлов

Modify: `package.json`, `bun.lock`, `site/.vitepress/{config.mts,theme/index.ts,theme/Diagram.vue,theme/custom.css}`, `site/modules/modules.data.ts`, `scripts/{codex-modules-hook.ts,codex-modules-hook.test.ts,modules-data.test.ts,offline-pages.test.ts,backend-release-pages.test.ts}`, `.claude/settings.json`, `.agents/skills/{docs-site,docs-modules}/SKILL.md`, их generated `.claude` copies, `README.md`.

Remove после пакетной замены: `site/.vitepress/theme/{DiagramFrame.vue,MermaidFrame.vue,DiagramSection.vue,diagram-scale.ts,mermaid-size.ts}`, `site/.vitepress/mermaid-fence.ts`, их перенесённые unit-тесты `scripts/{diagram-scale,mermaid-size,mermaid-fence}.test.ts`.

Keep: `diagrams.data.ts`, PNG parser/names/renderer/scripts, ArticleLoading/article-loading.ts, HeadingLinks если он уже в main, Figma, остальные theme styles и page tests. `scripts/check-readability.ts` меняется только если существующая проверка была привязана к удаляемому локальному import; браузерные assertions не ослаблять.

### Task 1: Полностью переключить потребителя и проверить превью

**Interfaces:** Consumes registry0.1.0 всех3пакетов; viewer exports и props/slots из Task3 predecessor plan. Produces working docs PR. В частности `Diagram.vue` вызывает `EraserFrame({title:name,src:withBase('/'+name+'.html'),size:rendered?{width,height}:null,pngSrc:withBase('/'+name+'.png')})` и передаёт существующее сообщение missing-status через slot; `module-graph` bin сохраняется.

- [ ] Проверить исходный origin/main, AGENTS/активный docs-site skill и доступные browser sections; записать baseline SHA и состояние исходного дерева. Проверить registry metadata/installability всех3точных версий. Создать изолированный worktree и скопировать в него этот consumer plan по пути `docs/superpowers/plans/2026-11-04-vitepress-plugins-docs.md` для локального ledger; утверждённая общая спека остаётся в личном репозитории, её точный commit указывается в ledger. Read-only сравнить пакетный viewer с текущими локальными изменениями, чтобы не вернуть старое поведение при свежем upstream.
  Run: `bun run typecheck && bun run modules:check && bun run test`. Expected: исходный baseline GREEN; ограничения dist-dependent тестов фиксируются явно. Список caller получить `rg --hidden` по старому scope, Git URL и локальным helper imports, исключив node_modules/.git/worktrees/.superpowers и исторические specs.
- [ ] Добавить регрессию в `scripts/codex-modules-hook.test.ts`: temp fixture с новым настоящим CLI и без старого scoped path, invalid frontmatter -> exit2/diagnostic example.md; valid ->0; из подкаталога с пробелами и worktree `.git`-файлом проверяется именно fixture. Для `.claude/settings.json` аналогично запустить настроенную команду с реальным tool_input.file_path и `CLAUDE_PROJECT_DIR`. Не имитировать успешную module-graph проверку. Подготовить fixture пакета из уже выпущенного registry0.1.0.
- [ ] Run: `bun test scripts/codex-modules-hook.test.ts`. Expected RED: старый путь к CLI не существует в новом fixture, hook ошибочно возвращает0 вместо2. Зафиксировать этот сбой до правки production hook.
- [ ] Установить `bun add --dev --exact @wely6743/vitepress-module-graph@0.1.0 @wely6743/vitepress-mermaid-renderer@0.1.0 @wely6743/vitepress-diagram-viewer@0.1.0`; удалить старые graph/renderer зависимости обычным package manager и обновить lockfile. Переключить все активные импорты, CSS, SSR noExternal, CLI/hook path, data loaders и tests. Не оставлять старые зависимости для прохождения baseline-тестов.
- [ ] Перевести theme registration на пакетные MermaidFrame/DiagramSection, `mermaidFence` — на `/node`; сохранить static:true и текущие настройки Mermaid. `Diagram.vue` сделать тонким EraserFrame-adapter по Interfaces. Удалить перечисленные локальные копии и перенесённые unit-тесты; CSS viewer импортировать из пакета, вычесть только перенесённые правила. HeadingLinks/toast, loader и Figma стили сохранить.
- [ ] Run: `bun test scripts/codex-modules-hook.test.ts && bun run typecheck && bun run modules:check && bun run test`. Expected GREEN: новый hook действительно валидирует данные, graph/page tests прежние. Счётчик тестов может стать меньше после переноса unit-тестов; это объясняется их наличием и GREEN в новом репозитории, а не считается покрытием старым числом502.
- [ ] Обновить README и активные `.agents/skills/{docs-site,docs-modules}/SKILL.md`: source пакетов, npm-имена и граница ответственности viewer/site. Run: `bun run skills:sync && bun run test`. Expected GREEN: копии навыков синхронны; код не зависит от старого namespace. Исторические источники/коммиты остаются корректными ссылками.
- [ ] Run: `DIAGRAMS_NATIVE=1 CHROMIUM_PATH=/usr/bin/google-chrome bun run build`. Expected GREEN полного build/site check с реальным Eraser HTML/PNG. Затем `CHROMIUM_PATH=/usr/bin/google-chrome bun scripts/check-readability.ts mermaid zoom scroll loading hierarchy pages`. Expected GREEN: реальные Mermaid11/theme/error/lifecycle и viewer Eraser, graph hierarchy/sidebar и schema-pages, loader/якоря; ошибок браузера нет. Если main уже содержит section `anchors`, добавить `anchors` в этот прогон; если нет, не втаскивать незапрошенный старый PR ради проверки.
- [ ] Сохранить root-результаты. Run: `SITE_BASE=/branches/vitepress-plugins/ bun run site:vitepress` и matching `SITE_BASE=/branches/vitepress-plugins/ CHROMIUM_PATH=/usr/bin/google-chrome bun scripts/check-readability.ts mermaid zoom scroll hierarchy pages` (и anchors, если он уже есть). Expected GREEN правильных URL/base и installed package CSS; неизменённые Eraser outputs повторно не рендерить. Не добавлять полный несвязанный Figma matrix.
- [ ] Run: `git diff --check`, затем commit `chore(vitepress): подключить личные npm-плагины`. Whole-task gate: `bun run test && bun run modules:check`. Зафиксировать точные npm-версии и registry integrity в ledger, оригинальный RED→GREEN и browser/build результаты.

## Ревью, PR и публикация превью

- [ ] Завершить выбранный пользователем review process, исправить блокирующие замечания, проверить свежий main/конфликты и сохранить соседние изменения. Не делать второй перенос пакетов параллельно уже опубликованному predecessor.
- [ ] Открыть PR в `Cringe-Driven-Development-Team/docs/main`, русский заголовок и разделы «Что», «Решения», «Проверка»; ссылка на `https://docs.cellestial.ru/branches/chore-vitepress-plugins/`. Проверить exact head и обязательный CI; PR не сливать.
- [ ] Дождаться настоящего Pages main build/deploy, не только branch dispatch. Список `/branches/` должен содержать `<li>` с `chore/vitepress-plugins`, рабочей ссылкой и exact head SHA7. При несовпадении не объявлять preview готовым.
- [ ] На HTTPS-превью пройти module graph с данными/фильтром/sidebar, Mermaid и Eraser: natural start, Ctrl-wheel/page wheel, min/full-fit/fullscreen, correct src при nested base, SPA/якорь. Если HeadingLinks присутствует — реальный clipboard на390/2560, сохранив query/base. Сохранить ошибки/скриншоты; отсутствие ошибок браузера и работа схем обязательны.
- [ ] Передать PR, preview, три npm-версии/релизы, результаты и оставшиеся ограничения. Архивировать только workspace этого плана, оставить worktree для PR. Конечный результат пакетов не зависит от слияния docs PR.

Самопроверка: package release — отдельный независимо полезный predecessor; все consumer caller и5 Review Focus покрыты этой задачей/интеграцией. Новые API/версии совпадают с первым планом и утверждённой спекой. Реализация не начата.
