import { expect, test } from '@playwright/test';
import { nav } from '../../src/config/nav';
import { certifications, degrees } from '../../src/data/education';
import { skillLayers } from '../../src/data/skills';
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
    'Education',
    "Let's talk",
  ]);
  await expect(page.locator('.timeline')).toHaveCount(0);
  await expect(page.locator('#work article')).toHaveCount(0);
});

test.describe('the tiles on a laptop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Experience is full width; the other four form an even 2 x 2 grid below it', async ({
    page,
  }) => {
    await page.goto('/');
    const boxes = await page.locator('.chapter').evaluateAll((tiles) =>
      tiles.map((tile) => {
        const { x, y, width, height } = tile.getBoundingClientRect();
        return { x, y, width, height };
      }),
    );
    type Box = (typeof boxes)[number];
    const [experience, projects, research, education, contact] = boxes as [Box, Box, Box, Box, Box];
    const same = (a: number, b: number) => Math.abs(a - b) < 2;

    // Experience spans both columns.
    expect(same(experience.x, projects.x)).toBe(true);
    expect(same(experience.x + experience.width, research.x + research.width)).toBe(true);
    expect(projects.y).toBeGreaterThan(experience.y + experience.height - 1);
    // Two rows of two, all the same width, lined up in columns.
    expect(same(projects.y, research.y) && same(education.y, contact.y)).toBe(true);
    expect(education.y).toBeGreaterThan(projects.y + projects.height - 1);
    expect(same(projects.x, education.x) && same(research.x, contact.x)).toBe(true);
    for (const tile of [research, education, contact]) {
      expect(same(tile.width, projects.width), 'grid tiles differ in width').toBe(true);
    }
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

test('every project shows its emblem on the Projects page and on the home tile', async ({
  page,
}) => {
  await page.goto('/projects/');
  const cards = page.locator('#work article');
  await expect(cards).toHaveCount(3);
  for (const card of await cards.all()) {
    await expect(card.locator('.emblem svg')).toHaveCount(2); // symbol + badge
  }
  await page.goto('/');
  const rows = page.getByRole('list', { name: 'Case studies' }).getByRole('listitem');
  await expect(rows).toHaveCount(3);
  for (const row of await rows.all()) {
    await expect(row.locator('.emblem svg')).toHaveCount(2);
  }
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
  for (const [index, { href: path }] of nav.entries()) {
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
  for (const { label: name, href: path } of nav) {
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

test.describe('Experience roles are two columns on a wide screen', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('who and when on the left, the achievements on the right', async ({ page }) => {
    await page.goto('/experience/');
    const roles = page.locator('article.role');
    await expect(roles).toHaveCount(3);
    for (const role of await roles.all()) {
      const head = (await role.locator('.role-head').boundingBox())!;
      const list = (await role.locator('.bullets').boundingBox())!;
      expect(head.x + head.width, 'the identity column is not left of the list').toBeLessThan(
        list.x,
      );
      expect(Math.abs(head.y - list.y), 'the columns do not start together').toBeLessThan(40);
    }
  });
});

test.describe('Experience roles are one column on a phone', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('the achievements sit under the title', async ({ page }) => {
    await page.goto('/experience/');
    const role = page.locator('article.role').first();
    const head = (await role.locator('.role-head').boundingBox())!;
    const list = (await role.locator('.bullets').boundingBox())!;
    expect(list.y).toBeGreaterThan(head.y + head.height - 1);
  });
});

test('every research paper shows its emblem in the list, on its page, and on the home tile', async ({
  page,
}) => {
  await page.goto('/research/');
  const papers = page.locator('article.paper');
  await expect(papers).toHaveCount(4);
  for (const paper of await papers.all()) {
    await expect(paper.locator('.emblem svg')).toHaveCount(2); // symbol + badge
  }
  const firstLink = await papers.first().getByRole('link', { name: 'Explore the research' });
  await firstLink.click();
  await expect(page.locator('header .emblem svg')).toHaveCount(2);

  await page.goto('/');
  await expect(page.locator('.paper-emblems .emblem')).toHaveCount(4);
});

test('project emblems are big enough to see on the Projects page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/projects/');
  for (const emblem of await page.locator('#work .emblem').all()) {
    const box = (await emblem.boundingBox())!;
    expect(box.width, 'a project emblem is too small to notice').toBeGreaterThanOrEqual(100);
  }
});

test('the Education page lists both degrees and every certification, with safe verify links', async ({
  page,
}) => {
  await page.goto('/education/');
  await expect(page.locator('.degree')).toHaveCount(degrees.length);
  await expect(page.locator('.certs li')).toHaveCount(certifications.length);
  const verifyLinks = page.locator('a.verify');
  await expect(verifyLinks).toHaveCount(certifications.filter((cert) => cert.url).length);
  for (const link of await verifyLinks.all()) {
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
    // Each link names its certificate, so a screen reader hears more than "Verify, Verify".
    await expect(link).toHaveAccessibleName(/^Verify .+ \(opens in a new tab\)$/);
  }
});

test('capabilities are a stack: focus on top, foundations at the base, narrowing upward', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/experience/');
  const layers = page.locator('.layer');
  await expect(layers).toHaveCount(skillLayers.length);
  await expect(layers.first()).toContainText('Focus now');
  await expect(page.locator('.foundation')).toContainText('Runs on');
  const top = (await layers.first().boundingBox())!;
  const bottom = (await layers.last().boundingBox())!;
  expect(top.width, 'the top layer should be narrower, like a pyramid').toBeLessThan(bottom.width);
});

test('the menu fits on one row on phones, so the sticky header stays short', async ({ page }) => {
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const tops = await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link')
      .evaluateAll((links) => links.map((link) => Math.round(link.getBoundingClientRect().top)));
    expect(new Set(tops).size, `menu wrapped at ${width}px`).toBe(1);
  }
});
