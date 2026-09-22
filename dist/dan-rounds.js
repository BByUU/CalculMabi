// Current exam objectives and fixed recipes, checked 2026-09-22.
// Exam targets and shopping quantities are documented in docs/DAN.md.
const recipes = {};
// Exam-shop purchase bundles, not inventory stack limits (see docs/DAN.md).
const specialBundles = {
  使者之環:5, 使者的皮革:5, 使者的銳利碎片:5, 使者的堅韌碎片:5, 使者的閃光碎片:5,
  黑龍的心臟:5, 白龍的心臟:5,
};
const shopBundles = {
  'hillwen-engineering':{
    ...specialBundles, 希里原:50, 綠寶石核心:50, 稀原礦石碎片:50, 稀原合金:20,
    龍的骨頭:5, 龍的鱗片:5, 龍的腳趾甲:5, 雙手劍:1, 菲西斯木製槍:1,
  },
  'magic-craft':{
    ...specialBundles, 希里原結晶:50, 基因突變兔的腳:50, 基因突變植物的黏液:50, 稀原:50,
    基因突變體:20, 神秘的香草粉:20, 完整的希里原:20, 中級木柴:10,
    雷之自然力:5, 冰之自然力:5, 火之自然力:5, 黑龍的血:5, 白龍的血:5, 箭:100, 熊皮拳套:2,
  },
};
const recipe = (name, ingredients, output = 1) => {
  recipes[name] = {name, ingredients:Object.entries(ingredients).map(([name, quantity]) => ({name, quantity})), output};
  return name;
};
recipe('希里原', {希里原結晶:5});
recipe('實習用魔力子彈', {希里原結晶:2}, 10);
recipe('淨化的兔子腳', {希里原:1, 基因突變兔的腳:1});
recipe('黏黏膠水', {希里原:1, 基因突變植物的黏液:1});
recipe('聚集魔力的木柴', {希里原:1, 稀原:1, 中級木柴:1});
for (const [name, element] of [['野蠻的閃電魔杖','雷之自然力'],['野蠻的冰雪魔杖','冰之自然力'],['野蠻的火焰魔杖','火之自然力']]) {
  recipe(name, {聚集魔力的木柴:3, 神秘的香草粉:5, 完整的希里原:10, 基因突變體:1, [element]:1});
}
recipe('救贖聖弓', {基因突變體:2, 使者之環:2, 使者的皮革:2, 使者的銳利碎片:3, 使者的堅韌碎片:4, 使者的閃光碎片:8});
recipe('原罪魔杖', {基因突變體:2, 使者之環:2, 使者的皮革:2, 使者的銳利碎片:2, 使者的堅韌碎片:6, 使者的閃光碎片:8});
recipe('福音鋼瓶', {基因突變體:2, 使者之環:2, 使者的皮革:3, 使者的銳利碎片:2, 使者的堅韌碎片:4, 使者的閃光碎片:6});
recipe('巴貝斯巴勒女獵人', {箭:100, 黑龍的心臟:1, 黑龍的血:3, 完整的希里原:10, 基因突變體:1});
recipe('拉克里斯追逐者', {熊皮拳套:1, 白龍的心臟:1, 白龍的血:3, 完整的希里原:10, 基因突變體:1});
recipe('稀原', {稀原礦石碎片:5});
recipe('六角螺絲', {稀原礦石碎片:1});
recipe('六角螺帽', {稀原礦石碎片:1});
recipe('綠寶石保險絲', {綠寶石核心:1});
recipe('能量轉換器', {稀原:1, 希里原:1});
recipe('朝聖者之劍', {稀原合金:10, 使者之環:1, 使者的皮革:3, 使者的銳利碎片:4, 使者的堅韌碎片:7, 使者的閃光碎片:5});
recipe('狂徒巨劍', {稀原合金:10, 使者之環:1, 使者的皮革:2, 使者的銳利碎片:3, 使者的堅韌碎片:8, 使者的閃光碎片:10});
recipe('聖痕拳套', {稀原合金:10, 使者之環:1, 使者的皮革:3, 使者的銳利碎片:5, 使者的堅韌碎片:4, 使者的閃光碎片:6});
recipe('巴貝斯巴勒殺手', {稀原合金:10, 黑龍的心臟:1, 龍的骨頭:5, 龍的鱗片:5, 龍的腳趾甲:5, 雙手劍:1});
recipe('拉克里斯碎骨石', {稀原合金:10, 白龍的心臟:1, 龍的骨頭:5, 龍的鱗片:5, 龍的腳趾甲:5, 菲西斯木製槍:1});
const group = (stage, entries) => ({stage, targets:entries.map(([name, quantity]) => ({id:name, name, quantity}))});
export const ROUND_EXAMS = {
  'magic-craft':[
    group(1, [['希里原',15],['實習用魔力子彈',150],['淨化的兔子腳',8],['黏黏膠水',8],['聚集魔力的木柴',8]]),
    group(2, [['救贖聖弓',6],['原罪魔杖',6],['福音鋼瓶',6],['野蠻的閃電魔杖',3],['野蠻的冰雪魔杖',3],['野蠻的火焰魔杖',3]]),
    group(3, [['巴貝斯巴勒女獵人',2],['拉克里斯追逐者',2]]),
  ],
  'hillwen-engineering':[
    group(1, [['稀原',8],['六角螺絲',60],['六角螺帽',60],['綠寶石保險絲',8],['能量轉換器',4]]),
    group(2, [['朝聖者之劍',6],['狂徒巨劍',6],['聖痕拳套',6]]),
    group(3, [['巴貝斯巴勒殺手',2],['拉克里斯碎骨石',2]]),
  ],
};
function targetFor(skillId, stage, id) {
  const target = ROUND_EXAMS[skillId]?.find(g => g.stage === stage)?.targets.find(t => t.id === id);
  if (!target) throw new Error('無效的考試目標。');
  return target;
}
export function selectRoundTarget(skillId, selections, stage, id) {
  targetFor(skillId, stage, id);
  return {...selections, [stage]:id};
}
export function calculateRoundPlan(skillId, stage, id) {
  const target = targetFor(skillId, stage, id);
  // Only intermediates unavailable in this exam's shop are expanded.
  // Magic Craft can buy Hillwen; Engineering can buy Shyllien and Hillwen Alloy.
  const mustCraft = new Set(skillId === 'magic-craft' ? ['希里原','聚集魔力的木柴'] : ['稀原']);
  const materials = new Map(), steps = [];
  function craft(name, quantity) {
    const recipe = recipes[name], attempts = Math.ceil(quantity / recipe.output);
    const ingredients = recipe.ingredients.map(m => ({...m, quantity:m.quantity * attempts}));
    for (const ingredient of ingredients) {
      if (mustCraft.has(ingredient.name)) craft(ingredient.name, ingredient.quantity);
      else {
        const material = materials.get(ingredient.name) ?? {name:ingredient.name, quantity:0, uses:[]};
        material.quantity += ingredient.quantity;
        material.uses.push({name, quantity:ingredient.quantity});
        materials.set(ingredient.name, material);
      }
    }
    steps.push({name, quantity, attempts, output:recipe.output, ingredients});
  }
  craft(target.name, target.quantity);
  const shopping = [...materials.values()].map(material => {
    const bundleSize = shopBundles[skillId][material.name];
    if (!Number.isSafeInteger(bundleSize) || bundleSize < 1) throw new Error(`缺少考場販售組數：${material.name}`);
    return {...material, bundleSize, bundles:Math.ceil(material.quantity / bundleSize)};
  });
  return {target, materials:shopping, steps};
}
