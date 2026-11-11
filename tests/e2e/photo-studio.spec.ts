import { expect, test } from '@playwright/test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import sharp from 'sharp';
import { createStudioServer } from '../../tools/photo-studio/server.mjs';

/**
 * Drives the real Photo Studio editor in a real browser, against a throwaway copy of the
 * project, so the page's own photo is never touched. The point: the editor must take its
 * shape from src/config/photo-frame.json (the page decides, the tool follows).
 */
async function withStudio(
  frame: { ratioWidth: number; ratioHeight: number; outputWidth: number },
  run: (url: string, root: string) => Promise<void>,
) {
  const root = await mkdtemp(join(tmpdir(), 'studio-e2e-'));
  await mkdir(join(root, 'src/config'), { recursive: true });
  await writeFile(join(root, 'src/config/profile-photo.json'), '{ "alt": "old alt" }\n');
  await writeFile(join(root, 'src/config/photo-frame.json'), JSON.stringify(frame));
  const server = createStudioServer({ projectRoot: root });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${port}/`, root);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
}

const photo = () =>
  sharp({ create: { width: 2000, height: 1600, channels: 3, background: '#7a8aa0' } })
    .jpeg()
    .toBuffer();

for (const frame of [
  { ratioWidth: 4, ratioHeight: 5, outputWidth: 960 },
  { ratioWidth: 1, ratioHeight: 1, outputWidth: 800 },
]) {
  const expectedHeight = Math.round((frame.outputWidth * frame.ratioHeight) / frame.ratioWidth);

  test(`Photo Studio follows the page frame (${frame.ratioWidth}:${frame.ratioHeight})`, async ({
    page,
  }) => {
    await withStudio(frame, async (url, root) => {
      await page.goto(url);

      await expect(page.locator('#frame-note')).toContainText(
        `${frame.ratioWidth}:${frame.ratioHeight}`,
      );
      await expect(page.locator('#frame-note')).toContainText(
        `${frame.outputWidth} x ${expectedHeight}`,
      );

      // Every canvas, including the previews, has the page frame's shape.
      for (const id of ['stage-canvas', 'p-light-160', 'p-dark-64', 'confirm-preview']) {
        const { width, height } = await page.locator(`#${id}`).evaluate((canvas) => ({
          width: (canvas as HTMLCanvasElement).width,
          height: (canvas as HTMLCanvasElement).height,
        }));
        expect(height / width, `#${id} has the wrong shape`).toBeCloseTo(
          frame.ratioHeight / frame.ratioWidth,
          1,
        );
      }

      await page.setInputFiles('#file', {
        name: 'test.jpg',
        mimeType: 'image/jpeg',
        buffer: await photo(),
      });
      await expect(page.locator('#editor')).toBeVisible();

      await page.locator('#alt').fill('A plain test picture.');
      await page.locator('#save').click();
      await page.locator('#confirm-save').click();
      await expect(page.locator('#status')).toContainText('updated locally');

      const saved = await sharp(
        await readFile(join(root, 'src/assets/profile/profile.jpg')),
      ).metadata();
      expect([saved.width, saved.height, saved.exif]).toEqual([
        frame.outputWidth,
        expectedHeight,
        undefined,
      ]);
    });
  });
}
