import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MAIN_SKILLS, SUB_SKILLS, MAX_LEVEL, successesNeeded, defaultKnightsPlan, calculateKnights, formatDuration} from '../dist/knights-calculator.js';

// Lv.1-14 counts; BoostMovementSpeed uses updated game data, others use 奇幻世界.
// Fractional counts mean the last success overshoots 100.
const SITE_COUNTS = {
  'range-bonus':[1, 2, 4, 5, 10, 16, 16, 20, 20, 25, 32, 50, 100, 200],
  'recover-hp':[5, 8, 10, 16, 20, 25, 32, 40, 50, 100, 200, 320, 500, 1000],
  'increase-magic-defense':[5, 8, 10, 16, 20, 25, 32, 40, 50, 100, 200, 320, 500, 1000],
  'boost-movement-speed':[1, 1, 2, 2.5, 5, 8, 8, 10, 10, 12.5, 16, 25, 50, 100],
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

test('福音傳遞與庇佑步伐的修練條件使用遊戲內說法，每級相同', () => {
  const byId = Object.fromEntries(SUB_SKILLS.map(sub => [sub.id, sub]));
  assert.ok(byId['range-bonus'].levels.every(([condition]) => condition === '對同伴或寵物使用聖盾庇護'));
  assert.ok(byId['boost-movement-speed'].levels.every(([condition]) => condition === '在使者的隕石流星雨攻擊中保護自身'));
});

test('每級所需次數與核對資料一致，非整數無條件進位，0.3125% 為 320 次', () => {
  for (const sub of SUB_SKILLS) {
    assert.deepEqual(sub.levels.map(([, gain]) => successesNeeded(gain)), SITE_COUNTS[sub.id].map(count => Math.ceil(count - 0.01)), sub.name);
  }
  assert.equal(successesNeeded(0.3125), 320);
  assert.equal(successesNeeded(3), 34);
  assert.equal(successesNeeded(1, 45), 55);
  assert.equal(successesNeeded(1, 99.5), 1);
});

test('聖盾每 20 秒一次：恢復祈禱 Lv.10 升一級 100 次 33 分 20 秒，Lv.14 需 5 小時 33 分 20 秒', () => {
  const plan = defaultKnightsPlan();
  plan.subSkills['recover-hp'] = {level:10, progress:0};
  let hp = calculateKnights(plan).mains[0].rows.find(row => row.id === 'recover-hp');
  assert.deepEqual(hp.next, {successes:100, seconds:2000});
  assert.equal(formatDuration(hp.next.seconds), '33 分 20 秒');
  assert.deepEqual(hp.toMax, {successes:100 + 200 + 320 + 500 + 1000, seconds:2120 * 20});
  plan.subSkills['recover-hp'] = {level:14, progress:0};
  const shield = calculateKnights(plan).mains.find(main => main.id === 'shield-of-trust');
  hp = shield.rows.find(row => row.id === 'recover-hp');
  assert.equal(formatDuration(hp.next.seconds), '5 小時 33 分 20 秒');
  assert.deepEqual(hp.next, hp.toMax);
});

test('聖靈同步：復甦的靈魂每 60 秒、復活的權杖每 10 秒，啟迪之光、守護者的誓約只計次數', () => {
  assert.deepEqual(defaultKnightsPlan().intervals, {'shield-of-trust':20, 'boost-movement-speed':30, 'pet-life-wound-recover':60, 'pet-auto-revive':10});
  const link = calculateKnights(defaultKnightsPlan()).mains.find(main => main.id === 'divine-link');
  const byId = Object.fromEntries(link.rows.map(row => [row.id, row]));
  assert.deepEqual(byId['pet-life-wound-recover'].next, {successes:5, seconds:300});
  assert.equal(formatDuration(byId['pet-life-wound-recover'].next.seconds), '5 分 0 秒');
  assert.deepEqual(byId['pet-auto-revive'].next, {successes:5, seconds:50});
  assert.equal(formatDuration(byId['pet-auto-revive'].toMax.seconds), '4 小時 38 分 50 秒');
  for (const id of ['exp-bonus', 'pet-no-hit-motion']) {
    assert.equal(byId[id].next.seconds, null, id);
    assert.equal(byId[id].toMax.seconds, null, id);
  }
  assert.deepEqual([byId['exp-bonus'].next.successes, byId['exp-bonus'].toMax.successes], [10, 1919]);
});

test('目前修練值扣除、間隔可調整，Lv.15 視為滿級', () => {
  const plan = defaultKnightsPlan();
  plan.intervals['pet-life-wound-recover'] = 30;
  plan.subSkills['exp-bonus'] = {level:6, progress:40};
  plan.subSkills['pet-life-wound-recover'] = {level:7, progress:40};
  plan.subSkills['pet-auto-revive'] = {level:MAX_LEVEL, progress:0};
  const link = calculateKnights(plan).mains.find(main => main.id === 'divine-link');
  const exp = link.rows.find(row => row.id === 'exp-bonus');
  assert.deepEqual(exp.next, {successes:20, seconds:null});
  assert.equal(exp.condition, '靈魂連結狀態下獲得經驗值 13,000 以上');
  assert.deepEqual(link.rows.find(row => row.id === 'pet-life-wound-recover').next, {successes:20, seconds:600});
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
    plan => { plan.intervals['pet-auto-revive'] = 86401; },
    plan => { delete plan.intervals['pet-life-wound-recover']; },
    plan => { plan.petFarm.perMinute = 0; },
    plan => { plan.petFarm.runMinutes = ''; },
    plan => { plan.petFarm.gatherMinutes = -1; },
    plan => { delete plan.petFarm; },
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

test('一次三人只影響針對隊友的聖盾副技能，每級施放次數各自進位，舊設定維持單次', () => {
  const plan = defaultKnightsPlan();
  const original = calculateKnights(plan);
  delete plan.shieldThreePeople;
  assert.deepEqual(calculateKnights(plan), original);
  plan.shieldThreePeople = true;
  const result = calculateKnights(plan);
  assert.deepEqual(result.mains[1], original.mains[1]);
  const party = new Set(['range-bonus', 'recover-hp', 'recover-wound']);
  for (const row of result.mains[0].rows.filter(row => !row.estimate)) {
    const factor = party.has(row.id) ? 3 : 1;
    assert.equal(row.multiplier, factor, row.id);
    const casts = SITE_COUNTS[row.id].map(count => Math.ceil(Math.ceil(count - 0.01) / factor));
    assert.equal(row.next.successes, casts[0], row.id);
    assert.equal(row.toMax.successes, casts.reduce((a,b) => a+b, 0), row.id);
    assert.equal(row.toMax.seconds, row.toMax.successes * (row.id === 'boost-movement-speed' ? 30 : 20), row.id);
  }
  plan.subSkills['recover-hp'] = {level:14, progress:99.5};
  assert.equal(calculateKnights(plan).mains[0].rows.find(row => row.id === 'recover-hp').next.successes, 2);
  plan.shieldThreePeople = 'true';
  assert.throws(() => calculateKnights(plan));
});

test('魔法反制只列預估時間', () => {
  const plan = defaultKnightsPlan();
  plan.subSkills['increase-magic-defense'] = {level:6, progress:30};
  const magic = calculateKnights(plan).mains[0].rows.find(row => row.id === 'increase-magic-defense');
  assert.deepEqual([magic.next.estimate, magic.toMax.estimate], ['很快', '約 30 分鐘內']);
});

test('聖光顯靈 Lv.n 每殺 n 隻修練一次，每分鐘 23.2 隻、每趟刷 50 分鐘再花 3 分鐘收怪', () => {
  const plan = defaultKnightsPlan();
  assert.deepEqual(plan.petFarm, {perMinute:23.2, runMinutes:50, gatherMinutes:3});
  const pet = () => calculateKnights(plan).mains[1].rows.find(row => row.id === 'pet-damage-bonus');
  plan.subSkills['pet-damage-bonus'] = {level:12, progress:0};
  // 1% per 12 kills: 1,200 kills is 51.7 minutes of farming, so two runs and two gathers.
  assert.deepEqual([pet().next.kills, pet().next.runs], [1200, 2]);
  assert.ok(Math.abs(pet().next.seconds - (1200 / 23.2 + 6) * 60) < 1e-6);
  plan.subSkills['pet-damage-bonus'] = {level:12, progress:71};
  assert.deepEqual([pet().next.kills, pet().next.runs], [29 * 12, 1]);
  plan.subSkills['pet-damage-bonus'] = {level:13, progress:0};
  assert.deepEqual([pet().toMax.kills, pet().toMax.runs], [125 * 13 + 200 * 14, 2 + 3]);
  plan.petFarm = {perMinute:30, runMinutes:60, gatherMinutes:0};
  plan.subSkills['pet-damage-bonus'] = {level:10, progress:0};
  assert.deepEqual(pet().next, {successes:67, kills:670, runs:1, seconds:670 * 2});
  plan.subSkills['pet-damage-bonus'] = {level:MAX_LEVEL, progress:0};
  assert.equal(pet().maxed, true);
});

test('庇佑步伐每 30 秒一次，間隔獨立於其他聖盾副技能', () => {
  const plan = defaultKnightsPlan();
  assert.equal(plan.intervals['boost-movement-speed'], 30);
  plan.intervals['shield-of-trust'] = 15;
  const rows = calculateKnights(plan).mains[0].rows;
  assert.equal(rows.find(row => row.id === 'boost-movement-speed').next.seconds, 30);
  assert.equal(rows.find(row => row.id === 'range-bonus').next.seconds, 15);
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
