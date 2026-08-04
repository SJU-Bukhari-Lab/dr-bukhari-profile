#!/usr/bin/env python3
"""Run dependency-free integrity, accessibility, and factual-regression checks."""
from __future__ import annotations

import json
import re
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
FULL_PAGES = [
    "index.html", "research.html", "talks-events.html", "media-coverage.html",
    "connect.html", "leadership.html", "404.html",
]
EXPECTED_NAV = ["Home", "Research", "Talks and Events", "Media Coverage", "Connect"]
FORBIDDEN_TEXT = {
    "0000-0002-" + "7237-180X": "incorrect ORCID",
    "PhD in Artificial " + "Intelligence": "incorrect formal degree title",
    "Dr. Bukhari at " + "Microsoft": "unverified image description",
    "--" + "wine": "obsolete color-token name",
    "assets/js/" + "research.js": "obsolete research-only script",
}


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tags: list[tuple[str, dict[str, str]]] = []
        self.ids: list[str] = []
        self.title_parts: list[str] = []
        self._in_title = False
        self._nav_depth = 0
        self._in_nav_anchor = False
        self._nav_anchor_parts: list[str] = []
        self.nav_labels: list[str] = []
        self.structured_data: list[str] = []
        self._in_jsonld = False
        self._jsonld_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs_list: list[tuple[str, str | None]]) -> None:
        attrs = {name: value or "" for name, value in attrs_list}
        self.tags.append((tag, attrs))
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        if tag == "title":
            self._in_title = True
        if tag == "nav" and "data-site-nav" in attrs:
            self._nav_depth = 1
        elif self._nav_depth:
            self._nav_depth += 1
        if tag == "a" and self._nav_depth:
            self._in_nav_anchor = True
            self._nav_anchor_parts = []
        if tag == "script" and attrs.get("type") == "application/ld+json":
            self._in_jsonld = True
            self._jsonld_parts = []

    def handle_startendtag(self, tag: str, attrs_list: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs_list)
        self.handle_endtag(tag)

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title_parts.append(data)
        if self._in_nav_anchor:
            self._nav_anchor_parts.append(data)
        if self._in_jsonld:
            self._jsonld_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False
        if tag == "a" and self._in_nav_anchor:
            label = " ".join("".join(self._nav_anchor_parts).split())
            self.nav_labels.append(label)
            self._in_nav_anchor = False
            self._nav_anchor_parts = []
        if self._nav_depth:
            self._nav_depth -= 1
        if tag == "script" and self._in_jsonld:
            self.structured_data.append("".join(self._jsonld_parts).strip())
            self._in_jsonld = False
            self._jsonld_parts = []

    @property
    def title(self) -> str:
        return " ".join("".join(self.title_parts).split())

    def find(self, tag: str, **required: str) -> dict[str, str] | None:
        for candidate, attrs in self.tags:
            if candidate == tag and all(attrs.get(key) == value for key, value in required.items()):
                return attrs
        return None

    def find_attr(self, tag: str, attribute: str) -> list[dict[str, str]]:
        return [attrs for candidate, attrs in self.tags if candidate == tag and attribute in attrs]


errors: list[str] = []


def fail(message: str) -> None:
    errors.append(message)


for json_path in sorted((ROOT / "assets/data").glob("*.json")):
    try:
        json.loads(json_path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"Invalid JSON: {json_path.relative_to(ROOT)}: {exc}")

page_ids: dict[str, set[str]] = {}
for relative in FULL_PAGES:
    path = ROOT / relative
    source = path.read_text(encoding="utf-8")
    parser = PageParser()
    parser.feed(source)
    page_ids[relative] = set(parser.ids)

    if not parser.title:
        fail(f"{relative}: missing title")
    if not parser.find("meta", name="description"):
        fail(f"{relative}: missing meta description")
    canonical = parser.find("link", rel="canonical")
    if relative != "404.html" and not canonical:
        fail(f"{relative}: missing canonical URL")
    if relative == "404.html":
        robots = parser.find("meta", name="robots")
        if not robots or "noindex" not in robots.get("content", ""):
            fail("404.html: missing noindex directive")
        if canonical:
            fail("404.html: should not declare a canonical URL")
    if not parser.find("meta", property="og:image"):
        fail(f"{relative}: missing Open Graph image")
    if not parser.find("meta", name="twitter:card"):
        fail(f"{relative}: missing Twitter card metadata")
    if relative != "404.html":
        if not parser.structured_data:
            fail(f"{relative}: missing structured data")
        for block in parser.structured_data:
            try:
                json.loads(block)
            except Exception as exc:
                fail(f"{relative}: invalid JSON-LD: {exc}")

    if parser.nav_labels != EXPECTED_NAV:
        fail(f"{relative}: unexpected primary navigation {parser.nav_labels}")
    nav = parser.find("nav", id="primary-navigation")
    if not nav or "data-site-nav" not in nav:
        fail(f"{relative}: navigation is missing its stable ID")
    menu = next((attrs for tag, attrs in parser.tags if tag == "button" and "data-menu-toggle" in attrs), None)
    if menu and menu.get("aria-controls") != "primary-navigation":
        fail(f"{relative}: menu button is missing aria-controls")

    duplicates = [identifier for identifier, count in Counter(parser.ids).items() if count > 1]
    if duplicates:
        fail(f"{relative}: duplicate IDs: {', '.join(sorted(duplicates))}")

    for img in parser.find_attr("img", "src"):
        src = img.get("src", "")
        if not src:  # The dialog image receives its source at runtime.
            continue
        if "alt" not in img:
            fail(f"{relative}: image missing alt text: {src}")
        if not img.get("width") or not img.get("height"):
            fail(f"{relative}: image missing intrinsic dimensions: {src}")
        if not img.get("loading"):
            fail(f"{relative}: image missing loading hint: {src}")
        if not src.startswith(("http://", "https://", "data:")):
            asset = ROOT / src.split("?", 1)[0]
            if not asset.exists():
                fail(f"{relative}: missing image asset {src}")
        for candidate in img.get("srcset", "").split(","):
            candidate = candidate.strip()
            if not candidate:
                continue
            srcset_path = candidate.split()[0]
            if not srcset_path.startswith(("http://", "https://", "data:")) and not (ROOT / srcset_path).exists():
                fail(f"{relative}: missing srcset asset {srcset_path}")

    for tag, attribute in [("link", "href"), ("script", "src"), ("a", "href")]:
        for attrs in parser.find_attr(tag, attribute):
            value = attrs.get(attribute, "")
            if not value or value.startswith(("mailto:", "tel:", "javascript:")):
                continue
            split = urlsplit(value)
            if split.scheme or split.netloc:
                continue
            local = split.path
            if local and local != "/" and not (ROOT / local).exists():
                fail(f"{relative}: broken local reference {value}")

    # Validate same-page fragments immediately. Cross-page fragments are checked below.
    for attrs in parser.find_attr("a", "href"):
        href = attrs.get("href", "")
        if href.startswith("#") and href[1:] and href[1:] not in page_ids[relative]:
            fail(f"{relative}: missing fragment target {href}")

# Cross-page fragments.
for relative in FULL_PAGES:
    parser = PageParser()
    parser.feed((ROOT / relative).read_text(encoding="utf-8"))
    for attrs in parser.find_attr("a", "href"):
        href = attrs.get("href", "")
        split = urlsplit(href)
        if split.scheme or split.netloc or not split.fragment or not split.path:
            continue
        target_name = split.path
        if target_name in page_ids and split.fragment not in page_ids[target_name]:
            fail(f"{relative}: missing cross-page fragment target {href}")

for redirect in ["resources.html", "scholarship.html"]:
    parser = PageParser()
    parser.feed((ROOT / redirect).read_text(encoding="utf-8"))
    robots = parser.find("meta", name="robots")
    if not robots or "noindex" not in robots.get("content", ""):
        fail(f"{redirect}: redirect page must be noindex")

for path in ROOT.rglob("*"):
    if not path.is_file() or ".git" in path.parts or path.name == "validate_site.py":
        continue
    if path.suffix.lower() not in {".html", ".css", ".js", ".json", ".md", ".py", ".yml", ".yaml"}:
        continue
    text = path.read_text(encoding="utf-8", errors="ignore")
    for phrase, label in FORBIDDEN_TEXT.items():
        if phrase in text:
            fail(f"{path.relative_to(ROOT)}: contains {label}: {phrase}")

if "<!-- EVENTS:START -->" not in (ROOT / "talks-events.html").read_text(encoding="utf-8"):
    fail("talks-events.html: missing generated archive markers")
if "<!-- MEDIA:START -->" not in (ROOT / "media-coverage.html").read_text(encoding="utf-8"):
    fail("media-coverage.html: missing generated archive markers")

if errors:
    print("Site validation failed:")
    for error in sorted(set(errors)):
        print(f"- {error}")
    raise SystemExit(1)

print("Site validation passed.")
