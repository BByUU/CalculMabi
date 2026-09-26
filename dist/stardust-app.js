import {setStepper} from './level-stepper.js';
import {formatNumber as number} from './format.js';
import {SUPPORT_EFFECTS, maxStardustPlan, defaultStardustPlan, toggleStardustBonus, calculateStardust} from './stardust-calculator.js';
const $=id=>document.getElementById(id);
const STORAGE='mabi-stardust-plan-v1';
let plan=defaultStardustPlan();
try {
  const stored=JSON.parse(localStorage.getItem(STORAGE));
  if(stored && stored.effects?.length===15) {
    delete stored.baseReward;
    const candidate=maxStardustPlan(stored);
    calculateStardust(candidate); plan=candidate;
  }
} catch { /* A missing or outdated saved plan uses defaults. */ }
const levels = max => Array.from({length:max}, (_, i) => i + 1);
function renderEffects() {
  // Mount controls once; changes must preserve keyboard focus and open selects.
  if (!$('sd-effects-rows').children.length) $('sd-effects-rows').innerHTML=Array.from({length:5},(_,family)=>`<tr>${[0,1,2].map(group=>{
    const effect=SUPPORT_EFFECTS.find(e=>e.group===group&&e.family===family);
    const choice=plan.effects.find(e=>e.id===effect.id);
    return `<td><div class="sd-effect-name"><label><input type="checkbox" data-effect="${effect.id}">${effect.name}</label><small>Rank ${effect.unlock} 解鎖</small></div><div class="sd-effect-levels"><input data-level="current" data-effect-id="${effect.id}" inputmode="numeric" aria-label="${effect.name}目前等級" value="${choice.current}"></div></td>`;
  }).join('')}</tr>`).join('');
  for (const effect of SUPPORT_EFFECTS) {
    const choice=plan.effects.find(e=>e.id===effect.id);
    const checkbox=$('sd-effects-rows').querySelector(`[data-effect="${effect.id}"]`);
    const cell=checkbox.closest('td');
    const locked=effect.unlock>Number(plan.targetRank);
    checkbox.checked=choice.enabled&&!locked;
    checkbox.disabled=locked;
    cell.classList.toggle('sd-locked',locked);
    cell.querySelector('small').hidden=!locked;
    cell.querySelectorAll('[data-level]').forEach(select=>{
      select.disabled=locked||!choice.enabled;
      setStepper(select,levels(10),choice.current);
    });
  }
  renderBulkLevels();
}
function renderBulkLevels() {
  const unique=new Set(plan.effects.map(e=>e.current));
  const value=unique.size===1?[...unique][0]:'';
  const input=$('sd-bulk-current');
  input.placeholder='個別';
  setStepper(input,levels(10),value);
}
function renderControls() {
  setStepper($('sd-current-rank'),levels(15),plan.currentRank);
  renderMode();
  $('sd-confidence-number').value=Number((plan.confidence*100).toFixed(1));
  $('sd-confidence-slider').value=Number((plan.confidence*100).toFixed(1));
  document.querySelectorAll('[data-bonus]').forEach(input=>{input.checked=Boolean(plan.bonuses[input.dataset.bonus]);});
  renderEffects(); update();
}
function renderMode() {
  document.querySelectorAll('[data-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===plan.mode)));
  $('sd-confidence-controls').hidden=plan.mode!=='confidence';
}
function update() {
  try {
    const result=calculateStardust(plan);
    $('sd-error').hidden=true; $('sd-results').hidden=false; $('sd-summary').hidden=false;
    $('sd-total-label').textContent=result.mode==='expectation'?'期望任務總次數':'規劃任務總次數';
    $('sd-support-column').textContent=result.mode==='expectation'?'支援期望用量（個）':'支援備量（個）';
    for(const [id,value] of [['sd-life-total',result.lifeTasks],['sd-combat-total',result.combatTasks],['sd-task-total',result.totalTasks]]) $(id).textContent=`${number(value)} 次`;
    $('sd-multiplier').textContent=`${result.multiplier}×`;
    $('sd-reward-caption').textContent=`每次任務：兩種材料各 ${result.reward} 個`;
    $('sd-task-rows').innerHTML=result.rows.map(row=>`<tr><th scope="row">${row.grade}</th><td>${row.tier}</td><td>${number(row.main)}</td><td>${number(row.support)}</td><td>${number(row.tasks)}</td><td>${number(row.tasks)}</td></tr>`).join('')+`<tr class="sd-extra"><th scope="row">E・補通用材料</th><td>通用</td><td colspan="2">${result.mode==='expectation'?'期望缺額':'缺額'}：各 ${number(result.commonDeficit)} 個</td><td>${number(result.extraTasks)}</td><td>${number(result.extraTasks)}</td></tr>`;
    $('sd-life-footer').textContent=`${number(result.lifeTasks)} 次`;
    $('sd-combat-footer').textContent=`${number(result.combatTasks)} 次`;
    $('sd-common-caption').textContent=`框架連接器、成束因子${result.mode==='expectation'?'期望需求':'備量'}：各 ${number(result.commonTotal)} 個；各級任務${result.mode==='expectation'?'期望取得':'取得'}各 ${number(result.commonFromGradedTasks)} 個。補缺額的 E 級任務已計入總次數。`;
    try {localStorage.setItem(STORAGE,JSON.stringify(plan));} catch { /* Optional storage. */ }
  } catch(error) {
    $('sd-error').hidden=false; $('sd-error').textContent=error.message;
    $('sd-results').hidden=true; $('sd-summary').hidden=true;
  }
}
$('sd-current-rank').addEventListener('change',event=>{plan.currentRank=Number(event.target.value);update();});
$('sd-mode').addEventListener('click',event=>{
  const button=event.target.closest('[data-mode]');
  if(!button)return;
  plan.mode=button.dataset.mode;renderMode();update();
});
for(const [id,other] of [['sd-confidence-number','sd-confidence-slider'],['sd-confidence-slider','sd-confidence-number']]) {
  $(id).addEventListener('input',event=>{
    const value=event.target.value;
    plan.confidence=value===''?'':Number((Number(value)/100).toPrecision(14));
    if(value!=='' && Number(value)>=.1 && Number(value)<=99.9) $(other).value=value;
    update();
  });
}
$('sd-effects-rows').addEventListener('change',event=>{
  const input=event.target;
  if(input.dataset.effect) {
    plan.effects.find(e=>e.id===input.dataset.effect).enabled=input.checked;
    renderEffects();
  } else if(input.dataset.level) {
    plan.effects.find(e=>e.id===input.dataset.effectId)[input.dataset.level]=Number(input.value);
    renderBulkLevels();
  }
  update();
});
for(const key of ['current']) $(`sd-bulk-${key}`).addEventListener('change',event=>{
  if(!event.target.value)return;
  plan.effects.forEach(e=>{e[key]=Number(event.target.value);});renderEffects();update();
});
for(const [id,enabled] of [['sd-select-all',true],['sd-main-only',false]]) $(id).addEventListener('click',()=>{
  plan.effects.forEach(e=>{e.enabled=enabled;});renderEffects();update();
});
document.querySelectorAll('[data-bonus]').forEach(input=>input.addEventListener('change',()=>{
  const key=input.dataset.bonus;
  plan.bonuses=toggleStardustBonus(plan.bonuses,key,input.checked);
  document.querySelectorAll('[data-bonus]').forEach(el=>{el.checked=Boolean(plan.bonuses[el.dataset.bonus]);});
  update();
}));
$('sd-reset').addEventListener('click',()=>{plan=defaultStardustPlan();renderControls();});
document.querySelectorAll('.sd-help-button').forEach(button=>{
  button.addEventListener('click',()=>{
    const open=button.getAttribute('aria-expanded')!=='true';
    button.setAttribute('aria-expanded',String(open));button.parentElement.classList.toggle('open',open);
  });
  button.addEventListener('keydown',event=>{
    if(event.key==='Escape'){button.setAttribute('aria-expanded','false');button.parentElement.classList.remove('open');button.blur();}
  });
});
renderControls();
