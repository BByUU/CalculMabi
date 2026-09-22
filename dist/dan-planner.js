// Finished-item recipes and NPC choices for the two equipment exams.
export function createNpcCatalog(data) {
  return {recipes:data.recipes, skills:data.skills};
}

export function npcChoices(catalog, skillId) {
  const skill = catalog.skills[skillId];
  if (!skill) return [];
  return [
    ...skill.left.flatMap(g => g.ids.map(id => ({npc:1, id}))),
    ...skill.middle.flatMap(id => [{npc:2, id}, {npc:3, id}]),
    ...skill.right.flatMap(g => g.ids.map(id => ({npc:4, id}))),
  ];
}

export function calculateNpcShopping(catalog, skillId, selections) {
  const allowed = new Set(npcChoices(catalog, skillId).map(c => `${c.npc}:${c.id}`));
  const materials = new Map(), patterns = new Set();
  const unique = new Set(selections);
  for (const key of unique) {
    if (!allowed.has(key)) throw new Error('無效的考場勾選項目');
    const recipe = catalog.recipes[key.split(':')[1]];
    for (const m of recipe.materials) materials.set(m.name, (materials.get(m.name) || 0) + m.quantity);
    patterns.add(recipe.pattern);
  }
  return {
    count:unique.size,
    materials:Array.from(materials, ([name, quantity]) => ({name, quantity:Math.ceil(quantity - 1e-9)})),
    patterns:[...patterns],
  };
}
