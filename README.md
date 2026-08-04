# Dr. Bukhari Professional Portfolio

A dependency-free, GitHub Pages portfolio for Syed Ahmad Chan Bukhari, PhD. The site presents a current academic profile through trustworthy AI and biomedical informatics research, talks and events, media coverage, professional recognition, and clear scholarly contact channels.

## Public information architecture

Primary navigation:

`Home | Research | Talks and Events | Media Coverage | Connect`

The fuller academic profile remains available through the link beneath the homepage portrait. Legacy `scholarship.html` and `resources.html` routes redirect to their current destinations and are marked `noindex`.

## Design and interaction

- Responsive navy, cream, and gold editorial design with light and dark modes
- Accessible sticky navigation and mobile menu behavior
- Native multipage navigation enhanced with cross-document View Transitions
- Searchable and URL-shareable talks and media archives
- Native disclosure components for project details and recognition summaries
- Keyboard-accessible event gallery with previous and next controls
- Open Graph, Twitter card, canonical, and structured-data metadata
- Reduced-motion support and intrinsic image dimensions to limit layout movement

## Local preview

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Content maintenance

The committed HTML remains readable by search engines and visitors without JavaScript. Curated archive records are maintained in:

- `assets/data/events.json`
- `assets/data/media-coverage.json`

After editing either file, regenerate the corresponding HTML cards:

```bash
python3 scripts/build_content.py
```

Then run the repository checks:

```bash
python3 scripts/validate_site.py
```

Time-sensitive research and recognition copy should include an official source and a visible review date. Use institutional announcements, publisher directories, ORCID, and Google Scholar as the primary public references. Do not publish proposals that remain under review, private contact information, internal planning notes, or unverified titles and affiliations.

## Images

Original WebP photographs are stored in `assets/images/`. Responsive `-480.webp` and `-960.webp` variants are committed for faster mobile delivery. To regenerate them after replacing a photograph, install Pillow and run:

```bash
python3 scripts/generate_responsive_images.py
```

Keep meaningful alt text, preserve the original aspect ratio, and confirm permission for prominently featured attendees. Hero imagery should remain eager-loaded; below-the-fold photographs should remain lazy-loaded. `social-card.webp` supplies the 1200×630 sharing preview, while `profile-square.webp` supplies the structured-data profile image.

## Google Scholar metrics

The homepage reads public fallback values from `assets/data/scholar-metrics.json`. No credential is exposed in the browser.

A monthly workflow in `.github/workflows/update-scholar-metrics.yml` can refresh the metrics through SerpApi. Add the repository Actions secret `SERPAPI_KEY` to enable it. The script validates citation, h-index, i10-index, and indexed-work counts before writing the file. When values change, the workflow opens a pull request instead of pushing directly to `main`.

Scheduled workflows run from the repository's default branch, so the automation begins after this work is merged into `main`.

## Custom domain and deployment

`CNAME` is configured for `drahmadcbukhari.com`. GitHub Pages should deploy the static root and enforce HTTPS after DNS verification.

The site is intentionally dependency-free at runtime. CSS and JavaScript files use version query strings to prevent stale browser caches after deployment.
