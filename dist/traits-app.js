import {formatNumber as fmt} from './format.js';
import {CATEGORIES, TRAITS, LEVEL_COSTS, MAX_LEVEL, WEEKLY_CAP, HOLD_CAP, defaultTraitPlan, calculateTraits} from './traits-calculator.js';

const $ = id => document.getElementById(id);
const STORAGE = 'mabi-traits-v1';
const LEVELS = Array.from({length:MAX_LEVEL}, (_, i) => i + 1);
const amount = n => n ? fmt(n) : '—';
const weeksText = category => category.missing ? `${fmt(category.weeks)} 週` : '已足夠';
const levelOptions = () => LEVELS.map(n => `<option value="${n}">Lv.${n}</option>`).join('');
const traitNodes = new Map(), categoryNodes = new Map();
let plan = defaultTraitPlan();

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE));
  if (saved && typeof saved === 'object') {
    const candidate = defaultTraitPlan();
    for (const trait of TRAITS) {
      const choice = saved.levels?.[trait.id];
      // Earlier saves also stored a target level; the target is now always Lv.10.
      if (choice && typeof choice === 'object') candidate.levels[trait.id] = {current:choice.current};
    }
    for (const category of CATEGORIES) if (Object.hasOwn(saved.held ?? {}, category.id)) candidate.held[category.id] = saved.held[category.id];
    calculateTraits(candidate);
    plan = candidate;
  }
} catch { /* A missing or invalid saved plan uses defaults. */ }

function mount() {
  $('tr-category-rows').innerHTML = CATEGORIES.map(category => `<tr class="tr-${category.id}" data-category="${category.id}"><th scope="row"><span class="tr-tag">${category.name}</span><small data-cell="traits"></small></th><td><input class="tr-held" type="number" min="0" max="${HOLD_CAP}" step="1" inputmode="numeric" placeholder="0" data-held="${category.id}" aria-label="${category.name}的璞黎目前持有點數"></td><td data-cell="points"></td><td class="tr-missing" data-cell="missing"></td><td data-cell="weeks"></td><td><span data-cell="basic"></span><small>${category.basicCrystal}</small></td><td><span data-cell="advanced"></span><small>${category.advancedCrystal}</small></td></tr>`).join('');
  $('tr-trait-table').insertAdjacentHTML('beforeend', CATEGORIES.map(category => `<tbody class="tr-${category.id}"><tr class="tr-group"><th scope="rowgroup" colspan="6"><span class="tr-tag">${category.name}</span></th></tr>${TRAITS.filter(trait => trait.category === category.id).map(trait => `<tr data-trait="${trait.id}"><th scope="row"><span class="tr-name"><img class="tr-icon" src="./assets/traits/${trait.id}.webp" width="26" height="26" alt="" loading="lazy" decoding="async">${trait.name}</span></th><td><select data-level data-trait-id="${trait.id}" aria-label="${trait.name}目前等級">${levelOptions()}</select></td><td data-cell="points"></td><td data-cell="ap"></td><td data-cell="basic"></td><td data-cell="advanced"></td></tr>`).join('')}</tbody>`).join(''));
  const cells = node => Object.fromEntries([...node.querySelectorAll('[data-cell]')].map(cell => [cell.dataset.cell, cell]));
  for (const node of $('tr-trait-table').querySelectorAll('[data-trait]')) {
    traitNodes.set(node.dataset.trait, {node, level:node.querySelector('[data-level]'), cells:cells(node)});
  }
  for (const node of $('tr-category-rows').querySelectorAll('[data-category]')) {
    categoryNodes.set(node.dataset.category, {held:node.querySelector('[data-held]'), cells:cells(node)});
  }
  $('tr-bulk-level').innerHTML = levelOptions();
  let cumulative = 0;
  $('tr-cost-rows').innerHTML = LEVEL_COSTS.map(step => {
    cumulative += step.points;
    return `<tr><th scope="row">Lv.${step.level - 1} → ${step.level}</th><td>${fmt(step.points)}</td><td>${fmt(step.ap)}</td><td>${amount(step.basic)}</td><td>${amount(step.advanced)}</td><td>${fmt(cumulative)}</td></tr>`;
  }).join('');
  const total = key => fmt(LEVEL_COSTS.reduce((n, step) => n + step[key], 0));
  $('tr-cost-total').innerHTML = `<th scope="row">Lv.1 → ${MAX_LEVEL} 合計</th><td>${total('points')}</td><td>${total('ap')}</td><td>${total('basic')}</td><td>${total('advanced')}</td><td></td>`;
  $('tr-cost-caption').textContent = `單一特性由 Lv.1 升到 Lv.${MAX_LEVEL} 共需 ${total('points')} 璞黎點；只靠每週 ${fmt(WEEKLY_CAP)} 點上限，需 ${Math.ceil(LEVEL_COSTS.reduce((n, step) => n + step.points, 0) / WEEKLY_CAP)} 週。`;
}

// Change only the affected controls and text; the input nodes stay mounted.
function patchTrait(row) {
  const {node, level, cells} = traitNodes.get(row.id);
  if (level.value !== String(row.current)) level.value = row.current;
  for (const key of ['points', 'ap', 'basic', 'advanced']) cells[key].textContent = amount(row[key]);
  node.classList.toggle('tr-done', row.current === MAX_LEVEL);
}

function patchCategory(category) {
  const {held, cells} = categoryNodes.get(category.id);
  if (document.activeElement !== held && held.value !== (category.held ? String(category.held) : '')) held.value = category.held || '';
  cells.traits.textContent = `${category.upgrading}／${category.traits} 項升級`;
  cells.points.textContent = fmt(category.points);
  cells.missing.textContent = fmt(category.missing);
  cells.weeks.textContent = weeksText(category);
  cells.basic.textContent = amount(category.basic);
  cells.advanced.textContent = amount(category.advanced);
}

function update(changed = null) {
  const result = calculateTraits(plan);
  for (const row of result.rows) if (!changed || changed.has(row.id)) patchTrait(row);
  for (const category of result.categories) patchCategory(category);
  $('tr-missing-total').textContent = `${fmt(result.totals.missing)} 點`;
  $('tr-ap-total').textContent = fmt(result.totals.ap);
  $('tr-weeks-total').textContent = result.totals.weeks ? `${fmt(result.totals.weeks)} 週` : '已足夠';
  const slowest = result.categories.filter(category => result.totals.slowest.includes(category.id)).map(category => category.name);
  $('tr-weeks-caption').textContent = slowest.length ? `三種璞黎各自計算上限，由${slowest.join('、')}決定` : '目前持有點數已足夠';
  try { localStorage.setItem(STORAGE, JSON.stringify(plan)); } catch { /* Storage is optional. */ }
}

function showHeldError() {
  const invalid = [...$('tr-category-rows').querySelectorAll('[data-held][aria-invalid="true"]')];
  $('tr-error').hidden = invalid.length === 0;
  $('tr-error').textContent = invalid.length ? `目前持有請填 0 至 ${fmt(HOLD_CAP)} 的整數；${invalid.map(input => CATEGORIES.find(c => c.id === input.dataset.held).name).join('、')}仍按上次有效點數計算。` : '';
}

$('tr-trait-table').addEventListener('change', event => {
  const select = event.target.closest('[data-level]');
  if (!select) return;
  plan.levels[select.dataset.traitId].current = Number(select.value);
  update(new Set([select.dataset.traitId]));
});

$('tr-category-rows').addEventListener('input', event => {
  const input = event.target.closest('[data-held]');
  if (!input) return;
  const valid = !input.validity.badInput && input.checkValidity();
  input.setAttribute('aria-invalid', String(!valid));
  if (valid) {
    plan.held[input.dataset.held] = input.value === '' ? 0 : Number(input.value);
    update(new Set());
  }
  showHeldError();
});

$('tr-bulk-apply').addEventListener('click', () => {
  const current = Number($('tr-bulk-level').value);
  for (const trait of TRAITS) plan.levels[trait.id] = {current};
  update();
});

$('tr-reset').addEventListener('click', () => {
  plan = defaultTraitPlan();
  for (const {held} of categoryNodes.values()) { held.value = ''; held.setAttribute('aria-invalid', 'false'); }
  showHeldError();
  update();
});

mount();
update();
