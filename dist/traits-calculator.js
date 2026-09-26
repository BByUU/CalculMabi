// Trait (特性) upgrade costs and weekly Pryllyth (璞黎) limits.
// Checked against the Bahamut trait guide (bsn=7422, snA=239060, floors 1 and 4) on 2026-09-25.
export const MAX_LEVEL = 10;
export const WEEKLY_CAP = 1500;
export const HOLD_CAP = 5000;

export const CATEGORIES = [
  {id:'training', name:'修行', basicCrystal:'修行的璞黎結晶', advancedCrystal:'高尚的修行的璞黎結晶', source:'角色等級每提升 1 級 +10'},
  {id:'challenge', name:'挑戰', basicCrystal:'挑戰的璞黎結晶', advancedCrystal:'崇高的挑戰的璞黎結晶', source:'完成地下城、副本、影子任務或平原首領攻略任務，每次 +50'},
  {id:'sympathy', name:'交感', basicCrystal:'交感的璞黎結晶', advancedCrystal:'憐憫的交感的璞黎結晶', source:'完成反覆欄每日任務或任務捲軸，每個 +50'},
];

// Cost of reaching each level from the level before it.
export const LEVEL_COSTS = [
  [2, 5, 400, 0, 0], [3, 6, 500, 0, 0], [4, 7, 600, 0, 0],
  [5, 8, 600, 20, 0], [6, 9, 700, 30, 0], [7, 10, 800, 40, 0],
  [8, 12, 800, 0, 30], [9, 15, 1100, 0, 40], [10, 20, 1400, 0, 50],
].map(([level, ap, points, basic, advanced]) => ({level, ap, points, basic, advanced}));

// In-game default order of the trait window.
export const TRAITS = [
  ['firm-will', '堅定意志', 'training'],
  ['transcend-life', '超越:生命', 'sympathy'],
  ['impact-cancel', '衝擊相消', 'challenge'],
  ['damage-absorb', '傷害吸收', 'training'],
  ['revival', '起死回生', 'challenge'],
  ['time-warp', '時間歪曲', 'sympathy'],
  ['haste', '快速', 'training'],
  ['vital-pierce', '要害貫通', 'challenge'],
  ['element-hone', '元素打磨', 'sympathy'],
  ['follow-up', '連續攻擊', 'sympathy'],
  ['insight-eye', '洞察之眼', 'sympathy'],
  ['status-support', '狀態支援', 'training'],
  ['focused-lure', '集中引誘', 'challenge'],
  ['regen-field', '再生之域', 'training'],
  ['power-rally', '力量團聚', 'challenge'],
  ['chain-manifest', '連續實體化', 'training'],
  ['block', '阻斷', 'sympathy'],
  ['guard-hand', '保護之手', 'challenge'],
  ['fragarach', '刻印：弗拉加拉赫', 'training'],
].map(([id, name, category]) => ({id, name, category}));

function integer(value, min, max, label) {
  const n = Number(value);
  if (value === '' || value == null || typeof value === 'boolean' || !Number.isInteger(n) || n < min || n > max) {
    throw new Error(`${label}須為 ${min} 至 ${max.toLocaleString('zh-TW')} 的整數。`);
  }
  return n;
}

export function upgradeCost(from, to) {
  from = integer(from, 1, MAX_LEVEL, '目前等級');
  to = integer(to, 1, MAX_LEVEL, '目標等級');
  if (to < from) throw new Error('目標等級不可低於目前等級。');
  const cost = {ap:0, points:0, basic:0, advanced:0};
  for (const step of LEVEL_COSTS) {
    if (step.level <= from || step.level > to) continue;
    for (const key of Object.keys(cost)) cost[key] += step[key];
  }
  return cost;
}

export function defaultTraitPlan() {
  return {
    levels:Object.fromEntries(TRAITS.map(trait => [trait.id, {current:1}])),
    conversionDays:Object.fromEntries(CATEGORIES.map(category => [category.id, 0])),
    held:Object.fromEntries(CATEGORIES.map(category => [category.id, 0])),
  };
}

const sum = (items, key) => items.reduce((total, item) => total + item[key], 0);

// Every trait is planned up to Lv.10; only the current level varies.
export function calculateTraits(plan) {
  const days = Object.fromEntries(CATEGORIES.map(category => [category.id, integer(plan?.conversionDays?.[category.id] ?? 0, 0, 7, `${category.name}每週轉換天數`)]));
  const totalDays = Object.values(days).reduce((a, b) => a + b, 0);
  if (totalDays > 7) throw new Error('每週轉換天數合計不可超過 7 天。');
  const rows = TRAITS.map(trait => {
    const choice = plan?.levels?.[trait.id];
    if (!choice || typeof choice !== 'object') throw new Error(`缺少${trait.name}的等級設定。`);
    const current = integer(choice.current, 1, MAX_LEVEL, `${trait.name}目前等級`);
    const cost = upgradeCost(current, MAX_LEVEL);
    return {...trait, current, ...cost, weeks:Math.ceil(cost.points / (WEEKLY_CAP + days[trait.category] * 100))};
  });
  const categories = CATEGORIES.map(category => {
    const own = rows.filter(row => row.category === category.id);
    const held = integer(plan?.held?.[category.id] ?? 0, 0, HOLD_CAP, `${category.name}的目前持有璞黎點`);
    const points = sum(own, 'points');
    const missing = Math.max(0, points - held);
    return {...category, traits:own.length, upgrading:own.filter(row => row.current < MAX_LEVEL).length,
      points, held, missing, conversionDays:days[category.id], weeklyPoints:WEEKLY_CAP + days[category.id] * 100, weeklyAP:days[category.id] * 10, weeks:Math.ceil(missing / (WEEKLY_CAP + days[category.id] * 100)), ap:sum(own, 'ap'), basic:sum(own, 'basic'), advanced:sum(own, 'advanced')};
  });
  const weeks = Math.max(...categories.map(category => category.weeks));
  return {rows, categories, conversion:{days:totalDays, weeklyAP:totalDays * 10, weeklyPoints:totalDays * 100}, totals:{
    points:sum(categories, 'points'), missing:sum(categories, 'missing'), ap:sum(rows, 'ap'), weeks,
    slowest:weeks ? categories.filter(category => category.weeks === weeks).map(category => category.id) : [],
  }};
}
