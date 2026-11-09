// Builds the curiosity dumps site: content/dumps/*.md  ->  dist/
// No framework. Just files in, files out — same spirit as rasmalai.tech.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { site } from "./config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(root, "content", "dumps");
const out = join(root, "dist");

// ---------- helpers ----------

const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const slugify = (s) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const parseDay = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const isoDay = (date) => date.toISOString().slice(0, 10);
const prettyDate = (iso) => {
  const d = parseDay(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
};
const todayInZone = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: site.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

// Tiny front-matter parser: `key: value`, and `tags: [a, b]` or `tags: a, b`.
function parseFrontMatter(raw, file) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing front matter (--- ... ---)`);
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+)\s*:\s*(.*)$/);
    if (!kv) continue;
    let [, key, val] = kv;
    val = val.trim();
    if (key === "tags" || key === "sources") {
      val = val.replace(/^\[|\]$/g, "").split(",").map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    } else {
      val = val.replace(/^["']|["']$/g, "");
      if (val === "true") val = true;
      else if (val === "false") val = false;
    }
    data[key] = val;
  }
  return { data, body: m[2] };
}

// ---------- load entries ----------

function loadDumps() {
  if (!existsSync(contentDir)) return [];
  const files = readdirSync(contentDir).filter((f) => f.endsWith(".md")).sort();
  const dumps = [];
  for (const file of files) {
    const raw = readFileSync(join(contentDir, file), "utf8");
    const { data, body } = parseFrontMatter(raw, file);
    if (data.draft === true) continue;

    const fromName = file.match(/^(\d{4}-\d{2}-\d{2})-?(.*)\.md$/);
    const date = data.date || (fromName && fromName[1]);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`${file}: needs a date (YYYY-MM-DD) in front matter or filename`);
    if (!data.title) throw new Error(`${file}: needs a title`);

    const slug = data.slug || (fromName && fromName[2]) || slugify(data.title);
    dumps.push({
      file,
      date,
      slug,
      title: data.title,
      summary: data.summary || "",
      tags: (data.tags || []).map((t) => slugify(t)).filter(Boolean),
      html: marked.parse(body),
      url: `/${date.slice(0, 4)}/${slug}/`,
    });
  }
  // oldest -> newest, to number the days
  dumps.sort((a, b) => (a.date === b.date ? a.file.localeCompare(b.file) : a.date.localeCompare(b.date)));
  dumps.forEach((d, i) => (d.n = i + 1));
  return dumps;
}

// ---------- layout ----------

function page({ title, description, path, current, body, extraHead = "" }) {
  const nav = [
    ["/", "Dumps", "home"],
    ["/tags/", "Topics", "tags"],
    ["/about/", "About", "about"],
  ]
    .map(([href, label, key]) => `<a href="${href}"${current === key ? ' aria-current="page"' : ""}>${label}</a>`)
    .join("\n    ");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${site.url}${path}">
  <link rel="icon" type="image/svg+xml" href="/rasmalai.svg" sizes="any">
  <link rel="stylesheet" href="/style.css">
  <link rel="alternate" type="application/rss+xml" title="${esc(site.title)}" href="/feed.xml">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${site.url}${path}">
  <meta property="og:site_name" content="${esc(site.title)}">
${extraHead}</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <nav class="top" aria-label="Main navigation">
    ${nav}
    <a class="home-site" href="${site.mainSite}">${esc(site.mainSiteLabel)} ↗</a>
  </nav>

  <main id="main">
${body}
  </main>

  <footer>
    <nav aria-label="Find me online">
      ${site.socials.map(([label, href]) => `<a href="${href}">${esc(label)}</a>`).join("\n      ")}
      <a href="/feed.xml">RSS</a>
    </nav>
  </footer>
</body>
</html>
`;
}

const tagList = (tags) =>
  tags.length ? `<ul class="tags">${tags.map((t) => `<li><a href="/tags/${t}/">${t}</a></li>`).join("")}</ul>` : "";

function dumpList(dumps) {
  // newest first, grouped by month
  const groups = new Map();
  for (const d of [...dumps].reverse()) {
    const dt = parseDay(d.date);
    const key = `${MONTHS_LONG[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(d);
  }
  let html = "";
  for (const [month, items] of groups) {
    html += `    <h2 class="month">${month}</h2>
    <ul class="dumps">
${items
  .map(
    (d) => `      <li>
        <div class="project-heading">
          <a href="${d.url}">${esc(d.title)}</a>
          <time datetime="${d.date}">${prettyDate(d.date)}</time>
        </div>
        ${d.summary ? `<p>${esc(d.summary)}</p>` : ""}
      </li>`
  )
  .join("\n")}
    </ul>
`;
  }
  return html;
}

// ---------- streak ----------

function streakStats(dumps) {
  const days = new Set(dumps.map((d) => d.date));
  const today = todayInZone();
  // current streak: count back from today (or yesterday, if today isn't logged yet)
  let cursor = parseDay(today);
  if (!days.has(isoDay(cursor))) cursor = new Date(cursor.getTime() - 864e5);
  let current = 0;
  while (days.has(isoDay(cursor))) {
    current++;
    cursor = new Date(cursor.getTime() - 864e5);
  }
  // longest streak
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const d of [...days].sort()) {
    const t = parseDay(d).getTime();
    run = prev !== null && t - prev === 864e5 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = t;
  }
  return { days, today, current, longest };
}

function streakGrid(dumps) {
  const { days, today, current, longest } = streakStats(dumps);
  const byDay = new Map();
  for (const d of dumps) if (!byDay.has(d.date)) byDay.set(d.date, d);

  // a year of weeks ending this week, weeks start Monday
  const WEEKS = 53; // a year; the CSS trims to ~half on phones
  const t = parseDay(today);
  const dow = (t.getUTCDay() + 6) % 7; // 0 = Mon
  const start = new Date(t.getTime() - (dow + (WEEKS - 1) * 7) * 864e5);

  const cells = [];
  for (let i = 0; i < WEEKS * 7; i++) {
    const day = isoDay(new Date(start.getTime() + i * 864e5));
    const entry = byDay.get(day);
    const cls = [entry ? "on" : "", day === today ? "today" : "", day > today ? "future" : ""].filter(Boolean).join(" ");
    const label = entry ? `${prettyDate(day)}: ${entry.title}` : prettyDate(day);
    cells.push(
      entry
        ? `<span class="${cls}" title="${esc(label)}"><a href="${entry.url}" aria-label="${esc(label)}"></a></span>`
        : `<span${cls ? ` class="${cls}"` : ""} title="${esc(label)}"></span>`
    );
  }

  const total = days.size;
  return `    <section class="streak" aria-label="Days I wrote something">
      <div class="streak-grid">${cells.join("")}</div>
      <p class="streak-meta">
        <span>${total} ${total === 1 ? "day" : "days"} of learning</span>
        <span>streak: ${current} ${current === 1 ? "day" : "days"} · best: ${longest}</span>
      </p>
    </section>
`;
}

// ---------- pages ----------

function writePage(path, html) {
  const dir = join(out, path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
}

function build() {
  const dumps = loadDumps();
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  // static files
  cpSync(join(root, "public"), out, { recursive: true });
  cpSync(join(root, "src", "style.css"), join(out, "style.css"));

  // home
  writePage(
    "/",
    page({
      title: site.title,
      description: site.description,
      path: "/",
      current: "home",
      body: `    <header>
      <h1>${esc(site.heading)}</h1>
      <p class="muted">${site.tagline}</p>
    </header>

${streakGrid(dumps)}
${dumps.length ? dumpList(dumps) : `    <p class="muted">Nothing here yet. Day one starts soon.</p>\n`}
    <p class="signoff">${esc(site.signoff)}</p>`,
    })
  );

  // entries
  dumps.forEach((d, i) => {
    const prev = dumps[i - 1];
    const next = dumps[i + 1];
    writePage(
      d.url,
      page({
        title: `${d.title} — ${site.title}`,
        description: d.summary || d.title,
        path: d.url,
        body: `    <article>
      <header class="article-header">
        <p class="article-date muted">Day ${d.n} · <time datetime="${d.date}">${prettyDate(d.date)}</time></p>
        <h1>${esc(d.title)}</h1>
        ${tagList(d.tags)}
      </header>
${d.summary ? `
      <aside class="tldr">
        <strong>tl;dr</strong>
        <p>${esc(d.summary)}</p>
      </aside>
` : ""}
${d.html}
    </article>

    <nav class="pager" aria-label="More dumps">
      ${prev ? `<a class="prev" href="${prev.url}"><small>← Day ${prev.n}</small>${esc(prev.title)}</a>` : ""}
      ${next ? `<a class="next" href="${next.url}"><small>Day ${next.n} →</small>${esc(next.title)}</a>` : ""}
    </nav>`,
      })
    );
  });

  // tags
  const tags = new Map();
  for (const d of dumps) for (const t of d.tags) (tags.get(t) || tags.set(t, []).get(t)).push(d);
  const sortedTags = [...tags].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  writePage(
    "/tags/",
    page({
      title: `Topics — ${site.title}`,
      description: "Everything I've poked at, by topic.",
      path: "/tags/",
      current: "tags",
      body: `    <header>
      <h1>Topics</h1>
      <p class="muted">Everything I’ve poked at, by topic.</p>
    </header>

    <ul class="writing-list">
${sortedTags.map(([t, ds]) => `      <li><a href="/tags/${t}/">#${t}</a><span class="muted">${ds.length}</span></li>`).join("\n") || '      <li class="muted">No topics yet.</li>'}
    </ul>`,
    })
  );

  for (const [t, ds] of tags) {
    writePage(
      `/tags/${t}/`,
      page({
        title: `#${t} — ${site.title}`,
        description: `Curiosity dumps about ${t}.`,
        path: `/tags/${t}/`,
        current: "tags",
        body: `    <header>
      <h1>#${esc(t)}</h1>
      <p class="muted">${ds.length} ${ds.length === 1 ? "dump" : "dumps"}. <a href="/tags/">All topics</a></p>
    </header>

${dumpList(ds)}`,
      })
    );
  }

  // about
  const aboutPath = join(root, "content", "about.md");
  const about = existsSync(aboutPath) ? marked.parse(readFileSync(aboutPath, "utf8")) : "";
  writePage(
    "/about/",
    page({
      title: `About — ${site.title}`,
      description: site.description,
      path: "/about/",
      current: "about",
      body: `    <article>
${about}
    </article>`,
    })
  );

  // 404
  writeFileSync(
    join(out, "404.html"),
    page({
      title: `Not found — ${site.title}`,
      description: "Not found.",
      path: "/404",
      body: `    <header>
      <h1>Haven’t learnt this one yet.</h1>
      <p class="muted">Nothing lives at this address. <a href="/">Back to the dumps →</a></p>
    </header>`,
    })
  );

  // RSS
  const recent = [...dumps].reverse().slice(0, 30);
  writeFileSync(
    join(out, "feed.xml"),
    `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(site.title)}</title>
  <link>${site.url}/</link>
  <description>${esc(site.description)}</description>
  <language>en</language>
  <atom:link href="${site.url}/feed.xml" rel="self" type="application/rss+xml"/>
${recent
  .map(
    (d) => `  <item>
    <title>${esc(d.title)}</title>
    <link>${site.url}${d.url}</link>
    <guid>${site.url}${d.url}</guid>
    <pubDate>${parseDay(d.date).toUTCString()}</pubDate>
    <description>${esc((d.summary ? `<p><em>${esc(d.summary)}</em></p>` : "") + d.html)}</description>
  </item>`
  )
  .join("\n")}
</channel>
</rss>
`
  );

  // sitemap
  const urls = ["/", "/tags/", "/about/", ...dumps.map((d) => d.url), ...[...tags.keys()].map((t) => `/tags/${t}/`)];
  writeFileSync(
    join(out, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${site.url}${u}</loc></url>`).join("\n")}
</urlset>
`
  );

  console.log(`built ${dumps.length} dump${dumps.length === 1 ? "" : "s"}, ${tags.size} topic${tags.size === 1 ? "" : "s"} → dist/`);
}

build();
