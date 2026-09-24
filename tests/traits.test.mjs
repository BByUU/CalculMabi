import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CATEGORIES, TRAITS, LEVEL_COSTS, WEEKLY_CAP, HOLD_CAP, upgradeCost, defaultTraitPlan, calculateTraits} from '../dist/traits-calculator.js';

test('每級需求與巴哈姆特整合表一致，結晶由 Lv.5 與 Lv.8 開始', () => {
  assert.deepEqual(LEVEL_COSTS.map(step => step.ap), [5, 6, 7, 8, 9, 10, 12, 15, 20]);
  assert.deepEqual(LEVEL_COSTS.map(step => step.points), [400, 500, 600, 600, 700, 800, 800, 1100, 1400]);
  assert.deepEqual(LEVEL_COSTS.map(step => step.basic), [0, 0, 0, 20, 30, 40, 0, 0, 0]);
  assert.deepEqual(LEVEL_COSTS.map(step => step.advanced), [0, 0, 0, 0, 0, 0, 30, 40, 50]);
  assert.deepEqual(upgradeCost(1, 10), {ap:92, points:6900, basic:90, advanced:120});
  assert.deepEqual(upgradeCost(4, 4), {ap:0, points:0, basic:0, advanced:0});
});

test('文中任務線範例：Lv.3 需 900 點，Lv.5 需 2,100 點與 20 個一般結晶', () => {
  assert.equal(upgradeCost(1, 3).points, 900);
  assert.deepEqual(upgradeCost(1, 5), {ap:26, points:2100, basic:20, advanced:0});
  const plan = defaultTraitPlan();
  for (const trait of TRAITS) plan.levels[trait.id] = {current:1, target:1};
  for (const id of ['time-warp', 'follow-up', 'haste', 'element-hone']) plan.levels[id].target = 3;
  const byId = Object.fromEntries(calculateTraits(plan).categories.map(category => [category.id, category.points]));
  assert.deepEqual(byId, {training:900, challenge:0, sympathy:2700});
});

test('19 種特性分為修行 7、挑戰 6、交感 6，ID 不重複', () => {
  assert.equal(TRAITS.length, 19);
  assert.equal(new Set(TRAITS.map(trait => trait.id)).size, 19);
  const counts = Object.fromEntries(CATEGORIES.map(category => [category.id, TRAITS.filter(trait => trait.category === category.id).length]));
  assert.deepEqual(counts, {training:7, challenge:6, sympathy:6});
  assert.equal(TRAITS.find(trait => trait.name === '刻印：弗拉加拉赫').category, 'training');
});

test('全部升滿：修行 48,300 點需 33 週，其餘各 28 週，由修行決定完成週數', () => {
  const result = calculateTraits(defaultTraitPlan());
  const byId = Object.fromEntries(result.categories.map(category => [category.id, category]));
  assert.equal(byId.training.points, 48300);
  assert.equal(byId.training.weeks, 33);
  assert.equal(byId.challenge.weeks, 28);
  assert.equal(byId.sympathy.weeks, 28);
  assert.deepEqual({basic:byId.training.basic, advanced:byId.training.advanced}, {basic:630, advanced:840});
  assert.deepEqual(result.totals, {points:131100, missing:131100, ap:1748, weeks:33, slowest:['training']});
});

test('目前持有點數只扣同分類，缺少點數不為負，週數向上取整', () => {
  const plan = defaultTraitPlan();
  for (const trait of TRAITS) plan.levels[trait.id] = {current:1, target:1};
  plan.levels['firm-will'] = {current:9, target:10};
  plan.levels.revival = {current:1, target:2};
  plan.held = {training:1000, challenge:HOLD_CAP, sympathy:0};
  const result = calculateTraits(plan);
  const byId = Object.fromEntries(result.categories.map(category => [category.id, category]));
  assert.deepEqual([byId.training.missing, byId.training.weeks], [400, 1]);
  assert.deepEqual([byId.challenge.missing, byId.challenge.weeks], [0, 0]);
  assert.equal(result.totals.missing, 400);
  plan.held.training = 1400;
  assert.equal(calculateTraits(plan).totals.weeks, 0);
  plan.levels['firm-will'] = {current:1, target:10};
  plan.held.training = 0;
  assert.equal(calculateTraits(plan).totals.weeks, Math.ceil(6900 / WEEKLY_CAP));
});

test('無效等級、降級與超過持有上限不能產生假合計', () => {
  const invalid = [
    plan => { plan.levels.haste = {current:0, target:10}; },
    plan => { plan.levels.haste = {current:1, target:11}; },
    plan => { plan.levels.haste = {current:1.5, target:10}; },
    plan => { plan.levels.haste = {current:8, target:7}; },
    plan => { plan.levels.haste = {current:'', target:10}; },
    plan => { delete plan.levels.haste; },
    plan => { plan.held.training = HOLD_CAP + 1; },
    plan => { plan.held.training = -1; },
    plan => { plan.held.training = 1.5; },
    plan => { plan.held.training = true; },
  ];
  for (const mutate of invalid) {
    const plan = defaultTraitPlan();
    mutate(plan);
    assert.throws(() => calculateTraits(plan));
  }
  assert.throws(() => upgradeCost(5, 4));
});

test('各頁都有特性入口，特性程式固定 DOM 引用都存在', () => {
  for (const page of ['index', 'dan', 'erg', 'stardust', 'reading', 'traits']) {
    const html = readFileSync(new URL(`../dist/${page}.html`, import.meta.url), 'utf8');
    assert.ok(html.includes('href="./traits.html"'), page);
  }
  const html = readFileSync(new URL('../dist/traits.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../dist/traits-app.js', import.meta.url), 'utf8');
  for (const match of app.matchAll(/\$\('([^']+)'\)/g)) assert.ok(html.includes(`id="${match[1]}"`), match[1]);
  assert.ok(html.includes('aria-current="page">特性'));
});
