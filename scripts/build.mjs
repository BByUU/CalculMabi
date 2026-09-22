import {escapeHtml} from '../dist/format.js';
import {weaponIcon} from '../dist/erg-icons.js';
import {createHash} from 'node:crypto';
import {mkdir, readFile, readdir, writeFile, unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {skillNavigationMarkup} from '../dist/skill-navigation.js';


function prepareHtml(html, file, contents) {
  // Render the full tab row before data arrives to avoid shifting the page.
  const skills = skillNavigationMarkup().replaceAll('<button ', '<button disabled ');
  html = html.replace(/(<nav\b[^>]*\bid="skill-nav"[^>]*>)[\s\S]*?(<\/nav>)/, `$1${skills}$2`);
  if (file === 'erg.html' && html.includes('id="weapon-nav"') && contents.has('data/erg.json')) {
    const {weapons} = JSON.parse(contents.get('data/erg.json'));
    const buttons = weapons.map(w => `<button disabled type="button" class="skill-button" data-weapon="${escapeHtml(w.id)}" aria-pressed="false">${weaponIcon(w.id)}<span>${escapeHtml(w.name)}</span></button>`).join('');
    html = html.replace(/(<nav\b[^>]*\bid="weapon-nav"[^>]*>)[\s\S]*?(<\/nav>)/, `$1${buttons}$2`);
  }
  // Start the module graph and data requests together instead of in a waterfall.
  const modules = new Set(), data = new Set();
  const resolve = (parent, asset) => path.posix.normalize(path.posix.join(path.posix.dirname(parent), asset));
  function visit(module) {
    if (modules.has(module) || !contents.has(module)) return;
    modules.add(module);
    const code = contents.get(module).toString('utf8');
    for (const [,asset] of code.matchAll(/\b(?:from\s*|import\s*)["'](\.[^"'?#]+\.js)(?:\?[^"']*)?["']/g)) visit(resolve(module,asset));
    for (const [,asset] of code.matchAll(/\bfetch\(\s*["'](\.[^"'?#]+\.json)(?:\?[^"']*)?["']/g)) {
      const target = resolve(file,asset);
      if (contents.has(target)) data.add(target);
    }
  }
  for (const [tag] of html.matchAll(/<script\b[^>]*>/g)) {
    if (!/type=["']module["']/.test(tag)) continue;
    const asset = tag.match(/src=["'](\.[^"'?#]+\.js)/)?.[1];
    if (asset) visit(resolve(file,asset));
  }
  const href = asset => './' + path.posix.relative(path.posix.dirname(file),asset);
  const hints = [...modules].map(asset => `<link rel="modulepreload" href="${href(asset)}">`)
    .concat([...data].map(asset => `<link rel="preload" as="fetch" crossorigin="anonymous" href="${href(asset)}">`)).join('\n');
  return html.replace('</head>', `${hints}\n</head>`);
}

export async function buildSite(source, destination) {
  source = path.resolve(source);
  destination = path.resolve(destination);
  const inside = (parent, child) => child === parent || child.startsWith(parent + path.sep);
  if (inside(source, destination) || inside(destination, source)) throw new Error('Build source and destination must not overlap.');
  const files = [];
  async function collect(directory, prefix = '') {
    for (const entry of await readdir(directory, {withFileTypes:true})) {
      const relative = prefix + entry.name;
      if (entry.isDirectory()) await collect(path.join(directory, entry.name), relative + '/');
      else if (entry.isFile()) files.push(relative);
    }
  }
  await collect(source);
  files.sort();
  const contents = new Map(await Promise.all(files.map(async file => [file, await readFile(path.join(source, file))])));
  const hash = createHash('sha256');
  hash.update(await readFile(fileURLToPath(import.meta.url)));
  for (const [file, content] of contents) hash.update(file).update('\0').update(content).update('\0');
  const revision = hash.digest('hex').slice(0, 16);
  // Remove only obsolete output files, never recurse through symbolic links.
  async function removeStale(directory, prefix = '') {
    let entries;
    try { entries = await readdir(directory, {withFileTypes:true}); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
    for (const entry of entries) {
      const relative = prefix + entry.name;
      const target = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Unexpected build output link: ${relative}`);
      if (entry.isDirectory()) await removeStale(target, relative + '/');
      else if (entry.isFile() && !contents.has(relative)) await unlink(target);
    }
  }
  await removeStale(destination);
  for (const [file, content] of contents) {
    // Version HTML assets, nested module imports, and fetched data together.
    // Page navigation must also bypass cached HTML from older deployments.
    const input = file.endsWith('.html') ? prepareHtml(content.toString('utf8'),file,contents) : content.toString('utf8');
    let output = /\.(html|js|css)$/.test(file)
      ? input.replace(/(["'])(\.{1,2}\/[^"'?#]+\.(?:js|css|json))(?:\?[^"'#]*)?\1/g,
        (_, quote, asset) => `${quote}${asset}?v=${revision}${quote}`)
      : file.endsWith('.json') ? JSON.stringify(JSON.parse(input)) : content;
    if (file.endsWith('.html')) {
      output = output.replace(/(<a\b[^>]*\bhref=)(["'])(\.\/[^"']*)\2/g, (match, prefix, quote, href) => {
        const pathname = href.split(/[?#]/)[0];
        if (pathname !== './' && !pathname.endsWith('.html')) return match;
        const url = new URL(href.replaceAll('&amp;', '&'), 'https://build.invalid/');
        url.searchParams.set('v', revision);
        const target = `${pathname}${url.search}${url.hash}`.replaceAll('&', '&amp;');
        return `${prefix}${quote}${target}${quote}`;
      });
    }
    const target = path.join(destination, file);
    await mkdir(path.dirname(target), {recursive:true});
    await writeFile(target, output);
  }
  return revision;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const source = fileURLToPath(new URL('../dist/', import.meta.url));
  const destination = fileURLToPath(new URL('../.pages/', import.meta.url));
  console.log(`Built website revision ${await buildSite(source, destination)}`);
}
