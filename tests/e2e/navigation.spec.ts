import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const frame = JSON.parse(readFileSync('src/config/photo-frame.json', 'utf8')) as {
  ratioWidth: number;
  ratioHeight: number;
};
import { publications } from '../../src/data/publications';

test('home is a concise overview, with Experience before Projects', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.chapter h3')).toHaveText([
    'Experience',
    'Projects',
    'Research',
    "Let's talk",
  ]);
  await expect(page.locator('.timeline')).toHaveCount(0);
  await expect(page.locator('#work article')).toHaveCount(0);
});

test.describe('the tiles on a laptop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Experience is full width; the other three share one row at equal size', async ({
    page,
  }) => {
    await page.goto('/');
    const boxes = await page.locator('.chapter').evaluateAll((tiles) =>
      tiles.map((tile) => {
        const { x, y, width, height } = tile.getBoundingClientRect();
        return { x, y, width, height };
      }),
    );
    const [experience, projects, research, contact] = boxes as [
      (typeof boxes)[number],
      (typeof boxes)[number],
      (typeof boxes)[number],
      (typeof boxes)[number],
    ];
    const rowWidth = projects.x + projects.width; // the right edge of the first tile in row 2
    expect(experience.width).toBeGreaterThan(rowWidth + research.width); // it spans every column
    for (const tile of [projects, research, contact]) {
      expect(Math.abs(tile.y - projects.y), 'row 2 tiles are not on one line').toBeLessThan(2);
      expect(Math.abs(tile.width - projects.width), 'row 2 tiles differ in width').toBeLessThan(2);
    }
    expect(projects.y).toBeGreaterThan(experience.y + experience.height - 1);
  });

  test('the career path runs left to right', async ({ page }) => {
    await page.goto('/');
    const xs = await page
      .locator('.path-step')
      .evaluateAll((steps) => steps.map((step) => step.getBoundingClientRect().x));
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(new Set(xs).size).toBe(3);
  });
});

test('the Experience tile shows a career path, oldest to newest, not a chart', async ({ page }) => {
  await page.goto('/');
  const steps = page.getByRole('list', { name: 'Career path' }).getByRole('listitem');
  await expect(steps.locator('.path-title')).toHaveText([
    /^Data Scientist/,
    /^Senior Data Scientist/,
    /^Principal Data Scientist/,
  ]);
  await expect(steps.last()).toContainText('Current');
  await expect(page.locator('.slot-experience').locator('.bar, canvas, svg')).toHaveCount(0);
});

test('every home-page chapter opens its own section page', async ({ page }) => {
  for (const [index, path] of ['/experience/', '/projects/', '/research/', '/contact/'].entries()) {
    await page.goto('/');
    await page.locator('.chapter').nth(index).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.locator('h1')).toBeVisible();
  }
});

test('the opening screen shows no numbers', async ({ page }) => {
  await page.goto('/');
  // Visible text only, so anything people can see counts.
  const text = await page.locator('section.hero').innerText();
  expect(text, 'the opening screen contains a digit').not.toMatch(/\d/);
  await expect(page.getByRole('list', { name: 'Career impact' })).toHaveCount(0);
});

test.describe('the opening screen on a laptop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('says the chosen headline', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Smart AI is easy.');
    await expect(page.locator('h1')).toContainText('Trustworthy AI is my job.');
    await expect(page.locator('.hero')).toContainText(
      'I build agents that reason, with guardrails that hold.',
    );
  });

  test('has the photo on the left, with no badges on it', async ({ page }) => {
    await page.goto('/');
    const photo = (await page.locator('.hero img').boundingBox())!;
    const headline = (await page.locator('.hero h1').boundingBox())!;
    expect(photo.x + photo.width, 'the photo is not left of the headline').toBeLessThanOrEqual(
      headline.x,
    );
    await expect(page.locator('.hero [aria-hidden="true"]:not(.dot)')).toHaveCount(
      await page.locator('.hero .actions [aria-hidden="true"]').count(),
    );
  });

  test('shows the whole photo, in the shared frame shape, without scrolling', async ({ page }) => {
    await page.goto('/');
    const photo = (await page.locator('.hero img').boundingBox())!;
    expect(photo.y + photo.height, 'the photo runs off the screen').toBeLessThanOrEqual(900);
    expect(photo.width / photo.height).toBeCloseTo(frame.ratioWidth / frame.ratioHeight, 1);
  });
});

test('the opening screen fills the screen on a very wide monitor', async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1300 });
  await page.goto('/');
  const hero = (await page.locator('section.hero').boundingBox())!;
  expect(hero.height).toBeGreaterThanOrEqual(1300 - 70);
});

test('the impact numbers live on the Experience page, and are the verified ones', async ({
  page,
}) => {
  await page.goto('/experience/');
  await expect(page.getByRole('list', { name: 'Impact highlights' }).locator('strong')).toHaveText([
    '~$100M',
    '~$16M',
    'Nationwide',
    '5+ years',
  ]);
});

test('navigation opens subpages instead of scrolling through a résumé', async ({ page }) => {
  await page.goto('/');
  for (const [name, path] of [
    ['Experience', '/experience/'],
    ['Projects', '/projects/'],
    ['Research', '/research/'],
    ['Contact', '/contact/'],
  ] as const) {
    const link = page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name });
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(link).toHaveAttribute('aria-current', 'page');
  }
});

test('all publications have clickable detail pages and working next/previous navigation', async ({
  page,
}) => {
  await page.goto('/research/');
  await expect(page.locator('.paper')).toHaveCount(4);
  for (const paper of publications) {
    await page.goto('/research/');
    await page.getByRole('heading', { name: paper.title }).getByRole('link').click();
    await expect(page).toHaveURL(new RegExp(`/research/${paper.slug}/$`));
    await expect(page.getByRole('heading', { name: 'The approach' })).toBeVisible();
    const next = page.getByRole('navigation', { name: 'More research' }).locator('a').last();
    const destination = await next.getAttribute('href');
    await next.click();
    expect(new URL(page.url()).pathname).toBe(destination);
    await expect(page.getByRole('navigation', { name: 'More research' }).locator('a')).toHaveCount(
      2,
    );
  }
});

test('publisher links explicitly open a separate tab without replacing the portfolio', async ({
  page,
}) => {
  await page.goto('/research/');
  const links = page.locator('.paper-actions a[target="_blank"]');
  await expect(links).toHaveCount(4);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute('href', /^https:\/\//);
    await expect(link).toHaveAttribute('rel', /noopener/);
    await expect(link).toContainText('opens in a new tab');
  }
});
