# rasmalai-daily

**Curiosity dumps**: one new thing I learnt each day, summarised. Same paper-and-ink look as [rasmalai.tech](https://rasmalai.tech/).

Plain Markdown in, plain HTML out. No framework; `marked` is the only dependency.

## Writing today's dump

```bash
npm run new "How DNS actually resolves"
```

That creates `content/dumps/2026-11-10-how-dns-actually-resolves.md` (dated by IST):

```md
---
title: How DNS actually resolves
summary: One or two lines. Shown as the tl;dr and on the home page.
tags: [networking, dns]
---

## What I learnt
...
```

Write it, then commit and push. The host rebuilds the site for you.

- `draft: true` in the front matter hides an entry.
- `date: 2026-11-08` overrides the date in the filename (for backfilling).
- Images go in `public/` (e.g. `public/img/dns.png`, referenced as `/img/dns.png`).

## Preview locally

```bash
npm install
npm run dev     # builds, then serves on http://localhost:4321
```

## What you get

- Home page: a year-of-days grid (streak + best streak), entries grouped by month
- Entry pages: "Day N", tl;dr box, tags, prev/next
- `/tags/` topic pages, `/about/` (from `content/about.md`)
- `feed.xml` (RSS), `sitemap.xml`, `404.html`

Site-wide settings (title, URL, socials, timezone) are in `src/config.mjs`.

## Deploy (Cloudflare Pages)

1. Cloudflare dashboard → Workers & Pages → Create → Pages → connect this repo.
2. Build command: `npm run build`. Output directory: `dist`.
3. Custom domains → add `daily.rasmalai.tech`.

The streak grid is computed at build time, so it updates every time you push.
