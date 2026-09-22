// Traditional Chinese names checked against Mabinogi Fantasy World on 2026-09-22.
// Sources and category requirements are documented in docs/ERG.md.
const ITEM_NAMES = {
  '古代的怪物核心': '古代怪物的核心',
  '白龍甲（男性用）': '拉克里斯追逐者鎧甲（男性用）',
  '白龍甲（女性用）': '拉克里斯追逐者鎧甲（女性用）',
  '黑龍甲（男性用）': '巴貝斯巴勒殺手鎧甲（男性用）',
  '黑龍甲（女性用）': '巴貝斯巴勒殺手鎧甲（女性用）',
  '德斯丁銀騎士 金屬靴子': '德斯丁銀騎士金屬靴',
  '女性用劍士學校 制服短型': '女性用劍士學校制服短型',
  '炸豬排': '豬排',
};
// These recipe requirements specify a weapon category, not a particular item.
const WEAPON_CATEGORIES = {
  '弓':'弓類武器', '單手劍':'單手劍類武器', '單手斧':'單手斧類武器',
  '單手鈍器':'單手鈍器類武器', '雙手斧':'雙手斧類武器', '拳套':'拳套類武器',
  '單手魔杖':'單手魔杖類武器', '集魔杖':'集魔杖類武器', '鋼瓶':'鋼瓶類武器',
  '雙槍':'雙槍類武器', '手裏劍':'手裏劍類武器', '鎖鏈鐮刃':'鎖鏈鐮刃類武器',
  '手把':'人偶手把類武器', '人偶手把':'人偶手把類武器',
};

export function fullMaterialName(name) {
  const match = name.match(/^(簽名 |[SR]\d+階段以上 |\d星 )?(.*)$/);
  const prefix = match[1] ?? '';
  const base = match[2];
  return prefix + (ITEM_NAMES[base] ?? (prefix === '簽名 ' ? base : WEAPON_CATEGORIES[base] ? `任意${WEAPON_CATEGORIES[base]}` : base));
}

export function auctionSearchName(name) {
  const base = String(name).trim().replace(/^(?:(?:簽名|標示製作者的)\s*|(?:[1-5一二三四五]\s*星(?:以上)?)\s*|[SR]\s*\d+\s*階段以上\s*)+/i, '');
  const category = Object.entries(WEAPON_CATEGORIES).find(([, label]) => base === `任意${label}` || base === label);
  return category ? (category[0] === '手把' ? '人偶手把' : category[0]) : ITEM_NAMES[base] ?? base;
}
