import { expect, test } from '@playwright/test';
import { allPaths } from './pages';

const WIDTHS = [320, 375, 768, 1280, 1920, 2560];

for (const width of WIDTHS) {
  test.describe(`at ${width}px wide`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const path of [...allPaths, '/404.html']) {
      test(`${path} does not scroll sideways`, async ({ page }) => {
        await page.goto(path);
        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
      });
    }
  });
}

test.describe('touch targets (44 px tall) on a phone', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('header links and buttons are comfortable to tap', async ({ page }) => {
    await page.goto('/');
    const targets = page.locator('header a, header button, .actions a');
    for (const target of await targets.all()) {
      const box = await target.boundingBox();
      const label = (await target.innerText()) || (await target.getAttribute('aria-label'));
      expect(box!.height, `"${label}" is too short to tap`).toBeGreaterThanOrEqual(43.5);
    }
  });

  test('a whole project card is the tap target, not just its title', async ({ page }) => {
    await page.goto('/projects/');
    await expect(page.locator('#work article')).toHaveCount(3);
    for (const card of await page.locator('#work article').all()) {
      await card.scrollIntoViewIfNeeded(); // elementFromPoint only sees what is on screen
      const cardBox = (await card.boundingBox())!;
      const link = card.locator('a');
      // The link's ::after covers the card, so a tap anywhere on the card must hit the link.
      const hit = await link.evaluate(
        (anchor, point) => document.elementFromPoint(point.x, point.y) === anchor,
        { x: cardBox.x + cardBox.width / 2, y: cardBox.y + cardBox.height / 2 },
      );
      expect(hit, 'the middle of the card does not hit its link').toBe(true);
      expect(cardBox.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('zoom and text size', () => {
  test('stays usable at 200% zoom (a 640 px wide window)', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 900 });
    await page.goto('/');
    const sideways = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(sideways).toBe(false);
  });
});
