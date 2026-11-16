# Résumé

Put **one** résumé in this folder: a Word file (`.docx`, `.doc`), an OpenDocument or RTF file, or a
PDF. The Portfolio Preview app turns it into the PDF visitors download, by itself, whenever the file
changes. (Without the app, run `npm run resume`.)

- **Your phone number is removed**, and the result is checked again. If anything phone-like is left,
  or the file can't be checked (a scan, or a password-protected PDF), it isn't used and the preview
  says why.
- **Your file is never changed.** Everything in this folder stays on your computer: git ignores it,
  so the original (with your phone number) is never committed or published.
- Word files give the cleanest result. From a PDF, the number is removed where it stands, so a small
  gap is left in its place.
- Word and the other non-PDF formats need **LibreOffice** (free, libreoffice.org). PDFs don't.
- To take the résumé off the site, empty this folder.

**Open the PDF and look at it** before publishing (the preview's status bar links to it), since
LibreOffice can draw fonts slightly differently from Word.
