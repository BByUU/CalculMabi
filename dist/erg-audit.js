import {fullMaterialName} from './erg-material-names.js';
export const ERG_AUDIT = {
  checkedAt: '2026-09-22',
  pages: {
    staff: ['Wands', 'Staves', 'Healing_Wands'],
    bow: ['Bows', 'Crossbows'],
    'two-handed': ['Two-Handed_Swords', 'Two-Handed_Blunts', 'Two-Handed_Axes', 'Lances'],
    'one-handed': ['One-Handed_Swords', 'One-Handed_Blunts', 'One-Handed_Axes', 'Atlatls'],
    knuckles: ['Knuckles'], cylinder: ['Cylinders'], 'control-bar': ['Control_Bars'],
    'dual-gun': ['Dual_Guns'], shuriken: ['Shuriken'], chain: ['Chain_Blades'], scythe: ['Scythes'],
  },
};

export function wikiUrl(weaponId) {
  return `https://wiki.mabinogiworld.com/view/Erg/${ERG_AUDIT.pages[weaponId][0]}`;
}

export function stageMaterials(weaponId, stage) {
  return stage.materials.map(material => {
    const name = fullMaterialName(material.name);
    return {...material, name, aliases:[...new Set([...(material.aliases ?? []), material.name])].filter(alias => alias !== name)};
  });
}
