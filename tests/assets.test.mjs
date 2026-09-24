import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {weaponIcon} from '../dist/erg-icons.js';
import {escapeHtml, formatNumber} from '../dist/format.js';

test('共用格式保留安全跳脫與兩位小數', () => {
  assert.equal(escapeHtml(`<a title="'">&`), '&lt;a title=&quot;&#39;&quot;&gt;&amp;');
  assert.equal(escapeHtml(null), '');
  assert.equal(formatNumber(1234.567), '1,234.57');
});

test('所有頁面直接載入字型並預先連線，CSS 不串接遠端字型', async () => {
  const root = new URL('../dist/', import.meta.url);
  for (const name of await readdir(root)) {
    if (!name.endsWith('.html')) continue;
    const html = await readFile(new URL(name, root), 'utf8');
    assert.match(html, /rel="preconnect" href="https:\/\/fonts.googleapis.com"/);
    assert.match(html, /rel="preconnect" href="https:\/\/fonts.gstatic.com" crossorigin/);
    assert.match(html, /rel="stylesheet" href="https:\/\/fonts.googleapis.com\/css2/);
    assert.doesNotMatch(html, /density\.css\?v=/);
  }
  assert.doesNotMatch(await readFile(new URL('styles.css', root), 'utf8'), /@import/);
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
