import {simulateErg, materialsBySlot, materialCosts, formatGold, materialStacks} from '/erg-calculator.js';
import {formatNumber} from '/format.js';
import {CATEGORIES, TRAITS, defaultTraitPlan, calculateTraits} from '/traits-calculator.js';
import {SUB_SKILLS, defaultKnightsPlan, calculateKnights, formatDuration} from '/knights-calculator.js';
const frame=document.getElementById('app'), report=document.getElementById('results');
let assertions=0, timing='';
// Hidden or backgrounded windows can stop producing frames; never wait on one indefinitely.
const nextFrame=()=>new Promise(resolve=>{const timer=setTimeout(resolve,100);requestAnimationFrame(()=>{clearTimeout(timer);resolve();});});
function assert(ok,message) { assertions++; if(!ok)throw new Error(message); }
function same(actual,expected,message) { assert(actual===expected,`${message}: ${actual} !== ${expected}`); }
function change(input,value,type='change') {
  if(input.type==='checkbox')input.checked=value;else input.value=value;
  input.dispatchEvent(new input.ownerDocument.defaultView.Event(type,{bubbles:true}));
}
async function open(page,ready) {
  frame.src='/'+page;
  await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{clearInterval(timer);reject(new Error(`載入逾時：${page}`));},10000);
    const timer=setInterval(()=>{
      if(frame.contentDocument?.location.pathname!=='/'+page || !ready(frame.contentDocument))return;
      clearTimeout(timeout);clearInterval(timer);resolve();
    },25);
  });
  return frame.contentDocument;
}
document.getElementById('run').addEventListener('click',async()=>{
  const button=document.getElementById('run');button.disabled=true;assertions=0;
  const keys=['mabi-erg-v1','mabi-stardust-plan-v1','mabi-traits-v1','mabi-traits-order','mabi-knights-v1'];
  const stored=keys.map(key=>[key,localStorage.getItem(key)]);
  keys.forEach(key=>localStorage.removeItem(key));report.textContent='測試中…';
  try {
    const sd=await open('stardust.html',d=>d.querySelectorAll('[data-effect]').length===15);
    const effect=sd.querySelector('[data-effect="effect-1"]'), cells=[...sd.querySelectorAll('[data-effect]')];
    const originalTotal=sd.getElementById('sd-task-total').textContent;
    effect.focus();effect.click();
    same(sd.activeElement,effect,'取消支援效果保留焦點');
    assert(sd.querySelector('[aria-label="爆破目前等級"]').disabled,'取消後等級停用');
    assert(sd.getElementById('sd-task-total').textContent!==originalTotal,'取消效果重新計算任務');
    effect.click();same(sd.activeElement,effect,'重新勾選保留焦點');
    same(sd.getElementById('sd-task-total').textContent,originalTotal,'還原效果的任務數');
    change(sd.querySelector('[aria-label="爆破目前等級"]'),'2');
    same(sd.getElementById('sd-bulk-current').value,'','個別等級反映於統一選單');
    change(sd.getElementById('sd-bulk-current'),'1');
    assert(!sd.getElementById('sd-target-rank'),'星塵不再提供目標 Rank');
    assert(!sd.querySelector('[data-level="target"]'),'支援效果不再提供目標等級');
    assert(!sd.querySelector('[data-effect="effect-15"]').disabled,'最高目標包含全部效果');
    const sdLevel=sd.querySelector('[aria-label="爆破目前等級"]');
    sdLevel.parentElement.querySelector('button:last-child').click();same(sdLevel.value,'2','支援等級按鈕增加');
    change(sdLevel,'20','input');same(sdLevel.getAttribute('aria-invalid'),'true','支援非法等級');
    change(sdLevel,'20');same(sdLevel.value,'2','支援非法等級恢復');
    change(sdLevel,'1');
    change(sd.getElementById('sd-current-rank'),'15','input');
    same(sd.getElementById('sd-current-rank').value,'15','主體可直接輸入最高等級');
    change(sd.getElementById('sd-current-rank'),'1');
    cells.forEach((cell,i)=>same(sd.querySelectorAll('[data-effect]')[i],cell,'效果節點保留'));
    sd.getElementById('sd-main-only').click();sd.getElementById('sd-select-all').click();
    same(sd.getElementById('sd-task-total').textContent,originalTotal,'全部取消與全選回到原計算');
    report.textContent='星塵焦點與狀態測試通過。特性測試中…';

    // A plan saved before the target level was fixed at Lv.10 still loads its current levels and held points.
    localStorage.setItem('mabi-traits-v1',JSON.stringify({levels:{haste:{current:5,target:7}},held:{training:300}}));
    let tr=await open('traits.html',d=>d.querySelectorAll('[data-trait]').length===TRAITS.length);
    let traitPlan=defaultTraitPlan();
    traitPlan.levels.haste={current:5};traitPlan.held.training=300;
    const amount=n=>n?formatNumber(n):'—';
    function verifyTraits() {
      const result=calculateTraits(traitPlan);
      for (const row of result.rows) {
        const node=tr.querySelector(`[data-trait="${row.id}"]`);
        same(node.querySelector('[data-level]').value,String(row.current),`${row.id} 目前等級`);
        same(node.querySelector('[data-cell="weeks"]').textContent,`${Math.ceil(row.points/1500)} 週`,`${row.id} 個別週數`);
        same(node.classList.contains('tr-done'),row.current===10,`${row.id} 完成標示`);
        for (const key of ['points','ap','basic','advanced']) same(node.querySelector(`[data-cell="${key}"]`).textContent,amount(row[key]),`${row.id} ${key}`);
      }
      for (const category of result.categories) {
        const node=tr.querySelector(`[data-category="${category.id}"]`);
        same(node.querySelector('[data-cell="missing"]').textContent,formatNumber(category.missing),`${category.id} 缺少`);
        same(node.querySelector('[data-cell="weeks"]').textContent,category.missing?`${formatNumber(category.weeks)} 週`:'已足夠',`${category.id} 週數`);
      }
      for (const category of result.categories) {
        const subtotal=tr.querySelector(`[data-subtotal="${category.id}"]`);
        for (const key of ['ap','basic','advanced']) same(subtotal.querySelector(`[data-cell="${key}"]`).textContent,amount(category[key]),`${category.id} 小計 ${key}`);
        same(subtotal.querySelector('[data-cell="weeks"]').textContent,category.missing?`${formatNumber(category.weeks)} 週`:'已足夠',`${category.id} 小計週數`);
        if (tr.getElementById('tr-subtotals').hidden) {
          same(subtotal.previousElementSibling.dataset.trait,TRAITS.filter(t=>t.category===category.id).at(-1).id,'小計放在各類最後');
        } else same(subtotal.parentElement.id,'tr-subtotal-rows','遊戲排序小計集中在下方');
      }
      same(tr.getElementById('tr-missing-total').textContent,`${formatNumber(result.totals.missing)} 點`,'特性缺少合計');
      same(tr.getElementById('tr-weeks-total').textContent,result.totals.weeks?`${formatNumber(result.totals.weeks)} 週`:'已足夠','特性週數');
    }
    verifyTraits();
    same(tr.querySelector('[data-held="training"]').value,'300','舊版儲存的持有點數');
    tr.getElementById('tr-reset').click();traitPlan=defaultTraitPlan();verifyTraits();
    same(tr.getElementById('tr-weeks-total').textContent,'33 週','全部升滿需 33 週');
    same(tr.querySelectorAll('[data-trait="haste"] input[data-level]').length,1,'每個特性只選目前等級');
    const icons=[...tr.querySelectorAll('[data-trait] .tr-icon')];
    same(icons.length,TRAITS.length,'每個特性都有圖示');
    for (const icon of icons) {
      const id=icon.closest('[data-trait]').dataset.trait;
      same(icon.getAttribute('src'),`./assets/traits/${id}.webp`,`${id} 圖示路徑`);
      same((await fetch(icon.src,{method:'HEAD'})).status,200,`${id} 圖示存在`);
    }
    const traitControls=[...tr.querySelectorAll('[data-level], [data-held]')];
    const haste=tr.querySelector('[data-trait="haste"] [data-level]');
    haste.focus();change(haste,'8');traitPlan.levels.haste={current:8};
    same(tr.activeElement,haste,'特性等級焦點不變');verifyTraits();
    const stepButtons=haste.parentElement.querySelectorAll('button');
    stepButtons[1].click();traitPlan.levels.haste={current:9};verifyTraits();
    stepButtons[0].click();traitPlan.levels.haste={current:8};verifyTraits();
    change(haste,'11','input');same(haste.getAttribute('aria-invalid'),'true','非法等級標示錯誤');
    change(haste,'11');same(haste.value,'8','非法等級恢復上次數值');verifyTraits();
    change(haste,'1','input');change(haste,'10','input');traitPlan.levels.haste={current:10};verifyTraits();
    assert(stepButtons[1].disabled,'最高等級禁止增加');
    change(haste,'8');traitPlan.levels.haste={current:8};verifyTraits();
    const untouchedTrait=tr.querySelector('[data-trait="block"]'), traitObserver=new MutationObserver(()=>{});
    traitObserver.observe(untouchedTrait,{attributes:true,childList:true,subtree:true,characterData:true});
    change(haste,'10');traitPlan.levels.haste={current:10};
    same(traitObserver.takeRecords().length,0,'未改動特性沒有 DOM 寫入');traitObserver.disconnect();verifyTraits();
    const held=tr.querySelector('[data-held="training"]');
    held.focus();change(held,'1200','input');traitPlan.held.training=1200;
    same(tr.activeElement,held,'持有點數焦點不變');verifyTraits();
    change(held,'6000','input');
    assert(!tr.getElementById('tr-error').hidden,'超過持有上限顯示錯誤');verifyTraits();
    change(held,'','input');traitPlan.held.training=0;
    assert(tr.getElementById('tr-error').hidden,'修正後隱藏錯誤');verifyTraits();
    change(tr.getElementById('tr-bulk-level'),'5');
    tr.getElementById('tr-bulk-apply').click();
    for (const trait of TRAITS) traitPlan.levels[trait.id]={current:5};
    verifyTraits();
    assert(traitControls.every(node=>tr.contains(node)),'特性控制項不重建');
    const orderOf=()=>[...tr.querySelectorAll('#tr-trait-rows > tr:not([hidden]):not([data-subtotal])')].map(row=>row.dataset.trait??`group:${row.dataset.group}`).join();
    const gameOrder=TRAITS.map(trait=>trait.id).join();
    const colorOrder=CATEGORIES.flatMap(category=>[`group:${category.id}`,...TRAITS.filter(trait=>trait.category===category.id).map(trait=>trait.id)]).join();
    same(orderOf(),gameOrder,'預設遊戲排序');
    assert(tr.getElementById('tr-trait-table').classList.contains('tr-game-order'),'遊戲排序顯示分類色條');
    const hasteLevel=tr.querySelector('[data-trait="haste"] [data-level]');change(hasteLevel,'8');traitPlan.levels.haste={current:8};
    const colorButton=tr.querySelector('[data-order="color"]');colorButton.focus();colorButton.click();
    same(tr.activeElement,colorButton,'排序按鈕焦點不變');
    same(colorButton.getAttribute('aria-pressed'),'true','顏色排序按下');
    same(orderOf(),colorOrder,'顏色排序依分類分組');
    same(tr.querySelector('[data-trait="haste"] [data-level]'),hasteLevel,'排序不重建選單');
    same(hasteLevel.value,'8','排序保留已選等級');
    assert(traitControls.every(node=>tr.contains(node)),'排序後控制項仍在');verifyTraits();
    const before=tr;tr.defaultView.location.reload();
    await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>{clearInterval(timer);reject(new Error('特性頁重新載入逾時'));},10000);
      const timer=setInterval(()=>{const d=frame.contentDocument;if(!d||d===before||d.querySelectorAll('[data-trait]').length!==TRAITS.length)return;clearTimeout(timeout);clearInterval(timer);resolve();},25);
    });
    tr=frame.contentDocument;
    same(orderOf(),colorOrder,'重新載入保留顏色排序');verifyTraits();
    tr.querySelector('[data-order="game"]').click();
    same(orderOf(),gameOrder,'切回遊戲排序');verifyTraits();
    tr.getElementById('tr-reset').click();traitPlan=defaultTraitPlan();verifyTraits();
    report.textContent='星塵與特性測試通過。騎士團測試中…';

    // A plan saved before 聖靈同步 had per-sub-skill timers keeps its 聖盾 interval; the old single 聖靈同步 interval is dropped.
    localStorage.setItem('mabi-knights-v1',JSON.stringify({intervals:{'shield-of-trust':25,'divine-link':30},subSkills:{'pet-auto-revive':{level:3,progress:0}}}));
    const kn=await open('knights.html',d=>d.querySelectorAll('[data-sub]').length===SUB_SKILLS.length);
    let knightPlan=defaultKnightsPlan();
    knightPlan.intervals['shield-of-trust']=25;knightPlan.subSkills['pet-auto-revive']={level:3,progress:0};
    const knightStep=step=>step.seconds===null?`${formatNumber(step.successes)} 次只計次數`:`${formatDuration(step.seconds)}${formatNumber(step.successes)} 次`;
    function verifyKnights() {
      for (const main of calculateKnights(knightPlan).mains) {
        for (const [id,seconds] of Object.entries(main.intervals)) same(kn.querySelector(`[data-interval="${id}"]`).value,String(seconds),`${id} 間隔`);
        for (const row of main.rows) {
          const node=kn.querySelector(`[data-sub="${row.id}"]`);
          same(node.querySelector('[data-level]').value,String(row.level),`${row.id} 等級`);
          same(node.querySelector('[data-cell="gain"]').textContent,row.maxed?'—':`${row.gain.toLocaleString('zh-TW',{maximumFractionDigits:4})}%`,`${row.id} 每次`);
          same(node.querySelector('[data-cell="next"]').textContent,row.maxed?'已滿級':knightStep(row.next),`${row.id} 目前等級`);
          same(node.querySelector('[data-cell="max"]').textContent,row.maxed?'—':knightStep(row.toMax),`${row.id} 升滿`);
        }
      }
    }
    verifyKnights();
    same(kn.querySelectorAll('[data-interval]').length,3,'聖盾一個、聖靈同步兩個時間輸入框');
    same(kn.querySelector('[data-interval="pet-life-wound-recover"]').value,'60','舊版聖靈同步間隔不套用');
    same(kn.querySelector('[data-sub="exp-bonus"] [data-cell="next"]').textContent,'10 次只計次數','啟迪之光只計次數');
    kn.getElementById('kn-reset').click();knightPlan=defaultKnightsPlan();verifyKnights();
    same(kn.querySelector('[data-sub="pet-life-wound-recover"] [data-cell="next"]').textContent,'5 分 0 秒5 次','復甦的靈魂每 60 秒');
    same(kn.querySelector('[data-sub="pet-auto-revive"] [data-cell="next"]').textContent,'50 秒5 次','復活的權杖每 10 秒');
    const reviveInterval=kn.querySelector('[data-interval="pet-auto-revive"]'), shieldRow=kn.querySelector('[data-sub="range-bonus"]'), timerObserver=new MutationObserver(()=>{});
    timerObserver.observe(shieldRow,{attributes:true,childList:true,subtree:true,characterData:true});
    reviveInterval.focus();change(reviveInterval,'12','input');knightPlan.intervals['pet-auto-revive']=12;
    same(kn.activeElement,reviveInterval,'復活間隔焦點不變');
    same(timerObserver.takeRecords().length,0,'改復活間隔不動聖盾列');timerObserver.disconnect();verifyKnights();
    const knightControls=[...kn.querySelectorAll('#kn-mains select, #kn-mains input')];
    const magicLevel=kn.querySelector('[data-level="increase-magic-defense"]');
    magicLevel.focus();change(magicLevel,'10');knightPlan.subSkills['increase-magic-defense']={level:10,progress:0};
    same(kn.activeElement,magicLevel,'副技能等級焦點不變');verifyKnights();
    magicLevel.parentElement.querySelector('button:last-child').click();
    knightPlan.subSkills['increase-magic-defense']={level:11,progress:0};verifyKnights();
    change(magicLevel,'16','input');same(magicLevel.getAttribute('aria-invalid'),'true','副技能非法等級提示');
    change(magicLevel,'16');same(magicLevel.value,'11','副技能非法等級恢復');
    change(magicLevel,'10','input');knightPlan.subSkills['increase-magic-defense']={level:10,progress:0};verifyKnights();
    same(kn.querySelector('[data-sub="increase-magic-defense"] [data-cell="next"]').textContent,'33 分 20 秒100 次','聖盾每 20 秒：魔法反制 Lv.10 升一級');
    change(kn.querySelector('[data-level="recover-hp"]'),'12');knightPlan.subSkills['recover-hp']={level:12,progress:0};
    same(kn.querySelector('[data-sub="recover-hp"] [data-cell="gain"]').textContent,'0.3125%','每次修練值顯示到小數四位');
    same(kn.querySelector('[data-sub="recover-hp"] [data-cell="next"]').textContent,'1 小時 46 分 40 秒320 次','0.3125% 需 320 次');verifyKnights();
    const linkRow=kn.querySelector('[data-sub="exp-bonus"]'), knightObserver=new MutationObserver(()=>{});
    knightObserver.observe(linkRow,{attributes:true,childList:true,subtree:true,characterData:true});
    const magicProgress=kn.querySelector('[data-progress="increase-magic-defense"]');
    magicProgress.focus();change(magicProgress,'45','input');knightPlan.subSkills['increase-magic-defense'].progress=45;
    same(kn.activeElement,magicProgress,'修練值焦點不變');
    same(knightObserver.takeRecords().length,0,'其他主技能的副技能沒有 DOM 寫入');knightObserver.disconnect();verifyKnights();
    change(magicProgress,'100','input');
    assert(!kn.getElementById('kn-error').hidden,'修練值 100 顯示錯誤');verifyKnights();
    change(magicProgress,'45','input');assert(kn.getElementById('kn-error').hidden,'修正後隱藏錯誤');
    const shieldInterval=kn.querySelector('[data-interval="shield-of-trust"]');
    shieldInterval.focus();change(shieldInterval,'10','input');knightPlan.intervals['shield-of-trust']=10;
    same(kn.activeElement,shieldInterval,'間隔焦點不變');verifyKnights();
    change(shieldInterval,'','input');assert(!kn.getElementById('kn-error').hidden,'空白間隔顯示錯誤');
    change(shieldInterval,'20','input');knightPlan.intervals['shield-of-trust']=20;verifyKnights();
    change(magicLevel,'15');knightPlan.subSkills['increase-magic-defense']={level:15,progress:0};
    assert(magicProgress.disabled&&magicProgress.value==='','滿級停用修練值並清空');verifyKnights();
    assert(knightControls.every(node=>kn.contains(node)),'副技能控制項不重建');
    same(JSON.parse(localStorage.getItem('mabi-knights-v1')).subSkills['increase-magic-defense'].level,15,'記住副技能等級');
    kn.getElementById('kn-reset').click();knightPlan=defaultKnightsPlan();verifyKnights();
    report.textContent='星塵、特性與騎士團測試通過。技能測試中…';

    const reading=await open('reading.html',d=>d.readyState==='complete'&&d.querySelectorAll('.reading-cell').length===91);
    for(const cell of reading.querySelectorAll('.reading-cell')) {
      assert(cell.querySelector('.reading-source')?.textContent,'讀書格子有取得來源或對話對象');
      assert(cell.querySelector('.reading-requirement')?.textContent,'讀書格子有書名或任務需求');
      const help=cell.querySelector('.reading-help');
      assert(help?.textContent==='?','格子右側有問號');
      const detail=reading.getElementById(help.getAttribute('aria-describedby'));
      cell.dispatchEvent(new reading.defaultView.Event('pointerenter'));
      assert(detail.hidden,'移到格子不開啟詳情');
      help.dispatchEvent(new reading.defaultView.PointerEvent('pointerenter',{pointerType:'mouse'}));
      assert(!detail.hidden,'移到問號開啟詳情');
      reading.dispatchEvent(new reading.defaultView.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
      same(detail.querySelectorAll('p').length,2,'詳情固定來源與需求兩段');
      assert(!detail.querySelector('br'),'任務流程不逐步換行');
    }
    same(reading.querySelectorAll('.reading-legend .reading-help').length,2,'兩個共用商店任務問號');
    for(const help of reading.querySelectorAll('.reading-legend .reading-help')) {
      const panel=reading.getElementById(help.getAttribute('aria-describedby'));
      help.dispatchEvent(new reading.defaultView.PointerEvent('pointerenter',{pointerType:'mouse'}));
      assert(!panel.hidden,'圖例問號顯示任務資訊');
      assert(panel.textContent.includes('腓力特'),'商店任務有觸發對象');
      reading.dispatchEvent(new reading.defaultView.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
      assert(panel.hidden,'Esc 關閉商店任務');
    }
    same(reading.getElementById('reading-1-3').querySelector('.reading-source').textContent,'取得來源：馬努斯特別商店','商店格子不重複領券任務');
    same(reading.querySelectorAll('.reading-empty').length,7,'未提供資料仍保持空白');
    const book=reading.querySelector('[aria-describedby="reading-0-0"]');
    book.focus();same(book.getAttribute('aria-expanded'),'true','讀書格子鍵盤焦點開啟詳情');
    assert(reading.getElementById('reading-0-0').textContent.includes('4400G'),'詳情保留價格');
    reading.dispatchEvent(new reading.defaultView.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    same(book.getAttribute('aria-expanded'),'false','Esc 關閉詳情');
    const quest=reading.querySelector('[aria-describedby="reading-13-2"]');
    quest.click();assert(!reading.getElementById('reading-13-2').hidden,'點選任務顯示詳情');
    assert(reading.getElementById('reading-13-2').textContent.includes('優質結尾用絲線 ×2'),'保留製作材料');
    quest.click();assert(reading.getElementById('reading-13-2').hidden,'再次點選關閉詳情');

    const sk=await open('index.html',d=>d.querySelectorAll('[data-task-row]').length>0);
    sk.querySelector('[data-skill="stationery-craft"]').click();
    const skillSnapshot=()=>[...sk.querySelectorAll('#plan-panel [data-rank]')].map(section=>JSON.stringify({
      title:section.querySelector('.rank-title p')?.textContent, total:section.querySelector('tfoot th')?.innerHTML,
      score:section.querySelector('.rank-score')?.textContent, below:section.querySelector('.rank-score')?.classList.contains('score-below-goal'),
      label:section.querySelector('.rank-score')?.getAttribute('aria-label'), usage:section.querySelector('tfoot .training-usage')?.innerHTML,
      now:section.querySelector('.progress-track')?.getAttribute('aria-valuenow'), width:section.querySelector('.progress-fill')?.style.width,
      rows:[...section.querySelectorAll('[data-task-row]')].map(row=>[row.classList.contains('dim'),row.querySelector('[data-task]').checked,row.querySelector('[data-recipe]')?.value,row.querySelector('.action-number').innerHTML,row.querySelector('[data-points]').textContent,row.querySelector('td.training-usage').innerHTML]),
    })).join('')+sk.getElementById('summary').innerHTML+sk.getElementById('materials-panel').innerHTML;
    function sameAsRebuild(message) {
      const patched=skillSnapshot(), start=sk.getElementById('start-rank'), rank=start.value;
      change(start,'E');change(sk.getElementById('start-rank'),rank);
      same(skillSnapshot(),patched,message);
    }
    const skillControls=[...sk.querySelectorAll('#plan-panel input, #plan-panel select')];
    for (const box of [...sk.querySelectorAll('[data-task]')].filter((_,i)=>i%7===0)) {
      box.focus();box.click();same(sk.activeElement,box,'修練項目焦點不變');
    }
    for (const select of [...sk.querySelectorAll('[data-recipe]')].slice(0,3)) {
      select.focus();change(select,[...select.options].find(option=>option.value!==select.value).value);same(sk.activeElement,select,'配方焦點不變');
    }
    assert(skillControls.every(node=>sk.contains(node)),'修練項目與配方不重建');
    const bonus=sk.querySelector('[data-bonus]');bonus.focus();bonus.click();same(sk.activeElement,bonus,'加成焦點不變');
    change(sk.getElementById('potion'),'royal');sk.getElementById('train-to-30').click();
    assert(skillControls.every(node=>sk.contains(node)),'加成變更不重建修練表');
    const equipment=sk.getElementById('equipment');equipment.focus();change(equipment,'custom');
    same(sk.activeElement,equipment,'裝備選單焦點不變');assert(!sk.getElementById('equipment-custom').closest('label').hidden,'自訂裝備倍率顯示');
    change(sk.getElementById('equipment'),'none');
    sameAsRebuild('修練表局部更新與重建一致');
    const progress=sk.getElementById('current-progress');change(progress,'40','input');
    const completed=[...sk.querySelectorAll('[data-completed]')].reduce((a,b)=>Number(b.max)>Number(a.max)?b:a);
    const withCompleted=[...sk.querySelectorAll('#plan-panel input, #plan-panel select')];
    completed.focus();change(completed,String(Math.min(1,Number(completed.max))));same(sk.activeElement,completed,'已計數焦點不變');
    change(progress,'55','input');assert(withCompleted.every(node=>sk.contains(node)),'修練值與已計數變更不重建');
    change(sk.getElementById('count-event'),'0');assert(!sk.getElementById('error-message').hidden,'無效活動倍率顯示錯誤');
    change(sk.getElementById('count-event'),'1');assert(sk.getElementById('error-message').hidden,'修正後恢復計算');
    change(progress,'0','input');same(sk.querySelectorAll('[data-completed]').length,0,'修練值歸零移除已計數欄');
    sameAsRebuild('錯誤恢復後與重建一致');
    sk.getElementById('reset').click();sk.querySelector('[data-skill="blacksmith"]').click();
    report.textContent='星塵、特性與技能測試通過。聚能測試中…';

    const data=await (await fetch('/data/erg.json')).json(), catalog=await (await fetch('/data/erg-stacks.json')).json();
    const doc=await open('erg.html',d=>d.querySelectorAll('[data-stage]').length===12);
    let plan={weaponId:'staff',startTier:'A',startStage:1,endTier:'S',endStage:9,confidence:.99,potions:{},attempts:{},prices:{},includeConversions:false};
    function verify() {
      assert(doc.getElementById('erg-error').hidden,'聚能無錯誤');
      const result=simulateErg(data,plan);
      for (const row of result.rows) {
        const node=doc.querySelector(`[data-stage="${row.id}"]`);
        same(Number(node.querySelector('[data-attempts]').value),row.attempts,`${row.id} 次數`);
        same(node.querySelector('[data-potion]').checked,row.boosted,`${row.id} 藥水`);
        same(node.cells[3].textContent,`${formatNumber(row.probability*100)}%`,`${row.id} 套用機率`);
        const ordered=[...row.materials.filter(m=>m.consumption==='attempt'),...row.materials.filter(m=>m.consumption!=='attempt')];
        node.querySelectorAll('[data-material-cost]').forEach((cost,i)=>same(Number(cost.dataset.quantity),ordered[i].total,`${row.id} 材料量`));
      }
      for (const group of materialsBySlot(result)) {
        const nodes=[...doc.querySelector(`[data-material-slot="${group.slot}"]`).querySelectorAll('[data-total-name]')];
        for (const node of nodes) {
          const material=group.materials.find(m=>m.name===node.dataset.totalName);
          same(node.querySelector('[data-total-quantity]').textContent,formatNumber(material.quantity),'合計用量');
          const stacks=materialStacks(material,catalog).occupiedStacks;
          same(node.querySelector('.erg-stack-count > strong').textContent,stacks===null?'待確認':`${formatNumber(stacks)} 組`,'合計組數');
        }
      }
      for (const cell of doc.querySelectorAll('[data-material-cost]')) {
        const cost=materialCosts([{name:cell.dataset.materialCost,quantity:Number(cell.dataset.quantity)}],plan.prices).rows[0].cost;
        same(cell.textContent,cost===null?'—':formatGold(cost),'逐項金額');
      }
      const shopping=[...result.materials,...(result.potionCount?[{name:'聚能開放輔助藥水',quantity:result.potionCount}]:[])];
      same(doc.querySelector('#total-cost > strong').textContent,`${formatGold(materialCosts(shopping,plan.prices).total)} 金幣`,'總金額');
      same(doc.getElementById('erg-extra-section').hidden,!result.conversions.length&&!result.potionCount,'其他材料顯示');
      return result;
    }
    verify();
    const beforeNodes=[...doc.querySelectorAll('#erg-stages input, #erg-totals input')], feed=doc.getElementById('feed-reference').firstElementChild;
    const price=doc.querySelector('[data-price]');plan.prices[price.dataset.price]=12345;change(price,12345,'input');
    const potion=doc.querySelector('[data-potion="S-9"]');potion.focus();potion.click();plan.potions['S-9']=true;
    same(doc.activeElement,potion,'藥水焦點不變');verify();
    beforeNodes.forEach((node,i)=>same(doc.querySelectorAll('#erg-stages input, #erg-totals input')[i],node,'階段與價格節點不重建'));
    same(doc.getElementById('feed-reference').firstElementChild,feed,'飼料表不重建');
    const count=doc.querySelector('[data-attempts="S-9"]');count.focus();change(count,17);plan.attempts['S-9']=17;
    same(doc.activeElement,count,'手填次數焦點不變');verify();
    change(doc.getElementById('erg-confidence-number'),50,'input');plan.confidence=.5;plan.attempts={};verify();
    change(doc.getElementById('include-conversions'),true);plan.includeConversions=true;verify();
    const catalyst=doc.querySelector('#erg-conversions [data-price]');plan.prices[catalyst.dataset.price]=50000;change(catalyst,50000,'input');
    doc.querySelector('[data-potion="S-9"]').click();plan.potions['S-9']=false;verify();
    doc.getElementById('all-potions').click();plan.potions=Object.fromEntries(simulateErg(data,plan).rows.map(row=>[row.id,true]));
    verify();
    doc.getElementById('all-potions').click();plan.potions={};verify();
    change(doc.getElementById('total-search'),price.dataset.price,'input');
    doc.querySelector('[data-potion="A-1"]').click();plan.potions['A-1']=true;verify();
    change(doc.getElementById('total-search'),'不存在的材料','input');
    doc.querySelector('[data-potion="A-1"]').click();plan.potions['A-1']=false;verify();
    change(doc.getElementById('total-search'),'','input');verify();
    for (const weapon of data.weapons) {
      doc.querySelector(`[data-weapon="${weapon.id}"]`).click();plan.weaponId=weapon.id;plan.attempts={};verify();
      for (const enabled of [true,false]) {
        change(doc.querySelector('[data-potion="S-9"]'),enabled);plan.potions['S-9']=enabled;verify();
      }
    }
    const sample=doc.querySelector('[data-potion="S-9"]'), untouched=doc.querySelector('[data-stage="A-2"]');
    const observer=new MutationObserver(()=>{});
    observer.observe(untouched,{attributes:true,childList:true,subtree:true,characterData:true});
    change(sample,true);plan.potions['S-9']=true;
    same(observer.takeRecords().length,0,'未改動階段沒有 DOM 寫入');observer.disconnect();verify();
    const durations=[];
    for(let i=0;i<20;i++) {
      await nextFrame();
      const start=performance.now();sample.click();durations.push(performance.now()-start);
    }
    durations.sort((a,b)=>a-b);
    timing=`聚能 20 次切換同步事件耗時：中位數 ${durations[10].toFixed(2)} ms；最大 ${durations.at(-1).toFixed(2)} ms（不含後續繪製）`;
    verify();
    change(doc.getElementById('end-tier'),'A');plan.endTier='A';verify();
    change(doc.getElementById('start-stage'),9);plan.startStage=9;verify();
    change(doc.getElementById('end-stage'),1);plan.endStage=1;
    assert(!doc.getElementById('erg-error').hidden,'錯誤區間顯示錯誤');
    change(doc.getElementById('end-stage'),9);plan.endStage=9;verify();
    doc.getElementById('reset-erg').click();
    plan={...plan,startTier:'A',startStage:1,endTier:'S',endStage:9,confidence:.99,potions:{},attempts:{},prices:{},includeConversions:false};verify();
    assert([...doc.querySelectorAll('[data-price]')].every(input=>input.value===''),'重設清空所有單價');
    change(doc.querySelector('[data-price]'),-1,'input');assert(!doc.getElementById('price-error').hidden,'非法價格被拒絕');
    change(doc.querySelector('[data-price]'),'','input');verify();
    report.textContent=`PASS: ${assertions} checks\n${timing}`;
  } catch(error) {
    report.textContent=`FAIL (${assertions} checks): ${error.message}`;
    console.error(error);
    return;
  } finally {
    for(const [key,value] of stored) {if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}
    button.disabled=false;
  }
  report.textContent=`PASS: ${assertions} checks\n${timing}`;
});
