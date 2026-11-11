import { expect, test } from '@playwright/test';
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

test('the Experience tile shows a career path, newest first, not a chart', async ({ page }) => {
  await page.goto('/');
  const steps = page.getByRole('list', { name: 'Career path' }).getByRole('listitem');
  await expect(steps.locator('.path-title')).toHaveText([
    /^Principal Data Scientist/,
    /^Senior Data Scientist/,
    /^Data Scientist/,
  ]);
  await expect(steps.first()).toContainText('Current');
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
  // Visible text only: the decorative badges count too, because people see them.
  const text = await page.locator('section.hero').innerText();
  expect(text, 'the opening screen contains a digit').not.toMatch(/\d/);
  await expect(page.getByRole('list', { name: 'Career impact' })).toHaveCount(0);
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
