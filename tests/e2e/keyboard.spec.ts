import { expect, test } from '@playwright/test';

test.describe('keyboard use', () => {
  test('the first Tab stop is a skip link that moves focus to the main content', async ({
    page,
  }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
  });

  test('every interactive element shows a visible focus ring', async ({ page }) => {
    await page.goto('/');
    for (let press = 0; press < 12; press++) {
      await page.keyboard.press('Tab');
      const outline = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        // Cards draw the ring on a stretched ::after, so look there too.
        const own = getComputedStyle(el).outlineStyle;
        const after = getComputedStyle(el, '::after').outlineStyle;
        return own !== 'none' || after !== 'none';
      });
      expect(outline, `Tab stop ${press + 1} has no visible focus ring`).not.toBe(false);
    }
  });

  test('the theme toggle works from the keyboard and is remembered', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    const toggle = page.getByRole('button', { name: /switch to dark theme/i });
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('button', { name: /switch to light theme/i })).toBeVisible();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.goto('/projects/dalal-street/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('follows the system theme until the visitor chooses one', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('a dark-mode visitor never sees a light flash: the theme is set before the page body exists', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript(() => {
      const record = () => {
        const w = window as unknown as {
          __theme?: { theme: string | undefined; bodyExisted: boolean };
        };
        w.__theme ??= {
          theme: document.documentElement.dataset['theme'],
          bodyExisted: document.body !== null,
        };
      };
      // Observe the document, not <html>: <html> may not exist yet when this script runs.
      new MutationObserver(record).observe(document, {
        attributes: true,
        attributeFilter: ['data-theme'],
        subtree: true,
      });
    });
    await page.goto('/');
    const seen = await page.evaluate(
      () => (window as unknown as { __theme?: { theme: string; bodyExisted: boolean } }).__theme,
    );
    expect(seen).toEqual({ theme: 'dark', bodyExisted: false });
  });
});

test.describe('motion', () => {
  test('respects "reduce motion"', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const duration = await page.evaluate(
      () => getComputedStyle(document.querySelector('.button')!).transitionDuration,
    );
    expect(parseFloat(duration)).toBe(0);
  });
});

test.describe('works without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('all the content is still there', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Sumeet Sarode' })).toBeVisible();
    await expect(page.locator('#work article')).toHaveCount(3);
    await expect(page.getByRole('heading', { name: 'Experience' })).toBeVisible();
    await page.goto('/projects/stock-price-predictor/');
    await expect(page.locator('figure.diagram li.layer')).toHaveCount(5);
  });
});
