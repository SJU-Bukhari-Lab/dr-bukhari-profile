#!/usr/bin/env python3
"""Refresh public Google Scholar metrics through SerpApi.

The SerpApi credential is read from the SERPAPI_KEY environment variable and is
never written to the repository. Returned values are validated before the public
JSON fallback is replaced.
"""
from __future__ import annotations

import json
import os
import re
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/data/scholar-metrics.json"
AUTHOR_ID = "JhWJ5PEAAAAJ"
PROFILE = f"https://scholar.google.com/citations?user={AUTHOR_ID}&hl=en"
API_ENDPOINT = "https://serpapi.com/search.json"


def read_key() -> str:
    key = os.getenv("SERPAPI_KEY", "").strip()
    if not key:
        print("SERPAPI_KEY is not configured; keeping repository-managed metrics.")
        raise SystemExit(0)
    return key


def request_json(params_or_url: dict[str, object] | str, key: str) -> dict[str, Any]:
    if isinstance(params_or_url, str):
        parsed = urllib.parse.urlsplit(params_or_url)
        query = dict(urllib.parse.parse_qsl(parsed.query))
        query["api_key"] = key
        url = urllib.parse.urlunsplit(
            (parsed.scheme, parsed.netloc, parsed.path, urllib.parse.urlencode(query), parsed.fragment)
        )
    else:
        query = {**params_or_url, "api_key": key}
        url = f"{API_ENDPOINT}?{urllib.parse.urlencode(query)}"
    request = urllib.request.Request(url, headers={"User-Agent": "dr-bukhari-portfolio-metrics/1.0"})
    with urllib.request.urlopen(request, timeout=45) as response:
        return json.load(response)


def integer(value: object, label: str) -> int:
    digits = re.sub(r"[^0-9]", "", str(value))
    if not digits:
        raise ValueError(f"Missing numeric {label} value: {value!r}")
    return int(digits)


def validate(*, publications: int, citations: int, h_index: int, i10_index: int) -> None:
    ranges = {
        "publications": (publications, 50, 1_000),
        "citations": (citations, 1_000, 1_000_000),
        "h-index": (h_index, 10, 300),
        "i10-index": (i10_index, 10, 2_000),
    }
    errors = [f"{name}={value} outside {minimum}–{maximum}" for name, (value, minimum, maximum) in ranges.items() if not minimum <= value <= maximum]
    if h_index > publications or i10_index > publications:
        errors.append("index values cannot exceed the indexed-work count")
    if errors:
        raise ValueError("Scholar metric validation failed: " + "; ".join(errors))


def parse_metrics(data: dict[str, Any]) -> dict[str, int]:
    values: dict[str, int] = {}
    for row in data.get("cited_by", {}).get("table", []):
        if not isinstance(row, dict):
            continue
        for raw_name, raw_values in row.items():
            name = str(raw_name).lower().replace(" ", "_").replace("-", "_")
            if not isinstance(raw_values, dict) or raw_values.get("all") is None:
                continue
            if "i10" in name:
                values["i10_index"] = integer(raw_values["all"], "i10-index")
            elif name in {"h", "hindex", "h_index", "indice_h"} or ("h" in name and "index" in name):
                values["h_index"] = integer(raw_values["all"], "h-index")
            elif "citation" in name:
                values["citations"] = integer(raw_values["all"], "citation")
    missing = {"citations", "h_index", "i10_index"} - values.keys()
    if missing:
        raise ValueError(f"Scholar response did not include: {', '.join(sorted(missing))}")
    return values


def count_articles(first_page: dict[str, Any], key: str) -> int:
    identifiers: set[str] = set()
    page = first_page
    for _ in range(25):
        for article in page.get("articles", []):
            if not isinstance(article, dict):
                continue
            identifier = article.get("citation_id") or article.get("link") or article.get("title")
            if identifier:
                identifiers.add(str(identifier))
        next_url = page.get("serpapi_pagination", {}).get("next")
        if not next_url:
            break
        page = request_json(str(next_url), key)
    return len(identifiers)


def main() -> None:
    key = read_key()
    data = request_json(
        {"engine": "google_scholar_author", "author_id": AUTHOR_ID, "hl": "en", "num": 100},
        key,
    )
    metrics = parse_metrics(data)
    publications = count_articles(data, key)
    validate(publications=publications, **metrics)

    now = datetime.now(timezone.utc)
    publication_label = f"{publications}+" if publications >= 130 else str(publications)
    date_label = f"{now.strftime('%B')} {now.day}, {now.year}"
    updated = {
        "publications": publication_label,
        "citations": f"{metrics['citations']:,}",
        "h_index": str(metrics["h_index"]),
        "i10_index": str(metrics["i10_index"]),
        "source": "Google Scholar via SerpApi",
        "profile": PROFILE,
        "updated_at": now.date().isoformat(),
        "status": f"Automatically verified against Google Scholar on {date_label}.",
    }
    OUT.write_text(json.dumps(updated, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
