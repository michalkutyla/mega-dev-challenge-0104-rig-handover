// Plan morning-digest § 3: save one rig page as one self-contained HTML file (ADR 0001, 0003).
// Renders through the app itself, so the copy is exactly what the lane serves.
// usage: tsx --env-file-if-exists=.env scripts/save-page.ts /digest/2026-10-28 var/preview/index.html
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApp } from '../src/app.js';

const [path, out] = process.argv.slice(2);
if (!path || !out) {
  console.error('usage: save-page <path> <out.html>');
  process.exit(2);
}

const res = await createApp().request(path);
if (res.status !== 200) {
  console.error(`${path}: ${res.status}`);
  process.exit(1);
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, await res.text());
console.log(`${path} → ${out} · marker: ${process.env.LANE_MARKER?.trim() || 'none'}`);
