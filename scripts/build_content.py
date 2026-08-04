#!/usr/bin/env python3
"""Render the curated talks and media archives from repository JSON files.

The generated cards remain committed in the HTML for search engines and no-JavaScript
visitors. Edit the JSON files, then run this script and review the resulting diff.
"""
from __future__ import annotations

import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

TALK_ICON = {
    "keynote": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v12H8z"></path><path d="M5 8h3M16 8h3M12 16v4M8 20h8"></path></svg>',
    "conference": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16M6 17V7h12v10"></path><path d="M9 11h6M9 14h4"></path></svg>',
    "workshop": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3"></circle><circle cx="16" cy="8" r="3"></circle><path d="M3 19c.5-3.4 2.2-5 5-5s4.5 1.6 5 5M11 19c.5-3.4 2.2-5 5-5s4.5 1.6 5 5"></path></svg>',
}


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def render_event(item: dict[str, object]) -> str:
    icon = TALK_ICON.get(str(item.get("format", "")), TALK_ICON["conference"])
    return f'''<article class="talks-event-card" data-talk-card data-content-id="{esc(item['id'])}" data-category="{esc(item['format'])}" data-search="{esc(item['search'])}">
  <div class="talks-event-card-top"><span class="talks-event-icon" aria-hidden="true">{icon}</span><span class="talks-event-year">{esc(item['year'])}</span></div>
  <span class="talks-event-type">{esc(item['type'])}</span>
  <h3>{esc(item['title'])}</h3>
  <p class="talks-event-venue">{esc(item['venue'])}</p>
  <p>{esc(item['summary'])}</p>
  <details><summary>Event details <span aria-hidden="true">+</span></summary><div><p>{esc(item['details'])}</p><a href="{esc(item['source_url'])}" target="_blank" rel="noopener">{esc(item['source_label'])} →</a></div></details>
</article>'''


def render_media(item: dict[str, object]) -> str:
    return f'''<article class="media-archive-card" data-media-card data-content-id="{esc(item['id'])}" data-category="{esc(item['category'])}" data-search="{esc(item['search'])}">
  <div class="media-card-top"><span class="media-card-icon" aria-hidden="true">{esc(item['icon'])}</span><time datetime="{esc(item['date'])}">{esc(item['year'])}</time></div>
  <p class="media-card-kicker">{esc(item['kicker'])}</p>
  <h3>{esc(item['title'])}</h3>
  <p>{esc(item['summary'])}</p>
  <a href="{esc(item['source_url'])}" target="_blank" rel="noopener">{esc(item['source_label'])} <span aria-hidden="true">↗</span></a>
</article>'''


def validate_records(records: list[dict[str, object]], *, kind: str, categories: set[str], required: set[str]) -> None:
    seen: set[str] = set()
    for index, item in enumerate(records, start=1):
        missing = sorted(field for field in required if not str(item.get(field, "")).strip())
        if missing:
            raise ValueError(f"{kind} record {index} is missing: {', '.join(missing)}")
        identifier = str(item["id"])
        if identifier in seen:
            raise ValueError(f"Duplicate {kind} record ID: {identifier}")
        seen.add(identifier)
        category_field = "format" if kind == "event" else "category"
        category = str(item.get(category_field, ""))
        if category not in categories:
            raise ValueError(f"Unknown {kind} category {category!r} for {identifier}")
        source = str(item.get("source_url", ""))
        if not source.startswith("https://"):
            raise ValueError(f"{kind} record {identifier} requires an HTTPS source URL")


def replace_region(path: Path, start_marker: str, end_marker: str, content: str) -> None:
    source = path.read_text(encoding="utf-8")
    start = source.find(start_marker)
    end = source.find(end_marker)
    if start < 0 or end < 0 or end < start:
        raise RuntimeError(f"Missing generated-content markers in {path.name}")
    start += len(start_marker)
    updated = source[:start] + "\n" + content.rstrip() + "\n" + source[end:]
    path.write_text(updated, encoding="utf-8")


def main() -> None:
    events = json.loads((ROOT / "assets/data/events.json").read_text(encoding="utf-8"))["events"]
    media = json.loads((ROOT / "assets/data/media-coverage.json").read_text(encoding="utf-8"))["items"]
    validate_records(
        events,
        kind="event",
        categories={"keynote", "conference", "workshop"},
        required={"id", "year", "format", "type", "title", "venue", "summary", "details", "source_url", "source_label", "search"},
    )
    validate_records(
        media,
        kind="media",
        categories={"funding", "recognition", "interview", "highlight"},
        required={"id", "date", "year", "category", "icon", "kicker", "title", "summary", "source_url", "source_label", "search"},
    )
    replace_region(
        ROOT / "talks-events.html",
        "<!-- EVENTS:START -->",
        "<!-- EVENTS:END -->",
        "\n".join(render_event(item) for item in events),
    )
    replace_region(
        ROOT / "media-coverage.html",
        "<!-- MEDIA:START -->",
        "<!-- MEDIA:END -->",
        "\n".join(render_media(item) for item in media),
    )
    print(f"Rendered {len(events)} events and {len(media)} media records.")


if __name__ == "__main__":
    main()
