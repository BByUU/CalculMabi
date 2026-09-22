import {escapeHtml as esc, formatNumber as fmt} from './format.js';
import {SKILLS, currentSkillRoute, skillHref, renderSkillNavigation, bindSkillNavigation} from './skill-navigation.js';
import {createNpcCatalog, calculateNpcShopping} from './dan-planner.js';

import {ROUND_EXAMS, selectRoundTarget, calculateRoundPlan} from './dan-rounds.js';

const $ = id => document.getElementById(id);
let data, catalog, state;
const saved = new Map();
const isNpc = () => Boolean(catalog.skills[state.skillId]);

function chooseSkill(skillId) {
  if (state) saved.set(state.skillId, state);
  state = saved.get(skillId) || {skillId, selections:new Set(), roundSelections:{}, stage:1};
  render();
}
function checkbox(npc, id, inlineName = true) {
  const name = catalog.recipes[id].name;
  const key = `${npc}:${id}`;
  return `<label class="npc-choice"><input type="checkbox" data-choice="${key}" ${state.selections.has(key) ? 'checked' : ''} aria-label="${npc} 號：${esc(name)}">${inlineName ? `<span>${esc(name)}</span>` : ''}</label>`;
}
function appearance(npc, groups) {
  return `<section class="npc-panel" aria-label="${npc} 號外觀"><h2><b>${npc}</b> 看身上裝備</h2>${groups.map(g => `<div class="npc-group"><h3>${esc(g.label)}</h3>${g.ids.map(id => checkbox(npc, id)).join('')}</div>`).join('')}</section>`;
}
function renderRounds() {
  $('round-choices').innerHTML = ROUND_EXAMS[state.skillId].map(group => `<section class="npc-panel round-panel ${group.stage === state.stage ? 'active-stage' : ''}" aria-label="第 ${group.stage} 階段"><h2>第 ${group.stage} 階段</h2><div class="npc-group">${group.targets.map(target => `<label class="npc-choice"><input type="radio" name="round-${group.stage}" data-round-choice="${esc(target.id)}" data-stage="${group.stage}" ${state.roundSelections[group.stage] === target.id ? 'checked' : ''}><span>${esc(target.name)}</span><small>×${target.quantity}</small></label>`).join('')}</div></section>`).join('');
}
function renderProduction(steps) {
  $('round-production').innerHTML = steps.length ? '<h3>製作順序</h3><ol>'+steps.map(step => `<li><strong>${esc(step.name)} ×${fmt(step.quantity)}</strong>${step.output > 1 ? `<small>每次產出 ${step.output} 個，共 ${step.attempts} 次</small>` : ''}<p>${step.ingredients.map(m => `${esc(m.name)} ×${fmt(m.quantity)}`).join('、')}</p></li>`).join('')+'</ol>' : '';
}

function render() {
  renderSkillNavigation(state.skillId, 'dan');
  const skill = SKILLS.find(s => s.id === state.skillId);
  document.title = `${skill.name}升段材料｜瑪奇小算盤 CalculMabi`;
  $('npc-exam').hidden = !isNpc();
  $('round-exam').hidden = isNpc();
  $('patterns').hidden = !isNpc();
  $('round-production').hidden = isNpc();
  $('reset-materials').textContent = '清除選擇';
  $('error-message').hidden = true;
  if (isNpc()) {
    const config = catalog.skills[state.skillId];
    $('npc-exam').innerHTML = appearance(1, config.left) + `<section class="npc-panel" aria-label="2、3 號對話"><h2><b>2・3</b> 對話指定道具</h2><table class="npc-requests"><thead><tr><th scope="col">製作目標</th><th scope="col">2 號</th><th scope="col">3 號</th></tr></thead><tbody>${config.middle.map(id => `<tr><th scope="row">${esc(catalog.recipes[id].name)}</th><td>${checkbox(2,id,false)}</td><td>${checkbox(3,id,false)}</td></tr>`).join('')}</tbody></table></section>` + appearance(4, config.right);
  } else {
    $('patterns').replaceChildren();
    renderRounds();
  }
  update();
}
function update() {
  try {
    let rows;
    if (isNpc()) {
      const result = calculateNpcShopping(catalog, state.skillId, state.selections);
      rows = result.materials;
      $('selection-count').textContent = result.count ? `已選 ${result.count} 件・${rows.length} 種材料` : '勾選上方道具';
      $('patterns').innerHTML = result.patterns.length ? `<h3>${state.skillId === 'blacksmith' ? '設計圖' : '衣服樣本'}</h3><ul>${result.patterns.map(p => `<li>${esc(p.replace(/^(設計圖|衣服樣本) - /, ''))}</li>`).join('')}</ul>` : '';
    } else {
      const selected = state.roundSelections[state.stage];
      const result = selected ? calculateRoundPlan(state.skillId, state.stage, selected) : null;
      rows = result?.materials ?? [];
      $('selection-count').textContent = result ? `${result.target.name} ×${result.target.quantity}・${rows.length} 種材料` : '選擇上方目標';
      renderProduction(result?.steps ?? []);
    }
    $('shopping-list').innerHTML = rows.length ? rows.map(r => `<div class="shopping-item" role="row"><span role="cell">${esc(r.name)}${r.uses ? `<small>用於：${r.uses.map(use => esc(use.name)).join('、')}</small>` : ''}${r.bundleSize ? `<small>需 ${fmt(r.quantity)} 個・${fmt(r.bundleSize)} 個／組</small>` : ''}</span><strong role="cell">${r.bundleSize ? `${fmt(r.bundles)} 組` : fmt(r.quantity)}</strong></div>`).join('') : '<p class="shopping-empty">選擇上方道具後顯示所需材料。</p>';
    $('shopping-title').textContent = isNpc() ? '預估材料・含結尾' : `第 ${state.stage} 階段・購買材料（組）`;
    $('error-message').hidden = true;
  } catch (error) {
    $('error-message').hidden = false;
    $('error-message').textContent = error.message;
  }
}
function events() {
  bindSkillNavigation('dan', chooseSkill);
  $('npc-exam').addEventListener('change', event => {
    const key = event.target.dataset.choice;
    if (!key) return;
    if (event.target.checked) state.selections.add(key); else state.selections.delete(key);
    update();
  });
  $('reset-materials').addEventListener('click', () => {
    state.selections.clear(); state.roundSelections = {}; state.stage = 1; render();
  });
  $('round-choices').addEventListener('click', event => {
    const input = event.target.closest('input[data-round-choice]');
    if (!input) return;
    state.stage = Number(input.dataset.stage);
    state.roundSelections = selectRoundTarget(state.skillId, state.roundSelections, state.stage, input.dataset.roundChoice);
    // Keep the clicked radio in the DOM so keyboard focus and arrow navigation survive.
    document.querySelectorAll('.round-panel').forEach(panel => panel.classList.toggle('active-stage', panel.contains(input)));
    update();
  });
}
async function init() {
  try {
    const response = await fetch('./data/dan.json');
    if (!response.ok) throw new Error('升段資料載入失敗，請重新整理。');
    data = await response.json();
    catalog = createNpcCatalog(data);
    const route = currentSkillRoute('dan');
    if (route.mode !== 'dan') {location.replace(skillHref(route.skillId, route.mode)); return;}
    events(); chooseSkill(route.skillId);
  } catch (error) {
    $('error-message').hidden = false;
    $('error-message').textContent = error.message;
  }
}
init();
