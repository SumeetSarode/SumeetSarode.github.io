import { expect, test } from '@playwright/test';
import { allPaths, projectPaths } from './pages';

const SITE = 'https://sumeetsarode.github.io';

for (const path of allPaths) {
  test.describe(`page structure: ${path}`, () => {
    test.beforeEach(async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
    });

    test('has a language, a title, a description, and a canonical address', async ({ page }) => {
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      expect((await page.title()).length).toBeGreaterThan(10);
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description?.length).toBeGreaterThan(40);
      expect(description?.length).toBeLessThanOrEqual(155);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}${path}`);
    });

    test('has social-sharing tags that point at a real image', async ({ page, request }) => {
      const image = await page.locator('meta[property="og:image"]').getAttribute('content');
      expect(image).toBe(`${SITE}/og-image.png`);
      expect((await request.get('/og-image.png')).status()).toBe(200);
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        'content',
        'summary_large_image',
      );
    });

    test('has exactly one h1 and one main landmark', async ({ page }) => {
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main')).toHaveCount(1);
    });

    test('never skips a heading level', async ({ page }) => {
      const levels = await page
        .locator('h1, h2, h3, h4, h5, h6')
        .evaluateAll((nodes) => nodes.map((node) => Number(node.tagName.slice(1))));
      expect(levels[0]).toBe(1);
      for (let index = 1; index < levels.length; index++) {
        expect(
          levels[index]!,
          `heading #${index} jumps from h${levels[index - 1]}`,
        ).toBeLessThanOrEqual(levels[index - 1]! + 1);
      }
    });

    test('every image has alternative text and a size', async ({ page }) => {
      for (const image of await page.locator('img').all()) {
        expect(await image.getAttribute('alt')).not.toBeNull();
        expect(await image.getAttribute('width')).not.toBeNull();
        expect(await image.getAttribute('height')).not.toBeNull();
      }
    });

    test('every link goes somewhere real', async ({ page, request }) => {
      const hrefs = await page
        .locator('a[href]')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href') ?? ''));
      for (const href of new Set(hrefs)) {
        if (href.startsWith('#')) {
          expect(await page.locator(href).count(), `anchor ${href} has no target`).toBe(1);
        } else if (href.startsWith('/')) {
          const clean = href.split('#')[0]!;
          const response = await request.get(clean);
          expect(response.status(), `${href} is broken`).toBe(200);
          if (href.includes('#')) {
            const hash = href.split('#')[1]!;
            await page.goto(href);
            expect(await page.locator(`#${hash}`).count(), `${href} has no target`).toBe(1);
            await page.goto(path);
          }
        } else if (href.startsWith('mailto:')) {
          expect(href).toMatch(/^mailto:[^@\s]+@[^@\s]+\.[a-z]+$/i);
        } else {
          expect(href, 'external links must use https').toMatch(/^https:\/\//);
        }
      }
    });
  });
}

test.describe('home page', () => {
  test('lists the case studies in the agreed order on their own page', async ({ page }) => {
    await page.goto('/projects/');
    const titles = await page.locator('#work article h3').allInnerTexts();
    expect(titles).toEqual([
      'Stock Price Predictor',
      'Dalal Street',
      'Nuclei Segmentation with Mask R-CNN',
    ]);
  });

  test('each project card is a single link', async ({ page }) => {
    await page.goto('/projects/');
    for (const card of await page.locator('#work article').all()) {
      await expect(card.locator('a')).toHaveCount(1);
    }
  });

  test('the résumé link downloads a PDF', async ({ page, request }) => {
    await page.goto('/');
    const href = await page.getByRole('link', { name: /résumé/i }).getAttribute('href');
    expect(href).toBe('/resume/sumeet-sarode-resume.pdf');
    const response = await request.get(href!);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('pdf');
    expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
  });

  test('describes the person in structured data, with no phone or address', async ({ page }) => {
    await page.goto('/');
    const raw = await page.locator('script[type="application/ld+json"]').first().innerText();
    const data = JSON.parse(raw);
    expect(data['@type']).toBe('Person');
    expect(data.name).toBe('Sumeet Sarode');
    expect(data.sameAs).toEqual([
      'https://github.com/SumeetSarode',
      'https://linkedin.com/in/SumeetSarode',
    ]);
    expect(raw).not.toMatch(/telephone|address|phone/i);
  });

  test('shows the profile photo with its alt text', async ({ page }) => {
    await page.goto('/');
    const photo = page.locator('.hero img');
    await expect(photo).toBeVisible();
    expect(await photo.getAttribute('alt')).toMatch(/Sumeet Sarode/);
    expect(await photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(100);
  });
});

test.describe('case studies', () => {
  for (const path of projectPaths) {
    test(`${path} is complete`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('link', { name: /view the code on github/i })).toHaveAttribute(
        'href',
        /^https:\/\/github\.com\/SumeetSarode\//,
      );
      await expect(page.locator('figure.flow li.step')).not.toHaveCount(0);
      expect(await page.locator('figure.flow li.step').count()).toBeGreaterThanOrEqual(3);
      await expect(
        page.getByText(/Facts checked against the project's repository on/),
      ).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'More case studies' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'What it is not' })).toBeVisible();
    });

    test(`${path} has named highlights, an emblem and a flow of icons`, async ({ page }) => {
      await page.goto(path);
      // Interesting names, never "Decision 1".
      const headings = await page.getByRole('heading').allInnerTexts();
      expect(headings.filter((text) => /^decision\s*\d/i.test(text))).toEqual([]);
      const cards = page.locator('ul.cards > li');
      await expect(cards).toHaveCount(3);
      for (const card of await cards.all()) {
        await expect(card.locator('h3')).not.toBeEmpty();
        await expect(card.locator('svg')).toHaveCount(1); // its icon
      }
      // Every flow step has an icon too, and the header carries the project's emblem.
      const steps = page.locator('figure.flow li.step');
      for (const step of await steps.all()) {
        await expect(step.locator('.step-icon svg')).toHaveCount(1);
      }
      const emblem = page.locator('header .emblem');
      await expect(emblem).toBeVisible();
      await expect(emblem).toHaveAttribute('aria-hidden', 'true');
      await expect(emblem.locator('svg')).toHaveCount(2); // the symbol and its badge
    });
  }

  test('both finance projects carry the not-financial-advice note', async ({ page }) => {
    for (const slug of ['stock-price-predictor', 'dalal-street']) {
      await page.goto(`/projects/${slug}/`);
      await expect(page.getByRole('note')).toContainText('Not financial advice');
    }
  });

  test('the Nuclei case study credits Matterport and the Kaggle dataset', async ({ page }) => {
    await page.goto('/projects/nuclei-segmentation/');
    const credit = page.getByRole('complementary');
    await expect(credit).toContainText('Matterport');
    await expect(credit).toContainText('Data Science Bowl');
  });

  test('"next case study" links form a loop through all three pages', async ({ page }) => {
    const seen: string[] = [];
    let path = projectPaths[0]!;
    for (let step = 0; step < projectPaths.length; step++) {
      seen.push(path);
      await page.goto(path);
      path = (await page.locator('nav.next a').getAttribute('href'))!;
    }
    expect(path).toBe(projectPaths[0]);
    expect(new Set(seen).size).toBe(projectPaths.length);
  });
});

test.describe('404 page', () => {
  test('is hidden from search engines and offers a way home', async ({ page }) => {
    await page.goto('/404.html');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await expect(page.getByRole('link', { name: /back to the home page/i })).toHaveAttribute(
      'href',
      '/',
    );
  });
});
