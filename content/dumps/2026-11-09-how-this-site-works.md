---
title: How this site works (a static site generator in one file)
summary: A static site generator is just a loop. Read Markdown files, wrap them in an HTML template, write them to a folder. Everything else is decoration.
tags: [web, static-sites, javascript]
---

*Sample entry. It shows what a dump looks like; delete it whenever you want.*

## What I was curious about

Frameworks like Hugo, Jekyll and Astro all promise to "generate" a site. What does that actually mean, and how little code can do it?

## What I learnt

A static site generator does three things:

1. **Read** every Markdown file in a folder.
2. **Convert** each one to HTML and drop it into a page template.
3. **Write** the results to an output folder that any web host can serve as plain files.

The whole loop, minus the details:

```js
for (const file of readdirSync("content/dumps")) {
  const { data, body } = parseFrontMatter(readFileSync(file, "utf8"));
  writePage(`/${data.slug}/`, page({ title: data.title, body: marked.parse(body) }));
}
```

The bit at the top of each file, between the `---` lines, is called **front matter**. It holds metadata (title, date, tags) so the generator can build lists, tag pages and an RSS feed without a database.

## The surprising bit

> There is no server-side code at all once it’s built.

The "dynamic" parts, like the streak grid on the home page or the topic pages, are computed **once, at build time**. The host just serves files. That’s why static sites are fast, free to host, and almost impossible to hack.

| | Static site | Server-rendered |
|---|---|---|
| Runs code per visit | No | Yes |
| Hosting cost | ~free | Needs a server |
| Updates when | You rebuild | Every request |

## Where I learnt it
- [marked](https://marked.js.org/), the Markdown parser this site uses
- [Cloudflare Pages docs](https://developers.cloudflare.com/pages/)
