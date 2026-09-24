import {simulateErg, materialsBySlot, materialCosts, formatGold, materialStacks} from '/erg-calculator.js';
import {formatNumber} from '/format.js';
import {TRAITS, defaultTraitPlan, calculateTraits} from '/traits-calculator.js';
const frame=document.getElementById('app'), report=document.getElementById('results');
let assertions=0, timing='';
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
  const keys=['mabi-erg-v1','mabi-stardust-plan-v1','mabi-traits-v1'];
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
    change(sd.getElementById('sd-target-rank'),'5');
    assert(sd.querySelector('[data-effect="effect-6"]').disabled,'未解鎖效果停用');
    change(sd.getElementById('sd-target-rank'),'15');
    cells.forEach((cell,i)=>same(sd.querySelectorAll('[data-effect]')[i],cell,'效果節點保留'));
    sd.getElementById('sd-main-only').click();sd.getElementById('sd-select-all').click();
    same(sd.getElementById('sd-task-total').textContent,originalTotal,'全部取消與全選回到原計算');
    report.textContent='星塵焦點與狀態測試通過。特性測試中…';

    const tr=await open('traits.html',d=>d.querySelectorAll('[data-trait]').length===TRAITS.length);
    let traitPlan=defaultTraitPlan();
    const amount=n=>n?formatNumber(n):'—';
    function verifyTraits() {
      const result=calculateTraits(traitPlan);
      for (const row of result.rows) {
        const node=tr.querySelector(`[data-trait="${row.id}"]`);
        same(node.querySelector('[data-level="current"]').value,String(row.current),`${row.id} 目前等級`);
        same(node.querySelector('[data-level="target"]').value,String(row.target),`${row.id} 目標等級`);
        for (const key of ['points','ap','basic','advanced']) same(node.querySelector(`[data-cell="${key}"]`).textContent,amount(row[key]),`${row.id} ${key}`);
      }
      for (const category of result.categories) {
        const node=tr.querySelector(`[data-category="${category.id}"]`);
        same(node.querySelector('[data-cell="missing"]').textContent,formatNumber(category.missing),`${category.id} 缺少`);
        same(node.querySelector('[data-cell="weeks"]').textContent,category.missing?`${formatNumber(category.weeks)} 週`:'已足夠',`${category.id} 週數`);
      }
      same(tr.getElementById('tr-missing-total').textContent,`${formatNumber(result.totals.missing)} 點`,'特性缺少合計');
      same(tr.getElementById('tr-weeks-total').textContent,result.totals.weeks?`${formatNumber(result.totals.weeks)} 週`:'已足夠','特性週數');
    }
    verifyTraits();
    same(tr.getElementById('tr-weeks-total').textContent,'33 週','全部升滿需 33 週');
    const traitControls=[...tr.querySelectorAll('[data-level], [data-held]')];
    const hasteCurrent=tr.querySelector('[data-trait="haste"] [data-level="current"]');
    change(tr.querySelector('[data-trait="haste"] [data-level="target"]'),'5');traitPlan.levels.haste.target=5;
    hasteCurrent.focus();change(hasteCurrent,'8');traitPlan.levels.haste={current:8,target:8};
    same(tr.activeElement,hasteCurrent,'特性等級焦點不變');
    assert(tr.querySelector('[data-trait="haste"] [data-level="target"] option[value="7"]').disabled,'低於目前等級的目標停用');
    verifyTraits();
    const untouchedTrait=tr.querySelector('[data-trait="block"]'), traitObserver=new MutationObserver(()=>{});
    traitObserver.observe(untouchedTrait,{attributes:true,childList:true,subtree:true,characterData:true});
    change(tr.querySelector('[data-trait="haste"] [data-level="target"]'),'10');traitPlan.levels.haste.target=10;
    same(traitObserver.takeRecords().length,0,'未改動特性沒有 DOM 寫入');traitObserver.disconnect();verifyTraits();
    const held=tr.querySelector('[data-held="training"]');
    held.focus();change(held,'1200','input');traitPlan.held.training=1200;
    same(tr.activeElement,held,'持有點數焦點不變');verifyTraits();
    change(held,'6000','input');
    assert(!tr.getElementById('tr-error').hidden,'超過持有上限顯示錯誤');verifyTraits();
    change(held,'','input');traitPlan.held.training=0;
    assert(tr.getElementById('tr-error').hidden,'修正後隱藏錯誤');verifyTraits();
    change(tr.getElementById('tr-bulk-current'),'5');change(tr.getElementById('tr-bulk-target'),'9');
    tr.getElementById('tr-bulk-apply').click();
    for (const trait of TRAITS) traitPlan.levels[trait.id]={current:5,target:9};
    verifyTraits();
    assert(traitControls.every(node=>tr.contains(node)),'特性控制項不重建');
    tr.getElementById('tr-reset').click();traitPlan=defaultTraitPlan();verifyTraits();
    report.textContent='星塵與特性測試通過。聚能測試中…';

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
      await new Promise(resolve=>requestAnimationFrame(resolve));
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
