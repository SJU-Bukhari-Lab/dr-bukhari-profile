#!/usr/bin/env python3
"""Refresh public Google Scholar metrics through SerpApi.

Requires SERPAPI_KEY. If the secret is absent, the script exits successfully and keeps
existing repository-managed fallback values. The API key is used only in GitHub
Actions and is never written into the public site.
"""
from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

OUT = Path(__file__).resolve().parents[1] / "assets/data/scholar-metrics.json"
AUTHOR_ID = "JhWJ5PEAAAAJ"
key = os.getenv("SERPAPI_KEY", "").strip()
if not key:
    print("SERPAPI_KEY is not configured; keeping existing metrics.")
    raise SystemExit(0)


def request_json(url: str) -> dict[str, Any]:
    parsed = urllib.parse.urlsplit(url)
    query = dict(urllib.parse.parse_qsl(parsed.query))
    query.setdefault("api_key", key)
    secured_url = urllib.parse.urlunsplit(
        (parsed.scheme, parsed.netloc, parsed.path, urllib.parse.urlencode(query), parsed.fragment)
    )
    with urllib.request.urlopen(secured_url, timeout=45) as response:
        return json.load(response)


params = urllib.parse.urlencode(
    {
        "engine": "google_scholar_author",
        "author_id": AUTHOR_ID,
        "hl": "en",
        "num": 100,
        "api_key": key,
    }
)
data = request_json(f"https://serpapi.com/search.json?{params}")

# Google Scholar exposes citation count, h-index, and i10-index as one-key rows.
metrics: dict[str, str] = {}
aliases = {
    "citations": "citations",
    "citation": "citations",
    "h_index": "h_index",
    "h-index": "h_index",
    "indice_h": "h_index",
    "i10_index": "i10_index",
    "i10-index": "i10_index",
    "indice_i10": "i10_index",
}
for row in data.get("cited_by", {}).get("table", []):
    if not isinstance(row, dict):
        continue
    for raw_name, values in row.items():
        name = str(raw_name).lower().replace(" ", "_")
        destination = aliases.get(name)
        if not destination:
            if "i10" in name:
                destination = "i10_index"
            elif name in {"h", "hindex"} or ("h" in name and "index" in name):
                destination = "h_index"
            elif "citation" in name:
                destination = "citations"
        if destination and isinstance(values, dict) and values.get("all") is not None:
            metrics[destination] = str(values["all"])

# Count all publications by following the author pagination links.
article_ids: set[str] = set()
page = data
for _ in range(10):
    for article in page.get("articles", []):
        identifier = article.get("citation_id") or article.get("link") or article.get("title")
        if identifier:
            article_ids.add(str(identifier))
    next_url = page.get("serpapi_pagination", {}).get("next")
    if not next_url:
        break
    page = request_json(str(next_url))

existing = json.loads(OUT.read_text()) if OUT.exists() else {}
updated = {
    **existing,
    "publications": str(len(article_ids)) if article_ids else existing.get("publications", "130+"),
    **metrics,
    "source": "Google Scholar via SerpApi",
    "profile": f"https://scholar.google.com/citations?user={AUTHOR_ID}&hl=en",
    "status": "Automatically refreshed by GitHub Actions.",
}
OUT.write_text(json.dumps(updated, indent=2) + "\n")
print(f"Updated {OUT}")
