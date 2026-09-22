import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = name => JSON.parse(readFileSync(new URL(`../dist/data/${name}.json`, import.meta.url)));
function only(object, allowed) {
  for (const key of Object.keys(object)) assert.ok(allowed.includes(key), `Unexpected published field: ${key}`);
}
function materials(rows) {
  for (const row of rows) {
    only(row, ['name', 'perAction']);
    assert.ok(row.name && Number.isFinite(row.perAction) && row.perAction >= 0);
  }
}

test('公開技能資料只包含計算欄位及可讀配方名稱', () => {
  const data = read('skills');
  only(data, ['schemaVersion', 'skills']);
  for (const skill of data.skills) {
    only(skill, ['id', 'name', 'ranks']);
    for (const rank of skill.ranks) {
      only(rank, ['rank', 'label', 'tasks']);
      for (const task of rank.tasks) {
        only(task, ['id', 'description', 'baseValue', 'maxCount', 'recommended', 'outcome', 'recipe', 'materialStatus', 'materials', 'recipeVariants']);
        for (const recipe of [task, ...task.recipeVariants]) {
          if (recipe !== task) only(recipe, ['recipe', 'materialStatus', 'materials']);
          assert.ok(!recipe.recipe?.startsWith('='));
          assert.ok(['provided', 'partial', 'not-provided'].includes(recipe.materialStatus));
          materials(recipe.materials);
        }
      }
    }
  }
});

test('公開聚能資料只包含目前機率、材料與飼料', () => {
  const data = read('erg');
  only(data, ['schemaVersion', 'probabilities', 'weapons']);
  for (const rules of Object.values(data.probabilities)) for (const rule of rules) only(rule, ['stage', 'probability', 'boost']);
  for (const weapon of data.weapons) {
    only(weapon, ['id', 'name', 'stages']);
    for (const stage of weapon.stages) {
      only(stage, ['id', 'tier', 'stage', 'levelRange', 'feedReference', 'materials']);
      for (const material of stage.materials) only(material, ['slot', 'name', 'quantity', 'consumption', 'aliases']);
    }
  }
});

test('公開升段資料只保留現行成品配方與有效 NPC 選項', () => {
  const data = read('dan');
  only(data, ['recipes', 'skills']);
  const used = new Set();
  for (const skill of Object.values(data.skills)) {
    only(skill, ['left', 'middle', 'right']);
    for (const group of [...skill.left, ...skill.right]) {
      only(group, ['label', 'ids']);
      group.ids.forEach(id => used.add(id));
    }
    skill.middle.forEach(id => used.add(id));
  }
  assert.deepEqual(used, new Set(Object.keys(data.recipes)));
  for (const recipe of Object.values(data.recipes)) {
    only(recipe, ['id', 'name', 'materials', 'pattern']);
    for (const material of recipe.materials) only(material, ['name', 'quantity']);
  }
});
