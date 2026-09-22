import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ROUND_EXAMS} from '../dist/dan-rounds.js';
import {SKILLS, resolveSkillRoute, skillHref} from '../dist/skill-navigation.js';

test('修練與升段共用技能清單，升段能力附屬於技能', () => {
  const training = JSON.parse(readFileSync(new URL('../dist/data/skills.json', import.meta.url)));
  const dan = JSON.parse(readFileSync(new URL('../dist/data/dan.json', import.meta.url)));
  assert.deepEqual(new Set(SKILLS.map(s => s.id)), new Set(training.skills.map(s => s.id)));
  assert.deepEqual(new Set(SKILLS.filter(s => s.dan).map(s => s.id)), new Set([...Object.keys(dan.skills), ...Object.keys(ROUND_EXAMS)]));
  assert.deepEqual(SKILLS.slice(0,4).map(s => s.id), ['blacksmith','tailoring','magic-craft','hillwen-engineering']);
});

test('四種技能在修練、升段、直接連結與返回時保持相同技能', () => {
  for (const skill of SKILLS.filter(s => s.dan)) for (const mode of ['training','dan']) {
    const href = new URL(skillHref(skill.id,mode), 'https://example.com/project/');
    const selected = href.searchParams.get('skill');
    assert.deepEqual(resolveSkillRoute(selected,mode,'blacksmith'), {skillId:skill.id,mode});
    assert.equal(resolveSkillRoute(null,mode,skill.id).skillId, skill.id);
    assert.equal(href.pathname, mode === 'dan' ? '/project/dan.html' : '/project/');
  }
});

test('未收錄升段的技能回到自己的修練頁，不跳到打鐵', () => {
  for (const skill of SKILLS.filter(s => !s.dan)) {
    assert.deepEqual(resolveSkillRoute(skill.id,'dan'), {skillId:skill.id,mode:'training'});
    assert.equal(skillHref(skill.id,'dan'), `./?skill=${skill.id}`);
  }
  assert.equal(resolveSkillRoute('invalid','dan','tailoring').skillId,'tailoring');
  assert.deepEqual(resolveSkillRoute('invalid','dan','invalid'), {skillId:'blacksmith',mode:'dan'});
});

test('切換技能模式時同時攜帶發布版本，避免讀取舊頁面排列', () => {
  for (const skill of SKILLS.filter(s => s.dan)) for (const mode of ['training','dan']) {
    const url = new URL(skillHref(skill.id,mode,'release-2'), 'https://example.com/project/');
    assert.equal(url.searchParams.get('skill'),skill.id);
    assert.equal(url.searchParams.get('v'),'release-2');
  }
  assert.equal(skillHref('tailoring','dan','new'), './dan.html?skill=tailoring&v=new');
});

test('兩種模式的頁面層級皆為大分類、技能、模式', () => {
  for (const page of ['index','dan']) {
    const html = readFileSync(new URL(`../dist/${page}.html`, import.meta.url),'utf8');
    assert.ok(html.indexOf('class="category-nav"') < html.indexOf('id="skill-nav"'));
    assert.ok(html.indexOf('id="skill-nav"') < html.indexOf('class="mode-nav skill-mode-nav"'));
  }
});
