import {setStepper} from './level-stepper.js';
import {escapeHtml as esc, formatNumber as fmt} from './format.js';
import {MAIN_SKILLS, SUB_SKILLS, TIMERS, MAX_LEVEL, defaultKnightsPlan, calculateKnights, formatDuration} from './knights-calculator.js';

const $ = id => document.getElementById(id);
const STORAGE = 'mabi-knights-v1';
const levels = Array.from({length:MAX_LEVEL}, (_, i) => i + 1);
// Gains such as 0.3125% need more than the shared two decimals to match the per-level counts.
const gainFormat = new Intl.NumberFormat('zh-TW', {maximumFractionDigits:4});
const rowNodes = new Map(), intervalNodes = new Map();
let plan = defaultKnightsPlan();

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE));
  if (saved && typeof saved === 'object') {
    const candidate = defaultKnightsPlan();
    // Earlier saves also had a single 聖靈同步 interval; it no longer applies and is dropped.
    for (const timer of TIMERS) if (Object.hasOwn(saved.intervals ?? {}, timer.id)) candidate.intervals[timer.id] = saved.intervals[timer.id];
    for (const sub of SUB_SKILLS) {
      const choice = saved.subSkills?.[sub.id];
      if (choice && typeof choice === 'object') candidate.subSkills[sub.id] = {level:choice.level, progress:choice.progress};
    }
    calculateKnights(candidate);
    plan = candidate;
  }
} catch { /* A missing or invalid saved plan uses defaults. */ }

function mount() {
  $('kn-mains').innerHTML = MAIN_SKILLS.map(main => `<section class="kn-panel" aria-labelledby="kn-${main.id}-heading">
    <div class="kn-section-heading"><h2 id="kn-${main.id}-heading">${main.name}</h2><span>冷卻 ${main.cooldown} 秒</span><div class="kn-intervals">${main.timers.map(timer => `<label class="kn-interval">${timer.label}<input type="number" min="0.1" max="86400" step="0.1" inputmode="decimal" data-interval="${timer.id}" aria-label="${main.name}${timer.label}間隔（秒）">秒</label>`).join('')}</div></div>
    <div class="table-scroll"><table class="kn-table">
      <thead><tr><th scope="col">副技能</th><th scope="col">等級</th><th scope="col">目前修練值</th><th scope="col">每次</th><th scope="col">目前等級</th><th scope="col">升到 Lv.${MAX_LEVEL}</th></tr></thead>
      <tbody>${main.subSkills.map(sub => `<tr data-sub="${sub.id}"><th scope="row"><span class="kn-name"><img class="kn-icon" src="./assets/knights/${sub.id}.webp" width="26" height="26" alt="" loading="lazy" decoding="async">${sub.name}</span><small data-cell="condition"></small></th><td data-label="等級"><input data-level="${sub.id}" inputmode="numeric" aria-label="${sub.name}目前等級" value="1"></td><td data-label="目前修練值"><span class="kn-progress"><input type="number" min="0" max="99.99" step="0.01" inputmode="decimal" placeholder="0" data-progress="${sub.id}" aria-label="${sub.name}目前修練值（%）">%</span></td><td data-label="每次" data-cell="gain"></td><td class="kn-time" data-label="目前等級" data-cell="next"></td><td data-label="升到 Lv.${MAX_LEVEL}" data-cell="max"></td></tr>`).join('')}</tbody>
    </table></div>
  </section>`).join('');
  const cells = node => Object.fromEntries([...node.querySelectorAll('[data-cell]')].map(cell => [cell.dataset.cell, cell]));
  for (const node of $('kn-mains').querySelectorAll('[data-sub]')) {
    rowNodes.set(node.dataset.sub, {node, level:node.querySelector('[data-level]'), progress:node.querySelector('[data-progress]'), cells:cells(node)});
  }
  for (const input of $('kn-mains').querySelectorAll('[data-interval]')) intervalNodes.set(input.dataset.interval, input);
}

// Timed rows lead with the duration; counted-only rows show the success count alone.
const stepCell = step => step.seconds === null ? `${fmt(step.successes)} 次<small>只計次數</small>` : `${esc(formatDuration(step.seconds))}<small>${fmt(step.successes)} 次</small>`;

// Update text and control state in place; inputs stay mounted so focus and typing are kept.
function patchRow(row) {
  const {node, level, progress, cells} = rowNodes.get(row.id);
  setStepper(level, levels, row.level);
  progress.disabled = row.maxed;
  if (document.activeElement !== progress) progress.value = row.progress ? row.progress : '';
  node.classList.toggle('kn-maxed', row.maxed);
  cells.condition.textContent = row.maxed ? '已達最高等級' : `修練：${row.condition}`;
  cells.gain.textContent = row.maxed ? '—' : `${gainFormat.format(row.gain)}%`;
  cells.next.innerHTML = row.maxed ? '已滿級' : stepCell(row.next);
  cells.max.innerHTML = row.maxed ? '—' : stepCell(row.toMax);
}

function update(changed = null) {
  const result = calculateKnights(plan);
  for (const main of result.mains) {
    for (const [id, seconds] of Object.entries(main.intervals)) {
      const input = intervalNodes.get(id);
      if (document.activeElement !== input) input.value = seconds;
    }
    for (const row of main.rows) if (!changed || changed.has(row.id)) patchRow(row);
  }
  try { localStorage.setItem(STORAGE, JSON.stringify(plan)); } catch { /* Storage is optional. */ }
}

function showErrors() {
  const invalid = [...$('kn-mains').querySelectorAll('[data-progress][aria-invalid="true"], [data-interval][aria-invalid="true"]')];
  $('kn-error').hidden = invalid.length === 0;
  $('kn-error').textContent = invalid.length ? `請修正：${invalid.map(input => input.getAttribute('aria-label')).join('、')}。間隔須為 0.1 至 86,400 秒，修練值須為 0 至 99.99%；其他欄位仍按上次有效值計算。` : '';
}

$('kn-mains').addEventListener('change', event => {
  const select = event.target.closest('[data-level]');
  if (!select) return;
  // A new level starts from 0 training.
  plan.subSkills[select.dataset.level] = {level:Number(select.value), progress:0};
  const {progress} = rowNodes.get(select.dataset.level);
  progress.value = ''; progress.setAttribute('aria-invalid', 'false');
  showErrors();
  update(new Set([select.dataset.level]));
});

$('kn-mains').addEventListener('input', event => {
  const input = event.target.closest('[data-progress], [data-interval]');
  if (!input) return;
  const valid = !input.validity.badInput && input.checkValidity() && !(input.dataset.interval && input.value === '');
  input.setAttribute('aria-invalid', String(!valid));
  if (valid) {
    if (input.dataset.interval) {
      plan.intervals[input.dataset.interval] = Number(input.value);
      update(new Set(SUB_SKILLS.filter(sub => sub.timer === input.dataset.interval).map(sub => sub.id)));
    } else {
      plan.subSkills[input.dataset.progress].progress = input.value === '' ? 0 : Number(input.value);
      update(new Set([input.dataset.progress]));
    }
  }
  showErrors();
});

$('kn-reset').addEventListener('click', () => {
  plan = defaultKnightsPlan();
  for (const input of $('kn-mains').querySelectorAll('input')) input.setAttribute('aria-invalid', 'false');
  showErrors();
  update();
});

mount();
update();
