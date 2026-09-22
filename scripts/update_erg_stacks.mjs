// Read public Wiki item records; keep the fetched evidence outside the published site.
import fs from 'node:fs';
import {ERG_AUDIT, stageMaterials} from '../dist/erg-audit.js';
import {auctionSearchName} from '../dist/erg-material-names.js';

const data = JSON.parse(fs.readFileSync('dist/data/erg.json', 'utf8'));
const cachePath = 'source/erg-stack-evidence.json';
const cache = fs.existsSync(cachePath) && !process.argv.includes('--refresh') ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};
async function pages(titles) {
  const wanted = [...new Set(titles)].filter(title => !cache[title]);
  for (let offset = 0; offset < wanted.length; offset += 40) {
    const batch = wanted.slice(offset, offset + 40);
    const url = new URL('https://wiki.mabinogiworld.com/api.php');
    url.search = new URLSearchParams({action:'query', prop:'revisions', rvprop:'ids|timestamp|content', rvslots:'main', format:'json', titles:batch.join('|'), redirects:'1'});
    const response = await fetch(url, {signal:AbortSignal.timeout(30000)});
    if (!response.ok) throw new Error(`Wiki HTTP ${response.status}`);
    const body = await response.json();
    if (!body.query?.pages) throw new Error(JSON.stringify(body));
    const redirects = new Map([...(body.query.normalized ?? []), ...(body.query.redirects ?? [])].map(row => [row.from, row.to]));
    for (const requested of batch) {
      let title = requested;
      for (let i = 0; redirects.has(title) && i < 10; i++) title = redirects.get(title);
      const page = Object.values(body.query.pages).find(page => page.title === title);
      if (!page) throw new Error(`Missing response for ${requested}`);
      cache[requested] = {title:page.title, revision:page.revisions?.[0]?.revid, updatedAt:page.revisions?.[0]?.timestamp,
        text:page.revisions?.[0]?.slots.main['*'] ?? '', missing:page.missing !== undefined};
    }
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  }
}

await pages(data.weapons.map(weapon => `Erg/${ERG_AUDIT.pages[weapon.id][0]}`));
const templates = {};
for (const weapon of data.weapons) {
  const text = cache[`Erg/${ERG_AUDIT.pages[weapon.id][0]}`].text.split('==Sacrificial Materials==')[1] ?? '';
  templates[weapon.id] = Object.fromEntries([...text.matchAll(/contents([123])\s*=\s*\{\{([^}|]+)\}\}/g)].map(([, index, title]) => [['S','A','B'][Number(index)-1], `Template:${title}`]));
}
await pages(Object.values(templates).flatMap(Object.values));
const mappings = {};
const issues = [];
for (const weapon of data.weapons) for (const stage of weapon.stages) {
  const template = templates[weapon.id][stage.tier];
  const source = cache[template];
  if (!source) { issues.push(`${weapon.id} ${stage.tier}: no material template`); continue; }
  for (const material of stageMaterials(weapon.id, stage)) {
    const base = auctionSearchName(material.name);
    const raw = source.text.match(new RegExp(`\\|\\s*Material${stage.stage}_${material.slot}\\s*=([^\\n]+)`))?.[1];
    if (!raw) { issues.push(`${weapon.id} ${stage.id} ${material.slot}: no slot`); continue; }
    const titles = [...raw.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map(match => match[1]).filter(title => title !== 'Special Upgrade');
    const title = titles.at(-1) ?? (raw.includes('Music Score Scroll') ? 'Music Score Scroll' : null);
    if (mappings[base]?.title && title && mappings[base].title !== title) issues.push(`${base}: ${mappings[base].title} / ${title}`);
    mappings[base] = {title, template, category:material.name.includes('任意')};
  }
}
mappings['聚能開放輔助藥水'] = {title:'Erg Unlock Assist Potion'};
mappings['升階催化劑A'] = {title:'Advancement Catalyst A'};
mappings['升階催化劑B'] = {title:'Advancement Catalyst B'};
mappings['樂譜卷軸（100）'] = {title:'Score Scroll'};
fs.writeFileSync('source/erg-stack-mappings.json', JSON.stringify(mappings, null, 2));
await pages(Object.values(mappings).filter(m => m.title && !m.category).flatMap(m => [m.title, `Template:Data${m.title}`]));
await pages(['Template:StyleFood','Template:StyleItemEtc','Template:StyleHandicraftDetails']);
const items = {};
for (const [name, mapping] of Object.entries(mappings)) {
  const sources = mapping.category ? [] : [cache[`Template:Data${mapping.title}`], cache[mapping.title]].filter(s => s && !s.missing);
  let found;
  for (const source of sources) {
    const match = source.text.match(/\|\s*Stack\s*=\s*([\d,]+)/i);
    if (match) { found = {stackSize:Number(match[1].replaceAll(',', '')), source}; break; }
  }
  let basis = 'explicit-stack';
  if (!found && mapping.category) {
    found = {stackSize:1, source:cache[mapping.template]};
    basis = 'nonstackable-weapon-category';
  }
  if (!found) {
    const equipment = sources.find(s => /\|\s*Category\s*=\s*\/(?:equip|euip)\//.test(s.text));
    const food = sources.find(s => s.text.includes('[[Category:DataFood]]') || s.text.includes('|format=StyleFood'));
    const furniture = sources.find(s => /\|\s*Category\s*=\s*\/item\/house\/dynamic_prop\//.test(s.text));
    const reviewedFurniture = ['Standing Lamp','Wooden Birdcage','Silk Weaving Loom','Fabric Weaving Loom'].includes(mapping.title) && sources[0];
    const scoreScroll = mapping.title === 'Score Scroll' && sources.find(s => s.text.includes('equip this item in your left hand'));
    const source = equipment || food || furniture || reviewedFurniture || scoreScroll;
    if (source) {
      found = {stackSize:1, source};
      basis = equipment ? 'nonstackable-equipment' : food ? 'nonstackable-cooked-dish' : scoreScroll ? 'nonstackable-score' : 'nonstackable-furniture';
    }
  }
  items[name] = {stackSize:found?.stackSize ?? null, wikiTitle:mapping.title,
    sourceUrl:found ? `https://wiki.mabinogiworld.com/index.php?title=${encodeURIComponent(found.source.title)}&oldid=${found.source.revision}` : null,
    basis:found ? basis : 'unconfirmed'};
}
fs.writeFileSync('source/erg-stack-candidates.json', JSON.stringify(items, null, 2));
const missing = Object.entries(items).filter(([, item]) => item.stackSize === null).map(([name]) => name);
console.log(JSON.stringify({issues:[...new Set(issues)], items:Object.keys(items).length, missing}, null, 2));
if (issues.length || missing.length) throw new Error('Review unmapped materials before publishing stack data.');
fs.writeFileSync('dist/data/erg-stacks.json', JSON.stringify({checkedAt:'2026-09-22', region:'Mabinogi World Wiki / NA',
  note:'General inventory stack sizes; excludes material bags and shop bundles. Nonstackable item classes are identified separately from explicit Stack fields.', items}, null, 2) + '\n');
