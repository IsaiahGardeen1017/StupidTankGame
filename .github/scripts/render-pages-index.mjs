import { readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const pagesRoot = process.argv[2] ?? ".";
const entries = await readdir(pagesRoot, { withFileTypes: true });
const previews = [];

for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === ".git") {
        continue;
    }

    const indexPath = path.join(pagesRoot, entry.name, "index.html");

    try {
        await stat(indexPath);
        previews.push(entry.name);
    } catch {
        // Ignore folders that are not branch preview builds.
    }
}

previews.sort((a, b) => a.localeCompare(b));

const links = previews.length === 0
    ? "<p>No branch previews have been deployed yet.</p>"
    : `<ul>${previews.map((preview) =>
        `<li><a href="./${escapeHtml(preview)}/">${escapeHtml(preview)}</a></li>`
    ).join("\n")}</ul>`;

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Stupid Tank Game branch previews</title>
    <style>
      :root {
        color: #e8f2e8;
        background: #0b120d;
        font-family: system-ui, sans-serif;
      }

      body {
        max-width: 48rem;
        margin: 3rem auto;
        padding: 0 1.25rem;
      }

      a {
        color: #b8ff91;
      }

      li {
        margin: 0.5rem 0;
      }
    </style>
  </head>
  <body>
    <h1>Stupid Tank Game branch previews</h1>
    <p>Each link opens the latest successful GitHub Pages deployment for that branch.</p>
    ${links}
  </body>
</html>
`;

await writeFile(path.join(pagesRoot, "index.html"), html);

function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
