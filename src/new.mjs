// npm run new "How DNS actually resolves"
// Creates content/dumps/YYYY-MM-DD-slug.md with today's date and a template.

import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { site } from "./config.mjs";

const title = process.argv.slice(2).join(" ").trim();
if (!title) {
  console.error('usage: npm run new "What I learnt today"');
  process.exit(1);
}

const date = new Intl.DateTimeFormat("en-CA", {
  timeZone: site.timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const slug = title
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "content", "dumps");
mkdirSync(dir, { recursive: true });
const file = join(dir, `${date}-${slug}.md`);
if (existsSync(file)) {
  console.error(`already exists: ${file}`);
  process.exit(1);
}

writeFileSync(
  file,
  `---
title: ${title}
summary: One or two lines. If future-me reads only this, what should stick?
tags: []
---

## What I was curious about

## What I learnt

## The surprising bit

## Where I learnt it
-
`
);

console.log(`created ${file.replace(process.cwd() + "/", "")}`);
