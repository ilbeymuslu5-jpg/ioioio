// Oyun durumu: kalıcılık (localStorage) ve saf yardımcı fonksiyonlar.

import { FAMILY_INIT } from './data.js';
import { clamp } from './util.js';

const SAVE_KEY = 'kestra9-save-v1';

export function createInitialState() {
  return {
    dayIndex: 1,
    credits: 10,
    mistakes: 0,
    combineTrust: 0,
    signalTrust: 0,
    suspicion: 0,
    rentStreakMissed: 0,
    family: FAMILY_INIT.filter((f) => f.joinDay <= 1).map((f) => ({ ...f })),
    log: [],
    seenSignalIntro: false,
    ended: false,
    endingId: null,
  };
}

export function saveState(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) { /* depolama kullanılamıyor, sessizce yok say */ }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function clearState() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* yok say */ }
}

export function addFamilyMembersForDay(state, dayIndex) {
  FAMILY_INIT.forEach((f) => {
    if (f.joinDay === dayIndex && !state.family.some((m) => m.id === f.id)) {
      state.family.push({ ...f });
    }
  });
}

export function applyDailyDecay(state) {
  state.family.forEach((m) => {
    m.hunger = clamp(m.hunger - 22, 0, 100);
    m.health = clamp(m.health - 10, 0, 100);
  });
}

export function feedMember(state, memberId, cost) {
  if (state.credits < cost) return false;
  const m = state.family.find((f) => f.id === memberId);
  if (!m) return false;
  state.credits -= cost;
  m.hunger = clamp(m.hunger + 45, 0, 100);
  return true;
}

export function medicateMember(state, memberId, cost) {
  if (state.credits < cost) return false;
  const m = state.family.find((f) => f.id === memberId);
  if (!m) return false;
  state.credits -= cost;
  m.health = clamp(m.health + 35, 0, 100);
  return true;
}

export function payRent(state, cost) {
  if (state.credits < cost) return false;
  state.credits -= cost;
  state.rentStreakMissed = 0;
  return true;
}

export function payHeat(state, cost) {
  if (state.credits < cost) return false;
  state.credits -= cost;
  state.family.forEach((m) => { m.health = clamp(m.health + 20, 0, 100); });
  return true;
}

export function checkFamilyDeath(state) {
  return state.family.find((m) => m.health <= 0) || null;
}
