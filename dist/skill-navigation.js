export const SKILLS = [
  {id:'blacksmith', name:'打鐵', dan:true},
  {id:'tailoring', name:'衣物製作', dan:true},
  {id:'magic-craft', name:'魔法製造', dan:true},
  {id:'hillwen-engineering', name:'稀原工學', dan:true},
  {id:'fynn-bead-burnishing', name:'芬恩寶珠閃耀', dan:false},
  {id:'fynn-craft', name:'芬恩的手工藝', dan:false},
  {id:'enchant', name:'魔力賦予', dan:false},
  {id:'handicraft', name:'手工藝', dan:false},
  {id:'stationery-craft', name:'文具工藝', dan:false},
];
const STORAGE = 'mabi-selected-skill';
const RELEASE = new URL(import.meta.url).searchParams.get('v');

export function resolveSkillRoute(skillId, mode, rememberedSkill) {
  const skill = SKILLS.find(skill => skill.id === skillId)
    ?? SKILLS.find(skill => skill.id === rememberedSkill) ?? SKILLS[0];
  return {skillId:skill.id, mode:mode === 'dan' && skill.dan ? 'dan' : 'training'};
}

export function skillHref(skillId, mode, revision = RELEASE) {
  const route = resolveSkillRoute(skillId, mode);
  return `${route.mode === 'dan' ? './dan.html' : './'}?skill=${encodeURIComponent(route.skillId)}${revision ? `&v=${encodeURIComponent(revision)}` : ''}`;
}

export function currentSkillRoute(mode) {
  let remembered;
  try { remembered = sessionStorage.getItem(STORAGE); } catch { /* Optional storage. */ }
  return resolveSkillRoute(new URLSearchParams(location.search).get('skill'), mode, remembered);
}

export function skillNavigationMarkup() {
  return SKILLS.map(item => `<button type="button" class="skill-button" data-skill="${item.id}" aria-pressed="false"><img class="skill-icon" src="./assets/skills/${item.id}.webp" width="26" height="26" alt="" aria-hidden="true" decoding="async"><span>${item.name}</span></button>`).join('');
}

export function renderSkillNavigation(skillId, mode) {
  const skill = SKILLS.find(skill => skill.id === skillId);
  const navigation = document.getElementById('skill-nav');
  navigation.setAttribute('aria-label', '選擇技能');
  if (navigation.querySelectorAll('[data-skill]').length !== SKILLS.length) navigation.innerHTML = skillNavigationMarkup();
  navigation.querySelectorAll('[data-skill]').forEach(button => {
    const selected = button.dataset.skill === skillId;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
    button.disabled = false;
  });
  document.getElementById('training-mode').href = skillHref(skillId, 'training');
  const danLink = document.getElementById('dan-mode');
  if (skill.dan) {
    danLink.href = skillHref(skillId, 'dan');
    danLink.removeAttribute('aria-disabled');
    danLink.removeAttribute('title');
  } else {
    danLink.removeAttribute('href');
    danLink.setAttribute('aria-disabled', 'true');
    danLink.title = '尚未收錄此技能的升段資料';
  }
  document.querySelector('.category-nav a').href = skillHref(skillId, mode);
  const url = new URL(location.href);
  url.searchParams.set('skill', skillId);
  history.replaceState(null, '', url);
  try { sessionStorage.setItem(STORAGE, skillId); } catch { /* Optional storage. */ }
}

export function bindSkillNavigation(mode, selectSkill) {
  document.getElementById('skill-nav').addEventListener('click', event => {
    const button = event.target.closest('[data-skill]');
    if (!button || button.getAttribute('aria-pressed') === 'true') return;
    const route = resolveSkillRoute(button.dataset.skill, mode);
    if (route.mode !== mode) location.assign(skillHref(route.skillId, route.mode));
    else selectSkill(route.skillId);
  });
}
