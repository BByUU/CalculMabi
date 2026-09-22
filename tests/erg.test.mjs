import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {attemptsForProbability, selectStages, simulateErg, searchMaterials, conversionMaterials, materialCosts, materialStacks, materialsBySlot, priceToGold, formatGold} from '../dist/erg-calculator.js';
import {ERG_AUDIT, stageMaterials} from '../dist/erg-audit.js';
import {fullMaterialName, auctionSearchName} from '../dist/erg-material-names.js';

const data = JSON.parse(readFileSync(new URL('../dist/data/erg.json', import.meta.url), 'utf8'));
const staff = data.weapons.find(w => w.id === 'staff');
const stacks = JSON.parse(readFileSync(new URL('../dist/data/erg-stacks.json', import.meta.url), 'utf8'));

test('第九階包含最後 46～50 飼料，跨級別各加一次，較早結束不加', () => {
  for (const [tier, extra] of [['B',[0,5,5,4]], ['A',[0,0,38,11]], ['S',[0,3,68,19]]]) {
    const result = simulateErg(data, {weaponId:'staff', startTier:tier, startStage:9, endTier:tier, endStage:9});
    assert.equal(result.feedRows.length, 2);
    assert.equal(result.feedRows[1].range, '46～50等');
    assert.deepEqual(result.feedRows[1].quantities, extra);
    assert.deepEqual(result.feedReference, result.rows[0].feedReference.map((n,i) => n + extra[i]));
  }
  const cross = simulateErg(data, {weaponId:'staff', startTier:'B', startStage:9, endTier:'S', endStage:9});
  assert.deepEqual(cross.feedRows.filter(r => r.range === '46～50等').map(r => r.tier), ['B','A','S']);
  const early = simulateErg(data, {weaponId:'staff', startTier:'S', startStage:1, endTier:'S', endStage:8});
  assert.equal(early.feedRows.length, 8);
  const complete = simulateErg(data, {weaponId:'staff', startTier:'S', startStage:1, endTier:'S', endStage:9});
  assert.equal(complete.feedExperience, 9209992);
  assert.deepEqual(complete.feedReference, [17,103,149,88]);
});

test('單價直接以整數金幣計算，保留既有價格與大額合計精度', () => {
  assert.equal(priceToGold('500'), 500);
  assert.equal(priceToGold('10000'), 10000);
  assert.equal(priceToGold(''), '');
  assert.equal(priceToGold('0'), 0);
  assert.equal(priceToGold('1000000000000'), 1000000000000);
  for (const bad of ['0.1', '-1', '1000000000001', 'invalid']) assert.throws(() => priceToGold(bad));
  const savedPrices = {'鐵塊':5000000};
  const total = materialCosts([{name:'鐵塊', quantity:101}], savedPrices).total;
  assert.equal(total, 505000000n);
  assert.equal(savedPrices['鐵塊'], 5000000);
  assert.equal(formatGold(total), '5億500萬');
  assert.equal(formatGold(100000001n), '1億1');
  assert.equal(formatGold(1000000000000000001n), '10,000,000,000億1');
});

test('金額滿萬改用遊戲單位，保留零頭且不四捨五入跨過門檻', () => {
  for (const [amount, expected] of [
    [0, '0'], [9999, '9,999'], [10000, '1萬'], [50000, '5萬'],
    [15001, '1萬5001'], [500000, '50萬'], [999999, '99萬9999'],
    [1000000, '100萬'], [5000000, '500萬'], [9999999, '999萬9999'],
    [10000000, '1000萬'], [50000000, '5000萬'], [99999999, '9999萬9999'],
    [100000000, '1億'], [500000000, '5億'],
    [215137459, '2億1513萬7459'], [200000001, '2億1'],
    [200010000, '2億1萬'], [-215137459, '-2億1513萬7459'],
  ]) assert.equal(formatGold(amount), expected);
});

test('材料組數無條件進位，零用量為零組，費用仍按實際用量', () => {
  for (const [quantity, expected] of [[0, 0], [1, 1], [99, 1], [100, 1], [101, 2]]) {
    assert.equal(materialStacks({name:'鐵塊', quantity}, stacks).occupiedStacks, expected);
  }
  assert.equal(materialStacks({name:'紙鶴', quantity:1001}, stacks).occupiedStacks, 2);
  assert.equal(materialStacks({name:'任意弓類武器', quantity:2}, stacks).occupiedStacks, 2);
  assert.equal(materialStacks({name:'尚無資料', quantity:1}, stacks).occupiedStacks, null);
  assert.equal(materialCosts([{name:'鐵塊', quantity:101}], {'鐵塊':10}).total, 1010n);
});

test('堆疊資料涵蓋所有聚能配方、品質條件、藥水與轉換材料', () => {
  const names = data.weapons.flatMap(weapon => weapon.stages.flatMap(stage => stageMaterials(weapon.id, stage, 'wiki').map(m => m.name)));
  names.push('聚能開放輔助藥水', '升階催化劑A', '升階催化劑B');
  for (const name of names) {
    const item = stacks.items[auctionSearchName(name)];
    assert.ok(item, name);
    assert.ok(Number.isSafeInteger(item.stackSize) && item.stackSize > 0, name);
    assert.match(item.sourceUrl, /^https:\/\/wiki\.mabinogiworld\.com\//);
    assert.equal(materialStacks({name, quantity:item.stackSize + 1}, stacks).occupiedStacks, 2, name);
  }
});

test('轉換材料預設不計入，同級不消耗；B 到 S 各計兩種催化劑一個', () => {
  assert.deepEqual(conversionMaterials('B', 'S'), []);
  assert.deepEqual(conversionMaterials('A', 'A', true), []);
  assert.deepEqual(conversionMaterials('B', 'A', true).map(m => [m.name, m.quantity]), [['升階催化劑B', 1]]);
  assert.deepEqual(conversionMaterials('A', 'S', true).map(m => [m.name, m.quantity]), [['升階催化劑A', 1]]);
  assert.deepEqual(conversionMaterials('B', 'S', true).map(m => [m.name, m.quantity]), [['升階催化劑B', 1], ['升階催化劑A', 1]]);
  assert.throws(() => conversionMaterials('S', 'B', true));
});

test('勾選轉換加入合計一次，不乘強化次數，取消或改成同級時移除', () => {
  const options = {weaponId:'staff', startTier:'B', startStage:9, endTier:'S', endStage:9};
  const base = simulateErg(data, options);
  const included = simulateErg(data, {...options, includeConversions:true});
  assert.equal(included.totalAttempts, base.totalAttempts);
  assert.deepEqual(included.materials.filter(m => !m.name.startsWith('升階催化劑')), base.materials);
  assert.equal(included.materials.find(m => m.name === '升階催化劑A').quantity, 1);
  assert.equal(included.materials.find(m => m.name === '升階催化劑B').quantity, 1);
  assert.equal(simulateErg(data, {...options, includeConversions:false}).conversions.length, 0);
  assert.equal(simulateErg(data, {...options, endTier:'B', includeConversions:true}).conversions.length, 0);
});

test('總金額按合計用量乘單價，未填與零元分開處理', () => {
  const materials = [{name:'鐵塊', quantity:30}, {name:'鐵板', quantity:10}, {name:'祝福藥水', quantity:2}, {name:'升階催化劑A', quantity:1}];
  const budget = materialCosts(materials, {'鐵塊':100, '鐵板':'250', '祝福藥水':0});
  assert.equal(budget.total, 5500n);
  assert.equal(budget.missing, 1);
  assert.equal(budget.rows[2].cost, 0n);
  assert.equal(budget.rows[3].cost, null);
  assert.equal(materialCosts(materials, {'鐵塊':100, '鐵板':'250', '祝福藥水':0, '升階催化劑A':2000000}).total, 2005500n);
  assert.equal(materialCosts(materials, {'鐵塊':''}).missing, 4);
});

test('修改次數、藥水、轉換會更新完整清單費用，不改成功一次材料的份數', () => {
  const options = {weaponId:'staff', startTier:'A', startStage:9, endTier:'S', endStage:7, includeConversions:true};
  const run = simulateErg(data, {...options, attempts:{'A-9':2,'S-7':3}, potions:{'S-7':true}});
  const materials = [...run.materials, {name:'聚能開放輔助藥水', quantity:run.potionCount}];
  const prices = Object.fromEntries(materials.map(m => [m.name, 1]));
  assert.equal(materialCosts(materials, prices).total, BigInt(materials.reduce((sum, m) => sum + m.quantity, 0)));
  assert.equal(materialCosts(run.conversions, prices).total, 1n);
  const next = simulateErg(data, {...options, attempts:{'A-9':2,'S-7':4}, potions:{'S-7':true}});
  const nextMaterials = [...next.materials, {name:'聚能開放輔助藥水', quantity:next.potionCount}];
  assert.equal(materialCosts(nextMaterials, prices).total - materialCosts(materials, prices).total, 19n);
});

test('金額拒絕負数、小數、非數字，極大總額保持整數精度', () => {
  for (const price of [-1, 1.5, 'invalid', null, true, Infinity, 1000000000001]) {
    assert.throws(() => materialCosts([{name:'鐵塊', quantity:1}], {'鐵塊':price}));
  }
  assert.equal(materialCosts([{name:'鐵塊', quantity:100000001}], {'鐵塊':1000000000000}).total, 100000001000000000000n);
});

test('27 組基礎／藥水機率皆取達到 99% 的最少次數', () => {
  for (const rules of Object.values(data.probabilities)) for (const rule of rules) {
    for (const boosted of [false, true]) {
      const n = attemptsForProbability(rule.probability, boosted, rule.boost);
      const p = Math.min(1, rule.probability + (boosted ? rule.boost : 0));
      assert.ok(1 - (1-p)**n >= 0.99 - 1e-14);
      assert.ok(n === 1 || 1 - (1-p)**(n-1) < 0.99);
    }
  }
});

test('100% 與藥水封頂只要一次，零機率與無效值不被吞成一次', () => {
  assert.equal(attemptsForProbability(0.9), 2);
  assert.equal(attemptsForProbability(1), 1);
  assert.equal(attemptsForProbability(0.95, true, 0.1), 1);
  assert.equal(attemptsForProbability(0.003), 1533);
  assert.equal(attemptsForProbability(0.003, true, 0.007), 459);
  for (const p of [0, -1, '', null, false, 1.01, NaN, Infinity]) assert.throws(() => attemptsForProbability(p));
  assert.throws(() => attemptsForProbability(0.1, true, -0.01));
});

test('起始 B/A/S 區間涵蓋指定路徑，升級後跳過前六階', () => {
  assert.equal(selectStages(staff, {startTier:'B'}).length, 15);
  assert.deepEqual(selectStages(staff).map(s => s.id), ['A-1','A-2','A-3','A-4','A-5','A-6','A-7','A-8','A-9','S-7','S-8','S-9']);
  assert.equal(selectStages(staff, {startTier:'S'}).length, 9);
  assert.deepEqual(selectStages(staff, {startTier:'B',startStage:8,endTier:'A',endStage:7}).map(s => s.id), ['B-8','B-9','A-7']);
  assert.equal(selectStages(staff, {startTier:'S',startStage:9,endStage:9}).length, 1);
  for (const options of [{startTier:'X'}, {startTier:'S',endTier:'A'}, {startStage:0}, {startStage:1.5}, {endStage:2}, {startTier:'S',startStage:9,endStage:8}]) assert.throws(() => selectStages(staff, options));
});

test('S7 各項獨立乘次數；成功消耗材料不重複乘上 459 次', () => {
  const result = simulateErg(data, {weaponId:'staff',startTier:'S',startStage:7,endTier:'S',endStage:7});
  assert.deepEqual(result.rows[0].materials.map(m => m.total), [2295,4590,1377,5,1,1]);
  assert.equal(result.totalAttempts,459);
  assert.equal(result.potionCount,0);
  const boosted = simulateErg(data, {weaponId:'staff',startTier:'S',startStage:7,endTier:'S',endStage:7,potions:{'S-7':true}});
  assert.equal(boosted.totalAttempts,113);
  assert.equal(boosted.potionCount,113);
  assert.deepEqual(boosted.rows[0].materials.map(m => m.total), [565,1130,339,5,1,1]);
});

test('同名材料跨階與跨欄合併，紙鶴解析數量且保留簽名與星數', () => {
  const result = simulateErg(data, {weaponId:'staff',startTier:'B'});
  const material = name => result.materials.find(m => m.name === name);
  assert.equal(material('紙鶴').quantity,1500);
  assert.equal(material('乾草堆').quantity,2);
  assert.ok(material('簽名 中級皮革盔甲'));
  assert.ok(material('4星 起司醬'));
  assert.ok(material('S4階段以上 凱爾特三矛魔杖'));
  const defaultResult = simulateErg(data, {weaponId:'staff'});
  assert.equal(defaultResult.totalAttempts,3676);
  assert.equal(defaultResult.materials.find(m => m.name === '鐵塊').quantity,1170);
  assert.equal(defaultResult.materials.find(m => m.name === '神聖礦物碎片').quantity,7944);
});

test('297 筆配方皆可獨立計算且六格材料完整', () => {
  assert.equal(data.weapons.length,11);
  assert.equal(new Set(data.weapons.map(w => w.id)).size,11);
  let count = 0;
  for (const weapon of data.weapons) {
    assert.equal(weapon.stages.length,27);
    for (const stage of weapon.stages) {
      count++;
      const result = simulateErg(data, {weaponId:weapon.id,startTier:stage.tier,endTier:stage.tier,startStage:stage.stage,endStage:stage.stage});
      assert.equal(result.rows.length,1);
      assert.equal(result.rows[0].materials.length,6);
      for (const m of result.rows[0].materials) {
        assert.ok(Number.isSafeInteger(m.total) && m.total > 0);
        assert.equal(m.total,m.quantity*(m.slot <= 3 ? result.totalAttempts : 1));
      }
      assert.ok(result.feedReference.every(n => Number.isSafeInteger(n) && n >= 0));
    }
  }
  assert.equal(count,297);
});

test('快速查找支援全武器、級別及多字詞，配方可反向帶入', () => {
  const cranes = searchMaterials(data,'紙鶴');
  assert.equal(cranes.length,22);
  assert.equal(searchMaterials(data,'紙鶴','staff','A')[0].quantity,1000);
  assert.equal(searchMaterials(data,'紙鶴','staff','B')[0].quantity,500);
  assert.equal(searchMaterials(data,'簽名 伯納姆','staff','S')[0].stageId,'S-7');
  assert.equal(searchMaterials(data,'不存在的材料').length,0);
  for (const match of cranes) {
    const result = simulateErg(data,{weaponId:match.weaponId,startTier:match.tier,endTier:match.tier,startStage:match.stage,endStage:match.stage});
    assert.ok(result.materials.some(m => m.name === match.name && m.quantity === match.quantity));
  }
});

test('單階藥水只影響所選階段，未選階段的藥水不加入總數', () => {
  const options = {weaponId:'staff',startTier:'S',startStage:8,endTier:'S',endStage:9};
  const result = simulateErg(data,{...options,potions:{'S-7':true,'S-9':true}});
  assert.deepEqual(result.rows.map(r => r.attempts),[656,459]);
  assert.equal(result.potionCount,459);
  assert.throws(() => simulateErg(data,{weaponId:'missing'}));
});

test('當前配方保持已核對的用量，搜尋與試算一致', () => {
  assert.equal(Object.values(ERG_AUDIT.pages).flat().length,20);
  const options = {weaponId:'staff',startTier:'B',endTier:'B',startStage:4,endStage:4};
  const result = simulateErg(data,options);
  assert.equal(result.materials.find(m => m.name === '廉價布料').quantity,100);
  assert.equal(searchMaterials(data,'廉價布料','staff','B')[0].quantity,10);
  assert.equal(searchMaterials(data,'失去光澤的金屬碎片','staff','B')[0].quantity,2);
  const control = simulateErg(data,{weaponId:'control-bar',startTier:'B',endTier:'B',startStage:7,endStage:7});
  assert.equal(control.rows[0].materials[0].name,'鐵塊');
  assert.equal(control.rows[0].materials[1].total,62);
});

test('運氣 PR 越高次數越少，使用幾何分布門檻而非常態分布', () => {
  const options = {weaponId:'staff',startTier:'S',startStage:9,endTier:'S',endStage:9};
  const counts = [3,50,97].map(pr => simulateErg(data,{...options,confidence:1-pr/100}).totalAttempts);
  assert.deepEqual(counts,[1168,231,11]);
  for (const pr of [0.1,3,50,97,99.9]) {
    const q = 1-pr/100;
    for (const rules of Object.values(data.probabilities)) for (const rule of rules) {
      const n = attemptsForProbability(rule.probability,false,0,q);
      assert.ok(1-(1-rule.probability)**n >= q-1e-12);
      assert.ok(n===1 || 1-(1-rule.probability)**(n-1) < q);
    }
  }
  assert.throws(() => simulateErg(data,{...options,confidence:0}));
  assert.throws(() => simulateErg(data,{...options,confidence:1}));
});

test('論壇累積成功率範例：0.3% 的 99% 備量為 1533 次，運氣 PR 99 為另一端', () => {
  assert.ok(Math.abs((1-0.9**3)-0.271)<1e-12);
  assert.ok(Math.abs((1-0.99**100)-0.6339676587267709)<1e-12);
  assert.ok(Math.abs((1-0.997**3333)-0.9999552325195374)<1e-12);
  const options={weaponId:'staff',startTier:'S',startStage:9,endTier:'S',endStage:9};
  const prepared=simulateErg(data,{...options,confidence:0.99});
  assert.equal(prepared.rows[0].probability,0.003);
  assert.equal(prepared.rows[0].attempts,1533);
  assert.ok(1-0.997**1533>=0.99);
  assert.ok(1-0.997**1532<0.99);
  assert.equal(simulateErg(data,{...options,confidence:0.01}).totalAttempts,4);
  assert.equal(simulateErg(data,{...options,confidence:0.99,potions:{'S-9':true}}).totalAttempts,459);
});

test('手填次數僅覆寫指定階段，藥水與每次消耗材料隨之加總', () => {
  const options = {weaponId:'staff',startTier:'S',startStage:7,endTier:'S',endStage:8,confidence:0.5,potions:{'S-7':true},attempts:{'S-7':10}};
  const result = simulateErg(data,options);
  assert.equal(result.rows[0].attempts,10);
  assert.equal(result.rows[0].manual,true);
  assert.equal(result.rows[1].attempts,99);
  assert.equal(result.rows[1].manual,false);
  assert.equal(result.potionCount,10);
  assert.deepEqual(result.rows[0].materials.map(m => m.total),[50,100,30,5,1,1]);
  for (const n of ['',0,-1,1.5,Infinity,100000001]) assert.throws(() => simulateErg(data,{...options,attempts:{'S-7':n}}));
});

test('完整名稱保留配方條件，類別不變成指定武器', () => {
  assert.equal(fullMaterialName('簽名 白龍甲（女性用）'),'簽名 拉克里斯追逐者鎧甲（女性用）');
  assert.equal(fullMaterialName('簽名 黑龍甲（男性用）'),'簽名 巴貝斯巴勒殺手鎧甲（男性用）');
  assert.equal(fullMaterialName('弓'),'任意弓類武器');
  assert.equal(fullMaterialName('S1階段以上 單手魔杖'),'S1階段以上 任意單手魔杖類武器');
  assert.equal(fullMaterialName('簽名 短弓'),'簽名 短弓');
  assert.notEqual(fullMaterialName('粗線'),fullMaterialName('粗線團'));
});

test('拍賣複製去除簽名、星數與改造條件，保留完整道具名及性別', () => {
  for (const [input, expected] of [
    ['簽名 白龍甲（男性用）','拉克里斯追逐者鎧甲（男性用）'],
    ['簽名 巴貝斯巴勒殺手鎧甲（女性用）','巴貝斯巴勒殺手鎧甲（女性用）'],
    ['5星 奶油烤龍蝦','奶油烤龍蝦'], ['五星 奶油烤龍蝦','奶油烤龍蝦'],
    ['4星以上 雞蛋壽司','雞蛋壽司'], ['S4階段以上 凱爾特三矛魔杖','凱爾特三矛魔杖'],
    ['R1階段以上 任意手裏劍類武器','手裏劍'], ['任意弓類武器','弓'],
    ['中型魔法藥水(效果50)','中型魔法藥水(效果50)'], ['樂譜卷軸（100）','樂譜卷軸（100）'],
  ]) assert.equal(auctionSearchName(input),expected);
});

test('新舊名稱都能查到同一材料，合計使用全名且不改原始資料', () => {
  const snapshot=JSON.stringify(data);
  const old=searchMaterials(data,'白龍甲','staff','S');
  const full=searchMaterials(data,'拉克里斯追逐者鎧甲','staff','S');
  assert.equal(old.length,1);
  assert.deepEqual(old,full);
  const result=simulateErg(data,{weaponId:'staff',startTier:'S',startStage:9,endTier:'S',endStage:9});
  assert.ok(result.materials.some(m=>m.name==='簽名 拉克里斯追逐者鎧甲（男性用）'));
  assert.equal(JSON.stringify(data),snapshot);
});

test('按材料格合併同名用量，不混合不同格的同名道具', () => {
  const grouped = materialsBySlot({rows:[
    {materials:[{slot:1,name:'材料甲',total:20,aliases:['舊名']},{slot:4,name:'材料甲',total:1}]},
    {materials:[{slot:1,name:'材料甲',total:30},{slot:4,name:'材料乙',total:1}]}
  ]});
  assert.deepEqual(grouped.map(g => g.slot), [1,2,3,4,5,6]);
  assert.deepEqual(grouped[0].materials, [{name:'材料甲',quantity:50,aliases:['舊名']}]);
  assert.equal(grouped[3].materials[0].quantity, 1);
  assert.equal(grouped[3].materials[1].name, '材料乙');
  assert.deepEqual(grouped[1].materials, []);
});

test('所有武器跨級別分格合計與完整清單相符，轉換材料僅另計一次', () => {
  for (const weapon of data.weapons) {
    const result = simulateErg(data, {weaponId:weapon.id,startTier:'B',startStage:1,endTier:'S',endStage:9,includeConversions:true});
    const groups = materialsBySlot(result);
    const quantities = new Map();
    for (const material of [...groups.flatMap(g => g.materials), ...result.conversions]) {
      quantities.set(material.name, (quantities.get(material.name) ?? 0) + material.quantity);
    }
    assert.deepEqual(quantities, new Map(result.materials.map(m => [m.name,m.quantity])));
    const prices = Object.fromEntries(result.materials.map(m => [m.name,500]));
    const splitCost = materialCosts([...groups.flatMap(g => g.materials),...result.conversions],prices).total;
    assert.equal(splitCost,materialCosts(result.materials,prices).total);
  }
});
