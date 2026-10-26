// Gera evento/preview.html: um único arquivo com a página inteira (código, estilos e imagens embutidos).
// Uso: npm run preview:evento
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "node_modules", ".cache", "evento-preview");
mkdirSync(outDir, { recursive: true });

await build({
  root,
  configFile: false,
  logLevel: "warn",
  plugins: [react()],
  resolve: { alias: { "@": path.join(root, "src") } },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "import.meta.env.VITE_PREVIEW": JSON.stringify("1"),
  },
  build: {
    outDir,
    emptyOutDir: true,
    minify: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    lib: {
      entry: path.join(root, "evento", "preview-entry.tsx"),
      formats: ["iife"],
      name: "EventoPreview",
      fileName: () => "preview.js",
    },
  },
});

const js = readFileSync(path.join(outDir, "preview.js"), "utf8").replace(/<\/script/gi, "<\\/script");
const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Encontro de Cases — Altta (prévia)</title><meta name="robots" content="noindex,nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Jost:wght@300;400;500&display=swap">
<style>html,body{margin:0;background:#070707}</style></head>
<body><div id="root"></div><script>${js}</script></body></html>
`;
writeFileSync(path.join(root, "evento", "preview.html"), html);
console.log(`evento/preview.html gerado (${Math.round(html.length / 1024)} KB)`);
