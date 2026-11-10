import { describe, expect, it } from 'vitest';
import {
  MAX_ALT_LENGTH,
  cleanAltText,
  detectImageType,
  isAllowedHost,
  isAllowedOrigin,
  isValidUploadId,
} from '../../tools/photo-studio/validate.mjs';

const bytes = (...values: number[]) => Buffer.from([...values, ...new Array(16).fill(0)]);
const ascii = (offset: number, text: string) => {
  const buffer = Buffer.alloc(32);
  buffer.write(text, offset, 'ascii');
  return buffer;
};

describe('detectImageType (magic bytes)', () => {
  it('recognises JPEG', () => expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('jpeg'));
  it('recognises PNG', () =>
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('png'));
  it('recognises WebP', () => {
    const buffer = ascii(0, 'RIFF');
    buffer.write('WEBP', 8, 'ascii');
    expect(detectImageType(buffer)).toBe('webp');
  });
  it.each(['heic', 'heix', 'mif1'])('recognises HEIC brand %s', (brand) => {
    const buffer = ascii(4, 'ftyp');
    buffer.write(brand, 8, 'ascii');
    expect(detectImageType(buffer)).toBe('heic');
  });
  it('rejects unknown ftyp brands (for example mp4 video)', () => {
    const buffer = ascii(4, 'ftyp');
    buffer.write('isom', 8, 'ascii');
    expect(detectImageType(buffer)).toBeNull();
  });
  it('rejects text, scripts and empty input', () => {
    expect(detectImageType(Buffer.from('<script>alert(1)</script>'))).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
    expect(detectImageType(null)).toBeNull();
    expect(detectImageType(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
});

describe('isAllowedHost (DNS rebinding defence)', () => {
  it('accepts only loopback host with the right port', () => {
    expect(isAllowedHost('127.0.0.1:4322', 4322)).toBe(true);
    expect(isAllowedHost('localhost:4322', 4322)).toBe(true);
  });
  it.each([
    'evil.example:4322',
    '127.0.0.1:9999',
    '127.0.0.1',
    'localhost',
    '0.0.0.0:4322',
    '',
    undefined,
  ])('rejects %s', (host) => expect(isAllowedHost(host, 4322)).toBe(false));
});

describe('isAllowedOrigin (cross-site defence)', () => {
  it('allows no Origin and the server itself', () => {
    expect(isAllowedOrigin(undefined, 4322)).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:4322', 4322)).toBe(true);
    expect(isAllowedOrigin('http://localhost:4322', 4322)).toBe(true);
  });
  it.each(['https://evil.example', 'http://127.0.0.1:1', 'null', ''])('rejects %s', (origin) =>
    expect(isAllowedOrigin(origin, 4322)).toBe(false),
  );
});

describe('isValidUploadId', () => {
  it('accepts a UUID', () =>
    expect(isValidUploadId('123e4567-e89b-12d3-a456-426614174000')).toBe(true));
  it.each([
    '../../etc/passwd',
    '123e4567',
    '',
    42,
    null,
    '123e4567-e89b-12d3-a456-426614174000/../x',
  ])('rejects %s', (id) => expect(isValidUploadId(id)).toBe(false));
});

describe('cleanAltText', () => {
  it('trims and accepts normal text', () =>
    expect(cleanAltText('  A smiling person  ')).toBe('A smiling person'));
  it('rejects empty, non-string, too long, or control characters', () => {
    expect(cleanAltText('   ')).toBeNull();
    expect(cleanAltText(7)).toBeNull();
    expect(cleanAltText('x'.repeat(MAX_ALT_LENGTH + 1))).toBeNull();
    expect(cleanAltText('bad\u0000text')).toBeNull();
    expect(cleanAltText('line\nbreak')).toBeNull();
  });
});
