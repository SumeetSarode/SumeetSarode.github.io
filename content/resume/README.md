# Résumé

Drop your Word résumé (a `.docx` file) in this folder, then run:

```bash
npm run resume
```

That builds the PDF people download from the site, at `public/resume/resume.pdf`:

- It works on a copy, so your Word file is never changed.
- It **removes your phone number** and stops if any phone-like number is left.
- It needs **Python 3** and **LibreOffice** (both free).

**Open the PDF and look at it** before publishing, because LibreOffice can draw fonts slightly
differently from Word.

Git ignores Word files, so your original (which has your phone number in it) is never committed or
published. Keep only one `.docx` here. You can also point at a file anywhere:
`npm run resume -- "/path/to/resume.docx"`.
