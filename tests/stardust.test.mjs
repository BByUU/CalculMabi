import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BASE_REWARD,maxStardustPlan,defaultStardustPlan,calculateStardust,toggleStardustBonus,stardustMultiplier} from '../dist/stardust-calculator.js';
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} ≠ ${expected}`);
function oneEffect(current=1,target=10) {
  const plan=defaultStardustPlan();plan.currentRank=plan.targetRank=15;
  plan.effects.forEach((e,i)=>Object.assign(e,{enabled:i===0,current,target}));return plan;
}
test('星塵預設各 2 個、99%；主體用量重現 600 與五階材料總和',()=>{
  const plan=defaultStardustPlan();assert.equal(BASE_REWARD,2);assert.equal(plan.confidence,.99);
  plan.effects.forEach(e=>e.enabled=false);
  const r=calculateStardust(plan);
  assert.equal(r.mainCommon,600);
  assert.deepEqual(r.rows.map(r=>r.main),[45,75,105,135,110]);
  assert.deepEqual(r.rows.map(r=>r.tasks),[23,38,53,68,55]);
  assert.equal(r.extraTasks,63); // Graded quests already grant 474 common materials.
  assert.equal(r.commonFromGradedTasks,474);
  assert.equal(r.commonDeficit,126);
  assert.equal(r.lifeTasks,300);assert.equal(r.totalTasks,600);
});
test('通用缺額以額外 E 級任務補足，兩種模式皆套用加倍並納入總數',()=>{
  for(const mode of ['confidence','expectation']) {
    const plan=defaultStardustPlan();plan.mode=mode;
    plan.effects.forEach(e=>e.enabled=false);plan.bonuses.crystal=true;
    const r=calculateStardust(plan);
    assert.equal(r.reward,4);
    assert.equal(r.commonFromGradedTasks,480);
    assert.equal(r.commonDeficit,120);
    assert.equal(r.extraTasks,30);
    assert.equal(r.lifeTasks,150);assert.equal(r.combatTasks,150);assert.equal(r.totalTasks,300);
    assert.equal(r.commonFromGradedTasks+r.extraTasks*r.reward,r.commonTotal);
  }
});
test('支援效果 99% 與 90% 備量吻合提供表格，百分比套用每一階',()=>{
  const p=oneEffect();
  assert.deepEqual(calculateStardust(p).rows.map(r=>r.support),[3,7,26,46,42]);
  p.confidence=.9;
  assert.deepEqual(calculateStardust(p).rows.map(r=>r.support),[2,4,14,24,22]);
  p.confidence=99.9/100;
  assert.deepEqual(calculateStardust(p).rows.map(r=>r.support),[4,11,36,68,62]);
});
test('期望模式用 1/p；任務期望包含整批獎勵的進位而非對平均數取整',()=>{
  const p=oneEffect(2,3);p.mode='expectation';
  const r=calculateStardust(p);
  near(r.rows[0].support,1/.9);
  near(r.lifeTasks,1/(1-.1**2)); // E[ceil(Geometric(.9)/2)].
  assert.notEqual(r.lifeTasks,Math.ceil((1/.9)/2));
  assert.equal(r.extraTasks,0);
  assert.equal(r.commonDeficit,0);
  p.baseReward=1;near(calculateStardust(p).lifeTasks,r.lifeTasks);
});
test('期望材料能合併十五效果，固定成功率階段仍只有一次',()=>{
  const p=defaultStardustPlan();p.mode='expectation';
  const r=calculateStardust(p);
  const perEffect=[1+1/.9,1/.8+1/.7,2/.6+2/.5,2/.4+2/.3,2/.2];
  r.rows.forEach((row,i)=>near(row.support,perEffect[i]*15));
  near(r.supportCommon,perEffect.reduce((a,b)=>a+b)*15);
  const single=oneEffect(1,2);single.mode='expectation';single.bonuses={crystal:true,totem:true,event:true};
  assert.equal(calculateStardust(single).lifeTasks,1);
});
test('加倍相乘最高 8 倍；選圖騰或藥水取消另一者',()=>{
  let b=toggleStardustBonus({crystal:true,event:true,totem:true},'potion',true);
  assert.equal(b.totem,false);assert.equal(stardustMultiplier(b),8);
  b=toggleStardustBonus(b,'totem',true);assert.equal(b.potion,false);
  assert.throws(()=>stardustMultiplier({totem:true,potion:true}));
  const p=defaultStardustPlan();p.bonuses=b;
  const r=calculateStardust(p);assert.equal(r.reward,16);assert.equal(r.lifeTasks,154);assert.equal(r.totalTasks,308);
});
test('升級範圍排除已完成等級，尚未解鎖效果不計；全完成為零',()=>{
  const p=defaultStardustPlan();p.currentRank=p.targetRank=1;
  assert.equal(calculateStardust(p).activeEffects,1);
  p.effects.forEach(e=>e.enabled=false);assert.equal(calculateStardust(p).totalTasks,0);
  p.targetRank=2;const r=calculateStardust(p);assert.equal(r.mainCommon,10);assert.equal(r.totalTasks,10);
  p.currentRank=p.targetRank=15;p.effects.forEach(e=>Object.assign(e,{enabled:true,current:10,target:10}));
  assert.equal(calculateStardust(p).totalTasks,0);
});
test('無效範圍、機率、重複效果與非法獎勵不能產生假總數',()=>{
  for(const change of [{targetRank:0},{currentRank:15,targetRank:1},{confidence:1},{confidence:''},{mode:'pr'}]){
    assert.throws(()=>calculateStardust({...defaultStardustPlan(),...change}));
  }
  const p=oneEffect(9,8);assert.throws(()=>calculateStardust(p));
  const d=defaultStardustPlan();d.effects.push(d.effects[0]);assert.throws(()=>calculateStardust(d));
});
test('各頁都有星塵入口，星塵程式固定 DOM 引用都存在',()=>{
  for(const page of ['index','dan','erg','stardust']) {
    const html=readFileSync(new URL(`../dist/${page}.html`,import.meta.url),'utf8');
    assert.ok(html.includes('href="./stardust.html"'),page);
  }
  const html=readFileSync(new URL('../dist/stardust.html',import.meta.url),'utf8');
  const app=readFileSync(new URL('../dist/stardust-app.js',import.meta.url),'utf8');
  for(const match of app.matchAll(/\$\('([^']+)'\)/g))assert.ok(html.includes(`id="${match[1]}"`),match[1]);
  assert.ok(!/金幣|單價|總價格/.test(html));
});

test('基礎獎勵固定各 2 個，舊版各 1 個設定不再影響計算',()=>{
  const plan=defaultStardustPlan();
  const expected=calculateStardust(plan);
  for(const baseReward of [1,2,10]) assert.deepEqual(calculateStardust({...plan,baseReward}),expected);
  const html=readFileSync(new URL('../dist/stardust.html',import.meta.url),'utf8');
  assert.ok(!html.includes('id="sd-base-reward"'));
  assert.ok(html.includes('通用、該級材料各 2 個'));
});

test('舊星塵目標固定升滿，保留目前等級與加倍設定',()=>{
  const saved=defaultStardustPlan();saved.currentRank=6;saved.targetRank=8;
  saved.effects[0].current=4;saved.effects[0].target=5;saved.effects[1].enabled=false;
  saved.bonuses.crystal=true;
  const plan=maxStardustPlan(saved);
  assert.equal(plan.targetRank,15);assert.ok(plan.effects.every(e=>e.target===10));
  assert.equal(plan.currentRank,6);assert.equal(plan.effects[0].current,4);
  assert.equal(plan.effects[1].enabled,false);assert.equal(plan.bonuses.crystal,true);
  assert.equal(saved.targetRank,8);assert.equal(saved.effects[0].target,5);
  assert.doesNotThrow(()=>calculateStardust(plan));
});
