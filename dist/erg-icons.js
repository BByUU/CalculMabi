const weapons = new Set(['staff', 'bow', 'two-handed', 'one-handed', 'knuckles', 'cylinder', 'control-bar', 'dual-gun', 'shuriken', 'chain', 'scythe']);

// Line-art adaptations; source artwork and generation prompts are recorded in docs/.
export function weaponIcon(id) {
  if (!weapons.has(id)) return '';
  if (id === 'bow') return '<img class="weapon-icon" src="./assets/weapons-line/bow-user-smooth.webp" width="32" height="32" alt="" aria-hidden="true" decoding="async">';
  const asset = id;
  return '<img class="weapon-icon" src="./assets/weapons-line/' + asset + '.webp" width="32" height="32" alt="" aria-hidden="true" decoding="async">';
}
