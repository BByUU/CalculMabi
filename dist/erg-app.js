import {escapeHtml as esc, formatNumber as fmt} from './format.js';
import {weaponIcon} from './erg-icons.js';
import {TIERS, simulateErg, searchMaterials, materialCosts, materialStacks, materialsBySlot, priceToGold, formatGold} from './erg-calculator.js';
import {auctionSearchName} from './erg-material-names.js';

const $ = id => document.getElementById(id);
const STORAGE = 'mabi-erg-v1';
const defaults = () => ({weaponId:'staff', startTier:'A', startStage:1, endTier:'S', endStage:9, schemaVersion:2, confidence:0.99, attempts:{}, potions:{}, includeConversions:false, prices:{}});
let data, stackCatalog, state, result, lookupLimit = 80;
let itemCopyTimer;
let renderedRoute = '', stageNodes = new Map(), totalNodes = new Map(), costNodes = new Map(), priceNodes = new Map();
const successWithin = row => row.probability === 1 ? '100%' : -Math.expm1(row.attempts * Math.log1p(-row.probability)) >= 0.9999 ? '>99.99%' : `${fmt(-Math.expm1(row.attempts * Math.log1p(-row.probability)) * 100)}%`;
const copyAttributes = name => `data-copy-item="${esc(auctionSearchName(name))}" title="複製道具名稱：${esc(auctionSearchName(name))}" aria-label="複製道具名稱：${esc(auctionSearchName(name))}"`;
const validPrice = value => (typeof value === 'number' || typeof value === 'string') && value !== '' && Number.isSafeInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 1000000000000;
const moneyUnit = () => '金幣';
const money = amount => formatGold(amount);
const priceInput = (name, context) => `<input class="erg-price-input" type="number" min="0" max="1000000000000" step="1" inputmode="numeric" placeholder="未填" data-price="${esc(name)}" value="${validPrice(state.prices[name]) ? Number(state.prices[name]) : ''}" aria-label="${esc(context)} ${esc(name)}每個單價（${moneyUnit()}）">`;
const costCell = material => `<strong data-material-cost="${esc(material.name)}" data-quantity="${material.quantity}">—</strong>`;

function save() {
  const prices = Object.fromEntries(Object.entries(state.prices).filter(([, value]) => validPrice(value)));
  try { localStorage.setItem(STORAGE, JSON.stringify({...state, prices})); } catch { /* Storage is optional. */ }
}

function navigation() {
  const nav = $('weapon-nav');
  if (nav.querySelectorAll('[data-weapon]').length !== data.weapons.length) {
    nav.innerHTML = data.weapons.map(w => `<button type="button" class="skill-button" data-weapon="${w.id}">${weaponIcon(w.id)}<span>${esc(w.name)}</span></button>`).join('');
  }
  nav.querySelectorAll('[data-weapon]').forEach(button => {
    const selected = button.dataset.weapon === state.weaponId;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
    button.disabled = false;
  });
  $('route-title').textContent = data.weapons.find(w => w.id === state.weaponId).name;
}

function controls() {
  $('erg-confidence-number').value = Number((state.confidence * 100).toFixed(1));
  $('erg-confidence-slider').value = $('erg-confidence-number').value;
  $('start-tier').value = state.startTier;
  $('end-tier').value = state.endTier;
  for (const id of ['start-stage', 'end-stage']) {
    $(id).innerHTML = Array.from({length:9}, (_, i) => `<option value="${i+1}">階段 ${i+1} · Lv.${(i+1)*5}</option>`).join('');
  }
  $('start-stage').value = state.startStage;
  $('end-stage').value = state.endStage;
}

function update(force = false) {
  document.querySelectorAll('[data-price-heading]').forEach(cell => { cell.textContent = `單價（${moneyUnit()}／個）`; });
  document.querySelectorAll('[data-cost-heading]').forEach(cell => { cell.textContent = `金額（${moneyUnit()}）`; });
  const crossesTier = TIERS.indexOf(state.endTier) > TIERS.indexOf(state.startTier);
  $('conversion-option').hidden = !crossesTier;
  $('include-conversions').checked = state.includeConversions === true;
  try {
    const previous = result;
    result = simulateErg(data, state);
    const route = JSON.stringify([state.weaponId, result.rows.map(row => row.id), state.includeConversions]);
    const rebuild = force || !previous || route !== renderedRoute;
    $('erg-error').hidden = true;
    const confidence = fmt(state.confidence * 100);
    $('erg-confidence-description').textContent = `目標 ${confidence}%：每階準備足夠次數，讓至少成功一次的機率達到 ${confidence}%；次數向上取整。`;
    $('erg-confidence-slider').setAttribute('aria-valuetext', `${confidence}% 累積成功率`);
    $('erg-summary').innerHTML = `<article class="stat-card"><span>規劃開放階段</span><strong>${result.rows.length}<small>階</small></strong><p>${state.startTier}${state.startStage} → ${state.endTier}${state.endStage}</p></article><article class="stat-card"><span>預計嘗試次數合計</span><strong>${fmt(result.totalAttempts)}<small>次</small></strong><p>目標 ${confidence}%${result.rows.some(r => r.manual) ? ' · 含自訂次數' : ''}</p></article><article class="stat-card accent"><span>開放輔助藥水</span><strong>${fmt(result.potionCount)}<small>瓶</small></strong><p>按勾選階段的嘗試次數</p></article>`;
    if (rebuild) {
      const materialLines = materials => `<div class="erg-material-group">${materials.map(m => `<div class="erg-priced-material"><button type="button" class="erg-material-cell" ${copyAttributes(m.name)}><span class="erg-material-slot" aria-label="第 ${m.slot} 格">${m.slot}</span><span class="erg-material-name">${esc(m.name)}<small>${m.consumption === 'attempt' ? `每次 ${fmt(m.quantity)}` : '成功時'}</small></span><strong>${fmt(m.total)}</strong></button><label class="erg-inline-price"><span>單價</span>${priceInput(m.name, '開放材料')}<small>金額 ${costCell({name:m.name, quantity:m.total})}</small></label></div>`).join('')}</div>`;
      $('erg-stages').innerHTML = result.rows.map(row => `<tr data-stage="${row.id}"><th scope="row">${row.tier} 級 · 階段 ${row.stage}<small>Lv.${row.stage*5} 開放</small></th><td class="erg-number">${fmt(data.probabilities[row.tier][row.stage-1].probability*100)}%</td><td><label class="erg-potion-check"><input type="checkbox" data-potion="${row.id}" aria-label="${row.tier} 級階段 ${row.stage} 使用藥水" ${row.boosted ? 'checked' : ''}>使用<small>+${fmt(row.boost*100)}%</small></label></td><td class="erg-number">${fmt(row.probability*100)}%</td><td><input class="erg-attempts-input" type="number" min="1" max="100000000" step="1" data-attempts="${row.id}" value="${row.attempts}" aria-label="${row.tier} 級階段 ${row.stage} 嘗試次數"><small>${row.manual ? '自訂次數' : '目標成功率估算'}</small><small>次內成功 ${successWithin(row)}</small></td><td>${materialLines(row.materials.filter(m => m.consumption === 'attempt'))}</td><td>${materialLines(row.materials.filter(m => m.consumption !== 'attempt'))}</td></tr>`).join('');
      stageNodes = new Map([...$('erg-stages').querySelectorAll('[data-stage]')].map(node => [node.dataset.stage, node]));
    } else {
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows[i], old = previous.rows[i];
        if (row.attempts !== old.attempts || row.boosted !== old.boosted || row.manual !== old.manual) patchStage(row);
      }
    }
    $('all-potions').textContent = result.rows.every(r => r.boosted) ? '全部停用藥水' : '全部使用藥水';
    if (rebuild) {
      $('conversion-section').hidden = result.conversions.length === 0;
      $('erg-conversions').innerHTML = result.conversions.map(m => `<tr><th scope="row">${esc(m.stages[0].id)}</th><td><button type="button" class="erg-copy-name" ${copyAttributes(m.name)}>${esc(m.name)}</button></td><td class="erg-number">${fmt(m.quantity)}</td><td>${priceInput(m.name, '轉換材料')}</td><td class="erg-number">${costCell(m)}</td></tr>`).join('');
    }
    $('all-potions').disabled = false;
    $('copy-materials').disabled = false;
    if (rebuild) {
      $('feed-reference').innerHTML = `<div class="table-scroll erg-table-wrap"><table class="erg-feed-table"><thead><tr><th scope="col">級別與區間</th><th scope="col">需求經驗</th>${['一開武器','二開武器','三開武器','祭品'].map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${result.feedRows.map(row => `<tr><th scope="row">${row.tier} 級 · ${row.range}</th><td>${fmt(row.experience)}</td>${row.quantities.map(n => `<td>${fmt(n)}</td>`).join('')}</tr>`).join('')}</tbody><tfoot><tr><th scope="row">合計</th><td>${fmt(result.feedExperience)}</td>${result.feedReference.map(n => `<td>${fmt(n)}</td>`).join('')}</tr></tfoot></table></div>`;
      renderTotals();
      renderedRoute = route;
    } else {
      patchTotals();
      const changed = new Set(result.rows.flatMap((row, i) => row.attempts !== previous.rows[i].attempts ? row.materials.filter(m => m.consumption === 'attempt').map(m => m.name) : []));
      if (result.potionCount !== previous.potionCount) changed.add('聚能開放輔助藥水');
      if (Boolean(result.potionCount) !== Boolean(previous.potionCount)) {
        renderExtraTotals(); indexPrices();
        result.conversions.forEach(m => changed.add(m.name));
      }
      renderCosts(changed);
    }
    save();
  } catch (error) {
    result = null; renderedRoute = '';
    stageNodes.clear(); totalNodes.clear(); costNodes.clear(); priceNodes.clear();
    $('erg-error').textContent = error.message;
    $('erg-error').hidden = false;
    $('erg-summary').innerHTML = '<p class="field-help">請修正區間後重新計算。</p>';
    for (const id of ['erg-stages','erg-totals','erg-extra-totals','feed-reference','erg-conversions','stage-cost','total-cost']) $(id).replaceChildren();
    $('conversion-section').hidden = true;
    $('erg-extra-section').hidden = true;
    $('price-error').hidden = true;
    $('all-potions').disabled = true;
    $('copy-materials').disabled = true;
  }
  $('copy-status').textContent = '';
  $('copy-fallback').hidden = true;
}

function indexPrices() {
  const index = (selector, key) => {
    const grouped = new Map();
    document.querySelectorAll(selector).forEach(node => {
      const name = node.dataset[key];
      if (!grouped.has(name)) grouped.set(name, []);
      grouped.get(name).push(node);
    });
    return grouped;
  };
  costNodes = index('[data-material-cost]', 'materialCost');
  priceNodes = index('[data-price]', 'price');
}

function patchStage(row) {
  const node = stageNodes.get(row.id);
  node.querySelector('[data-potion]').checked = row.boosted;
  node.cells[3].textContent = `${fmt(row.probability*100)}%`;
  const input = node.querySelector('[data-attempts]');
  if (input.value !== String(row.attempts)) input.value = row.attempts;
  const notes = input.parentElement.querySelectorAll('small');
  notes[0].textContent = row.manual ? '自訂次數' : '目標成功率估算';
  notes[1].textContent = `次內成功 ${successWithin(row)}`;
  const materials = [...row.materials.filter(m => m.consumption === 'attempt'), ...row.materials.filter(m => m.consumption !== 'attempt')];
  node.querySelectorAll('.erg-priced-material').forEach((item, i) => {
    const m = materials[i];
    if (item.querySelector('[data-material-cost]').dataset.quantity === String(m.total)) return;
    item.querySelector('.erg-material-cell > strong').textContent = fmt(m.total);
    item.querySelector('[data-material-cost]').dataset.quantity = m.total;
  });
}

function patchTotal(node, material) {
  if (!node) return; // A search may hide this material.
  const cost = node.querySelector('[data-material-cost]');
  if (cost.dataset.quantity === String(material.quantity)) return;
  node.querySelector('[data-total-quantity]').textContent = fmt(material.quantity);
  node.querySelector('.erg-stack-count > strong').textContent = stackLabel(material);
  cost.dataset.quantity = material.quantity;
}

function patchTotals() {
  for (const group of materialsBySlot(result)) {
    for (const material of group.materials) patchTotal(totalNodes.get(group.slot)?.get(material.name), material);
  }
  for (const node of $('erg-extra-totals').querySelectorAll('[data-extra-name]')) {
    if (node.dataset.extraName === '聚能開放輔助藥水') patchTotal(node, {name:node.dataset.extraName, quantity:result.potionCount});
  }
}

function shoppingList() {
  return [...result.materials, ...(result.potionCount ? [{name:'聚能開放輔助藥水', quantity:result.potionCount, stages:[]}] : [])];
}

function stackLabel(material) {
  const stack = materialStacks(material, stackCatalog);
  return stack.occupiedStacks === null ? '待確認' : `${fmt(stack.occupiedStacks)} 組`;
}

function stackCell(material) {
  const stack = materialStacks(material, stackCatalog);
  return `<strong>${stackLabel(material)}</strong><small>${stack.stackSize === null ? '尚無堆疊資料' : `${fmt(stack.stackSize)} 個／組`}</small>`;
}

function renderTotals() {
  if (!result) return;
  const query = $('total-search').value.trim().toLocaleLowerCase();
  const matches = m => `${m.name} ${(m.aliases ?? []).join(' ')}`.toLocaleLowerCase().includes(query);
  const slotItem = m => `<div class="erg-slot-item" data-total-name="${esc(m.name)}"><button type="button" class="erg-copy-name" ${copyAttributes(m.name)}>${esc(m.name)}</button><table class="erg-slot-item-details" aria-label="${esc(m.name)}用量與費用"><tbody><tr><th scope="row">用量</th><td data-total-quantity>${fmt(m.quantity)}</td></tr><tr><th scope="row">組數</th><td class="erg-stack-count">${stackCell(m)}</td></tr><tr><th scope="row">單價</th><td>${priceInput(m.name, '合計材料')}</td></tr><tr><th scope="row">金額</th><td>${costCell(m)}</td></tr></tbody></table></div>`;
  $('erg-totals').innerHTML = '<tr>' + materialsBySlot(result).map(group => {
    const items = group.materials.filter(matches);
    return `<td data-material-slot="${group.slot}">${items.length ? items.map(slotItem).join('') : '<p class="erg-slot-empty">' + (query ? '無符合材料' : '無材料') + '</p>'}</td>`;
  }).join('') + '</tr>';
  totalNodes = new Map([...$('erg-totals').querySelectorAll('[data-material-slot]')].map(cell => [Number(cell.dataset.materialSlot), new Map([...cell.querySelectorAll('[data-total-name]')].map(node => [node.dataset.totalName, node]))]));
  renderExtraTotals();
  indexPrices();
  renderCosts();
}

function renderExtraTotals() {
  const query = $('total-search').value.trim().toLocaleLowerCase();
  const matches = m => `${m.name} ${(m.aliases ?? []).join(' ')}`.toLocaleLowerCase().includes(query);
  const extras = [...result.conversions, ...(result.potionCount ? [{name:'聚能開放輔助藥水', quantity:result.potionCount}] : [])];
  $('erg-extra-section').hidden = extras.length === 0;
  const filteredExtras = extras.filter(matches);
  $('erg-extra-totals').innerHTML = filteredExtras.length ? filteredExtras.map(m => `<tr data-extra-name="${esc(m.name)}"><th scope="row"><button type="button" class="erg-copy-name" ${copyAttributes(m.name)}>${esc(m.name)}</button></th><td class="erg-number" data-total-quantity>${fmt(m.quantity)}</td><td class="erg-stack-count">${stackCell(m)}</td><td>${priceInput(m.name, '其他合計材料')}</td><td class="erg-number">${costCell(m)}</td></tr>`).join('') : '<tr><td colspan="5">無符合材料</td></tr>';
}

function renderCosts(names) {
  if (!result) return;
  const selected = names ?? costNodes.keys();
  for (const name of selected) {
    for (const cell of costNodes.get(name) ?? []) {
      try {
        const cost = materialCosts([{name:cell.dataset.materialCost, quantity:Number(cell.dataset.quantity)}], state.prices).rows[0].cost;
        cell.textContent = cost === null ? '—' : money(cost);
      } catch { cell.textContent = '待修正'; }
    }
    for (const input of priceNodes.get(name) ?? []) {
      const price = state.prices[input.dataset.price];
      input.setAttribute('aria-invalid', String(price !== undefined && price !== '' && !validPrice(price)));
    }
  }
  const summary = budget => `<strong>${money(budget.total)} ${moneyUnit()}</strong><small>${budget.missing ? `已填單價合計；尚有 ${budget.missing} 種材料未計價` : '所有材料均已計價'}</small>`;
  try {
    const budget = materialCosts(shoppingList(), state.prices);
    $('total-cost').innerHTML = summary(budget);
    const stageNames = new Set(result.rows.flatMap(row => row.materials.map(m => m.name)));
    $('stage-cost').innerHTML = summary(materialCosts(result.materials.filter(m => stageNames.has(m.name)), state.prices));
    $('price-error').hidden = true;
  } catch (error) {
    $('total-cost').textContent = '請修正單價後計算';
    $('stage-cost').textContent = '請修正單價後計算';
    $('price-error').textContent = error.message;
    $('price-error').hidden = false;
  }
}

function showView(view) {
  for (const name of ['simulate', 'lookup']) {
    const active = name === view;
    $(`${name}-tab`).setAttribute('aria-selected', String(active));
    $(`${name}-tab`).tabIndex = active ? 0 : -1;
    $(`${name}-tab`).classList.toggle('active', active);
    $(`${name}-panel`).hidden = !active;
  }
  if (view === 'lookup') renderLookup();
}

function renderLookup() {
  const found = searchMaterials(data, $('lookup-search').value, $('lookup-weapon').value, $('lookup-tier').value);
  const shown = found.slice(0, lookupLimit);
  $('lookup-count').textContent = `${fmt(found.length)} 筆配方用料${found.length > lookupLimit ? `，目前顯示 ${lookupLimit} 筆` : ''}。數量為單次配方，可按「帶入」試算該階。`;
  $('lookup-rows').innerHTML = shown.length ? shown.map(m => `<tr><td><button type="button" class="erg-copy-name" ${copyAttributes(m.name)}>${esc(m.name)}</button></td><td>${esc(m.weaponName)}</td><td>${m.tier} 級 · 階段 ${m.stage}<small>Lv.${m.stage*5} 開放</small></td><td>${fmt(m.quantity)}</td><td>${m.consumption === 'attempt' ? '每次' : '成功時'}</td><td><button type="button" class="erg-button" data-jump-weapon="${m.weaponId}" data-jump-stage="${m.stageId}" aria-label="試算${esc(m.weaponName)} ${m.tier} 級階段 ${m.stage}">帶入</button></td></tr>`).join('') : '<tr><td colspan="6">找不到符合的材料，請調整名稱或篩選條件。</td></tr>';
  $('lookup-more').hidden = shown.length >= found.length;
}

function bind() {
  $('include-conversions').addEventListener('change', event => {
    state.includeConversions = event.target.checked;
    update();
  });
  $('erg-content').addEventListener('input', event => {
    const input = event.target.closest('[data-price]');
    if (!input) return;
    const name = input.dataset.price;
    if (input.value === '' && !input.validity.badInput) delete state.prices[name];
    else {
      try { state.prices[name] = input.validity.badInput ? 'invalid' : priceToGold(input.value); }
      catch { state.prices[name] = 'invalid'; }
    }
    (priceNodes.get(name) ?? []).forEach(other => {
      if (other !== input && other.dataset.price === name) other.value = input.value;
    });
    renderCosts(new Set([name]));
    save();
  });
  $('erg-content').addEventListener('click', async event => {
    const button = event.target.closest('[data-copy-item]');
    if (!button) return;
    const name = button.dataset.copyItem;
    clearTimeout(itemCopyTimer);
    $('item-copy-fallback').hidden = true;
    try {
      await navigator.clipboard.writeText(name);
      $('item-copy-status').textContent = `已複製：${name}`;
      itemCopyTimer = setTimeout(() => { $('item-copy-status').textContent = ''; }, 3000);
    } catch {
      $('item-copy-status').textContent = '無法自動複製，請複製下方已選取的道具名稱。';
      const input = $('item-copy-fallback');
      input.hidden = false; input.value = name; input.focus(); input.select();
    }
  });
  document.querySelectorAll('[data-context-help]').forEach(help => {
    const wrapper = help.parentElement;
    let pinned = false;
    const show = open => {
      help.setAttribute('aria-expanded', String(open));
      wrapper.classList.toggle('is-open', open);
    };
    const close = () => { pinned = false; show(false); };
    wrapper.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') show(true);
    });
    wrapper.addEventListener('pointerleave', () => {
      if (!pinned && !wrapper.contains(document.activeElement)) show(false);
    });
    help.addEventListener('focus', () => show(true));
    wrapper.addEventListener('focusout', event => {
      if (!pinned && !wrapper.contains(event.relatedTarget)) show(false);
    });
    help.addEventListener('click', () => { pinned = !pinned; show(pinned); });
    document.addEventListener('pointerdown', event => {
      if (!wrapper.contains(event.target)) close();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
    });
  });
  for (const id of ['erg-confidence-slider', 'erg-confidence-number']) $(id).addEventListener('input', event => {
    const input = event.target;
    if (input.value === '' || !input.checkValidity()) {
      $('erg-error').textContent = '累積成功率請填 0.1 至 99.9%，最多一位小數；目前材料仍按上次有效設定計算。';
      $('erg-error').hidden = false;
      return;
    }
    state.confidence = Number((Number(input.value) / 100).toFixed(6));
    state.attempts = {};
    $(id === 'erg-confidence-slider' ? 'erg-confidence-number' : 'erg-confidence-slider').value = input.value;
    update();
  });
  $('weapon-nav').addEventListener('click', event => {
    const button = event.target.closest('[data-weapon]');
    if (!button) return;
    state.weaponId = button.dataset.weapon;
    state.attempts = {};
    navigation(); update();
    $('lookup-weapon').value = state.weaponId;
    lookupLimit = 80; renderLookup();
  });
  for (const [id, key] of [['start-tier','startTier'], ['start-stage','startStage'], ['end-tier','endTier'], ['end-stage','endStage']]) {
    $(id).addEventListener('change', () => {
      state[key] = id.endsWith('stage') ? Number($(id).value) : $(id).value;
      if (id === 'start-tier' && TIERS.indexOf(state.endTier) < TIERS.indexOf(state.startTier)) {
        state.endTier = state.startTier; $('end-tier').value = state.endTier;
      }
      update();
    });
  }
  $('erg-stages').addEventListener('change', event => {
    const count = event.target.closest('[data-attempts]');
    if (count) {
      if (!count.checkValidity() || count.value === '') {
        count.reportValidity();
        $('erg-error').textContent = '嘗試次數請填 1 至 100,000,000 的整數；目前材料仍按上次有效次數計算。';
        $('erg-error').hidden = false;
        return;
      }
      state.attempts[count.dataset.attempts] = Number(count.value);
      update();
      return;
    }
    const input = event.target.closest('[data-potion]');
    if (!input) return;
    state.potions[input.dataset.potion] = input.checked;
    delete state.attempts[input.dataset.potion];
    update();
  });
  $('all-potions').addEventListener('click', () => {
    if (!result) return;
    const enabled = !result.rows.every(r => r.boosted);
    for (const row of result.rows) { state.potions[row.id] = enabled; delete state.attempts[row.id]; }
    update();
  });
  $('reset-erg').addEventListener('click', () => {
    state = {...defaults(), weaponId:state.weaponId};
    $('total-search').value = '';
    controls(); update(true);
  });
  $('total-search').addEventListener('input', renderTotals);
  for (const view of ['simulate','lookup']) {
    $(`${view}-tab`).addEventListener('click', () => showView(view));
    $(`${view}-tab`).addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 'simulate' : event.key === 'End' ? 'lookup' : view === 'simulate' ? 'lookup' : 'simulate';
      showView(next); $(`${next}-tab`).focus();
    });
  }
  for (const id of ['lookup-search','lookup-weapon','lookup-tier']) {
    $(id).addEventListener(id === 'lookup-search' ? 'input' : 'change', () => { lookupLimit = 80; renderLookup(); });
  }
  $('lookup-more').addEventListener('click', () => { lookupLimit += 80; renderLookup(); });
  $('lookup-rows').addEventListener('click', event => {
    const button = event.target.closest('[data-jump-weapon]');
    if (!button) return;
    const [tier, stage] = button.dataset.jumpStage.split('-');
    state = {...state, attempts:{}, weaponId:button.dataset.jumpWeapon, startTier:tier, endTier:tier, startStage:Number(stage), endStage:Number(stage)};
    navigation(); controls(); update(); showView('simulate');
    $('simulate-tab').focus();
  });
  $('copy-materials').addEventListener('click', async () => {
    if (!result) return;
    let budget;
    try { budget = materialCosts(shoppingList(), state.prices); }
    catch { $('copy-status').textContent = '請先修正單價再複製清單。'; return; }
    const text = `${result.weapon.name} ${state.startTier}${state.startStage} → ${state.endTier}${state.endStage}\n目標累積成功率 ${fmt(state.confidence * 100)}%${result.rows.some(r => r.manual) ? '（含自訂次數）' : ''}；${result.conversions.length ? '含轉換材料' : '未含轉換材料'}；未含飼料與成品原料\n材料\t用量\t組數\t單價（${moneyUnit()}）\t金額（${moneyUnit()}）\n` + budget.rows.map(m => `${m.name}\t${m.quantity}\t${stackLabel(m)}\t${validPrice(state.prices[m.name]) ? money(state.prices[m.name]) : '未填'}\t${m.cost === null ? '未計價' : money(m.cost)}`).join('\n') + `\n總金額\t${money(budget.total)} ${moneyUnit()}${budget.missing ? `（尚有 ${budget.missing} 種材料未計價）` : ''}`;
    try { await navigator.clipboard.writeText(text); $('copy-status').textContent = '已複製完整清單。'; }
    catch {
      $('copy-fallback').value = text; $('copy-fallback').hidden = false;
      $('copy-fallback').focus(); $('copy-fallback').select();
      $('copy-status').textContent = '請從下方選取的文字手動複製。';
    }
  });
}

async function init() {
  try {
    const responses = await Promise.all([fetch('./data/erg.json'), fetch('./data/erg-stacks.json')]);
    if (responses.some(response => !response.ok)) throw new Error('聚能資料載入失敗，請重新整理。');
    [data, stackCatalog] = await Promise.all(responses.map(response => response.json()));
    state = defaults();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE));
      if (saved && typeof saved === 'object') {
        const currentFormat = saved.schemaVersion === 2;
        const candidate = {...state, ...saved, schemaVersion:2,
          confidence: currentFormat && Number.isFinite(saved.confidence) && saved.confidence >= 0.001 && saved.confidence <= 0.999 ? saved.confidence : 0.99,
          attempts: currentFormat && saved.attempts && typeof saved.attempts === 'object' ? saved.attempts : {},
          includeConversions: saved.includeConversions === true,
          prices: saved.prices && typeof saved.prices === 'object' ? Object.fromEntries(Object.entries(saved.prices).filter(([, value]) => validPrice(value))) : {},
          potions: saved.potions && typeof saved.potions === 'object' ? saved.potions : {}};
        // Stored prices already use whole gold; discard the retired display preference.
        delete candidate.priceInWan;
        simulateErg(data, candidate);
        state = candidate;
      }
    } catch { /* Invalid or unavailable saved settings fall back to defaults. */ }
    navigation(); controls();
    $('lookup-weapon').innerHTML = '<option value="">全部武器</option>' + data.weapons.map(w => `<option value="${w.id}">${esc(w.name)}</option>`).join('');
    $('lookup-weapon').value = state.weaponId;
    bind(); update();
    $('load-status').hidden = true;
    $('erg-content').hidden = false;
  } catch (error) {
    $('load-status').textContent = error.message;
    $('load-status').setAttribute('role','alert');
  }
}
init();
