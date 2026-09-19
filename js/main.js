// Kestra-9: Gümrük Noktası — ana oyun döngüsü ve arayüz bağlantısı.

import { DAY_CONFIGS, PURPOSE_LABELS, BUDGET_ITEMS, HOME_EVENTS, BRIBE_TEXT, SIGNAL_INTRO_NOTE, CONTRABAND_BY_DAY } from './data.js';
import { generateDay, dayNumberFor } from './generate.js';
import { badgeLogoSVG, boothBackgroundSVG, portraitSVG, cargoCrateSVG, stampMarkSVG, docIconSVG } from './art.js';
import * as State from './state.js';
import { clamp } from './util.js';

const $ = (id) => document.getElementById(id);

let state = null;
let session = null;
let timerHandle = null;
let timerLeft = 0;
const TIMER_TOTAL = 38;

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $(id).classList.add('active');
}

function openModal(id) { $(id).classList.remove('hidden'); }
function closeModal(id) { $(id).classList.add('hidden'); }

function unlockedFlawsUpTo(dayIndex) {
  const set = new Set();
  for (let i = 0; i < dayIndex; i++) {
    (DAY_CONFIGS[i].newFlaws || []).forEach((f) => set.add(f));
  }
  return Array.from(set);
}

function freshReport() {
  return { processed: 0, correct: 0, wrong: 0, earned: 0, notes: [] };
}

// ---------------- INIT ----------------

function init() {
  $('title-badge').innerHTML = badgeLogoSVG('#ffb454');
  $('ending-badge').innerHTML = badgeLogoSVG('#ffb454');

  const saved = State.loadState();
  if (saved && !saved.ended) {
    $('btn-continue').hidden = false;
    $('btn-continue').addEventListener('click', () => {
      state = saved;
      startDayBriefing(state.dayIndex);
    });
  }

  $('btn-new-game').addEventListener('click', () => {
    State.clearState();
    state = State.createInitialState();
    State.saveState(state);
    startDayBriefing(1);
  });

  $('btn-howto').addEventListener('click', () => showScreen('screen-howto'));
  $('btn-howto-back').addEventListener('click', () => showScreen('screen-title'));

  $('btn-start-shift').addEventListener('click', beginShift);
  $('btn-open-rulebook').addEventListener('click', openRulebook);
  $('btn-close-rulebook').addEventListener('click', () => closeModal('modal-rulebook'));
  $('btn-close-doc').addEventListener('click', () => closeModal('modal-doc'));

  $('btn-scan-cargo').addEventListener('click', scanCargo);

  $('btn-approve').addEventListener('click', () => resolveTraveler('approve'));
  $('btn-deny').addEventListener('click', () => resolveTraveler('deny'));
  $('btn-detain').addEventListener('click', () => resolveTraveler('detain'));

  $('btn-end-home').addEventListener('click', confirmBudgetAndAdvance);
  $('btn-restart').addEventListener('click', () => {
    State.clearState();
    showScreen('screen-title');
    $('btn-continue').hidden = true;
  });
}

// ---------------- BRIEFING ----------------

function startDayBriefing(dayIndex) {
  state.dayIndex = dayIndex;
  state.ended = false;
  State.addFamilyMembersForDay(state, dayIndex);
  const cfg = DAY_CONFIGS[dayIndex - 1];
  session = {
    dayConfig: cfg,
    dayIndex,
    unlockedFlaws: unlockedFlawsUpTo(dayIndex),
    queue: [],
    wanted: [],
    current: null,
    cargoScanned: false,
    report: freshReport(),
  };

  $('briefing-day').textContent = `GÜN ${dayIndex}`;
  $('briefing-title').textContent = cfg.title;

  const rules = [];
  rules.push(`İzinli giriş amaçları: <strong>${cfg.allowedPurposes.map((p) => PURPOSE_LABELS[p]).join(', ')}</strong>`);
  rules.push(`Yasaklı sistemler: <strong>${cfg.bannedSystems.length ? cfg.bannedSystems.join(', ') : 'yok'}</strong>`);
  rules.push(`Sağlık sertifikası: <strong>${cfg.healthCertRequired ? 'zorunlu' : 'gerekli değil'}</strong>`);
  if (cfg.cargoEnabled) rules.push('Kargo taşıyıcıları taranmalı; yasaklı kalemlere dikkat.');
  if (cfg.wantedCount > 0) rules.push(`${cfg.wantedCount} arananın bugün geleceği bildirildi — Kural Kitapçığı'ndan kontrol et.`);
  if (cfg.refugeePolicy === 'deny_pending') rules.push('Sığınma başvurusu "Beklemede" olanlar reddedilecek.');
  $('briefing-rules').innerHTML = rules.map((r) => `<div class="rule-row">${r}</div>`).join('');

  let note = cfg.briefingText;
  if (cfg.signalIntro && !state.seenSignalIntro) {
    note += `\n\n${SIGNAL_INTRO_NOTE}`;
    state.seenSignalIntro = true;
  }
  $('briefing-note').textContent = note;
  $('briefing-quota').textContent = `Bugünkü hedef: ${cfg.quota} yolcu · Doğru işlem başına ${cfg.payPerCorrect} kredi`;

  State.saveState(state);
  showScreen('screen-briefing');
}

// ---------------- DESK / SHIFT ----------------

function beginShift() {
  const { travelers, wanted } = generateDay(session.dayConfig, session.dayIndex, session.unlockedFlaws);
  session.queue = travelers;
  session.wanted = wanted;
  session.report = freshReport();
  showScreen('screen-desk');
  $('booth-bg-svg').innerHTML = boothBackgroundSVG();
  updateHud();
  nextTraveler();
}

function updateHud() {
  $('hud-day').textContent = session.dayIndex;
  $('hud-credits').textContent = Math.max(0, Math.round(state.credits));
  const remaining = session.queue.length + (session.current ? 1 : 0);
  $('hud-queue').textContent = remaining;
}

function clearTimer() {
  if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
}

function startTimer() {
  clearTimer();
  timerLeft = TIMER_TOTAL;
  const fill = $('timer-fill');
  fill.style.width = '100%';
  fill.classList.remove('warn', 'danger');
  timerHandle = setInterval(() => {
    timerLeft -= 1;
    const pct = clamp((timerLeft / TIMER_TOTAL) * 100, 0, 100);
    fill.style.width = pct + '%';
    fill.classList.toggle('warn', timerLeft <= 15 && timerLeft > 7);
    fill.classList.toggle('danger', timerLeft <= 7);
    if (timerLeft <= 0) {
      clearTimer();
      skipTraveler();
    }
  }, 1000);
}

function skipTraveler() {
  const t = session.current;
  if (!t) return;
  session.report.processed += 1;
  session.report.wrong += 1;
  state.mistakes += 1;
  showFeedback(false, 'SIRA GEÇTİ', 'Yolcu, karar veremeden sabırsızlanıp geri çekildi.');
  setTimeout(() => {
    if (checkGameOver()) return;
    nextTraveler();
  }, 1300);
}

function nextTraveler() {
  clearTimer();
  closeModal('modal-doc');
  closeModal('modal-event');
  if (!session.queue.length) {
    session.current = null;
    updateHud();
    return endDay();
  }
  session.current = session.queue.shift();
  session.cargoScanned = false;
  updateHud();
  renderTraveler(session.current);
  startTimer();
  if (session.current.special === 'bribe') {
    setTimeout(() => showBribeEvent(session.current), 500);
  }
}

function docCardHtml(doc, idx) {
  const entries = Object.entries(doc.fields).slice(0, 2);
  const preview = entries.map(([k, v]) => `${k}: ${v}`).join('<br>');
  return `<div class="doc-card" data-idx="${idx}">
    <div class="doc-icon">${docIconSVG(doc.icon)}</div>
    <div class="doc-title">${doc.title}</div>
    <div class="doc-mini">${preview}</div>
  </div>`;
}

function renderTraveler(t) {
  $('traveler-portrait').innerHTML = portraitSVG(t.species, t.seed);
  $('traveler-name').textContent = t.name;
  $('traveler-purpose').textContent = t.purposeLabel;
  $('traveler-speech').textContent = `"${t.speech}"`;

  $('doc-list').innerHTML = t.documents.map((d, i) => docCardHtml(d, i)).join('');
  $('doc-list').querySelectorAll('.doc-card').forEach((el) => {
    el.addEventListener('click', () => openDocModal(t.documents[Number(el.dataset.idx)]));
  });

  const cargoStrip = $('cargo-strip');
  if (t.cargo) {
    cargoStrip.classList.remove('hidden');
    $('cargo-icon').innerHTML = cargoCrateSVG(false);
    $('cargo-compare').classList.add('hidden');
    $('cargo-declared').innerHTML = '';
    $('cargo-actual').innerHTML = '';
  } else {
    cargoStrip.classList.add('hidden');
  }
}

function openDocModal(doc) {
  $('doc-title').textContent = doc.title;
  $('doc-body').innerHTML = Object.entries(doc.fields)
    .map(([k, v]) => `<div class="doc-detail-field"><span class="f-label">${k}</span><span class="f-value">${v}</span></div>`)
    .join('');
  openModal('modal-doc');
}

function scanCargo() {
  const t = session.current;
  if (!t || !t.cargo) return;
  session.cargoScanned = true;
  $('cargo-icon').innerHTML = cargoCrateSVG(true);
  $('cargo-compare').classList.remove('hidden');
  const declaredCounts = {};
  t.cargo.declared.forEach((it) => { declaredCounts[it] = (declaredCounts[it] || 0) + 1; });
  const actualCounts = {};
  t.cargo.actual.forEach((it) => { actualCounts[it] = (actualCounts[it] || 0) + 1; });

  $('cargo-declared').innerHTML = t.cargo.declared.map((it) => `<li>${it}</li>`).join('');
  $('cargo-actual').innerHTML = t.cargo.actual.map((it) => {
    const mismatch = !(declaredCounts[it] > 0);
    if (mismatch) declaredCounts[it] = (declaredCounts[it] || 0) - 1;
    return `<li class="${mismatch ? 'mismatch' : ''}">${it}</li>`;
  }).join('');
}

// ---------------- RULEBOOK ----------------

function openRulebook() {
  $('rb-day').textContent = session.dayIndex;
  $('rulebook-body').innerHTML = buildRulebookHtml();
  openModal('modal-rulebook');
}

function buildRulebookHtml() {
  const cfg = session.dayConfig;
  const dayNum = dayNumberFor(session.dayIndex);
  let html = '';
  html += `<div class="rule-block"><h4>BUGÜNÜN TARİHİ</h4><div class="rule-tag-list"><span class="rule-tag">3413.${dayNum}</span></div></div>`;
  html += `<div class="rule-block"><h4>İZİNLİ GİRİŞ AMAÇLARI</h4><div class="rule-tag-list">${cfg.allowedPurposes.map((p) => `<span class="rule-tag">${PURPOSE_LABELS[p]}</span>`).join('')}</div></div>`;
  html += `<div class="rule-block"><h4>YASAKLI SİSTEMLER</h4><div class="rule-tag-list">${cfg.bannedSystems.length ? cfg.bannedSystems.map((s) => `<span class="rule-tag danger">${s}</span>`).join('') : '<span class="rule-tag">yok</span>'}</div></div>`;
  html += `<div class="rule-block"><h4>SAĞLIK SERTİFİKASI</h4><div class="rule-tag-list"><span class="rule-tag">${cfg.healthCertRequired ? '"Aşı Durumu: Tamam" zorunlu' : 'istenmiyor'}</span></div></div>`;
  if (cfg.cargoEnabled) {
    const contraband = CONTRABAND_BY_DAY[session.dayIndex] || [];
    html += `<div class="rule-block"><h4>YASAKLI KARGO</h4><div class="rule-tag-list">${contraband.length ? contraband.map((c) => `<span class="rule-tag danger">${c}</span>`).join('') : '<span class="rule-tag">yok</span>'}</div></div>`;
  }
  if (cfg.refugeePolicy === 'deny_pending') {
    html += `<div class="rule-block"><h4>SIĞINMA POLİTİKASI</h4><div class="rule-tag-list"><span class="rule-tag danger">Sadece "Onaylı" kabul edilir</span></div></div>`;
  }
  if (state.seenSignalIntro) {
    html += `<div class="rule-block"><h4>ELE GEÇEN NOT</h4><div class="rule-tag-list"><span class="rule-tag">Kimlik No "HS-" ile başlayanlar Sinyal örgütünden</span></div></div>`;
  }
  if (session.wanted.length) {
    html += `<div class="rule-block"><h4>ARANANLAR</h4>${session.wanted.map((w) => `
      <div class="wanted-card">
        <div class="w-portrait">${portraitSVG(w.species || 'insan', w.seed || w.idNo)}</div>
        <div class="w-info"><strong>${w.name}</strong><br>Kimlik No: ${w.idNo}<br>Uygulanacak işlem: GÖZALTI</div>
      </div>`).join('')}</div>`;
  }
  return html;
}

// ---------------- EVENTS: BRIBE ----------------

function showBribeEvent(traveler) {
  if (!session.current || session.current.id !== traveler.id) return;
  clearTimer();
  $('event-title').textContent = BRIBE_TEXT.title;
  $('event-portrait').classList.remove('hidden');
  $('event-portrait').innerHTML = portraitSVG(traveler.species, traveler.seed);
  $('event-text').textContent = BRIBE_TEXT.text;
  $('event-choices').innerHTML = '';

  const accept = document.createElement('button');
  accept.className = 'event-choice-btn';
  accept.textContent = 'Kabul Et — belgeyi görmezden gel (+15 Kredi)';
  accept.addEventListener('click', () => {
    state.credits += 15;
    state.suspicion += 1;
    session.report.notes.push(`${traveler.name} adlı yolcudan rüşvet aldın.`);
    closeModal('modal-event');
    finalizeTraveler(traveler, 'approve', { bribed: true });
  });

  const decline = document.createElement('button');
  decline.className = 'event-choice-btn';
  decline.textContent = 'Reddet, göreve devam et';
  decline.addEventListener('click', () => {
    closeModal('modal-event');
    startTimer();
  });

  $('event-choices').appendChild(accept);
  $('event-choices').appendChild(decline);
  openModal('modal-event');
}

// ---------------- DECISION RESOLUTION ----------------

function resolveTraveler(action) {
  const t = session.current;
  if (!t) return;
  clearTimer();
  finalizeTraveler(t, action, {});
}

function finalizeTraveler(t, action, { bribed = false } = {}) {
  const cfg = session.dayConfig;
  session.report.processed += 1;

  if (bribed) {
    showFeedback(true, 'RÜŞVET KABUL EDİLDİ', 'Yolcu sessizce geçti. Kimse fark etmedi... şimdilik.');
    setTimeout(() => { if (!checkGameOver()) nextTraveler(); }, 1300);
    return;
  }

  const isCorrect = action === t.correctAction;

  if (isCorrect) {
    session.report.correct += 1;
    session.report.earned += cfg.payPerCorrect;
    state.credits += cfg.payPerCorrect;
  } else {
    session.report.wrong += 1;
    state.mistakes += 1;
    state.credits = Math.max(0, state.credits - 2);
  }

  if (t.special === 'test') {
    if (isCorrect) {
      state.combineTrust += 1;
      state.credits += 5;
      session.report.notes.push(`${t.name} bir sadakat testiymiş — doğru kararla Sektör Yönetimi'nin güvenini kazandın.`);
    } else {
      state.suspicion += 1;
      session.report.notes.push(`${t.name} bir sadakat testiymiş — yanlış kararın not edildi.`);
    }
  }

  if (t.special === 'signal') {
    if (action === 'approve') {
      state.signalTrust += 1;
      state.suspicion += 1;
      session.report.notes.push(`${t.name} adlı Sinyal kuryesini geçirdin.`);
    } else {
      session.report.notes.push(`${t.name} adlı Sinyal kuryesini kurallara göre işleme aldın.`);
    }
  }

  if (t.special === 'wanted' && action === 'detain') {
    state.combineTrust += 1;
    session.report.notes.push(`${t.name} adlı aranan şahsı gözaltına aldın.`);
  }

  const title = isCorrect ? 'DOĞRU KARAR' : 'YANLIŞ KARAR';
  let note = '';
  if (isCorrect) {
    note = t.flaw ? t.flawNote : 'Belgeler eksiksizdi. İyi iş.';
  } else {
    note = t.correctAction === 'approve'
      ? 'Bu yolcunun belgeleri aslında sorunsuzdu.'
      : (t.flawNote || 'Bu karar hatalıydı.');
  }
  showFeedback(isCorrect, title, note);

  setTimeout(() => {
    if (checkGameOver()) return;
    nextTraveler();
  }, 1400);
}

function showFeedback(correct, title, note) {
  const el = $('feedback-flash');
  el.className = `feedback-flash show ${correct ? 'correct' : 'wrong'}`;
  el.innerHTML = `<div class="flash-card"><div class="flash-title">${title}</div><div class="flash-note">${note}</div></div>`;
  setTimeout(() => { el.classList.remove('show'); }, 1250);
}

function checkGameOver() {
  if (state.mistakes >= 7) {
    triggerEnding('fired');
    return true;
  }
  if (state.suspicion >= 7) {
    triggerEnding('exposed');
    return true;
  }
  return false;
}

// ---------------- HOME / END OF DAY ----------------

function endDay() {
  clearTimer();
  State.applyDailyDecay(state);
  const dead = State.checkFamilyDeath(state);
  if (dead) {
    triggerEnding('family_death', { memberName: dead.name });
    return;
  }
  const homeEvent = HOME_EVENTS[session.dayIndex];
  if (homeEvent) {
    showHomeEvent(homeEvent, () => renderHomeScreen());
  } else {
    renderHomeScreen();
  }
}

function showHomeEvent(evt, onDone) {
  $('event-title').textContent = evt.title;
  $('event-portrait').classList.add('hidden');
  $('event-text').textContent = evt.text;
  $('event-choices').innerHTML = '';
  evt.choices.forEach((choice) => {
    const btn = document.createElement('button');
    btn.className = 'event-choice-btn';
    btn.textContent = choice.label;
    btn.addEventListener('click', () => {
      if (choice.cost && state.credits >= choice.cost) {
        state.credits -= choice.cost;
      }
      if (choice.effect) {
        const m = state.family.find((f) => f.id === choice.effect.member);
        if (m) m.health = clamp(m.health + (choice.effect.health || 0), 0, 100);
      }
      closeModal('modal-event');
      const dead = State.checkFamilyDeath(state);
      if (dead) { triggerEnding('family_death', { memberName: dead.name }); return; }
      onDone();
    });
    $('event-choices').appendChild(btn);
  });
  openModal('modal-event');
}

let pendingBudget = null;

function renderHomeScreen() {
  const r = session.report;
  $('report-box').innerHTML = `
    <div class="report-row"><span>İşlenen yolcu</span><strong>${r.processed}</strong></div>
    <div class="report-row"><span>Doğru karar</span><strong>${r.correct}</strong></div>
    <div class="report-row"><span>Hatalı karar</span><strong>${r.wrong}</strong></div>
    <div class="report-row total"><span>Kazanç</span><strong>${r.earned} Kredi</strong></div>
    ${r.notes.map((n) => `<div class="report-note">${n}</div>`).join('')}
  `;

  pendingBudget = { rent: false, food: {}, heat: false, medicine: {} };

  renderFamilyPanel();
  renderBudgetList();
  showScreen('screen-home');
  State.saveState(state);
}

function renderFamilyPanel() {
  $('family-panel').innerHTML = state.family.map((m) => `
    <div class="family-card">
      <div class="family-card-head"><strong>${m.name}</strong><span>${m.role}</span></div>
      <div class="meter-row"><span class="meter-label">AÇLIK</span><div class="meter-track"><div class="meter-fill hunger ${m.hunger < 30 ? 'low' : ''}" style="width:${m.hunger}%"></div></div></div>
      <div class="meter-row"><span class="meter-label">SAĞLIK</span><div class="meter-track"><div class="meter-fill health ${m.health < 30 ? 'low' : ''}" style="width:${m.health}%"></div></div></div>
    </div>
  `).join('');
}

function budgetBalance() {
  let spent = 0;
  if (pendingBudget.rent) spent += BUDGET_ITEMS[0].cost;
  Object.values(pendingBudget.food).forEach((on) => { if (on) spent += BUDGET_ITEMS[1].costPer; });
  if (pendingBudget.heat) spent += BUDGET_ITEMS[2].cost;
  Object.values(pendingBudget.medicine).forEach((on) => { if (on) spent += BUDGET_ITEMS[3].cost; });
  return state.credits - spent;
}

function renderBudgetList() {
  const rows = [];
  const rentItem = BUDGET_ITEMS[0];
  rows.push(`
    <div class="budget-row" data-row="rent">
      <div><span class="b-label">${rentItem.label} — ${rentItem.cost} Kredi</span><span class="b-desc">${rentItem.desc}</span></div>
      <button class="toggle-btn" data-action="rent">ÖDE</button>
    </div>`);

  state.family.forEach((m) => {
    rows.push(`
      <div class="budget-row" data-row="food-${m.id}">
        <div><span class="b-label">${m.name} için yemek — ${BUDGET_ITEMS[1].costPer} Kredi</span><span class="b-desc">Açlığı yeniler.</span></div>
        <button class="toggle-btn" data-action="food" data-member="${m.id}">VER</button>
      </div>`);
  });

  rows.push(`
    <div class="budget-row" data-row="heat">
      <div><span class="b-label">${BUDGET_ITEMS[2].label} — ${BUDGET_ITEMS[2].cost} Kredi</span><span class="b-desc">${BUDGET_ITEMS[2].desc}</span></div>
      <button class="toggle-btn" data-action="heat">AÇ</button>
    </div>`);

  state.family.filter((m) => m.health < 60).forEach((m) => {
    rows.push(`
      <div class="budget-row" data-row="med-${m.id}">
        <div><span class="b-label">${m.name} için ilaç — ${BUDGET_ITEMS[3].cost} Kredi</span><span class="b-desc">${BUDGET_ITEMS[3].desc}</span></div>
        <button class="toggle-btn" data-action="medicine" data-member="${m.id}">UYGULA</button>
      </div>`);
  });

  $('budget-list').innerHTML = rows.join('');
  $('budget-list').querySelectorAll('.toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => toggleBudgetItem(btn));
  });
  updateBudgetUI();
}

function toggleBudgetItem(btn) {
  const action = btn.dataset.action;
  const member = btn.dataset.member;
  if (action === 'rent') pendingBudget.rent = !pendingBudget.rent;
  if (action === 'heat') pendingBudget.heat = !pendingBudget.heat;
  if (action === 'food') pendingBudget.food[member] = !pendingBudget.food[member];
  if (action === 'medicine') pendingBudget.medicine[member] = !pendingBudget.medicine[member];
  updateBudgetUI();
}

function updateBudgetUI() {
  const balance = budgetBalance();
  $('budget-balance').textContent = Math.max(0, Math.round(balance));
  $('budget-list').querySelectorAll('.toggle-btn').forEach((btn) => {
    const action = btn.dataset.action;
    const member = btn.dataset.member;
    let on = false;
    let cost = 0;
    if (action === 'rent') { on = pendingBudget.rent; cost = BUDGET_ITEMS[0].cost; }
    if (action === 'heat') { on = pendingBudget.heat; cost = BUDGET_ITEMS[2].cost; }
    if (action === 'food') { on = !!pendingBudget.food[member]; cost = BUDGET_ITEMS[1].costPer; }
    if (action === 'medicine') { on = !!pendingBudget.medicine[member]; cost = BUDGET_ITEMS[3].cost; }
    btn.classList.toggle('on', on);
    btn.textContent = on ? 'İPTAL' : (action === 'rent' ? 'ÖDE' : action === 'heat' ? 'AÇ' : action === 'food' ? 'VER' : 'UYGULA');
    const wouldCost = on ? 0 : cost;
    btn.disabled = !on && (balance - wouldCost < 0) && wouldCost > 0;
  });
}

function confirmBudgetAndAdvance() {
  if (pendingBudget.rent) {
    State.payRent(state, BUDGET_ITEMS[0].cost);
  } else {
    state.rentStreakMissed += 1;
  }
  Object.entries(pendingBudget.food).forEach(([memberId, on]) => {
    if (on) State.feedMember(state, memberId, BUDGET_ITEMS[1].costPer);
  });
  if (pendingBudget.heat) State.payHeat(state, BUDGET_ITEMS[2].cost);
  Object.entries(pendingBudget.medicine).forEach(([memberId, on]) => {
    if (on) State.medicateMember(state, memberId, BUDGET_ITEMS[3].cost);
  });

  const dead = State.checkFamilyDeath(state);
  if (dead) { triggerEnding('family_death', { memberName: dead.name }); return; }

  if (state.rentStreakMissed >= 2) { triggerEnding('evicted'); return; }

  State.saveState(state);

  if (session.dayIndex >= DAY_CONFIGS.length) {
    triggerEnding('campaign_end');
  } else {
    startDayBriefing(session.dayIndex + 1);
  }
}

// ---------------- ENDINGS ----------------

const ENDINGS = {
  fired: {
    title: 'KOVULDUN',
    subtitle: 'Performans Yetersiz',
    text: 'Sektör Yönetimi hata sicilini inceledi ve gişe görevine son verdi. Rozetini masaya bırakıp istasyonun dış halkasına doğru yürüyorsun. Ailenin ne olacağını bilmiyorsun.',
  },
  exposed: {
    title: 'AÇIĞA ÇIKTIN',
    subtitle: 'İç Güvenlik Seni Buldu',
    text: 'Şüpheli hareketlerin İç Güvenlik\'in dikkatini çekti. Vardiyanın ortasında iki görevli gişeye geldi. Rozetin elinden alınırken tek düşündüğün ailenin yalnız kalacağı.',
  },
  evicted: {
    title: 'TAHLİYE EDİLDİN',
    subtitle: 'Bölme 4-C Artık Seninle Değil',
    text: 'Kira art arda ödenmeyince istasyon idaresi bölmenizi mühürledi. Eşyalarınızla birlikte dış halkanın soğuk koridorlarında yeni bir yer aramak zorundasınız.',
  },
  family_death: {
    title: 'AİLE FACİASI',
    subtitle: 'Çok Geç Kaldın',
    text: 'Bütün mesai kredisi, bütün doğru kararlar bile bazen yetmiyor. Bölme 4-C\'de sessizlik var artık.',
  },
  loyal: {
    title: 'SADIK GÜMRÜK MEMURU',
    subtitle: 'Sektör Yönetimi Onayladı',
    text: 'Kurallara sadakatin fark edildi. Sektör Yönetimi seni Gişe 4\'ün kıdemli memuru ilan etti. Ailen güvende, gelecek biraz daha az belirsiz.',
  },
  shadow: {
    title: 'GÖLGEDEKİ YARDIMCI',
    subtitle: 'Sinyal Seni Unutmadı',
    text: 'Gözden kaçırdığın her belge, birinin hayatını kurtardı. Vardiyan bitiminde kapının altından tek kelime bir not sıkıştırılmış: "Teşekkürler." Artık başka bir şeyin parçasısın.',
  },
  neutral: {
    title: 'VARDİYANI TAMAMLADIN',
    subtitle: 'Bir Hafta Daha Geçti',
    text: 'Ne kahraman ne hain oldun. Sadece hayatta kaldın — Kestra-9\'da bu bile bir başarı sayılır.',
  },
  campaign_end: null,
};

function triggerEnding(kind, extra = {}) {
  clearTimer();
  let key = kind;
  if (kind === 'campaign_end') {
    if (state.signalTrust >= 3 && state.signalTrust > state.combineTrust) key = 'shadow';
    else if (state.combineTrust >= 3 && state.combineTrust >= state.signalTrust) key = 'loyal';
    else key = 'neutral';
  }
  const ending = ENDINGS[key];
  state.ended = true;
  state.endingId = key;
  State.saveState(state);

  $('ending-title').textContent = ending.title;
  $('ending-subtitle').textContent = ending.subtitle;
  let text = ending.text;
  if (kind === 'family_death' && extra.memberName) {
    text = text.replace('Bölme 4-C\'de sessizlik var artık.', `${extra.memberName} artık yok. Bölme 4-C'de sessizlik var.`);
  }
  $('ending-text').textContent = text;
  showScreen('screen-ending');
}

init();
