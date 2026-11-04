import assert from 'node:assert/strict';
import { resolve, extname } from 'node:path';
import { spawn } from 'node:child_process';
import { chromium, expect, type Locator } from '@playwright/test';

const consumerIndex = process.argv.indexOf('--consumer');
const root = consumerIndex === -1 ? resolve(import.meta.dir, '..') : resolve(process.argv[consumerIndex + 1]!);
const smoke = process.argv.includes('--smoke');
const scale = (canvas: Locator) => canvas.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a);
const position = (canvas: Locator) => canvas.evaluate(el => getComputedStyle(el).transform);
const closeTo = async (canvas: Locator, expected: number) => expect.poll(() => scale(canvas)).toBeCloseTo(expected, 2);
async function build(base: string) {
  const process = Bun.spawn(['node', resolve(root, 'node_modules/vitepress/bin/vitepress.js'), 'build', 'tests/site'], { cwd: root, env: { ...Bun.env, SITE_BASE: base }, stdout: 'inherit', stderr: 'inherit' });
  assert.equal(await process.exited, 0, `fixture build for ${base}`);
}
async function dev(base: string): Promise<{ url: URL; stop: (_close?: boolean) => Promise<void> }> {
  const child = spawn('node', [resolve(root, 'node_modules/vitepress/bin/vitepress.js'), 'dev', 'tests/site', '--host', '127.0.0.1', '--port', '0'], { cwd: root, env: { ...process.env, SITE_BASE: base }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const url = await new Promise<URL>((accept, reject) => {
      let output = '';
      const timer = setTimeout(() => reject(new Error(`Fixture dev timeout: ${output}`)), 60_000);
      const read = (chunk: Buffer) => {
        output += chunk.toString();
        const address = /http:\/\/127\.0\.0\.1:\d+/.exec(output);
        if (address) { clearTimeout(timer); accept(new URL(address[0])); }
      };
      child.stdout.on('data', read); child.stderr.on('data', read);
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`Fixture dev exited ${code}: ${output}`)); });
    });
    return { url, stop: (_close?: boolean) => new Promise<void>(done => {
      const force = setTimeout(() => child.kill('SIGKILL'), 5000);
      child.once('exit', () => { clearTimeout(force); done(); });
      child.kill();
    }) };
  } catch (error) { child.kill(); throw error; }
}
const browser = await chromium.launch({ executablePath: Bun.env.CHROMIUM_PATH, headless: true });
try {
  for (const mode of smoke ? ['dev', 'production'] : ['production']) for (const base of ['/', '/branches/plugins-check/']) {
    if (mode === 'production') {
      await build(base);
      const check = Bun.spawn(['bun', 'tests/site/graph-check.ts'], { cwd: root, env: { ...process.env, SITE_BASE: base }, stdout: 'inherit', stderr: 'inherit' });
      assert.equal(await check.exited, 0, 'graph SSR output');
    }
    const dist = resolve(root, 'tests/site/.vitepress/dist');
    const server = mode === 'dev' ? await dev(base) : Bun.serve({ hostname: '127.0.0.1', port: 0, async fetch(request) {
      const url = new URL(request.url);
      if (!url.pathname.startsWith(base)) return new Response('Outside fixture base', { status: 404 });
      const relative = url.pathname.slice(base.length);
      const path = !relative || relative.endsWith('/') ? `${relative}index.html` : relative;
      let file = Bun.file(resolve(dist, path));
      if (!(await file.exists()) && !extname(path)) file = Bun.file(resolve(dist, `${path}.html`));
      return await file.exists() ? new Response(file) : new Response('Missing fixture', { status: 404 });
    } });
    try {
      for (const width of smoke ? [1280] : [390, 2560]) for (const dark of smoke ? [false] : [false, true]) {
        const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: dark ? 'dark' : 'light' });
        const page = await context.newPage();
        const errors: string[] = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.addInitScript(() => {
          (window as any).results = [];
          document.addEventListener('vitepress-mermaid:render-complete', e => (window as any).results.push((e as CustomEvent).detail));
        });
        const home = `${server.url.origin}${base}`;
        const toggleTheme = async () => {
          if (width === 390) await page.getByRole('button', { name: 'Menu', exact: true }).click();
          await page.locator('.VPSwitchAppearance:visible').click();
          if (width === 390) await page.getByRole('button', { name: 'Menu', exact: true }).click();
        };
        await page.goto(`${home}modules/2/`);
        await expect(page.getByRole('heading', { name: 'Модуль №2', exact: true })).toHaveCount(1);
        await expect(page.locator('.graph-canvas canvas')).toHaveCount(1);
        await expect(page.locator('.graph-canvas canvas')).toBeVisible();
        await page.goto(home);
        const mermaid = page.locator('[data-diagram-kind="mermaid"]');
        const canvas = mermaid.locator('.diagram__canvas');
        await expect(mermaid.locator('svg')).toHaveCount(1);
        await expect.poll(() => scale(canvas)).toBeGreaterThan(0);
        await expect.poll(() => page.evaluate(() => (window as any).results.length)).toBe(1);
        assert.equal(await page.evaluate(() => (window as any).results[0].success), true);
        await expect(mermaid.locator('.diagram__toolbar')).toHaveCount(1);
        await expect(mermaid.locator('.diagram__canvas button')).toHaveCount(0);
        await expect(mermaid.locator('.diagram__canvas--pending')).toHaveCount(0);
        await expect(page.locator('html')).toHaveClass(dark ? /dark/ : /^(?!.*dark)/);
        if (smoke) {
          const eraser = page.locator('[data-diagram-kind="eraser"]').first();
          await eraser.scrollIntoViewIfNeeded();
          await expect(eraser.frameLocator('iframe').locator('svg')).toHaveAttribute('viewBox', '0 0 1200 1800');
          await expect(eraser.locator('iframe')).toHaveAttribute('src', `${base}eraser.html`);
          assert.deepEqual(errors, []);
          console.log(`archive browser OK: mode=${mode} base=${base} graph/Mermaid/Eraser`);
          await context.close();
          continue;
        }
        const frame = mermaid.locator('.diagram__frame');
        const dimensions = await mermaid.evaluate(el => {
          const frame = el.querySelector('.diagram__frame') as HTMLElement;
          const canvas = el.querySelector('.diagram__canvas') as HTMLElement;
          const svg = el.querySelector('svg')!;
          const box = svg.viewBox.baseVal;
          return { frameWidth: frame.clientWidth, frameHeight: frame.clientHeight, width: box.width, height: box.height, canvasWidth: canvas.style.width, canvasHeight: canvas.style.height };
        });
        assert.ok(Math.abs(parseFloat(dimensions.canvasWidth) - dimensions.width) < .01);
        assert.ok(Math.abs(parseFloat(dimensions.canvasHeight) - dimensions.height) < .01);
        const readable = Math.min(1, dimensions.frameWidth / dimensions.width);
        await closeTo(canvas, readable);
        const fit = Math.min(readable, dimensions.frameHeight / dimensions.height);
        await mermaid.getByRole('button', { name: 'Вписать', exact: true }).click();
        await closeTo(canvas, fit);
        for (let i = 0; i < 20; i++) await mermaid.getByRole('button', { name: 'Уменьшить', exact: true }).click();
        await closeTo(canvas, Math.min(.1, fit));
        await mermaid.getByRole('button', { name: 'Увеличить', exact: true }).click();
        await closeTo(canvas, Math.min(.1, fit) * 1.25);
        const manual = await scale(canvas);
        await page.setViewportSize({ width, height: 800 });
        await page.waitForTimeout(100);
        await closeTo(canvas, manual);
        await page.setViewportSize({ width, height: 1000 });
        await frame.focus();
        const beforeArrow = await position(canvas);
        await page.keyboard.press('ArrowRight');
        await expect.poll(() => position(canvas)).not.toBe(beforeArrow);
        const rect = await frame.boundingBox();
        assert.ok(rect);
        await page.mouse.move(rect.x + 40, rect.y + 40);
        const beforeDrag = await position(canvas);
        await page.mouse.down(); await page.mouse.move(rect.x + 100, rect.y + 80, { steps: 8 }); await page.mouse.up();
        await expect.poll(() => position(canvas)).not.toBe(beforeDrag);
        await frame.scrollIntoViewIfNeeded();
        const scrollBefore = await page.evaluate(() => scrollY);
        await page.mouse.move(rect.x + 40, rect.y + 40);
        const beforeWheel = await scale(canvas);
        await page.mouse.wheel(0, 120);
        await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scrollBefore);
        await closeTo(canvas, beforeWheel);
        await frame.scrollIntoViewIfNeeded();
        const wheelRect = await frame.boundingBox(); assert.ok(wheelRect);
        await page.mouse.move(wheelRect.x + 30, wheelRect.y + 30);
        await page.keyboard.down('Control'); await page.mouse.wheel(0, -100); await page.keyboard.up('Control');
        await expect.poll(() => scale(canvas)).toBeGreaterThan(beforeWheel);
        // Exercise the native API, then its unavailable-API fallback; neither path mocks SVG or renderer events.
        const full = mermaid.getByRole('button', { name: 'На весь экран', exact: true });
        await full.focus(); await full.click();
        await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
        await page.keyboard.press('Escape');
        await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
        await expect(full).toBeFocused();
        await mermaid.evaluate(el => Object.defineProperty(el, 'requestFullscreen', { configurable: true, value: undefined }));
        await full.click();
        await expect(mermaid).toHaveClass(/diagram--overlay/);
        await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
        await page.keyboard.press('Escape');
        await expect(mermaid).not.toHaveClass(/diagram--overlay/);
        await expect(full).toBeFocused();
        const eraser = page.locator('[data-diagram-kind="eraser"]').first();
        await eraser.scrollIntoViewIfNeeded();
        const iframe = eraser.locator('iframe');
        await expect(iframe).toHaveCount(1);
        for (const [attr, value] of Object.entries({ src: `${base}eraser.html`, width: '1200', height: '1800', sandbox: '', loading: 'lazy' })) await expect(iframe).toHaveAttribute(attr, value);
        await expect(eraser.locator('.diagram__toolbar')).toHaveCount(1);
        await expect(eraser.locator('.diagram__frame')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
        await expect(eraser.getByRole('link', { name: 'HTML', exact: true })).toHaveAttribute('href', `${base}eraser.html`);
        await expect(eraser.getByRole('link', { name: 'PNG', exact: true })).toHaveAttribute('href', `${base}eraser.png`);
        const eraserFrame = eraser.locator('.diagram__frame');
        const eraserCanvas = eraser.locator('.diagram__canvas');
        await closeTo(eraserCanvas, Math.min(1, await eraserFrame.evaluate(el => el.clientWidth) / 1200));
        const eraserRect = await eraserFrame.boundingBox(); assert.ok(eraserRect);
        await page.mouse.move(eraserRect.x + 30, eraserRect.y + 30);
        const eraserBefore = await position(eraserCanvas);
        await page.mouse.down(); await page.mouse.move(eraserRect.x + 100, eraserRect.y + 70, { steps: 8 }); await page.mouse.up();
        await expect.poll(() => position(eraserCanvas)).not.toBe(eraserBefore);
        const eraserFit = Math.min(1, await eraserFrame.evaluate(el => el.clientWidth) / 1200, await eraserFrame.evaluate(el => el.clientHeight) / 1800);
        await eraser.getByRole('button', { name: 'Вписать', exact: true }).click();
        await closeTo(eraserCanvas, eraserFit);
        await expect(eraser.frameLocator('iframe').locator('svg')).toHaveAttribute('viewBox', '0 0 1200 1800');
        const missing = page.locator('[data-diagram-kind="eraser"]').nth(1);
        await expect(missing.getByRole('status')).toHaveText('Custom missing diagram status');
        await expect(missing.locator('iframe, button')).toHaveCount(0);
        await expect(missing.locator('.diagram__canvas')).not.toHaveAttribute('style', /transform/);
        await expect(missing.getByRole('link')).toHaveText('Custom footer');
        const huge = page.locator('.diagram').last();
        const hugeCanvas = huge.locator('.diagram__canvas');
        await huge.getByRole('button', { name: 'Вписать', exact: true }).click();
        const hugeFit = await scale(hugeCanvas); assert.ok(hugeFit < .1);
        await huge.getByRole('button', { name: 'Уменьшить', exact: true }).click();
        await closeTo(hugeCanvas, hugeFit);
        for (const box of await page.locator('.diagram__frame').evaluateAll(nodes => nodes.map(el => ({ x: getComputedStyle(el).overflowX, y: getComputedStyle(el).overflowY })))) assert.deepEqual(box, { x: 'hidden', y: 'hidden' });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await expect(page.locator('#lifecycle')).toHaveCount(1);
        const layout = await page.locator('.diagram-section__layout').evaluate(el => {
          const [text, diagram] = Array.from(el.children).map(child => child.getBoundingClientRect());
          return { stacked: diagram!.top >= text!.bottom, gap: diagram!.left - text!.right };
        });
        assert.equal(layout.stacked, width === 390);
        // Real theme rerender emits one fresh result and preserves the reader's scale.
        await page.evaluate(() => { scrollTo(0, 0); });
        const beforeTheme = await scale(canvas);
        await toggleTheme();
        await expect.poll(() => page.evaluate(() => (window as any).results.length)).toBe(2);
        await closeTo(canvas, beforeTheme);
        await expect(mermaid.locator('svg')).toHaveCount(1);
        // Navigate after a theme update: verify viewer removal, overflow cleanup and a fresh canvas on return.
        await toggleTheme();
        await page.getByRole('link', { name: 'Ordinary page', exact: true }).click();
        await expect(page.locator('h1')).toHaveText('Ordinary page');
        await expect(page.locator('.diagram, .diagram--overlay')).toHaveCount(0);
        await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
        await page.getByRole('link', { name: 'Back to diagrams', exact: true }).click();
        await expect.poll(() => scale(page.locator('[data-diagram-kind="mermaid"] .diagram__canvas'))).toBeGreaterThan(0);
        await expect(page.locator('[data-diagram-kind="mermaid"] svg')).toHaveCount(1);
        assert.ok(await page.evaluate(() => (window as any).results.every((result: any) => result.success)));
        assert.deepEqual(errors, []);
        console.log(`viewer browser OK: base=${base} width=${width} theme=${dark ? 'dark' : 'light'}`);
        await context.close();
      }
    } finally { await server.stop(true); }
  }
} finally { await browser.close(); }
