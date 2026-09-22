import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNpcCatalog, npcChoices, calculateNpcShopping} from '../dist/dan-planner.js';
const data=JSON.parse(readFileSync(new URL('../dist/data/dan.json',import.meta.url),'utf8'));
const catalog=createNpcCatalog(data);
const shopping=(skill,choices)=>calculateNpcShopping(catalog,skill,choices);

test('打鐵 1 號只列巨人裝備，4 號列迪歐斯和人類巴倫西亞',()=>{
  const choices=npcChoices(catalog,'blacksmith');
  assert.deepEqual(choices.filter(c=>c.npc===1).map(c=>c.id),['giant-armor','giant-gloves','giant-boots']);
  assert.equal(choices.filter(c=>c.npc===4).length,6);
  assert.equal(choices.filter(c=>c.npc===2).length,6);
  assert.throws(()=>shopping('blacksmith',['1:dustin-armor']));
  assert.equal(npcChoices(catalog,'magic-craft').length,0);
  assert.equal(npcChoices(catalog,'hillwen-engineering').length,0);
  assert.equal(npcChoices(catalog,'tailoring').filter(c=>c.npc===2).length,4);
});
test('兩位 NPC 要同一武器時計算兩件，先合併再進位，設計圖去重',()=>{
  const result=shopping('blacksmith',['2:claymore','3:claymore']);
  assert.equal(result.count,2);
  assert.deepEqual(result.materials,[
    {name:'鐵塊',quantity:45},{name:'銀塊',quantity:45},{name:'銅塊',quantity:45},
    {name:'優質皮革',quantity:2},{name:'粗繩',quantity:4},
  ]);
  assert.equal(result.patterns.length,1);
  assert.equal(shopping('blacksmith',['2:claymore','2:claymore']).count,1);
});
test('套裝包含結尾，重複材料合併；不把結尾材料乘製作次數',()=>{
  const r=shopping('blacksmith',['1:giant-armor','1:giant-gloves','1:giant-boots','4:dustin-armor']);
  const m=Object.fromEntries(r.materials.map(x=>[x.name,x.quantity]));
  assert.equal(m['鐵塊'],243);
  assert.equal(m['高級皮繩'],111);
  assert.equal(m['高級布料'],5);
  assert.equal(m['魔女 翅膀面具'],1);
  assert.equal(m['普通布料'],2);
});
test('製衣兩位治癒師手套合併，女性正裝的結尾只算一次',()=>{
  const r=shopping('tailoring',['1:healer-gloves','4:healer-gloves','4:healer-dress']);
  const m=Object.fromEntries(r.materials.map(x=>[x.name,x.quantity]));
  assert.equal(m['普通布料'],6);
  assert.equal(m['高級結尾用絲線'],2);
  assert.equal(m['普通結尾用絲線'],1);
  assert.equal(r.patterns.length,2);
});
test('全部可勾考題有完整數量，不含已移除皇家武器與服裝',()=>{
  for(const skill of ['blacksmith','tailoring']) {
    const choices=npcChoices(catalog,skill).map(c=>`${c.npc}:${c.id}`);
    const r=shopping(skill,choices);
    assert.ok(r.materials.every(m=>Number.isSafeInteger(m.quantity)&&m.quantity>0));
    assert.ok(r.patterns.every(p=>!/(皇家|迷迭香|劍士學校|愛拉迷你裙|高級皮革盔甲)/.test(p)));
    assert.deepEqual(shopping(skill,[]),{count:0,materials:[],patterns:[]});
  }
});
