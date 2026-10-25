// Builds the Windows installer. NSIS cannot open include files whose full path
// exceeds 260 chars, so deep project folders are mapped to a temporary drive letter
// (subst) for the duration of the build and unmapped afterwards.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit', env: process.env });

run('node scripts/build.mjs --prod', root);
run('node scripts/licenses.mjs', root);

let cwd = root;
let drive = null;
if (process.platform === 'win32' && root.length > 80) {
  const substs = execSync('subst', { encoding: 'utf8' });
  drive = 'PQRSTUVWXY'.split('').map((l) => `${l}:`).find((d) => !fs.existsSync(`${d}\\`) && !substs.includes(`${d}\\`));
  if (!drive) throw new Error('No free drive letter for subst');
  run(`subst ${drive} "${root}"`, root);
  cwd = `${drive}\\`;
  console.log(`[dist] long path → building via ${drive}`);
}
try {
  run('npx electron-builder --win nsis --publish never', cwd);
} finally {
  if (drive) run(`subst ${drive} /D`, root);
}
const out = path.join(root, 'release');
for (const f of fs.readdirSync(out).filter((x) => x.endsWith('.exe'))) {
  console.log(`[dist] ${f}  ${(fs.statSync(path.join(out, f)).size / 1048576).toFixed(1)} MB`);
}
