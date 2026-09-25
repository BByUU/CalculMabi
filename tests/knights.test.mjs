import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MAIN_SKILLS, SUB_SKILLS, MAX_LEVEL, successesNeeded, defaultKnightsPlan, calculateKnights, formatDuration} from '../dist/knights-calculator.js';

// Count column of Mabinogi 奇幻世界 for Lv.1-14; fractional counts mean the last success overshoots 100.
const SITE_COUNTS = {
  'range-bonus':[1, 2, 4, 5, 10, 16, 16, 20, 20, 25, 32, 50, 100, 200],
  'recover-hp':[5, 8, 10, 16, 20, 25, 32, 40, 50, 100, 200, 320, 500, 1000],
  'increase-magic-defense':[5, 8, 10, 16, 20, 25, 32, 40, 50, 100, 200, 320, 500, 1000],
  'boost-movement-speed':[1, 2, 4, 5, 10, 16, 16, 20, 20, 25, 32, 50, 100, 200],
  'recover-wound':[1, 2, 2, 4, 4, 5, 5, 8, 10, 16, 20, 25, 32, 40],
  'exp-bonus':[10, 10, 20, 20, 25, 33.33, 50, 100, 125, 125, 200, 200, 500, 500],
  'pet-damage-bonus':[10, 10, 20, 20, 20, 25, 33.33, 50, 66.67, 66.67, 100, 100, 125, 200],
  'pet-no-hit-motion':[10, 10, 20, 20, 25, 33.33, 33.33, 50, 100, 125, 125, 200, 250, 333.33],
  'pet-life-wound-recover':[5, 6.67, 10, 12.5, 20, 25, 33.33, 50, 50, 66.67, 100, 125, 125, 250],
  'pet-auto-revive':[5, 6.67, 10, 12.5, 16.67, 20, 25, 66.67, 100, 125, 200, 250, 333.33, 500],
};

test('聖盾庇護與聖靈同步各 5 個副技能，每個有 Lv.1 至 Lv.14 的修練資料', () => {
  assert.deepEqual(MAIN_SKILLS.map(main => [main.name, main.cooldown, main.subSkills.length]), [['聖盾庇護', 20, 5], ['聖靈同步', 60, 5]]);
  assert.equal(new Set(SUB_SKILLS.map(sub => sub.id)).size, 10);
  for (const sub of SUB_SKILLS) {
    assert.equal(sub.levels.length, MAX_LEVEL - 1, sub.name);
    for (const [condition, gain] of sub.levels) assert.ok(condition && gain > 0 && gain <= 100, sub.name);
  }
});

test('每級所需次數與奇幻世界一致，非整數無條件進位，0.3125% 為 320 次', () => {
  for (const sub of SUB_SKILLS) {
    assert.deepEqual(sub.levels.map(([, gain]) => successesNeeded(gain)), SITE_COUNTS[sub.id].map(count => Math.ceil(count - 0.01)), sub.name);
  }
  assert.equal(successesNeeded(0.3125), 320);
  assert.equal(successesNeeded(3), 34);
  assert.equal(successesNeeded(1, 45), 55);
  assert.equal(successesNeeded(1, 99.5), 1);
});

test('聖盾每 20 秒一次：魔法反制 Lv.10 升一級 100 次 33 分 20 秒，Lv.14 需 5 小時 33 分 20 秒', () => {
  const plan = defaultKnightsPlan();
  plan.subSkills['increase-magic-defense'] = {level:10, progress:0};
  plan.subSkills['recover-hp'] = {level:14, progress:0};
  const shield = calculateKnights(plan).mains.find(main => main.id === 'shield-of-trust');
  const magic = shield.rows.find(row => row.id === 'increase-magic-defense');
  assert.deepEqual(magic.next, {successes:100, seconds:2000});
  assert.equal(formatDuration(magic.next.seconds), '33 分 20 秒');
  assert.deepEqual(magic.toMax, {successes:100 + 200 + 320 + 500 + 1000, seconds:2120 * 20});
  const hp = shield.rows.find(row => row.id === 'recover-hp');
  assert.equal(formatDuration(hp.next.seconds), '5 小時 33 分 20 秒');
  assert.deepEqual(hp.next, hp.toMax);
});

test('目前修練值扣除、間隔可調整，Lv.15 視為滿級', () => {
  const plan = defaultKnightsPlan();
  plan.intervals['divine-link'] = 30;
  plan.subSkills['exp-bonus'] = {level:6, progress:40};
  plan.subSkills['pet-auto-revive'] = {level:MAX_LEVEL, progress:0};
  const link = calculateKnights(plan).mains.find(main => main.id === 'divine-link');
  const exp = link.rows.find(row => row.id === 'exp-bonus');
  assert.deepEqual(exp.next, {successes:20, seconds:600});
  assert.equal(exp.condition, '靈魂連結狀態下獲得經驗值 13,000 以上');
  const revive = link.rows.find(row => row.id === 'pet-auto-revive');
  assert.deepEqual([revive.maxed, revive.next, revive.toMax], [true, null, null]);
});

test('無效等級、修練值與間隔不能產生假結果', () => {
  const invalid = [
    plan => { plan.subSkills['recover-hp'] = {level:0, progress:0}; },
    plan => { plan.subSkills['recover-hp'] = {level:16, progress:0}; },
    plan => { plan.subSkills['recover-hp'] = {level:2.5, progress:0}; },
    plan => { plan.subSkills['recover-hp'] = {level:3, progress:100}; },
    plan => { plan.subSkills['recover-hp'] = {level:3, progress:-1}; },
    plan => { delete plan.subSkills['recover-hp']; },
    plan => { plan.intervals['shield-of-trust'] = 0; },
    plan => { plan.intervals['shield-of-trust'] = ''; },
    plan => { plan.intervals['divine-link'] = 86401; },
  ];
  for (const mutate of invalid) {
    const plan = defaultKnightsPlan();
    mutate(plan);
    assert.throws(() => calculateKnights(plan));
  }
});

test('時間格式顯示時、分、秒', () => {
  assert.deepEqual([0, 59, 60, 3599, 3600, 90061].map(formatDuration), ['0 秒', '59 秒', '1 分 0 秒', '59 分 59 秒', '1 小時 0 分 0 秒', '25 小時 1 分 1 秒']);
});

test('各頁都有騎士團入口，副技能程式固定 DOM 引用都存在', () => {
  for (const page of ['index', 'dan', 'erg', 'stardust', 'traits', 'knights', 'reading']) {
    const html = readFileSync(new URL(`../dist/${page}.html`, import.meta.url), 'utf8');
    assert.ok(html.includes('href="./knights.html"'), page);
  }
  const html = readFileSync(new URL('../dist/knights.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../dist/knights-app.js', import.meta.url), 'utf8');
  for (const match of app.matchAll(/\$\('([^']+)'\)/g)) assert.ok(html.includes(`id="${match[1]}"`), match[1]);
  assert.ok(html.includes('aria-current="page">騎士團'));
});
