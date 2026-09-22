import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ROUND_EXAMS, selectRoundTarget, calculateRoundPlan} from '../dist/dan-rounds.js';
const amounts = plan => Object.fromEntries(plan.materials.map(m => [m.name,m.quantity]));

test('每階段互斥，保留其他階段目標；拒絕跨技能、跨階段或非考題',()=>{
  let selections = selectRoundTarget('magic-craft',{},1,'希里原');
  selections = selectRoundTarget('magic-craft',selections,2,'救贖聖弓');
  selections = selectRoundTarget('magic-craft',selections,1,'黏黏膠水');
  assert.deepEqual(selections,{1:'黏黏膠水',2:'救贖聖弓'});
  for(const [skill,stage,id] of [['magic-craft',1,'救贖聖弓'],['magic-craft',2,'隱居者的魔杖'],['hillwen-engineering',2,'雷德歐II'],['magic-craft',1,'稀原']]) {
    assert.throws(()=>calculateRoundPlan(skill,stage,id));
    assert.throws(()=>selectRoundTarget(skill,{},stage,id));
  }
});

test('固定考题與官方第一階段新數量吻合；六角螺絲、螺帽各自列出',()=>{
  const expected={'magic-craft':[[8,8,8,15,150],[3,3,3,6,6,6],[2,2]],'hillwen-engineering':[[4,8,8,60,60],[6,6,6],[2,2]]};
  for(const [skill,groups] of Object.entries(ROUND_EXAMS)) {
    const quantities=expected[skill];
    for(const group of groups) {
      assert.equal(group.targets.length,quantities[group.stage-1].length);
      assert.deepEqual(group.targets.map(t=>t.quantity).sort((a,b)=>a-b),quantities[group.stage-1]);
      for(const target of group.targets) {
        const result=calculateRoundPlan(skill,group.stage,target.id);
        assert.equal(result.steps.at(-1).name,target.name);
        assert.equal(result.steps.at(-1).quantity,target.quantity);
        assert.ok(result.materials.every(m=>Number.isSafeInteger(m.quantity)&&m.quantity>0&&m.uses.length));
      }
    }
  }
  assert.equal(calculateRoundPlan('hillwen-engineering',1,'六角螺絲').materials[0].quantity,60);
  assert.equal(calculateRoundPlan('hillwen-engineering',1,'六角螺帽').materials[0].quantity,60);
});

test('150 顆實習子彈按每次 10 顆計算；15 希里原消耗 75 結晶',()=>{
  const bullets=calculateRoundPlan('magic-craft',1,'實習用魔力子彈');
  assert.deepEqual(amounts(bullets),{希里原結晶:30});
  assert.equal(bullets.steps[0].attempts,15);
  assert.deepEqual(amounts(calculateRoundPlan('magic-craft',1,'希里原')),{希里原結晶:75});
});

test('野蠻魔杖自動拆前置，購買清單不重複計入自行製作的中間材料',()=>{
  const p=calculateRoundPlan('magic-craft',2,'野蠻的閃電魔杖');
  assert.deepEqual(amounts(p),{希里原結晶:45,稀原:9,中級木柴:9,神秘的香草粉:15,完整的希里原:30,基因突變體:3,雷之自然力:3});
  assert.deepEqual(p.steps.map(s=>[s.name,s.quantity]),[['希里原',9],['聚集魔力的木柴',9],['野蠻的閃電魔杖',3]]);
  assert.equal(p.materials.find(m=>m.name==='希里原結晶').uses[0].name,'希里原');
  assert.equal(p.materials.find(m=>m.name==='稀原').uses[0].name,'聚集魔力的木柴');
  assert.deepEqual(amounts(calculateRoundPlan('magic-craft',1,'淨化的兔子腳')),{希里原結晶:40,基因突變兔的腳:8});
});

test('工學能量轉換器只製作稀原，希里原與合金直接購買；使者武器不加舊表1.5倍',()=>{
  const p=calculateRoundPlan('hillwen-engineering',1,'能量轉換器');
  assert.deepEqual(amounts(p),{稀原礦石碎片:20,希里原:4});
  assert.deepEqual(p.steps.map(s=>[s.name,s.quantity]),[['稀原',4],['能量轉換器',4]]);
  assert.deepEqual(amounts(calculateRoundPlan('hillwen-engineering',2,'朝聖者之劍')),{稀原合金:60,使者之環:6,使者的皮革:18,使者的銳利碎片:24,使者的堅韌碎片:42,使者的閃光碎片:30});
  assert.equal(amounts(calculateRoundPlan('magic-craft',3,'拉克里斯追逐者')).熊皮拳套,2);
});

test('狂徒巨劍採考場販售批量向上取整，保留實際用量與用途',()=>{
  const p=calculateRoundPlan('hillwen-engineering',2,'狂徒巨劍');
  assert.deepEqual(p.materials.map(m=>[m.name,m.quantity,m.bundleSize,m.bundles]),[
    ['稀原合金',60,20,3],['使者之環',6,5,2],['使者的皮革',12,5,3],
    ['使者的銳利碎片',18,5,4],['使者的堅韌碎片',48,5,10],['使者的閃光碎片',60,5,12],
  ]);
  assert.ok(p.materials.every(m=>m.uses[0].name==='狂徒巨劍'));
});

test('工學魔造全部目標都有考場組數，前置合併後換算；裝備按商店批量計組',()=>{
  for(const [skill,groups] of Object.entries(ROUND_EXAMS)) for(const group of groups) for(const target of group.targets) {
    const p=calculateRoundPlan(skill,group.stage,target.id);
    for(const m of p.materials) {
      assert.ok(Number.isSafeInteger(m.bundleSize)&&m.bundleSize>0);
      assert.ok(Number.isSafeInteger(m.bundles)&&m.bundles>0);
      assert.ok(m.bundles*m.bundleSize>=m.quantity);
      assert.ok((m.bundles-1)*m.bundleSize<m.quantity);
    }
  }
  const wand=calculateRoundPlan('magic-craft',2,'野蠻的閃電魔杖');
  assert.equal(wand.materials.find(m=>m.name==='希里原結晶').bundles,1);
  assert.equal(wand.materials.find(m=>m.name==='完整的希里原').bundles,2);
  assert.equal(calculateRoundPlan('magic-craft',3,'拉克里斯追逐者').materials.find(m=>m.name==='熊皮拳套').bundles,1);
  assert.equal(calculateRoundPlan('hillwen-engineering',3,'巴貝斯巴勒殺手').materials.find(m=>m.name==='雙手劍').bundles,2);
});
