import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';

// Every character the site can render from its own files, plus printable ASCII for typed numbers.
export async function siteCodepoints(root) {
  const points = new Set();
  const add = text => { for (const char of text) { const code = char.codePointAt(0); if (code >= 0x20) points.add(code); } };
  const strings = value => {
    if (typeof value === 'string') add(value);
    else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) { add(key); strings(item); }
  };
  async function walk(directory) {
    for (const entry of await readdir(directory, {withFileTypes:true})) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.name.endsWith('.json')) strings(JSON.parse(await readFile(file, 'utf8')));
      else if (/\.(html|js|css)$/.test(entry.name)) {
        const text = await readFile(file, 'utf8');
        add(text);
        for (const [, hex, dec] of text.matchAll(/&#(?:x([0-9a-f]+)|(\d+));/gi)) points.add(hex ? parseInt(hex, 16) : Number(dec));
        for (const [, short, long] of text.matchAll(/\\u(?:([0-9a-f]{4})|\{([0-9a-f]+)\})/gi)) points.add(parseInt(short ?? long, 16));
      }
    }
  }
  await walk(root);
  for (let code = 0x20; code <= 0x7e; code++) points.add(code);
  return points;
}
