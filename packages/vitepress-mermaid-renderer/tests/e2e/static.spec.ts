import { expect, test } from '@playwright/test';

test('static SVGs emit ready results, follow theme changes, and omit controls', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).renderResults = [];
    document.addEventListener('vitepress-mermaid:render-complete', (event) => {
      const { id, success } = (event as CustomEvent).detail;
      (window as any).renderResults.push({
        id,
        success,
        svg: !!(event.target as Element).querySelector('svg'),
        wrapper: (event.target as Element).matches('.mermaid-wrapper'),
      });
    });
  });
  await page.goto('/examples/basic?static');
  const diagram = page.locator('.mermaid-container').first();
  const svg = diagram.locator('.mermaid > svg');
  await expect(svg).toBeVisible();
  await expect(diagram).toHaveClass(/static-mermaid-container/);
  await expect(diagram.locator('[data-mermaid-control]')).toHaveCount(0);
  await expect(diagram.locator('.diagram-wrapper')).not.toHaveAttribute('tabindex');
  await expect.poll(() => page.evaluate(() => (window as any).renderResults.length)).toBeGreaterThan(0);
  const first = await page.evaluate(() => (window as any).renderResults[0]);
  expect(first).toEqual({ id: expect.any(String), success: true, svg: true, wrapper: true });
  const beforeTheme = await svg.innerHTML();
  await page.getByRole('switch', { name: /switch to (dark|light) theme/i }).click();
  await expect.poll(() => svg.innerHTML()).not.toEqual(beforeTheme);
  await expect.poll(() => page.evaluate((id) => (window as any).renderResults.filter((result: any) => result.id === id && result.success).length, first.id)).toBeGreaterThan(1);
  await expect(diagram.locator('[data-mermaid-control]')).toHaveCount(0);
});

test('static render failures bubble with a string id and success false', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).failedResults = [];
    document.addEventListener('vitepress-mermaid:render-complete', (event) => {
      const { id, success } = (event as CustomEvent).detail;
      if (!success) (window as any).failedResults.push({ id, success });
    });
  });
  await page.goto('/examples/error?static');
  await expect.poll(() => page.evaluate(() => (window as any).failedResults.length)).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as any).failedResults[0])).toEqual({ id: expect.any(String), success: false });
  await expect(page.locator('[data-mermaid-control]')).toHaveCount(0);
});
