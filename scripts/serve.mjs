import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
const root = resolve("dist");
const csp =
  "default-src 'none'; script-src 'self'; worker-src 'self'; style-src 'self'; connect-src 'none'; img-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'";
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".csv": "text/csv",
  ".json": "application/json",
};
createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  const path = resolve(
    root,
    "." + (pathname === "/" ? "/index.html" : pathname),
  );
  res.setHeader("Content-Security-Policy", csp);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET" || !path.startsWith(root + "/")) {
    res.writeHead(404);
    res.end();
    return;
  }
  try {
    const bytes = await readFile(path);
    res.setHeader(
      "Content-Type",
      mime[extname(path)] ?? "application/octet-stream",
    );
    res.end(bytes);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(Number(process.env.ODC_PREVIEW_PORT ?? 4173), "127.0.0.1", () =>
  console.log("Production preview: http://127.0.0.1:4173"),
);
