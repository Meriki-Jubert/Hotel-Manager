import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');
const INDEX_HTML = path.join(DIST_DIR, 'index.html');
const MAX_ENTRY_BYTES = 900 * 1024;

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

if (!fs.existsSync(INDEX_HTML) || !fs.existsSync(ASSETS_DIR)) {
  console.error('Error: dist/index.html or dist/assets missing. Run "npm run build" first.');
  process.exit(1);
}

const html = fs.readFileSync(INDEX_HTML, 'utf8');
const scriptMatch = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/i)
  || html.match(/<script[^>]+src="([^"]+)"[^>]+type="module"/i);

if (!scriptMatch) {
  console.error('Error: Could not find module entry script in dist/index.html');
  process.exit(1);
}

const entrySrc = scriptMatch[1].replace(/^\//, '');
const entryFilename = path.basename(entrySrc);

const files = fs.readdirSync(ASSETS_DIR)
  .map((name) => {
    const fullPath = path.join(ASSETS_DIR, name);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) return null;
    const buf = fs.readFileSync(fullPath);
    const gzipBytes = zlib.gzipSync(buf).length;
    return { name, bytes: stat.size, gzipBytes };
  })
  .filter(Boolean)
  .sort((a, b) => b.bytes - a.bytes);

const entryFile = files.find((f) => f.name === entryFilename);
if (!entryFile) {
  console.error(`Error: Entry file "${entryFilename}" not found in dist/assets`);
  process.exit(1);
}

console.log(`Entry JS (${entryFile.name}): ${formatKb(entryFile.bytes)} raw | ${formatKb(entryFile.gzipBytes)} gzip (limit: ${formatKb(MAX_ENTRY_BYTES)})`);
console.log('Top assets in dist/assets:');
for (const file of files.slice(0, 12)) {
  const marker = file.name === entryFilename ? ' [entry]' : '';
  console.log(`  - ${file.name}${marker}: ${formatKb(file.bytes)} raw | ${formatKb(file.gzipBytes)} gzip`);
}

if (entryFile.bytes > MAX_ENTRY_BYTES) {
  console.error(`FAIL: Entry JS ${entryFile.name} (${formatKb(entryFile.bytes)}) exceeds 900 KB limit.`);
  process.exit(1);
}

console.log('PASS: Entry bundle is within the 900 KB limit.');
