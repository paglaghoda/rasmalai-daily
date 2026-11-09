// Minimal static server for previewing dist/ locally: npm run dev
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".svg": "image/svg+xml", ".xml": "application/xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp" };
const port = Number(process.env.PORT) || 4321;

createServer(async (req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(dist, p);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { "content-type": types[".html"] });
    res.end(await readFile(join(dist, "404.html")).catch(() => "404"));
  }
}).listen(port, () => console.log(`http://localhost:${port}`));
