import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir, mkdtemp, rm, stat, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {siteCodepoints} from './font-text.mjs';

// Rebuild the self-hosted Noto Sans TC subset after site text changes.
// Needs Python with fontTools and a local NotoSansTC-VF.ttf (SIL OFL 1.1); the site, tests and build do not.
export const FONT_FILE = 'assets/fonts/noto-sans-tc.woff';

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dist = fileURLToPath(new URL('../dist/', import.meta.url));
  const candidates = [
    process.env.NOTO_SANS_TC_SOURCE,
    fileURLToPath(new URL('../source/fonts/NotoSansTC-VF.ttf', import.meta.url)),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Windows', 'Fonts', 'NotoSansTC-VF.ttf'),
    process.env.WINDIR && path.join(process.env.WINDIR, 'Fonts', 'NotoSansTC-VF.ttf'),
  ].filter(Boolean);
  const source = candidates.find(file => existsSync(file));
  if (!source) {
    console.error(`找不到 NotoSansTC-VF.ttf。請設定 NOTO_SANS_TC_SOURCE，或放在 source/fonts/。已檢查：\n${candidates.join('\n')}`);
    process.exit(1);
  }
  const python = process.env.PYTHON || 'python';
  const run = args => {
    const result = spawnSync(python, args, {stdio:'inherit', env:{...process.env, PYTHONIOENCODING:'utf-8'}});
    if (result.error || result.status !== 0) {
      console.error(`執行失敗：${python} ${args.join(' ')}\n需要 Python 與 fontTools（pip install fonttools）。`);
      process.exit(1);
    }
  };
  const work = await mkdtemp(path.join(tmpdir(), 'calculmabi-font-'));
  try {
    const codepoints = [...await siteCodepoints(dist)].sort((a, b) => a - b);
    const unicodes = path.join(work, 'unicodes.txt');
    await writeFile(unicodes, codepoints.map(code => `U+${code.toString(16).toUpperCase().padStart(4, '0')}`).join('\n'));
    const subset = path.join(work, 'subset.ttf'), limited = path.join(work, 'limited.ttf'), output = path.join(dist, FONT_FILE);
    // Default layout features cover what browsers apply to horizontal text; all name records keep the OFL notice.
    run(['-m', 'fontTools.subset', source, `--unicodes-file=${unicodes}`, '--name-IDs=*', `--output-file=${subset}`]);
    // The site uses weights 400-700 only.
    run(['-m', 'fontTools.varLib.instancer', subset, 'wght=400:700', '-q', '-o', limited]);
    await mkdir(path.dirname(output), {recursive:true});
    run(['-m', 'fontTools.subset', limited, '--unicodes=*', '--name-IDs=*', '--flavor=woff', `--output-file=${output}`]);
    console.log(`${FONT_FILE}: ${codepoints.length} characters, ${(await stat(output)).size} bytes from ${source}`);
  } finally {
    await rm(work, {recursive:true, force:true});
  }
}
