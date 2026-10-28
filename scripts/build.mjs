// Reproducible build: bundles main, preload and renderers with esbuild into dist/.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'dist');
const prod = process.argv.includes('--prod');
fs.rmSync(out, { recursive: true, force: true });

const common = { bundle: true, loader: { '.md': 'text' }, sourcemap: prod ? false : 'linked', minify: prod, target: 'es2023', logLevel: 'warning', legalComments: 'none' };

await Promise.all([
  build({ ...common, entryPoints: [path.join(root, 'src/main/index.ts')], outfile: path.join(out, 'main/index.js'), platform: 'node', format: 'cjs', external: ['electron', 'koffi'] }),
  build({ ...common, entryPoints: [path.join(root, 'src/preload/preload.ts')], outfile: path.join(out, 'preload/preload.js'), platform: 'node', format: 'cjs', external: ['electron'] }),
  build({ ...common, entryPoints: { theatre: path.join(root, 'src/renderer/theatre.ts'), trail: path.join(root, 'src/renderer/trail.ts'), intro: path.join(root, 'src/renderer/intro.ts'), taskbar: path.join(root, 'src/renderer/taskbar.ts'), character: path.join(root, 'src/renderer/character/main.ts'), panel: path.join(root, 'src/renderer/panel/main.ts'), panelStartup: path.join(root, 'src/renderer/panel/startup.ts'), bubble: path.join(root, 'src/renderer/bubble.ts') }, outdir: path.join(out, 'renderer'), platform: 'browser', format: 'iife' }),
]);
for (const f of ['theatre.html', 'theatre.css', 'trail.html', 'trail.css', 'intro.html', 'intro.css', 'taskbar.html', 'taskbar.css', 'character.html', 'panel.html', 'panel.css', 'bubble.html', 'bubble.css']) {
  const src = path.join(root, 'src/renderer', f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(out, 'renderer', f));
}
// real-footage cut-outs for the character (see assets/capri/SOURCES.md)
const capri = path.join(root, 'assets', 'capri');
if (fs.existsSync(capri)) fs.cpSync(capri, path.join(out, 'renderer', 'capri'), { recursive: true, filter: (f) => !f.endsWith('.md') });
console.log(`built ${prod ? 'production' : 'development'} bundle → dist/`);

const fontOut = path.join(out, 'renderer', 'fonts');
fs.mkdirSync(fontOut, { recursive: true });
for (const [name, file] of [['chakra-petch', 'chakra-petch-latin-600-normal.woff2'], ['jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff2']]) {
  fs.copyFileSync(path.join(root, 'node_modules', '@fontsource', name, 'files', file), path.join(fontOut, file));
}
