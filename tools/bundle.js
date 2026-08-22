#!/usr/bin/env node
/**
 * Bundles the game into one self-contained HTML file.
 *
 * A published artifact is served under a strict CSP that blocks every external
 * request except Google Fonts, so the script and the stylesheet have to be
 * inlined rather than linked. The page body is lifted straight out of
 * index.html, which keeps the hosted build and the local build the same page
 * instead of two drifting copies.
 *
 *   node tools/bundle.js [outfile]      # default: dist/play.html
 */
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, process.argv[2] ?? 'dist/play.html');

const FONTS =
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Spectral:wght@400;600&display=swap';

/** Everything between <body> and </body> in index.html, minus the script tag. */
function extractBody(html) {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!match) throw new Error('index.html has no <body>');
  return match[1].replace(/<script\b[\s\S]*?<\/script>/gi, '').trim();
}

const [css, indexHtml, bundle] = await Promise.all([
  readFile(resolve(root, 'src/ui/styles.css'), 'utf8'),
  readFile(resolve(root, 'index.html'), 'utf8'),
  build({
    entryPoints: [resolve(root, 'src/main.ts')],
    bundle: true,
    format: 'esm',
    target: 'es2022',
    minify: true,
    write: false,
    logLevel: 'warning',
  }).then((result) => result.outputFiles[0].text),
]);

// </script> anywhere inside the code would close the inline script early.
const safeBundle = bundle.replace(/<\/script/gi, '<\\/script');

const page = `<title>Karanlık Arena</title>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="${FONTS}" />
<style>
${css.trim()}
</style>

${extractBody(indexHtml)}

<script type="module">
${safeBundle}
</script>
`;

await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, page, 'utf8');

const kb = (Buffer.byteLength(page) / 1024).toFixed(0);
console.log(`${outFile} — ${kb} KB`);
