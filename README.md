# Dr. Bukhari Professional Portfolio

A static GitHub Pages portfolio for Syed Ahmad Chan Bukhari, PhD. The site preserves the original navy-and-gold visual system while organizing the public profile around research, talks and events, media coverage, and scholarly engagement.

## Preview locally

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Event photographs

The homepage gallery is fully styled and currently uses three abstract placeholders:

- `assets/images/event-conference.svg`
- `assets/images/event-talk.svg`
- `assets/images/event-workshop.svg`

Replace these files with optimized `.webp` photographs from the shared Drive folder and update the corresponding paths in `index.html`, or preserve the filenames by exporting the photos under matching names.

Recommended image preparation: 1600px wide, WebP, under 350 KB where practical, meaningful alt text, and written permission for any prominently featured attendees.

## Google Scholar metrics

The browser loads public values from `assets/data/scholar-metrics.json`; no API key is exposed in client-side JavaScript. A monthly GitHub Actions workflow is included in `.github/workflows/update-scholar-metrics.yml`.

To enable automated refreshes, add a repository Actions secret named `SERPAPI_KEY`. Without the secret, the workflow exits safely and retains the repository-managed values. Google Scholar remains the source of record.

## Custom domain

`CNAME` is configured for `drahmadcbukhari.com`. In the DNS provider, point the apex domain to GitHub Pages and configure `www` as a CNAME to `sju-bukhari-lab.github.io`. Then enter `drahmadcbukhari.com` under **Repository Settings → Pages → Custom domain** and enable HTTPS after DNS verification.

## Navigation

Primary navigation:

`Home | Research | Talks and Events | Media Coverage | Connect`

The academic profile remains available through the link beneath the homepage portrait, but it is intentionally excluded from the top menu.
