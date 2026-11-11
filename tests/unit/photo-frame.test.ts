import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseFrame } from '../../tools/photo-studio/frame.mjs';
import frameConfig from '../../src/config/photo-frame.json';

describe('parseFrame', () => {
  it('derives the aspect and the saved height from the page frame', () => {
    expect(parseFrame({ ratioWidth: 4, ratioHeight: 5, outputWidth: 960 })).toEqual({
      ratioWidth: 4,
      ratioHeight: 5,
      aspect: 1.25,
      outputWidth: 960,
      outputHeight: 1200,
    });
  });

  it('rejects settings that would produce a broken picture', () => {
    expect(() => parseFrame(undefined)).toThrow(/ratioWidth/);
    expect(() => parseFrame({ ratioWidth: 0, ratioHeight: 5, outputWidth: 960 })).toThrow();
    expect(() => parseFrame({ ratioWidth: 4, ratioHeight: 5.5, outputWidth: 960 })).toThrow();
    expect(() => parseFrame({ ratioWidth: 4, ratioHeight: 5, outputWidth: 50 })).toThrow(
      /outputWidth/,
    );
    expect(() => parseFrame({ ratioWidth: 4, ratioHeight: 5, outputWidth: 'big' })).toThrow();
  });
});

describe('the real photo frame (src/config/photo-frame.json)', () => {
  it('is valid', () => {
    expect(() => parseFrame(frameConfig)).not.toThrow();
  });

  it('is the setting the page reads, so the page and Photo Studio cannot disagree', () => {
    const hero = readFileSync('src/components/Hero.astro', 'utf8');
    expect(hero).toContain("from '../config/photo-frame.json'");
  });
});
