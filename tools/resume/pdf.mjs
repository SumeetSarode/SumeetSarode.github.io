/**
 * Makes a résumé PDF safe to publish: removes every phone-like number (the words themselves,
 * not a black box over them), drops "tel:" links and notes that mention one, and replaces the
 * file's metadata with just a title and author. Then it opens the result again and checks it.
 * If anything phone-like is still there, it refuses: nothing is written.
 */
import * as mupdf from 'mupdf';
import { findPhones, mask } from './phone.mjs';

/** Fewer letters than this in the whole file means a scan (a picture of text), which can't be checked. */
const MIN_TEXT = 40;

const open = (bytes) => {
  let document;
  try {
    document = mupdf.Document.openDocument(bytes, 'application/pdf');
  } catch {
    throw new Error('This PDF looks damaged and could not be opened. Save it again and retry.');
  }
  if (document.needsPassword()) {
    throw new Error('This PDF is password-protected. Save a copy without a password and retry.');
  }
  return document.asPDF();
};

const pages = (document) =>
  Array.from({ length: document.countPages() }, (_, index) => document.loadPage(index));

const textOf = (page) => page.toStructuredText('preserve-whitespace').asText();

const isPhoneLink = (link) => /^tel:/i.test(link.getURI());

/** Notes and form fields can hold text too; anything mentioning a phone goes. */
const phoneNotes = (page) =>
  page.getAnnotations().filter((annotation) => {
    try {
      return findPhones(annotation.getContents() ?? '').length > 0;
    } catch {
      return false;
    }
  });

/**
 * The final check, on the finished file: throws if anything phone-like is in it, anywhere.
 * @param {Uint8Array} bytes
 */
export function assertNoPhones(bytes) {
  const found = [];
  for (const page of pages(open(bytes))) {
    found.push(...findPhones(textOf(page)).map(mask));
    if (page.getLinks().some(isPhoneLink)) found.push('a "tel:" link');
    if (phoneNotes(page).length > 0) found.push('a note with a phone number');
  }
  if (found.length > 0) {
    throw new Error(
      `A phone-like number is still in the PDF after cleaning (${[...new Set(found)].join(', ')}), ` +
        'so it wasn’t used. Remove it from your résumé yourself, then save it again.',
    );
  }
}

/**
 * @param {Uint8Array} bytes  the résumé PDF
 * @param {{ title: string, author?: string }} metadata
 * @returns {{ bytes: Uint8Array, pages: number, removed: string[] }} removed = masked numbers
 */
export function cleanPdf(bytes, { title, author }) {
  const document = open(bytes);
  const allPages = pages(document);
  const allText = allPages.map(textOf).join('\n');
  if (allText.replace(/\s/g, '').length < MIN_TEXT) {
    throw new Error(
      'This PDF has no readable text: it looks like a scan or a picture. It can’t be checked for a ' +
        'phone number, so it wasn’t used. Export the PDF from Word or Google Docs instead.',
    );
  }

  const removed = [];
  for (const page of allPages) {
    let marked = false;
    for (const phone of new Set(findPhones(textOf(page)))) {
      const hits = page.search(phone);
      for (const quads of hits) {
        page.createAnnotation('Redact').setQuadPoints(quads);
        marked = true;
      }
      if (hits.length > 0) removed.push(mask(phone));
    }
    // White, not black boxes: the number simply disappears, leaving a small gap.
    if (marked) {
      page.applyRedactions(
        false,
        mupdf.PDFPage.REDACT_IMAGE_NONE,
        mupdf.PDFPage.REDACT_LINE_ART_NONE,
        mupdf.PDFPage.REDACT_TEXT_REMOVE,
      );
    }
    for (const link of page.getLinks().filter(isPhoneLink)) page.deleteLink(link);
    for (const note of phoneNotes(page)) page.deleteAnnotation(note);
  }

  // Metadata: only a title and author. Word's author, company, edit history and the rest go.
  const trailer = document.getTrailer();
  trailer.delete('Info');
  trailer.get('Root').delete('Metadata');
  document.setMetaData('info:Title', title);
  if (author) document.setMetaData('info:Author', author);

  // garbage + clean rewrites the file, so nothing removed survives in an old copy inside it.
  // slice(): mupdf hands back a view of its own memory, which later work can overwrite. The
  // bytes that are checked must be exactly the bytes that are written, so take a real copy.
  const cleaned = document.saveToBuffer('garbage=4,compress,clean').asUint8Array().slice();

  assertNoPhones(cleaned);
  return { bytes: cleaned, pages: open(cleaned).countPages(), removed };
}
