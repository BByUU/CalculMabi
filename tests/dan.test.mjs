import test from 'node:test';
import assert from 'node:assert/strict';
import {stackBreakdown,materialQuantity,calculateBundle} from '../dist/dan-calculator.js';

test('現版組數保留完整組、零散數與實際堆疊數',()=>{
  assert.deepEqual(stackBreakdown(250,100),{quantity:250,stackSize:100,fullStacks:2,remainder:50,occupiedStacks:3});
  assert.equal(stackBreakdown(200,100).occupiedStacks,2);
  assert.equal(stackBreakdown(0,100).occupiedStacks,0);
});
test('先合併未取整個數，再無條件進位',()=>{
  assert.equal(materialQuantity(7.5),8);
  assert.equal(materialQuantity(7.5,2),15);
  assert.equal(materialQuantity(30),30);
});
test('缺個數或缺現版stack不顯示為零材料',()=>{
  const result=calculateBundle({materials:[{name:'A',quantity:null},{name:'B',quantity:21}]},{A:{currentStack:100}});
  assert.equal(result.unknownQuantities,1);assert.equal(result.unknownStacks,2);
  assert.equal(result.rows[0].quantity,null);assert.equal(result.rows[1].occupiedStacks,null);
});
test('覆寫堆疊容量不影響材料用量',()=>{
  const bundle={materials:[{name:'鐵塊',quantity:30}]};
  const result=calculateBundle(bundle,{'鐵塊':{currentStack:100}},2,{'鐵塊':20});
  assert.equal(result.rows[0].quantity,60);assert.equal(result.rows[0].occupiedStacks,3);
});
test('拒絕零容量、小數份數、空值與溢位',()=>{
  for(const invalid of [0,-1,1.5,'',Infinity])assert.throws(()=>stackBreakdown(10,invalid));
  assert.throws(()=>materialQuantity(10,1.5));assert.throws(()=>materialQuantity(Number.MAX_SAFE_INTEGER,2));
});

test('手動清空保持未定量，填0表示確實不需要',()=>{
  const bundle={materials:[{id:'a',name:'A',quantity:10}]};
  assert.equal(calculateBundle(bundle,{A:{currentStack:100}},1,{}, {a:''}).rows[0].quantity,null);
  assert.equal(calculateBundle(bundle,{A:{currentStack:100}},1,{}, {a:0}).rows[0].quantity,0);
});
