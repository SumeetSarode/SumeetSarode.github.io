/**
 * Tidies a Word (.docx) résumé before it becomes a PDF: removes phone numbers from the text,
 * along with the separator or label next to them, so the PDF has no gap where they were.
 *
 * Best effort on purpose. Word sometimes splits a number across pieces of text this can't see
 * as one; the PDF step that follows catches whatever is left (see pdf.mjs).
 */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { findPhones, mask, withoutPhones } from './phone.mjs';

// One piece of text in Word's XML: <w:t>…</w:t> or <w:t xml:space="preserve">…</w:t>
const TEXT_RUN = /(<w:t(?: [^>]*)?>)([^<]*)(<\/w:t>)/g;

/** The words of the document, headers and footers: word/document.xml, word/header1.xml, … */
const isWordText = (name) => name.startsWith('word/') && name.endsWith('.xml');

/**
 * @param {Uint8Array} docx
 * @returns {{ bytes: Uint8Array, removed: string[] }} the document without phone numbers, and
 *   what was removed (masked)
 */
export function cleanDocx(docx) {
  let files;
  try {
    files = unzipSync(docx);
  } catch {
    throw new Error('This Word file looks damaged. Open it in Word, save it again, and retry.');
  }
  if (!files['word/document.xml']) {
    throw new Error('This is not a Word document inside. Save it from Word as .docx and retry.');
  }
  const removed = [];
  for (const [name, bytes] of Object.entries(files)) {
    if (!isWordText(name)) continue;
    const xml = strFromU8(bytes).replace(TEXT_RUN, (_, open, text, close) => {
      removed.push(...findPhones(text).map(mask));
      return open + withoutPhones(text) + close;
    });
    files[name] = strToU8(xml);
  }
  return { bytes: zipSync(files, { level: 6 }), removed };
}
