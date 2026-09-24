import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {inflateSync} from 'node:zlib';
import {FONT_FILE} from '../scripts/font.mjs';
import {siteCodepoints} from '../scripts/font-text.mjs';
import {weaponIcon} from '../dist/erg-icons.js';
import {escapeHtml, formatNumber} from '../dist/format.js';

test('共用格式保留安全跳脫與兩位小數', () => {
  assert.equal(escapeHtml(`<a title="'">&`), '&lt;a title=&quot;&#39;&quot;&gt;&amp;');
  assert.equal(escapeHtml(null), '');
  assert.equal(formatNumber(1234.567), '1,234.57');
});

function woffTables(buffer) {
  assert.equal(buffer.toString('ascii', 0, 4), 'wOFF');
  const tables = new Map();
  for (let i = 0, count = buffer.readUInt16BE(12); i < count; i++) {
    const entry = 44 + i * 20, offset = buffer.readUInt32BE(entry + 4), stored = buffer.readUInt32BE(entry + 8), size = buffer.readUInt32BE(entry + 12);
    const data = buffer.subarray(offset, offset + stored);
    tables.set(buffer.toString('ascii', entry, entry + 4), stored < size ? inflateSync(data) : data);
  }
  return tables;
}

function mappedCodepoints(cmap) {
  const covered = new Set();
  for (let i = 0, count = cmap.readUInt16BE(2); i < count; i++) {
    const table = cmap.subarray(cmap.readUInt32BE(8 + i * 8));
    const format = table.readUInt16BE(0);
    if (format === 12) {
      for (let group = 0, groups = table.readUInt32BE(12); group < groups; group++) {
        const at = 16 + group * 12;
        for (let code = table.readUInt32BE(at), last = table.readUInt32BE(at + 4); code <= last; code++) covered.add(code);
      }
    } else if (format === 4) {
      const segments = table.readUInt16BE(6) / 2;
      for (let segment = 0; segment < segments; segment++) {
        const last = table.readUInt16BE(14 + segment * 2), first = table.readUInt16BE(16 + segments * 2 + segment * 2);
        const delta = table.readInt16BE(16 + segments * 4 + segment * 2), rangeAt = 16 + segments * 6 + segment * 2, range = table.readUInt16BE(rangeAt);
        for (let code = first; code <= last && code !== 0xffff; code++) {
          const raw = range ? table.readUInt16BE(rangeAt + range + (code - first) * 2) : code;
          if (raw && (raw + delta) & 0xffff) covered.add(code);
        }
      }
    }
  }
  return covered;
}

function nameText(name, id) {
  const base = name.readUInt16BE(4), found = [];
  for (let i = 0, count = name.readUInt16BE(2); i < count; i++) {
    const at = 6 + i * 12;
    if (name.readUInt16BE(at) !== 3 || name.readUInt16BE(at + 6) !== id) continue;
    const offset = base + name.readUInt16BE(at + 10);
    found.push(Buffer.from(name.subarray(offset, offset + name.readUInt16BE(at + 8))).swap16().toString('utf16le'));
  }
  return found.join(' ');
}

test('各頁預載自架字型子集，不連外部字型；子集涵蓋網站全部文字、字重 400-700 並保留 OFL 授權', async () => {
  const root = new URL('../dist/', import.meta.url);
  for (const name of await readdir(root)) {
    if (!name.endsWith('.html')) continue;
    const html = await readFile(new URL(name, root), 'utf8');
    assert.ok(html.includes(`<link rel="preload" href="./${FONT_FILE}" as="font" type="font/woff" crossorigin>`), name);
    assert.doesNotMatch(html, /fonts\.(?:googleapis|gstatic)\.com|density\.css\?v=/, name);
  }
  const css = await readFile(new URL('styles.css', root), 'utf8');
  assert.doesNotMatch(css, /@import|fonts\.(?:googleapis|gstatic)\.com/);
  assert.ok(css.includes(`src:url('./${FONT_FILE}') format('woff');font-weight:400 700`));
  const font = await readFile(new URL(FONT_FILE, root));
  assert.ok(font.length < 600 * 1024, `字型 ${font.length} bytes 超出預算`);
  const tables = woffTables(font);
  const covered = mappedCodepoints(tables.get('cmap'));
  const missing = [...await siteCodepoints(fileURLToPath(root))].filter(code => !covered.has(code)).map(code => String.fromCodePoint(code));
  assert.deepEqual(missing, [], '網站文字不在字型子集內，請執行 npm run font');
  const fvar = tables.get('fvar'), axes = fvar.readUInt16BE(4), size = fvar.readUInt16BE(10);
  const wght = Array.from({length:fvar.readUInt16BE(8)}, (_, i) => axes + i * size).find(at => fvar.toString('ascii', at, at + 4) === 'wght');
  assert.ok(fvar.readInt32BE(wght + 4) / 65536 <= 400 && fvar.readInt32BE(wght + 12) / 65536 >= 700);
  assert.match(nameText(tables.get('name'), 0), /Adobe/);
  assert.match(nameText(tables.get('name'), 13), /SIL Open Font License/);
});

test('公開武器圖示皆有使用，暫存與輸入檔不受 Git 追蹤', async () => {
  const root = new URL('../dist/', import.meta.url);
  const {weapons} = JSON.parse(await readFile(new URL('data/erg.json', root)));
  const used = weapons.map(w => weaponIcon(w.id).match(/src="\.\/assets\/weapons-line\/([^"?]+)/)[1]);
  assert.deepEqual((await readdir(new URL('assets/weapons-line/', root))).sort(), used.sort());
  const originals = await readdir(new URL('assets/weapons/', root)).catch(e => {if(e.code==='ENOENT')return [];throw e;});
  assert.equal(originals.length, 0);
  const files = execFileSync('git', ['ls-files','-z'], {encoding:'utf8'}).split('\0').filter(Boolean);
  for (const file of files) assert.doesNotMatch(file, /^(?:source|output|\.pages|node_modules)\/|\.(?:xlsx?|xlsm|xlsb|ods|csv|tsv|bundle)$/i);
  const ignored = execFileSync('git', ['check-ignore','--no-index','source/private.png','output/temporary.png','.pages/index.html'], {encoding:'utf8'}).trim().split(/\r?\n/);
  assert.equal(ignored.length, 3);
});

function webpSize(buffer) {
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') return [buffer.readUInt16LE(26) & 0x3fff, buffer.readUInt16LE(28) & 0x3fff];
  if (chunk === 'VP8L') { const bits = buffer.readUInt32LE(21); return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1]; }
  if (chunk === 'VP8X') return [buffer.readUIntLE(24, 3) + 1, buffer.readUIntLE(27, 3) + 1];
  throw new Error(`Unknown WebP chunk ${chunk}`);
}

test('技能圖示皆有使用，尺寸不超過 26px 顯示的 3 倍', async () => {
  const {SKILLS} = await import('../dist/skill-navigation.js');
  const root = new URL('../dist/assets/skills/', import.meta.url);
  const files = (await readdir(root)).sort();
  assert.deepEqual(files, SKILLS.map(skill => `${skill.id}.webp`).sort());
  for (const file of files) {
    const [width, height] = webpSize(await readFile(new URL(file, root)));
    assert.ok(width <= 78 && height <= 78, `${file} ${width}x${height}`);
  }
});
