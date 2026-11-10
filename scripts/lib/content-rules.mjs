/**
 * Rules this site must never break, shared by the unit tests (which scan the source)
 * and scripts/check-dist.mjs (which scans the built site), so the two cannot disagree.
 */

// A North-American style phone number: 3-3-4 digits with separators.
export const PHONE = /(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}/;

export const PRIVACY_RULES = [
  { name: 'a phone number', pattern: PHONE },
  { name: 'a tel: link', pattern: /\btel:/i },
  {
    // Covers work email addresses and any internal host. Plain-text employer names
    // ("Walmart Inc.") are fine; an address ending in .com is not.
    name: 'a work-network address',
    pattern: /\b(?:[\w-]+\.)*(?:walmart|walmartlabs|wal-mart|samsclub)\.com\b/i,
  },
  { name: 'an original iPhone photo file', pattern: /\.hei[cf]\b/i },
];

/** Words the owner's style guide bans (CONTENT.md section 9). */
export const BANNED_WORDS =
  /\b(passionate|results-driven|visionary|guru|ninja|cutting-edge|leverag(?:e|es|ed|ing))\b/i;

/** Signs of unfinished work. */
export const UNFINISHED = /\b(lorem ipsum|TODO|FIXME|TBD|XXX)\b/;

/** Things that must never be published, found only in the BUILT site. */
export const BUILD_LEAKS = [
  { name: 'the Photo Studio tool', pattern: /photo[- ]studio/i },
  { name: 'a localhost address', pattern: /localhost|127\.0\.0\.1/ },
];

/** Files that stay on the owner's laptop and must never be committed. */
export const PRIVATE_FILES = [/^PLAN\.md$/i, /^CONTENT\.md$/i, /\.docx?$/i, /\.hei[cf]$/i];
