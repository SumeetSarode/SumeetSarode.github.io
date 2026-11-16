#!/usr/bin/env python3
"""Build the public resume PDF from the owner's Word resume, WITHOUT the phone number.

Usage:  python3 scripts/build_public_resume.py ["path/to/resume.docx"]

With no path, it uses the one .docx file in content/resume/ (git ignores Word files, so your
phone number never gets committed).

It never edits the original. It works on a temporary copy, refuses to continue if
any phone-like number is still in the file, then converts the copy to
public/resume/sumeet-sarode-resume.pdf with LibreOffice (the `soffice` command).
Standard library only.
"""

import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

RESUME_DIR = Path(__file__).resolve().parent.parent / "content" / "resume"
OUTPUT = Path(__file__).resolve().parent.parent / "public" / "resume" / "sumeet-sarode-resume.pdf"
TITLE = "Sumeet Sarode \u2014 R\u00e9sum\u00e9"
AUTHOR = "Sumeet Sarode"

# A phone number between two "|" separators, as in: email | phone | linkedin | github
SEPARATED_PHONE = re.compile(r"\s*\|\s*\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\s*\|\s*")
# Anything that still looks like a phone number once the separated one is gone.
ANY_PHONE = re.compile(r"\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}|\b\d{10}\b|tel:", re.IGNORECASE)
TEXT_RUN = re.compile(r"(<w:t(?: [^>]*)?>)([^<]*)(</w:t>)")


def strip_phone(xml: str) -> str:
    """Remove the phone number from every text run, keeping a single ' | ' separator."""
    return TEXT_RUN.sub(
        lambda m: m.group(1) + SEPARATED_PHONE.sub(" | ", m.group(2)) + m.group(3), xml
    )


def set_metadata(core_xml: str) -> str:
    """Give the PDF a real title and author instead of the template's defaults."""
    def put(xml: str, tag: str, value: str) -> str:
        pattern = re.compile(rf"<{tag}(?: [^>]*)?>.*?</{tag}>|<{tag}\s*/>", re.S)
        element = f"<{tag}>{value}</{tag}>"
        return pattern.sub(element, xml) if pattern.search(xml) else xml.replace("</cp:coreProperties>", element + "</cp:coreProperties>")

    core_xml = put(core_xml, "dc:title", TITLE)
    core_xml = put(core_xml, "dc:creator", AUTHOR)
    return put(core_xml, "cp:lastModifiedBy", AUTHOR)


def sanitize(source: Path, destination: Path) -> None:
    with zipfile.ZipFile(source) as zin, zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename.endswith(".xml") or item.filename.endswith(".rels"):
                text = data.decode("utf-8")
                if item.filename.startswith("word/") and item.filename.endswith(".xml"):
                    text = strip_phone(text)
                if item.filename == "docProps/core.xml":
                    text = set_metadata(text)
                if ANY_PHONE.search(text):
                    raise SystemExit(f"STOP: a phone-like number is still in {item.filename}. Nothing was written.")
                data = text.encode("utf-8")
            zout.writestr(item, data)


def convert(docx: Path) -> Path:
    soffice = shutil.which("soffice") or "/Applications/LibreOffice.app/Contents/MacOS/soffice"
    out_dir = docx.parent / "pdf"
    subprocess.run(
        [soffice, "--headless", "--convert-to", "pdf", "--outdir", str(out_dir), str(docx)],
        check=True, capture_output=True, timeout=180,
    )
    return out_dir / (docx.stem + ".pdf")


def find_source(args: list[str]) -> Path:
    """The path given on the command line, or the single .docx waiting in content/resume/."""
    if len(args) > 1:
        raise SystemExit(__doc__)
    if args:
        source = Path(args[0]).expanduser()
        if not source.is_file():
            raise SystemExit(f"Cannot find {source}")
        return source
    found = sorted(RESUME_DIR.glob("*.docx"))
    if not found:
        raise SystemExit(f"Put your Word r\u00e9sum\u00e9 (.docx) in {RESUME_DIR}, then run this again.")
    if len(found) > 1:
        names = ", ".join(path.name for path in found)
        raise SystemExit(f"Found more than one .docx in {RESUME_DIR} ({names}). Keep just one.")
    return found[0]


def main() -> None:
    source = find_source(sys.argv[1:])
    with tempfile.TemporaryDirectory() as work:
        clean = Path(work) / "sumeet-sarode-resume.docx"
        sanitize(source, clean)
        produced = convert(clean)
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(produced, OUTPUT)
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size // 1024} KB). The original was not changed.")


if __name__ == "__main__":
    main()
