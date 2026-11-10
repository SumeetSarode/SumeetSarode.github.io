import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { allPaths, themes } from './pages';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

for (const theme of themes) {
  for (const path of [...allPaths, '/404.html']) {
    test(`WCAG 2.2 AA, ${theme} theme: ${path}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      const summary = results.violations.map((violation) => ({
        rule: violation.id,
        help: violation.help,
        targets: violation.nodes.map((node) => node.target.join(' ')).slice(0, 3),
      }));
      expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
    });
  }
}
