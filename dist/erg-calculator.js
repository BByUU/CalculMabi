// Independent attempts with a fixed per-stage probability (geometric distribution).
import {stageMaterials} from './erg-audit.js';
import {auctionSearchName} from './erg-material-names.js';
import {stackBreakdown} from './dan-calculator.js';
import {ERG_FEED} from './erg-feed.js';
export const TIERS = ['B', 'A', 'S'];

export function materialStacks(material, catalog) {
  return stackBreakdown(material.quantity, catalog.items[auctionSearchName(material.name)]?.stackSize ?? null);
}

// Unit prices are entered and stored as whole gold.
export function priceToGold(value) {
  if (value === '') return '';
  const gold = number(value, '單價');
  if (!Number.isSafeInteger(gold) || gold < 0 || gold > 1000000000000) {
    throw new Error('單價須為 0 至 1,000,000,000,000 的整數金幣。');
  }
  return gold;
}

export function formatGold(amount) {
  const gold = BigInt(amount);
  const absolute = gold < 0n ? -gold : gold;
  if (absolute < 10000n) return gold.toLocaleString('zh-TW');
  // Split whole gold into 億 / 萬 / remainder without losing large-total precision.
  const hundredMillions = absolute / 100000000n;
  const tenThousands = absolute % 100000000n / 10000n;
  const remainder = absolute % 10000n;
  return (gold < 0n ? '-' : '')
    + (hundredMillions ? hundredMillions.toLocaleString('zh-TW') + '億' : '')
    + (tenThousands ? tenThousands + '萬' : '')
    + (remainder ? remainder.toString() : '');
}

export function conversionMaterials(startTier, endTier, enabled = false) {
  const from = TIERS.indexOf(startTier), to = TIERS.indexOf(endTier);
  if (from < 0 || to < from) throw new Error('請選擇有效的轉換級別。');
  if (!enabled) return [];
  return TIERS.slice(from, to).map((tier, i) => ({
    name: `升階催化劑${tier}`, quantity: 1, aliases: [],
    stages: [{id: `${tier} → ${TIERS[from + i + 1]} 轉換`, quantity: 1}],
  }));
}

export function materialCosts(materials, prices = {}) {
  let total = 0n, missing = 0;
  const rows = materials.map(material => {
    const raw = Object.hasOwn(prices, material.name) ? prices[material.name] : '';
    if (raw === '' || raw === undefined) {
      missing++;
      return {...material, cost: null};
    }
    const price = number(raw, `${material.name}單價`);
    if (!Number.isSafeInteger(price) || price < 0 || price > 1000000000000) {
      throw new Error('單價請填 0 至 1,000,000,000,000 的整數金幣；留空表示尚未計價。');
    }
    if (!Number.isSafeInteger(material.quantity) || material.quantity < 0) throw new Error('材料數量無效。');
    const cost = BigInt(price) * BigInt(material.quantity);
    total += cost;
    return {...material, cost};
  });
  return {rows, total, missing};
}

function number(value, label) {
  if (value === '' || value === null || typeof value === 'boolean' || !Number.isFinite(Number(value))) {
    throw new Error(`${label}請填入有效數字。`);
  }
  return Number(value);
}

export function attemptsForProbability(p, boosted = false, plus = 0, confidence = 0.99) {
  p = number(p, '成功率');
  plus = number(plus, '藥水加成');
  confidence = number(confidence, '累積成功率');
  if (p <= 0 || p > 1 || plus < 0 || plus > 1 || confidence <= 0 || confidence >= 1) {
    throw new Error('成功率須大於 0 且不超過 100%，累積成功率須介於 0% 與 100% 之間。');
  }
  const effective = Math.min(1, p + (boosted ? plus : 0));
  if (effective === 1) return 1;
  const quotient = Math.log1p(-confidence) / Math.log1p(-effective);
  // Remove only floating-point noise at an exact integer boundary (90% => 2).
  const attempts = Math.ceil(quotient - 8 * Number.EPSILON * Math.max(1, quotient));
  if (!Number.isSafeInteger(attempts)) throw new Error('所需次數超出可精確計算的範圍。');
  return Math.max(1, attempts);
}

export function selectStages(weapon, {startTier = 'A', startStage = 1, endTier = 'S', endStage = 9} = {}) {
  startStage = number(startStage, '起始階段');
  endStage = number(endStage, '結束階段');
  const from = TIERS.indexOf(startTier), to = TIERS.indexOf(endTier);
  if (from < 0 || to < from || ![startStage, endStage].every(n => Number.isInteger(n) && n >= 1 && n <= 9)
      || (from === to && endStage < startStage) || (from < to && endStage < 7)) {
    throw new Error('請選擇有效區間；跨級別升級後，從階段 7 開始。');
  }
  const stages = [];
  for (let tier = from; tier <= to; tier++) {
    const first = tier === from ? startStage : 7;
    const last = tier === to ? endStage : 9;
    for (let stage = first; stage <= last; stage++) {
      const row = weapon.stages.find(s => s.tier === TIERS[tier] && s.stage === stage);
      if (!row) throw new Error('此武器缺少所選階段資料。');
      stages.push(row);
    }
  }
  return stages;
}

export function simulateErg(data, options = {}) {
  const weapon = data.weapons.find(w => w.id === options.weaponId);
  if (!weapon) throw new Error('請選擇武器種類。');
  const rows = selectStages(weapon, options).map(stage => {
    const rule = data.probabilities[stage.tier][stage.stage - 1];
    const boosted = options.potions?.[stage.id] === true;
    const probability = Math.min(1, rule.probability + (boosted ? rule.boost : 0));
    // Validate probabilities even when a manual count is supplied.
    const quantile = attemptsForProbability(rule.probability, boosted, rule.boost, options.confidence ?? 0.99);
    const manual = Object.hasOwn(options.attempts ?? {}, stage.id);
    const attempts = manual ? number(options.attempts[stage.id], '嘗試次數') : quantile;
    if (!Number.isSafeInteger(attempts) || attempts < 1 || attempts > 100000000) throw new Error('嘗試次數請填 1 至 100,000,000 的整數。');
    return {...stage, ...rule, boosted, probability, attempts, manual,
      materials: stageMaterials(weapon.id, stage).map(m => ({...m, total: m.quantity * (m.consumption === 'attempt' ? attempts : 1)}))};
  });
  const totals = new Map();
  for (const row of rows) for (const material of row.materials) {
    if (!totals.has(material.name)) totals.set(material.name, {name: material.name, quantity: 0, stages: [], aliases:[]});
    const entry = totals.get(material.name);
    entry.quantity += material.total;
    entry.aliases = [...new Set([...entry.aliases, ...(material.aliases ?? [])])];
    entry.stages.push({id: row.id, quantity: material.total, slot: material.slot});
  }
  const conversions = conversionMaterials(options.startTier ?? 'A', options.endTier ?? 'S', options.includeConversions === true);
  for (const material of conversions) {
    if (!totals.has(material.name)) totals.set(material.name, {...material, stages:[...material.stages]});
    else {
      const entry = totals.get(material.name);
      entry.quantity += material.quantity;
      entry.stages.push(...material.stages);
    }
  }
  const feedRows = rows.flatMap(row => {
    const block = {...ERG_FEED[row.tier][row.stage - 1], tier:row.tier};
    return row.stage === 9 ? [block, {...ERG_FEED[row.tier][9], tier:row.tier}] : [block];
  });
  return {weapon, rows, conversions, materials: [...totals.values()], feedRows,
    totalAttempts: rows.reduce((n, row) => n + row.attempts, 0),
    potionCount: rows.reduce((n, row) => n + (row.boosted ? row.attempts : 0), 0),
    feedExperience: feedRows.reduce((sum, row) => sum + row.experience, 0),
    feedReference: feedRows.reduce((sum, row) => sum.map((n, i) => n + row.quantities[i]), [0, 0, 0, 0])};
}

export function materialsBySlot(result) {
  const slots = Array.from({length:6}, () => new Map());
  for (const row of result.rows) for (const material of row.materials) {
    const group = slots[material.slot - 1];
    if (!group.has(material.name)) group.set(material.name, {name:material.name, quantity:0, aliases:[]});
    const entry = group.get(material.name);
    entry.quantity += material.total;
    entry.aliases = [...new Set([...entry.aliases, ...(material.aliases ?? [])])];
  }
  return slots.map((materials, index) => ({slot:index + 1, materials:[...materials.values()]}));
}

export function searchMaterials(data, query, weaponId = '', tier = '') {
  const terms = String(query).trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return data.weapons.filter(w => !weaponId || w.id === weaponId).flatMap(weapon =>
    weapon.stages.filter(s => !tier || s.tier === tier).flatMap(stage =>
      stageMaterials(weapon.id, stage).filter(m => terms.every(term => `${m.name} ${(m.aliases ?? []).join(' ')}`.toLocaleLowerCase().includes(term)))
        .map(material => ({weaponId: weapon.id, weaponName: weapon.name, stageId: stage.id,
          tier: stage.tier, stage: stage.stage, levelRange: stage.levelRange, ...material}))));
}
