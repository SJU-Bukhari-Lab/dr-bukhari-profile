# Syed Ahmad Chan Bukhari Academic Profile Website

A polished, responsive, GitHub Pages-ready static website designed to showcase Dr. Syed Ahmad Chan Bukhari’s academic leadership, research, selected scholarship, commentary, and public resources.

## Design direction

- Visual continuity with the Bukhari Lab website through a burgundy, gold, charcoal, and warm-neutral palette
- Personal academic profile structure inspired by modern researcher portfolio websites
- Compact sticky navigation, large editorial typography, modular cards, research-network visuals, and dark mode
- No date labels are displayed anywhere in the public interface

## Pages

- `index.html` — Academic profile homepage
- `research.html` — Research pillars and selected active projects
- `scholarship.html` — Filterable selected-publications portfolio
- `leadership.html` — Positions, education, teaching, recognition, and mentorship
- `resources.html` — LinkedIn commentary, YouTube, software, standards, and media
- `connect.html` — Institutional and scholarly contact channels

## Deployment

This is a dependency-free static site. Push the folder to a GitHub repository and enable GitHub Pages from the repository root.

For a custom domain, add a `CNAME` file containing the domain after the domain has been selected.

## Local preview

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Content safety choices

The site intentionally excludes:

- personal email address
- telephone number and office room
- grant proposals still under review or only planned
- exact grant amounts and funding periods
- private operational details
- individual student names from mentorship records
- full CV publication and service lists

The institutional email is used as the only direct contact address.
