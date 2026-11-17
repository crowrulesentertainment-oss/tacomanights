#!/usr/bin/env python3
"""Static public-site link and navigation checks for Tacoma Nights."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import sys

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    "index.html", "watch.html", "archive.html", "live.html",
    "segments/index.html", "newsroom.html", "events.html",
    "perspectives.html", "community.html", "members-directory.html",
    "members.html", "crew.html", "join.html", "about.html", "admin.html",
    "production.html", "production/contributor.html", "production/review.html",
    "news-submit.html", "event-submit.html",
]

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
        self.base = None
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "base":
            if attrs.get("href"):
                self.base = attrs["href"]
            return
        for key in ("href", "src", "action", "poster"):
            value = attrs.get(key)
            if value:
                self.refs.append((tag, key, value))

errors = []
for required in REQUIRED:
    if not (ROOT / required).is_file():
        errors.append(f"Required public page is missing: {required}")

html_files = sorted(ROOT.rglob("*.html"))
for page in html_files:
    parser = Links()
    try:
        parser.feed(page.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"Could not parse {page.relative_to(ROOT)}: {exc}")
        continue
    base_dir = page.parent
    if parser.base:
        base_parts = urlsplit(parser.base)
        if not base_parts.scheme and not base_parts.netloc:
            base_dir = (page.parent / base_parts.path).resolve()
    for tag, attr, raw in parser.refs:
        raw = raw.strip()
        parts = urlsplit(raw)
        if not raw or parts.scheme or parts.netloc or raw.startswith(("#", "//")):
            continue
        target = (base_dir / parts.path).resolve() if parser.base else (page.parent / parts.path).resolve()
        try:
            target.relative_to(ROOT.resolve())
        except ValueError:
            errors.append(f"{page.relative_to(ROOT)}: local {attr} escapes site root: {raw}")
            continue
        if target.is_dir():
            target = target / "index.html"
        if parts.path and not target.is_file():
            errors.append(f"{page.relative_to(ROOT)}: broken local {attr}: {raw}")

if errors:
    print("PUBLIC SITE VERIFICATION FAILED")
    for error in errors:
        print(" - " + error)
    sys.exit(1)
print(f"PUBLIC SITE VERIFICATION PASSED: {len(html_files)} HTML pages scanned; {len(REQUIRED)} required destinations present.")
