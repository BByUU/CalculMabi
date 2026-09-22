import {escapeHtml as esc, formatNumber as fmt} from './format.js';
import {currentSkillRoute, renderSkillNavigation, bindSkillNavigation} from './skill-navigation.js';
import {RANKS,simulateSkill} from './calculator.js';
import {SKILL_BONUS_PROFILES,COUNT_BONUSES,POTIONS,defaultBonusSettings,bonusesAfterSkillChange,equipmentOptions,calculateSkillBonuses} from './bonuses.js';
const $=id=>document.getElementById(id);
let data,state,result;
function defaults(skillId='blacksmith'){
  return {skillId,startRank:'F',targetRank:'1',progress:0,trainTo30:false,...defaultBonusSettings(),enabled:{},completed:{},recipes:{}};
}
function bonuses(){return calculateSkillBonuses(state.skillId,state);}
function navigation(){renderSkillNavigation(state.skillId,'training');}
function controls(){
  $('start-rank').innerHTML=RANKS.map(r=>`<option value="${r}" ${r===state.startRank?'selected':''}>${r}</option>`).join('');
  $('target-rank').innerHTML=RANKS.map((r,i)=>`<option value="${r}" ${r===state.targetRank?'selected':''} ${i<RANKS.indexOf(state.startRank)?'disabled':''}>${r}</option>`).join('');
  $('current-progress').value=state.progress;
  $('train-to-30').checked=state.trainTo30;
  const profile=SKILL_BONUS_PROFILES[state.skillId];
  const checkboxes=COUNT_BONUSES.map(o=>`<div class="bonus-option"><label><input type="checkbox" data-bonus="${o.id}" ${state.checked[o.id]?'checked':''}>${esc(o.name)}</label><span>×${o.multiplier}</span></div>`).join('');
  const gear=equipmentOptions(state.skillId).map(o=>`<option value="${o.id}" ${state.equipment===o.id||o.aliases?.includes(state.equipment)?'selected':''}>${esc(o.name)}</option>`).join('');
  $('bonus-controls').innerHTML=`<div>
    <h3 class="bonus-group-title">修練次數<span>最高 8 倍</span></h3>
    ${checkboxes}
    <label class="bonus-select">修練水（擇一）<select id="potion">${POTIONS.map(p=>`<option value="${p.id}" ${state.potion===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label>
    <label class="bonus-select">目前活動的次數倍率<input id="count-event" type="number" min="1" max="100" step="0.1" value="${state.countEvent}"></label>
  </div><div>
    <h3 class="bonus-group-title">修練經驗值<span>獨立乘算</span></h3>
    <label class="bonus-select">裝備修練 EXP 效果<select id="equipment">${gear}</select></label>
    <label class="bonus-select" ${state.equipment==='custom'?'':'hidden'}>遊戲內裝備實際倍率<input id="equipment-custom" type="number" min="1" max="10" step="0.01" value="${state.equipmentCustom}"></label>
    <label class="bonus-select">場所修練效果<select id="location"><option value="none" ${state.location==='none'?'selected':''}>無場所加成</option>${profile.workshop?`<option value="workshop-1" ${state.location==='workshop-1'?'selected':''}>對應農場工房 Lv.1 · ×1.2</option><option value="workshop-2" ${state.location==='workshop-2'?'selected':''}>對應農場工房 Lv.2 · ×1.5</option>`:''}<option value="custom" ${state.location==='custom'?'selected':''}>其他已確認效果（自行填寫）</option></select></label>
    <label class="bonus-select" ${state.location==='custom'?'':'hidden'}>遊戲內場所實際倍率<input id="location-custom" type="number" min="1" max="10" step="0.01" value="${state.locationCustom}"></label>
    <div class="bonus-option value-pet"><label title="對應才能：${esc(profile.talent)}；召喚並生效時，修練經驗值 ×2。"><input id="value-pet" type="checkbox" ${state.valuePet?'checked':''}>天使貓／深淵貓</label><span>×2</span></div>
    <label class="bonus-select">目前活動的修練值倍率<input id="value-event" type="number" min="1" max="100" step="0.1" value="${state.valueEvent}"></label>
  </div>`;
}
function update(){
  const skill=data.skills.find(s=>s.id===state.skillId);
  document.title=`${skill.name}修練模擬｜瑪奇小算盤 CalculMabi`;
  try{
    const b=bonuses();result=simulateSkill(skill,{...state,countMultiplier:b.count,valueMultiplier:b.value});$('error-message').hidden=true;
    $('combined-bonus').innerHTML=`${fmt(b.combined)}<span>×</span>`;
    $('bonus-breakdown').textContent=`次數 ${fmt(b.count)}× · 經驗值 ${fmt(b.value)}×${b.rawCount>8?'（次數已封頂）':''}`;
    $('summary').innerHTML=`<article class="stat-card"><span>項目達成次數</span><strong>${fmt(result.totalActions)}<small>次</small></strong><p>各項分別估算，未合併同次觸發</p></article><article class="stat-card"><span>已知所需材料</span><strong>${result.materials.length}<small>種</small></strong><p>${result.unknownTasks?`${result.unknownTasks} 項配方資料不完整`:'依所選配方的直接用量估算'}</p></article><article class="stat-card accent"><span>修練加成</span><strong>${fmt(b.combined)}<small>×</small></strong><p>次數 ${fmt(b.count)}× · 經驗值 ${fmt(b.value)}×</p></article>`;
    plan(skill);materials();
  }catch(error){
    result=null;$('error-message').hidden=false;$('error-message').textContent=error.message;
    $('summary').innerHTML='<p class="muted">請修正設定後重新計算。</p>';
    $('plan-panel').innerHTML='';$('materials-panel').innerHTML='';$('combined-bonus').textContent='—';$('bonus-breakdown').textContent='等待有效設定';
  }
}
function materialList(items, className='') {
  return items.length ? '<ul class="training-material-list '+className+'">'+items.map(m=>'<li><span>'+esc(m.name)+'</span><strong>×'+fmt(m.quantity)+'</strong></li>').join('')+'</ul>' : '<span class="muted">—</span>';
}
function stageMaterials(stage) {
  const totals=new Map();
  for(const task of stage.tasks) for(const material of task.materials??[]) {
    if(task.actions>0) totals.set(material.name,(totals.get(material.name)??0)+material.perAction*task.actions);
  }
  return Array.from(totals,([name,quantity])=>({name,quantity}));
}
function plan(skill){
  if(!result.stages.length){$('plan-panel').innerHTML='<div class="empty-state">已到達目標 Rank，無須追加修練。</div>';return;}
  $('plan-panel').innerHTML=result.stages.map((s,i)=>{
    const hasCompleted=i===0&&Number(state.progress)>0;
    return `<section class="rank-card" data-rank="${s.rank}" aria-labelledby="rank-heading-${s.rank}">
      <div class="rank-heading"><span class="rank-emblem">${s.rank}</span><div class="rank-title"><h3 id="rank-heading-${s.rank}">Rank ${s.rank} <span aria-hidden="true">→</span> ${s.nextRank}</h3><p>${s.missing?'此階資料尚未收錄':fmt(s.actions)+' 次達成'}</p></div></div>
      <div class="rank-detail">${s.missing?'<p class="rank-warning">此 Rank 資料尚未收錄，無法計算需求。</p>':`<div class="table-scroll"><table class="task-table">
        <thead><tr><th scope="col">納入修練</th><th scope="col">製作品</th><th scope="col">基礎值</th><th scope="col">次數上限</th>${hasCompleted?'<th scope="col">已計數</th>':''}<th scope="col">需達成</th><th scope="col">修練值</th><th scope="col" class="training-usage">材料消耗</th></tr></thead>
        <tbody>${s.tasks.map(t=>row(t,i)).join('')}</tbody>
        <tfoot><tr><th scope="row" colspan="${hasCompleted?6:5}">本階合計${s.startingPoints?`<small>修練值：已有 ${fmt(s.startingPoints)} · 新增 ${fmt(s.points-s.startingPoints)}</small>`:''}</th>
        <td class="rank-score ${s.points<result.trainingGoal?'score-below-goal':''}" aria-label="修練值 ${fmt(s.points)}，目標 ${result.trainingGoal}${s.points<result.trainingGoal?'，未達目標':''}">${fmt(s.points)} / ${result.trainingGoal}</td><td class="training-usage">${materialList(stageMaterials(s))}</td></tr></tfoot>
      </table></div><div class="progress-track" role="progressbar" aria-label="Rank ${s.rank} 修練值" aria-valuemin="0" aria-valuemax="${result.trainingGoal}" aria-valuenow="${Math.min(result.trainingGoal,s.points)}"><div class="progress-fill" style="width:${Math.min(100,Math.max(0,s.points)/result.trainingGoal*100)}%"></div></div>`}</div></section>`;
  }).join('');
}
function row(t,index){
  const recipe=t.recipeVariants?.length>1?`<select class="recipe-select" aria-label="${esc(t.description)}配方" data-recipe="${t.id}">${t.recipeVariants.map(v=>`<option value="${esc(v.recipe)}" ${v.recipe===t.recipe?'selected':''}>${esc(v.recipe)}</option>`).join('')}</select>`:`<small>${esc(t.recipe||'配方尚未收錄')}</small>`;
  const usage=t.actions>0?materialList((t.materials??[]).map(m=>({name:m.name,quantity:m.perAction*t.actions}))):'<span class="muted">—</span>';
  const missing=t.actions>0&&t.materialStatus!=='provided'?'<small class="warning">'+(t.materialStatus==='partial'?'部分材料未收錄':'材料未收錄')+'</small>':'';
  return `<tr class="${t.included?'':'dim'}"><td><label class="task-check"><input type="checkbox" data-task="${t.id}" ${t.included?'checked':''} aria-label="納入${esc(t.description)}"><span class="task-description">${esc(t.description)}</span></label></td><td><div class="task-recipe">${recipe}</div></td><td>${fmt(t.baseValue)}</td><td>${fmt(t.maxCount)}</td>${index===0&&Number(state.progress)>0?`<td><input class="completed-input" data-completed="${t.id}" type="number" min="0" max="${t.maxCount}" step="1" value="${t.completed}" aria-label="${esc(t.description)}已計數次數"></td>`:''}<td class="action-number">${fmt(t.actions)}<small> 次</small></td><td>${fmt(t.points)}</td><td class="training-usage">${usage}${missing}</td></tr>`;
}
function materials(){
  const missing=result.unknownTasks?`<p class="training-material-note">${result.unknownTasks} 項修練的材料未完整收錄，以下加總已知用量。</p>`:'';
  $('materials-panel').innerHTML=missing+(result.materials.length?materialList(result.materials,'training-total-list'):`<p class="training-material-note">${result.unknownTasks?'目前沒有可加總的材料資料。':'無須追加材料。'}</p>`);
}
function events(){
  bindSkillNavigation('training',skillId=>{state={...state,...bonusesAfterSkillChange(state),skillId,progress:0,enabled:{},completed:{},recipes:{}};navigation();controls();update();});
  $('reset').addEventListener('click',()=>{state=defaults(state.skillId);controls();update();});
  $('start-rank').addEventListener('change',event=>{state.startRank=event.target.value;state.progress=0;state.completed={};if(RANKS.indexOf(state.targetRank)<RANKS.indexOf(state.startRank))state.targetRank=state.startRank;controls();update();});
  $('train-to-30').addEventListener('change',event=>{state.trainTo30=event.target.checked;update();});
  $('target-rank').addEventListener('change',event=>{state.targetRank=event.target.value;update();});
  $('current-progress').addEventListener('input',event=>{state.progress=event.target.value;if(Number(state.progress)===0)state.completed={};update();});
  $('bonus-controls').addEventListener('change',event=>{
    const el=event.target;
    const fields={'potion':'potion','count-event':'countEvent','equipment':'equipment','equipment-custom':'equipmentCustom','location':'location','location-custom':'locationCustom','value-event':'valueEvent'};
    if(el.dataset.bonus)state.checked[el.dataset.bonus]=el.checked;
    else if(el.id==='value-pet')state.valuePet=el.checked;
    else if(fields[el.id])state[fields[el.id]]=el.value;
    if(el.id==='equipment'||el.id==='location'){controls();$(el.id).focus();}
    update();
  });
  $('plan-panel').addEventListener('change',event=>{const el=event.target;if(el.dataset.task)state.enabled[el.dataset.task]=el.checked;else if(el.dataset.recipe)state.recipes[el.dataset.recipe]=el.value;else if(el.dataset.completed){if(el.value===''||!el.checkValidity()){el.reportValidity();$('error-message').hidden=false;$('error-message').textContent='已計數次數請填 0 至該項上限的整數。';return;}state.completed[el.dataset.completed]=el.value;}update();});
}
function registerTools(){
  if(!document.modelContext?.registerTool)return;
  const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  const tool={name:'configure_training_simulation',title:'設定生活技能修練模擬',description:'設定已收錄技能及Rank區間，更新畫面。切換技能時重設技能限定加成，保留通用效果；重設既有進度與配方。',inputSchema:{type:'object',properties:{skillId:{type:'string',enum:data.skills.map(s=>s.id)},startRank:{type:'string',enum:RANKS},targetRank:{type:'string',enum:RANKS}},required:['skillId','startRank','targetRank'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){
    if(!input||typeof input!=='object'||Object.keys(input).some(k=>!['skillId','startRank','targetRank'].includes(k))||!data.skills.some(s=>s.id===input.skillId)||!RANKS.includes(input.startRank)||!RANKS.includes(input.targetRank)||RANKS.indexOf(input.startRank)>RANKS.indexOf(input.targetRank))throw new Error('請提供有效技能與升級區間。');
    const next={...state,...(input.skillId===state.skillId?{}:bonusesAfterSkillChange(state)),...input,progress:0,enabled:{},completed:{},recipes:{}};calculateSkillBonuses(next.skillId,next);state=next;navigation();controls();update();
    return {skillId:state.skillId,ranks:result.stages.length,totalActions:result.totalActions,materials:result.materials,blockedStages:result.blockedStages};
  }};
  try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* Optional browser standard. */}
}
async function init(){try{
  const response=await fetch('./data/skills.json');if(!response.ok)throw new Error('技能資料載入失敗，請重新整理頁面。');data=await response.json();
  if(!Array.isArray(data.skills)||!data.skills.length)throw new Error('技能資料格式不完整。');
  state=defaults(currentSkillRoute('training').skillId);
  $('method-notes').innerHTML=`<p>每項新增修練值 = 基礎值 × 修練值倍率 × min（剩餘可計數上限，達成次數 × 次數倍率）。次數倍率最高 8 倍；每階預設以 100 修練值為目標；勾選「練到 30%」改以 30 為目標，排除目標 Rank 本身。每次操作不可拆分，實際新增修練值可能超過目標；30% 模式只估算各階部分修練的用量。</p><p>優先依建議項目與順序計算，再計入額外勾選的項目。路線未比較材料價格，各項達成次數分別估算，尚未合併單次行動同時觸發的項目。</p><p>材料採直接配方，缺漏不視為零耗材。部分魔法製造配方資料不完整；中間產物與跨階再利用尚未抵扣。</p><p>既有修練值不隨新倍率重算。起始 Rank 已有進度時，請另填各項已計數以扣除上限。本頁不估算 AP、成功率、升段或大師修練。</p><p>同一技能的修練水擇一。細工與回音採擇一估算，其他裝備組合請填入實際總倍率。切換技能會重設技能限定效果；道具與活動倍率請依遊戲內顯示確認。</p><p>天使貓／深淵貓須對應才能，召喚並生效時提供修練經驗值 2 倍。農場工房限對應才能且已啟動的研究效果。</p>`;
  navigation();controls();events();update();registerTools();
}catch(error){$('error-message').hidden=false;$('error-message').textContent=error.message;$('plan-panel').innerHTML='<div class="empty-state">無法讀取技能資料。請透過網站網址開啟，並重新整理。</div>';}}
init();
