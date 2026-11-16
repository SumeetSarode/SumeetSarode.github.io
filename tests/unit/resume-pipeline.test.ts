/**
 * The résumé pipeline: phone numbers are found, removed from Word files and PDFs, checked
 * for again, and anything unsafe is refused. Test files are made here, with invented numbers.
 */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import * as mupdf from 'mupdf';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildResume } from '../../tools/resume/build.mjs';
import { findLibreOffice } from '../../tools/resume/convert.mjs';
import { cleanDocx } from '../../tools/resume/docx.mjs';
import { assertNoPhones, cleanPdf } from '../../tools/resume/pdf.mjs';
import { findPhones, mask, withoutPhones } from '../../tools/resume/phone.mjs';

const BODY = 'Built 1,744 unit tests between 2019-2023 and cut costs by 40% across 600 stores.';

/** A one-page PDF with these lines of text, and optionally a link. */
function makePdf(lines: string[], link?: string): Uint8Array {
  const pdf = new mupdf.PDFDocument();
  const font = pdf.addSimpleFont(new mupdf.Font('Helvetica'));
  const escape = (line: string) => line.replace(/[()\\]/g, (char) => `\\${char}`);
  const text = lines.map((line) => `(${escape(line)}) Tj 0 -20 Td`).join(' ');
  const page = pdf.addPage(
    [0, 0, 612, 792],
    0,
    pdf.addObject({ Font: { F1: font } }),
    `BT /F1 11 Tf 72 720 Td ${text} ET`,
  );
  pdf.insertPage(-1, page);
  pdf.setMetaData('info:Author', 'Someone Else');
  pdf.setMetaData('info:Producer', 'A word processor');
  if (link) pdf.loadPage(0).createLink([72, 700, 300, 730], link);
  return pdf.saveToBuffer('').asUint8Array().slice(); // a copy, not a view of mupdf's memory
}

/** A PDF with no text at all, like a scan. */
function makeScan(): Uint8Array {
  const pdf = new mupdf.PDFDocument();
  pdf.insertPage(-1, pdf.addPage([0, 0, 612, 792], 0, {}, '0 0 1 rg 72 72 200 200 re f'));
  return pdf.saveToBuffer('').asUint8Array().slice(); // a copy, not a view of mupdf's memory
}

const textOf = (bytes: Uint8Array) => {
  const document = mupdf.Document.openDocument(bytes, 'application/pdf');
  return document.loadPage(0).toStructuredText('preserve-whitespace').asText();
};

/** A minimal but real Word file (Word and LibreOffice can open it), one paragraph per list. */
function makeDocx(paragraphs: string[][]): Uint8Array {
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const package_ = 'http://schemas.openxmlformats.org/package/2006';
  const body = paragraphs
    .map(
      (runs) =>
        `<w:p>${runs.map((run) => `<w:r><w:t xml:space="preserve">${run}</w:t></w:r>`).join('')}</w:p>`,
    )
    .join('');
  return zipSync({
    '[Content_Types].xml': strToU8(
      `${xml}<Types xmlns="${package_}/content-types">` +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '</Types>',
    ),
    '_rels/.rels': strToU8(
      `${xml}<Relationships xmlns="${package_}/relationships">` +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>',
    ),
    'word/document.xml': strToU8(
      `${xml}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
        `<w:body>${body}</w:body></w:document>`,
    ),
  });
}
const docxText = (bytes: Uint8Array) =>
  strFromU8(unzipSync(bytes)['word/document.xml']!).replace(/<[^>]+>/g, '');

describe('finding phone numbers', () => {
  it.each([
    '(555) 123-4567',
    '555-123-4567',
    '555.123.4567',
    '555 123 4567',
    '5551234567',
    '+1 (555) 123-4567',
    '+44 20 7946 0958',
    '+91 98765 43210',
    '98765 43210',
  ])('finds %s', (phone) => {
    expect(findPhones(`call ${phone} today`)).toEqual([phone]);
  });

  it('leaves years, dates, counts and percentages alone', () => {
    expect(findPhones(BODY)).toEqual([]);
    expect(findPhones('Aug 2021 – Oct 2023, 2018 2019 2020, +15% revenue, 2,300+ stocks')).toEqual(
      [],
    );
  });

  it('finds a number broken across two lines', () => {
    expect(findPhones('jane@doe.dev | 555 123\n4567 | github')).toHaveLength(1);
  });

  it('masks all but the last four digits', () => {
    expect(mask('(555) 123-4567')).toBe('•••\u2011•••\u20114567');
  });

  it('removes a number with its separator or label, keeping the line tidy', () => {
    expect(withoutPhones('jane@doe.dev | (555) 123-4567 | github.com/jane')).toBe(
      'jane@doe.dev | github.com/jane',
    );
    expect(withoutPhones('Phone: 555 123 4567 | jane@doe.dev')).toBe('jane@doe.dev');
    expect(withoutPhones(BODY)).toBe(BODY);
  });
});

describe('cleaning a Word file', () => {
  it('removes the number from the text and reports it', () => {
    const { bytes, removed } = cleanDocx(
      makeDocx([['Jane Doe'], ['jane@doe.dev | 555-123-4567 | github.com/jane'], [BODY]]),
    );
    expect(docxText(bytes)).toBe(`Jane Doejane@doe.dev | github.com/jane${BODY}`);
    expect(removed).toEqual(['•••\u2011•••\u20114567']);
  });

  it('refuses something that is not a Word file', () => {
    expect(() => cleanDocx(strToU8('not a zip'))).toThrow(/damaged/);
  });
});

describe('cleaning a PDF', () => {
  const metadata = { title: 'Jane Doe — Résumé', author: 'Jane Doe' };

  it('removes the number, the tel: link and the old metadata', () => {
    const source = makePdf(
      ['Jane Doe', 'jane@doe.dev | (555) 123-4567 | github.com/jane', BODY],
      'tel:5551234567',
    );
    const { bytes, pages, removed } = cleanPdf(source, metadata);
    const text = textOf(bytes);
    expect(text).not.toMatch(/4567/);
    expect(text).toContain('github.com/jane');
    expect(text).toContain('1,744 unit tests');
    expect(Buffer.from(bytes).includes('4567')).toBe(false);
    expect(pages).toBe(1);
    expect(removed).toEqual(['•••\u2011•••\u20114567']);
    const document = mupdf.Document.openDocument(bytes, 'application/pdf');
    expect(document.loadPage(0).getLinks()).toHaveLength(0);
    expect(document.getMetaData('info:Title')).toBe('Jane Doe — Résumé');
    expect(document.getMetaData('info:Author')).toBe('Jane Doe');
    expect(document.getMetaData('info:Producer') ?? '').toBe('');
  });

  it('uses a PDF without a phone number as it is, just with new metadata', () => {
    const { bytes, removed } = cleanPdf(makePdf(['Jane Doe', BODY]), metadata);
    expect(removed).toEqual([]);
    expect(textOf(bytes)).toContain(BODY);
  });

  it('refuses a scan, since it cannot be checked', () => {
    expect(() => cleanPdf(makeScan(), metadata)).toThrow(/no readable text/);
  });

  it('removes a number broken across two lines', () => {
    const source = makePdf(['Jane Doe | 555 123', '4567 | github.com/jane', BODY]);
    const { bytes, removed } = cleanPdf(source, metadata);
    expect(textOf(bytes)).not.toMatch(/555|4567/);
    expect(removed).toEqual(['•••\u2011•••\u20114567']);
  });

  it('has a final check that refuses any file still holding a number or tel: link', () => {
    expect(() => assertNoPhones(makePdf(['Jane Doe | 555-123-4567', BODY]))).toThrow(
      /still in the PDF.*•••\u2011•••\u20114567/,
    );
    expect(() => assertNoPhones(makePdf(['Jane Doe', BODY], 'tel:5551234567'))).toThrow(/tel:/);
    expect(() => assertNoPhones(makePdf(['Jane Doe', BODY]))).not.toThrow();
  });

  it('refuses a damaged file', () => {
    expect(() => cleanPdf(strToU8('%PDF-1.7 nonsense'), metadata)).toThrow(/damaged/);
  });
});

describe('building the site’s résumé from content/resume/', () => {
  let work: string;
  const setup = (files: Record<string, Uint8Array | string>) => {
    work = mkdtempSync(join(tmpdir(), 'portfolio-resume-test-'));
    const inputDir = join(work, 'in');
    const profileFile = join(work, 'profile.yaml');
    writeFileSync(profileFile, 'name: Jane Doe\nemail: jane@doe.dev\n');
    /** Replace the résumé in the folder with another file. */
    const write = (name: string, data: Uint8Array | string) =>
      writeFileSync(join(inputDir, name), data);
    mkdirSync(inputDir, { recursive: true });
    for (const [name, data] of Object.entries(files)) writeFileSync(join(inputDir, name), data);
    const options = {
      inputDir,
      profileFile,
      output: join(work, 'out', 'resume.pdf'),
      stampFile: join(work, 'stamp.json'),
    };
    return { options, inputDir, write };
  };
  afterEach(() => rmSync(work, { recursive: true, force: true }));

  it('turns a PDF into the site’s copy, without the number, and skips it next time', async () => {
    const original = makePdf(['Jane Doe | 555-123-4567', BODY]);
    const { options, inputDir } = setup({ 'my résumé.pdf': original, 'README.md': 'guide' });
    const status = await buildResume(options);
    expect(status.state, status.message).toBe('ready');
    expect(status.message).toContain('Removed 1 phone number (•••\u2011•••\u20114567)');
    expect(status.message).toContain('small gap');
    expect(textOf(readFileSync(options.output))).not.toMatch(/4567/);
    // The original is only read.
    expect(Buffer.compare(readFileSync(join(inputDir, 'my résumé.pdf')), original)).toBe(0);
    expect((await buildResume(options)).changed).toBe(false);
  });

  it('with an empty folder, takes the old PDF off the site', async () => {
    const { options } = setup({});
    mkdirSync(join(work, 'out'), { recursive: true });
    writeFileSync(options.output, 'old');
    const status = await buildResume(options);
    expect(status.state).toBe('none');
    expect(existsSync(options.output)).toBe(false);
  });

  it('asks for just one résumé when there are two', async () => {
    const pdf = makePdf(['Jane Doe', BODY]);
    const { options } = setup({ 'a.pdf': pdf, 'b.pdf': pdf });
    const status = await buildResume(options);
    expect(status.state).toBe('error');
    expect(status.message).toContain('Keep just one');
  });

  it('explains a format it can’t read', async () => {
    const { options } = setup({ 'resume.pages': 'x' });
    const status = await buildResume(options);
    expect(status.state).toBe('error');
    expect(status.message).toContain('Use a Word file (.docx) or a PDF');
  });

  it('keeps the previous PDF when a new résumé is unsafe', async () => {
    const { options, write } = setup({ 'resume.pdf': makePdf(['Jane Doe', BODY]) });
    expect((await buildResume(options)).state).toBe('ready');
    const before = readFileSync(options.output);
    write('resume.pdf', makeScan());
    const status = await buildResume(options);
    expect(status.state).toBe('error');
    expect(status.message).toContain('keeps the résumé it had before');
    expect(Buffer.compare(readFileSync(options.output), before)).toBe(0);
  });
});

// Needs LibreOffice, which GitHub's test machines don't have: runs wherever it's installed.
const libreOffice = await findLibreOffice();
describe.skipIf(!libreOffice)('a Word résumé, end to end (needs LibreOffice)', () => {
  it('becomes a tidy PDF without the number', async () => {
    const work = mkdtempSync(join(tmpdir(), 'portfolio-resume-word-'));
    try {
      const inputDir = join(work, 'in');
      mkdirSync(inputDir);
      writeFileSync(
        join(inputDir, 'resume.docx'),
        makeDocx([
          ['Jane Doe'],
          ['jane@doe.dev | ', '(555) 123-4567', ' | github.com/jane'],
          [BODY],
        ]),
      );
      const profileFile = join(work, 'profile.yaml');
      writeFileSync(profileFile, 'name: Jane Doe\nemail: jane@doe.dev\n');
      const output = join(work, 'resume.pdf');
      const status = await buildResume({
        inputDir,
        profileFile,
        output,
        stampFile: join(work, 's.json'),
      });
      expect(status.state, status.message).toBe('ready');
      const text = textOf(readFileSync(output));
      expect(text).not.toMatch(/4567/);
      expect(text).toContain('github.com/jane');
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }, 240_000);
});
